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

@api_view(["GET", "POST"])
@permission_classes([IsStaffOrDashboardAccess])
def payments_view(request):
    restaurant = get_restaurant_by_slug()
    if request.method == "GET":
        payments = Payment.objects.filter(restaurant=restaurant).select_related("order").order_by("-created_at")[:100]
        data = []
        for p in payments:
            table_num = p.order.table_number if p.order else ""
            data.append({
                "id": p.id,
                "order_id": p.order_id,
                "orderId": p.order_id,
                "amount": float(p.amount),
                "payment_method": p.payment_method,
                "paymentMethod": p.payment_method,
                "status": p.payment_status,
                "payment_status": p.payment_status,
                "created_at": p.created_at.isoformat(),
                "orders": {"table_number": table_num},
            })
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
        return Response({
            "id": payment.id,
            "order_id": payment.order_id,
            "amount": float(payment.amount),
            "payment_method": payment.payment_method,
            "status": payment.payment_status,
        }, status=201)

@api_view(["PATCH"])
@permission_classes([AllowAny])
def payment_status_view(request, pk):
    restaurant = get_restaurant_by_slug()
    payment = Payment.objects.filter(restaurant=restaurant, id=pk).first()
    if not payment:
        raise NotFound({"error": {"code": "NOT_FOUND", "message": "Payment not found"}})

    status = request.data.get("status")
    if status in ["completed", "refunded", "failed", "pending"]:
        payment.payment_status = status
        payment.save(update_fields=["payment_status"])
        if payment.order:
            payment.order.payment_status = status
            payment.order.save(update_fields=["payment_status"])

    return Response({
        "id": payment.id,
        "status": payment.payment_status,
        "payment_status": payment.payment_status,
    })
