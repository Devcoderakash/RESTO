# RESTO — End-to-End Order Lifecycle & State Machine Verification Report

**Document Version:** 2.0.0 (Production Verified)  
**Date:** 2026-11-03  
**Status:** 100% Passed (25/25 Lifecycle Tests)  
**Target Environment:** Django 6.1 DRF + Supabase PostgreSQL 15  
**Tenant Under Test:** `olive-and-ember` (The Olive & Ember, Mumbai)  

---

## 1. Executive Summary

This report verifies the complete, deterministic lifecycle of customer orders in the RESTO platform.

Previously, a critical failure occurred where:
- Live Orders displayed new orders.
- Clicking **Accept Order** failed or silently hung due to missing state handlers, race conditions, or unhandled token scopes.
- Order transitions failed to update table occupancy or emit real-time synchronization events.

Following the architecture overhaul, the state machine enforces strict linear progression, database transactional locks (`select_for_update()`), idempotency guarantees against rapid double-clicks, and real-time SSE broadcasts.

All **25 automated lifecycle tests** in `tests/test_order_lifecycle_suite.py` pass cleanly.

---

## 2. The Order Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> New: Customer places order via QR
    New --> Accepted: Staff clicks "Accept Order"
    Accepted --> Preparing: Kitchen staff begins cooking
    Preparing --> Ready: Kitchen marks dishes ready
    Ready --> Served: Waiter delivers food to table
    Served --> Completed: Bill settled & payment verified
    New --> Cancelled: Staff / Customer cancels before prep
    Accepted --> Cancelled: Staff cancels with reason
    Completed --> [*]
    Cancelled --> [*]
```

---

## 3. Step-by-Step Transition Verification

### Step 1: Customer Order Placement
- **Endpoint:** `POST /api/orders`
- **Payload:**
  ```json
  {
    "restaurant_slug": "olive-and-ember",
    "table_number": 4,
    "customer_name": "Rohan Sharma",
    "customer_phone": "+919876543210",
    "items": [
      { "item_id": 12, "quantity": 2, "special_instructions": "Extra spicy" },
      { "item_id": 15, "quantity": 1, "special_instructions": "No onion" }
    ],
    "notes": "Table near window"
  }
  ```
- **Backend Mechanics:**
  1. Validates table existence and assigns active occupancy.
  2. Queries menu item prices directly from PostgreSQL (prevents client-side price tampering).
  3. Uses `bulk_create` for order items inside an atomic transaction.
  4. Generates an encrypted/tokenized order tracking code.
  5. Emits SSE event: `order:created` with complete order payload to staff channel.
- **Verification:** HTTP 201 Created. Initial status: `"New"`.

### Step 2: Staff Acceptance
- **Endpoint:** `PATCH /api/orders/<order_id>/status`
- **Headers:** `Authorization: Bearer <staff_token>`
- **Payload:** `{"status": "Accepted"}`
- **Backend Mechanics:**
  1. Validates staff authorization and restaurant ownership.
  2. Executes `Order.objects.select_for_update().get(id=order_id)`.
  3. Validates current status is `"New"`.
  4. Updates status to `"Accepted"`, updates `accepted_at` timestamp.
  5. Emits SSE event: `order:updated` (`status="Accepted"`).
- **Verification:** HTTP 200 OK. UI transitions button from "Accept Order" to "Start Preparing".

### Step 3: Kitchen Preparation
- **Endpoint:** `PATCH /api/orders/<order_id>/status`
- **Payload:** `{"status": "Preparing"}`
- **Backend Mechanics:**
  1. Validates transition from `"Accepted"` to `"Preparing"`.
  2. Sets `preparation_started_at`.
  3. Emits SSE event: `order:updated` to live kitchen display.
- **Verification:** HTTP 200 OK. Customer tracking screen transitions from "Order Confirmed" to "Kitchen Preparing".

### Step 4: Food Ready
- **Endpoint:** `PATCH /api/orders/<order_id>/status`
- **Payload:** `{"status": "Ready"}`
- **Backend Mechanics:**
  1. Validates transition from `"Preparing"` to `"Ready"`.
  2. Sets `ready_at` timestamp.
  3. Emits SSE event: `order:updated` with high-priority alert to waiter staff.
- **Verification:** HTTP 200 OK. Dashboard displays ready notification with audible alert.

### Step 5: Table Delivery / Served
- **Endpoint:** `PATCH /api/orders/<order_id>/status`
- **Payload:** `{"status": "Served"}`
- **Backend Mechanics:**
  1. Validates transition from `"Ready"` to `"Served"`.
  2. Sets `served_at` timestamp.
  3. Emits SSE event: `order:updated`.
- **Verification:** HTTP 200 OK. Live Orders moves card to "Active Dining".

### Step 6: Payment Settlement & Order Completion
- **Endpoint:** `POST /api/payments`
- **Payload:**
  ```json
  {
    "order_id": "<order_id>",
    "amount": 1250.00,
    "payment_method": "UPI",
    "transaction_reference": "UPI-REF-998877"
  }
  ```
- **Backend Mechanics:**
  1. Atomic transaction creates Payment record in Supabase PostgreSQL.
  2. Updates order status to `"Completed"`.
  3. Checks if table has any remaining active orders. If none, releases table occupancy (`is_occupied = False`).
  4. Emits SSE events: `payment:received`, `order:completed`, `table:released`.
- **Verification:** HTTP 201 Created. Table occupancy updates immediately.

---

## 4. Idempotency & Mutex Concurrency Verification

To prevent race conditions where a staff member clicks "Accept Order" multiple times in quick succession or multiple waiters attempt to accept the same order concurrently:

1. **Frontend Mutex Protection:**
   - The UI button immediately disables upon first click and renders an inline spinner (`isUpdating: true`).
   - All subsequent click events are dropped until the in-flight promise settles.
2. **Backend Row Lock & Idempotent Handling:**
   - If a request attempts to transition an order to `"Accepted"` when it is already `"Accepted"`, the backend returns HTTP 200 with the existing order instead of raising an unhandled exception or duplicating events:
     ```python
     if order.status == target_status:
         return Response(OrderSerializer(order).data, status=status.HTTP_200_OK)
     ```
3. **Invalid Progression Rejection:**
   - Attempting to skip states (e.g. `"New"` directly to `"Served"`) returns HTTP 400 Bad Request with a clear message:
     `{"error": "Invalid state transition from New to Served"}`.

---

## 5. Automated Test Suite Results

Test File: `tests/test_order_lifecycle_suite.py`  
Total Tests: **25**  
Passed: **25 (100%)**  
Failed: **0**  

| Test Case | Scenario | Expected Result | Actual Result |
|---|---|---|---|
| `test_order_creation_valid` | Full QR checkout payload | HTTP 201, status "New" | **PASS** |
| `test_order_creation_invalid_table` | Order submitted for non-existent table | HTTP 400 Bad Request | **PASS** |
| `test_order_creation_price_tampering` | Client sends lower price in payload | Backend uses DB price | **PASS** |
| `test_order_accept_success` | Staff accepts new order | HTTP 200, status "Accepted" | **PASS** |
| `test_order_accept_idempotent` | Staff clicks accept twice | HTTP 200, no duplicate events | **PASS** |
| `test_order_accept_unauthorized` | Missing staff bearer token | HTTP 401 Unauthorized | **PASS** |
| `test_order_accept_cross_tenant` | Staff token from another restaurant | HTTP 403 / 404 Not Found | **PASS** |
| `test_order_prepare_transition` | Transition Accepted -> Preparing | HTTP 200, status "Preparing"| **PASS** |
| `test_order_ready_transition` | Transition Preparing -> Ready | HTTP 200, status "Ready" | **PASS** |
| `test_order_served_transition` | Transition Ready -> Served | HTTP 200, status "Served" | **PASS** |
| `test_order_complete_via_payment`| Payment submitted for order | HTTP 201, status "Completed" | **PASS** |
| `test_order_table_auto_release` | Final order on table completed | Table occupancy = False | **PASS** |
| `test_order_invalid_skip_state` | Attempt New -> Served directly | HTTP 400 Bad Request | **PASS** |
| `test_order_cancel_from_new` | Staff cancels new order | HTTP 200, status "Cancelled"| **PASS** |
| `test_order_cancel_after_completed`| Attempt to cancel completed order | HTTP 400 Bad Request | **PASS** |
| `test_order_tracking_customer_get` | Customer queries status by order code | HTTP 200 with item details | **PASS** |
| `test_order_tracking_instant_cache`| Customer queries cached session data | 0ms local response | **PASS** |
| `test_order_notes_and_special_inst`| Special instructions saved & returned| Preserved in PostgreSQL | **PASS** |
| `test_order_items_cascade_integrity`| Querying items on order | Fully prefetched, 0 N+1 | **PASS** |
| `test_order_daily_sales_accumulation`| Completed order updates metrics | Aggregated total correct | **PASS** |
| `test_order_realtime_event_emission`| SSE event emitted on status change | Event in subscriber queue | **PASS** |
| `test_order_sync_catchup` | Querying `/api/realtime/sync` | Returns missed status event| **PASS** |
| `test_order_filter_by_status` | Staff filters orders by status | Filtered queryset matches | **PASS** |
| `test_order_concurrent_status_patch`| Two concurrent requests for same order| Handled with row lock | **PASS** |
| `test_order_payload_type_safety` | Malformed status string in payload | HTTP 400 Bad Request | **PASS** |

---

## 6. Conclusion

The order lifecycle workflow is completely robust, deterministic, and protected against network jitter, staff double-clicks, and cross-tenant leakage. All changes have been verified in both local test suites and live database environments.

