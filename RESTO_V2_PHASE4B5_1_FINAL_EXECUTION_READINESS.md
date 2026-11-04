# RESTO V2 — Phase 4B.5.1 Final Production DDL Readiness Verification

**Document Version**: 1.0.0  
**Date**: November 4, 2026  
**Auditor**: Principal Database Architect & Security Auditor  
**Branch**: `resto-v2-staging`  
**Base Commit**: `b0f327f`  
**Approved Project Reference**: `zmpthsiiouukjjyrbpnz`  
**Approved Project URL**: `https://zmpthsiiouukjjyrbpnz.supabase.co`  
**Target Schema**: `resto_v2`  
**Production DDL Execution State**: NOT EXECUTED (STOP CONDITION ENFORCED)  

---

## 1. Executive Summary & Verification Matrix

In strict accordance with Phase 4B.5.1 safety protocols, an exhaustive verification was conducted across all four required readiness domains. 

| Verification Domain | Result | Status | Summary of Evidence |
| :--- | :---: | :---: | :--- |
| **1. Authenticated PostgreSQL Identity** | **FAIL** | **BLOCKING** | Direct authenticated connection to cloud PostgreSQL `zmpthsiiouukjjyrbpnz` cannot be established from the local environment because the PostgreSQL database user password is not stored locally. The Supabase `service_role` key is an HTTP API JWT and is rejected by the PostgreSQL wire protocol (`password authentication failed for user "postgres"`). TCP sockets are open, but per strict rules, TCP is not a substitute for authenticated sessions. |
| **2. Backup Count Reconciliation** | **PASS** | **VERIFIED** | Explained exact reconciliation: V1 backup has 35 records; V2 rehearsal baseline has 36 records. The 36th record is the 1-to-1 derived `resto_v2.restaurant_settings` entity split from `restaurants`. Zero original V1 records missing; zero duplicated. Canonical backup SHA-256 confirmed. |
| **3. SQL Security Audit** | **PASS** | **VERIFIED** | All 4 migration files reinspected. RLS enabled and forced on all 11 tables. Operational tables completely inaccessible to anonymous/authenticated roles. Zero dynamic SQL with external inputs. Zero side effects on `public`, `auth`, or `storage`. Documented minor best-practice finding regarding trigger function `search_path`. |
| **4. Migration Execution Readiness** | **PASS** | **VERIFIED** | Atomic transactions per file (`BEGIN ... COMMIT`) confirmed. Rollback is atomic per file on failure. Migrations are idempotent (`IF NOT EXISTS`). Destructive rollback is permanently hard-blocked against primary target in code. Fail-closed target validation active. |
| **5. Full Test Suite & Typecheck** | **PASS** | **VERIFIED** | 152 / 152 tests passed across 12 test files (`vitest run --fileParallelism=false`). TypeScript compilation clean with 0 errors (`tsc --noEmit`). |

---

## 2. Check 1: Authenticated PostgreSQL Identity

### 2.1 Direct Cloud Connection Attempt Evidence
Direct TCP connectivity to Supabase cloud endpoints (`aws-0-ap-south-1.pooler.supabase.com:6543` and `db.zmpthsiiouukjjyrbpnz.supabase.co:5432`) is active and reachable.

However, an authenticated PostgreSQL wire-protocol session could not be established from the local environment:
- **Test Command**: Attempted authenticated PostgreSQL handshake using local environment credentials (`SUPABASE_SERVICE_ROLE_KEY` against user `postgres` and `postgres.zmpthsiiouukjjyrbpnz`).
- **Direct Session Endpoint (`port 5432`)**:
  ```text
  Authentication result: password authentication failed for user "postgres"
  ```
- **Transaction Pooler Endpoint (`port 6543`)**:
  ```text
  Authentication result: (ENOTFOUND) tenant/user postgres.zmpthsiiouukjjyrbpnz not found
  ```
- **Technical Root Cause**:
  In Supabase architecture, the `SUPABASE_SERVICE_ROLE_KEY` is an HMAC-SHA256 JWT used exclusively for HTTP APIs (`/rest/v1`, `/auth/v1`, `/storage/v1`). It is **not** a valid PostgreSQL database user password for libpq/pg wire protocol connections. The actual PostgreSQL database password was configured directly into Render Dashboard environment variables during production deployment and is not stored in plain text anywhere in the local repository.
- **Strict Compliance Evaluation**:
  The user instruction explicitly specifies:
  > *"If an authenticated connection cannot be established, report FAIL. Do not substitute TCP connectivity or PostgREST URL checks for this verification."*
- **Check 1 Verdict**: **FAIL (BLOCKING ISSUE)**

### 2.2 Local Rehearsal Database Query Evidence
To demonstrate the exact diagnostic query contract specified in the prompt, the query was executed against the local rehearsal database (`resto_v2_rehearsal`):
```sql
SELECT
    current_database(),
    current_user,
    inet_server_addr(),
    inet_server_port(),
    version();

SELECT
    current_setting('search_path') as search_path,
    current_schema();
```
**Execution Output**:
```json
{
  "current_database": "resto_v2_rehearsal",
  "current_user": "akashlodhi",
  "inet_server_addr": "::1",
  "inet_server_port": 5432,
  "version": "PostgreSQL 16.15 (Homebrew) on aarch64-apple-darwin27.0.0, compiled by Apple clang version 21.0.0 (clang-2100.3.34.2), 64-bit",
  "search_path": "\"$user\", public",
  "current_schema": "public"
}
```

---

## 3. Check 2: Backup Count Reconciliation (35 vs. 36 Records)

### 3.1 Reconciliation Breakdown

The difference between the 35 original V1 records and the 36 V2 rehearsal baseline records is accounted for by the introduction of the normalized 1-to-1 table `resto_v2.restaurant_settings`:

| Entity / Table | V1 Source Table | V1 Count | V2 Target Table | V2 Count | Delta | Reconciliation Explanation |
| :--- | :--- | :---: | :--- | :---: | :---: | :--- |
| **Restaurants** | `public.restaurants` | 1 | `resto_v2.restaurants` | 1 | 0 | Root restaurant entity (`olive-and-ember`) preserved exactly. |
| **Restaurant Settings** | *(Embedded in V1)* | **0** | `resto_v2.restaurant_settings` | **1** | **+1** | **Derived 1-to-1 Record**: V2 architecture separates restaurant feature flags (`auto_accept_orders`, `enable_waiter_call`, `enable_bill_request`, `allow_custom_notes`, `order_notification_sound`) into an isolated settings table. Populated during migration line 148 of `migrate_v1_to_v2.ts`. |
| **Restaurant Tables** | `public.restaurant_tables` | 8 | `resto_v2.restaurant_tables` | 8 | 0 | All 8 tables (capacity, numbers, status) preserved exactly. |
| **Categories** | `public.categories` | 5 | `resto_v2.categories` | 5 | 0 | All 5 menu categories preserved exactly. |
| **Menu Items** | `public.menu_items` | 7 | `resto_v2.menu_items` | 7 | 0 | All 7 dishes preserved exactly. |
| **Orders** | `public.orders` | 2 | `resto_v2.orders` | 2 | 0 | Both historical orders preserved with exact timestamps. |
| **Order Items** | `public.order_items` | 2 | `resto_v2.order_items` | 2 | 0 | Both relational line items preserved. |
| **Payments** | `public.payments` | 2 | `resto_v2.payments` | 2 | 0 | Both payments preserved (₹1,134.00 total). |
| **Service Requests** | `public.service_requests` | 0 | `resto_v2.service_requests` | 0 | 0 | 0 records in V1; 0 records in V2 baseline. |
| **Staff Users** | `public.staff` | 1 | `resto_v2.staff` | 1 | 0 | Manager staff record preserved. |
| **Realtime Events** | `public.realtime_events` | 7 | `resto_v2.realtime_events` | 7 | 0 | All 7 historical audit events preserved. |
| **TOTALS** | **10 Tables** | **35** | **11 Tables** | **36** | **+1** | **Exact 1-record architectural derivation verified.** |

### 3.2 Canonical Backup Checksum Re-Verification
- **Canonical File**: `backend/supabase/backup_v1_production_data.json`
- **Computed SHA-256**: `98f14dc81d7db68c4bd884243d887e9787e3a81bdb88b0daf7755266d299a298`
- **Expected SHA-256**: `98f14dc81d7db68c4bd884243d887e9787e3a81bdb88b0daf7755266d299a298`
- **Status**: **100% IDENTICAL (PASS)**

---

## 4. Check 3: SQL Security Audit

Reinspection of migrations `001_create_resto_v2_schema.sql` through `004_create_rls_and_security.sql`:

### 4.1 Schema Creation & Ownership
- `CREATE SCHEMA IF NOT EXISTS resto_v2;`
- Execution runs as table owner (`postgres`).
- Default privileges set via `ALTER DEFAULT PRIVILEGES IN SCHEMA resto_v2 GRANT ALL ON TABLES/SEQUENCES TO postgres, service_role`.

### 4.2 Row Level Security (RLS) Enforcement
- All 11 tables explicitly execute:
  - `ALTER TABLE resto_v2.%I ENABLE ROW LEVEL SECURITY;`
  - `ALTER TABLE resto_v2.%I FORCE ROW LEVEL SECURITY;`
- `FORCE ROW LEVEL SECURITY` guarantees that table owners (including `postgres`) cannot inadvertently bypass tenant row filters.

### 4.3 Service Role Privileges & Policies
- All 11 tables have dedicated policies:
  ```sql
  CREATE POLICY service_role_v2_all ON resto_v2.%I
  FOR ALL TO service_role USING (true) WITH CHECK (true);
  ```
- `service_role` has explicit `GRANT ALL ON ALL TABLES IN SCHEMA resto_v2`.
- Confirmed: The backend Node.js service connecting under `service_role` has full read/write operational access across all 11 tables.

### 4.4 Anonymous Catalog Read Policies
- `anon` and `authenticated` roles can ONLY execute `SELECT` on:
  - `resto_v2.restaurants` (`USING (is_active = true)`)
  - `resto_v2.restaurant_tables` (`USING (restaurant_id IN (SELECT id FROM resto_v2.restaurants WHERE is_active = true))`)
  - `resto_v2.categories` (`USING (is_visible = true AND restaurant_id IN (...))`)
  - `resto_v2.menu_items` (`USING (restaurant_id IN (...))`)
- Customer catalog queries expose active, visible records only. Inactive dishes or deactivated restaurants are completely shielded.

### 4.5 Protection of Operational Tables
- Tables `orders`, `order_items`, `payments`, `service_requests`, `staff`, `restaurant_settings`, and `realtime_events`:
  - **Zero table privileges** are granted to `anon` or `authenticated`.
  - Explicit lockdown policies (`orders_service_role_only`, etc.) restrict all operations to `service_role`.
  - Double security layer: Table-level PostgreSQL DAC (Discretionary Access Control) blocks access before RLS is even evaluated.

### 4.6 Trigger Function Security & search_path
- Function: `resto_v2.notify_realtime_event()`
- **Audit Finding (Observation)**:
  - The function is defined as `LANGUAGE plpgsql` without an explicit `SET search_path = resto_v2, pg_temp;`.
  - *Risk Assessment*: Because `realtime_events` is strictly locked to `service_role`, unprivileged actors cannot invoke this trigger or hijack the search path. However, in accordance with defense-in-depth best practices, defining explicit `SET search_path` is recommended for future hardening.

### 4.7 Cross-Schema & Destructive Statement Review
- Zero modifications to `public`, `auth`, `storage`, `graphql_public`, or PostgreSQL extensions.
- Zero `DROP TABLE`, `TRUNCATE`, or `DELETE` statements.
- Dynamic SQL is restricted to hardcoded table arrays for RLS loops using `%I` identifier quoting.

---

## 5. Check 4: Migration Execution Readiness

| Criteria | Verification Finding | Status |
| :--- | :--- | :---: |
| **Transaction Boundaries** | Each migration script is wrapped in `BEGIN ... COMMIT`. | PASS |
| **Partial Failure Safety** | If a statement fails, immediate `ROLLBACK` executes; zero dirty state. | PASS |
| **Idempotency** | Uses `IF NOT EXISTS` on schema, tables, indexes; `OR REPLACE` on function; `DROP IF EXISTS` on trigger and internal policies. | PASS |
| **Destructive Rollback Protection** | `validateRollbackAuthorization` permanently throws a fatal error if target is `zmpthsiiouukjjyrbpnz`. | PASS |
| **Primary Authorization Guard** | Startup and migration runners strictly require `ALLOW_RESTO_V2_PRIMARY_TARGET=true` and `RESTO_V2_PRIMARY_PROJECT_REF=zmpthsiiouukjjyrbpnz`. | PASS |
| **Target Project Reference** | Exactly matches `zmpthsiiouukjjyrbpnz`. Unapproved project `krsdjcxgfnlsstjwuqlj` remains blocked. | PASS |

---

## 6. Automated Verification Test Suite

The full automated test suite was executed sequentially with typechecking:
- **TypeScript Compilation**: `npm run typecheck` $\rightarrow$ **0 ERRORS**
- **Test Runner**: Vitest 3.2.7 (`vitest run --fileParallelism=false`)
- **Total Test Files**: 12 / 12 passed
- **Total Unit & Integration Tests**: 152 / 152 passed
- **Execution Duration**: 14.63s

---

## 7. Final Phase 4B.5.1 Readiness Verdict

### Status: NOT READY — LIST BLOCKING ISSUES

Production DDL execution is paused. The following blocking issue must be resolved before executing Step 5:

### Blocking Issue #1: Authenticated PostgreSQL Database Password Required
- **Description**: While Supabase HTTP APIs (PostgREST, Auth, Storage) are accessible via the `service_role` JWT, PostgreSQL wire protocol connections (Port 6543 / 5432) require the actual PostgreSQL database user password.
- **Remediation**:
  To execute Step 5, the user must provide or export the primary database connection string in the runtime environment:
  ```bash
  export DATABASE_URL="postgresql://postgres.zmpthsiiouukjjyrbpnz:[DB_PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require"
  export ALLOW_RESTO_V2_PRIMARY_TARGET=true
  export RESTO_V2_PRIMARY_PROJECT_REF=zmpthsiiouukjjyrbpnz
  ```
  Once supplied, an authenticated session can run the diagnostic query, verify PostgreSQL version/identity, and apply the reviewed DDL.

---

### Strict Safety Affirmations
- Production DDL executed: **NO**
- V1 data imported: **NO**
- Storage bucket or files modified: **NO**
- Supabase Auth modified: **NO**
- Render services deployed: **NO**
- Django modified: **NO**
- Traffic switched: **NO**

Awaiting user direction and credentials.
