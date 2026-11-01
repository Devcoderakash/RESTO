import uuid
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.exceptions import NotFound, ValidationError
from apps.tables.models import RestaurantTable
from apps.restaurants.services import get_restaurant_by_slug
from apps.orders.models import Order
from apps.dashboard.permissions import IsStaffOrDashboardAccess

@api_view(["GET"])
@permission_classes([AllowAny])
def table_availability(request):
    slug = request.query_params.get("restaurantSlug", "olive-and-ember")
    restaurant = get_restaurant_by_slug(slug)
    tables = RestaurantTable.objects.filter(restaurant=restaurant).exclude(status="inactive").order_by("table_number")
    data = []
    for t in tables:
        num = t.table_number.zfill(2) if t.table_number.isdigit() else t.table_number
        data.append({
            "number": num,
            "table_number": num,
            "capacity": t.capacity,
            "zone": t.zone,
            "status": t.status,
        })
    return Response({"tables": data})

@api_view(["GET", "POST"])
@permission_classes([IsStaffOrDashboardAccess])
def staff_tables(request):
    restaurant = get_restaurant_by_slug(request.query_params.get("restaurantSlug", "olive-and-ember"))
    if request.method == "GET":
        tables = RestaurantTable.objects.filter(restaurant=restaurant).order_by("table_number")
        data = []
        for t in tables:
            num = t.table_number.zfill(2) if t.table_number.isdigit() else t.table_number
            data.append({
                "id": t.id,
                "table_number": num,
                "tableNumber": num,
                "capacity": t.capacity,
                "zone": t.zone,
                "status": t.status,
                "qr_code_url": t.qr_code_url or f"/menu?table={num}",
            })
        return Response({"tables": data})

    elif request.method == "POST":
        data = request.data
        table_num = str(data.get("tableNumber") or data.get("table_number", "")).strip()
        if not table_num:
            raise ValidationError({"error": {"code": "VALIDATION_ERROR", "message": "Table number is required"}})
        norm_num = table_num.zfill(2) if table_num.isdigit() else table_num
        table = RestaurantTable.objects.create(
            id=f"tbl-{uuid.uuid4().hex[:8]}",
            restaurant=restaurant,
            table_number=norm_num,
            capacity=int(data.get("capacity", 4)),
            zone=data.get("zone", "Main Dining"),
            status=data.get("status", "available"),
            qr_code_url=data.get("qr_code_url") or f"/menu?table={norm_num}",
        )
        return Response({
            "id": table.id,
            "table_number": norm_num,
            "tableNumber": norm_num,
            "capacity": table.capacity,
            "zone": table.zone,
            "status": table.status,
            "qr_code_url": table.qr_code_url,
        }, status=201)

@api_view(["GET", "PUT", "DELETE"])
@permission_classes([AllowAny])
def staff_table_detail(request, pk):
    restaurant = get_restaurant_by_slug()
    norm_pk = str(pk).zfill(2) if str(pk).isdigit() else str(pk)
    table = RestaurantTable.objects.filter(restaurant=restaurant).filter(
        models_q := (models_q_filter(pk, norm_pk))
    ).first()
    if not table:
        raise NotFound({"error": {"code": "NOT_FOUND", "message": "Table not found"}})

    if request.method == "GET":
        num = table.table_number.zfill(2) if table.table_number.isdigit() else table.table_number
        return Response({
            "id": table.id,
            "table_number": num,
            "tableNumber": num,
            "capacity": table.capacity,
            "zone": table.zone,
            "status": table.status,
            "qr_code_url": table.qr_code_url,
        })
    elif request.method == "PUT":
        data = request.data
        if "tableNumber" in data or "table_number" in data:
            val = str(data.get("tableNumber") or data.get("table_number")).strip()
            table.table_number = val.zfill(2) if val.isdigit() else val
        if "capacity" in data:
            table.capacity = int(data["capacity"])
        if "zone" in data:
            table.zone = data["zone"]
        if "status" in data:
            table.status = data["status"]
        table.save()
        num = table.table_number.zfill(2) if table.table_number.isdigit() else table.table_number
        return Response({
            "id": table.id,
            "table_number": num,
            "tableNumber": num,
            "capacity": table.capacity,
            "zone": table.zone,
            "status": table.status,
            "qr_code_url": table.qr_code_url,
        })
    elif request.method == "DELETE":
        table.delete()
        return Response(status=204)

def models_q_filter(pk, norm_pk):
    from django.db.models import Q
    return Q(id=pk) | Q(table_number=pk) | Q(table_number=norm_pk)

@api_view(["PATCH"])
@permission_classes([AllowAny])
def staff_table_status(request, pk):
    restaurant = get_restaurant_by_slug()
    norm_pk = str(pk).zfill(2) if str(pk).isdigit() else str(pk)
    table = RestaurantTable.objects.filter(restaurant=restaurant).filter(
        models_q_filter(pk, norm_pk)
    ).first()
    if not table:
        raise NotFound({"error": {"code": "NOT_FOUND", "message": "Table not found"}})

    new_status = request.data.get("status")
    if new_status not in ["available", "occupied", "inactive"]:
        raise ValidationError({"error": {"code": "VALIDATION_ERROR", "message": "Invalid table status"}})

    # Guard: if changing to inactive or available while there are active orders
    if new_status == "inactive":
        has_active = Order.objects.filter(
            restaurant=restaurant,
            table_number=table.table_number
        ).exclude(status__in=["completed", "cancelled"]).exists()
        if has_active:
            return Response(
                {"error": {"code": "TABLE_HAS_ACTIVE_ORDERS", "message": "Cannot set table to inactive while orders are active"}},
                status=409
            )

    table.status = new_status
    table.save(update_fields=["status"])
    num = table.table_number.zfill(2) if table.table_number.isdigit() else table.table_number
    return Response({
        "id": table.id,
        "table_number": num,
        "tableNumber": num,
        "capacity": table.capacity,
        "zone": table.zone,
        "status": table.status,
    })

