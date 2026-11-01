import uuid
from django.db import models

class Restaurant(models.Model):
    id = models.CharField(max_length=64, primary_key=True, default=uuid.uuid4)
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=100, unique=True)
    description = models.TextField(blank=True, default="")
    address = models.TextField(blank=True, default="")
    phone = models.CharField(max_length=50, blank=True, default="")
    email = models.EmailField(blank=True, default="")
    logo_url = models.URLField(max_length=500, blank=True, default="")
    opening_hours = models.JSONField(default=dict, blank=True)
    wifi_ssid = models.CharField(max_length=100, blank=True, default="")
    wifi_password = models.CharField(max_length=100, blank=True, default="")
    tax_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=5.00)
    service_charge_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    currency = models.CharField(max_length=10, default="INR")
    timezone = models.CharField(max_length=50, default="Asia/Kolkata")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "restaurants"
        ordering = ["name"]

    def __str__(self):
        return self.name

