# RESTO — FULL-STACK BUG AUDIT
**Date:** November 3, 2026  
**Auditor:** Principal Full-Stack Engineer & Production Reliability Lead  
**Scope:** Complete Codebase (`frontend/`, `dashboard/`, `backend/`, Supabase PostgreSQL, Render Deployment)  

---

## 1. Summary of Discovered Bugs

| Bug ID | Component | Severity | Description | Status |
|---|---|---|---|---|
| **BUG-01** | Backend SSE / WSGI | **CRITICAL** | Gunicorn thread pool starvation due to infinite `while True:` loop in SSE stream generator. Blocked all REST endpoints. | **RESOLVED** |
| **BUG-02** | Backend DRF Routing | **CRITICAL** | `staff_order_detail_view` only allowed `["GET"]`, returning 405 Method Not Allowed on `PATCH /api/orders/<pk>`. | **RESOLVED** |
| **BUG-03** | Backend URL Routing | **HIGH** | Missing trailing slash route variants for `/api/orders/<pk>/status/`, `/api/service-requests/<pk>/`, etc., causing 404s. | **RESOLVED** |
| **BUG-04** | Backend Order Status Lookup | **HIGH** | `staff_order_status_view` queried only `id=pk`, returning 404 when frontend provided order ticket number (e.g. `DF-1002`). | **RESOLVED** |
| **BUG-05** | Dashboard Orders UX | **MEDIUM** | Missing loading/disabled states on `Accept Order` button, allowing double clicks and uncaught promise rejections. | **RESOLVED** |
| **BUG-06** | Dashboard SWR Rollback | **HIGH** | `useOrderStore` and `usePaymentStore` failed to persist immediate mutations to localStorage cache, causing data flickering on reload. | **RESOLVED** |
| **BUG-07** | Dashboard Payments Page | **MEDIUM** | `PaymentsPage.tsx` did not fetch payments on mount, and `usePaymentStore` had no `fetchPayments()` method. Always showed 0 records. | **RESOLVED** |
| **BUG-08** | Customer Tracking Page | **MEDIUM** | `OrderTrackingPage.tsx` showed blank/loading screen for 2-4 seconds on reload without initial SWR session storage cache. | **RESOLVED** |
| **BUG-09** | Backend Image Upload | **HIGH** | Image upload endpoint `POST /api/upload` was not implemented; dashboard had no direct image file upload into Supabase Storage. | **RESOLVED** |
| **BUG-10** | Frontend Tax Calculation | **LOW** | Cart displayed static 5% tax without Decimal precision alignment with backend CGST/SGST breakdown. | **RESOLVED** |

---

## 2. Detailed Bug Breakdowns

### BUG-01: Gunicorn WSGI Thread Starvation
- **File:** `backend/apps/realtime/views.py`, `Procfile`, `render.yaml`
- **Symptom:** Live production Render API timed out (HTTP 504 / curl exit code 28) after 60s across unrelated endpoints (`/health`, `/api/menu`, `/api/orders`).
- **Root Cause:**
  `realtime_stream` executed `while True:` without a bounding duration. Render gunicorn workers were limited to default sync workers. Each client opening an EventSource stream permanently locked a Gunicorn process/thread. When 2-4 users opened the app, all Gunicorn workers were monopolized, causing every incoming HTTP request to hang in the backlog queue until timed out.
- **Resolution:**
  1. Bounded the generator in `realtime_views.py` to 30 seconds (`while time.time() - start_ts < 30:`). After 30s, the connection terminates cleanly, the WSGI thread is returned to the pool, and client `EventSource` automatically reconnects within milliseconds without packet loss.
  2. Upgraded Gunicorn configuration in `render.yaml` and `Procfile` to use `gthread` worker class with 8 threads per worker across 2 workers (`--workers 2 --threads 8 -k gthread --timeout 120`), providing 16 concurrent request channels.

---

### BUG-02: HTTP 405 Method Not Allowed on Order Updates
- **File:** `backend/apps/orders/views.py`
- **Symptom:** Clicking `Accept Order` in Dashboard failed; console showed HTTP 405 on `PATCH /api/orders/ord-...`.
- **Root Cause:**
  `staff_order_detail_view` was decorated with `@api_view(["GET"])` only. When frontend clients sent `PATCH /api/orders/<pk>` with `{ status: "confirmed" }`, DRF rejected the request with 405.
- **Resolution:**
  Decorated `staff_order_detail_view` with `@api_view(["GET", "PATCH", "PUT"])` and delegated `PATCH`/`PUT` requests directly to `staff_order_status_view(request, pk)`.

---

### BUG-03: Missing Trailing Slash Routes in Django URLs
- **File:** `backend/config/urls.py`
- **Symptom:** Requests to `/api/orders/<pk>/status/` or `/api/service-requests/<pk>/` resulted in HTTP 404 Not Found.
- **Root Cause:**
  Django URL routing used strict regex paths without trailing slashes. Framework clients or proxies appending trailing slashes could not match the route.
- **Resolution:**
  Added explicit pairs of routes with and without trailing slashes for all CRUD and status endpoints across orders, service requests, payments, tables, and uploads.

---

### BUG-04: ID vs Order Number Lookup Incompatibility
- **File:** `backend/apps/orders/views.py`
- **Symptom:** Order detail and status updates returned `404 Order not found` when accessed via human-readable order ticket numbers like `DF-1002`.
- **Root Cause:**
  ORM filter was hardcoded to `order = Order.objects.filter(id=pk, ...).first()`.
- **Resolution:**
  Updated queries to `Order.objects.filter(Q(id=pk) | Q(order_number=pk), restaurant=restaurant).first()`.

---

### BUG-05: Missing Button Mutex & Unhandled Promise in Dashboard
- **File:** `dashboard/src/pages/OrdersPage.tsx`, `dashboard/src/components/orders/OrderDetailDrawer.tsx`
- **Symptom:** Rapid clicking on `Accept Order` fired duplicate concurrent requests. First succeeded, second threw error, showing an error toast even though the order was actually accepted.
- **Root Cause:**
  Buttons had no disabled or loading state tied to active promise resolution.
- **Resolution:**
  Introduced `updatingOrderIds: Set<string>` state in `OrdersPage.tsx` and `isAdvancing` in `OrderDetailDrawer.tsx`. Disabled the button during flight and rendered `<Loader2 className="animate-spin" /> Updating…`.

---

### BUG-06: SWR Cache Rollback on Page Refresh
- **File:** `dashboard/src/store/useOrderStore.ts`
- **Symptom:** When a user changed order status and immediately refreshed the page, the order temporarily reverted back to its previous status before re-fetching.
- **Root Cause:**
  `advanceStatus` updated React in-memory state but did not write the updated orders array to `localStorage.getItem('resto_cache_dashboard_orders')`. On refresh, the initial SWR hydration read the stale cached data before the network request resolved.
- **Resolution:**
  Added synchronous `localStorage.setItem('resto_cache_dashboard_orders', JSON.stringify(updatedOrders))` inside `advanceStatus`.

---

### BUG-07: Payments Page Displaying 0 Records
- **File:** `dashboard/src/store/usePaymentStore.ts`, `dashboard/src/pages/PaymentsPage.tsx`
- **Symptom:** The Payments tab in the Admin Dashboard always showed an empty list.
- **Root Cause:**
  `usePaymentStore` only contained an empty array and listener handlers; it lacked an initial `fetchPayments()` action. `PaymentsPage.tsx` never called any API on mount.
- **Resolution:**
  Implemented `fetchPayments()` with SWR localStorage hydration and network revalidation in `usePaymentStore.ts`. Added `useEffect(() => { void fetchPayments(); }, [])` in `PaymentsPage.tsx`.

---

### BUG-08: Customer Tracking Initial 0ms Blank State
- **File:** `frontend/src/pages/OrderTrackingPage.tsx`
- **Symptom:** Customer navigating to `/order-tracking/:id` saw a spinning skeleton for 2-3 seconds, feeling sluggish.
- **Root Cause:**
  State initialized to `undefined` without pre-hydration from the session storage order snapshot created during checkout.
- **Resolution:**
  Pre-hydrated state using `sessionStorage.getItem('resto_order_cache:' + orderId)`. Page displays order details at 0ms instant load while background SWR queries fresh status.

---

### BUG-09: Missing Image Upload to Supabase Storage
- **File:** `backend/apps/menu/views.py`, `dashboard/src/components/menu/MenuItemModal.tsx`, `dashboard/src/services/api.ts`
- **Symptom:** Admin could only paste image URLs; could not upload local dish photos to Supabase Storage bucket `resto-media`.
- **Root Cause:**
  Backend lacked `upload_image_view` and dashboard lacked file upload input integration.
- **Resolution:**
  Implemented `upload_image_view` with 5MB validation, JPG/PNG/WEBP support, Supabase Storage integration, and integrated `<input type="file" />` with visual upload indicator in `MenuItemModal.tsx`.

---

### BUG-10: Cart & Checkout Tax Inaccuracy
- **File:** `frontend/src/store/cartStore.ts`
- **Symptom:** Tax breakdown displayed rounding variances on cents/paisa compared to backend PostgreSQL invoice.
- **Root Cause:**
  Floating point math discrepancies between React cart and Django Decimal arithmetic.
- **Resolution:**
  Aligned cart calculation with backend formula: `subtotal * 0.05` for GST (2.5% CGST + 2.5% SGST), 0% service charge default, rounded to 2 decimal places.
