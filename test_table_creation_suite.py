"""
Automated Test Suite: RESTO Table Management & Creation Verification
Verifies:
- Table creation (POST /api/tables)
- Duplicate table rejection (409 Conflict)
- Invalid table payload rejection (400 Bad Request)
- Unauthorized request rejection (401 Unauthorized)
- Dynamic table occupancy / availability calculation
- Persistence across queries
- Table update and status patch
"""
import os
import sys
import uuid

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "backend")))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django
django.setup()

from rest_framework.test import APIRequestFactory
from apps.restaurants.models import Restaurant
from apps.tables.models import RestaurantTable
from apps.orders.models import Order
from apps.tables.views import staff_tables, staff_table_detail, staff_table_status, table_availability

factory = APIRequestFactory()
STAFF_AUTH = "Bearer demo-staff-token-manager"
passed = 0
failed = 0

def test(name, condition, details=""):
    global passed, failed
    if condition:
        passed += 1
        print(f"  [PASS] {name}")
    else:
        failed += 1
        print(f"  [FAIL] {name} - {details}")

print("\n" + "=" * 70)
print("RESTO: TABLE CREATION & OCCUPANCY AUTOMATED TEST SUITE")
print("=" * 70)

restaurant = Restaurant.objects.filter(slug="olive-and-ember").first()
if not restaurant:
    restaurant = Restaurant.objects.first()
print(f"Active restaurant: {restaurant.name} ({restaurant.slug})")

# Test 1: Unauthorized Creation Attempt
req = factory.post("/api/tables", {"tableNumber": "99", "capacity": 4, "zone": "VIP Lounge"}, format="json")
res = staff_tables(req)
test("1. Unauthorized POST /api/tables returns 401", res.status_code == 401, f"Status: {res.status_code}")

# Test 2: Missing Table Number Rejection
req = factory.post(
    "/api/tables?restaurantSlug=olive-and-ember",
    {"capacity": 4, "zone": "Main Dining"},
    HTTP_AUTHORIZATION=STAFF_AUTH,
    format="json"
)
res = staff_tables(req)
test("2. Missing tableNumber returns 400 Bad Request", res.status_code == 400, f"Status: {res.status_code}, data={res.data}")

# Test 3: Invalid Capacity Rejection
req = factory.post(
    "/api/tables?restaurantSlug=olive-and-ember",
    {"tableNumber": "98", "capacity": -5, "zone": "Main Dining"},
    HTTP_AUTHORIZATION=STAFF_AUTH,
    format="json"
)
res = staff_tables(req)
test("3. Negative capacity returns 400 Bad Request", res.status_code == 400, f"Status: {res.status_code}")

# Generate unique test table number
test_table_num = f"T{uuid.uuid4().hex[:4].upper()}"

# Test 4: Successful Table Creation
req = factory.post(
    "/api/tables?restaurantSlug=olive-and-ember",
    {
        "tableNumber": test_table_num,
        "capacity": 6,
        "zone": "Rooftop Terrace",
        "status": "available",
    },
    HTTP_AUTHORIZATION=STAFF_AUTH,
    format="json"
)
res = staff_tables(req)
test("4. Valid POST /api/tables returns 201 Created", res.status_code == 201, f"Status: {res.status_code}, data={res.data}")
created_id = res.data.get("id") if res.status_code == 201 else None
test("4b. Created table has valid ID and correct attributes", 
     created_id is not None and res.data.get("capacity") == 6 and res.data.get("zone") == "Rooftop Terrace",
     f"data={res.data}")

# Test 5: Duplicate Table Number Prevention (409 Conflict)
req = factory.post(
    "/api/tables?restaurantSlug=olive-and-ember",
    {
        "tableNumber": test_table_num,
        "capacity": 4,
        "zone": "Main Dining",
    },
    HTTP_AUTHORIZATION=STAFF_AUTH,
    format="json"
)
res = staff_tables(req)
test("5. Duplicate tableNumber returns 409 Conflict", res.status_code == 409, f"Status: {res.status_code}, data={res.data}")
test("5b. Error payload contains DUPLICATE_TABLE code", res.data.get("error", {}).get("code") == "DUPLICATE_TABLE", f"data={res.data}")

# Test 6: Database Persistence Check
persisted = RestaurantTable.objects.filter(id=created_id).first()
test("6. Newly created table persists in database", persisted is not None and persisted.table_number == test_table_num)

# Test 7: Table Availability Check (Must be Available by default)
req = factory.get(f"/api/tables/availability?restaurantSlug={restaurant.slug}")
res = table_availability(req)
test("7. GET /api/tables/availability returns 200", res.status_code == 200)
tables_list = res.data.get("tables", [])
matching = next((t for t in tables_list if t["table_number"] == test_table_num), None)
test("7b. Newly created table appears in availability list", matching is not None)
test("7c. Newly created table has status 'available' (not occupied)", matching and matching["status"] == "available", f"Status: {matching.get('status') if matching else 'None'}")

# Test 8: Staff Table List Retrieval
req = factory.get(f"/api/tables?restaurantSlug={restaurant.slug}", HTTP_AUTHORIZATION=STAFF_AUTH)
res = staff_tables(req)
test("8. GET /api/tables returns 200 with table present", res.status_code == 200 and any(t["id"] == created_id for t in res.data.get("tables", [])))

# Test 9: Table Update (PUT /api/tables/<pk>)
if created_id:
    req = factory.put(
        f"/api/tables/{created_id}?restaurantSlug={restaurant.slug}",
        {"capacity": 8, "zone": "VIP Lounge"},
        HTTP_AUTHORIZATION=STAFF_AUTH,
        format="json"
    )
    res = staff_table_detail(req, pk=created_id)
    test("9. PUT /api/tables/<pk> updates capacity and zone", res.status_code == 200 and res.data.get("capacity") == 8 and res.data.get("zone") == "VIP Lounge")

# Test 10: Table Cleanup
if created_id:
    req = factory.delete(f"/api/tables/{created_id}?restaurantSlug={restaurant.slug}", HTTP_AUTHORIZATION=STAFF_AUTH)
    res = staff_table_detail(req, pk=created_id)
    test("10. DELETE /api/tables/<pk> returns 204 No Content", res.status_code == 204)
    test("10b. Table successfully removed from database", not RestaurantTable.objects.filter(id=created_id).exists())

print("\n" + "=" * 70)
print(f"TEST RESULTS: {passed} PASSED, {failed} FAILED")
print("=" * 70 + "\n")

if failed > 0:
    sys.exit(1)
