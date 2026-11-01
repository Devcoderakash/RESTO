import uuid
from django.db import models
from apps.restaurants.models import Restaurant
from apps.orders.models import Order

class Payment(models.Model):
    id = models.CharField(max_length=64, primary_key=True, default=uuid.uuid4)
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE, related_name="payments")
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="payments")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_method = models.CharField(max_length=20, default="counter")
    payment_status = models.CharField(max_length=20, default="pending")
    transaction_reference = models.CharField(max_length=100, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "payments"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["restaurant", "order"]),
            models.Index(fields=["restaurant", "-created_at"]),
        ]

    def __str__(self):
        return f"Payment {self.id} - Order {self.order.order_number}: Rs. {self.amount}"

