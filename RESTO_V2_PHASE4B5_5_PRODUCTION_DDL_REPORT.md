# RESTO V2 — Phase 4B.5.5: Authorized Production DDL Execution Report

**Date**: November 4, 2026  
**Branch**: `resto-v2-staging`  
**Authorization Commit**: `7468840`  
**Supabase Project Reference**: `zmpthsiiouukjjyrbpnz`  
**Supabase Database URL**: `https://zmpthsiiouukjjyrbpnz.supabase.co`  
**Transaction Pooler Host**: `aws-1-eu-west-3.pooler.supabase.com:6543`  
**Target Schema**: `resto_v2`  
**Verdict**: **DDL EXECUTION COMPLETED & VERIFIED — READY FOR SEPARATE DATA IMPORT AUTHORIZATION**

---

## Executive Summary

Pursuant to explicit user authorization for Phase 4B.5.5, the isolated `resto_v2` PostgreSQL schema and all required database objects were successfully created on the authorized Supabase primary production database (`zmpthsiiouukjjyrbpnz`).

Prior to execution, all pre-execution checks—including environment credentials, target authorization flags, live database identity, pre-DDL baseline, and SHA-256 migration file checksums—were strictly validated. 

All four core migrations (`001` through `004`) and the reviewed security hardening patch (`004_hardening_notify_realtime_event.sql`) were executed transactionally and sequentially. Post-execution catalog inspection confirmed the exact creation of:
- **1 isolated schema**: `resto_v2`
- **11 base tables**
- **16 foreign key constraints**
- **20 performance indexes** (+ 14 primary/unique constraint indexes)
- **20 Row Level Security (RLS) policies**
- **1 realtime event notification function** with secure `search_path = pg_catalog, resto_v2`
- **1 realtime trigger** (`trg_notify_realtime_event`)
- **Strict least-privilege table grants** (only catalog read access granted to `anon` and `authenticated`)

All existing systems—the cleaned `public` schema (0 tables), Supabase Auth (27 tables), Supabase Storage (10 tables), and the `resto-media` storage bucket (5 menu images)—remain 100% intact and untouched. **Zero rows of data were imported, and zero application or infrastructure deployments occurred.**

---

## 1. Mandatory Pre-Execution Verification

Before any SQL statements were issued to the production database, the following automated safety checks were performed:

| Check | Expected | Observed | Status |
| :--- | :--- | :--- | :---: |
| **Credential Source** | `backend_node/.env` | Loaded via `dotenv.config()` (mode `0o600`) | **PASS** |
| **Opt-In Flag** | `ALLOW_RESTO_V2_PRIMARY_TARGET=true` | `true` | **PASS** |
| **Target Project Ref** | `RESTO_V2_PRIMARY_PROJECT_REF=zmpthsiiouukjjyrbpnz` | `zmpthsiiouukjjyrbpnz` | **PASS** |
| **Pooler Hostname** | `aws-1-eu-west-3.pooler.supabase.com` | `aws-1-eu-west-3.pooler.supabase.com` | **PASS** |
| **Pooler Username** | `postgres.zmpthsiiouukjjyrbpnz` | `postgres.zmpthsiiouukjjyrbpnz` | **PASS** |
| **Pooler Port** | `6543` | `6543` | **PASS** |
| **SSL Mode** | SSL Required | `ssl: { rejectUnauthorized: false }` | **PASS** |
| **Target Schema** | `resto_v2` | `resto_v2` | **PASS** |
| **Pre-DDL Schema State** | `resto_v2` does not exist | `resto_v2` schema not present (count = 0) | **PASS** |
| **Pre-DDL Public Schema** | 0 tables in `public` | 0 tables in `public` | **PASS** |
| **Pre-DDL Auth & Storage** | System schemas intact | `auth`: 27 tables, `storage`: 10 tables | **PASS** |

### Migration File SHA-256 Checksums

All migration and patch files were verified against their previously reviewed byte hashes prior to execution:

| Migration File | SHA-256 Checksum | Verification |
| :--- | :--- | :---: |
| `001_create_resto_v2_schema.sql` | `4e79dba32347751e109f9b06f4f11c513b7f090d35a68e5e32ce7f2df4cbbd8c` | **MATCH** |
| `002_create_tables.sql` | `c6ca3798b97b02a76b72ad3b94e322c788cd776f162a8d821e338a145819a990` | **MATCH** |
| `003_create_indexes.sql` | `5b24ec63f181bc7cce0a95f44f951165ed4da0fdbd39d850738f57b97206393d` | **MATCH** |
| `004_create_rls_and_security.sql` | `d7423ee0e32fff01d6abde1e8faf1122a861bce23498c8549d210117fc919ab7` | **MATCH** |
| `patches/004_hardening_notify_realtime_event.sql` | `89e062297683c3404d9ceaaf16672b6dc179152db3dd027f89df5fb5e2b992a7` | **MATCH** |

---

## 2. Actual SQL Execution Order & Timing

Migrations and hardening patches were executed in strict sequential order inside discrete transactions (`BEGIN` ... `COMMIT`):

```
🚀 Starting V2 Migration Runner...
Target: postgresql://postgres.zmpthsiiouukjjyrbpnz:****@aws-1-eu-west-3.pooler.supabase.com:6543/postgres?sslmode=require
Expected Project Ref: zmpthsiiouukjjyrbpnz
Primary Target Opt-In: YES
```

| Order | Script / Migration File | Transaction | Duration | Result |
| :---: | :--- | :---: | :---: | :---: |
| 1 | `001_create_resto_v2_schema.sql` | `BEGIN / COMMIT` | 567 ms | **SUCCESS** |
| 2 | `002_create_tables.sql` | `BEGIN / COMMIT` | 630 ms | **SUCCESS** |
| 3 | `003_create_indexes.sql` | `BEGIN / COMMIT` | 574 ms | **SUCCESS** |
| 4 | `004_create_rls_and_security.sql` | `BEGIN / COMMIT` | 707 ms | **SUCCESS** |
| 5 | `patches/004_hardening_notify_realtime_event.sql` | `BEGIN / COMMIT` | 531 ms | **SUCCESS** |

**Total Execution Time**: 3,009 ms  
**Failures / Rollbacks**: 0

---

## 3. Actual Created Database Objects Inventory

Post-execution catalog inspection was conducted using direct PostgreSQL system catalog queries (`pg_class`, `information_schema`, `pg_constraint`, `pg_indexes`, `pg_policies`, `pg_proc`, `pg_trigger`).

### A. Tables & Row Level Security Status (11 Tables)

| # | Table Name | Type | RLS Enabled (`relrowsecurity`) | RLS Forced (`relforcerowsecurity`) |
| :-: | :--- | :---: | :---: | :---: |
| 1 | `resto_v2.restaurants` | Base Table | `true` | `true` |
| 2 | `resto_v2.restaurant_settings` | Base Table | `true` | `true` |
| 3 | `resto_v2.restaurant_tables` | Base Table | `true` | `true` |
| 4 | `resto_v2.categories` | Base Table | `true` | `true` |
| 5 | `resto_v2.menu_items` | Base Table | `true` | `true` |
| 6 | `resto_v2.orders` | Base Table | `true` | `true` |
| 7 | `resto_v2.order_items` | Base Table | `true` | `true` |
| 8 | `resto_v2.payments` | Base Table | `true` | `true` |
| 9 | `resto_v2.service_requests` | Base Table | `true` | `true` |
| 10 | `resto_v2.staff` | Base Table | `true` | `true` |
| 11 | `resto_v2.realtime_events` | Base Table | `true` | `true` |

*Verification*: 11 of 11 tables have RLS enabled AND forced. Table owners (e.g., `postgres` role) are strictly bounded by RLS policies.

---

### B. Foreign Key Constraints (16 Foreign Keys)

| # | Constraint Name | Child Table & Column | Parent Table & Column | On Delete Action |
| :-: | :--- | :--- | :--- | :--- |
| 1 | `categories_restaurant_id_fkey` | `categories(restaurant_id)` | `restaurants(id)` | `CASCADE` |
| 2 | `menu_items_category_id_fkey` | `menu_items(category_id)` | `categories(id)` | `SET NULL` |
| 3 | `menu_items_restaurant_id_fkey` | `menu_items(restaurant_id)` | `restaurants(id)` | `CASCADE` |
| 4 | `order_items_menu_item_id_fkey` | `order_items(menu_item_id)` | `menu_items(id)` | `RESTRICT` |
| 5 | `order_items_order_id_fkey` | `order_items(order_id)` | `orders(id)` | `CASCADE` |
| 6 | `orders_restaurant_id_fkey` | `orders(restaurant_id)` | `restaurants(id)` | `CASCADE` |
| 7 | `orders_table_id_fkey` | `orders(table_id)` | `restaurant_tables(id)` | `SET NULL` |
| 8 | `payments_order_id_fkey` | `payments(order_id)` | `orders(id)` | `CASCADE` |
| 9 | `payments_restaurant_id_fkey` | `payments(restaurant_id)` | `restaurants(id)` | `CASCADE` |
| 10 | `realtime_events_restaurant_id_fkey` | `realtime_events(restaurant_id)` | `restaurants(id)` | `CASCADE` |
| 11 | `restaurant_settings_restaurant_id_fkey` | `restaurant_settings(restaurant_id)` | `restaurants(id)` | `CASCADE` |
| 12 | `restaurant_tables_restaurant_id_fkey` | `restaurant_tables(restaurant_id)` | `restaurants(id)` | `CASCADE` |
| 13 | `service_requests_order_id_fkey` | `service_requests(order_id)` | `orders(id)` | `SET NULL` |
| 14 | `service_requests_restaurant_id_fkey` | `service_requests(restaurant_id)` | `restaurants(id)` | `CASCADE` |
| 15 | `service_requests_table_id_fkey` | `service_requests(table_id)` | `restaurant_tables(id)` | `SET NULL` |
| 16 | `staff_restaurant_id_fkey` | `staff(restaurant_id)` | `restaurants(id)` | `CASCADE` |

---

### C. Performance & Query Indexes (20 Custom Indexes)

| # | Index Name | Table | Indexed Columns / Conditions |
| :-: | :--- | :--- | :--- |
| 1 | `idx_v2_restaurants_slug_active` | `restaurants` | `(slug, is_active)` |
| 2 | `idx_v2_tables_restaurant_status` | `restaurant_tables` | `(restaurant_id, status)` |
| 3 | `idx_v2_tables_restaurant_number` | `restaurant_tables` | `(restaurant_id, table_number)` |
| 4 | `idx_v2_categories_restaurant_order` | `categories` | `(restaurant_id, sort_order, is_visible)` |
| 5 | `idx_v2_menu_items_restaurant_available` | `menu_items` | `(restaurant_id, available)` |
| 6 | `idx_v2_menu_items_restaurant_category` | `menu_items` | `(restaurant_id, category_id, sort_order)` |
| 7 | `idx_v2_menu_items_food_type` | `menu_items` | `(restaurant_id, food_type)` |
| 8 | `idx_v2_orders_restaurant_created_at` | `orders` | `(restaurant_id, created_at DESC)` |
| 9 | `idx_v2_orders_restaurant_status` | `orders` | `(restaurant_id, status)` |
| 10 | `idx_v2_orders_restaurant_idempotency` | `orders` | `(restaurant_id, idempotency_key) WHERE idempotency_key <> ''` |
| 11 | `idx_v2_orders_restaurant_table` | `orders` | `(restaurant_id, table_number)` |
| 12 | `idx_v2_orders_tracking_token` | `orders` | `(id, tracking_token_hash) WHERE tracking_token_hash <> ''` |
| 13 | `idx_v2_order_items_order_id` | `order_items` | `(order_id)` |
| 14 | `idx_v2_order_items_menu_item` | `order_items` | `(menu_item_id)` |
| 15 | `idx_v2_payments_restaurant_created_at` | `payments` | `(restaurant_id, created_at DESC)` |
| 16 | `idx_v2_payments_restaurant_order` | `payments` | `(restaurant_id, order_id)` |
| 17 | `idx_v2_service_requests_restaurant_status` | `service_requests` | `(restaurant_id, status, created_at DESC)` |
| 18 | `idx_v2_staff_restaurant_email` | `staff` | `(restaurant_id, email, is_active)` |
| 19 | `idx_v2_realtime_events_restaurant_id` | `realtime_events` | `(restaurant_id, id ASC)` |
| 20 | `idx_v2_realtime_events_entity` | `realtime_events` | `(restaurant_id, entity_type, entity_id)` |

*Total Indexes*: 34 (20 custom performance indexes + 11 primary key indexes + 3 unique constraint indexes).

---

### D. Row Level Security Policies (20 Policies)

| # | Policy Name | Table | Permitted Roles | Command | Policy Expression (`USING` / `WITH CHECK`) |
| :-: | :--- | :--- | :--- | :---: | :--- |
| 1 | `service_role_v2_all` | `restaurants` | `service_role` | `ALL` | `USING (true) WITH CHECK (true)` |
| 2 | `public_read_restaurants` | `restaurants` | `anon, authenticated` | `SELECT` | `is_active = true` |
| 3 | `service_role_v2_all` | `restaurant_settings` | `service_role` | `ALL` | `USING (true) WITH CHECK (true)` |
| 4 | `service_role_v2_all` | `restaurant_tables` | `service_role` | `ALL` | `USING (true) WITH CHECK (true)` |
| 5 | `public_read_tables` | `restaurant_tables` | `anon, authenticated` | `SELECT` | `restaurant_id IN (SELECT id FROM resto_v2.restaurants WHERE is_active = true)` |
| 6 | `service_role_v2_all` | `categories` | `service_role` | `ALL` | `USING (true) WITH CHECK (true)` |
| 7 | `public_read_categories` | `categories` | `anon, authenticated` | `SELECT` | `is_visible = true AND restaurant_id IN (SELECT id FROM resto_v2.restaurants WHERE is_active = true)` |
| 8 | `service_role_v2_all` | `menu_items` | `service_role` | `ALL` | `USING (true) WITH CHECK (true)` |
| 9 | `public_read_menu_items` | `menu_items` | `anon, authenticated` | `SELECT` | `restaurant_id IN (SELECT id FROM resto_v2.restaurants WHERE is_active = true)` |
| 10 | `service_role_v2_all` | `orders` | `service_role` | `ALL` | `USING (true) WITH CHECK (true)` |
| 11 | `orders_service_role_only` | `orders` | `service_role` | `ALL` | `USING (true) WITH CHECK (true)` |
| 12 | `service_role_v2_all` | `order_items` | `service_role` | `ALL` | `USING (true) WITH CHECK (true)` |
| 13 | `order_items_service_role_only` | `order_items` | `service_role` | `ALL` | `USING (true) WITH CHECK (true)` |
| 14 | `service_role_v2_all` | `payments` | `service_role` | `ALL` | `USING (true) WITH CHECK (true)` |
| 15 | `payments_service_role_only` | `payments` | `service_role` | `ALL` | `USING (true) WITH CHECK (true)` |
| 16 | `service_role_v2_all` | `service_requests` | `service_role` | `ALL` | `USING (true) WITH CHECK (true)` |
| 17 | `service_requests_service_role_only` | `service_requests` | `service_role` | `ALL` | `USING (true) WITH CHECK (true)` |
| 18 | `service_role_v2_all` | `staff` | `service_role` | `ALL` | `USING (true) WITH CHECK (true)` |
| 19 | `staff_service_role_only` | `staff` | `service_role` | `ALL` | `USING (true) WITH CHECK (true)` |
| 20 | `service_role_v2_all` | `realtime_events` | `service_role` | `ALL` | `USING (true) WITH CHECK (true)` |

---

### E. Explicit Role Privilege Grants

PostgreSQL evaluates table-level privilege grants prior to evaluating RLS policies. The audit confirmed that:
- `anon` and `authenticated` roles possess **only 8 `SELECT` grants** exclusively on the 4 customer-facing catalog tables:
  - `resto_v2.restaurants` (`SELECT`)
  - `resto_v2.restaurant_tables` (`SELECT`)
  - `resto_v2.categories` (`SELECT`)
  - `resto_v2.menu_items` (`SELECT`)
- **Zero grants** exist for `anon` or `authenticated` on `orders`, `order_items`, `payments`, `service_requests`, `staff`, `restaurant_settings`, or `realtime_events`.
- All operational and mutation capabilities are strictly restricted to `service_role` and `postgres`.

---

### F. Realtime Notification Function & Trigger

- **Function**: `resto_v2.notify_realtime_event()`
- **Trigger**: `trg_notify_realtime_event` (`AFTER INSERT ON resto_v2.realtime_events FOR EACH ROW EXECUTE FUNCTION resto_v2.notify_realtime_event()`)
- **Hardening Patch Verification**:
  ```json
  {
    "proname": "notify_realtime_event",
    "proconfig": ["search_path=pg_catalog, resto_v2"]
  }
  ```
  The function has an explicit, pinned `search_path = pg_catalog, resto_v2` preventing any `search_path` hijacking vulnerability during trigger execution.

---

## 4. Preservation of Existing Systems & Isolation Evidence

| System / Schema | Pre-DDL Count | Post-DDL Count | State |
| :--- | :---: | :---: | :--- |
| `public` Schema | 0 | 0 | **Unchanged**. Zero legacy tables exposed. |
| `auth` Schema | 27 | 27 | **Unchanged**. Supabase Auth completely intact. |
| `storage` Schema | 10 | 10 | **Unchanged**. Supabase Storage completely intact. |
| `resto-media` Bucket | 5 images | 5 images | **Unchanged**. All 5 menu PNGs verified online. |
| `resto_v2` Rows | 0 | 0 | **Empty**. Zero rows inserted; waiting for data import. |
| Render Web Services | Active Django | Active Django | **Unchanged**. Zero Render deployments executed. |
| Frontend / Dashboard | Unchanged | Unchanged | **Unchanged**. Operational traffic intact. |

---

## 5. Automated Regression Test & Build Verification

| Test Suite | Files / Scope | Results | Notes |
| :--- | :--- | :---: | :--- |
| `phase4b4-primary-authorization.test.ts` | Primary authorization fail-closed gate | **PASS (11/11)** | Zero regressions |
| `phase4b3-staging-safety-gate.test.ts` | Staging safety, allowlist, rollback | **PASS (20/20)** | Full migration & rollback cycle verified |
| Full Vitest Test Suite | Cross-instance E2E, Failover, SSE, Idempotency | **PASS (152/152)** | 12 test files clean |
| TypeScript Compiler (`tsc`) | Static typecheck | **PASS (0 errors)** | Zero compilation errors |
| Secret Scanning | Tracked files & git status | **PASS (Clean)** | Zero secrets tracked in git |

---

## 6. Strict Scope Boundaries & Confirmation

- [x] **Zero modifications outside `resto_v2`**: No objects in `public`, `auth`, `storage`, or `extensions` were altered.
- [x] **Zero data imported**: All 11 tables in `resto_v2` currently contain 0 rows.
- [x] **Zero deployment actions**: Render services, frontend, dashboard, and Django remain unchanged.
- [x] **Zero traffic switched**: Production traffic continues serving uninterrupted via existing endpoints.

---

## 7. Next Steps & Explicit Stop Point

Production DDL execution and object verification are complete. The database schema `resto_v2` is fully prepared and isolated.

### Next Action: V1 Production Data Import

To be executed under separate authorization:
- `backend_node/src/scripts/migrate_v1_to_v2.ts` (import 35 V1 records mapped to 36 V2 entities including decimal monetary conversion and password hash preservation).
- `backend_node/src/scripts/reconcile_v1_v2.ts` (full monetary and relational reconciliation).

**CURRENT STATUS: HALTED — AWAITING EXPLICIT USER AUTHORIZATION FOR V1 DATA IMPORT.**
