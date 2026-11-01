import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from decimal import Decimal
from apps.restaurants.models import Restaurant
from apps.tables.models import RestaurantTable
from apps.menu.models import Category, MenuItem
from apps.dashboard.models import StaffMember

def seed():
    print("Seeding RESTO database...")
    restaurant, _ = Restaurant.objects.update_or_create(
        slug="olive-and-ember",
        defaults={
            "id": "rest-olive-ember-01",
            "name": "The Olive & Ember",
            "description": "Artisanal Mediterranean & Wood-Fired Hearth Dining",
            "address": "14 Wood Street, Indiranagar, Bengaluru",
            "phone": "+91 80 4123 4567",
            "email": "contact@oliveandember.com",
            "logo_url": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&h=200&fit=crop&q=80",
            "opening_hours": {
                "monday": "12:00 PM - 11:30 PM",
                "tuesday": "12:00 PM - 11:30 PM",
                "wednesday": "12:00 PM - 11:30 PM",
                "thursday": "12:00 PM - 11:30 PM",
                "friday": "12:00 PM - 12:00 AM",
                "saturday": "12:00 PM - 12:00 AM",
                "sunday": "12:00 PM - 11:00 PM",
            },
            "wifi_ssid": "OliveEmber-Guest",
            "wifi_password": "FiredWood2026",
            "tax_percentage": Decimal("5.00"),
            "service_charge_percentage": Decimal("0.00"),
            "currency": "INR",
            "timezone": "Asia/Kolkata",
            "is_active": True,
        }
    )
    print(f"Created restaurant: {restaurant.name}")

    # Tables
    zones = ["Garden", "Main Dining", "Patio", "Bar Lounge"]
    for i in range(1, 21):
        num = str(i).zfill(2)
        zone = zones[(i - 1) % len(zones)]
        capacity = 2 if i % 3 == 1 else 6 if i % 4 == 0 else 4
        RestaurantTable.objects.update_or_create(
            restaurant=restaurant,
            table_number=num,
            defaults={
                "id": f"tbl-{i}",
                "capacity": capacity,
                "zone": zone,
                "status": "available",
                "qr_code_url": f"/menu?table={num}",
            }
        )
    print(f"Seeded 20 tables")

    # Categories
    categories_data = [
        ("cat-1", "Starters", "Small plates, artisanal breads, and appetizers to begin", 1),
        ("cat-2", "Main Course", "Wood-fired hearth roasts, slow braises, and coastal mains", 2),
        ("cat-3", "Pizza & Pasta", "Handcrafted sourdough pizzas and extruded fresh pastas", 3),
        ("cat-4", "Beverages", "Botanical mocktails, cold brews, and sparkling refreshers", 4),
        ("cat-5", "Desserts", "Decadent house-made dolci and artisanal gelato finishes", 5),
    ]
    for cid, cname, cdesc, csort in categories_data:
        Category.objects.update_or_create(
            restaurant=restaurant,
            name=cname,
            defaults={
                "id": cid,
                "description": cdesc,
                "sort_order": csort,
                "is_visible": True,
            }
        )
    print("Seeded 5 categories")

    # Menu Items
    menu_items_data = [
        (
            "item-1", "cat-1", "Truffle & Wild Mushroom Arancini",
            "Crispy carnaroli rice balls filled with wild forest mushrooms, black truffle paste, and molten smoked provolone, served over warm san marzano dip.",
            Decimal("425.00"), "https://images.unsplash.com/photo-1541529086526-db283c563270?w=900&q=80",
            "veg", ["vegetarian"], True, True, 15,
            [{"id": "truffle-dip", "name": "Extra Truffle Aioli Dip", "price": 80}]
        ),
        (
            "item-2", "cat-1", "Charred Harissa Chicken Skewers",
            "Free-range chicken breast marinated in smoky North African harissa, charred on the live wood hearth, garnished with pickled red onion.",
            Decimal("545.00"), "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=900&q=80",
            "non_veg", [], True, False, 20,
            [{"id": "extra-skewer", "name": "Extra Skewer", "price": 120}]
        ),
        (
            "item-3", "cat-2", "Slow-Braised Rosemary Lamb Shank",
            "Slow-braised lamb with rosemary jus, creamy polenta, and charred heirloom carrots.",
            Decimal("895.00"), "https://images.unsplash.com/photo-1544025162-d76694265947?w=900&q=80",
            "non_veg", [], True, True, 35, []
        ),
        (
            "item-4", "cat-3", "Wood-Fired Margherita Pizza",
            "San Marzano tomato base, fresh fior di latte mozzarella, basil, and extra virgin olive oil.",
            Decimal("595.00"), "https://images.unsplash.com/photo-1579751626657-72bc17010498?w=900&q=80",
            "veg", ["vegetarian"], True, False, 18,
            [{"id": "extra-cheese", "name": "Extra Buffalo Mozzarella", "price": 90}]
        ),
        (
            "item-5", "cat-3", "Handmade Truffle Tagliolini",
            "Fresh egg pasta tossed with winter black truffle paste, butter, and 24-month Parmigiano.",
            Decimal("685.00"), "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=900&q=80",
            "veg", ["vegetarian"], False, True, 20, []
        ),
        (
            "item-6", "cat-5", "Amalfi Lemon & Basil Panna Cotta",
            "Velvety Piedmontese cooked cream infused with fresh basil, topped with a tart Amalfi lemon curd and candied zest.",
            Decimal("365.00"), "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=900&q=80",
            "veg", ["vegetarian"], False, False, 10, []
        ),
        (
            "item-7", "cat-5", "Dark Chocolate Fondant",
            "Warm molten Valrhona dark chocolate cake served with Madagascar vanilla bean gelato.",
            Decimal("395.00"), "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=900&q=80",
            "veg", ["vegetarian"], True, True, 14, []
        ),
    ]

    for iid, cid, iname, idesc, iprice, iimg, ifood, itags, ipop, ispec, iprep, iaddons in menu_items_data:
        MenuItem.objects.update_or_create(
            restaurant=restaurant,
            id=iid,
            defaults={
                "category_id": cid,
                "name": iname,
                "description": idesc,
                "price": iprice,
                "image_url": iimg,
                "food_type": ifood,
                "dietary_tags": itags,
                "popular": ipop,
                "chef_special": ispec,
                "preparation_time_minutes": iprep,
                "addons": iaddons,
                "available": True,
            }
        )
    print("Seeded 7 dishes")

    # Staff
    StaffMember.objects.update_or_create(
        email="contact@grandbistrolounge.com",
        restaurant=restaurant,
        defaults={
            "id": "stf-manager",
            "full_name": "Restaurant Manager",
            "role": "manager",
            "is_active": True,
        }
    )
    print("Seeded staff member")
    print("Seeding complete!")

if __name__ == "__main__":
    seed()

