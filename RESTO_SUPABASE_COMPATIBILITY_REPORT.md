# RESTO — Supabase PostgreSQL Database Compatibility & Schema Parity Report

**Document Version:** 1.0.0 (Forensic Technical Audit)  
**Date:** 2026-11-03  
**Auditor:** PostgreSQL Database Architect & Senior Data Systems Engineer  
**Permanent Source of Truth:** Supabase Cloud PostgreSQL 15 (`aws-0-ap-south-1.pooler.supabase.com:6543`, Mumbai)  
**Target Schemas Compared:**
1. Live Production PostgreSQL Schema ([`backend/supabase/production_migration/01_schema.sql`](file:///Users/akashlodhi/Downloads/RESTO/backend/supabase/production_migration/01_schema.sql))
2. Django ORM Models ([`backend/apps/*/models.py`](file:///Users/akashlodhi/Downloads/RESTO/backend/apps/))
3. Express Expected Schema ([`backend_express_backup/supabase/migrations/202610310001_initial_schema.sql`](file:///Users/akashlodhi/Downloads/RESTO/backend_express_backup/supabase/migrations/202610310001_initial_schema.sql))  
**Operational Status:** READ-ONLY FORENSIC AUDIT (Zero modifications to source code or schemas).

---

## 1. Executive Summary

Supabase PostgreSQL 15 is the single, permanent source of truth for all restaurant entities, customer orders, floor tables, payment audits, and real-time events.

A rigorous forensic comparison reveals a **fundamental architectural and schema rift between the production database and what the Express backup expects**:

- **Django Backend:** **100% Schema Parity.** Django's models, querysets, transactions, and serializers match the production Supabase PostgreSQL tables down to exact column types, primary key conventions, foreign key constraints, and precision.
- **Express Backend:** **Severe Schema Incompatibility.** Express was developed against a legacy prototype schema (`202610310001_initial_schema.sql`). It expects native PostgreSQL `UUID` primary keys and integer table numbers, whereas the production database uses `VARCHAR(64)` primary keys and `VARCHAR(20)` table numbers. Furthermore, Express queries columns that **do not exist** in production (such as `categories.active` and `staff.user_id`).

> [!CAUTION]
> If the Express backend were connected to the production database today, **all critical queries and mutations would fail with PostgreSQL type errors and missing column exceptions**. Express would immediately fall back to its volatile in-memory `localStore`, resulting in total divergence from production data.

---

## 2. Table-by-Table Schema & Type Comparison

### 2.1 `public.restaurants`
| Attribute | Production Supabase Database | Django ORM (`apps.restaurants`) | Express Backup Expectation | Compatibility Assessment |
|---|---|---|---|---|
| **Primary Key (`id`)** | `VARCHAR(64)` | `CharField(max_length=64)` | `UUID` (`gen_random_uuid()`) | **Collision:** Express fails when passing strings like `'rest-olive-ember-01'` to UUID filters. |
| **`slug`** | `VARCHAR(100)` UNIQUE | `SlugField(max_length=100)` | `TEXT` UNIQUE | Compatible |
| **`tax_percentage`** | `NUMERIC(5,2)` | `DecimalField(max_digits=5, decimal_places=2)` | `NUMERIC(5,2)` | Compatible |
| **`opening_hours`** | `JSONB` | `JSONField` | `JSONB` | Compatible |

### 2.2 `public.restaurant_tables`
| Attribute | Production Supabase Database | Django ORM (`apps.tables`) | Express Backup Expectation | Compatibility Assessment |
|---|---|---|---|---|
| **Primary Key (`id`)** | `VARCHAR(64)` | `CharField(max_length=64)` | `UUID` | **Collision:** Express fails on VARCHAR IDs (`tbl-e25df5aa`). |
| **`table_number`** | `VARCHAR(20)` (supports `'01'`, `'14'`, `'Patio-1'`) | `CharField(max_length=20)` | `INTEGER` (`check table_number > 0`) | **FATAL COLLISION:** Express schema rejects alphanumeric table strings; throws PostgreSQL casting errors. |
| **`status`** | `VARCHAR(20)` ('available', 'occupied', 'inactive', 'reserved') | `CharField(max_length=20)` | `VARCHAR(20)` | Compatible |

### 2.3 `public.categories`
| Attribute | Production Supabase Database | Django ORM (`apps.menu`) | Express Backup Expectation | Compatibility Assessment |
|---|---|---|---|---|
| **Primary Key (`id`)** | `VARCHAR(64)` | `CharField(max_length=64)` | `UUID` | **Collision** |
| **`sort_order`** | `INTEGER` | `IntegerField` | `INTEGER` | Compatible |
| **`is_visible`** | `BOOLEAN` | `BooleanField` | `BOOLEAN` | Compatible |
| **`active`** | **DOES NOT EXIST** | N/A | **Queries `.eq("active", true)`** (Line 51 of `public.ts`) | **FATAL CRASH:** Express queries fail with `column categories.active does not exist`. |

### 2.4 `public.menu_items`
| Attribute | Production Supabase Database | Django ORM (`apps.menu`) | Express Backup Expectation | Compatibility Assessment |
|---|---|---|---|---|
| **Primary Key (`id`)** | `VARCHAR(64)` | `CharField(max_length=64)` | `UUID` | **Collision** |
| **`category_id`** | `VARCHAR(64)` FK | `ForeignKey(Category)` | `UUID` FK | **Collision** |
| **`price`** | `NUMERIC(10,2)` | `DecimalField(max_digits=10, decimal_places=2)` | `NUMERIC(10,2)` | Compatible |
| **`food_type`** | `VARCHAR(20)` ('veg', 'non_veg') | `CharField(max_length=20)` | `TEXT` | Compatible |
| **`addons`** | `JSONB` | `JSONField` | `JSONB` | Compatible |

### 2.5 `public.orders`
| Attribute | Production Supabase Database | Django ORM (`apps.orders`) | Express Backup Expectation | Compatibility Assessment |
|---|---|---|---|---|
| **Primary Key (`id`)** | `VARCHAR(64)` | `CharField(max_length=64)` | `UUID` | **Collision** |
| **`table_id`** | `VARCHAR(64)` FK | `ForeignKey(RestaurantTable)` | `UUID` FK | **Collision** |
| **`table_number`** | `VARCHAR(20)` | `CharField(max_length=20)` | `INTEGER` | **Collision** |
| **`status` Choices** | `'new'`, `'accepted'`, `'preparing'`, `'ready'`, `'served'`, `'completed'`, `'cancelled'` | Exact match (`Order.STATUS_CHOICES`) | `'pending'`, `'confirmed'`, `'preparing'`, `'ready'`, `'served'`, `'completed'`, `'cancelled'` | **STATUS MISMATCH:** Express uses `'pending'`/`'confirmed'`; production DB uses `'new'`/`'accepted'`. |
| **`idempotency_key`** | `VARCHAR(100)` | `CharField(max_length=100)` | `TEXT` | Compatible |
| **`tracking_token_hash`** | `VARCHAR(64)` | `CharField(max_length=64)` | `TEXT` | Compatible |

### 2.6 `public.order_items`
| Attribute | Production Supabase Database | Django ORM (`apps.orders`) | Express Backup Expectation | Compatibility Assessment |
|---|---|---|---|---|
| **Primary Key (`id`)** | `VARCHAR(64)` | `CharField(max_length=64)` | `UUID` | **Collision** |
| **`order_id`** | `VARCHAR(64)` FK | `ForeignKey(Order)` | `UUID` FK | **Collision** |
| **`menu_item_id`** | `VARCHAR(64)` FK | `ForeignKey(MenuItem)` | `UUID` FK | **Collision** |
| **`unit_price`** | `NUMERIC(10,2)` | `DecimalField` | `NUMERIC(10,2)` | Compatible |

### 2.7 `public.staff`
| Attribute | Production Supabase Database | Django ORM (`apps.dashboard`) | Express Backup Expectation | Compatibility Assessment |
|---|---|---|---|---|
| **Primary Key (`id`)** | `VARCHAR(64)` | `CharField(max_length=64)` | `UUID` | **Collision** |
| **`user_id`** | **DOES NOT EXIST** | N/A (Staff is standalone entity with username/password hash) | **`UUID references auth.users(id)`** | **FATAL CRASH:** Express executes `.eq("user_id", user.id)` which immediately fails in PostgreSQL. |
| **`full_name`** | **DOES NOT EXIST** (`first_name`, `last_name`) | `first_name`, `last_name` | `TEXT full_name` | Column missing |
| **`is_active`** | `BOOLEAN` | `BooleanField` | `is_active` / `active` | Inconsistent |

### 2.8 `public.realtime_events`
| Attribute | Production Supabase Database | Django ORM (`apps.realtime`) | Express Backup Expectation | Compatibility Assessment |
|---|---|---|---|---|
| **Primary Key (`id`)** | `BIGINT GENERATED ALWAYS AS IDENTITY` | `BigAutoField(primary_key=True)` | **TABLE UNKNOWN TO EXPRESS** | Express has zero awareness of `realtime_events` table. |
| **`restaurant_id`** | `VARCHAR(64)` | `ForeignKey(Restaurant)` | N/A | No writes occur from Express |

---

## 3. Stored Procedure & RPC Function Incompatibility

The Express backend relies heavily on calling stored functions in PostgreSQL via `adminSupabase.rpc(...)`.

In `202610310001_initial_schema.sql`, these functions were defined as:
```sql
CREATE OR REPLACE FUNCTION public.create_order(
    p_restaurant_id uuid,
    p_table_number integer,
    p_customer_name text,
    ...
)
```

However, in the production database:
1. `p_restaurant_id` cannot be a `UUID` because production restaurant IDs are strings like `'rest-olive-ember-01'`.
2. `p_table_number` cannot be an `INTEGER` because table numbers are strings like `'01'`.
3. If Express calls `rpc("create_order")`, PostgreSQL raises:
   `ERROR: function create_order(character varying, character varying, ...) does not exist`.

---

## 4. Database Compatibility Verdict

| Requirement | Django Backend | Express Backend |
|---|---|---|
| **Can connect to production PostgreSQL without schema changes?** | **YES (Currently Live)** | **NO (Immediate Crashes)** |
| **Preserves existing production data intact?** | **YES (Zero data loss)** | **NO (Would require wiping or modifying tables)** |
| **Primary Key compatibility (`VARCHAR` vs `UUID`)** | **100% Match** | **0% Match (Incompatible)** |
| **Staff & User auth model compatibility** | **100% Match** | **0% Match (Assumes missing `auth.users` join)** |
| **RPC functions compatibility** | **N/A (Uses Django ORM transactions)** | **0% Match (Type signature collisions)** |

**Conclusion:** Express CANNOT use the existing production database without breaking existing data or rewriting large portions of the database schema.

