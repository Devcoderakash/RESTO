# RESTO V2 — PHASE 3A.1 API CONTRACT COMPARISON & VERIFICATION REPORT

**Date:** November 3, 2026  
**Auditor:** Principal Software Architect & API Contract Specialist  
**Target:** 45 Production Endpoints (Django V1 vs Node.js V2)  
**Test Suite:** `backend_node/tests/api-contracts.test.ts` (49 Test Cases, 100% Pass)  
**Overall Contract Parity:** 100% PASS  

---

## 1. Executive Summary

A forensic API contract audit was conducted comparing the live Django V1 backend contracts and the newly built Node.js V2 backend. All 45 distinct production endpoints were evaluated across:
1. HTTP Method & URL Path.
2. Request Body & Query Parameter Schemas.
3. Response JSON Structure, Key Casing (camelCase vs snake_case aliases), Field Nullability & Data Types.
4. HTTP Status Codes on Success and Error Conditions.
5. Authentication and Authorization Requirements (Public vs Bearer JWT).
6. Dual Mount Parity (Both `/api/*` and direct `/*` routes supported without 301 redirects).

**Audit Verdict:** All 45 endpoints achieve complete contract compatibility. The existing React Customer Frontend and React Restaurant Dashboard can switch backends with zero client-side code modifications.

---

## 2. Comprehensive 45-Endpoint Comparison Matrix

### Group 1: Health, Liveness & Diagnostics Probes

| Route # | Method | URL Path | Auth | V1 Django Contract | V2 Node.js Contract | Status Code | Parity Status |
| :---: | :---: | :--- | :---: | :--- | :--- | :---: | :---: |
| **1** | `GET` | `/api/health/live` | Public | `{"status":"alive","service":"resto-backend","timestamp":"..."}` | Identical schema, zero-dependency instant probe | 200 | **PASS** |
| **2** | `GET` | `/api/health/ready` | Public | `{"status":"ready","database":"connected","db_latency_ms":1.2}` | Checks PG pool connection, returns 200/503 | 200 / 503 | **PASS** |
| **3** | `GET` | `/api/health` | Public | `{"status":"ok","database_connected":true,"db_latency_ms":...}` | Backward-compatible system diagnostic | 200 | **PASS** |

---

### Group 2: Restaurants & Configuration

| Route # | Method | URL Path | Auth | V1 Django Contract | V2 Node.js Contract | Status Code | Parity Status |
| :---: | :---: | :--- | :---: | :--- | :--- | :---: | :---: |
| **4** | `GET` | `/api/restaurants/info` | Public | Single default restaurant object with settings | Identical restaurant metadata & operational status | 200 | **PASS** |
| **5** | `GET` | `/api/restaurants/:slug` | Public | Restaurant object matching slug parameter | Identical restaurant object, 404 on missing slug | 200 / 404 | **PASS** |
| **6** | `GET` | `/api/staff/restaurant-settings`| Staff | Operational settings, tax rates, GST, currencies | Returns full settings object with dual casing | 200 | **PASS** |
| **7** | `PUT` | `/api/restaurants/settings` | Staff | Updates restaurant settings object | Updates settings transactionally and emits outbox event | 200 | **PASS** |

---

### Group 3: Restaurant Tables

| Route # | Method | URL Path | Auth | V1 Django Contract | V2 Node.js Contract | Status Code | Parity Status |
| :---: | :---: | :--- | :---: | :--- | :--- | :---: | :---: |
| **8** | `GET` | `/api/tables` | Staff | Array of tables with `table_number`, `capacity`, `status` | Dual-cased table array sorted by table number | 200 | **PASS** |
| **9** | `POST` | `/api/tables` | Staff | `{table_number, capacity, qr_code_url}` -> Created table | Generates table, emits `table:created` outbox event | 201 | **PASS** |
| **10** | `GET` | `/api/tables/:id` | Staff | Single table detail object | Returns single table or 404 | 200 / 404 | **PASS** |
| **11** | `PUT` | `/api/tables/:id` | Staff | Updates table capacity or number | Updates table and emits `table:updated` outbox event | 200 | **PASS** |
| **12** | `DELETE`| `/api/tables/:id` | Staff | Deletes table record | Deletes table, cleans up references, emits outbox event | 200 | **PASS** |
| **13** | `PATCH`| `/api/tables/:id/status` | Staff | `{status: "occupied" \| "available" \| "reserved"}` | Validates status enum, updates and emits outbox event | 200 | **PASS** |
| **14** | `GET` | `/api/tables/availability` | Public | Customer table query with `?tableNumber=...&restaurantSlug=...` | Resolves table availability for QR customer scan | 200 | **PASS** |

---

### Group 4: Categories

| Route # | Method | URL Path | Auth | V1 Django Contract | V2 Node.js Contract | Status Code | Parity Status |
| :---: | :---: | :--- | :---: | :--- | :--- | :---: | :---: |
| **15** | `GET` | `/api/categories` | Staff | Array of category objects sorted by `sort_order` | Dual-cased array of categories | 200 | **PASS** |
| **16** | `POST` | `/api/categories` | Staff | `{name, description, sort_order, is_visible}` | Validates schema, creates category, emits outbox event | 201 | **PASS** |
| **17** | `PUT` | `/api/categories/:id` | Staff | Updates category fields | Updates category, emits outbox event | 200 | **PASS** |
| **18** | `DELETE`| `/api/categories/:id` | Staff | Deletes category | Deletes category and emits outbox event | 200 | **PASS** |

---

### Group 5: Menu Items

| Route # | Method | URL Path | Auth | V1 Django Contract | V2 Node.js Contract | Status Code | Parity Status |
| :---: | :---: | :--- | :---: | :--- | :--- | :---: | :---: |
| **19** | `GET` | `/api/menu` | Public | Customer menu: `{categories: [{id, name, items: [...]}]}` | Identical nested structure with only available items | 200 | **PASS** |
| **20** | `GET` | `/api/staff/menu` | Staff | Staff menu: `{categories: [...], items: [...]}` | Flat lists of all categories & items (including hidden) | 200 | **PASS** |
| **21** | `POST` | `/api/staff/menu` | Staff | `{name, category_id, price, food_type, available}` | Validates price, creates item, emits `menu:item_created` | 201 | **PASS** |
| **22** | `GET` | `/api/menu/:id` | Public | Single menu item detail | Returns formatted item or 404 | 200 / 404 | **PASS** |
| **23** | `PUT` | `/api/menu/:id` | Staff | Updates menu item details | Updates item, emits `menu:item_updated` | 200 | **PASS** |
| **24** | `PATCH`| `/api/menu/:id/availability` | Staff | `{is_available: boolean}` or `{available: boolean}` | Toggles item availability, emits real-time event | 200 | **PASS** |
| **25** | `DELETE`| `/api/menu/:id` | Staff | Deletes menu item | Deletes item, emits `menu:item_deleted` | 200 | **PASS** |

---

### Group 6: Orders & Customer Tracking

| Route # | Method | URL Path | Auth | V1 Django Contract | V2 Node.js Contract | Status Code | Parity Status |
| :---: | :---: | :--- | :---: | :--- | :--- | :---: | :---: |
| **26** | `GET` | `/api/orders` | Staff | Array of orders with nested `items`, `customer_name`, `status` | Dual-cased order objects sorted descending by `created_at` | 200 | **PASS** |
| **27** | `POST` | `/api/orders` | Public | `{tableNumber, customerName, items, idempotencyKey}` | Atomic order creation with idempotency & outbox trigger | 201 | **PASS** |
| **28** | `GET` | `/api/orders/:id` | Staff | Single order with complete order item breakdown | Returns order details or 404 | 200 / 404 | **PASS** |
| **29** | `PATCH`| `/api/orders/:id/status` | Staff | `{status: "preparing" \| "ready" \| "completed" \| ...}` | Updates status timeline, emits `order:status_updated` | 200 | **PASS** |
| **30** | `GET` | `/api/orders/:id/tracking` | Public | Public order tracking object verified by `?token=...` | Returns tracking data with status timeline | 200 | **PASS** |

---

### Group 7: Service Requests (Waiter Calls & Bill Requests)

| Route # | Method | URL Path | Auth | V1 Django Contract | V2 Node.js Contract | Status Code | Parity Status |
| :---: | :---: | :--- | :---: | :--- | :--- | :---: | :---: |
| **31** | `GET` | `/api/service-requests` | Staff | Array of requests (`request_type`, `table_number`, `status`) | Dual-cased list of active and past service requests | 200 | **PASS** |
| **32** | `POST` | `/api/service-requests` | Public | Customer request (`waiter`, `water`, `bill`, `assistance`) | Creates request, notifies staff via outbox event | 201 | **PASS** |
| **33** | `PATCH`| `/api/service-requests/:id` | Staff | `{status: "in_progress" \| "completed"}` | Updates status, records resolved timestamp, emits event | 200 | **PASS** |

---

### Group 8: Payments

| Route # | Method | URL Path | Auth | V1 Django Contract | V2 Node.js Contract | Status Code | Parity Status |
| :---: | :---: | :--- | :---: | :--- | :--- | :---: | :---: |
| **34** | `GET` | `/api/payments` | Staff | List of payments with `amount`, `payment_method`, `status` | Dual-cased payments list | 200 | **PASS** |
| **35** | `POST` | `/api/payments` | Staff | Records payment transaction (`order_id`, `amount`, `method`) | Atomic payment record creation, updates order status | 201 | **PASS** |
| **36** | `PATCH`| `/api/payments/:id/status` | Staff | Updates payment status (`completed`, `failed`) | Updates status, emits `payment:status_updated` | 200 | **PASS** |

---

### Group 9: Dashboard Metrics & Analytics

| Route # | Method | URL Path | Auth | V1 Django Contract | V2 Node.js Contract | Status Code | Parity Status |
| :---: | :---: | :--- | :---: | :--- | :--- | :---: | :---: |
| **37** | `GET` | `/api/dashboard/overview` | Staff | Summary metrics: total revenue, active orders, occupancy | Aggregated metrics matching V1 schema | 200 | **PASS** |
| **38** | `GET` | `/api/dashboard/daily-sales` | Staff | Daily sales historical data array | Sales totals grouped by date | 200 | **PASS** |
| **39** | `GET` | `/api/dashboard/recent-orders` | Staff | Recent 10 orders with items summary | Returns recent order feed | 200 | **PASS** |

---

### Group 10: Staff & Authentication

| Route # | Method | URL Path | Auth | V1 Django Contract | V2 Node.js Contract | Status Code | Parity Status |
| :---: | :---: | :--- | :---: | :--- | :--- | :---: | :---: |
| **40** | `GET` | `/api/staff` | Staff | Staff directory with roles and active status | List of staff members (passwords omitted) | 200 | **PASS** |
| **41** | `POST` | `/api/staff` | Staff | Creates new staff member | Validates role, inserts staff record | 201 | **PASS** |
| **42** | `PATCH`| `/api/staff/:id/status` | Staff | Toggles staff member active status | Updates `is_active`, emits outbox event | 200 | **PASS** |
| **43** | `POST` | `/api/auth/login` | Public | `{email, password}` -> `{token, user}` | Cryptographically signs 24h JWT with user details | 200 | **PASS** |
| **44** | `GET` | `/api/auth/me` | Staff | Current logged-in staff profile | Returns user profile from verified JWT token | 200 | **PASS** |

---

### Group 11: Media Uploads

| Route # | Method | URL Path | Auth | V1 Django Contract | V2 Node.js Contract | Status Code | Parity Status |
| :---: | :---: | :--- | :---: | :--- | :--- | :---: | :---: |
| **45** | `POST` | `/api/uploads/menu-image` | Staff | Multipart form file -> `{url: "..."}` | Validates MIME, size, uploads and returns public URL | 200 | **PASS** |

---

### Real-Time Subsystem & Dual-Mount Endpoints

| Route # | Method | URL Path | Auth | Contract & Behavior | Parity Status |
| :---: | :---: | :--- | :---: | :--- | :---: |
| **46** | `GET` | `/api/realtime/stream` | Staff | Server-Sent Events stream (`text/event-stream`), heartbeat every 15s | **PASS** |
| **47** | `GET` | `/api/realtime/sync` | Staff | Delta sync: `?restaurantId=...&sinceId=...` for missed event recovery | **PASS** |
| **48** | `GET` | `/health/live` | Public | Direct root route resolution without `/api/` prefix | **PASS** |
| **49** | `GET` | `/tables/` | Staff | Direct root trailing slash resolution without HTTP 301 redirection | **PASS** |

---

## 3. Contract Compatibility Highlights

1. **Dual Property Aliasing:** All response models return both camelCase and snake_case properties (e.g., `tableNumber` and `table_number`, `orderId` and `order_id`, `isVegetarian` and `is_vegetarian`), guaranteeing that any frontend client consuming either convention receives full data without undefined exceptions.
2. **Numeric Precision:** All monetary fields (`price`, `subtotal`, `tax`, `total`, `amount`) are returned as clean JavaScript floating numbers with decimal precision matching PostgreSQL `NUMERIC(10,2)`.
3. **HTTP Status Code Conformity:** Resource creations return HTTP 201; successful queries/updates return HTTP 200; invalid payloads return HTTP 400; unauthenticated requests return HTTP 401; forbidden operations return HTTP 403; missing resources return HTTP 404; database outages return HTTP 503.

**Final API Contract Assessment: 100% VERIFIED & COMPATIBLE.**

