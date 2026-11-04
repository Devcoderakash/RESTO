# RESTO V2 — Phase 4B.5 SQL Safety Audit

**Status**: AUDITED & VERIFIED (PASS)  
**Date**: November 4, 2026  
**Auditor**: Senior PostgreSQL Database Reliability Engineer  
**Files Audited**:
- `backend_node/migrations/001_create_resto_v2_schema.sql`
- `backend_node/migrations/002_create_tables.sql`
- `backend_node/migrations/003_create_indexes.sql`
- `backend_node/migrations/004_create_rls_and_security.sql`

---

## 1. Audit Summary & Verdict

| Safety Category | Findings | Status |
| :--- | :--- | :---: |
| **Destructive Commands** | Zero `DROP TABLE`, zero `TRUNCATE`, zero `DELETE`. | **PASS** |
| **Cross-Schema Statements** | Zero commands touching `public`, `auth`, `storage`, or system catalogs. | **PASS** |
| **Schema Qualification** | 100% of objects explicitly prefixed with `resto_v2.`. | **PASS** |
| **Idempotency** | Uses `IF NOT EXISTS`, `OR REPLACE`, and `DROP ... IF EXISTS` safely. | **PASS** |
| **Transaction Isolation** | Every file wrapped in `BEGIN ... COMMIT` blocks. | **PASS** |
| **RLS Enforcement** | `FORCE ROW LEVEL SECURITY` applied to prevent owner bypass. | **PASS** |
| **Overall SQL Safety Verdict** | **APPROVED FOR AUTHORIZED EXECUTION** | **PASS** |

---

## 2. Line-by-Line Migration Audit

### 2.1 Migration 001: Schema Initialization (`001_create_resto_v2_schema.sql`)
- **Lines 7**: `CREATE SCHEMA IF NOT EXISTS resto_v2;`
  - Safe, idempotent, isolated. Does not drop or touch existing schemas.
- **Lines 10-12**: Grants and default privileges:
  - `GRANT USAGE ON SCHEMA resto_v2 TO postgres, anon, authenticated, service_role;`
  - `ALTER DEFAULT PRIVILEGES IN SCHEMA resto_v2 GRANT ALL ON TABLES TO postgres, service_role;`
  - `ALTER DEFAULT PRIVILEGES IN SCHEMA resto_v2 GRANT ALL ON SEQUENCES TO postgres, service_role;`
  - Scoped exclusively to `IN SCHEMA resto_v2`. Grants zero privileges outside `resto_v2`.

### 2.2 Migration 002: Entity Schemas & Constraints (`002_create_tables.sql`)
- Audited all 11 `CREATE TABLE IF NOT EXISTS resto_v2.<table_name>` statements.
- **Data Types & Precision**:
  - All monetary values (`tax_percentage`, `price`, `subtotal`, `cgst`, `sgst`, `gst_total`, `final_total`, `amount`) strictly use `NUMERIC(10,2)` or `NUMERIC(5,2)` with `CHECK (col >= 0)`. Zero floating-point rounding hazards.
- **Relational Integrity**:
  - Foreign keys explicitly declare `ON DELETE CASCADE` or `ON DELETE SET NULL`.
  - Item references in `order_items` declare `ON DELETE RESTRICT` to prevent accidental deletion of historical menu items.
- **Tenant & Entity Uniqueness**:
  - Unique constraint `uq_v2_restaurant_table_number` on `(restaurant_id, table_number)`.
  - Unique constraint `uq_v2_restaurant_category_name` on `(restaurant_id, name)`.
  - Unique constraint on `restaurants(slug)`.

### 2.3 Migration 003: Performance Indexes (`003_create_indexes.sql`)
- Audited all 20 index statements:
  - 100% use `CREATE INDEX IF NOT EXISTS ... ON resto_v2.<table_name>`.
  - High-traffic queries optimized with composite indexes (`(restaurant_id, status)`, `(restaurant_id, created_at DESC)`).
  - Partial indexes used for sparse fields (`WHERE idempotency_key <> ''`, `WHERE tracking_token_hash <> ''`), saving memory and reducing write amplification.

### 2.4 Migration 004: Row Level Security & Functions (`004_create_rls_and_security.sql`)
- **RLS Configuration**:
  - Uses dynamic PL/pgSQL loops to enable and force RLS on all 11 tables.
  - `FORCE ROW LEVEL SECURITY` prevents the table owner (e.g. `postgres`) from accidentally executing queries that bypass tenant filtering.
- **Policy Scoping**:
  - `DROP POLICY IF EXISTS service_role_v2_all ON resto_v2.%I;` ensures clean re-apply without errors.
  - Public read policies are strictly restricted to catalog data with `is_active = true` or `is_visible = true`.
  - Operational tables (`orders`, `payments`, `staff`, etc.) are locked exclusively to `service_role`.
- **Realtime Trigger & Function**:
  - `resto_v2.notify_realtime_event()` is defined with `LANGUAGE plpgsql`.
  - Includes an explicit payload length check:
    ```sql
    IF length(notification_payload::text) > 7500 THEN
        -- Emits compact reference to avoid exceeding PostgreSQL 8000-byte limit
    ```
  - Emits notification to channel `'resto_v2_realtime_channel'`.
  - Idempotent: `DROP TRIGGER IF EXISTS trg_notify_realtime_event ON resto_v2.realtime_events;` followed by `CREATE TRIGGER`.

---

## 3. Destructive & Cross-Schema Inspection Report

| Statement Type Checked | Instances Found | Safety Assessment |
| :--- | :---: | :--- |
| `DROP SCHEMA` | 0 | None present. |
| `DROP TABLE` | 0 | None present. |
| `TRUNCATE` | 0 | None present. |
| `DELETE FROM` | 0 | None present. |
| `ALTER TABLE ... DROP COLUMN` | 0 | None present. |
| Cross-schema references to `public` | 0 | Confirmed zero references. |
| Cross-schema references to `auth` | 0 | Confirmed zero references. |
| Cross-schema references to `storage` | 0 | Confirmed zero references. |
| Internal `DROP POLICY IF EXISTS` | 11 | Safe: Scoped to `resto_v2` tables for idempotent policy re-creation. |
| Internal `DROP TRIGGER IF EXISTS` | 1 | Safe: Scoped to `resto_v2.realtime_events` for idempotent trigger re-creation. |

---

## 4. Safety Audit Conclusion

The SQL migration files meet all standards for non-destructive, isolated schema deployment on enterprise PostgreSQL databases. They will create `resto_v2` without modifying any other part of the Supabase instance.
