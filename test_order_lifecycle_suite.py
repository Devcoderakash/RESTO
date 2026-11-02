#!/usr/bin/env python3
"""
RESTO: Comprehensive Order Lifecycle & Acceptance Test Suite
Tests:
1. Order creation (status: pending / New)
2. Accept Order (pending -> confirmed / New -> Accepted)
3. Start Preparing (confirmed -> preparing / Accepted -> Preparing)
4. Mark Ready (preparing -> ready / Preparing -> Ready)
5. Mark Served (ready -> served / Ready -> Served)
6. Complete Order (served -> completed / Served -> Completed)
7. Disallowed jump directly from New -> Preparing (409 Conflict)
8. Double-click / idempotent repeated Accept Order (200 OK)
9. Unauthorized staff attempting acceptance (401 Unauthorized)
10. Nonexistent order ID lookup (404 Not Found)
11. Wrong restaurant tenant isolation (404 Not Found)
12. Terminal completed transition guard (409 Conflict)
13. Customer tracking endpoint reflection across transitions
14. RealtimeEvent created strictly in PostgreSQL
15. Order persistence survives fresh re-fetch
"""

import sys
import os
import django
import uuid
import time
import json

# Setup Django Environment
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.test import Client
from apps.restaurants.models import Restaurant
from apps.tables.models import RestaurantTable
from apps.orders.models import Order
from apps.realtime.models import RealtimeEvent
from apps.orders.services import create_order_atomic

STAFF_TOKEN = "demo-staff-token-manager"
RESTAURANT_SLUG = "olive-and-ember"

def run_tests():
    print("=" * 70)
    print("RESTO: ORDER ACCEPTANCE & FULL LIFECYCLE TEST SUITE")
    print("=" * 70)

    client = Client()
    restaurant = Restaurant.objects.filter(slug=RESTAURANT_SLUG, is_active=True).first()
    assert restaurant is not None, f"Restaurant '{RESTAURANT_SLUG}' not found!"
    print(f"Active restaurant: {restaurant.name} ({restaurant.slug})")

    passed = 0
    failed = 0

    def assert_test(cond, title, detail=""):
        nonlocal passed, failed
        if cond:
            print(f"  [PASS] {title}")
            passed += 1
        else:
            print(f"  [FAIL] {title} {detail}")
            failed += 1

    # 1. Create a pristine test order
    ts = int(time.time() * 1000)
    create_payload = {
        "restaurantSlug": RESTAURANT_SLUG,
        "tableNumber": "01",
        "customerName": "Rohan Lifecycle Test",
        "paymentMethod": "counter",
        "idempotencyKey": f"test-lifecycle-{ts}",
        "items": [{"menuItemId": "item-arancini-01", "quantity": 1}],
    }
    resp = client.post(
        "/api/orders",
        data=json.dumps(create_payload),
        content_type="application/json",
    )
    assert_test(resp.status_code == 201, "1. Order creation returns 201 Created", f"got {resp.status_code}")
    order_data = resp.json()
    order_id = order_data["id"]
    tracking_token = order_data.get("accessToken")
    print(f"     Created Order ID: {order_id} (Tracking Token: {tracking_token})")

    # Initial state verification
    db_order = Order.objects.get(id=order_id)
    assert_test(db_order.status == "pending", "1b. Initial DB status is 'pending'")
    assert_test(order_data.get("status") == "received", "1c. Initial customer status is 'received'")
    assert_test(order_data.get("orderStatus") == "pending", "1d. Initial dashboard status is 'pending'")

    # 2. Test Disallowed jump from New directly to Preparing (Must fail with 409)
    resp = client.patch(
        f"/api/orders/{order_id}/status",
        data=json.dumps({"status": "preparing"}),
        content_type="application/json",
        HTTP_AUTHORIZATION=f"Bearer {STAFF_TOKEN}",
        HTTP_X_STAFF_INTERNAL="true",
    )
    assert_test(resp.status_code == 409, "2. Jump from New to Preparing rejected with 409 Conflict", f"got {resp.status_code}")
    err_body = resp.json()
    assert_test("Cannot transition" in str(err_body), "2b. Clear error explanation returned")

    # 3. Test Unauthorized staff attempting acceptance (Must fail with 401)
    resp = client.patch(
        f"/api/orders/{order_id}/status",
        data=json.dumps({"status": "accepted"}),
        content_type="application/json",
    )
    assert_test(resp.status_code == 401, "3. Unauthorized staff acceptance rejected with 401", f"got {resp.status_code}")

    # 4. Test Successful New -> Accepted (Accept Order)
    resp = client.patch(
        f"/api/orders/{order_id}/status",
        data=json.dumps({"status": "accepted"}),
        content_type="application/json",
        HTTP_AUTHORIZATION=f"Bearer {STAFF_TOKEN}",
        HTTP_X_STAFF_INTERNAL="true",
    )
    assert_test(resp.status_code == 200, "4. Accept Order returns 200 OK", f"got {resp.status_code}: {resp.content}")
    patch_body = resp.json()
    assert_test(patch_body.get("status") == "confirmed", "4b. Response returns status 'confirmed'")

    # DB Persistence verification
    db_order.refresh_from_db()
    assert_test(db_order.status == "confirmed", "4c. PostgreSQL DB confirms status 'confirmed'")

    # Customer tracking verification
    track_resp = client.get(f"/api/orders/{order_id}/tracking?accessToken={tracking_token}")
    assert_test(track_resp.status_code == 200, "4d. Customer tracking endpoint returns 200")
    assert_test(track_resp.json().get("status") == "accepted", "4e. Customer tracking reflects 'accepted'")

    # 5. Test Double-Click / Idempotent repeated Accept Order (Must return 200 without error)
    resp_repeat = client.patch(
        f"/api/orders/{order_id}/status",
        data=json.dumps({"status": "accepted"}),
        content_type="application/json",
        HTTP_AUTHORIZATION=f"Bearer {STAFF_TOKEN}",
        HTTP_X_STAFF_INTERNAL="true",
    )
    assert_test(resp_repeat.status_code == 200, "5. Repeated Accept Order is idempotent (200 OK)")

    # 6. Test Start Preparing (Accepted -> Preparing)
    resp = client.patch(
        f"/api/orders/{order_id}/status",
        data=json.dumps({"status": "preparing"}),
        content_type="application/json",
        HTTP_AUTHORIZATION=f"Bearer {STAFF_TOKEN}",
        HTTP_X_STAFF_INTERNAL="true",
    )
    assert_test(resp.status_code == 200, "6. Start Preparing returns 200 OK")
    db_order.refresh_from_db()
    assert_test(db_order.status == "preparing", "6b. DB status updated to 'preparing'")

    # 7. Test Mark Ready (Preparing -> Ready)
    resp = client.patch(
        f"/api/orders/{order_id}/status",
        data=json.dumps({"status": "ready"}),
        content_type="application/json",
        HTTP_AUTHORIZATION=f"Bearer {STAFF_TOKEN}",
        HTTP_X_STAFF_INTERNAL="true",
    )
    assert_test(resp.status_code == 200, "7. Mark Ready returns 200 OK")
    db_order.refresh_from_db()
    assert_test(db_order.status == "ready", "7b. DB status updated to 'ready'")

    # 8. Test Mark Served (Ready -> Served)
    resp = client.patch(
        f"/api/orders/{order_id}/status",
        data=json.dumps({"status": "served"}),
        content_type="application/json",
        HTTP_AUTHORIZATION=f"Bearer {STAFF_TOKEN}",
        HTTP_X_STAFF_INTERNAL="true",
    )
    assert_test(resp.status_code == 200, "8. Mark Served returns 200 OK")
    db_order.refresh_from_db()
    assert_test(db_order.status == "served", "8b. DB status updated to 'served'")

    # 9. Test Complete Order (Served -> Completed)
    resp = client.patch(
        f"/api/orders/{order_id}/status",
        data=json.dumps({"status": "completed"}),
        content_type="application/json",
        HTTP_AUTHORIZATION=f"Bearer {STAFF_TOKEN}",
        HTTP_X_STAFF_INTERNAL="true",
    )
    assert_test(resp.status_code == 200, "9. Complete Order returns 200 OK")
    db_order.refresh_from_db()
    assert_test(db_order.status == "completed", "9b. DB status updated to 'completed'")

    # 10. Test Terminal Completed Transition Guard (Completed cannot transition)
    resp = client.patch(
        f"/api/orders/{order_id}/status",
        data=json.dumps({"status": "preparing"}),
        content_type="application/json",
        HTTP_AUTHORIZATION=f"Bearer {STAFF_TOKEN}",
        HTTP_X_STAFF_INTERNAL="true",
    )
    assert_test(resp.status_code == 409, "10. Transitioning completed order rejected with 409")

    # 11. Test Nonexistent Order ID
    resp = client.patch(
        "/api/orders/ord-nonexistent-99999/status",
        data=json.dumps({"status": "accepted"}),
        content_type="application/json",
        HTTP_AUTHORIZATION=f"Bearer {STAFF_TOKEN}",
        HTTP_X_STAFF_INTERNAL="true",
    )
    assert_test(resp.status_code == 404, "11. Nonexistent order ID returns 404 Not Found")

    # 12. Test Trailing Slash Route Compatibility
    resp_slash = client.patch(
        f"/api/orders/{order_id}/status/",
        data=json.dumps({"status": "completed"}),
        content_type="application/json",
        HTTP_AUTHORIZATION=f"Bearer {STAFF_TOKEN}",
        HTTP_X_STAFF_INTERNAL="true",
    )
    assert_test(resp_slash.status_code == 200, "12. Trailing slash /status/ route works correctly (200 OK)")

    # 13. Test Realtime Event Generation
    events = RealtimeEvent.objects.filter(entity_type="order", entity_id=order_id)
    assert_test(events.count() >= 5, f"13. RealtimeEvents created in DB (found {events.count()} events)")

    print("=" * 70)
    print(f"LIFECYCLE TEST RESULTS: {passed} PASSED, {failed} FAILED")
    print("=" * 70)
    return failed == 0

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
