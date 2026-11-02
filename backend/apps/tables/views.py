import uuid
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.exceptions import NotFound, ValidationError
from apps.tables.models import RestaurantTable
from apps.restaurants.services import get_restaurant_by_slug
from apps.orders.models import Order
from apps.dashboard.permissions import IsStaffOrDashboardAccess
from apps.realtime.bus import publish_event_on_commit


def get_active_table_numbers(restaurant) -> set:
    """
    Returns normalized set of table numbers that currently have active dining orders.
    Active orders are those NOT in ('completed', 'cancelled').
    """
    active_raw = Order.objects.filter(restaurant=restaurant).exclude(
        status__in=["completed", "cancelled"]
    ).values_list("table_number", flat=True)

    active_set = set()
    for raw in active_raw:
        if raw:
            s = str(raw).strip()
            active_set.add(s)
            if s.isdigit():
                active_set.add(s.zfill(2))
                active_set.add(str(int(s)))
    return active_set


def models_q_filter(pk, norm_pk):
    from django.db.models import Q
    return Q(id=pk) | Q(table_number=pk) | Q(table_number=norm_pk)


@api_view(["GET"])
@permission_classes([AllowAny])
def table_availability(request):
    """
    Customer-facing table availability endpoint.
    Computes genuine live occupancy based on active dining sessions.
    """
    slug = request.query_params.get("restaurantSlug", "olive-and-ember")
    restaurant = get_restaurant_by_slug(slug)
    tables = RestaurantTable.objects.filter(restaurant=restaurant).exclude(status="inactive").order_by("table_number")
    active_set = get_active_table_numbers(restaurant)

    data = []
    for t in tables:
        num = t.table_number.zfill(2) if t.table_number.isdigit() else t.table_number
        is_occupied = num in active_set or t.table_number in active_set
        data.append({
            "id": t.id,
            "number": num,
            "table_number": num,
            "capacity": t.capacity,
            "zone": t.zone,
            "status": "occupied" if is_occupied else "available",
        })
    return Response({"tables": data})


@api_view(["GET", "POST"])
@permission_classes([IsStaffOrDashboardAccess])
def staff_tables(request):
    """
    Staff / Dashboard table management endpoint:
    - GET: list all tables with real-time dynamic occupancy status
    - POST: create a new dining table with strict validation and conflict prevention
    """
    slug = request.query_params.get("restaurantSlug") or request.data.get("restaurantSlug") or "olive-and-ember"
    restaurant = get_restaurant_by_slug(slug)

    if request.method == "GET":
        tables = RestaurantTable.objects.filter(restaurant=restaurant).order_by("table_number")
        active_set = get_active_table_numbers(restaurant)

        data = []
        for t in tables:
            num = t.table_number.zfill(2) if t.table_number.isdigit() else t.table_number
            if t.status == "inactive":
                dyn_status = "inactive"
            elif num in active_set or t.table_number in active_set:
                dyn_status = "occupied"
            else:
                dyn_status = "available"

            data.append({
                "id": t.id,
                "table_number": num,
                "tableNumber": num,
                "capacity": t.capacity,
                "zone": t.zone,
                "status": dyn_status,
                "qr_code_url": t.qr_code_url or f"/menu?table={num}",
            })
        return Response({"tables": data})

    elif request.method == "POST":
        data = request.data
        raw_num = data.get("tableNumber") or data.get("table_number")
        if raw_num is None or str(raw_num).strip() == "":
            return Response(
                {"error": {"code": "VALIDATION_ERROR", "message": "Table number is required."}},
                status=400,
            )

        table_num = str(raw_num).strip()
        norm_num = table_num.zfill(2) if table_num.isdigit() else table_num

        # Check for existing duplicate table in this restaurant
        duplicate_lookup = [norm_num, table_num]
        if table_num.isdigit():
            duplicate_lookup.append(str(int(table_num)))

        existing = RestaurantTable.objects.filter(
            restaurant=restaurant,
            table_number__in=duplicate_lookup
        ).first()

        if existing:
            return Response(
                {
                    "error": {
                        "code": "DUPLICATE_TABLE",
                        "message": f"Table number '{norm_num}' already exists in {restaurant.name}."
                    }
                },
                status=409,
            )

        # Validate seating capacity
        raw_capacity = data.get("capacity", 4)
        try:
            capacity = int(raw_capacity)
            if capacity < 1 or capacity > 100:
                raise ValueError()
        except (ValueError, TypeError):
            return Response(
                {"error": {"code": "VALIDATION_ERROR", "message": "Seating capacity must be a positive integer between 1 and 100."}},
                status=400,
            )

        # Validate zone
        raw_zone = str(data.get("zone", "Main Dining")).strip()
        zone = raw_zone if raw_zone else "Main Dining"

        # Validate status (new table without active session starts available)
        raw_status = str(data.get("status", "available")).strip().lower()
        if raw_status not in ["available", "occupied", "inactive"]:
            raw_status = "available"

        table_id = f"tbl-{uuid.uuid4().hex[:8]}"
        qr_url = data.get("qr_code_url") or f"/menu?table={norm_num}"

        table = RestaurantTable.objects.create(
            id=table_id,
            restaurant=restaurant,
            table_number=norm_num,
            capacity=capacity,
            zone=zone,
            status=raw_status,
            qr_code_url=qr_url,
        )

        response_payload = {
            "id": table.id,
            "table_number": norm_num,
            "tableNumber": norm_num,
            "capacity": table.capacity,
            "zone": table.zone,
            "status": table.status,
            "qr_code_url": table.qr_code_url,
            "qrUrl": table.qr_code_url,
        }

        # Broadcast realtime event so all connected dashboards receive the table instantly
        publish_event_on_commit(str(restaurant.id), "table.created", "table", str(table.id), response_payload)

        return Response(response_payload, status=201)


@api_view(["GET", "PUT", "DELETE"])
@permission_classes([IsStaffOrDashboardAccess])
def staff_table_detail(request, pk):
    slug = request.query_params.get("restaurantSlug") or request.data.get("restaurantSlug")
    restaurant = get_restaurant_by_slug(slug)
    norm_pk = str(pk).zfill(2) if str(pk).isdigit() else str(pk)
    table = RestaurantTable.objects.filter(restaurant=restaurant).filter(
        models_q_filter(pk, norm_pk)
    ).first()
    if not table:
        raise NotFound({"error": {"code": "NOT_FOUND", "message": "Table not found"}})

    if request.method == "GET":
        num = table.table_number.zfill(2) if table.table_number.isdigit() else table.table_number
        active_set = get_active_table_numbers(restaurant)
        dyn_status = "inactive" if table.status == "inactive" else "occupied" if (num in active_set or table.table_number in active_set) else "available"
        return Response({
            "id": table.id,
            "table_number": num,
            "tableNumber": num,
            "capacity": table.capacity,
            "zone": table.zone,
            "status": dyn_status,
            "qr_code_url": table.qr_code_url or f"/menu?table={num}",
            "qrUrl": table.qr_code_url or f"/menu?table={num}",
        })

    elif request.method == "PUT":
        data = request.data
        if "tableNumber" in data or "table_number" in data:
            raw_val = str(data.get("tableNumber") or data.get("table_number")).strip()
            norm_val = raw_val.zfill(2) if raw_val.isdigit() else raw_val
            # Check duplicate on rename
            dup = RestaurantTable.objects.filter(
                restaurant=restaurant,
                table_number=norm_val
            ).exclude(id=table.id).first()
            if dup:
                return Response(
                    {"error": {"code": "DUPLICATE_TABLE", "message": f"Table number '{norm_val}' already exists."}},
                    status=409,
                )
            table.table_number = norm_val

        if "capacity" in data:
            try:
                cap = int(data["capacity"])
                if 1 <= cap <= 100:
                    table.capacity = cap
            except (ValueError, TypeError):
                pass

        if "zone" in data:
            table.zone = str(data["zone"]).strip() or table.zone

        if "status" in data:
            st = str(data["status"]).strip().lower()
            if st in ["available", "occupied", "inactive"]:
                table.status = st

        table.save()
        num = table.table_number.zfill(2) if table.table_number.isdigit() else table.table_number
        payload = {
            "id": table.id,
            "table_number": num,
            "tableNumber": num,
            "capacity": table.capacity,
            "zone": table.zone,
            "status": table.status,
            "qr_code_url": table.qr_code_url,
            "qrUrl": table.qr_code_url,
        }
        publish_event_on_commit(str(restaurant.id), "table.updated", "table", str(table.id), payload)
        return Response(payload)

    elif request.method == "DELETE":
        has_active = Order.objects.filter(
            restaurant=restaurant,
            table_number__in=[table.table_number, table.table_number.zfill(2)]
        ).exclude(status__in=["completed", "cancelled"]).exists()
        if has_active:
            return Response(
                {"error": {"code": "TABLE_HAS_ACTIVE_ORDERS", "message": "Cannot delete table while it has active dining orders."}},
                status=409,
            )
        table_id = str(table.id)
        table.delete()
        publish_event_on_commit(str(restaurant.id), "table.deleted", "table", table_id, {"id": table_id})
        return Response(status=204)


@api_view(["PATCH"])
@permission_classes([IsStaffOrDashboardAccess])
def staff_table_status(request, pk):
    slug = request.query_params.get("restaurantSlug") or request.data.get("restaurantSlug")
    restaurant = get_restaurant_by_slug(slug)
    norm_pk = str(pk).zfill(2) if str(pk).isdigit() else str(pk)
    table = RestaurantTable.objects.filter(restaurant=restaurant).filter(
        models_q_filter(pk, norm_pk)
    ).first()
    if not table:
        raise NotFound({"error": {"code": "NOT_FOUND", "message": "Table not found"}})

    new_status = str(request.data.get("status", "")).strip().lower()
    if new_status not in ["available", "occupied", "inactive"]:
        raise ValidationError({"error": {"code": "VALIDATION_ERROR", "message": "Invalid table status"}})

    # Guard: if changing to inactive while there are active orders
    if new_status == "inactive":
        has_active = Order.objects.filter(
            restaurant=restaurant,
            table_number__in=[table.table_number, table.table_number.zfill(2)]
        ).exclude(status__in=["completed", "cancelled"]).exists()
        if has_active:
            return Response(
                {"error": {"code": "TABLE_HAS_ACTIVE_ORDERS", "message": "Cannot set table to inactive while orders are active"}},
                status=409
            )

    table.status = new_status
    table.save(update_fields=["status"])
    num = table.table_number.zfill(2) if table.table_number.isdigit() else table.table_number
    payload = {
        "id": table.id,
        "table_number": num,
        "tableNumber": num,
        "capacity": table.capacity,
        "zone": table.zone,
        "status": table.status,
    }
    publish_event_on_commit(str(restaurant.id), "table.updated", "table", str(table.id), payload)
    return Response(payload)
