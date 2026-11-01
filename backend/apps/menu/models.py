import uuid
from django.db import models
from apps.restaurants.models import Restaurant

class Category(models.Model):
    id = models.CharField(max_length=64, primary_key=True, default=uuid.uuid4)
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE, related_name="categories")
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, default="")
    image_url = models.URLField(max_length=500, blank=True, default="")
    sort_order = models.IntegerField(default=0)
    is_visible = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "categories"
        unique_together = ("restaurant", "name")
        ordering = ["sort_order", "name"]

    def __str__(self):
        return f"{self.restaurant.name} - {self.name}"

class MenuItem(models.Model):
    FOOD_TYPE_CHOICES = [
        ("veg", "Vegetarian"),
        ("non_veg", "Non-Vegetarian"),
    ]

    id = models.CharField(max_length=64, primary_key=True, default=uuid.uuid4)
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE, related_name="menu_items")
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name="items")
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    price = models.DecimalField(max_digits=10, decimal_places=2)
    image_url = models.URLField(max_length=500, blank=True, default="")
    food_type = models.CharField(max_length=20, default="veg", choices=FOOD_TYPE_CHOICES)
    dietary_tags = models.JSONField(default=list, blank=True)
    available = models.BooleanField(default=True)
    popular = models.BooleanField(default=False)
    chef_special = models.BooleanField(default=False)
    preparation_time_minutes = models.IntegerField(default=15)
    calories = models.IntegerField(null=True, blank=True)
    allergens = models.JSONField(default=list, blank=True)
    addons = models.JSONField(default=list, blank=True)
    sort_order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "menu_items"
        ordering = ["sort_order", "name"]
        indexes = [
            models.Index(fields=["restaurant", "available"]),
            models.Index(fields=["restaurant", "category"]),
        ]

    def __str__(self):
        return f"{self.name} (Rs. {self.price})"

