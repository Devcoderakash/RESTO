# RESTO — Root Cause Audit & Defect Traceability Matrix

**Project:** RESTO / DineFlow Platform  
**Target Environment:** Production (Render Backend + Supabase PostgreSQL + Vercel Frontends)  
**Verification Date:** November 3, 2026  
**Auditor:** Principal Software Architect & Production Reliability Engineer  

---

## 1. Executive Summary

This audit investigates, isolates, and documents the root causes for the 15 critical symptoms observed across the RESTO platform. Rather than treating symptoms with cosmetic patches or mock fallbacks, each failure was reproduced, traced through network traces, Django ORM logs, Zustand state transitions, and PostgreSQL constraints, and resolved at the architectural source.

---

## 2. Root Cause Analysis by Symptom

### Symptom 1: Customer table list loads and then disappears
- **Classification:** High
- **Actual Root Cause:** 
  1. `frontend/src/pages/TableSelectionPage.tsx` had `currentTable` in its `useEffect` dependency array. When a user clicked a table or `useTableStore` hydrated, the effect re-fired.
  2. The response handler evaluated `Array.isArray(response) ? response : response.tables`. When `response.tables` was undefined or had non-standard nesting, `apiTables.map` threw an uncaught TypeError, which jumped to `.catch()`, setting `loadError`.
  3. The render branch replaced the already loaded table grid with an error alert, creating a visual flicker where tables appeared for a split second and vanished.
- **Files Changed:** [`frontend/src/pages/TableSelectionPage.tsx`](file:///Users/akashlodhi/Downloads/RESTO/frontend/src/pages/TableSelectionPage.tsx)
- **Fix Implemented:** Replaced fragile array unwrapping with `rawTables = Array.isArray(response) ? response : (response?.tables || [])`. Removed `currentTable` from the dependency array, relying on an initial mount effect and controlled user selection state. Retained existing tables during transient re-fetch attempts.
- **Verification Status:** PASS
- **Remaining Risk:** None.

---

### Symptom 2: Dashboard shows zero tables despite tables appearing in customer view
- **Classification:** High
- **Actual Root Cause:**
  1. `dashboard/src/pages/TablesPage.tsx` lacked a mount `useEffect` to invoke `fetchTables()`. It relied solely on `useDashboardDataStore.loadDashboard()`.
  2. In `backend/config/urls.py`, route patterns lacked trailing slash variants (e.g. `path("api/tables/", ...)`). When clients or proxies appended trailing slashes, Django URL dispatcher matched `path("api/tables/<str:pk>", staff_table_detail)` with `pk=""`, raising `NotFound("Table not found")`.
  3. Gunicorn default synchronous worker starved under long-polling/SSE, causing concurrent staff table fetches to time out and return empty lists.
- **Files Changed:**
  - [`dashboard/src/pages/TablesPage.tsx`](file:///Users/akashlodhi/Downloads/RESTO/dashboard/src/pages/TablesPage.tsx)
  - [`backend/config/urls.py`](file:///Users/akashlodhi/Downloads/RESTO/backend/config/urls.py)
  - [`backend/apps/tables/views.py`](file:///Users/akashlodhi/Downloads/RESTO/backend/apps/tables/views.py)
  - [`render.yaml`](file:///Users/akashlodhi/Downloads/RESTO/render.yaml)
- **Fix Implemented:** Added `useEffect(() => { void fetchTables() }, [fetchTables])`. Added trailing-slash routes to `urls.py`. Added fallback routing in `staff_table_detail`. Switched Gunicorn worker type to `gthread` (2 workers, 4 threads, timeout 120s).
- **Verification Status:** PASS
- **Remaining Risk:** Low.

---

### Symptom 3: Categories and menu data disappear or return empty
- **Classification:** High
- **Actual Root Cause:**
  1. `dashboard/src/store/useMenuStore.ts` had no `fetchMenu()` method. `MenuPage.tsx` and `CategoriesPage.tsx` could not fetch data on independent mount.
  2. In `useDashboardDataStore.ts`, if any single endpoint failed (e.g., `dailySales` or `serviceRequests`), a combined error string was generated, and transient errors could leave menu state unpopulated without retry mechanisms.
- **Files Changed:**
  - [`dashboard/src/store/useMenuStore.ts`](file:///Users/akashlodhi/Downloads/RESTO/dashboard/src/store/useMenuStore.ts)
  - [`dashboard/src/pages/MenuPage.tsx`](file:///Users/akashlodhi/Downloads/RESTO/dashboard/src/pages/MenuPage.tsx)
  - [`dashboard/src/pages/CategoriesPage.tsx`](file:///Users/akashlodhi/Downloads/RESTO/dashboard/src/pages/CategoriesPage.tsx)
- **Fix Implemented:** Implemented `fetchMenu()` in `useMenuStore` with safe fallback to retain last known good data. Bound mount `useEffect` hooks in both `MenuPage` and `CategoriesPage`.
- **Verification Status:** PASS
- **Remaining Risk:** None.

---

### Symptom 4: Customer menu loading is excessively slow
- **Classification:** Medium
- **Actual Root Cause:**
  1. `backend/apps/menu/views.py` queried `MenuItem.objects.filter(restaurant=restaurant)` without `select_related("category")`. Evaluating `item.category.name` incurred N+1 database queries across Supabase pooler connections.
  2. Free tier Render container sleeping causes cold-start delay (~50s) on initial wake-up.
- **Files Changed:** [`backend/apps/menu/views.py`](file:///Users/akashlodhi/Downloads/RESTO/backend/apps/menu/views.py)
- **Fix Implemented:** Added `.select_related("category")` to both public and staff menu querysets. Optimized category map caching. Added connection keep-alive in `settings.py`.
- **Verification Status:** PASS
- **Remaining Risk:** Render free tier container sleep after 15 minutes of zero traffic (infrastructure constraint).

---

### Symptom 5: Selecting a table does not consistently preserve its selection
- **Classification:** High
- **Actual Root Cause:**
  1. `frontend/src/store/tableStore.ts` relied entirely on asynchronous Zustand `persist` hydration from localStorage. On page navigation or refresh, the store started with `currentTable = ""`, causing components to read empty table state during the initial frame.
  2. `DiningTable` type lacked an `id` field; only string table numbers were stored, leading to confusion between database UUIDs and human-readable table labels.
- **Files Changed:**
  - [`frontend/src/store/tableStore.ts`](file:///Users/akashlodhi/Downloads/RESTO/frontend/src/store/tableStore.ts)
  - [`frontend/src/types/restaurant.ts`](file:///Users/akashlodhi/Downloads/RESTO/frontend/src/types/restaurant.ts)
  - [`frontend/src/pages/TableSelectionPage.tsx`](file:///Users/akashlodhi/Downloads/RESTO/frontend/src/pages/TableSelectionPage.tsx)
- **Fix Implemented:** Added synchronous pre-hydration from `localStorage.getItem("dineflow_table_context")` upon initial module evaluation. Added `currentTableId` to store and `id?: string` to `DiningTable`. Synchronized selection into `cartStore.setTableNumber()`.
- **Verification Status:** PASS
- **Remaining Risk:** None.

---

### Symptom 6: Cart items disappear or are not retained during checkout
- **Classification:** High
- **Actual Root Cause:**
  1. Zustand hydration delay in `CheckoutPage.tsx`: Line 40 checked `if (!hasSelectedTable || !currentTable) navigate('/select-table', { replace: true })`. On refresh, because Zustand had not finished hydrating, `hasSelectedTable` evaluated to `false`, immediately redirecting the customer away from `/checkout` to `/select-table`. The customer perceived this as a cart reset.
  2. Default cart initial state hardcoded `tableNumber: '07'`, conflicting with the customer's actual table selection.
- **Files Changed:**
  - [`frontend/src/store/cartStore.ts`](file:///Users/akashlodhi/Downloads/RESTO/frontend/src/store/cartStore.ts)
  - [`frontend/src/store/tableStore.ts`](file:///Users/akashlodhi/Downloads/RESTO/frontend/src/store/tableStore.ts)
  - [`frontend/src/pages/CheckoutPage.tsx`](file:///Users/akashlodhi/Downloads/RESTO/frontend/src/pages/CheckoutPage.tsx)
- **Fix Implemented:** Implemented synchronous localStorage reading for `initialCart` and `initialContext`. Guaranteed that `hasSelectedTable` and `currentTable` are non-empty on first render when previously selected. Removed hardcoded '07'.
- **Verification Status:** PASS
- **Remaining Risk:** None.

---

### Symptom 7: Order placement does not consistently complete
- **Classification:** Critical
- **Actual Root Cause:**
  1. In `backend/apps/orders/services.py`, `table_qs = RestaurantTable.objects.filter(...)` looked up table objects. If table numbers were padded or unpadded (e.g., "1" vs "01"), table lookup failed, raising `TABLE_UNAVAILABLE`.
  2. Non-atomic item validation: If any item ID was stale, the transaction aborted without detailed field diagnostics.
- **Files Changed:** [`backend/apps/orders/services.py`](file:///Users/akashlodhi/Downloads/RESTO/backend/apps/orders/services.py)
- **Fix Implemented:** Added multi-variant table number matching (`table_number__in=[norm_table_num, table_num_str, str(int(norm_table_num))]`). Implemented atomic database transactions (`with transaction.atomic():`), batch menu item fetching, and row-level locking.
- **Verification Status:** PASS
- **Remaining Risk:** None.

---

### Symptom 8: Successfully submitted orders do not reliably appear in admin dashboard
- **Classification:** Critical
- **Actual Root Cause:**
  1. In `dashboard/src/services/realtimeService.ts` line 214, `onOrderUpdated` mapped status as `status: mappedStatus` instead of `orderStatus: mappedStatus`. Since `dashboard/src/types/index.ts` defines `orderStatus: OrderStatus`, all dashboard components (KDS, Orders table, badges) read `order.orderStatus`. Because `orderStatus` was never updated, real-time status transitions were invisible.
  2. `useOrderStore` had no `fetchOrders()` method, preventing manual or mount-triggered re-sync.
- **Files Changed:**
  - [`dashboard/src/services/realtimeService.ts`](file:///Users/akashlodhi/Downloads/RESTO/dashboard/src/services/realtimeService.ts)
  - [`dashboard/src/store/useOrderStore.ts`](file:///Users/akashlodhi/Downloads/RESTO/dashboard/src/store/useOrderStore.ts)
  - [`dashboard/src/pages/OrdersPage.tsx`](file:///Users/akashlodhi/Downloads/RESTO/dashboard/src/pages/OrdersPage.tsx)
- **Fix Implemented:** Corrected `orderStatus: mappedStatus` in `realtimeService.ts`. Implemented `fetchOrders()` in `useOrderStore` and attached mount effects to `OrdersPage`, `ChefDashboardPage`, and `WaiterDashboardPage`.
- **Verification Status:** PASS
- **Remaining Risk:** None.

---

### Symptom 9: Live orders are not consistently fetched
- **Classification:** High
- **Actual Root Cause:** Combined effect of missing mount hooks on operational pages (`OrdersPage`, `ChefDashboardPage`, `WaiterDashboardPage`) and Gunicorn sync worker blocking under active SSE connections.
- **Files Changed:**
  - [`dashboard/src/pages/OrdersPage.tsx`](file:///Users/akashlodhi/Downloads/RESTO/dashboard/src/pages/OrdersPage.tsx)
  - [`dashboard/src/pages/ChefDashboardPage.tsx`](file:///Users/akashlodhi/Downloads/RESTO/dashboard/src/pages/ChefDashboardPage.tsx)
  - [`dashboard/src/pages/WaiterDashboardPage.tsx`](file:///Users/akashlodhi/Downloads/RESTO/dashboard/src/pages/WaiterDashboardPage.tsx)
  - [`render.yaml`](file:///Users/akashlodhi/Downloads/RESTO/render.yaml)
- **Fix Implemented:** Attached `fetchOrders()` on all operational views; migrated Gunicorn to `gthread` multi-threaded worker model.
- **Verification Status:** PASS
- **Remaining Risk:** Low.

---

### Symptom 10: Dashboard API requests frequently fail
- **Classification:** Critical
- **Actual Root Cause:**
  1. Gunicorn concurrency bottleneck: Default single sync worker blocked on SSE streams (`/api/realtime/stream`), preventing any other HTTP request from completing until worker timeout (30s).
  2. Psycopg2 pooler error: `disable_server_side_cursors` placed inside `DATABASES['default']['OPTIONS']` was rejected by `psycopg2` as an invalid connection argument.
- **Files Changed:**
  - [`render.yaml`](file:///Users/akashlodhi/Downloads/RESTO/render.yaml)
  - [`backend/config/settings.py`](file:///Users/akashlodhi/Downloads/RESTO/backend/config/settings.py)
- **Fix Implemented:** Upgraded Gunicorn start command to `gunicorn -k gthread --threads 4 --workers 2 --timeout 120 config.wsgi:application`. Moved `DISABLE_SERVER_SIDE_CURSORS` to top-level `DATABASES['default']` setting.
- **Verification Status:** PASS
- **Remaining Risk:** None.

---

### Symptom 11: SSE stream and sync endpoints returned HTTP 500
- **Classification:** Critical
- **Actual Root Cause:**
  1. Unhandled exceptions during `RealtimeEvent` ORM queries when event payloads had schema mismatches or sequence drift.
  2. Staff authorization token placed in query parameters conflicted with URL parsers.
  3. Generator exception during client disconnect caused zombie connections.
- **Files Changed:**
  - [`backend/apps/realtime/views.py`](file:///Users/akashlodhi/Downloads/RESTO/backend/apps/realtime/views.py)
  - [`backend/apps/realtime/bus.py`](file:///Users/akashlodhi/Downloads/RESTO/backend/apps/realtime/bus.py)
- **Fix Implemented:** Wrapped SSE stream generator in try/finally blocks with automatic `realtime_bus.unsubscribe()` cleanup. Added keep-alive heartbeats (`: keep-alive\n\n`) every 15s. Moved authentication to `Authorization: Bearer <token>` headers.
- **Verification Status:** PASS
- **Remaining Risk:** None.

---

### Symptom 12: Refreshing pages changes or removes displayed data
- **Classification:** High
- **Actual Root Cause:**
  1. Stores lacked initial synchronization from persistent browser storage, causing hydration flash.
  2. For customer order tracking, `getTrackedOrder` only looked in `sessionStorage`. Closing or reopening the tab lost the access token, resulting in HTTP 404.
- **Files Changed:**
  - [`frontend/src/services/api.ts`](file:///Users/akashlodhi/Downloads/RESTO/frontend/src/services/api.ts)
  - [`frontend/src/store/tableStore.ts`](file:///Users/akashlodhi/Downloads/RESTO/frontend/src/store/tableStore.ts)
  - [`frontend/src/store/cartStore.ts`](file:///Users/akashlodhi/Downloads/RESTO/frontend/src/store/cartStore.ts)
- **Fix Implemented:** Stored tracking tokens in both `sessionStorage` and `localStorage`. In `getTrackedOrder()`, check URL query params, `sessionStorage`, and `localStorage` before falling back.
- **Verification Status:** PASS
- **Remaining Risk:** None.

---

### Symptom 13: Loading indicators continue indefinitely
- **Classification:** Medium
- **Actual Root Cause:** `finally` blocks missing or dependent on chained promises that stalled on network timeouts without explicit abort controllers.
- **Files Changed:**
  - [`dashboard/src/services/realtimeService.ts`](file:///Users/akashlodhi/Downloads/RESTO/dashboard/src/services/realtimeService.ts)
  - [`frontend/src/pages/TableSelectionPage.tsx`](file:///Users/akashlodhi/Downloads/RESTO/frontend/src/pages/TableSelectionPage.tsx)
  - [`frontend/src/pages/MenuPage.tsx`](file:///Users/akashlodhi/Downloads/RESTO/frontend/src/pages/MenuPage.tsx)
- **Fix Implemented:** Added guaranteed `.finally(() => setIsLoading(false))` handlers and `active` cancellation flags to prevent stale async callbacks from leaving spinners running.
- **Verification Status:** PASS
- **Remaining Risk:** None.

---

### Symptom 14: Restaurant data loading is inconsistent across dashboard sections
- **Classification:** Medium
- **Actual Root Cause:** Individual dashboard pages did not independently ensure their core datasets were loaded, assuming `useDashboardDataStore.loadDashboard()` ran first and succeeded. If one partial endpoint had an error, unrelated sections remained unpopulated.
- **Files Changed:**
  - [`dashboard/src/pages/OrdersPage.tsx`](file:///Users/akashlodhi/Downloads/RESTO/dashboard/src/pages/OrdersPage.tsx)
  - [`dashboard/src/pages/TablesPage.tsx`](file:///Users/akashlodhi/Downloads/RESTO/dashboard/src/pages/TablesPage.tsx)
  - [`dashboard/src/pages/MenuPage.tsx`](file:///Users/akashlodhi/Downloads/RESTO/dashboard/src/pages/MenuPage.tsx)
  - [`dashboard/src/pages/CategoriesPage.tsx`](file:///Users/akashlodhi/Downloads/RESTO/dashboard/src/pages/CategoriesPage.tsx)
- **Fix Implemented:** Decoupled store state fetching. Each page now calls its own independent store fetcher (`fetchOrders()`, `fetchTables()`, `fetchMenu()`, `fetchRequests()`) with error isolation.
- **Verification Status:** PASS
- **Remaining Risk:** None.

---

### Symptom 15: Table availability sometimes shows incorrect Occupied status
- **Classification:** High
- **Actual Root Cause:**
  1. Tables were previously updated by a static `status` column rather than computed dynamically from active orders.
  2. Lingering test orders from prior test sessions (orders with status `pending`, `preparing`, or `served`) continued to hold tables 01 and 08 in an occupied state.
- **Files Changed:**
  - [`backend/apps/tables/views.py`](file:///Users/akashlodhi/Downloads/RESTO/backend/apps/tables/views.py)
  - [`backend/apps/orders/services.py`](file:///Users/akashlodhi/Downloads/RESTO/backend/apps/orders/services.py)
- **Fix Implemented:** Implemented dynamic occupancy calculation `get_active_table_numbers(restaurant)`. Tables are marked `occupied` if and only if an order for that table exists with `status not in ('completed', 'cancelled')`. When an order transitions to `completed` or `cancelled`, the table is released automatically.
- **Verification Status:** PASS
- **Remaining Risk:** Requires dry-run cleanup of historical test orders (detailed in Report 2).

