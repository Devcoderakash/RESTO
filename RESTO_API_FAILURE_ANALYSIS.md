# RESTO — Critical Production API Failure Analysis & Root Cause Audit

**Generated:** November 2026  
**System:** RESTO Backend & Frontend Ecosystem  
**Target:** Root Cause Analysis, Impact Assessment, and Concrete Remediations

---

## 1. Defect Matrix & Root Cause Summary

During the production rollout of RESTO, several interconnected failures occurred across database initialization, routing, authentication, and state management. The matrix below details the exact root causes and their permanent resolutions:

| # | Component / Flow | Observed Failure | Root Cause | Permanent Remediation |
| :- | :--- | :--- | :--- | :--- |
| **1** | **Backend Settings** | `dj_database_url.ParseError: This string is not a valid url` | Render environment variable `DATABASE_URL` contained percent-encoded special characters or pooler prefixes (`postgres://` vs `postgresql://`) that caused `dj_database_url.parse()` to throw an unhandled exception before Gunicorn started. | Implemented custom robust URI sanitizer in `settings.py` supporting Supabase transaction pooler port 6543, percent-encoded credentials, and safe masked diagnostic logging. |
| **2** | **Admin Dashboard: Add Table** | `NOT_FOUND — Table not found` on clicking "Create Table" | The React dashboard submitted POST requests to detail endpoints, or the Django URL routing matched `/api/tables/<pk>` where `<pk>` was parsed as `new` or `create`, triggering `get_object_or_404(pk='new')`. | Added polymorphic routing guard in `staff_table_detail`: if request method is `POST` or `pk in ['new', 'create', 'tables']`, automatically forward to `staff_tables()` creation handler. Added strict input validation for positive capacity and unique table numbers. |
| **3** | **Customer Frontend: Tables** | `TypeError: apiTables.map is not a function` | The customer table selection page expected `{ tables: [...] }` object wrapper, but when the API returned a flat array `[...]` or error payload, calling `.map()` threw an uncaught TypeError, crashing the view. | Added defensive array unwrapping: `rawTables = Array.isArray(response) ? response : (response?.tables \|\| [])`. Added SWR caching to guarantee tables render even on network failure. |
| **4** | **Customer Frontend: Checkout** | Instant redirect to `/select-table` when clicking Checkout | Zustand stores initialize asynchronously after the first render cycle. `CheckoutPage` checked `!hasSelectedTable` during initial render before hydration finished, triggering an immediate redirect back to table selection. | Added synchronous pre-hydration from `localStorage` directly in `tableStore.ts` and `cartStore.ts`. Removed premature redirect; state is now valid on render frame 0. |
| **5** | **Realtime SSE Streams** | `HTTP 500` on `/api/realtime/stream` and `/api/realtime/sync` | Views attempted to extract staff tokens from query parameters (`?staffToken=...`), collided with database RLS and unhandled serializer exceptions when querying `realtime_events`. | Standardized staff token authorization via HTTP headers (`Authorization: Bearer` and `X-Staff-Internal`). Synchronized PostgreSQL table sequence and added robust fallback error handling. |
| **6** | **Dashboard Order Status** | Order status transitions not reflecting in UI | `realtimeService.ts` assigned `status: mappedStatus` instead of `orderStatus: mappedStatus`, causing Zustand state to update an unrecognized property while `orderStatus` remained unchanged. | Corrected property assignment to `orderStatus: mappedStatus`. Verified status badges immediately advance through New -> Preparing -> Ready -> Served -> Completed. |
| **7** | **Menu Management Real-Time Gap** | Menu item updates required manual browser refresh | `backend/apps/menu/views.py` executed CRUD operations without emitting events to `RealtimeBus`. Connected dashboards remained out-of-sync. | Integrated `publish_event_on_commit` across all menu and category mutations (`menu.created`, `menu.updated`, `menu.deleted`, `category.created`, etc.), triggering real-time revalidation. |

---

## 2. In-Depth Root Cause Investigations

### 2.1 The Table Creation "NOT_FOUND" Failure
- **Symptom**: Floor Table management modal allowed entering Table Number, Capacity, Zone, and Status. Submitting resulted in a toast: `NOT_FOUND: Table not found`.
- **Traceback**:
  ```python
  File "backend/apps/tables/views.py", line 198, in staff_table_detail
    raise NotFound({"error": {"code": "NOT_FOUND", "message": "Table not found"}})
  ```
- **Investigation**:
  The dashboard API client was sending `POST /api/tables/` or `POST /api/tables/new`. Because of trailing slash normalization or route precedence in `urls.py`, the request matched `path("tables/<str:pk>/", staff_table_detail)`. The view attempted to query `RestaurantTable.objects.filter(id="new")`, which did not exist, raising `NotFound`.
- **Fix**:
  1. Updated `urls.py` with explicit precedence for collection vs item routes.
  2. Implemented routing deflection in `staff_table_detail`:
     ```python
     if request.method == "POST" or pk in ["", "new", "create", "tables"]:
         return staff_tables(request)
     ```
  3. Added collision detection for duplicate table numbers (`409 Conflict`).

### 2.2 The Disappearing Data Flaw
- **Symptom**: Navigating between pages or refreshing caused tables, orders, and menu items to vanish intermittently.
- **Traceback / Console**:
  Network tab showed pending HTTP requests or 503 gateway timeouts (due to container cold starts). React state evaluated `orders.length === 0` and rendered the empty state: *"No orders found"*.
- **Fix**:
  Implemented persistent SWR caching:
  1. Stores initialize state directly from `localStorage`.
  2. Data is never set to `[]` when an API error occurs.
  3. The user always sees valid cached data with a non-intrusive revalidation indicator.

---

## 3. Defensive Engineering Guidelines Established

1. **Never Wipe Existing State on Error**:
   If an API call fails, log the error and notify the user via a toast or badge, but retain the existing store state.
2. **Defensive Response Normalization**:
   Always accept both `{ data: [...] }` and `[...]` response formats across all client services.
3. **Strict Input Sanitization on Creation**:
   Validate capacity (1-100), ensure table number is not empty, and normalize zero-padding (`01` vs `1`).
4. **Header-Based Authentication**:
   Never pass credentials or tokens in URL queries.
