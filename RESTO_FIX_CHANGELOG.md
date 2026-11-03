# RESTO — FIX CHANGELOG
**Date:** November 3, 2026  
**Scope:** Production Bug Fixes, Concurrency Hardening & Optimization  

---

## 1. Backend Fixes (`backend/`)

### `backend/apps/orders/views.py`
- **Fix:** Enabled `PATCH` and `PUT` HTTP methods on `staff_order_detail_view`.
- **Fix:** Delegated `PATCH`/`PUT` requests directly to `staff_order_status_view(request, pk)`.
- **Fix:** Enhanced order queries in `staff_order_detail_view` and `staff_order_status_view` with `Q(id=pk) | Q(order_number=pk)` to seamlessly handle both UUID IDs and human-readable ticket numbers (`DF-1002`).

### `backend/apps/orders/services.py`
- **Fix:** Added idempotency to `update_order_status_service`. If the requested status matches the current order status, it returns the order with `200 OK` rather than raising a state machine conflict.
- **Fix:** Enforced backend state machine transition guards:
  `New` (`pending`) → `Accepted` (`confirmed`) → `Preparing` (`preparing`) → `Ready` (`ready`) → `Served` (`served`) → `Completed` (`completed`).
  Invalid leaps (e.g. `New` directly to `Preparing`) return HTTP 409 Conflict with clear diagnostic error message.

### `backend/apps/realtime/views.py`
- **Fix:** Bounded the `event_stream_generator` loop to 30 seconds (`while time.time() - start_ts < 30:`).
- **Benefit:** Releases the WSGI worker thread cleanly to prevent worker exhaustion. Client reconnects automatically without data loss.

### `backend/apps/payments/views.py`
- **Fix:** Added `publish_event_on_commit` calls for `payment.created` and `payment.updated` so payments synchronize in real-time across dashboard instances.

### `backend/apps/menu/views.py`
- **Fix:** Implemented `upload_image_view` handling `POST /api/upload` (multipart/form-data).
- **Validation:** Enforced 5MB file size limit, validated content types (`image/jpeg`, `image/png`, `image/webp`, `image/gif`), and uploaded directly to Supabase Storage bucket `resto-media` via `upload_image_to_storage`.

### `backend/config/urls.py`
- **Fix:** Added trailing-slash route variants for orders, service requests, tables, payments, and upload endpoints.
- **Fix:** Registered `/api/upload` and `/upload` endpoints.

### `render.yaml`, `Procfile`, `backend/Procfile`
- **Fix:** Updated Gunicorn command to `gunicorn -k gthread --threads 8 --workers 2 --timeout 120 config.wsgi:application` to support 16 concurrent threads.

---

## 2. Dashboard Fixes (`dashboard/`)

### `dashboard/src/services/api.ts`
- **Fix:** Implemented `uploadImage(file: File)` method to send multipart form data with staff authentication to `/api/upload`.
- **Fix:** Exported both `dashboardApi` and `api = dashboardApi` for consistent imports across components.

### `dashboard/src/components/menu/MenuItemModal.tsx`
- **Fix:** Added hidden file input `<input type="file" />` and "Upload Image" button.
- **Fix:** Added `isUploading` state and spinner (`<Loader2 className="animate-spin" />`) to provide clear visual feedback during image uploads.

### `dashboard/src/pages/OrdersPage.tsx`
- **Fix:** Added `updatingOrderIds: Set<string>` to track orders currently undergoing status mutation.
- **Fix:** Disabled the action button and showed animated loading spinner while the request is in flight.

### `dashboard/src/components/orders/OrderDetailDrawer.tsx`
- **Fix:** Added `isAdvancing` loading state to disable action buttons and show loading indicator.

### `dashboard/src/store/useOrderStore.ts`
- **Fix:** Added synchronous write to `localStorage.setItem('resto_cache_dashboard_orders', ...)` upon status update to ensure SWR cache coherence on page reload.

### `dashboard/src/store/usePaymentStore.ts`
- **Fix:** Implemented `fetchPayments()` with SWR caching (`resto_cache_dashboard_payments`) and background revalidation.
- **Fix:** Added payment event listeners (`payment.created`, `payment.updated`) to automatically refresh payments list.

### `dashboard/src/pages/PaymentsPage.tsx`
- **Fix:** Added `useEffect` hook to call `fetchPayments()` on mount, eliminating the 0-records bug.

---

## 3. Customer Frontend Fixes (`frontend/`)

### `frontend/src/pages/OrderTrackingPage.tsx`
- **Fix:** Pre-hydrated initial order state from `sessionStorage.getItem('resto_order_cache:' + orderId)` to eliminate the 2-4 second blank loading screen.

### `frontend/src/store/cartStore.ts`
- **Fix:** Aligned tax calculation with backend Decimal precision (`subtotal * 0.05` for GST).

