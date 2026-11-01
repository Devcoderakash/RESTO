import uuid
from decimal import Decimal
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.exceptions import NotFound, ValidationError
from apps.menu.models import Category, MenuItem
from apps.restaurants.services import get_restaurant_by_slug
from apps.dashboard.permissions import IsStaffOrDashboardAccess

def format_menu_item(item: MenuItem, category_map: dict = None) -> dict:
    cat_name = category_map.get(item.category_id, "Uncategorized") if category_map and item.category_id else (item.category.name if item.category else "Uncategorized")
    addons = item.addons if isinstance(item.addons, list) else []
    return {
        "id": item.id,
        "name": item.name,
        "description": item.description,
        "price": float(item.price),
        "category": item.category_id or "all",
        "categoryId": item.category_id,
        "categoryName": cat_name,
        "image": item.image_url or "",
        "imageUrl": item.image_url or "",
        "foodType": item.food_type,
        "isVeg": item.food_type == "veg",
        "isVegetarian": item.food_type == "veg",
        "dietaryType": "veg" if item.food_type == "veg" else "non-veg",
        "isPopular": item.popular,
        "isChefSpecial": item.chef_special,
        "isAvailable": item.available,
        "available": item.available,
        "prepTimeMinutes": item.preparation_time_minutes,
        "calories": item.calories,
        "allergens": item.allergens or [],
        "preparationTime": f"{item.preparation_time_minutes} min",
        "customizationGroups": [
            {
                "id": "addons",
                "name": "Add-ons",
                "type": "multiple",
                "required": False,
                "options": addons,
            }
        ] if addons else [],
    }

@api_view(["GET"])
@permission_classes([AllowAny])
def public_menu(request):
    slug = request.query_params.get("restaurantSlug", "olive-and-ember")
    restaurant = get_restaurant_by_slug(slug)

    categories = list(Category.objects.filter(restaurant=restaurant, is_visible=True).order_by("sort_order"))
    category_map = {c.id: c.name for c in categories}
    items = list(MenuItem.objects.filter(restaurant=restaurant).order_by("sort_order", "name"))

    return Response({
        "items": [format_menu_item(item, category_map) for item in items],
        "categories": [{"id": c.id, "name": c.name, "description": c.description} for c in categories],
    })

@api_view(["GET"])
@permission_classes([AllowAny])
def public_categories(request):
    slug = request.query_params.get("restaurantSlug", "olive-and-ember")
    restaurant = get_restaurant_by_slug(slug)
    categories = Category.objects.filter(restaurant=restaurant, is_visible=True).order_by("sort_order")
    return Response({
        "categories": [
            {"id": c.id, "name": c.name, "description": c.description, "image_url": c.image_url, "sort_order": c.sort_order}
            for c in categories
        ]
    })

@api_view(["GET", "POST"])
@permission_classes([IsStaffOrDashboardAccess])
def staff_menu(request):
    slug = request.query_params.get("restaurantSlug") or request.data.get("restaurantSlug")
    restaurant = get_restaurant_by_slug(slug)
    if request.method == "GET":
        categories = list(Category.objects.filter(restaurant=restaurant).order_by("sort_order"))
        category_map = {c.id: c.name for c in categories}
        items = MenuItem.objects.filter(restaurant=restaurant).order_by("sort_order", "name")
        return Response({
            "items": [format_menu_item(item, category_map) for item in items],
            "categories": [{"id": c.id, "name": c.name, "description": c.description} for c in categories],
        })
    elif request.method == "POST":
        data = request.data
        name = data.get("name")
        if not name:
            raise ValidationError({"error": {"code": "VALIDATION_ERROR", "message": "Name is required"}})
        item = MenuItem.objects.create(
            id=f"item-{uuid.uuid4().hex[:8]}",
            restaurant=restaurant,
            category_id=data.get("categoryId") or data.get("category_id") or None,
            name=name,
            description=data.get("description", ""),
            price=Decimal(str(data.get("price", 0))),
            image_url=data.get("imageUrl") or data.get("image_url", ""),
            food_type=data.get("foodType") or data.get("food_type", "veg"),
            dietary_tags=data.get("dietaryTags") or data.get("dietary_tags", []),
            popular=bool(data.get("popular", False)),
            chef_special=bool(data.get("chefSpecial", False)),
            preparation_time_minutes=int(data.get("preparationTimeMinutes") or data.get("prepTimeMinutes", 15)),
            calories=data.get("calories"),
            allergens=data.get("allergens", []),
            addons=data.get("addons", []),
            sort_order=int(data.get("sortOrder", 0)),
            available=bool(data.get("available", True)),
        )
        return Response(format_menu_item(item), status=201)

@api_view(["PATCH", "DELETE"])
@permission_classes([IsStaffOrDashboardAccess])
def staff_menu_item_detail(request, pk):
    slug = request.query_params.get("restaurantSlug") or request.data.get("restaurantSlug")
    restaurant = get_restaurant_by_slug(slug)
    item = MenuItem.objects.filter(restaurant=restaurant, id=pk).first()
    if not item:
        raise NotFound({"error": {"code": "NOT_FOUND", "message": "Menu item not found"}})

    if request.method == "PATCH":
        data = request.data
        if "name" in data: item.name = data["name"]
        if "description" in data: item.description = data["description"]
        if "price" in data: item.price = Decimal(str(data["price"]))
        if "categoryId" in data or "category_id" in data:
            item.category_id = data.get("categoryId") or data.get("category_id")
        if "imageUrl" in data or "image_url" in data:
            item.image_url = data.get("imageUrl") or data.get("image_url")
        if "foodType" in data or "food_type" in data:
            item.food_type = data.get("foodType") or data.get("food_type")
        if "available" in data or "isAvailable" in data:
            item.available = data.get("available") if "available" in data else data.get("isAvailable")
        if "popular" in data or "isPopular" in data:
            item.popular = data.get("popular") if "popular" in data else data.get("isPopular")
        if "prepTimeMinutes" in data or "preparationTimeMinutes" in data:
            item.preparation_time_minutes = int(data.get("prepTimeMinutes") or data.get("preparationTimeMinutes"))
        item.save()
        return Response(format_menu_item(item))
    elif request.method == "DELETE":
        item.delete()
        return Response(status=204)

@api_view(["PATCH"])
@permission_classes([IsStaffOrDashboardAccess])
def staff_menu_item_availability(request, pk):
    slug = request.query_params.get("restaurantSlug") or request.data.get("restaurantSlug")
    restaurant = get_restaurant_by_slug(slug)
    item = MenuItem.objects.filter(restaurant=restaurant, id=pk).first()
    if not item:
        raise NotFound({"error": {"code": "NOT_FOUND", "message": "Menu item not found"}})

    available = request.data.get("available")
    if available is not None:
        item.available = bool(available)
        item.save(update_fields=["available"])
    return Response(format_menu_item(item))

@api_view(["GET", "POST"])
@permission_classes([IsStaffOrDashboardAccess])
def staff_categories(request):
    slug = request.query_params.get("restaurantSlug") or request.data.get("restaurantSlug")
    restaurant = get_restaurant_by_slug(slug)
    if request.method == "GET":
        categories = Category.objects.filter(restaurant=restaurant).order_by("sort_order")
        return Response({
            "categories": [
                {"id": c.id, "name": c.name, "description": c.description, "image_url": c.image_url, "sort_order": c.sort_order, "is_visible": c.is_visible}
                for c in categories
            ]
        })
    data = request.data
    name = data.get("name")
    if not name:
        raise ValidationError({"error": {"code": "VALIDATION_ERROR", "message": "Name is required"}})
    cat = Category.objects.create(
        id=f"cat-{uuid.uuid4().hex[:8]}",
        restaurant=restaurant,
        name=name,
        description=data.get("description", ""),
        image_url=data.get("imageUrl") or data.get("image_url", ""),
        sort_order=int(data.get("sortOrder", 0)),
        is_visible=bool(data.get("isVisible", True)),
    )
    return Response({
        "id": cat.id,
        "name": cat.name,
        "description": cat.description,
        "image_url": cat.image_url,
        "sort_order": cat.sort_order,
        "is_visible": cat.is_visible,
    }, status=201)

@api_view(["PUT", "DELETE"])
@permission_classes([IsStaffOrDashboardAccess])
def staff_category_detail(request, pk):
    slug = request.query_params.get("restaurantSlug") or request.data.get("restaurantSlug")
    restaurant = get_restaurant_by_slug(slug)
    cat = Category.objects.filter(restaurant=restaurant, id=pk).first()
    if not cat:
        raise NotFound({"error": {"code": "NOT_FOUND", "message": "Category not found"}})

    if request.method == "PUT":
        data = request.data
        if "name" in data: cat.name = data["name"]
        if "description" in data: cat.description = data["description"]
        if "imageUrl" in data or "image_url" in data:
            cat.image_url = data.get("imageUrl") or data.get("image_url")
        if "sortOrder" in data: cat.sort_order = int(data["sortOrder"])
        if "isVisible" in data: cat.is_visible = bool(data["isVisible"])
        cat.save()
        return Response({
            "id": cat.id,
            "name": cat.name,
            "description": cat.description,
            "image_url": cat.image_url,
            "sort_order": cat.sort_order,
            "is_visible": cat.is_visible,
        })
    elif request.method == "DELETE":
        cat.delete()
        return Response(status=204)
