import uuid
from django.db import models
from apps.restaurants.models import Restaurant

class ServiceRequest(models.Model):
    REQUEST_TYPE_CHOICES = [
        ("waiter", "Call Waiter"),
        ("bill", "Request Bill"),
        ("water", "Request Water"),
        ("assistance", "Assistance"),
        ("other", "Other"),
    ]

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("in_progress", "In Progress"),
        ("completed", "Completed"),
        ("cancelled", "Cancelled"),
    ]

    id = models.CharField(max_length=64, primary_key=True, default=uuid.uuid4)
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE, related_name="service_requests")
    table_number = models.CharField(max_length=20)
    order_id = models.CharField(max_length=64, blank=True, default="")
    request_type = models.CharField(max_length=20, default="waiter", choices=REQUEST_TYPE_CHOICES)
    message = models.TextField(blank=True, default="")
    payment_preference = models.CharField(max_length=50, blank=True, default="")
    status = models.CharField(max_length=20, default="pending", choices=STATUS_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "service_requests"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Table {self.table_number}: {self.request_type} ({self.status})"

