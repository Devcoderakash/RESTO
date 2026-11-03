# RESTO V2 — PostgreSQL Database Architecture & Schema Specification

**Document Version:** 1.0.0 (Phase 2 Database Design)  
**Date:** 2026-11-03  
**Database Architect:** Principal PostgreSQL & Supabase Database Engineer  
**Target Schema:** `resto_v2` (Dedicated Isolated PostgreSQL Schema)  
**Target Environment:** Supabase Cloud PostgreSQL 15 (`aws-0-ap-south-1.pooler.supabase.com:6543`, Mumbai)  
**Status:** PHASE 2 APPROVED DATABASE DESIGN

---

## 1. Executive Summary

The V2 database architecture establishes a **clean, isolated, version-controlled PostgreSQL schema (`resto_v2`)** within the existing Supabase project.

### Core Database Safety Rule:
> [!IMPORTANT]
> **ZERO TOUCH ON `public` SCHEMA.**  
> The existing `public` tables remain live and undisturbed. All V2 tables, indexes, constraints, and RLS policies reside strictly within `resto_v2`. The Node.js backend connects using PostgreSQL connection option `search_path=resto_v2`, guaranteeing complete runtime isolation.

---

## 2. Entity-Relationship Architecture (ERD)

```mermaid
erDiagram
    RESTAURANTS ||--o{ RESTAURANT_SETTINGS : configures
    RESTAURANTS ||--o{ RESTAURANT_TABLES : contains
    RESTAURANTS ||--o{ CATEGORIES : organizes
    RESTAURANTS ||--o{ MENU_ITEMS : serves
    RESTAURANTS ||--o{ ORDERS : receives
    RESTAURANTS ||--o{ PAYMENTS : collects
    RESTAURANTS ||--o{ SERVICE_REQUESTS : handles
    RESTAURANTS ||--o{ STAFF : employs
    RESTAURANTS ||--o{ REALTIME_EVENTS : emits

    CATEGORIES ||--o{ MENU_ITEMS : categorizes
    RESTAURANT_TABLES ||--o{ ORDERS : seats
    RESTAURANT_TABLES ||--o{ SERVICE_REQUESTS : pages

    ORDERS ||--|{ ORDER_ITEMS : includes
    ORDERS ||--o{ PAYMENTS : settles
    ORDERS ||--o{ SERVICE_REQUESTS : associates

    MENU_ITEMS ||--o{ ORDER_ITEMS : orders

    RESTAURANTS {
        varchar(64) id PK
        varchar(100) slug UK
        varchar(255) name
        numeric(5,2) tax_percentage
        numeric(5,2) service_charge_percentage
        varchar(10) currency
        varchar(50) timezone
        boolean is_active
    }

    RESTAURANT_TABLES {
        varchar(64) id PK
        varchar(64) restaurant_id FK
        varchar(20) table_number
        int capacity
        varchar(50) zone
        varchar(20) status
    }

    CATEGORIES {
        varchar(64) id PK
        varchar(64) restaurant_id FK
        varchar(100) name
        int sort_order
        boolean is_visible
    }

    MENU_ITEMS {
        varchar(64) id PK
        varchar(64) restaurant_id FK
        varchar(64) category_id FK
        varchar(255) name
        numeric(10,2) price
        varchar(20) food_type
        jsonb addons
        boolean available
    }

    ORDERS {
        varchar(64) id PK
        varchar(50) order_number
        varchar(64) restaurant_id FK
        varchar(64) table_id FK
        varchar(20) table_number
        varchar(100) idempotency_key
        varchar(64) tracking_token_hash
        numeric(10,2) subtotal
        numeric(10,2) gst_total
        numeric(10,2) final_total
        varchar(20) status
        varchar(20) payment_status
    }

    ORDER_ITEMS {
        varchar(64) id PK
        varchar(64) order_id FK
        varchar(64) menu_item_id FK
        varchar(255) item_name
        int quantity
        numeric(10,2) unit_price
        numeric(10,2) total_price
    }

    PAYMENTS {
        varchar(64) id PK
        varchar(64) restaurant_id FK
        varchar(64) order_id FK
        numeric(10,2) amount
        varchar(20) payment_method
        varchar(20) payment_status
        varchar(100) transaction_reference
    }
```

---

## 3. Versioned Database Migration Sequence

All DDL operations are maintained as version-controlled SQL scripts under [`backend_node/migrations/`](file:///Users/akashlodhi/Downloads/RESTO/backend_node/migrations/):

### Migration Index:
1. [`001_create_resto_v2_schema.sql`](file:///Users/akashlodhi/Downloads/RESTO/backend_node/migrations/001_create_resto_v2_schema.sql): Creates schema `resto_v2` and grants role privileges.
2. [`002_create_tables.sql`](file:///Users/akashlodhi/Downloads/RESTO/backend_node/migrations/002_create_tables.sql): Creates all 11 tables with strict constraints, foreign keys, and decimal safety.
3. [`003_create_indexes.sql`](file:///Users/akashlodhi/Downloads/RESTO/backend_node/migrations/003_create_indexes.sql): Establishes 18 query-optimized B-Tree and partial indexes.
4. [`004_create_rls_and_security.sql`](file:///Users/akashlodhi/Downloads/RESTO/backend_node/migrations/004_create_rls_and_security.sql): Enforces Row-Level Security and service_role bypass policies.

---

## 4. Key Architectural Design Choices

### 4.1 Consistent String Primary Keys (`VARCHAR(64)`)
- All primary keys use `VARCHAR(64)` matching existing production conventions:
  - Restaurants: `'rest-olive-ember-01'`
  - Tables: `'tbl-e25df5aa'`
  - Categories: `'cat-starters'`
  - Menu Items: `'item-1'`, `'item-7'`
  - Orders: `'ord-1793716086618-66e706'`
  - Payments: `'pay-1793716086618'`
- **Benefit:** Eliminates UUID conversion failures, preserves existing IDs seamlessly during data migration, and supports human-readable prefixes for debugging.

### 4.2 Flexible Table Identifiers (`VARCHAR(20)`)
- Physical table numbers use `VARCHAR(20)` instead of integer fields.
- **Benefit:** Seamlessly supports padded numbers (`'01'`, `'02'`), outdoor zones (`'Patio-3'`), and bar seating (`'Bar-A'`).

### 4.3 Decimal Monetary Precision (`NUMERIC(10,2)`)
- Floating-point types (`float`, `real`, `double precision`) are strictly forbidden for currency.
- All monetary fields use `NUMERIC(10, 2)`:
  - `subtotal`, `cgst`, `sgst`, `gst_total`, `service_charge`, `final_total`, `amount`, `unit_price`, `total_price`.
- Tax percentages use `NUMERIC(5, 2)` (e.g. `5.00` for 5% GST).
- **Benefit:** Eliminates JavaScript binary floating-point rounding errors (e.g. `0.1 + 0.2 = 0.30000000000000004`).

### 4.4 High-Performance Indexing Strategy
- **Idempotency Partial Index:**
  ```sql
  CREATE INDEX idx_v2_orders_restaurant_idempotency 
      ON resto_v2.orders (restaurant_id, idempotency_key) 
      WHERE idempotency_key <> '';
  ```
  Only indexes non-empty keys, keeping the B-tree compact and sub-millisecond fast.
- **Tracking Token Partial Index:**
  ```sql
  CREATE INDEX idx_v2_orders_tracking_token 
      ON resto_v2.orders (id, tracking_token_hash) 
      WHERE tracking_token_hash <> '';
  ```
  Accelerates customer order tracking queries while preserving security.
- **Composite Table Index:** `(restaurant_id, table_number)` enables instant table validation during order placement.

---

## 5. Row-Level Security (RLS) & Multi-Tenant Design

1. **Schema Lockdown:** All 11 tables enforce `ROW LEVEL SECURITY`.
2. **Backend Service Role Bypass:** The trusted Node.js backend connects using PostgreSQL credentials or service-role privileges that satisfy `service_role_v2_all` policies.
3. **Tenant Scoping:** Every query executed by `backend_node` explicitly includes `WHERE restaurant_id = $1`. Cross-tenant data leakage is architecturally impossible.
