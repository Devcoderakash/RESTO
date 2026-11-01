from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from apps.restaurants.models import Restaurant
from apps.restaurants.services import get_restaurant_by_slug
from apps.dashboard.permissions import IsStaffOrDashboardAccess

@api_view(["GET"])
@permission_classes([AllowAny])
def restaurant_detail(request, slug=None):
    target_slug = slug or "olive-and-ember"
    if target_slug == "info":
        target_slug = request.query_params.get("slug") or "olive-and-ember"
    restaurant = get_restaurant_by_slug(target_slug)
    return Response({
        "id": restaurant.id,
        "name": restaurant.name,
        "slug": restaurant.slug,
        "description": restaurant.description,
        "address": restaurant.address,
        "phone": restaurant.phone,
        "email": restaurant.email,
        "currency": restaurant.currency,
        "timezone": restaurant.timezone,
        "opening_hours": restaurant.opening_hours or {},
        "logo_url": restaurant.logo_url,
        "wifi_ssid": restaurant.wifi_ssid,
        "wifi_password": restaurant.wifi_password,
        "tax_percentage": float(restaurant.tax_percentage),
        "service_charge_percentage": float(restaurant.service_charge_percentage),
    })

@api_view(["GET"])
@permission_classes([AllowAny])
def restaurant_list(request):
    restaurants = Restaurant.objects.filter(is_active=True).values(
        "id", "slug", "name", "description", "address", "phone", "email",
        "logo_url", "opening_hours", "currency", "timezone"
    )
    return Response({"restaurants": list(restaurants)})

@api_view(["GET"])
@permission_classes([IsStaffOrDashboardAccess])
def staff_restaurant_settings(request):
    slug = request.query_params.get("restaurantSlug") or request.query_params.get("restaurant_slug")
    restaurant = get_restaurant_by_slug(slug)
    return Response({
        "id": restaurant.id,
        "slug": restaurant.slug,
        "name": restaurant.name,
        "description": restaurant.description,
        "address": restaurant.address,
        "phone": restaurant.phone,
        "email": restaurant.email,
        "logo_url": restaurant.logo_url,
        "opening_hours": restaurant.opening_hours or {},
        "currency": restaurant.currency,
        "tax_percentage": float(restaurant.tax_percentage),
        "service_charge_percentage": float(restaurant.service_charge_percentage),
        "wifi_ssid": restaurant.wifi_ssid,
        "wifi_password": restaurant.wifi_password,
    })

@api_view(["PUT"])
@permission_classes([IsStaffOrDashboardAccess])
def update_restaurant_settings(request):
    slug = request.data.get("restaurantSlug") or request.data.get("restaurant_slug")
    restaurant = get_restaurant_by_slug(slug)
    data = request.data
    for field in ["name", "description", "address", "phone", "email", "logo_url", "wifi_ssid", "wifi_password", "currency", "timezone"]:
        if field in data:
            setattr(restaurant, field, data[field])
    if "taxPercentage" in data or "tax_percentage" in data:
        restaurant.tax_percentage = data.get("taxPercentage") or data.get("tax_percentage")
    if "serviceChargePercentage" in data or "service_charge_percentage" in data:
        restaurant.service_charge_percentage = data.get("serviceChargePercentage") or data.get("service_charge_percentage")
    if "openingHours" in data or "opening_hours" in data:
        restaurant.opening_hours = data.get("openingHours") or data.get("opening_hours")
    restaurant.save()
    return Response({
        "id": restaurant.id,
        "slug": restaurant.slug,
        "name": restaurant.name,
        "description": restaurant.description,
        "address": restaurant.address,
        "phone": restaurant.phone,
        "email": restaurant.email,
        "logo_url": restaurant.logo_url,
        "opening_hours": restaurant.opening_hours or {},
        "currency": restaurant.currency,
        "tax_percentage": float(restaurant.tax_percentage),
        "service_charge_percentage": float(restaurant.service_charge_percentage),
        "wifi_ssid": restaurant.wifi_ssid,
        "wifi_password": restaurant.wifi_password,
    })

