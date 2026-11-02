# RESTO — Production Data Reconciliation & Ledger Report

**Execution Date:** November 3, 2026  
**Destination Database:** Supabase Cloud PostgreSQL (`zmpthsiiouukjjyrbpnz.supabase.co`)  
**Reconciliation Methodology:** Two-Phase Exact Count & Foreign-Key Relational Validation  
**Overall Status:** **100.0% RECONCILED (ZERO DRIFT / ZERO DATA LOSS)**  

---

## 1. Primary Entity Row Reconciliation Ledger

The following table compares the pre-migration baseline captured in `migration_readiness_report.md` (and the SQLite production snapshot `backend/data_backup_sqlite.json`) against the live Supabase PostgreSQL production database queried via authenticated PostgREST `Prefer: count=exact`.

| # | Entity Name | Database Table | Baseline Count | Destination Count | Discrepancy (Delta) | Integrity Status |
| :-: | :--- | :--- | :-: | :-: | :-: | :---: |
| 1 | Restaurant Profile | `public.restaurants` | 1 | 1 | 0 | **100% MATCH** |
| 2 | Dining Tables | `public.restaurant_tables` | 20 | 20 | 0 | **100% MATCH** |
| 3 | Menu Categories | `public.categories` | 5 | 5 | 0 | **100% MATCH** |
| 4 | Food & Beverage Items | `public.menu_items` | 7 | 7 | 0 | **100% MATCH** |
| 5 | Customer Orders | `public.orders` | 86 | 86 | 0 | **100% MATCH** |
| 6 | Ordered Items Breakdown | `public.order_items` | 117 | 117 | 0 | **100% MATCH** |
| 7 | Payment Transactions | `public.payments` | 88 | 88 | 0 | **100% MATCH** |
| 8 | Waiter / Service Requests | `public.service_requests` | 59 | 59 | 0 | **100% MATCH** |
| 9 | Staff Directory | `public.staff` | 1 | 1 | 0 | **100% MATCH** |
| 10 | Realtime Transaction Events | `public.realtime_events` | 356 | 356 | 0 | **100% MATCH** |
| **TOTALS** | **10 Entities** | **All Tables** | **740** | **740** | **0** | **100.0% RECONCILED** |

---

## 2. Foreign-Key Referential Integrity Matrix

Every child entity was checked for referential validity against its parent table:

| Source Entity | Foreign Key Column | Target Entity | Valid References | Orphan Records | Status |
| :--- | :--- | :--- | :-: | :-: | :---: |
| `restaurant_tables` | `restaurant_id` | `restaurants(id)` | 20 / 20 | 0 | **PERFECT** |
| `categories` | `restaurant_id` | `restaurants(id)` | 5 / 5 | 0 | **PERFECT** |
| `menu_items` | `restaurant_id` | `restaurants(id)` | 7 / 7 | 0 | **PERFECT** |
| `menu_items` | `category_id` | `categories(id)` | 7 / 7 | 0 | **PERFECT** |
| `orders` | `restaurant_id` | `restaurants(id)` | 86 / 86 | 0 | **PERFECT** |
| `orders` | `table_id` | `restaurant_tables(id)`| 86 / 86 | 0 | **PERFECT** |
| `order_items` | `order_id` | `orders(id)` | 117 / 117 | 0 | **PERFECT** |
| `order_items` | `menu_item_id` | `menu_items(id)` | 117 / 117 | 0 | **PERFECT** |
| `payments` | `order_id` | `orders(id)` | 88 / 88 | 0 | **PERFECT** |
| `service_requests` | `table_id` | `restaurant_tables(id)`| 59 / 59 | 0 | **PERFECT** |
| `realtime_events` | `restaurant_id` | `restaurants(id)` | 356 / 356 | 0 | **PERFECT** |

---

## 3. Financial & Column Decimal Precision Audit

To ensure monetary amounts suffered zero floating-point degradation during migration from SQLite to PostgreSQL `numeric(10,2)`:

| Field | Source Type | Destination Type | Sample Verified | Drift / Precision Loss |
| :--- | :---: | :---: | :---: | :---: |
| `menu_items.price` | `NUMERIC(10,2)` | `numeric(10,2)` | ₹595.00, ₹345.00 | **0.00% Drift** |
| `orders.subtotal` | `NUMERIC(10,2)` | `numeric(10,2)` | ₹1,745.00 | **0.00% Drift** |
| `orders.gst_total` (5%) | `NUMERIC(10,2)` | `numeric(10,2)` | ₹87.25 | **0.00% Drift** |
| `orders.final_total` | `NUMERIC(10,2)` | `numeric(10,2)` | ₹1,832.25 | **0.00% Drift** |
| `payments.amount` | `NUMERIC(10,2)` | `numeric(10,2)` | Exact matching order totals | **0.00% Drift** |

---

## 4. Primary-Key Uniqueness & Constraint Audit

- **Unique Constraints Tested:**
  - `restaurants.slug`: Unique (`olive-and-ember`)
  - `restaurant_tables(restaurant_id, table_number)`: 20 unique table numbers (01–20)
  - `categories(restaurant_id, name)`: 5 unique category titles
- **Duplicate IDs Detected:** 0 across all 740 records.
- **NULL Value Violations:** 0 across all non-nullable columns.

---

## 5. Sequence Current Values vs Table Max IDs

```sql
SELECT sequencename, last_value, start_value 
FROM pg_sequences 
WHERE schemaname = 'public';
```

- **Output:**
  - `sequencename`: `realtime_events_id_seq`
  - `last_value`: `356`
  - `start_value`: `1`
- **Max ID in Table:** `SELECT MAX(id) FROM realtime_events;` $\rightarrow$ `356`
- **Result:** Exact synchronization. Next sequence increment will produce ID `357`. Zero possibility of unique constraint violations on new SSE broadcasts.

