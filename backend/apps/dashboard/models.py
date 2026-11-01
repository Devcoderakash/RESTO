import uuid
from django.db import models
from apps.restaurants.models import Restaurant

class StaffMember(models.Model):
    ROLE_CHOICES = [
        ("super_admin", "Super Admin"),
        ("restaurant_admin", "Restaurant Admin"),
        ("manager", "Manager"),
        ("chef", "Chef"),
        ("waiter", "Waiter"),
    ]

    id = models.CharField(max_length=64, primary_key=True, default=uuid.uuid4)
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE, related_name="staff")
    full_name = models.CharField(max_length=120)
    email = models.EmailField()
    role = models.CharField(max_length=50, default="manager", choices=ROLE_CHOICES)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "staff"
        ordering = ["full_name"]

    def __str__(self):
        return f"{self.full_name} ({self.role})"

