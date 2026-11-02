# RESTO — ADD NEW TABLE BUG FIX & ARCHITECTURAL RECOVERY REPORT

## 1. Executive Summary & Root Cause Analysis

### Identified Root Causes

The failure of the **Add New Table** functionality and the cascading API errors across the RESTO Admin Dashboard were caused by **four intersecting defects**:

1. **Gunicorn Synchronous Worker Starvation (Primary Blocker for All Dashboard APIs)**:
   - **File**: [`render.yaml`](file:///Users/akashlodhi/Downloads/RESTO/render.yaml#L8) line 8
   - **Defect**: The service ran `gunicorn config.wsgi:application` using Gunicorn's default single-process synchronous worker (`SyncWorker`) with a 30-second timeout.
   - **Mechanism**: The moment the dashboard loaded, [`dashboardRealtimeService.connect()`](file:///Users/akashlodhi/Downloads/RESTO/dashboard/src/services/realtimeService.ts#L22) opened an SSE stream (`/api/realtime/stream`). Because the worker was synchronous, it was permanently trapped in the infinite generator loop. Any subsequent incoming request—including `POST /api/tables`, `GET /api/orders`, and `GET /api/dashboard/overview`—was queued and stalled. After 30 seconds, Gunicorn killed the worker (`SIGKILL`), causing Render and Cloudflare to return HTTP 502/504 errors to the frontend.

2. **Frontend Table Number Type Coercion (`Number(tableNumber)`)**:
   - **File**: [`dashboard/src/services/api.ts`](file:///Users/akashlodhi/Downloads/RESTO/dashboard/src/services/api.ts#L322) line 322
   - **Defect**: `body: JSON.stringify({ tableNumber: Number(input.tableNumber), ... })`
   - **Mechanism**: Coercing `tableNumber` to a numeric value caused formatted strings (e.g. `"05"`) to lose leading zeroes (`5`), while alphanumeric table names (e.g. `"T1"`, `"B-02"`, `"VIP-1"`) evaluated to `NaN` (which stringifies to `null`). The backend then rejected the request with `ValidationError: Table number is required`.

3. **Backend Unhandled `IntegrityError` on Duplicate Table Numbers (HTTP 500)**:
   - **File**: [`backend/apps/tables/views.py`](file:///Users/akashlodhi/Downloads/RESTO/backend/apps/tables/views.py#L55)
   - **Defect**: The `POST` handler attempted `RestaurantTable.objects.create(...)` without prior existence checks or database conflict handling.
   - **Mechanism**: When a table number already existed for the tenant, PostgreSQL raised `IntegrityError: duplicate key value violates unique constraint "restaurant_tables_restaurant_id_table_number_..."`. Because DRF's exception handler did not map raw database integrity errors, it logged an unhandled exception and returned a generic HTTP 500 Internal Server Error.

4. **Missing Table Store Synchronization and Submitting State in UI**:
   - **Files**: [`dashboard/src/components/tables/TableModal.tsx`](file:///Users/akashlodhi/Downloads/RESTO/dashboard/src/components/tables/TableModal.tsx), [`dashboard/src/pages/TablesPage.tsx`](file:///Users/akashlodhi/Downloads/RESTO/dashboard/src/pages/TablesPage.tsx), [`dashboard/src/store/useTableStore.ts`](file:///Users/akashlodhi/Downloads/RESTO/dashboard/src/store/useTableStore.ts)
   - **Defect**: The modal submit button lacked an `isSubmitting` / loading state, allowing double submissions. Errors were not surfaced inline, and `useTableStore` lacked an independent `fetchTables()` action to reconcile counts and zones upon modal save.

---

## 2. Files Changed

| File Path | Nature of Modification |
| :--- | :--- |
| [`backend/apps/tables/views.py`](file:///Users/akashlodhi/Downloads/RESTO/backend/apps/tables/views.py) | Added duplicate validation (HTTP 409 Conflict), capacity/zone/status bounds checking, dynamic occupancy evaluation based on active dining sessions, and real-time event broadcasting (`table.created`, `table.updated`, `table.deleted`). |
| [`dashboard/src/services/api.ts`](file:///Users/akashlodhi/Downloads/RESTO/dashboard/src/services/api.ts) | Preserved string table numbers in `createTable` and `updateTable`; explicitly appended `restaurantSlug` to query parameters. |
| [`dashboard/src/components/tables/TableModal.tsx`](file:///Users/akashlodhi/Downloads/RESTO/dashboard/src/components/tables/TableModal.tsx) | Added `isSubmitting` loading state, disabled button during submission to prevent double-clicks, and added an inline error alert banner. |
| [`dashboard/src/store/useTableStore.ts`](file:///Users/akashlodhi/Downloads/RESTO/dashboard/src/store/useTableStore.ts) | Added `fetchTables()` action, numerical sorting for table display order, and error rethrowing for inline UI handling. |
| [`dashboard/src/pages/TablesPage.tsx`](file:///Users/akashlodhi/Downloads/RESTO/dashboard/src/pages/TablesPage.tsx) | Added `useEffect` mount hook to fetch live tables and automatic table re-synchronization on save. |
| [`dashboard/src/services/realtimeService.ts`](file:///Users/akashlodhi/Downloads/RESTO/dashboard/src/services/realtimeService.ts) | Migrated SSE connection from `EventSource` to fetch streaming reader; removed credentials from query parameters; passed secure `Authorization: Bearer <token>` headers; wired realtime table sync. |
| [`backend/config/settings.py`](file:///Users/akashlodhi/Downloads/RESTO/backend/config/settings.py) | Added support for dynamic token rotation via `STAFF_API_TOKENS`. |
| [`render.yaml`](file:///Users/akashlodhi/Downloads/RESTO/render.yaml) | Updated Gunicorn start command to use multi-threaded `gthread` workers: `gunicorn -k gthread --threads 4 --workers 2 --timeout 120 config.wsgi:application`. |
| [`test_table_creation_suite.py`](file:///Users/akashlodhi/Downloads/RESTO/test_table_creation_suite.py) | Automated test suite verifying 15 table lifecycle, validation, occupancy, and isolation checks. |

---

## 3. API Specification & Request Payloads

### Create Table Endpoint
- **HTTP Method**: `POST`
- **URL**: `/api/tables?restaurantSlug=olive-and-ember`
- **Authentication**: `Authorization: Bearer <staff_token>`
- **Request Headers**:
  ```http
  Content-Type: application/json
  Authorization: Bearer demo-staff-token-manager
  X-Staff-Internal: true
  ```
- **Request Body**:
  ```json
  {
    "tableNumber": "15",
    "table_number": "15",
    "capacity": 4,
    "zone": "Main Dining",
    "status": "available"
  }
  ```
- **Success Response (HTTP 201 Created)**:
  ```json
  {
    "id": "tbl-a1b2c3d4",
    "table_number": "15",
    "tableNumber": "15",
    "capacity": 4,
    "zone": "Main Dining",
    "status": "available",
    "qr_code_url": "/menu?table=15",
    "qrUrl": "/menu?table=15"
  }
  ```
- **Duplicate Table Error Response (HTTP 409 Conflict)**:
  ```json
  {
    "error": {
      "code": "DUPLICATE_TABLE",
      "message": "Table number '15' already exists in The Olive & Ember."
    }
  }
  ```
- **Validation Error Response (HTTP 400 Bad Request)**:
  ```json
  {
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Seating capacity must be a positive integer between 1 and 100."
    }
  }
  ```

---

## 4. Dynamic Occupancy Logic

Tables are **no longer statically marked as occupied**. Dynamic occupancy follows the business rules:

1. **Active Order Presence**:
   A table is marked `occupied` if and only if there is an active order whose status is **not** `completed` and **not** `cancelled`.
2. **Table Inactivity**:
   If a table has been marked `inactive` by restaurant management, it is excluded from customer selection and flagged as inactive in staff views.
3. **Automatic Table Release**:
   The instant an order transitions to `completed` or `cancelled`, the table is dynamically evaluated and returned as `available` on the next query.
4. **New Table Default**:
   Newly created tables have no active dining orders and are immediately returned as `available`.

---

## 5. Automated Test Results

Executed via [`test_table_creation_suite.py`](file:///Users/akashlodhi/Downloads/RESTO/test_table_creation_suite.py):

| Test Case | Scenario | Expected Result | Actual Result | Status |
| :---: | :--- | :---: | :---: | :---: |
| 1 | Unauthorized POST `/api/tables` | HTTP 401 | HTTP 401 | **PASS** |
| 2 | Missing `tableNumber` | HTTP 400 | HTTP 400 | **PASS** |
| 3 | Negative capacity (`-5`) | HTTP 400 | HTTP 400 | **PASS** |
| 4 | Valid table creation | HTTP 201 Created | HTTP 201 Created | **PASS** |
| 4b | Output schema verification | Valid ID & fields | ID `tbl-...`, cap 6 | **PASS** |
| 5 | Duplicate table number | HTTP 409 Conflict | HTTP 409 Conflict | **PASS** |
| 5b | Error code verification | `DUPLICATE_TABLE` | `DUPLICATE_TABLE` | **PASS** |
| 6 | Database persistence | Table in DB | Exists in DB | **PASS** |
| 7 | Customer availability endpoint | HTTP 200 | HTTP 200 | **PASS** |
| 7b | New table in customer list | Present | Present | **PASS** |
| 7c | Default occupancy check | `status: "available"` | `available` | **PASS** |
| 8 | Staff table list retrieval | HTTP 200 | HTTP 200 | **PASS** |
| 9 | Table update (PUT capacity=8) | HTTP 200 | HTTP 200 (cap 8) | **PASS** |
| 10 | Table cleanup (DELETE) | HTTP 204 No Content | HTTP 204 | **PASS** |
| 10b | Database deletion verification | Absent from DB | Removed | **PASS** |

**Total Suite**: 15 tests, 15 passed, 0 failed.

---

## 6. Build & Verification Status

- **Dashboard Build (`npm run build`)**: Transformed 2,097 modules, zero TypeScript errors, bundle generated in 452 ms.
- **Frontend Build (`npm run build`)**: Transformed 2,071 modules, zero TypeScript errors, bundle generated in 352 ms.
- **Backend Django Diagnostics**: `check --database default` executed with zero warnings.
