import uuid
from django.db import models
from apps.restaurants.models import Restaurant

class RestaurantTable(models.Model):
    STATUS_CHOICES = [
        ("available", "Available"),
        ("occupied", "Occupied"),
        ("inactive", "Inactive"),
    ]

    id = models.CharField(max_length=64, primary_key=True, default=uuid.uuid4)
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE, related_name="tables")
    table_number = models.CharField(max_length=20)
    capacity = models.IntegerField(default=4)
    zone = models.CharField(max_length=50, default="Main Dining")
    status = models.CharField(max_length=20, default="available", choices=STATUS_CHOICES)
    qr_code_url = models.CharField(max_length=500, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "restaurant_tables"
        unique_together = ("restaurant", "table_number")
        ordering = ["table_number"]
        indexes = [
            models.Index(fields=["restaurant", "status"]),
            models.Index(fields=["restaurant", "table_number"]),
        ]

    def __str__(self):
        return f"{self.restaurant.name} - Table {self.table_number} ({self.status})"

