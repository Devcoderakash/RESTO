# RESTO V2 — PHASE 3B: DATA RECONCILIATION REPORT

**Date:** November 3, 2026  
**Auditor:** Principal Data Architect & Financial Systems Auditor  
**Tool:** Automated Reconciliation Engine (`backend_node/src/scripts/reconcile_v1_v2.ts`)  
**V1 Source:** `backend/supabase/backup_v1_production_data.json`  
**V2 Target:** `resto_v2_rehearsal` (`resto_v2` schema) on `localhost:5432`  
**Reconciliation Status:** 100% RECONCILED (Zero Mismatches)  

---

## 1. Executive Summary

A comprehensive, automated data reconciliation was executed comparing the source V1 production backup against the migrated V2 schema. All 10 entity collections, foreign-key constraint relationships, monetary values, GST line items, and binary storage checksums were reconciled.

**Overall Reconciliation Result:** **100% MATCH. ZERO MISSING RECORDS. ZERO MONETARY DRIFT.**

---

## 2. Table-by-Table Row Count & Entity Reconciliation

| Entity Table | V1 Source Count | V2 Migrated Count | Missing IDs | Duplicate / Extra IDs | Reconciliation Status |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `restaurants` | 1 | 1 | 0 | 0 | **PASS (100% Match)** |
| `restaurant_settings` | 1 | 1 | 0 | 0 | **PASS (100% Match)** |
| `restaurant_tables` | 8 | 8 | 0 | 0 | **PASS (100% Match)** |
| `categories` | 5 | 5 | 0 | 0 | **PASS (100% Match)** |
| `menu_items` | 7 | 7 | 0 | 0 | **PASS (100% Match)** |
| `staff` | 1 | 1 | 0 | 0 | **PASS (100% Match)** |
| `orders` | 2 | 2 | 0 | 0 | **PASS (100% Match)** |
| `order_items` | 2 | 2 | 0 | 0 | **PASS (100% Match)** |
| `payments` | 2 | 2 | 0 | 0 | **PASS (100% Match)** |
| `service_requests` | 0 | 0 | 0 | 0 | **PASS (100% Match)** |
| `realtime_events` | 7 | 7 | 0 | 0 | **PASS (100% Match)** |
| **TOTALS** | **36** | **36** | **0** | **0** | **100% MATCH** |

---

## 3. Referential Integrity & Foreign Key Reconciliation

Automated database foreign key traversals verified zero orphaned or broken relationships:

1. **`restaurant_tables -> restaurants`:**
   - Query: `SELECT id FROM resto_v2.restaurant_tables WHERE restaurant_id NOT IN (SELECT id FROM resto_v2.restaurants);`
   - Result: `0 rows` (**PASS**).
2. **`categories -> restaurants`:**
   - Query: `SELECT id FROM resto_v2.categories WHERE restaurant_id NOT IN (SELECT id FROM resto_v2.restaurants);`
   - Result: `0 rows` (**PASS**).
3. **`menu_items -> categories & restaurants`:**
   - Query: `SELECT id FROM resto_v2.menu_items WHERE (category_id IS NOT NULL AND category_id NOT IN (SELECT id FROM resto_v2.categories)) OR restaurant_id NOT IN (SELECT id FROM resto_v2.restaurants);`
   - Result: `0 rows` (**PASS**).
4. **`order_items -> orders & menu_items`:**
   - Query: `SELECT id FROM resto_v2.order_items WHERE order_id NOT IN (SELECT id FROM resto_v2.orders) OR menu_item_id NOT IN (SELECT id FROM resto_v2.menu_items);`
   - Result: `0 rows` (**PASS**).
5. **`payments -> orders & restaurants`:**
   - Query: `SELECT id FROM resto_v2.payments WHERE order_id NOT IN (SELECT id FROM resto_v2.orders) OR restaurant_id NOT IN (SELECT id FROM resto_v2.restaurants);`
   - Result: `0 rows` (**PASS**).

---

## 4. Financial & Tax Line-Item Reconciliation

Monetary precision is critical for production operations. All financial fields were reconciled between the V1 source JSON and the V2 database:

| Financial Metric | V1 Source (INR) | V2 Database (INR) | Delta (INR) | Variance (%) | Reconciled Status |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Orders Subtotal** | ₹1,080.00 | ₹1,080.00 | ₹0.00 | 0.00% | **PASS** |
| **CGST (2.5%)** | ₹27.01 | ₹27.01 | ₹0.00 | 0.00% | **PASS** |
| **SGST (2.5%)** | ₹26.99 | ₹26.99 | ₹0.00 | 0.00% | **PASS** |
| **GST Total (5.0%)** | ₹54.00 | ₹54.00 | ₹0.00 | 0.00% | **PASS** |
| **Orders Final Total** | ₹1,134.00 | ₹1,134.00 | ₹0.00 | 0.00% | **PASS** |
| **Payments Amount Total** | ₹1,134.00 | ₹1,134.00 | ₹0.00 | 0.00% | **PASS** |
| **Order vs Payment Balance** | ₹0.00 | ₹0.00 | ₹0.00 | 0.00% | **BALANCED** |

---

## 5. Binary Storage Media Asset Checksum Reconciliation

All 5 backed-up assets in `backend/supabase/storage_backup/menu-items/` were verified against their cryptographic SHA-256 hashes:

| File Name | Size (Bytes) | SHA-256 Checksum | Integrity Status |
| :--- | :---: | :--- | :---: |
| `0ac6780a7471.png` | 67 B | `bf6e855b67618763d38f0cd8c2ab5ea9aed7b28f4475939f040e4e3ac016bedc` | **VERIFIED** |
| `337cc181d2d2.png` | 67 B | `bf6e855b67618763d38f0cd8c2ab5ea9aed7b28f4475939f040e4e3ac016bedc` | **VERIFIED** |
| `8189843aa34f.png` | 13,057 B | `881ffbcaafc212e49addad08846a5b82761355fa20624253af3477ba33262c5c` | **VERIFIED** |
| `abdf01e3dbe8.png` | 67 B | `bf6e855b67618763d38f0cd8c2ab5ea9aed7b28f4475939f040e4e3ac016bedc` | **VERIFIED** |
| `c365b49e69a4.png` | 67 B | `bf6e855b67618763d38f0cd8c2ab5ea9aed7b28f4475939f040e4e3ac016bedc` | **VERIFIED** |

---

## 6. Reconciliation Conclusion

Zero missing records, zero duplicate IDs, zero foreign key violations, and zero financial discrepancies were detected. All historical V1 production data is intact and preserved in `resto_v2`.

**Final Data Reconciliation Assessment: 100% RECONCILED & APPROVED.**
