import json
import time
from django.http import StreamingHttpResponse, JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.exceptions import NotFound
from apps.restaurants.services import get_restaurant_by_slug
from apps.realtime.models import RealtimeEvent
from apps.realtime.bus import realtime_bus

def sse_format(event_data: dict) -> str:
    """Format dictionary into standard Server-Sent Event frame."""
    lines = []
    if "eventId" in event_data:
        lines.append(f"id: {event_data['eventId']}")
    if "eventType" in event_data:
        lines.append(f"event: {event_data['eventType']}")
    lines.append(f"data: {json.dumps(event_data)}")
    return "\n".join(lines) + "\n\n"

def event_stream_generator(restaurant, target_order_id=None, last_event_id=0):
    restaurant_id = str(restaurant.id)
    subscriber_queue = realtime_bus.subscribe(restaurant_id)

    try:
        # 1. Send initial connection acknowledgment
        init_frame = {
            "eventType": "connection.connected",
            "restaurantSlug": restaurant.slug,
            "connectedAt": time.time(),
        }
        yield sse_format(init_frame)

        # 2. Catch up on any missed events if last_event_id was provided
        if last_event_id > 0:
            missed_qs = RealtimeEvent.objects.filter(
                restaurant=restaurant,
                id__gt=last_event_id,
            ).order_by("id")
            if target_order_id:
                missed_qs = missed_qs.filter(entity_id=target_order_id)

            for missed in missed_qs[:100]:
                frame = {
                    "eventId": missed.id,
                    "eventType": missed.event_type,
                    "entityType": missed.entity_type,
                    "entityId": missed.entity_id,
                    "payload": missed.payload,
                    "createdAt": missed.created_at.isoformat(),
                }
                yield sse_format(frame)

        # 3. Stream real-time events as they occur
        while True:
            try:
                # Wait up to 15 seconds for a new event
                event_data = subscriber_queue.get(timeout=15)
                # If filtered by specific order (customer tracking)
                if target_order_id and event_data.get("entityId") != target_order_id:
                    continue

                yield sse_format(event_data)
            except Exception:
                # Heartbeat keep-alive frame every 15s prevents proxy dropouts
                yield ": keep-alive\n\n"

    finally:
        realtime_bus.unsubscribe(restaurant_id, subscriber_queue)

def realtime_stream(request):
    """
    Server-Sent Events (SSE) streaming endpoint for zero-latency updates.
    GET /api/realtime/stream?restaurantSlug=olive-and-ember&orderId=...&lastEventId=...
    """
    slug = request.GET.get("restaurantSlug") or request.GET.get("restaurant_slug") or "olive-and-ember"
    restaurant = get_restaurant_by_slug(slug)

    target_order_id = request.GET.get("orderId") or request.GET.get("order_id")
    last_event_id = int(request.GET.get("lastEventId") or request.headers.get("Last-Event-ID") or 0)

    response = StreamingHttpResponse(
        event_stream_generator(restaurant, target_order_id=target_order_id, last_event_id=last_event_id),
        content_type="text/event-stream",
    )
    response["Cache-Control"] = "no-cache, no-transform"
    response["X-Accel-Buffering"] = "no"
    return response

@api_view(["GET"])
@permission_classes([AllowAny])
def realtime_sync(request):
    """
    State recovery and event catch-up endpoint.
    GET /api/realtime/sync?restaurantSlug=olive-and-ember&lastEventId=...&orderId=...
    """
    slug = request.query_params.get("restaurantSlug") or "olive-and-ember"
    restaurant = get_restaurant_by_slug(slug)

    last_event_id = int(request.query_params.get("lastEventId") or 0)
    target_order_id = request.query_params.get("orderId") or request.query_params.get("order_id")

    events_qs = RealtimeEvent.objects.filter(
        restaurant=restaurant,
        id__gt=last_event_id,
    ).order_by("id")

    if target_order_id:
        events_qs = events_qs.filter(entity_id=target_order_id)

    events_data = []
    latest_id = last_event_id
    for e in events_qs[:100]:
        latest_id = max(latest_id, e.id)
        events_data.append({
            "eventId": e.id,
            "eventType": e.event_type,
            "entityType": e.entity_type,
            "entityId": e.entity_id,
            "payload": e.payload,
            "createdAt": e.created_at.isoformat(),
        })

    return JsonResponse({
        "events": events_data,
        "latestEventId": latest_id,
        "restaurantSlug": restaurant.slug,
    })
