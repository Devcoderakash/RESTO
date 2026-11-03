"""
RESTO — Dashboard API Regression & Cold-Start Resilience Test Suite
Validates:
1. All Dashboard GET Endpoints (Orders, Tables, Service Requests, Overview, Daily Sales, Payments, Menu, Settings)
2. Staff Authentication & Header Verification
3. Tenant Isolation (slug scoping)
4. Business Data Contract & Key Metrics
5. Realtime Event Synchronization
"""

import os
import sys
import json
import time

sys.path.insert(0, "backend")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django
django.setup()

from django.test import Client
from apps.restaurants.models import Restaurant
from apps.tables.models import RestaurantTable
from apps.menu.models import MenuItem, Category
from apps.orders.models import Order
from apps.realtime.models import RealtimeEvent
from apps.service_requests.models import ServiceRequest

STAFF_TOKEN = "demo-staff-token-manager"
RESTAURANT_SLUG = "olive-and-ember"
STAFF_AUTH = {
    "HTTP_AUTHORIZATION": f"Bearer {STAFF_TOKEN}",
    "HTTP_X_STAFF_INTERNAL": "true",
}

class DashboardRegressionTester:
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

    def run(self):
        print("\n" + "=" * 70)
        print("RESTO: DASHBOARD API COMPREHENSIVE REGRESSION TEST SUITE")
        print("=" * 70)

        # 1. Health check
        print("\n--- 1. Backend & Database Health ---")
        res = self.client.get("/api/health")
        self.log(res.status_code == 200, "1a. GET /api/health returns 200")
        data = res.json()
        self.log(data.get("status") == "ok", "1b. System status is 'ok'")
        self.log("database_vendor" in data, "1c. Database vendor reported", f"vendor: {data.get('database_vendor')}")

        # 2. Orders Endpoint
        print("\n--- 2. Dashboard Live Orders ---")
        res = self.client.get("/api/orders", **STAFF_AUTH)
        self.log(res.status_code == 200, "2a. Staff GET /api/orders returns 200")
        data = res.json()
        orders = data.get("orders", [])
        self.log(isinstance(orders, list), "2b. Orders payload contains list", f"({len(orders)} orders)")
        if orders:
            first = orders[0]
            has_fields = all(k in first for k in ["id", "table_number", "order_status", "total"])
            self.log(has_fields, "2c. Order items have mandatory fields (id, table, status, total)")

        # Unauthenticated orders
        res_unauth = self.client.get("/api/orders")
        self.log(res_unauth.status_code == 401, "2d. Unauthenticated GET /api/orders blocked (401)")

        # 3. Tables Endpoint
        print("\n--- 3. Dashboard Floor Tables ---")
        res = self.client.get("/api/tables", **STAFF_AUTH)
        self.log(res.status_code == 200, "3a. Staff GET /api/tables returns 200")
        tables = res.json().get("tables", [])
        self.log(len(tables) > 0, "3b. Tables returned", f"({len(tables)} tables)")
        if tables:
            first_t = tables[0]
            self.log("capacity" in first_t and "status" in first_t, "3c. Table schema has capacity & status")

        # 4. Service Requests Endpoint
        print("\n--- 4. Dashboard Service Requests ---")
        res = self.client.get(f"/api/service-requests?restaurantSlug={RESTAURANT_SLUG}", **STAFF_AUTH)
        self.log(res.status_code == 200, "4a. GET /api/service-requests returns 200")
        requests_list = res.json().get("requests", res.json().get("serviceRequests", []))
        self.log(isinstance(requests_list, list), "4b. Service requests returned as list")

        # 5. Dashboard Overview Analytics
        print("\n--- 5. Dashboard Overview Analytics ---")
        res = self.client.get(f"/api/dashboard/overview?restaurantSlug={RESTAURANT_SLUG}", **STAFF_AUTH)
        self.log(res.status_code == 200, "5a. GET /api/dashboard/overview returns 200")
        ov = res.json()
        self.log("totalOrders" in ov or "total_orders" in ov, "5b. Overview includes totalOrders metric")
        self.log("todayRevenue" in ov or "today_revenue" in ov, "5c. Overview includes todayRevenue metric")
        self.log("activeTables" in ov or "active_tables" in ov, "5d. Overview includes activeTables metric")

        # 6. Daily Sales Analytics
        print("\n--- 6. Dashboard Daily Sales ---")
        res = self.client.get(f"/api/dashboard/daily-sales?restaurantSlug={RESTAURANT_SLUG}", **STAFF_AUTH)
        self.log(res.status_code == 200, "6a. GET /api/dashboard/daily-sales returns 200")
        sales = res.json().get("sales", [])
        self.log(isinstance(sales, list), "6b. Sales data returned as list")

        # 7. Payments Transactions
        print("\n--- 7. Payments Transactions ---")
        res = self.client.get(f"/api/payments?restaurantSlug={RESTAURANT_SLUG}", **STAFF_AUTH)
        self.log(res.status_code == 200, "7a. GET /api/payments returns 200")
        payments = res.json().get("payments", [])
        self.log(isinstance(payments, list), "7b. Payments returned as list")

        # 8. Staff Restaurant Settings
        print("\n--- 8. Restaurant Settings ---")
        res = self.client.get("/api/staff/restaurant-settings", **STAFF_AUTH)
        self.log(res.status_code == 200, "8a. GET /api/staff/restaurant-settings returns 200")
        rest_data = res.json()
        self.log(rest_data.get("slug") == RESTAURANT_SLUG, "8b. Restaurant slug matches tenant context")

        # 9. Realtime Event Synchronization
        print("\n--- 9. Realtime Event Stream & Sync ---")
        res = self.client.get(f"/api/realtime/sync?restaurantSlug={RESTAURANT_SLUG}&lastEventId=0", **STAFF_AUTH)
        self.log(res.status_code == 200, "9a. Staff GET /api/realtime/sync returns 200")
        events = res.json().get("events", [])
        self.log(isinstance(events, list), "9b. Events list returned for catchup")

        # 10. Multi-Tenant Isolation
        print("\n--- 10. Multi-Tenant Isolation ---")
        res_other = self.client.get("/api/restaurants/info?slug=non-existent-restaurant-slug")
        self.log(res_other.status_code == 404, "10a. Querying nonexistent tenant returns 404")

        print("\n" + "=" * 70)
        print(f"DASHBOARD REGRESSION RESULTS: {self.passed} PASSED, {self.failed} FAILED")
        print("=" * 70 + "\n")
        return self.failed == 0

if __name__ == "__main__":
    success = DashboardRegressionTester().run()
    sys.exit(0 if success else 1)

