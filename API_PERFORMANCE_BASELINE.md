# RESTO — Production API Performance Baseline & Architecture Audit

**Target URL:** `https://resto-vc53.onrender.com`  
**Database URL:** Supabase Transaction Pooler (`aws-0-ap-south-1.pooler.supabase.com:6543`)  
**Audit Scope:** Endpoints latency, ORM query counts, N+1 query detection, cold-start profiles, and edge caching opportunities.  

---

## 1. Latency & Response Time Distribution

A baseline sample of 10 requests per endpoint was captured under production conditions. Times represent full network round-trip from client to Render to Supabase and back.

```
========================================================================================
ENDPOINT LATENCY BENCHMARK MATRIX (10 SAMPLES PER ENDPOINT)
========================================================================================
Endpoint                     Method   Min (ms)   Median (ms)   P95 (ms)   Max (ms)   Status
----------------------------------------------------------------------------------------
/api/health                   GET      1616.4      2162.1       8240.9      8240.9     200 OK
/api/restaurants/info         GET      1325.2      4460.2       7032.8      7032.8     200 OK
/api/menu                     GET      1683.6      1833.6       8208.2      8208.2     200 OK
/api/tables/availability     GET      1445.9      1550.2       3459.8      3459.8     200 OK
/api/orders (Staff List)      GET      1788.5      1896.1       2096.4      2096.4     200 OK
========================================================================================
```

---

## 2. Django ORM Query Count Audit & N+1 Prevention

| Endpoint | Primary Query | Secondary Queries | Total DB Queries | Optimization Applied |
| :--- | :--- | :--- | :-: | :--- |
| `GET /api/restaurants/info` | `Restaurant.objects.filter(slug=...)` | None | **1** | Single indexed lookup on `restaurants.slug`. |
| `GET /api/tables/availability` | `RestaurantTable.objects.filter(restaurant=...)` | None | **1** | Single indexed scan on `idx_tables_restaurant`. |
| `GET /api/menu` | `Category.objects.filter(is_visible=True)` | `MenuItem.objects.filter(is_available=True)` | **2** | Clean 2-query batching; zero N+1 queries. |
| `GET /api/orders` (Staff) | `Order.objects.filter(restaurant=...)` | `order_items` via `prefetch_related` | **2** | Uses `prefetch_related("order_items")` instead of $N$ child item queries. Prevents 80+ queries for an 80-order page. |
| `POST /api/orders` | `Restaurant` + `Table` (atomic lock) | `OrderItem.objects.bulk_create` + `Payment.objects.create` + `RealtimeEvent` | **4** | Wrapped in `@transaction.atomic` with `select_for_update` on PostgreSQL to prevent double-booking. |
| `GET /api/orders/{id}/tracking` | `Order.objects.filter(id=...)` | `order.order_items.all()` | **2** | Single order lookup + items fetch. |

---

## 3. Infrastructure & Network Bottlenecks

### 1. Geographic Routing Delay
- **Render Backend Location:** Oregon / Frankfurt (US / EU region).
- **Supabase Database Location:** `ap-south-1` (Mumbai, India).
- **Impact:** Each database query entails an intercontinental cross-ocean roundtrip of approximately 200–250ms TCP latency.
- **Remedy:** Move the Render Web Service to the `Singapore` (`ap-southeast-1`) region, reducing round-trip latency to $< 40$ ms.

### 2. Render Free-Tier Cold Starts
- **Behavior:** Free-tier web services on Render automatically spin down to 0 instances after 15 minutes of inbound request inactivity.
- **Wake-Up Penalty:** The initial request following inactivity incurs a 30-to-50 second delay while the container image is spun up and Gunicorn is initialized.
- **Remedy:** Upgrade to Render Starter ($7/mo) or maintain an external synthetic ping every 10 minutes (e.g. UptimeRobot or GitHub Actions cron).

### 3. Transaction Pooler Connection Reuse
- **Supabase Port 6543:** `CONN_MAX_AGE` is set to `0` by design to permit Supavisor transaction-level multiplexing without connection bleeding.
- **Port 5432 Direct Session:** If dedicated persistent connections are needed for high-throughput batch operations, Port 5432 supports `CONN_MAX_AGE = 600`.

---

## 4. Frontend Rendering & Realtime Bottlenecks

1. **Duplicate Table Polls:**
   - Both `Navbar` and `MenuPage` fetch restaurant info and table availability independently on mount.
   - **Optimization:** Share state via Zustand store (`useRestaurantStore`) to prevent redundant roundtrips.
2. **Real-time Event Streaming:**
   - SSE connection (`/api/realtime/stream`) provides low-overhead push notifications ($< 50$ ms).
   - Inactive tabs maintain a 30-second fallback reconciliation timer, preventing polling storms while maintaining data freshness.

