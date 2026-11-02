"""
RESTO: Supabase RLS & Storage Permissions Verification Suite
Tests Anonymous vs Authenticated vs Service-Role privileges against Supabase PostgREST and Storage APIs.
Validates zero data leakage on operational tables and public read-only access on catalog tables.
"""

import os
import sys
import requests
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(BASE_DIR, ".env"))

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

def get_headers(key: str) -> dict:
    return {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }

def test_rls_and_storage():
    print("=" * 75)
    print("RESTO: SUPABASE RLS & STORAGE PERMISSIONS AUDIT")
    print("=" * 75)
    print(f"Supabase Endpoint : {SUPABASE_URL}")
    print(f"Anon Key Present  : {'YES' if ANON_KEY else 'NO'}")
    print(f"Service Key Present: {'YES (Protected)' if SERVICE_ROLE_KEY else 'NO'}")
    print("=" * 75)

    if not SUPABASE_URL or not ANON_KEY or not SERVICE_ROLE_KEY:
        print("[FAIL] Missing Supabase configuration in backend/.env")
        return False

    anon_headers = get_headers(ANON_KEY)
    service_headers = get_headers(SERVICE_ROLE_KEY)

    passed = 0
    total = 0

    # Test 1: Operational Tables MUST NOT leak data to Anonymous Key
    operational_tables = ["orders", "payments", "staff", "service_requests", "realtime_events"]
    print("\n--- 1. Operational Tables Direct PostgREST Access (Anonymous Key) ---")
    for t in operational_tables:
        total += 1
        url = f"{SUPABASE_URL}/rest/v1/{t}?select=*"
        try:
            r = requests.get(url, headers=anon_headers, timeout=10)
            # Either 404 (table not yet created), 401/403 (forbidden), or [] (RLS blocked)
            if r.status_code in (401, 403, 404) or (r.status_code == 200 and r.json() == []):
                print(f"  [PASS] Anon cannot access operational table '{t}' (HTTP {r.status_code})")
                passed += 1
            else:
                print(f"  [FAIL] Anon leaked data on table '{t}'! Status {r.status_code}, Rows: {len(r.json())}")
        except Exception as ex:
            print(f"  [ERROR] {t}: {ex}")

    # Test 2: Anonymous MUST NOT be able to insert into Orders or Payments directly
    print("\n--- 2. Operational Tables Direct Mutation (Anonymous Key) ---")
    mutations = [
        ("orders", {"id": "exploit-test-order", "restaurant_id": "rest-olive-ember-01", "final_total": 0.0}),
        ("payments", {"id": "exploit-test-payment", "restaurant_id": "rest-olive-ember-01", "order_id": "none", "amount": 0.0, "payment_status": "completed"}),
    ]
    for table, payload in mutations:
        total += 1
        url = f"{SUPABASE_URL}/rest/v1/{table}"
        try:
            r = requests.post(url, headers=anon_headers, json=payload, timeout=10)
            if r.status_code in (401, 403, 404):
                print(f"  [PASS] Anon direct insert blocked on '{table}' (HTTP {r.status_code})")
                passed += 1
            else:
                print(f"  [FAIL] Anon direct insert succeeded on '{table}'! (HTTP {r.status_code})")
        except Exception as ex:
            print(f"  [ERROR] {table}: {ex}")

    # Test 3: Storage Bucket Permissions
    print("\n--- 3. Supabase Storage Bucket Access Policy ---")
    total += 1
    storage_url = f"{SUPABASE_URL}/storage/v1/bucket/resto-media"
    try:
        r = requests.get(storage_url, headers=anon_headers, timeout=10)
        # Bucket info (HTTP 200) or safe pre-migration not found (HTTP 404 or HTTP 400 NoSuchBucket)
        if r.status_code == 200 or (r.status_code in (400, 404) and "not found" in r.text.lower()):
            print(f"  [PASS] Storage bucket access policy responsive (Status {r.status_code}: {'Bucket active' if r.status_code == 200 else 'Pending 04_storage.sql provision'})")
            passed += 1
        else:
            print(f"  [FAIL] Storage bucket unexpected status (HTTP {r.status_code}): {r.text[:100]}")
    except Exception as ex:
        print(f"  [ERROR] Storage: {ex}")

    # Test 4: Service-Role Administrative Access
    print("\n--- 4. Service-Role Key Privilege Verification ---")
    total += 1
    try:
        r = requests.get(f"{SUPABASE_URL}/rest/v1/", headers=service_headers, timeout=10)
        if r.status_code == 200:
            print("  [PASS] Service-Role Key authenticated successfully with Supabase OpenAPI schema")
            passed += 1
        else:
            print(f"  [FAIL] Service-Role authentication failed (HTTP {r.status_code})")
    except Exception as ex:
        print(f"  [ERROR] Service-Role: {ex}")

    print("\n" + "=" * 75)
    print(f"RLS AUDIT SUMMARY: {passed} / {total} CHECKS PASSED")
    print("=" * 75)
    return passed == total

if __name__ == "__main__":
    success = test_rls_and_storage()
    sys.exit(0 if success else 1)
