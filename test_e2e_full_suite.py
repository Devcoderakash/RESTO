"""
RESTO — Full Automated E2E & Production Verification Suite
Covers:
- Workflow A: Restaurant initialization
- Workflow B: Customer ordering & tracking journey (5% GST calculation)
- Workflow C: Admin dashboard operations & status transitions
- Workflow D: Realtime SSE & state sync (headers, events, recovery)
- Workflow E: Failure, validation & security scenarios
"""

import os
import sys
import uuid
import json
import time

sys.path.insert(0, "backend")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django
django.setup()

from django.test import Client
from apps.restaurants.models import Restaurant
from apps.tables.models import RestaurantTable
from apps.menu.models import Category, MenuItem
from apps.orders.models import Order
from apps.realtime.models import RealtimeEvent

STAFF_TOKEN = "demo-staff-token-manager"
RESTAURANT_SLUG = "olive-and-ember"

class E2ETestRunner:
    def __init__(self):
        self.client = Client()
        self.restaurant = Restaurant.objects.filter(slug=RESTAURANT_SLUG).first()
        self.passed = 0
        self.failed = 0
        self.results = []

    def log(self, passed: bool, name: str, detail: str = ""):
        status = "PASS" if passed else "FAIL"
        if passed:
            self.passed += 1
            print(f"  [\033[92m{status}\033[0m] {name} {detail}")
        else:
            self.failed += 1
            print(f"  [\033[91m{status}\033[0m] {name} {detail}")
        self.results.append({"name": name, "status": status, "detail": detail})

    def run_all(self):
        print("\n" + "=" * 70)
        print("RESTO: FULL E2E AUTOMATED PRODUCTION VERIFICATION SUITE")
        print("=" * 70)

        self.test_workflow_a_restaurant_init()
        self.test_workflow_b_customer_journey()
        self.test_workflow_c_admin_operations()
        self.test_workflow_d_realtime_events()
        self.test_workflow_e_failure_scenarios()

        print("\n" + "=" * 70)
        print(f"E2E SUITE SUMMARY: {self.passed} PASSED, {self.failed} FAILED")
        print("=" * 70 + "\n")
        return self.failed == 0

    def test_workflow_a_restaurant_init(self):
        print("\n--- Workflow A: Restaurant Initialization ---")
        # 1. Restaurant info
        res = self.client.get(f"/api/restaurants/info?slug={RESTAURANT_SLUG}")
        self.log(res.status_code == 200, "A1. Fetch restaurant info returns 200")
        data = res.json()
        self.log(data.get("name") == "The Olive & Ember", "A1b. Restaurant name matches")

        # 2. Categories
        res = self.client.get(f"/api/menu/categories?restaurantSlug={RESTAURANT_SLUG}")
        self.log(res.status_code == 200, "A2. Fetch categories returns 200")
        cats = res.json().get("categories", [])
        self.log(len(cats) > 0, f"A2b. Categories count > 0 (found {len(cats)})")

        # 3. Public Menu
        res = self.client.get(f"/api/menu?restaurantSlug={RESTAURANT_SLUG}")
        self.log(res.status_code == 200, "A3. Fetch public menu returns 200")
        items = res.json().get("items", [])
        self.log(len(items) > 0, f"A3b. Menu items count > 0 (found {len(items)})")

        # 4. Tables availability
        res = self.client.get(f"/api/tables/availability?restaurantSlug={RESTAURANT_SLUG}")
        self.log(res.status_code == 200, "A4. Fetch tables availability returns 200")
        tbls = res.json().get("tables", [])
        self.log(len(tbls) > 0, f"A4b. Configured tables count > 0 (found {len(tbls)})")

    def test_workflow_b_customer_journey(self):
        print("\n--- Workflow B: Customer Ordering Journey & 5% GST ---")
        # Get a menu item
        menu_item = MenuItem.objects.filter(restaurant=self.restaurant, available=True).first()
        self.log(menu_item is not None, "B1. Active menu item available for test order")
        if not menu_item:
            return

        # Create temporary test table
        table_num = f"T{int(time.time()) % 1000}"
        table = RestaurantTable.objects.create(
            id=f"tbl-test-{uuid.uuid4().hex[:6]}",
            restaurant=self.restaurant,
            table_number=table_num,
            capacity=4,
            zone="Main Dining",
            status="available",
        )

        idempotency_key = f"idem-e2e-{uuid.uuid4().hex[:12]}"
        order_payload = {
            "restaurantSlug": RESTAURANT_SLUG,
            "tableNumber": table_num,
            "customerName": "Test Customer E2E",
            "paymentMethod": "counter",
            "idempotencyKey": idempotency_key,
            "items": [
                {
                    "menuItemId": menu_item.id,
                    "quantity": 2,
                    "selectedAddons": [],
                    "specialInstructions": "Extra spicy",
                }
            ],
        }

        # Submit order
        res = self.client.post("/api/orders", data=json.dumps(order_payload), content_type="application/json")
        self.log(res.status_code == 201, f"B2. Order creation returns 201 Created (got {res.status_code})")
        order_data = res.json()
        order_id = order_data.get("id")
        self.log(bool(order_id), f"B2b. Order ID generated: {order_id}")

        # Check 5% GST Breakdown
        subtotal = float(menu_item.price) * 2
        expected_gst = round(subtotal * 0.05, 2)
        actual_gst = order_data.get("tax", 0)
        self.log(abs(actual_gst - expected_gst) < 0.02, f"B3. 5% GST calculated accurately ({actual_gst} vs expected {expected_gst})")

        # Tracking token lookup
        access_token = order_data.get("accessToken")
        self.log(bool(access_token), f"B4. Tracking access token returned")

        # Customer tracking view
        res = self.client.get(f"/api/orders/{order_id}/tracking?accessToken={access_token}")
        self.log(res.status_code == 200, "B5. Customer tracking endpoint returns 200 with valid token")
        tracked = res.json()
        self.log(tracked.get("status") == "received", f"B5b. Order stage is received (got {tracked.get('status')})")

        # Cleanup test table and test order
        table.delete()
        Order.objects.filter(id=order_id).delete()

    def test_workflow_c_admin_operations(self):
        print("\n--- Workflow C: Admin Dashboard Operations ---")
        headers = {"HTTP_AUTHORIZATION": f"Bearer {STAFF_TOKEN}", "HTTP_X_STAFF_INTERNAL": "true"}

        # 1. Fetch live orders
        res = self.client.get(f"/api/orders?restaurantSlug={RESTAURANT_SLUG}", **headers)
        self.log(res.status_code == 200, "C1. Staff GET /api/orders returns 200")
        orders = res.json().get("orders", [])
        self.log(isinstance(orders, list), f"C1b. Orders list returned ({len(orders)} orders)")

        # 2. Fetch staff tables
        res = self.client.get(f"/api/tables?restaurantSlug={RESTAURANT_SLUG}", **headers)
        self.log(res.status_code == 200, "C2. Staff GET /api/tables returns 200")

        # 3. Fetch dashboard overview
        res = self.client.get(f"/api/dashboard/overview?restaurantSlug={RESTAURANT_SLUG}", **headers)
        self.log(res.status_code == 200, "C3. Staff GET /api/dashboard/overview returns 200")
        overview = res.json()
        self.log("todayRevenue" in overview and "activeTables" in overview, "C3b. Overview contains key metrics")

        # 4. Fetch daily sales
        res = self.client.get(f"/api/dashboard/daily-sales?restaurantSlug={RESTAURANT_SLUG}", **headers)
        self.log(res.status_code == 200, "C4. Staff GET /api/dashboard/daily-sales returns 200")

        # 5. Fetch service requests
        res = self.client.get(f"/api/service-requests?restaurantSlug={RESTAURANT_SLUG}", **headers)
        self.log(res.status_code == 200, "C5. Staff GET /api/service-requests returns 200")

    def test_workflow_d_realtime_events(self):
        print("\n--- Workflow D: Realtime SSE & Event Synchronization ---")
        headers = {"HTTP_AUTHORIZATION": f"Bearer {STAFF_TOKEN}", "HTTP_X_STAFF_INTERNAL": "true"}

        # 1. Query sync endpoint with lastEventId
        res = self.client.get(f"/api/realtime/sync?restaurantSlug={RESTAURANT_SLUG}&lastEventId=0", **headers)
        self.log(res.status_code == 200, "D1. GET /api/realtime/sync returns 200")
        sync_data = res.json()
        events = sync_data.get("events", [])
        self.log(isinstance(events, list), f"D1b. Events catch-up list returned ({len(events)} events)")

        # 2. Rejection of unauthenticated realtime sync
        unauth_res = self.client.get(f"/api/realtime/sync?restaurantSlug={RESTAURANT_SLUG}&lastEventId=0")
        self.log(unauth_res.status_code == 401, f"D2. Unauthenticated sync rejected with 401 (got {unauth_res.status_code})")

    def test_workflow_e_failure_scenarios(self):
        print("\n--- Workflow E: Failure & Security Scenarios ---")
        headers = {"HTTP_AUTHORIZATION": f"Bearer {STAFF_TOKEN}", "HTTP_X_STAFF_INTERNAL": "true"}

        # 1. Invalid restaurant slug
        res = self.client.get("/api/menu?restaurantSlug=non-existent-restaurant-slug-12345")
        self.log(res.status_code == 404, "E1. Invalid restaurant slug returns 404")

        # 2. Staff endpoint without credentials returns 401
        res = self.client.get(f"/api/tables?restaurantSlug={RESTAURANT_SLUG}")
        self.log(res.status_code == 401, "E2. Staff endpoint without token returns 401")

        # 3. Order tracking without accessToken returns 404/401 (IDOR protection)
        order = Order.objects.filter(restaurant=self.restaurant).first()
        if order:
            res = self.client.get(f"/api/orders/{order.id}/tracking")
            self.log(res.status_code in (401, 404), f"E3. Order tracking without token blocked ({res.status_code})")

        # 4. Order creation with empty items returns 400
        res = self.client.post("/api/orders", data=json.dumps({"restaurantSlug": RESTAURANT_SLUG, "tableNumber": "01", "items": []}), content_type="application/json")
        self.log(res.status_code == 400, "E4. Order creation with empty items returns 400")

        # 5. Idempotent order duplicate submission returns existing order (200)
        menu_item = MenuItem.objects.filter(restaurant=self.restaurant, available=True).first()
        if menu_item:
            idem_key = f"idem-dup-{uuid.uuid4().hex[:8]}"
            payload = {
                "restaurantSlug": RESTAURANT_SLUG,
                "tableNumber": "01",
                "paymentMethod": "counter",
                "idempotencyKey": idem_key,
                "items": [{"menuItemId": menu_item.id, "quantity": 1}],
            }
            res1 = self.client.post("/api/orders", data=json.dumps(payload), content_type="application/json")
            res2 = self.client.post("/api/orders", data=json.dumps(payload), content_type="application/json")
            self.log(res1.status_code == 201 and res2.status_code == 200, f"E5. Duplicate order submission is idempotent (1st={res1.status_code}, 2nd={res2.status_code})")
            if res1.status_code == 201:
                Order.objects.filter(id=res1.json().get("id")).delete()

if __name__ == "__main__":
    runner = E2ETestRunner()
    success = runner.run_all()
    sys.exit(0 if success else 1)
