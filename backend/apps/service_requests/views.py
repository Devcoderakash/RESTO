import uuid
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.exceptions import NotFound, ValidationError
from apps.service_requests.models import ServiceRequest
from apps.restaurants.services import get_restaurant_by_slug
from apps.realtime.bus import publish_event_on_commit
from apps.dashboard.permissions import IsStaffOrDashboardAccess

@api_view(["GET", "POST"])
@permission_classes([AllowAny])
def service_requests_view(request):
    slug = request.data.get("restaurantSlug") or request.query_params.get("restaurantSlug") or "olive-and-ember"
    restaurant = get_restaurant_by_slug(slug)

    if request.method == "POST":
        data = request.data
        table_num = str(data.get("tableNumber") or data.get("table_number", "")).strip()
        if not table_num:
            raise ValidationError({"error": {"code": "VALIDATION_ERROR", "message": "Table number is required"}})
        norm_num = table_num.zfill(2) if table_num.isdigit() else table_num

        req_id = f"req-{int(uuid.uuid4().int % 1000000000000)}"
        req_obj = ServiceRequest.objects.create(
            id=req_id,
            restaurant=restaurant,
            table_number=norm_num,
            order_id=data.get("orderId") or data.get("order_id", ""),
            request_type=data.get("requestType") or data.get("type", "waiter"),
            message=data.get("message") or data.get("detail", ""),
            payment_preference=data.get("paymentPreference") or "",
            status="pending",
        )
        res_payload = {
            "id": req_obj.id,
            "status": req_obj.status,
            "table_number": norm_num,
            "tableNumber": norm_num,
            "request_type": req_obj.request_type,
            "requestType": req_obj.request_type,
            "message": req_obj.message,
            "created_at": req_obj.created_at.isoformat(),
        }
        publish_event_on_commit(str(restaurant.id), "service_request.created", "service_request", req_obj.id, res_payload)
        return Response(res_payload, status=201)

    elif request.method == "GET":
        IsStaffOrDashboardAccess().has_permission(request, None)
        requests = ServiceRequest.objects.filter(restaurant=restaurant).order_by("-created_at")[:100]
        data = []
        for r in requests:
            num = r.table_number.zfill(2) if r.table_number.isdigit() else r.table_number
            data.append({
                "id": r.id,
                "table_number": num,
                "tableNumber": num,
                "request_type": r.request_type,
                "requestType": r.request_type,
                "status": r.status,
                "order_id": r.order_id,
                "orderId": r.order_id,
                "message": r.message,
                "details": r.message,
                "payment_preference": r.payment_preference,
                "paymentPreference": r.payment_preference,
                "created_at": r.created_at.isoformat(),
                "time": r.created_at.isoformat(),
            })
        return Response({"serviceRequests": data, "requests": data})

@api_view(["PATCH"])
@permission_classes([IsStaffOrDashboardAccess])
def service_request_detail_view(request, pk):
    slug = request.query_params.get("restaurantSlug") or request.data.get("restaurantSlug")
    restaurant = get_restaurant_by_slug(slug)
    req_obj = ServiceRequest.objects.filter(restaurant=restaurant, id=pk).first()
    if not req_obj:
        raise NotFound({"error": {"code": "NOT_FOUND", "message": "Service request not found"}})

    new_status = request.data.get("status")
    if new_status not in ["in_progress", "completed", "cancelled"]:
        raise ValidationError({"error": {"code": "VALIDATION_ERROR", "message": "Invalid status"}})

    req_obj.status = new_status
    req_obj.save(update_fields=["status"])
    num = req_obj.table_number.zfill(2) if req_obj.table_number.isdigit() else req_obj.table_number

    res_payload = {
        "id": req_obj.id,
        "table_number": num,
        "tableNumber": num,
        "request_type": req_obj.request_type,
        "requestType": req_obj.request_type,
        "status": req_obj.status,
        "message": req_obj.message,
        "created_at": req_obj.created_at.isoformat(),
    }
    publish_event_on_commit(str(restaurant.id), "service_request.updated", "service_request", req_obj.id, res_payload)
    return Response(res_payload)

