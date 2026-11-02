# RESTO — Database Integrity & Dry-Run Data Cleanup Report

**Database Backend:** Supabase PostgreSQL (Standard Edition via Supavisor Transaction Pooler)  
**Host:** `aws-0-ap-south-1.pooler.supabase.com`  
**Port:** `6543` (Transaction Mode)  
**Database Name:** `postgres`  
**Audit Date:** November 3, 2026  
**Auditor:** Principal Database Architect  

---

## 1. Schema & Parity Verification

A full cross-verification was conducted between Django ORM models (`backend/apps/*/models.py`), migration history, and the live PostgreSQL schema in Supabase.

| PostgreSQL Table | Primary Key | Foreign Keys | Row Count | Tenant Scoping Column | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `restaurants` | `id` (varchar) | None | 1 | `id` (tenant root) | PASS |
| `restaurant_tables` | `id` (varchar) | `restaurant_id -> restaurants.id` | 8 | `restaurant_id` | PASS |
| `categories` | `id` (varchar) | `restaurant_id -> restaurants.id` | 5 | `restaurant_id` | PASS |
| `menu_items` | `id` (varchar) | `restaurant_id -> restaurants.id`<br>`category_id -> categories.id` | 7 | `restaurant_id` | PASS |
| `orders` | `id` (varchar) | `restaurant_id -> restaurants.id`<br>`table_id -> restaurant_tables.id` | 3 | `restaurant_id` | PASS |
| `order_items` | `id` (varchar) | `order_id -> orders.id` | 3 | Via `orders.restaurant_id` | PASS |
| `payments` | `id` (varchar) | `restaurant_id -> restaurants.id`<br>`order_id -> orders.id` | 3 | `restaurant_id` | PASS |
| `service_requests` | `id` (varchar) | `restaurant_id -> restaurants.id` | 0 | `restaurant_id` | PASS |
| `realtime_events` | `id` (bigserial) | `restaurant_id -> restaurants.id` | 20 | `restaurant_id` | PASS |

### Integrity Findings
1. **Primary & Foreign Key Integrity:** All foreign key constraints (`restaurant_id`, `category_id`, `order_id`) enforce referential integrity with `ON DELETE CASCADE` or `RESTRICT`. Zero orphan records exist.
2. **Tenant Isolation:** Every operational table contains a direct `restaurant_id` foreign key. Views filter strictly by `restaurant = restaurant` resolved from the validated `restaurantSlug`.
3. **No SQLite Fallback:** Production environment strictly validates `DATABASE_URL` during Django startup. If `DATABASE_URL` is omitted or invalid, Django aborts immediately (`ImproperlyConfigured`), preventing accidental fallback to SQLite.
4. **Supabase Pooler Compatibility:**
   - Supavisor Transaction Pooler operates on port `6543`.
   - `conn_max_age` is set to `0` to prevent persistent server-side connection hold.
   - `DISABLE_SERVER_SIDE_CURSORS` is configured at the top-level database dictionary to ensure compatibility with transaction multiplexing.

---

## 2. Dry-Run Data Cleanup Report (Initial Restaurant State)

Per Section 4 of the project directive:
> *This restaurant has not yet started real customer operations. Expected initial state: All configured restaurant tables should be Available. No table should be Occupied without a genuine active dining session. Generate a dry-run cleanup report first. Do not delete genuine business records without authorization.*

### Analysis of Current Live Database Records
The live database currently contains 3 test orders generated during API integration tests:

#### A. Candidate Records for Cleanup

1. **Order Record 1:**
   - **ID:** `ord-1793648460224-d6627f`
   - **Order Number:** `DF-1001`
   - **Table:** `08`
   - **Customer:** `Guest Table 08`
   - **Status:** `served`
   - **Total:** ₹414.75
   - **Created At:** `2026-11-02T19:41:00.396823+00:00`
   - **Associated Payment:** `pay-ord-1793648460224-d6627f` (₹414.75, Counter, pending)
   - **Associated Order Items:** 1 item (`Wood-Fired Margherita Pizza`, qty 1)
   - **Impact on Table Availability:** Holds Table 08 in **Occupied** status.

2. **Order Record 2:**
   - **ID:** `ord-1793648709172-8641b4`
   - **Order Number:** `DF-1002`
   - **Table:** `01`
   - **Customer:** `Guest Table 01`
   - **Status:** `preparing`
   - **Total:** ₹446.25
   - **Created At:** `2026-11-02T19:45:09.321630+00:00`
   - **Associated Payment:** `pay-ord-1793648709172-8641b4` (₹446.25, Counter, pending)
   - **Associated Order Items:** 1 item (`Wood-Fired Margherita Pizza`, qty 1 + addon)
   - **Impact on Table Availability:** Holds Table 01 in **Occupied** status.

3. **Order Record 3:**
   - **ID:** `ord-1793648739319-0bbe3b`
   - **Order Number:** `DF-1003`
   - **Table:** `01`
   - **Customer:** `Guest Table 01`
   - **Status:** `preparing`
   - **Total:** ₹446.25
   - **Created At:** `2026-11-02T19:45:39.492919+00:00`
   - **Associated Payment:** `pay-ord-1793648739319-0bbe3b` (₹446.25, UPI, completed)
   - **Associated Order Items:** 1 item (`Wood-Fired Margherita Pizza`, qty 1 + addon)
   - **Impact on Table Availability:** Holds Table 01 in **Occupied** status.

#### B. Records to PRESERVE (Untouched)
- **Restaurant Configuration:** `The Olive & Ember` (`rest-olive-ember-01`) — Preserved.
- **Tables (8 configured):** Tables 01, 02, 03, 04, 05, 06, 07, 08 — Preserved.
- **Categories (5 configured):** Starters, Wood-Fired Pizza, Handmade Pasta, Mains, Beverages — Preserved.
- **Menu Items (7 configured):** Margherita, Truffle Risotto, Gnocchi Sorrentina, Tiramisu, etc. — Preserved.

#### C. Proposed Actions for Cleanup Execution (Upon Approval)
EITHER:
1. **Transition to Completed (Recommended for Audit Trail):**
   Update order statuses to `completed`. Dynamic occupancy will automatically detect zero active orders on Tables 01 and 08, transitioning all 8 tables to **Available** while preserving order history.
   ```sql
   UPDATE orders SET status = 'completed', updated_at = NOW() WHERE restaurant_id = 'rest-olive-ember-01';
   ```
2. **Purge Test Orders (Clean Slate for Launch):**
   Delete test orders DF-1001, DF-1002, and DF-1003 and cascade to their payments and order items.
   ```sql
   DELETE FROM payments WHERE order_id IN ('ord-1793648460224-d6627f', 'ord-1793648709172-8641b4', 'ord-1793648739319-0bbe3b');
   DELETE FROM order_items WHERE order_id IN ('ord-1793648460224-d6627f', 'ord-1793648709172-8641b4', 'ord-1793648739319-0bbe3b');
   DELETE FROM orders WHERE id IN ('ord-1793648460224-d6627f', 'ord-1793648709172-8641b4', 'ord-1793648739319-0bbe3b');
   ```

Both options leave the restaurant in a 100% clean initial state with all tables `Available`.

