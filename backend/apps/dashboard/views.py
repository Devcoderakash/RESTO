import uuid
from decimal import Decimal
from django.utils import timezone
from django.db.models import Sum, Count, Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.exceptions import NotFound, ValidationError
from apps.dashboard.models import StaffMember
from apps.orders.models import Order
from apps.tables.models import RestaurantTable
from apps.restaurants.services import get_restaurant_by_slug
from apps.dashboard.permissions import IsStaffOrDashboardAccess

@api_view(["GET"])
@permission_classes([IsStaffOrDashboardAccess])
def dashboard_overview(request):
    slug = request.query_params.get("restaurantSlug") or request.data.get("restaurantSlug")
    restaurant = get_restaurant_by_slug(slug)
    start_of_day = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)

    today_orders = Order.objects.filter(restaurant=restaurant, created_at__gte=start_of_day).exclude(status="cancelled")
    today_revenue = today_orders.aggregate(total=Sum("final_total"))["total"] or Decimal("0.00")
    today_count = today_orders.count()

    total_orders = Order.objects.filter(restaurant=restaurant).count()
    active_tables = RestaurantTable.objects.filter(restaurant=restaurant, status="occupied").count()
    total_tables = RestaurantTable.objects.filter(restaurant=restaurant).exclude(status="inactive").count()
    pending_orders = Order.objects.filter(restaurant=restaurant, status__in=["pending", "confirmed", "preparing"]).count()
    avg_value = float(today_revenue / today_count) if today_count > 0 else 0.0

    return Response({
        "todayRevenue": float(today_revenue),
        "currency": restaurant.currency,
        "totalOrders": total_orders,
        "activeTables": active_tables,
        "totalTables": total_tables,
        "averageOrderValue": avg_value,
        "pendingOrders": pending_orders,
    })

@api_view(["GET"])
@permission_classes([IsStaffOrDashboardAccess])
def dashboard_recent_orders(request):
    slug = request.query_params.get("restaurantSlug") or request.data.get("restaurantSlug")
    restaurant = get_restaurant_by_slug(slug)
    orders = Order.objects.filter(restaurant=restaurant).order_by("-created_at")[:10]
    data = []
    for o in orders:
        data.append({
            "id": o.id,
            "order_number": o.order_number,
            "table_number": o.table_number.zfill(2) if o.table_number.isdigit() else o.table_number,
            "customer_name": o.customer_name or f"Guest Table {o.table_number}",
            "status": o.status,
            "payment_status": o.payment_status,
            "final_total": float(o.final_total),
            "created_at": o.created_at.isoformat(),
        })
    return Response({"orders": data})

@api_view(["GET"])
@permission_classes([IsStaffOrDashboardAccess])
def dashboard_daily_sales(request):
    slug = request.query_params.get("restaurantSlug") or request.data.get("restaurantSlug")
    restaurant = get_restaurant_by_slug(slug)
    start_14 = timezone.now() - timezone.timedelta(days=14)
    orders = Order.objects.filter(restaurant=restaurant, created_at__gte=start_14).exclude(status="cancelled").order_by("created_at")

    by_day = {}
    for o in orders:
        d = o.created_at.strftime("%Y-%m-%d")
        by_day[d] = by_day.get(d, 0.0) + float(o.final_total)

    sales = [{"date": k, "total": v} for k, v in by_day.items()]
    if not sales:
        sales = [{"date": timezone.now().strftime("%Y-%m-%d"), "total": 0.0}]

    return Response({"sales": sales})

@api_view(["GET", "POST"])
@permission_classes([IsStaffOrDashboardAccess])
def staff_list_create(request):
    slug = request.query_params.get("restaurantSlug") or request.data.get("restaurantSlug")
    restaurant = get_restaurant_by_slug(slug)
    if request.method == "GET":
        staff_members = StaffMember.objects.filter(restaurant=restaurant).order_by("full_name")
        data = []
        for s in staff_members:
            data.append({
                "id": s.id,
                "name": s.full_name,
                "full_name": s.full_name,
                "email": s.email,
                "role": s.role.title() if s.role else "Manager",
                "status": "Active" if s.is_active else "Inactive",
                "is_active": s.is_active,
                "joiningDate": s.created_at.strftime("%Y-%m-%d"),
            })
        return Response({"staff": data})

    elif request.method == "POST":
        data = request.data
        name = data.get("name") or data.get("full_name")
        email = data.get("email")
        if not name or not email:
            raise ValidationError({"error": {"code": "VALIDATION_ERROR", "message": "Name and email are required"}})

        s = StaffMember.objects.create(
            id=f"stf-{uuid.uuid4().hex[:8]}",
            restaurant=restaurant,
            full_name=name,
            email=email,
            role=data.get("role", "manager").lower(),
            is_active=True,
        )
        return Response({
            "id": s.id,
            "name": s.full_name,
            "email": s.email,
            "role": s.role,
            "status": "Active",
        }, status=201)

@api_view(["PATCH"])
@permission_classes([IsStaffOrDashboardAccess])
def staff_status_toggle(request, pk):
    slug = request.query_params.get("restaurantSlug") or request.data.get("restaurantSlug")
    restaurant = get_restaurant_by_slug(slug)
    s = StaffMember.objects.filter(restaurant=restaurant, id=pk).first()
    if not s:
        raise NotFound({"error": {"code": "NOT_FOUND", "message": "Staff member not found"}})

    if "isActive" in request.data:
        s.is_active = bool(request.data["isActive"])
    elif "status" in request.data:
        s.is_active = request.data["status"].lower() == "active"
    s.save(update_fields=["is_active"])

    return Response({
        "id": s.id,
        "is_active": s.is_active,
        "status": "Active" if s.is_active else "Inactive",
    })

@api_view(["POST"])
@permission_classes([AllowAny])
def auth_login(request):
    email = request.data.get("email", "contact@oliveandember.com")
    token = f"demo-staff-token-{int(timezone.now().timestamp() * 1000)}"
    return Response({
        "accessToken": token,
        "refreshToken": token,
        "user": {"id": "staff-user-1", "email": email},
    })

@api_view(["GET"])
@permission_classes([AllowAny])
def auth_me(request):
    return Response({
        "user": {"id": "staff-user-1", "email": "contact@oliveandember.com"},
        "staff": {
            "id": "stf-manager",
            "role": "restaurant_admin",
            "full_name": "Restaurant Manager",
        }
    })

@api_view(["POST"])
@permission_classes([AllowAny])
def auth_logout(request):
    return Response({"status": "logged_out"})

