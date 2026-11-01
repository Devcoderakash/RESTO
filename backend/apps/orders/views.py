from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.exceptions import NotFound, ValidationError, PermissionDenied
from apps.dashboard.permissions import IsStaffOrDashboardAccess
from apps.orders.models import Order
from apps.restaurants.services import get_restaurant_by_slug
from apps.orders.services import (
    create_order_atomic,
    format_order_for_customer,
    format_order_for_dashboard,
    update_order_status_service,
    verify_tracking_token,
)

@api_view(["GET", "POST"])
@permission_classes([IsStaffOrDashboardAccess])
def orders_collection_view(request):
    slug = request.data.get("restaurantSlug") or request.data.get("restaurant_slug") or request.query_params.get("restaurantSlug") or "olive-and-ember"
    restaurant = get_restaurant_by_slug(slug)

    if request.method == "POST":
        payload, created = create_order_atomic(restaurant, request.data)
        status_code = 201 if created else 200
        return Response(payload, status=status_code)

    # GET: Staff list orders
    orders = Order.objects.filter(restaurant=restaurant).order_by("-created_at")

    status_filter = request.query_params.get("status")
    if status_filter:
        orders = orders.filter(status=status_filter)

    table_filter = request.query_params.get("tableNumber") or request.query_params.get("table_number")
    if table_filter:
        norm_t = str(table_filter).zfill(2) if str(table_filter).isdigit() else str(table_filter)
        orders = orders.filter(table_number__in=[norm_t, str(table_filter)])

    limit = int(request.query_params.get("limit", 50))
    offset = int(request.query_params.get("offset", 0))

    total = orders.count()
    page = orders[offset:offset + limit]

    return Response({
        "orders": [format_order_for_dashboard(o) for o in page],
        "total": total,
        "limit": limit,
        "offset": offset,
    })

@api_view(["GET"])
@permission_classes([AllowAny])
def customer_order_tracking_view(request, pk):
    access_token = request.query_params.get("accessToken", "").strip()
    order = Order.objects.filter(id=pk).first()
    if not order:
        raise NotFound({"error": {"code": "NOT_FOUND", "message": "Order not found"}})

    # Token verification
    if order.tracking_token_hash and access_token:
        if not verify_tracking_token(access_token, order.tracking_token_hash):
            raise NotFound({"error": {"code": "NOT_FOUND", "message": "Order not found"}})

    return Response(format_order_for_customer(order))

@api_view(["GET"])
@permission_classes([IsStaffOrDashboardAccess])
def staff_order_detail_view(request, pk):
    restaurant = get_restaurant_by_slug()
    order = Order.objects.filter(restaurant=restaurant, id=pk).first()
    if not order:
        raise NotFound({"error": {"code": "NOT_FOUND", "message": "Order not found"}})
    return Response(format_order_for_dashboard(order))

@api_view(["PATCH"])
@permission_classes([IsStaffOrDashboardAccess])
def staff_order_status_view(request, pk):
    restaurant = get_restaurant_by_slug()
    order = Order.objects.filter(restaurant=restaurant, id=pk).first()
    if not order:
        raise NotFound({"error": {"code": "NOT_FOUND", "message": "Order not found"}})

    new_status = request.data.get("status")
    if not new_status:
        raise ValidationError({"error": {"code": "VALIDATION_ERROR", "message": "Status is required"}})

    # Mapping if frontend passes customer status
    status_map_rev = {
        "accepted": "confirmed",
        "preparing": "preparing",
        "ready": "ready",
        "served": "served",
        "completed": "completed",
        "cancelled": "cancelled",
    }
    mapped_status = status_map_rev.get(new_status.lower(), new_status.lower())

    reason = request.data.get("reason")
    try:
        updated_order = update_order_status_service(order, mapped_status, reason)
    except ValidationError as e:
        return Response(e.detail, status=409)

    formatted = format_order_for_dashboard(updated_order)
    formatted["status"] = updated_order.status
    formatted["order"] = format_order_for_dashboard(updated_order)
    return Response(formatted)
