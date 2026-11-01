import uuid
from django.db import models
from apps.restaurants.models import Restaurant
from apps.tables.models import RestaurantTable

class Order(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("confirmed", "Confirmed"),
        ("preparing", "Preparing"),
        ("ready", "Ready"),
        ("served", "Served"),
        ("completed", "Completed"),
        ("cancelled", "Cancelled"),
    ]

    PAYMENT_METHOD_CHOICES = [
        ("counter", "Counter"),
        ("upi", "UPI"),
        ("card", "Card"),
        ("online", "Online"),
    ]

    PAYMENT_STATUS_CHOICES = [
        ("pending", "Pending"),
        ("completed", "Completed"),
        ("failed", "Failed"),
        ("refunded", "Refunded"),
    ]

    id = models.CharField(max_length=64, primary_key=True, default=uuid.uuid4)
    order_number = models.CharField(max_length=50)
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE, related_name="orders")
    table = models.ForeignKey(RestaurantTable, on_delete=models.SET_NULL, null=True, blank=True, related_name="orders")
    table_number = models.CharField(max_length=20)
    idempotency_key = models.CharField(max_length=128, blank=True, default="")
    tracking_token_hash = models.CharField(max_length=128, blank=True, default="")
    customer_name = models.CharField(max_length=120, blank=True, default="")
    customer_phone = models.CharField(max_length=40, blank=True, default="")
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    cgst = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    sgst = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    gst_total = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    service_charge = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    final_total = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    payment_method = models.CharField(max_length=20, default="counter", choices=PAYMENT_METHOD_CHOICES)
    payment_status = models.CharField(max_length=20, default="pending", choices=PAYMENT_STATUS_CHOICES)
    status = models.CharField(max_length=20, default="pending", choices=STATUS_CHOICES)
    order_notes = models.TextField(blank=True, default="")
    cancellation_reason = models.TextField(blank=True, default="")
    estimated_time_minutes = models.IntegerField(default=20)
    status_timeline = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "orders"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Order {self.order_number} - Table {self.table_number} ({self.status})"

class OrderItem(models.Model):
    id = models.CharField(max_length=64, primary_key=True, default=uuid.uuid4)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="order_items")
    menu_item_id = models.CharField(max_length=64)
    item_name = models.CharField(max_length=255)
    food_type = models.CharField(max_length=20, default="veg")
    quantity = models.IntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total_price = models.DecimalField(max_digits=12, decimal_places=2)
    selected_addons = models.JSONField(default=list, blank=True)
    special_instructions = models.TextField(blank=True, default="")

    class Meta:
        db_table = "order_items"

    def __str__(self):
        return f"{self.item_name} x {self.quantity} for Order {self.order.order_number}"

