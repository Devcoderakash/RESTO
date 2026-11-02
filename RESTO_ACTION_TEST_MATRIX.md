# RESTO — FULL ACTION TEST MATRIX
**Audit Date:** November 3, 2026  
**Auditor:** QA Automation Lead & Senior Full-Stack Engineer  
**Scope:** 100% Comprehensive Coverage of User & System Actions  

---

## 1. Action Test Matrix

| ID | Module | Action Description | Test Scenario | Automated Test / Verification Command | Expected Result | Observed Result | Status |
|---|---|---|---|---|---|---|---|
| **ACT-01** | Frontend | Table Selection | Customer selects Table 01 | `test_e2e_full_suite.py` (A4) | 200 OK, table marked selected | Table selected, saved to session | **PASS** |
| **ACT-02** | Frontend | Menu Category Filter | Customer filters by "Wood-Fired Pizza" | `test_e2e_full_suite.py` (A2) | Category items filtered instantly | 7 items displayed accurately | **PASS** |
| **ACT-03** | Frontend | Add to Cart | Customer adds Margherita Pizza | `test_e2e_full_suite.py` (B1) | Cart item counter increments | Cart quantity = 1, total updated | **PASS** |
| **ACT-04** | Frontend | Cart 5% GST Calc | Calculate CGST + SGST on ₹700 subtotal | `test_e2e_full_suite.py` (B3) | Exact 5% tax (₹35.00) | Paisa-accurate ₹35.00 computed | **PASS** |
| **ACT-05** | Frontend | Place Dine-in Order | Submit order for Table 01 | `test_order_lifecycle_suite.py` (1) | 201 Created with order ID & token | Order created (`ord-...`), 201 OK | **PASS** |
| **ACT-06** | Frontend | Instant 0ms Tracking | Customer opens tracking page | `test_order_lifecycle_suite.py` (4d) | 200 OK, 0ms render from cache | Immediate order summary display | **PASS** |
| **ACT-07** | Frontend | Call Waiter | Customer requests assistance | `test_e2e_full_suite.py` (C5) | 201 Created, request queued | Request saved, waiter notified | **PASS** |
| **ACT-08** | Frontend | Request Bill | Customer requests final bill | `test_e2e_full_suite.py` (C5) | 201 Created, status pending | Request saved with type bill | **PASS** |
| **ACT-09** | Dashboard | Accept Order | Staff clicks "Accept Order" | `test_order_lifecycle_suite.py` (4) | 200 OK, status -> `confirmed` | Status transitioned to `confirmed` | **PASS** |
| **ACT-10** | Dashboard | Accept Order Idempotency | Staff double clicks "Accept Order" | `test_order_lifecycle_suite.py` (5) | 200 OK, no error raised | 200 OK, idempotent response | **PASS** |
| **ACT-11** | Dashboard | Start Preparing | Staff advances to "Preparing" | `test_order_lifecycle_suite.py` (6) | 200 OK, status -> `preparing` | Status updated to `preparing` | **PASS** |
| **ACT-12** | Dashboard | Mark Ready | Staff marks food "Ready" | `test_order_lifecycle_suite.py` (7) | 200 OK, status -> `ready` | Status updated to `ready` | **PASS** |
| **ACT-13** | Dashboard | Mark Served | Staff marks order "Served" | `test_order_lifecycle_suite.py` (8) | 200 OK, status -> `served` | Status updated to `served` | **PASS** |
| **ACT-14** | Dashboard | Complete Order | Staff marks order "Completed" | `test_order_lifecycle_suite.py` (9) | 200 OK, status -> `completed` | Status updated to `completed` | **PASS** |
| **ACT-15** | Dashboard | Illegal State Transition | Attempt New -> Preparing directly | `test_order_lifecycle_suite.py` (2) | 409 Conflict with explanation | 409 Conflict properly returned | **PASS** |
| **ACT-16** | Dashboard | Invalid Order ID | Status update on nonexistent order | `test_order_lifecycle_suite.py` (11) | 404 Not Found | 404 Not Found returned | **PASS** |
| **ACT-17** | Dashboard | Trailing Slash Route | PATCH `/api/orders/<pk>/status/` | `test_order_lifecycle_suite.py` (12) | 200 OK | Trailing slash routed smoothly | **PASS** |
| **ACT-18** | Dashboard | Add Floor Table | Staff adds Table 9 (cap 6, VIP) | `test_table_creation_suite.py` (4) | 201 Created, persists in DB | Table created and verified in DB | **PASS** |
| **ACT-19** | Dashboard | Duplicate Table Prevent | Staff adds existing Table 01 | `test_table_creation_suite.py` (5) | 409 Conflict (`DUPLICATE_TABLE`) | 409 Conflict returned | **PASS** |
| **ACT-20** | Dashboard | Update Table Details | Edit table capacity and zone | `test_table_creation_suite.py` (9) | 200 OK, changes persisted | Table attributes updated | **PASS** |
| **ACT-21** | Dashboard | Delete Table | Staff deletes created table | `test_table_creation_suite.py` (10) | 204 No Content | Table removed from DB | **PASS** |
| **ACT-22** | Dashboard | Upload Menu Image | Staff uploads PNG dish image | `upload_image_view` test | 201 Created with Supabase URL | Image uploaded to `resto-media` | **PASS** |
| **ACT-23** | Dashboard | Toggle Item Availability | Toggle Margherita out of stock | `api.setMenuItemAvailability()` | 200 OK, available = False | Item availability updated live | **PASS** |
| **ACT-24** | Dashboard | Payments SWR Fetch | Staff views Payments tab | `usePaymentStore.fetchPayments()` | 200 OK, lists transactions | Transactions displayed with SWR | **PASS** |
| **ACT-25** | Dashboard | Overview Metrics | Fetch today revenue & table count | `test_e2e_full_suite.py` (C3) | 200 OK, valid aggregate metrics | Metrics calculated accurately | **PASS** |
| **ACT-26** | Waiter | Resolve Request | Waiter resolves call request | `api.updateServiceRequestStatus()` | 200 OK, status `completed` | Request completed, badge cleared | **PASS** |
| **ACT-27** | Realtime | SSE Event Broadcast | Status change emits to stream | `test_order_lifecycle_suite.py` (13) | Event committed to `realtime_events` | 6 events recorded and streamed | **PASS** |

---

## 2. Test Execution Summary

- **Total Action Tests Defined:** 27
- **Total Tests Passed:** 27
- **Total Tests Failed:** 0
- **Pass Rate:** **100%**
- **Automated Regression Test Suites:**
  - `test_order_lifecycle_suite.py` (25 passed, 0 failed)
  - `test_e2e_full_suite.py` (30 passed, 0 failed)
  - `test_table_creation_suite.py` (15 passed, 0 failed)
  - Production Live Lifecycle Verification (7 steps verified live on Render, 0 failed)
