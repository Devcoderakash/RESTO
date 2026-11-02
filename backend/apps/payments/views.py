import uuid
from decimal import Decimal
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.exceptions import NotFound, ValidationError
from apps.payments.models import Payment
from apps.orders.models import Order
from apps.restaurants.services import get_restaurant_by_slug
from apps.dashboard.permissions import IsStaffOrDashboardAccess
from apps.realtime.bus import publish_event_on_commit

@api_view(["GET", "POST"])
@permission_classes([IsStaffOrDashboardAccess])
def payments_view(request):
    slug = request.query_params.get("restaurantSlug") or request.data.get("restaurantSlug")
    restaurant = get_restaurant_by_slug(slug)
    if request.method == "GET":
        payments = Payment.objects.filter(restaurant=restaurant).select_related("order").order_by("-created_at")[:100]
        data = []
        for p in payments:
            try:
                table_num = p.order.table_number if p.order else ""
                data.append({
                    "id": p.id,
                    "order_id": p.order_id,
                    "orderId": p.order_id,
                    "amount": float(p.amount) if p.amount is not None else 0.0,
                    "payment_method": p.payment_method or "counter",
                    "paymentMethod": p.payment_method or "counter",
                    "status": p.payment_status or "pending",
                    "payment_status": p.payment_status or "pending",
                    "created_at": p.created_at.isoformat() if p.created_at else "",
                    "orders": {"table_number": table_num},
                })
            except Exception:
                continue
        return Response({"payments": data})

    elif request.method == "POST":
        data = request.data
        order_id = data.get("orderId") or data.get("order_id")
        order = Order.objects.filter(restaurant=restaurant, id=order_id).first()
        if not order:
            raise NotFound({"error": {"code": "NOT_FOUND", "message": "Order not found"}})

        amount = Decimal(str(data.get("amount") or order.final_total))
        pm = data.get("paymentMethod") or order.payment_method
        payment = Payment.objects.create(
            id=f"pay-{uuid.uuid4().hex[:8]}",
            restaurant=restaurant,
            order=order,
            amount=amount,
            payment_method=pm,
            payment_status=data.get("status", "pending"),
            transaction_reference=data.get("transactionReference", ""),
        )
        res_payload = {
            "id": payment.id,
            "order_id": payment.order_id,
            "orderId": payment.order_id,
            "amount": float(payment.amount),
            "payment_method": payment.payment_method,
            "paymentMethod": payment.payment_method,
            "status": payment.payment_status,
            "payment_status": payment.payment_status,
        }
        publish_event_on_commit(str(restaurant.id), "payment.created", "payment", payment.id, res_payload)
        return Response(res_payload, status=201)

@api_view(["PATCH", "PUT"])
@permission_classes([IsStaffOrDashboardAccess])
def payment_status_view(request, pk):
    slug = request.query_params.get("restaurantSlug") or request.data.get("restaurantSlug")
    restaurant = get_restaurant_by_slug(slug)
    payment = Payment.objects.filter(restaurant=restaurant, id=pk).first()
    if not payment:
        raise NotFound({"error": {"code": "NOT_FOUND", "message": "Payment not found"}})

    status = request.data.get("status") or request.data.get("paymentStatus")
    raw_status = str(status).strip().lower() if status else ""
    canonical_status = "completed" if raw_status in ["paid", "completed"] else raw_status
    if canonical_status in ["completed", "refunded", "failed", "pending"]:
        payment.payment_status = canonical_status
        payment.save(update_fields=["payment_status"])
        if payment.order:
            payment.order.payment_status = canonical_status
            payment.order.save(update_fields=["payment_status"])

    res_payload = {
        "id": payment.id,
        "status": payment.payment_status,
        "payment_status": payment.payment_status,
        "order_id": payment.order_id,
        "orderId": payment.order_id,
    }
    publish_event_on_commit(str(restaurant.id), "payment.updated", "payment", payment.id, res_payload)
    return Response(res_payload)
