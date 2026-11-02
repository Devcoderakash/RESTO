# RESTO — Production API Failure Root Cause Report

**Issue Title:** Simultaneous HTTP 500 Outage on All Data Endpoints After PostgreSQL Cutover  
**Classification:** Database Driver Parameter Configuration Bug  
**Affected Service:** RESTO Web Service (`resto-vc53.onrender.com`)  
**Scope:** 100% of Database-Backed Django API Endpoints  

---

## 1. The Core Failure Mechanism

### What Happened
In `backend/config/db_utils.py` (lines 101–113), the Supabase Transaction Pooler compatibility logic was implemented as follows:

```python
# BUGGY IMPLEMENTATION:
if is_transaction_pooler:
    options["disable_server_side_cursors"] = True  # <-- PLACED INSIDE OPTIONS

return {
    "ENGINE": "django.db.backends.postgresql",
    "NAME": dbname,
    "USER": user,
    "PASSWORD": password,
    "HOST": host,
    "PORT": int(port) if str(port).isdigit() else 5432,
    "CONN_MAX_AGE": conn_max_age,
    "OPTIONS": options,
}
```

### Why it Broke All Database Queries
1. **Django vs Psycopg2 Responsibility:**
   - In Django's database configuration dict (`DATABASES['default']`), the `OPTIONS` sub-dictionary is forwarded *directly* to the underlying Python PostgreSQL driver (`psycopg2`) via `psycopg2.connect(**options)`.
   - `psycopg2` only permits valid libpq C connection string options (e.g. `sslmode`, `connect_timeout`, `application_name`, `keepalives`).
   - `disable_server_side_cursors` is a **Django-specific feature flag**, not a PostgreSQL libpq connection parameter!
2. **The Resulting Crash:**
   - When Django attempted to establish its very first database connection via `psycopg2.connect(..., disable_server_side_cursors=True)`, libpq threw:
   ```
   django.db.utils.ProgrammingError: invalid dsn: invalid connection option "disable_server_side_cursors"
   ```
3. **The Universal Outage:**
   - Because every single data endpoint (`/api/tables/availability`, `/api/menu`, `/api/orders`, `/api/restaurants/info`, `/api/service-requests`) requires a database connection to fulfill queries, every single endpoint crashed at the connection layer before any SQL was dispatched.
   - DRF's `custom_exception_handler` caught the unhandled `ProgrammingError` and returned generic 500 responses:
   ```json
   {
     "error": {
       "code": "INTERNAL_SERVER_ERROR",
       "message": "An unexpected server error occurred. Please try again later."
     }
   }
   ```

---

## 2. Why `/api/health` Previously Reported "OK"

The original `/api/health` endpoint implementation was:
```python
@api_view(["GET"])
def health_check(request):
    from django.db import connection
    return Response({
        "status": "ok",
        "database_vendor": connection.vendor,
        "database_configured": bool(connection.vendor == "postgresql"),
    })
```
- In Django, `connection.vendor` simply reads the static property `vendor = 'postgresql'` defined in `django.db.backends.postgresql.base.DatabaseWrapper`.
- It **never initiates a TCP socket connection** or executes SQL.
- Thus, `/api/health` returned HTTP 200 with `database_vendor: postgresql` while the actual connection was completely unable to connect.

---

## 3. The Confirmed Resolution

In Django 3.x, 4.x, and 5.x, disabling server-side cursors must be specified as a **top-level key** in `DATABASES['default']`:

```python
# CORRECT IMPLEMENTATION:
return {
    "ENGINE": "django.db.backends.postgresql",
    "NAME": dbname,
    "USER": user,
    "PASSWORD": password,
    "HOST": host,
    "PORT": int(port) if str(port).isdigit() else 5432,
    "CONN_MAX_AGE": conn_max_age,
    "DISABLE_SERVER_SIDE_CURSORS": is_transaction_pooler,  # Top-level Django setting
    "OPTIONS": options,  # Clean options containing only valid libpq keys (sslmode)
}
```

- When configured at the top level, Django's `DatabaseWrapper` intercepts `DISABLE_SERVER_SIDE_CURSORS` and instructs its query compiler to use client-side buffered cursors, while omitting the key from the DSN dictionary passed to `psycopg2.connect()`.
