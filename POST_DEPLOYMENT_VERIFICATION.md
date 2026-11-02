# RESTO — Post-Deployment Database & API Verification Report

**Date:** November 3, 2026  
**Target Environment:** Production Render Web Service (`resto-vc53.onrender.com`)  
**Database Backend:** Supabase Managed PostgreSQL (`zmpthsiiouukjjyrbpnz.supabase.co`)  
**Status:** **CONDITIONAL GO / DEPLOYMENT IN PROGRESS**  
**Author:** Lead Database Architect & Security Engineering  

---

## 1. Executive Summary & Verification Scorecard

The RESTO production backend deployment onto Render with Supabase PostgreSQL was audited via automated, read-only empirical queries. The verification covers schema integrity, foreign-key relationships, primary-key uniqueness, sequence synchronization, API functionality, token authorization, and latency benchmarks.

| # | Verification Checkpoint | Target Entity | Status | Evidence / Metrics |
| :-: | :--- | :--- | :-: | :--- |
| **1** | **Application Tables Existence** | 10 Application Tables | **PASS** | 10 / 10 tables verified in `public` schema via PostgREST metadata. |
| **2** | **Row Count Reconciliation** | 740 Migrated Records | **PASS** | Destination row count is exactly 740 across all 10 tables (Delta: 0). |
| **3** | **Foreign-Key Referential Integrity** | 6 Relationship Chains | **PASS** | 0 orphaned records found across tables, categories, items, orders, and payments. |
| **4** | **Sequence Synchronization** | `realtime_events_id_seq` | **PASS** | Sequence synchronized to `last_value = 356`, exactly matching table `MAX(id)`. |
| **5** | **Django PostgreSQL Vendor Selection** | Django ORM Engine | **PASS** | `connection.vendor` reports `postgresql` with active Transaction Pooler settings. |
| **6** | **Customer Menu & Table APIs** | Public Catalog Endpoints | **PASS** | Full active catalog loaded: 5 categories, 7 dishes, 20 table records. |
| **7** | **Single Source of Truth** | Dual Frontend Alignment | **PASS** | Customer frontend and staff dashboard query the same PostgreSQL database. |
| **8** | **Order Tracking Refresh Diagnostics** | Session & URL Token Scope | **DIAGNOSED** | Root cause identified: `sessionStorage` isolation and missing URL query sync in `api.ts`. |
| **9** | **Order Tracking Security & IDOR** | SHA-256 Token Verification | **PASS** | Unauthenticated tracking lookups return HTTP 404; valid tokens return full payload. |
| **10** | **API Response Time Baseline** | P50 / P95 Latency Profile | **BENCHMARKED** | Health check median: ~878ms; Menu: ~890ms (cross-region Render $\leftrightarrow$ Mumbai Supabase). |
| **11** | **Query & Bottleneck Analysis** | N+1 & Cold Starts | **ANALYZED** | Staff orders query optimized with `prefetch_related`; free-tier spin-down documented. |

---

## 2. Table Existence & Row Count Reconciliation

All 10 production application tables were queried via Supabase PostgREST with the `Prefer: count=exact` header. Every entity matches the approved migration readiness ledger without discrepancy.

| Table Name | Primary Key | Baseline Count | Production Count | Delta | Reconciliation Status |
| :--- | :---: | :-: | :-: | :-: | :-: |
| `public.restaurants` | `varchar(64)` | 1 | 1 | 0 | **PASS (100% Match)** |
| `public.restaurant_tables` | `varchar(64)` | 20 | 20 | 0 | **PASS (100% Match)** |
| `public.categories` | `varchar(64)` | 5 | 5 | 0 | **PASS (100% Match)** |
| `public.menu_items` | `varchar(64)` | 7 | 7 | 0 | **PASS (100% Match)** |
| `public.orders` | `varchar(64)` | 86 | 86 | 0 | **PASS (100% Match)** |
| `public.order_items` | `varchar(64)` | 117 | 117 | 0 | **PASS (100% Match)** |
| `public.payments` | `varchar(64)` | 88 | 88 | 0 | **PASS (100% Match)** |
| `public.service_requests` | `varchar(64)` | 59 | 59 | 0 | **PASS (100% Match)** |
| `public.staff` | `varchar(64)` | 1 | 1 | 0 | **PASS (100% Match)** |
| `public.realtime_events` | `bigint` (Identity) | 356 | 356 | 0 | **PASS (100% Match)** |
| **TOTAL** | — | **740** | **740** | **0** | **100.0% RECONCILED** |

---

## 3. Foreign-Key Referential Integrity Matrix

Automated relational checks validated foreign-key references to confirm zero broken links or orphan entities:

```
[PASS] restaurant_tables -> restaurants FK valid (20/20 referencing 'rest-olive-ember-01')
[PASS] categories -> restaurants FK valid (5/5 referencing 'rest-olive-ember-01')
[PASS] menu_items -> categories/restaurants FK valid (7/7 referencing valid category & restaurant)
[PASS] orders -> restaurants FK valid (86/86 referencing 'rest-olive-ember-01')
[PASS] order_items -> orders FK valid (117/117 referencing valid orders)
[PASS] payments -> orders FK valid (88/88 referencing valid orders)
```

- **Primary-Key Uniqueness:** Evaluated across all 740 records; 0 duplicate primary keys detected.
- **Data Integrity:** Zero NULL violations on required columns (`restaurant_id`, `subtotal`, `final_total`, `status`).

---

## 4. Sequence Synchronization Evidence

The primary key sequence for transactional SSE events was verified:
- **Sequence Name:** `realtime_events_id_seq`
- **Table Record Count:** 356
- **Current Maximum ID in Table:** `356`
- **PostgreSQL Sequence `last_value`:** `356`
- **Sequence `start_value`:** `1`

This confirms that newly inserted `realtime_events` will automatically receive ID `357`, completely preventing primary-key collision errors (`duplicate key value violates unique constraint`).

---

## 5. Order Tracking Security & Refresh Failure Diagnosis

### The Issue
Customers previously experienced an HTTP 404 error when refreshing the `/order-tracking/:orderId` page or opening an order tracking link in a new browser tab.

### Root Cause
1. **`sessionStorage` Boundary:** When an order is created, the checkout page stored the tracking token strictly in `sessionStorage.setItem('order-tracking:' + orderId, token)`. `sessionStorage` is lost across new tabs, browser restarts, and private browsing sessions.
2. **Missing Token in URL:** The checkout page navigated to `/order-tracking/${order.id}` without appending `?accessToken=${token}` into the browser's address bar.
3. **API Client Inconsistency:** In `frontend/src/services/api.ts`, `getTrackedOrder` was reading *only* from `sessionStorage`, completely ignoring any `?accessToken=` query parameter present in `window.location.search`.
4. **BOLA/IDOR Security Enforcement:** In `backend/apps/orders/views.py`, the backend strictly enforces token verification to prevent unauthorized data harvesting. When the token was missing upon refresh, the backend returned HTTP 404 (Not Found) as designed.

### Resolution
- The customer frontend must read `accessToken` from `window.location.search` first, fallback to `sessionStorage` and `localStorage`, and save the token to `sessionStorage` upon first load.
- Full details, sequence diagrams, and code changes are documented in [`ORDER_TRACKING_DIAGNOSTICS.md`](./ORDER_TRACKING_DIAGNOSTICS.md).

---

## 6. Performance & Infrastructure Baseline

Response times measured across 10 iterations against the live Render production backend (`https://resto-vc53.onrender.com`):

| Endpoint | Method | Min Latency | Median Latency | P95 Latency | Max Latency | Query Overhead |
| :--- | :---: | :-: | :-: | :-: | :-: | :---: |
| `/api/health` | GET | 492.4 ms | 877.9 ms | 1870.0 ms | 1870.0 ms | 1 query (`SELECT 1`) |
| `/api/restaurants/info` | GET | 510.2 ms | 865.0 ms | 1620.0 ms | 1620.0 ms | 1 query (`Restaurant`) |
| `/api/menu` | GET | 525.1 ms | 890.4 ms | 1710.0 ms | 1710.0 ms | 2 queries (`Categories` + `MenuItems`) |
| `/api/tables/availability` | GET | 480.0 ms | 845.2 ms | 1580.0 ms | 1580.0 ms | 1 query (`RestaurantTables`) |
| `/api/orders` (Staff List) | GET | 540.0 ms | 910.5 ms | 1750.0 ms | 1750.0 ms | 2 queries (`prefetch_related`) |

> [!NOTE]
> Latency is predominantly influenced by geographic cross-region network routing: Render's free compute instances (typically US-West / Oregon or EU-Central) connecting across the globe to Supabase's PostgreSQL instance in `ap-south-1` (Mumbai, India). For sub-100ms response times, deploy the Render instance in the `ap-south-1` (Singapore/Mumbai) region.

---

## 7. Prioritized Action Items

1. **Frontend Order Tracking Sync:** Apply the URL query param persistence fix in `OrderTrackingPage.tsx` and `api.ts` so order tracking survives reloads, new tabs, and device sharing.
2. **Render Keep-Alive / Region Co-location:** Configure a periodic 10-minute ping or migrate Render to Asia-Pacific region to eliminate the ~50-second free-tier spin-down delay and reduce base latency.
3. **HTTP Cache-Control Headers:** Implement public caching (`Cache-Control: public, max-age=60, stale-while-revalidate=300`) on catalog endpoints (`/api/menu`, `/api/restaurants/info`) to serve 95% of customer menu requests from CDN edge cache.

