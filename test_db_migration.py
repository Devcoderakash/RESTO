"""
RESTO Database Migration & Production Data Architecture Test Suite
Verifies Supabase / PostgreSQL / Django ORM persistence for all business data.
Tests:
  TEST A: Restaurant Data Persistence
  TEST B: Menu Item & Category Creation/Update Persistence
  TEST C: Table Creation & Availability Persistence
  TEST D: Order Placement, Order Items, 5% GST & Status Persistence
  TEST E: Waiter Request Creation & Handling Persistence
  TEST F: Payment Record Creation & Order Association Persistence
  TEST G: Concurrent Operations (Simultaneous Order Placement)
  TEST H: Tenant Isolation (Cross-Restaurant Access Validation)
"""

import os
import sys
import json
import uuid
import threading
from decimal import Decimal

# Setup Django Environment
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "backend")))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django
django.setup()

from rest_framework.test import APIRequestFactory

from apps.restaurants.models import Restaurant
from apps.tables.models import RestaurantTable
from apps.menu.models import Category, MenuItem
from apps.orders.models import Order, OrderItem
from apps.payments.models import Payment
from apps.service_requests.models import ServiceRequest
from apps.orders.views import orders_collection_view, staff_order_status_view
from apps.service_requests.views import service_requests_view, service_request_detail_view
from apps.payments.views import payments_view
from apps.tables.views import table_availability, staff_table_status
from apps.restaurants.views import restaurant_detail, update_restaurant_settings

passed = 0
failed = 0

def test(name, condition, details=""):
    global passed, failed
    if condition:
        passed += 1
        print(f"  [PASS] {name}")
    else:
        failed += 1
        print(f"  [FAIL] {name}: {details}")

print("\n" + "=" * 70)
print("RESTO: PRODUCTION DATA ARCHITECTURE & PERSISTENCE TEST SUITE")
print("=" * 70)

factory = APIRequestFactory()
STAFF_AUTH = "Bearer demo-staff-token-manager"

# =====================================================================
# TEST A: RESTAURANT DATA PERSISTENCE
# =====================================================================
print("\n--- TEST A: Restaurant Data Persistence ---")
rest = Restaurant.objects.filter(slug="olive-and-ember").first()
test("Restaurant 'olive-and-ember' exists in DB", rest is not None)
if rest:
    original_name = rest.name
    original_wifi = rest.wifi_ssid
    # Update settings via API view
    req = factory.put(
        "/api/restaurants/settings",
        data={
            "restaurantSlug": "olive-and-ember",
            "name": "The Olive & Ember Hearth",
            "wifiSsid": "OliveHearth-5G"
        },
        format="json",
        HTTP_AUTHORIZATION=STAFF_AUTH
    )
    res = update_restaurant_settings(req)
    test("Update restaurant settings returns 200", res.status_code == 200, f"Got status {res.status_code}")

    # Verify directly from DB
    rest.refresh_from_db()
    test("Restaurant name persisted in DB", rest.name == "The Olive & Ember Hearth")
    test("Restaurant Wi-Fi persisted in DB", rest.wifi_ssid == "OliveHearth-5G")

    # Restore original name & wifi
    rest.name = original_name
    rest.wifi_ssid = original_wifi
    rest.save()

# =====================================================================
# TEST B: MENU ITEM & CATEGORY CREATION/UPDATE PERSISTENCE
# =====================================================================
print("\n--- TEST B: Menu Item & Category Persistence ---")
cat, _ = Category.objects.get_or_create(
    restaurant=rest,
    name="Test Hearth Bakery",
    defaults={"description": "Artisan bakery items", "sort_order": 99}
)
test("Category created in DB", cat.id is not None)

item, created = MenuItem.objects.get_or_create(
    restaurant=rest,
    category=cat,
    name="Truffle Sourdough Focaccia",
    defaults={
        "description": "Wood-fired with fresh rosemary and truffle glaze",
        "price": Decimal("380.00"),
        "available": True,
        "food_type": "veg"
    }
)
test("Menu item created in DB", item.id is not None)
test("Menu item price is Decimal('380.00')", item.price == Decimal("380.00"))

# Verify toggle availability
item.available = False
item.save()
item.refresh_from_db()
test("Menu item availability update persisted in DB", item.available is False)
item.available = True
item.save()

# =====================================================================
# TEST C: TABLE CREATION & AVAILABILITY PERSISTENCE
# =====================================================================
print("\n--- TEST C: Table Availability & State Persistence ---")
req = factory.get("/api/tables/availability?restaurantSlug=olive-and-ember")
res = table_availability(req)
test("Table availability API returns 200", res.status_code == 200)
tables_data = res.data.get("tables", [])
test("Tables count >= 10 in DB", len(tables_data) >= 10)

target_table = RestaurantTable.objects.filter(restaurant=rest, table_number="01").first()
test("Table 01 exists in DB", target_table is not None)
if target_table:
    # Toggle status via staff endpoint
    patch_req = factory.patch(
        f"/api/tables/{target_table.id}/status",
        data={"status": "occupied"},
        format="json",
        HTTP_AUTHORIZATION=STAFF_AUTH
    )
    res = staff_table_status(patch_req, pk=str(target_table.id))
    test("Staff table status patch returns 200", res.status_code == 200, f"Got {res.status_code}")

    target_table.refresh_from_db()
    test("Table status persisted as 'occupied' in DB", target_table.status == "occupied")

    # Restore to available
    target_table.status = "available"
    target_table.save()

# =====================================================================
# TEST D: ORDER PLACEMENT, ORDER ITEMS, 5% GST & STATUS PERSISTENCE
# =====================================================================
print("\n--- TEST D: Order Placement, 5% GST, and Status Workflow ---")
order_payload = {
    "restaurantSlug": "olive-and-ember",
    "tableNumber": "01",
    "customerName": "Rohan Sharma",
    "customerPhone": "+91 98765 43210",
    "paymentMethod": "upi",
    "specialInstructions": "Extra crisp focaccia",
    "idempotencyKey": f"test-idemp-{uuid.uuid4()}",
    "items": [
        {
            "id": str(item.id),
            "name": item.name,
            "price": 380,
            "quantity": 2,
            "customizations": []
        }
    ]
}

req = factory.post(
    "/api/orders",
    data=order_payload,
    format="json"
)
res = orders_collection_view(req)
test("Order placement returns 201", res.status_code == 201, f"Got {res.status_code}: {getattr(res, 'data', None)}")

order_id = res.data.get("id") if hasattr(res, "data") else None
test("Order ID returned from server", order_id is not None)

db_order = Order.objects.filter(id=order_id).first() if order_id else None
test("Order record persisted in PostgreSQL/DB", db_order is not None)
if db_order:
    test("Order table is 01", db_order.table.table_number == "01")
    # Subtotal: 380 * 2 = 760.00
    # 5% GST: 760 * 0.05 = 38.00
    # Total: 798.00
    test("Order subtotal persisted as 760.00", db_order.subtotal == Decimal("760.00"))
    test("5% GST calculated and persisted as 38.00", db_order.gst_total == Decimal("38.00"))
    test("CGST 2.5% persisted as 19.00", db_order.cgst == Decimal("19.00"))
    test("SGST 2.5% persisted as 19.00", db_order.sgst == Decimal("19.00"))
    test("Order final total persisted as 798.00", db_order.final_total == Decimal("798.00"))

    # Verify Order Items in DB
    items_count = OrderItem.objects.filter(order=db_order).count()
    test("Order items relational records persisted (1 item)", items_count == 1)

    order_item = OrderItem.objects.filter(order=db_order).first()
    test("OrderItem quantity is 2", order_item.quantity == 2)
    test("OrderItem unit_price is 380.00", order_item.unit_price == Decimal("380.00"))

    # Advance status through kitchen workflow (pending -> confirmed -> preparing)
    patch_req1 = factory.patch(
        f"/api/orders/{db_order.id}/status",
        data={"status": "confirmed"},
        format="json",
        HTTP_AUTHORIZATION=STAFF_AUTH
    )
    res1 = staff_order_status_view(patch_req1, pk=str(db_order.id))
    test("Advance order to 'confirmed' returns 200", res1.status_code == 200, f"Got {res1.status_code}")

    patch_req2 = factory.patch(
        f"/api/orders/{db_order.id}/status",
        data={"status": "preparing"},
        format="json",
        HTTP_AUTHORIZATION=STAFF_AUTH
    )
    res2 = staff_order_status_view(patch_req2, pk=str(db_order.id))
    test("Advance order to 'preparing' returns 200", res2.status_code == 200, f"Got {res2.status_code}")

    db_order.refresh_from_db()
    test("Order status persisted as 'preparing' in DB", db_order.status == "preparing")

# =====================================================================
# TEST E: SERVICE REQUEST CREATION & HANDLING PERSISTENCE
# =====================================================================
print("\n--- TEST E: Waiter / Bill Request Persistence ---")
req_payload = {
    "restaurantSlug": "olive-and-ember",
    "tableNumber": "01",
    "type": "water",
    "message": "Sparkling water please"
}
req = factory.post(
    "/api/service-requests",
    data=req_payload,
    format="json"
)
res = service_requests_view(req)
test("Create service request returns 201", res.status_code == 201)

srv_id = res.data.get("id") if hasattr(res, "data") else None
db_srv = ServiceRequest.objects.filter(id=srv_id).first() if srv_id else None
test("Service request record persisted in DB", db_srv is not None)
if db_srv:
    test("Service request status is 'pending'", db_srv.status == "pending")

    # Complete request
    patch_req = factory.patch(
        f"/api/service-requests/{db_srv.id}?restaurantSlug=olive-and-ember",
        data={"status": "completed", "restaurantSlug": "olive-and-ember"},
        format="json",
        HTTP_AUTHORIZATION=STAFF_AUTH
    )
    res = service_request_detail_view(patch_req, pk=str(db_srv.id))
    test("Resolve service request returns 200", res.status_code == 200, f"Got {res.status_code}")

    db_srv.refresh_from_db()
    test("Service request persisted as 'completed' in DB", db_srv.status == "completed")

# =====================================================================
# TEST F: PAYMENT RECORD CREATION & ORDER ASSOCIATION
# =====================================================================
print("\n--- TEST F: Payment Record & Order Association ---")
if db_order:
    pay_payload = {
        "restaurantSlug": "olive-and-ember",
        "orderId": str(db_order.id),
        "amount": 798.00,
        "paymentMethod": "upi",
        "status": "completed"
    }
    req = factory.post(
        "/api/payments",
        data=pay_payload,
        format="json",
        HTTP_AUTHORIZATION=STAFF_AUTH
    )
    res = payments_view(req)
    test("Payment creation returns 201", res.status_code == 201, f"Got {res.status_code}")

    pay_id = res.data.get("id") if hasattr(res, "data") else None
    db_pay = Payment.objects.filter(id=pay_id).first() if pay_id else None
    test("Payment record persisted in DB", db_pay is not None)
    if db_pay:
        test("Payment associated with correct Order", db_pay.order.id == db_order.id)
        test("Payment amount is 798.00", db_pay.amount == Decimal("798.00"))
        test("Payment method is UPI", db_pay.payment_method == "upi")
        test("Payment status is 'completed'", db_pay.payment_status == "completed")

# =====================================================================
# TEST G: CONCURRENT ORDER PROCESSING (SIMULTANEOUS PLACEMENT)
# =====================================================================
print("\n--- TEST G: Concurrent Operations Across Tables ---")
concurrent_orders = []
errors = []

def place_order_worker(table_num, worker_id):
    try:
        t_factory = APIRequestFactory()
        payload = {
            "restaurantSlug": "olive-and-ember",
            "tableNumber": table_num,
            "customerName": f"Concurrent Guest {worker_id}",
            "paymentMethod": "counter",
            "idempotencyKey": f"concurrent-{worker_id}-{uuid.uuid4()}",
            "items": [
                {
                    "id": str(item.id),
                    "name": item.name,
                    "price": 380,
                    "quantity": 1
                }
            ]
        }
        r = t_factory.post("/api/orders", data=payload, format="json")
        response = orders_collection_view(r)
        if response.status_code == 201:
            order_rec_id = response.data.get("id")
            concurrent_orders.append(order_rec_id)
        else:
            errors.append(f"Worker {worker_id} status {response.status_code}")
    except Exception as ex:
        errors.append(f"Worker {worker_id} exception: {ex}")

threads = []
table_numbers = ["02", "03", "04", "05", "06"]
for i, t_num in enumerate(table_numbers):
    th = threading.Thread(target=place_order_worker, args=(t_num, i+1))
    threads.append(th)
    th.start()

for th in threads:
    th.join()

test("All 5 concurrent orders processed without errors", len(errors) == 0, str(errors))
test("5 unique order records persisted in DB", len(set(concurrent_orders)) == 5)
test("Database records verified for all 5 concurrent orders", Order.objects.filter(id__in=concurrent_orders).count() == 5)

# =====================================================================
# TEST H: TENANT ISOLATION (CROSS-RESTAURANT ACCESS)
# =====================================================================
print("\n--- TEST H: Tenant Isolation ---")
other_rest, _ = Restaurant.objects.get_or_create(
    slug="other-bistro",
    defaults={
        "name": "Other Bistro",
        "currency": "INR",
        "tax_percentage": Decimal("5.00")
    }
)

# Attempt to access non-existent restaurant
req_bad = factory.get("/api/restaurants/non-existent-restaurant-slug")
res_bad = restaurant_detail(req_bad, slug="non-existent-restaurant-slug")
test("Unknown restaurant returns 404", res_bad.status_code == 404)

# Attempt to create order for other restaurant with Table 01 from Olive & Ember
cross_order_payload = {
    "restaurantSlug": "other-bistro",
    "tableNumber": "999", # table doesn't belong to other-bistro
    "customerName": "Intruder",
    "paymentMethod": "counter",
    "idempotencyKey": str(uuid.uuid4()),
    "items": [{"id": str(item.id), "name": item.name, "price": 380, "quantity": 1}]
}
req_cross = factory.post("/api/orders", data=cross_order_payload, format="json")
res_cross = orders_collection_view(req_cross)
test("Cross-tenant invalid table/menu rejected (400 or 404)", res_cross.status_code in (400, 404))

# Clean up temporary test objects
if db_order:
    Payment.objects.filter(order=db_order).delete()
    OrderItem.objects.filter(order=db_order).delete()
    db_order.delete()
Order.objects.filter(id__in=concurrent_orders).delete()
if db_srv:
    db_srv.delete()
RestaurantTable.objects.filter(restaurant=rest).update(status="available")
MenuItem.objects.filter(name="Truffle Sourdough Focaccia").delete()
Category.objects.filter(name="Test Hearth Bakery").delete()
other_rest.delete()

print("\n" + "=" * 70)
print(f"DATABASE PERSISTENCE TEST RESULTS: {passed} PASSED, {failed} FAILED")
print("=" * 70)

sys.exit(0 if failed == 0 else 1)
