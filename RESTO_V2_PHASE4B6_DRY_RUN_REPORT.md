# RESTO V2 — Phase 4B.6: Production Dry-Run Verification Report

**Date**: November 4, 2026  
**Branch**: `resto-v2-staging`  
**Target Host**: `aws-1-eu-west-3.pooler.supabase.com:6543`  
**Approved Project Reference**: `zmpthsiiouukjjyrbpnz`  
**Database**: `postgres`  
**Target Schema**: `resto_v2`  
**Execution Type**: **GENUINE READ-ONLY DRY-RUN (ZERO PRODUCTION WRITES)**  
**Verdict**: **DRY-RUN VERIFIED — READY FOR SEPARATE DATA IMPORT AUTHORIZATION**

---

## Executive Summary

Pursuant to Phase 4B.6 requirements, a strictly read-only dry-run preflight was executed against the primary Supabase production database (`zmpthsiiouukjjyrbpnz`). 

The dry-run engine performed:
1. **Production Read-Only Inspection**: Verified that all 11 tables in `resto_v2` currently contain exactly 0 rows. No `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, or `ALTER` statements were issued against production.
2. **In-Memory Validation**: Parsed the canonical V1 backup (`98f14dc81d7db68c4bd884243d887e9787e3a81bdb88b0daf7755266d299a298`), validating all 35 backup records and deriving 1 `restaurant_settings` record.
3. **Integrity & Conflict Checks**: Confirmed **0 duplicate IDs** and **0 orphaned foreign keys**.
4. **Financial Verification**: Reconciled order subtotals, CGST, SGST, GST total, final totals, and payment amounts against historical baselines with **₹0.00 discrepancy**.
5. **Idempotency Guarantee**: Audited `ON CONFLICT` clauses across all 11 tables, confirming rerunning an import cannot duplicate records.
6. **Local Isolated Rehearsal**: Completed a live write-and-reconcile cycle against the local sandbox database `resto_v2_rehearsal`, achieving 100% relational and monetary reconciliation.

---

## 1. Production Database Read-Only Inventory

The live Supabase production database was queried using `SELECT COUNT(*)` on each base table in the `resto_v2` namespace.

```sql
SELECT count(*) FROM resto_v2.<table_name>;
```

### Table State Prior to Data Import

| Table Name | Production Count | Planned Ingestion Count | Expected Post-Import Total |
| :--- | :---: | :---: | :---: |
| `resto_v2.restaurants` | **0** | 1 | 1 |
| `resto_v2.restaurant_settings` | **0** | 1 *(derived)* | 1 |
| `resto_v2.restaurant_tables` | **0** | 8 | 8 |
| `resto_v2.categories` | **0** | 5 | 5 |
| `resto_v2.menu_items` | **0** | 7 | 7 |
| `resto_v2.orders` | **0** | 2 | 2 |
| `resto_v2.order_items` | **0** | 2 | 2 |
| `resto_v2.payments` | **0** | 2 | 2 |
| `resto_v2.service_requests` | **0** | 0 | 0 |
| `resto_v2.staff` | **0** | 1 | 1 |
| `resto_v2.realtime_events` | **0** | 7 | 7 |
| **TOTALS** | **0** | **36** | **36** |

*Evidence: Zero production data modifications occurred during this dry-run.*

---

## 2. In-Memory Graph & Relational Validation

The dry-run preflight validated the full referential graph in memory:

```
[restaurants: rest-olive-ember-01]
   ├── [restaurant_settings: rest-olive-ember-01] (1-to-1)
   ├── [restaurant_tables: 8 tables]
   ├── [categories: 5 categories]
   ├── [menu_items: 7 items] ──> points to categories (5) + restaurant (1)
   ├── [orders: 2 orders] ─────> points to tables (2) + restaurant (1)
   │     └── [order_items: 2 items] ──> points to orders (2) + menu_items (2)
   ├── [payments: 2 payments] ─> points to orders (2) + restaurant (1)
   ├── [staff: 1 member] ──────> points to restaurant (1)
   └── [realtime_events: 7] ───> points to restaurant (1)
```

- **Duplicate Primary Keys**: **0** (All entity IDs across all collections are globally distinct).
- **Orphaned Foreign Keys**: **0** (Every child record references an existing parent).
- **Data Truncation Risks**: None. V2 schema VARCHAR and TEXT lengths accommodate all backup values.

---

## 3. Financial Reconciliation Verification

```
Order 1 (ord-...-66e706): Subtotal ₹395.00 + CGST ₹9.88 + SGST ₹9.87 = ₹414.75 | Payment ₹414.75
Order 2 (ord-...-5c8df5): Subtotal ₹685.00 + CGST ₹17.13 + SGST ₹17.12 = ₹719.25 | Payment ₹719.25
--------------------------------------------------------------------------------------------------
Total:                    Subtotal ₹1,080.00 | CGST ₹27.01 | SGST ₹26.99 | GST ₹54.00 | Total ₹1,134.00
Payments:                 Total Payments Received = ₹1,134.00 | Balance Delta = ₹0.00
```

| Financial Metric | Expected Historical | Planned Ingestion | Variance |
| :--- | :---: | :---: | :---: |
| Subtotal | ₹1,080.00 | ₹1,080.00 | **₹0.00** |
| CGST | ₹27.01 | ₹27.01 | **₹0.00** |
| SGST | ₹26.99 | ₹26.99 | **₹0.00** |
| GST Total | ₹54.00 | ₹54.00 | **₹0.00** |
| Final Total | ₹1,134.00 | ₹1,134.00 | **₹0.00** |
| Total Payments | ₹1,134.00 | ₹1,134.00 | **₹0.00** |

---

## 4. Idempotency & Duplicate Prevention Guarantee

The SQL queries in `migrate_v1_to_v2.ts` enforce the following conflict strategies:

| Table | Conflict Target | Conflict Action | Rerun Impact |
| :--- | :--- | :--- | :--- |
| `restaurants` | `ON CONFLICT (id)` | `DO UPDATE SET ...` | In-place update; no duplicate |
| `restaurant_settings` | `ON CONFLICT (restaurant_id)` | `DO UPDATE SET ...` | In-place update; no duplicate |
| `restaurant_tables` | `ON CONFLICT (id)` | `DO UPDATE SET ...` | In-place update; no duplicate |
| `categories` | `ON CONFLICT (id)` | `DO UPDATE SET ...` | In-place update; no duplicate |
| `menu_items` | `ON CONFLICT (id)` | `DO UPDATE SET ...` | In-place update; no duplicate |
| `orders` | `ON CONFLICT (id)` | `DO UPDATE SET ...` | In-place update; no duplicate |
| `order_items` | `ON CONFLICT (id)` | `DO UPDATE SET ...` | In-place update; no duplicate |
| `payments` | `ON CONFLICT (id)` | `DO UPDATE SET ...` | In-place update; no duplicate |
| `service_requests` | `ON CONFLICT (id)` | `DO UPDATE SET ...` | In-place update; no duplicate |
| `staff` | `ON CONFLICT (id)` | `DO UPDATE SET ...` | In-place update; no duplicate |
| `realtime_events` | `ON CONFLICT (id)` | `DO NOTHING` | Skipped; sequence synced |

**Idempotency Result**: Even if `migrate:data` is rerun multiple times, the row counts will remain strictly at 36 entities without record duplication or constraint violations.

---

## 5. Local Rehearsal End-to-End Execution Results

To verify actual write behavior without touching production, the full migration and reconciliation engine was executed against the local PostgreSQL test database (`resto_v2_rehearsal`):

```json
{
  "migrationSuccess": true,
  "reconciliationSuccess": true,
  "monetaryMatch": true
}
```

- **Inserted Rows in Sandbox**: 36 entities across 10 populated tables.
- **Foreign Key Checks in Sandbox**: 5 / 5 integrity checks passed with 0 orphaned rows.
- **Monetary Differences**: 0 differences. V1 orders = ₹1,134.00 vs V2 orders = ₹1,134.00.

---

## 6. Dry-Run Verdict

**FINAL VERDICT: READY FOR SEPARATE DATA IMPORT AUTHORIZATION**

The dry-run confirms that:
1. Production database schema is pristine and ready.
2. Canonical backup data is 100% valid, consistent, and reconciled.
3. No production writes were executed during this preflight.
4. Execution is halted awaiting explicit authorization for Phase 4B.7 data import.
