from django.test import TestCase
from rest_framework.test import APIClient
from decimal import Decimal
from apps.restaurants.models import Restaurant
from apps.tables.models import RestaurantTable
from apps.menu.models import Category, MenuItem
from apps.orders.models import Order

class RestoAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.restaurant = Restaurant.objects.create(
            id="rest-test-01",
            name="Test Bistro",
            slug="test-bistro",
            tax_percentage=Decimal("5.00"),
        )
        self.table = RestaurantTable.objects.create(
            id="tbl-test-02",
            restaurant=self.restaurant,
            table_number="02",
            capacity=4,
            status="available",
        )
        self.category = Category.objects.create(
            id="cat-test-01",
            restaurant=self.restaurant,
            name="Starters",
            sort_order=1,
        )
        self.item1 = MenuItem.objects.create(
            id="item-test-1",
            restaurant=self.restaurant,
            category=self.category,
            name="Arancini",
            price=Decimal("425.00"),
            available=True,
        )
        self.item2 = MenuItem.objects.create(
            id="item-test-2",
            restaurant=self.restaurant,
            category=self.category,
            name="Margherita",
            price=Decimal("595.00"),
            available=True,
        )

    def test_health(self):
        res = self.client.get("/health")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data, {"status": "ok"})

    def test_table_availability(self):
        res = self.client.get("/api/tables/availability?restaurantSlug=test-bistro")
        self.assertEqual(res.status_code, 200)
        tables = res.data["tables"]
        self.assertTrue(any(t["number"] == "02" and t["status"] == "available" for t in tables))

    def test_order_creation_and_gst_calculation(self):
        # 2x Arancini (850) + 1x Margherita (595) = 1445
        # 5% GST = 72.25
        # Total = 1517.25
        order_data = {
            "restaurantSlug": "test-bistro",
            "tableNumber": 2,
            "customerName": "Test Customer",
            "idempotencyKey": "test-idemp-123",
            "paymentMethod": "counter",
            "items": [
                {"menuItemId": "item-test-1", "quantity": 2},
                {"menuItemId": "item-test-2", "quantity": 1},
            ],
        }
        res = self.client.post("/api/orders", order_data, format="json")
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data["breakdown"]["subtotal"], 1445.0)
        self.assertEqual(res.data["breakdown"]["gstTotal"], 72.25)
        self.assertEqual(res.data["breakdown"]["finalTotal"], 1517.25)

        # Check table is now occupied
        self.table.refresh_from_db()
        self.assertEqual(self.table.status, "occupied")

        # Idempotency check: submitting again with same key returns 200 and same order
        res_dup = self.client.post("/api/orders", order_data, format="json")
        self.assertEqual(res_dup.status_code, 200)
        self.assertEqual(res_dup.data["id"], res.data["id"])

    def test_order_status_transitions_and_table_release(self):
        order_data = {
            "restaurantSlug": "test-bistro",
            "tableNumber": 2,
            "idempotencyKey": "test-idemp-456",
            "items": [{"menuItemId": "item-test-1", "quantity": 1}],
        }
        res = self.client.post("/api/orders", order_data, format="json")
        order_id = res.data["id"]

        # 1. Accept
        res_accept = self.client.patch(f"/api/orders/{order_id}/status", {"status": "confirmed"}, format="json")
        self.assertEqual(res_accept.status_code, 200)

        # 2. Complete order directly should fail because must go through preparing -> ready -> served -> completed
        res_invalid = self.client.patch(f"/api/orders/{order_id}/status", {"status": "completed"}, format="json")
        self.assertEqual(res_invalid.status_code, 409)

        # Walk through valid stages
        self.client.patch(f"/api/orders/{order_id}/status", {"status": "preparing"}, format="json")
        self.client.patch(f"/api/orders/{order_id}/status", {"status": "ready"}, format="json")
        self.client.patch(f"/api/orders/{order_id}/status", {"status": "served"}, format="json")
        res_complete = self.client.patch(f"/api/orders/{order_id}/status", {"status": "completed"}, format="json")
        self.assertEqual(res_complete.status_code, 200)

        # Table should now be released
        self.table.refresh_from_db()
        self.assertEqual(self.table.status, "available")

    def test_service_request(self):
        req_data = {
            "restaurantSlug": "test-bistro",
            "tableNumber": 2,
            "requestType": "water",
            "message": "Cold water please",
        }
        res = self.client.post("/api/service-requests", req_data, format="json")
        self.assertEqual(res.status_code, 201)
        req_id = res.data["id"]

        # Staff marks handled
        patch_res = self.client.patch(f"/api/service-requests/{req_id}", {"status": "completed"}, format="json")
        self.assertEqual(patch_res.status_code, 200)
        self.assertEqual(patch_res.data["status"], "completed")

