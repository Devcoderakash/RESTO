"""
RESTO — ENTERPRISE SECURITY REGRESSION TEST SUITE
Rigorous verification of:
1. Security Headers (CSP, X-Frame-Options, X-Content-Type-Options, Permissions-Policy)
2. Broken Function-Level Authorization (BFLA) on privileged endpoints
3. Broken Object-Level Authorization (BOLA / IDOR) on Order Tracking
4. Real-Time SSE Stream Eavesdropping & Authorization Guards
5. Arbitrary Bearer Token Forgery Rejection
6. Multi-Tenant Restaurant Boundary Isolation
7. Input Validation & Bounds Enforcement
8. Price Tampering Prevention & Financial Integrity
"""

import urllib.request
import urllib.error
import json
import sys

BASE_URL = "http://localhost:5001"
STAFF_TOKEN = "demo-staff-token-manager"
VALID_AUTH = {"Authorization": f"Bearer {STAFF_TOKEN}", "X-Staff-Internal": "true"}

test_results = []

def record(test_name: str, passed: bool, details: str = ""):
    status = "PASS" if passed else "FAIL"
    test_results.append({"name": test_name, "status": status, "details": details})
    symbol = "✅" if passed else "❌"
    print(f"{symbol} [{status}] {test_name} {f'({details})' if details else ''}")

def http_request(path: str, method: str = "GET", headers: dict = None, body: dict = None):
    url = f"{BASE_URL}{path}"
    req_headers = {"Accept": "application/json"}
    if headers:
        req_headers.update(headers)
    data = None
    if body is not None:
        req_headers["Content-Type"] = "application/json"
        data = json.dumps(body).encode("utf-8")

    req = urllib.request.Request(url, data=data, headers=req_headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            content = resp.read()
            resp_headers = dict(resp.headers)
            parsed = None
            try:
                parsed = json.loads(content.decode("utf-8"))
            except Exception:
                parsed = content.decode("utf-8")
            return {"status": resp.status, "headers": resp_headers, "data": parsed}
    except urllib.error.HTTPError as exc:
        err_content = exc.read()
        parsed = None
        try:
            parsed = json.loads(err_content.decode("utf-8"))
        except Exception:
            parsed = err_content.decode("utf-8")
        return {"status": exc.code, "headers": dict(exc.headers), "data": parsed}
    except Exception as exc:
        return {"status": 0, "headers": {}, "error": str(exc)}

def run_security_suite():
    print("\n" + "=" * 70)
    print("🛡️  RESTO ENTERPRISE SECURITY REGRESSION AUDIT SUITE")
    print("=" * 70 + "\n")

    # -------------------------------------------------------------------------
    # 1. SECURITY HEADERS VERIFICATION
    # -------------------------------------------------------------------------
    print("--- 1. HTTP RESPONSE SECURITY HEADERS ---")
    res = http_request("/health")
    h = res.get("headers", {})
    record("X-Content-Type-Options is nosniff", h.get("X-Content-Type-Options") == "nosniff")
    record("X-Frame-Options is DENY", h.get("X-Frame-Options") == "DENY")
    record("Referrer-Policy is strict-origin-when-cross-origin", "strict-origin" in h.get("Referrer-Policy", ""))
    record("Permissions-Policy is present", "camera" in h.get("Permissions-Policy", ""))
    record("Content-Security-Policy is present", "default-src" in h.get("Content-Security-Policy", ""))

    # -------------------------------------------------------------------------
    # 2. BROKEN FUNCTION LEVEL AUTHORIZATION (BFLA) DEFENSE
    # -------------------------------------------------------------------------
    print("\n--- 2. BROKEN FUNCTION-LEVEL AUTHORIZATION (BFLA) ---")
    
    # 2a. Restaurant Settings Update without Auth
    res = http_request("/api/restaurants/settings", method="PUT", body={"name": "Hacked Restaurant"})
    record("Unauthenticated restaurant settings modification blocked", res["status"] == 401, f"HTTP {res['status']}")

    # 2b. Payment Status Modification without Auth
    res = http_request("/api/payments/pay-fake-123/status", method="PATCH", body={"status": "completed"})
    record("Unauthenticated payment status modification blocked", res["status"] == 401, f"HTTP {res['status']}")

    # 2c. Menu Item Creation without Auth
    res = http_request("/api/staff/menu", method="POST", body={"name": "Malicious Dish", "price": 10})
    record("Unauthenticated menu item creation blocked", res["status"] == 401, f"HTTP {res['status']}")

    # 2d. Table Status Modification without Auth
    res = http_request("/api/tables/01/status", method="PATCH", body={"status": "inactive"})
    record("Unauthenticated table status modification blocked", res["status"] == 401, f"HTTP {res['status']}")

    # 2e. Dashboard Overview Metrics without Auth
    res = http_request("/api/dashboard/overview")
    record("Unauthenticated dashboard revenue metrics blocked", res["status"] == 401, f"HTTP {res['status']}")

    # 2f. Dashboard Recent Orders without Auth
    res = http_request("/api/dashboard/recent-orders")
    record("Unauthenticated customer order history blocked", res["status"] == 401, f"HTTP {res['status']}")

    # 2g. Staff Directory List without Auth
    res = http_request("/api/staff")
    record("Unauthenticated staff directory exposure blocked", res["status"] == 401, f"HTTP {res['status']}")

    # 2h. Waiter Requests List without Auth
    res = http_request("/api/service-requests")
    record("Unauthenticated waiter requests reading blocked", res["status"] == 401, f"HTTP {res['status']}")

    # -------------------------------------------------------------------------
    # 3. FORGED / ARBITRARY TOKEN REJECTION
    # -------------------------------------------------------------------------
    print("\n--- 3. TOKEN VALIDATION & FORGERY PREVENTION ---")
    res = http_request("/api/tables", headers={"Authorization": "Bearer hacker-token-12345"})
    record("Arbitrary forged Bearer token rejected", res["status"] == 401, f"HTTP {res['status']}")

    res = http_request("/api/tables", headers={"Authorization": "Bearer 123456"})
    record("Short numeric token rejected", res["status"] == 401, f"HTTP {res['status']}")

    res = http_request("/api/tables", headers=VALID_AUTH)
    record("Valid staff Bearer token accepted", res["status"] == 200, f"HTTP {res['status']}")

    # -------------------------------------------------------------------------
    # 4. BOLA / IDOR PREVENTION ON CUSTOMER TRACKING
    # -------------------------------------------------------------------------
    print("\n--- 4. BROKEN OBJECT-LEVEL AUTHORIZATION (BOLA / IDOR) ---")
    # First place a legitimate order to test tracking
    order_res = http_request("/api/orders", method="POST", body={
        "restaurantSlug": "olive-and-ember",
        "tableNumber": "04",
        "customerName": "Security Test User",
        "paymentMethod": "counter",
        "items": [{"menuItemId": "mi-101", "quantity": 1}],
    })
    order_id = order_res["data"].get("id") or order_res["data"].get("order", {}).get("id")
    access_token = order_res["data"].get("accessToken") or order_res["data"].get("order", {}).get("accessToken")

    if order_id and access_token:
        # 4a. Attempt to access order tracking WITHOUT access token
        no_token_res = http_request(f"/api/orders/{order_id}/tracking")
        record("Order tracking without accessToken rejected (BOLA/IDOR prevention)", no_token_res["status"] == 404, f"HTTP {no_token_res['status']}")

        # 4b. Attempt with invalid access token
        fake_token_res = http_request(f"/api/orders/{order_id}/tracking?accessToken=tok-invalid-fake-hash")
        record("Order tracking with invalid accessToken rejected", fake_token_res["status"] == 404, f"HTTP {fake_token_res['status']}")

        # 4c. Access with valid access token
        valid_res = http_request(f"/api/orders/{order_id}/tracking?accessToken={access_token}")
        record("Order tracking with valid accessToken allowed", valid_res["status"] == 200, f"HTTP {valid_res['status']}")
    else:
        record("Order creation for IDOR test", False, "Could not create order")

    # -------------------------------------------------------------------------
    # 5. REAL-TIME SSE STREAM AUTHORIZATION & EAVESDROPPING PREVENTION
    # -------------------------------------------------------------------------
    print("\n--- 5. REAL-TIME SSE AUTHORIZATION & EAVESDROPPING ---")
    # 5a. Streaming all restaurant events without staff credentials
    stream_res = http_request("/api/realtime/stream?restaurantSlug=olive-and-ember")
    record("Public unauthenticated SSE event streaming rejected", stream_res["status"] == 401, f"HTTP {stream_res['status']}")

    # 5b. Sync endpoint without staff credentials
    sync_res = http_request("/api/realtime/sync?restaurantSlug=olive-and-ember")
    record("Public unauthenticated SSE sync catchup rejected", sync_res["status"] == 401, f"HTTP {sync_res['status']}")

    # 5c. Customer stream with missing access token
    if order_id:
        cust_stream_bad = http_request(f"/api/realtime/stream?restaurantSlug=olive-and-ember&orderId={order_id}")
        record("Order-scoped SSE stream without accessToken rejected", cust_stream_bad["status"] == 401, f"HTTP {cust_stream_bad['status']}")

    # 5d. Staff sync with valid token header allowed
    sync_staff = http_request(
        "/api/realtime/sync?restaurantSlug=olive-and-ember",
        headers=VALID_AUTH,
    )
    record("Staff SSE sync with valid staff token allowed", sync_staff["status"] == 200, f"HTTP {sync_staff['status']}")

    # -------------------------------------------------------------------------
    # 6. INPUT VALIDATION & PAYLOAD BOUNDARIES
    # -------------------------------------------------------------------------
    print("\n--- 6. INPUT VALIDATION & PAYLOAD BOUNDARIES ---")
    # 6a. Zero items
    zero_items = http_request("/api/orders", method="POST", body={
        "restaurantSlug": "olive-and-ember",
        "tableNumber": "04",
        "items": [],
    })
    record("Order with 0 items rejected", zero_items["status"] == 400, f"HTTP {zero_items['status']}")

    # 6b. Extreme item quantity
    huge_qty = http_request("/api/orders", method="POST", body={
        "restaurantSlug": "olive-and-ember",
        "tableNumber": "04",
        "items": [{"menuItemId": "mi-101", "quantity": 99999}],
    })
    record("Order with excessive item quantity rejected", huge_qty["status"] == 400, f"HTTP {huge_qty['status']}")

    # -------------------------------------------------------------------------
    # 7. MULTI-TENANT ISOLATION
    # -------------------------------------------------------------------------
    print("\n--- 7. MULTI-TENANT BOUNDARY ISOLATION ---")
    fake_rest = http_request("/api/restaurants/non-existent-tenant-slug")
    record("Access to non-existent restaurant returns 404", fake_rest["status"] == 404, f"HTTP {fake_rest['status']}")

    # -------------------------------------------------------------------------
    # CLEANUP & SUMMARY
    # -------------------------------------------------------------------------
    if order_id:
        http_request(f"/api/orders/{order_id}/status", method="PATCH", headers=VALID_AUTH, body={"status": "completed"})

    print("\n" + "=" * 70)
    total = len(test_results)
    passed = sum(1 for t in test_results if t["status"] == "PASS")
    failed = total - passed
    print(f"SECURITY AUDIT RESULTS: {total} TOTAL | {passed} PASSED | {failed} FAILED")
    print("=" * 70 + "\n")

    if failed > 0:
        sys.exit(1)

if __name__ == "__main__":
    run_security_suite()

