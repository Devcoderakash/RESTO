import json
import logging
import queue
import threading
from django.db import transaction
from django.conf import settings

logger = logging.getLogger(__name__)

class RealtimeBus:
    """Thread-safe event bus for server-sent events and real-time streaming."""
    def __init__(self):
        self._lock = threading.Lock()
        # Map: restaurant_id -> set of queue.Queue
        self._subscribers = {}

    def subscribe(self, restaurant_id: str) -> queue.Queue:
        q = queue.Queue(maxsize=100)
        with self._lock:
            if restaurant_id not in self._subscribers:
                self._subscribers[restaurant_id] = set()
            self._subscribers[restaurant_id].add(q)
        return q

    def unsubscribe(self, restaurant_id: str, q: queue.Queue):
        with self._lock:
            if restaurant_id in self._subscribers:
                self._subscribers[restaurant_id].discard(q)
                if not self._subscribers[restaurant_id]:
                    del self._subscribers[restaurant_id]

    def publish(self, restaurant_id: str, event_data: dict):
        with self._lock:
            queues = list(self._subscribers.get(restaurant_id, []))

        for q in queues:
            try:
                q.put_nowait(event_data)
            except queue.Full:
                # Queue is full; drop oldest to prevent memory accumulation
                try:
                    q.get_nowait()
                    q.put_nowait(event_data)
                except Exception:
                    pass

realtime_bus = RealtimeBus()

def publish_event_on_commit(restaurant_id: str, event_type: str, entity_type: str, entity_id: str, payload: dict):
    """
    Creates the database RealtimeEvent record and broadcasts it to all
    listening SSE clients strictly AFTER the database transaction commits.
    """
    from apps.realtime.models import RealtimeEvent

    # Record event in PostgreSQL/SQLite
    event_obj = RealtimeEvent.objects.create(
        restaurant_id=restaurant_id,
        event_type=event_type,
        entity_type=entity_type,
        entity_id=entity_id,
        payload=payload,
    )

    event_payload = {
        "eventId": event_obj.id,
        "eventType": event_type,
        "entityType": entity_type,
        "entityId": entity_id,
        "payload": payload,
        "createdAt": event_obj.created_at.isoformat(),
    }

    # Publish on commit to guarantee transactional consistency
    def _do_publish():
        realtime_bus.publish(str(restaurant_id), event_payload)

    transaction.on_commit(_do_publish)
    return event_obj

