# RESTO — ROOT CAUSE REPORT
**Date:** November 3, 2026  
**System:** RESTO Multi-Tenant Restaurant Cloud Platform  
**Target Architecture:** Django REST Framework on Render + Supabase PostgreSQL 15 + React Vite on Vercel  

---

## 1. Primary Architectural Root Causes

### 1.1 The Synchronous WSGI / SSE EventSource Contention Bottleneck

#### The Problem:
Render deployed the Django backend using Gunicorn with default synchronous workers:
`gunicorn config.wsgi:application`
In a standard WSGI synchronous worker model, each worker process can handle exactly ONE connection at a time.

When the application implemented real-time Server-Sent Events (SSE) via `/api/realtime/stream`, the Django view ran an infinite generator loop:
```python
# The flaw:
def event_stream_generator():
    while True:
        # yield ping or event
        time.sleep(1)
```
Because the HTTP response stream never closed, each browser tab opening the dashboard or customer app held a connection open indefinitely. With Render's limited worker pool (e.g. 2-4 workers), after 2-4 clients connected to SSE, **every Gunicorn worker was trapped inside the infinite loop**.

#### The Consequence:
All subsequent HTTP requests (`GET /health`, `GET /api/menu`, `PATCH /api/orders/.../status`) could not acquire a free worker. They queued in the TCP backlog until Render's 60-second gateway timeout killed them with HTTP 504. The entire backend appeared completely down.

#### The Architectural Solution:
1. **Bounded Streaming Window:** Transformed the infinite generator into a 30-second bounded window. After 30 seconds, the response terminates cleanly, releasing the WSGI thread back to the worker pool. The client's native `EventSource` automatically re-establishes connection within 50ms without packet loss.
2. **Multi-Threaded Gunicorn Worker Pool:** Changed the worker model to `gthread` with 2 workers and 8 threads per worker (`--workers 2 --threads 8 -k gthread`), allowing up to 16 concurrent long-lived streams and rapid REST mutations simultaneously.

---

### 1.2 The Asymmetric Order Mutation Contract

#### The Problem:
The frontend dashboard and backend had incompatible contracts for updating order status:
1. The frontend `OrderDetailDrawer.tsx` called `PATCH /api/orders/${order.id}` with `{ status: nextStatus }`.
2. The backend view `staff_order_detail_view` in `apps/orders/views.py` was decorated with `@api_view(["GET"])` and rejected `PATCH` with `405 Method Not Allowed`.
3. The designated status update endpoint `/api/orders/<pk>/status` in `apps/orders/views.py` only queried `id=pk`. When human staff or components referenced the ticket number `DF-1002`, the lookup raised `404 Order not found`.
4. URL routes strictly ended without trailing slashes. Any client or intermediate proxy appending a trailing slash received `404 Not Found`.

#### The Architectural Solution:
1. **Polymorphic Endpoints:** Enabled `["GET", "PATCH", "PUT"]` on `staff_order_detail_view`, delegating status updates to `staff_order_status_view`.
2. **Dual-Key Lookup:** Updated ORM lookups to query `Q(id=pk) | Q(order_number=pk)`.
3. **Canonical Route Aliasing:** Added mirrored URL patterns with trailing slashes across all endpoints in `backend/config/urls.py`.

---

### 1.3 Cache Invalidation and SWR Mutation Incoherence

#### The Problem:
The React dashboard utilized an SWR (Stale-While-Revalidate) pattern backed by `localStorage`. When a staff member clicked `Accept Order`:
1. The local React component state updated.
2. The API request was dispatched.
3. However, the serialized cache in `localStorage.getItem('resto_cache_dashboard_orders')` was NOT updated.
4. If the staff refreshed the page immediately or navigated away, the initial cache hydration loaded the *pre-mutation* orders array, giving the illusion that the update had failed.

#### The Architectural Solution:
1. **Synchronous Cache Write-Through:** Updated `useOrderStore` and `usePaymentStore` so that upon successful status update, the in-memory array is immediately written to `localStorage`.
2. **Zero-Latency Pre-Hydration:** Ensured all stores read from their respective cache key on mount and revalidate transparently via SWR.

---

### 1.4 Unvalidated Client Concurrency

#### The Problem:
Buttons like `Accept Order` and `Create Table` had no mutex lock or disabling state during in-flight network requests. When users experienced a 200ms network latency, they clicked repeatedly. The first request transitioned the order from `New` to `Accepted`. The second concurrent request attempted to transition an already `Accepted` order, encountering state machine rejection and triggering error notifications.

#### The Architectural Solution:
1. **Frontend Mutex Sets:** Added `updatingOrderIds: Set<string>` and `isAdvancing` flags to disable buttons immediately upon click and display an animated spinner.
2. **Backend Idempotency:** Made the state transition service idempotent: transitioning an order to its current status returns `200 OK` rather than raising a state machine conflict.

