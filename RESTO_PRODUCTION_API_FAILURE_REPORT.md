# RESTO — Critical Production API Failure Investigation Report

**Incident Date:** November 3, 2026  
**Incident Severity:** P0 / Critical (Complete Data API Outage across Customer & Staff Frontends)  
**Target Systems:** Render Web Service (`resto-vc53.onrender.com`) & Supabase PostgreSQL  
**Audit Status:** ROOT CAUSE IDENTIFIED & FIX PREPARED  
**Author:** Principal Infrastructure & Backend Systems Engineer  

---

## 1. Executive Summary

Following successful PostgreSQL cutover where the `/api/health` endpoint reported `database_vendor: postgresql` and `database_configured: true`, all production data-dependent API endpoints began simultaneously failing with `HTTP 500: Internal Server Error`.

### Observed Symptoms:
1. **Customer Frontend:**
   - Table selection failed (`/api/tables/availability`).
   - Customer menu failed to load (`/api/menu`).
   - Order placement and tracking failed (`/api/orders`).
2. **Admin Dashboard:**
   - Orders list failed (`/api/orders`).
   - Floor table management showed 0 tables (`/api/tables`).
   - Waiter service requests failed (`/api/service-requests`).
   - Dashboard metrics and daily revenue showed 0 or failed (`/api/dashboard/overview`).
   - Menu management failed (`/api/staff/menu`).

### The Root Cause:
The failures are **not** caused by missing database tables, schema discrepancies, RLS misconfigurations, or network IP blocks.
Instead, a single database connection parameter error in `backend/config/db_utils.py` prevented Django's PostgreSQL database wrapper (`psycopg2`) from establishing any connection:
```
ProgrammingError: invalid dsn: invalid connection option "disable_server_side_cursors"
```
Because `disable_server_side_cursors = True` was placed inside `DATABASES['default']['OPTIONS']` instead of at the top level of the Django `DATABASES['default']` dictionary, `psycopg2` forwarded it to PostgreSQL's C client library (`libpq`). `libpq` does not recognize `disable_server_side_cursors` as a valid DSN parameter and rejected every connection attempt.

---

## 2. Failing Endpoints Audit Matrix

| HTTP Method & Path | HTTP Status | Django View | Involved Query | Exception & Error |
| :--- | :---: | :--- | :--- | :--- |
| `GET /api/tables/availability` | 500 | `apps.tables.views.table_availability` | `RestaurantTable.objects.filter(...)` | `ProgrammingError: invalid dsn: invalid connection option "disable_server_side_cursors"` |
| `GET /api/restaurants/info` | 500 | `apps.restaurants.views.restaurant_detail` | `Restaurant.objects.filter(slug=...)` | `ProgrammingError: invalid dsn: invalid connection option "disable_server_side_cursors"` |
| `GET /api/menu` | 500 | `apps.menu.views.public_menu` | `Category.objects.filter(...)` | `ProgrammingError: invalid dsn: invalid connection option "disable_server_side_cursors"` |
| `GET /api/orders` | 500 | `apps.orders.views.orders_collection_view` | `Order.objects.filter(...)` | `ProgrammingError: invalid dsn: invalid connection option "disable_server_side_cursors"` |
| `GET /api/tables` | 500 | `apps.tables.views.staff_tables` | `RestaurantTable.objects.filter(...)` | `ProgrammingError: invalid dsn: invalid connection option "disable_server_side_cursors"` |
| `GET /api/service-requests` | 500 | `apps.service_requests.views.service_requests_view`| `ServiceRequest.objects.filter(...)` | `ProgrammingError: invalid dsn: invalid connection option "disable_server_side_cursors"` |
| `GET /api/dashboard/overview` | 500 | `apps.dashboard.views.dashboard_overview` | `Order.objects.filter(...)` | `ProgrammingError: invalid dsn: invalid connection option "disable_server_side_cursors"` |
| `GET /api/staff/menu` | 500 | `apps.menu.views.staff_menu` | `MenuItem.objects.filter(...)` | `ProgrammingError: invalid dsn: invalid connection option "disable_server_side_cursors"` |

---

## 3. Why `/api/health` Appeared Green While APIs Failed

In earlier commits, the `/api/health` endpoint checked only the configuration metadata string:
```python
@api_view(["GET"])
def health_check(request):
    from django.db import connection
    return Response({
        "status": "ok",
        "database_vendor": connection.vendor, # Returns string 'postgresql' without connecting
        "database_configured": bool(connection.vendor == "postgresql"),
    })
```
- In Django, `connection.vendor` is a static property on `DatabaseWrapper`. It does **not** test network connectivity or execute a database query.
- When an active database query (`SELECT COUNT(*) FROM restaurants;`) was added to `/api/health` in commit `d751dcb`, the real exception was immediately revealed in production:
```json
{
  "status": "degraded",
  "database_vendor": "postgresql",
  "database_connected": false,
  "database_records": 0,
  "database_error": "ProgrammingError: invalid dsn: invalid connection option \"disable_server_side_cursors\"",
  "supabase": "connected",
  "storage": "online"
}
```

---

## 4. Complete Exception Traceback

```python
Traceback (most recent call last):
  File "/opt/render/project/src/.venv/lib/python3.11/site-packages/django/db/backends/base/base.py", line 282, in ensure_connection
    self.connect()
  File "/opt/render/project/src/.venv/lib/python3.11/site-packages/django/utils/asyncio.py", line 26, in inner
    return func(*args, **kwargs)
  File "/opt/render/project/src/.venv/lib/python3.11/site-packages/django/db/backends/postgresql/base.py", line 269, in connect
    self.connection = self.get_new_connection(conn_params)
  File "/opt/render/project/src/.venv/lib/python3.11/site-packages/django/db/backends/postgresql/base.py", line 248, in get_new_connection
    connection = Database.connect(**conn_params)
  File "/opt/render/project/src/.venv/lib/python3.11/site-packages/psycopg2/__init__.py", line 122, in connect
    conn = _connect(dsn, connection_factory=connection_factory, **kwasync)
django.db.utils.ProgrammingError: invalid dsn: invalid connection option "disable_server_side_cursors"
```

---

## 5. Security & Tenant Context

- **Multi-Tenant Slug:** `'olive-and-ember'`
- **Target Schema:** `public`
- **PostgreSQL User:** `postgres.zmpthsiiouukjjyrbpnz`
- **Security Check:** Row Level Security (RLS) is enabled and healthy; the failure occurred prior to SQL execution during TCP handshake parameter negotiation.
