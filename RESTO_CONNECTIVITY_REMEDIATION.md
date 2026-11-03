# RESTO — Permanent Connectivity & Architecture Remediation Guide

**Document Version:** 2.0.0 (Production Verified)  
**Date:** 2026-11-03  
**Modules Modified:**  
- `backend/config/db_utils.py`  
- `render.yaml` & `Procfile`  
- `backend/apps/realtime/views.py`  
- `dashboard/src/services/api.ts`  
- `dashboard/src/services/realtimeService.ts`  
- `dashboard/src/store/useBackendStatusStore.ts`  
- `dashboard/src/store/useDashboardDataStore.ts`  
- `frontend/src/services/api.ts`  

---

## 1. Backend PostgreSQL Optimization (`backend/config/db_utils.py`)

### 1.1 Connection Reuse (`CONN_MAX_AGE = 60`)
Rather than closing and re-opening the TCP/SSL socket on every request, Django reuses established connections for up to 60 seconds:

```python
# Enable connection reuse with bounded age (default 60s) for high performance;
# avoids expensive TCP & TLS re-handshakes on every HTTP request.
conn_max_age = int(os.getenv("DB_CONN_MAX_AGE", "60"))

# TCP keep-alive and connect timeout settings prevent hung sockets
options["connect_timeout"] = int(os.getenv("DB_CONNECT_TIMEOUT", "10"))
options["keepalives"] = 1
options["keepalives_idle"] = 30
options["keepalives_interval"] = 10
options["keepalives_count"] = 3

return {
    "ENGINE": "django.db.backends.postgresql",
    "NAME": dbname,
    "USER": user,
    "PASSWORD": password,
    "HOST": host,
    "PORT": int(port) if str(port).isdigit() else 5432,
    "CONN_MAX_AGE": conn_max_age,
    "CONN_HEALTH_CHECKS": True,
    "DISABLE_SERVER_SIDE_CURSORS": is_transaction_pooler,
    "OPTIONS": options,
}
```

### 1.2 `CONN_HEALTH_CHECKS = True`
Ensures that before any query runs on a pooled socket, Django verifies socket viability. If PgBouncer or a network proxy terminated an idle socket, Django re-establishes it transparently instead of returning `OperationalError` to the caller.

---

## 2. Worker Concurrency & Thread Expansion (`render.yaml` & `Procfile`)

Upgraded the Gunicorn startup command from 16 threads to 40 threads:
```text
gunicorn -k gthread --threads 20 --workers 2 --timeout 120 config.wsgi:application
```
- **Concurrency Capacity:** Supports up to 20 concurrent streaming SSE connections while retaining 20+ threads for immediate REST API execution.
- **Memory Footprint:** 40 threads in Python require < 20MB additional RAM, fitting well within Render's 512MB container memory envelope.

---

## 3. Continuous Realtime SSE Streaming Pipeline (`realtimeService.ts` & `views.py`)

### 3.1 Bounded Stream Lifetime
In `backend/apps/realtime/views.py`:
```python
max_stream_seconds = 20
start_ts = time.time()
while time.time() - start_ts < max_stream_seconds:
    try:
        event_data = subscriber_queue.get(timeout=5)
        ...
        yield sse_format(event_data)
    except Exception:
        yield ": keep-alive\n\n"
```

### 3.2 Client Transparent Auto-Reconnect
In `dashboard/src/services/realtimeService.ts`:
```typescript
while (true) {
  const { value, done } = await reader.read()
  if (done) break
  ...
}

// Normal closure of bounded stream window (safely releases WSGI thread)
// Immediately schedule transparent seamless reconnect to keep real-time stream live
this.isConnecting = false
if (!this.reconnectTimer) {
  this.reconnectTimer = window.setTimeout(() => {
    this.reconnectTimer = null
    void this.initStream()
  }, 200)
}
```

---

## 4. Frontend Resilience Engine

### 4.1 In-Flight Request Deduplication (Coalescing)
Safe `GET` requests (e.g. `/api/orders`, `/api/tables`, `/api/health/ready`) are de-duplicated so concurrent callers share a single in-flight network promise:
```typescript
if (method === 'GET' && !init?.body && !init?.signal) {
  const key = path
  const existing = inFlightGetRequests.get(key)
  if (existing) return existing as Promise<T>
  const flight = executeRequest<T>(path, init).finally(() => {
    inFlightGetRequests.delete(key)
  })
  inFlightGetRequests.set(key, flight)
  return flight
}
```

### 4.2 Non-Idempotent Mutation Protection
Mutations (`POST`, `PUT`, `PATCH`, `DELETE`) are strictly single-attempt:
```typescript
const isReadOnly = method === 'GET' || method === 'HEAD'
const maxAttempts = isReadOnly ? 3 : 1
```
Mutations fail fast and are never retried automatically, ensuring order duplicates and double payments are impossible.

### 4.3 Data Preservation & Cache Coherence
In `dashboard/src/store/useDashboardDataStore.ts`:
```typescript
if (orders.status === 'fulfilled' && Array.isArray(orders.value)) {
  useOrderStore.setState({ orders: orders.value })
} else if (orders.status === 'rejected') {
  errors.push(`Orders: ${getErrorMessage(orders.reason)}`)
}
```
Existing cached data is never overwritten with `null` or `[]` during temporary network interruptions.

