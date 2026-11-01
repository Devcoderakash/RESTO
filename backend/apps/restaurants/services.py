from apps.restaurants.models import Restaurant
from rest_framework.exceptions import NotFound

def get_restaurant_by_slug(slug="olive-and-ember"):
    if not slug:
        slug = "olive-and-ember"
    restaurant = Restaurant.objects.filter(slug=slug, is_active=True).first()
    if not restaurant:
        raise NotFound({"error": {"code": "NOT_FOUND", "message": f"Restaurant '{slug}' not found"}})
    return restaurant

