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

    # GET: Staff list orders (with prefetch_related to eliminate N+1 queries)
    orders = Order.objects.filter(restaurant=restaurant).prefetch_related("order_items").order_by("-created_at")

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
    from django.db.models import Q
    order = Order.objects.filter(Q(id=pk) | Q(order_number=pk)).prefetch_related("order_items").first()
    if not order:
        raise NotFound({"error": {"code": "NOT_FOUND", "message": "Order not found"}})

    # Token verification: strictly prevent BOLA/IDOR data harvesting
    if order.tracking_token_hash:
        is_staff = False
        try:
            is_staff = IsStaffOrDashboardAccess().has_permission(request, None)
        except Exception:
            is_staff = False

        if not is_staff:
            if not access_token or not verify_tracking_token(access_token, order.tracking_token_hash):
                raise NotFound({"error": {"code": "NOT_FOUND", "message": "Order not found"}})

    return Response(format_order_for_customer(order))

@api_view(["GET", "PATCH", "PUT"])
@permission_classes([IsStaffOrDashboardAccess])
def staff_order_detail_view(request, pk):
    if request.method in ["PATCH", "PUT"]:
        return staff_order_status_view(request, pk)

    slug = request.query_params.get("restaurantSlug") or request.data.get("restaurantSlug") or "olive-and-ember"
    restaurant = get_restaurant_by_slug(slug)
    from django.db.models import Q
    order = Order.objects.filter(
        Q(id=pk) | Q(order_number=pk),
        restaurant=restaurant
    ).prefetch_related("order_items").first()
    if not order:
        raise NotFound({"error": {"code": "NOT_FOUND", "message": f"Order '{pk}' not found for {restaurant.name}"}})
    return Response(format_order_for_dashboard(order))

@api_view(["PATCH", "PUT", "POST"])
@permission_classes([IsStaffOrDashboardAccess])
def staff_order_status_view(request, pk):
    slug = request.query_params.get("restaurantSlug") or request.data.get("restaurantSlug") or "olive-and-ember"
    restaurant = get_restaurant_by_slug(slug)
    from django.db.models import Q
    order = Order.objects.filter(
        Q(id=pk) | Q(order_number=pk),
        restaurant=restaurant
    ).prefetch_related("order_items").first()
    if not order:
        raise NotFound({"error": {"code": "NOT_FOUND", "message": f"Order '{pk}' not found for {restaurant.name}"}})

    new_status = request.data.get("status") or request.data.get("orderStatus")
    if not new_status:
        raise ValidationError({"error": {"code": "VALIDATION_ERROR", "message": "Status is required"}})

    # Mapping frontend status strings to internal canonical statuses
    status_map_rev = {
        "new": "pending",
        "pending": "pending",
        "accepted": "confirmed",
        "accept": "confirmed",
        "confirmed": "confirmed",
        "preparing": "preparing",
        "ready": "ready",
        "served": "served",
        "completed": "completed",
        "complete": "completed",
        "cancelled": "cancelled",
        "cancel": "cancelled",
    }
    raw_status = str(new_status).strip().lower()
    if raw_status not in status_map_rev:
        raise ValidationError({
            "error": {
                "code": "VALIDATION_ERROR",
                "message": f"Invalid status '{new_status}'. Allowed values: New, Accepted, Preparing, Ready, Served, Completed, Cancelled"
            }
        })
    mapped_status = status_map_rev[raw_status]

    reason = request.data.get("reason") or request.data.get("cancellationReason")
    try:
        updated_order = update_order_status_service(order, mapped_status, reason)
    except ValidationError as e:
        return Response(e.detail, status=409)

    formatted = format_order_for_dashboard(updated_order)
    formatted["status"] = updated_order.status
    formatted["order"] = format_order_for_dashboard(updated_order)
    return Response(formatted)
