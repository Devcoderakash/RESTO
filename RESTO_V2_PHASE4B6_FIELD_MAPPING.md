# RESTO V2 — Phase 4B.6: Canonical V1 to V2 Field Mapping Specification

**Date**: November 4, 2026  
**Source**: `backend/supabase/backup_v1_production_data.json` (SHA-256: `98f14dc81d7db68c4bd884243d887e9787e3a81bdb88b0daf7755266d299a298`)  
**Target Schema**: `resto_v2` (PostgreSQL 17.11)  
**Total Source Records**: 35  
**Total Target Entities**: 36 (including 1-to-1 normalized `restaurant_settings`)

---

## Overview & Conversion Principles

1. **Primary Key Preservation**: All VARCHAR IDs (e.g. `rest-olive-ember-01`, `tbl-02d81c32`, `ord-1793716086618-66e706`) are preserved exactly as string primary keys.
2. **Monetary Precision**: All currency and tax values are converted from floating-point or integer representations into exact PostgreSQL `NUMERIC(10, 2)` types, eliminating binary floating-point roundoff errors.
3. **Temporal Precision**: All ISO 8601 timestamp strings are parsed and stored as PostgreSQL `TIMESTAMPTZ` with microsecond accuracy.
4. **JSON Normalization**: All JSON configurations, dietary tags, allergens, addons, and status timelines are converted from JSON text/arrays into native PostgreSQL `JSONB`.
5. **Idempotency Strategy**: Upserts are strictly defined using `ON CONFLICT (id) DO UPDATE` for base tables, `ON CONFLICT (restaurant_id) DO UPDATE` for settings, and `ON CONFLICT (id) DO NOTHING` for immutable audit logs.

---

## 1. Table: `restaurants` & `restaurant_settings`

### A. `resto_v2.restaurants`
- **Source Collection**: `backupData.restaurants` (1 record)
- **Primary Key**: `id` (`rest-olive-ember-01`)
- **Conflict Rule**: `ON CONFLICT (id) DO UPDATE`

| V1 Backup Field | V1 Data Type | V2 Target Column | V2 Target Data Type | Transformation & Validation Rules |
| :--- | :--- | :--- | :--- | :--- |
| `id` | string | `id` | `VARCHAR(64)` | Preserved exactly (`rest-olive-ember-01`) |
| `name` | string | `name` | `VARCHAR(255)` | Preserved verbatim (`The Olive & Ember`) |
| `slug` | string | `slug` | `VARCHAR(100)` | Unique slug (`olive-and-ember`) |
| `description` | string | `description` | `TEXT` | Default empty string if null |
| `address` | string | `address` | `TEXT` | Default empty string if null |
| `phone` | string | `phone` | `VARCHAR(50)` | Default empty string if null |
| `email` | string | `email` | `VARCHAR(254)` | Default empty string if null |
| `logo_url` | string | `logo_url` | `VARCHAR(500)` | Preserved Unsplash / CDN URL |
| `opening_hours` | object | `opening_hours` | `JSONB` | Serialized to JSONB (default `{}`) |
| `wifi_ssid` | string | `wifi_ssid` | `VARCHAR(100)` | Default empty string if null |
| `wifi_password` | string | `wifi_password` | `VARCHAR(100)` | Default empty string if null |
| `tax_percentage` | number | `tax_percentage` | `NUMERIC(5, 2)` | Parsed to decimal (`5.00`) |
| `service_charge_percentage` | number | `service_charge_percentage` | `NUMERIC(5, 2)` | Parsed to decimal (`0.00`) |
| `currency` | string | `currency` | `VARCHAR(10)` | Default `'INR'` |
| `timezone` | string | `timezone` | `VARCHAR(50)` | Default `'Asia/Kolkata'` |
| `is_active` | boolean | `is_active` | `BOOLEAN` | Default `true` |
| `created_at` | string (ISO) | `created_at` | `TIMESTAMPTZ` | Preserved ISO timestamp |
| `updated_at` | string (ISO) | `updated_at` | `TIMESTAMPTZ` | Preserved ISO timestamp |

### B. `resto_v2.restaurant_settings` (Derived 1:1 Normalization)
- **Source Entity**: Derived from `restaurants[0]`
- **Primary Key**: `restaurant_id` (`rest-olive-ember-01`)
- **Conflict Rule**: `ON CONFLICT (restaurant_id) DO UPDATE`

| Derived Field | Origin / Source | V2 Target Column | V2 Target Data Type | Default / Transformed Value |
| :--- | :--- | :--- | :--- | :--- |
| `restaurant_id` | `restaurants[0].id` | `restaurant_id` | `VARCHAR(64)` | `'rest-olive-ember-01'` (FK CASCADE) |
| `auto_accept_orders` | V2 Default | `auto_accept_orders` | `BOOLEAN` | `false` |
| `order_notification_sound` | V2 Default | `order_notification_sound`| `BOOLEAN` | `true` |
| `allow_custom_notes` | V2 Default | `allow_custom_notes` | `BOOLEAN` | `true` |
| `enable_waiter_call` | V2 Default | `enable_waiter_call` | `BOOLEAN` | `true` |
| `enable_bill_request` | V2 Default | `enable_bill_request` | `BOOLEAN` | `true` |
| `created_at` | `restaurants[0].created_at` | `created_at` | `TIMESTAMPTZ` | Inherited from restaurant |
| `updated_at` | `restaurants[0].updated_at` | `updated_at` | `TIMESTAMPTZ` | Inherited from restaurant |

---

## 2. Table: `restaurant_tables`

- **Source Collection**: `backupData.restaurant_tables` (8 records)
- **Primary Key**: `id`
- **Foreign Key**: `restaurant_id -> resto_v2.restaurants(id) ON DELETE CASCADE`
- **Unique Constraint**: `UNIQUE (restaurant_id, table_number)`
- **Conflict Rule**: `ON CONFLICT (id) DO UPDATE`

| V1 Backup Field | V1 Data Type | V2 Target Column | V2 Target Data Type | Transformation & Validation Rules |
| :--- | :--- | :--- | :--- | :--- |
| `id` | string | `id` | `VARCHAR(64)` | Preserved (`tbl-01fa55e5`, etc.) |
| `restaurant_id` | string | `restaurant_id` | `VARCHAR(64)` | Validated against `restaurants.id` |
| `table_number` | string | `table_number` | `VARCHAR(20)` | Preserved (`"01"` through `"08"`) |
| `capacity` | number | `capacity` | `INTEGER` | Parsed integer (default `4`) |
| `zone` | string | `zone` | `VARCHAR(50)` | Default `'Main Dining'` |
| `status` | string | `status` | `VARCHAR(20)` | Validated against `available, occupied, inactive, reserved` |
| `qr_code_url` | string | `qr_code_url` | `VARCHAR(500)` | Default empty string |
| `created_at` | string (ISO) | `created_at` | `TIMESTAMPTZ` | Preserved ISO timestamp |

---

## 3. Table: `categories`

- **Source Collection**: `backupData.categories` (5 records)
- **Primary Key**: `id`
- **Foreign Key**: `restaurant_id -> resto_v2.restaurants(id) ON DELETE CASCADE`
- **Unique Constraint**: `UNIQUE (restaurant_id, name)`
- **Conflict Rule**: `ON CONFLICT (id) DO UPDATE`

| V1 Backup Field | V1 Data Type | V2 Target Column | V2 Target Data Type | Transformation & Validation Rules |
| :--- | :--- | :--- | :--- | :--- |
| `id` | string | `id` | `VARCHAR(64)` | Preserved (`cat-1` to `cat-5`) |
| `restaurant_id` | string | `restaurant_id` | `VARCHAR(64)` | Validated against `restaurants.id` |
| `name` | string | `name` | `VARCHAR(100)` | Preserved category name |
| `description` | string | `description` | `TEXT` | Default empty string |
| `image_url` | string | `image_url` | `VARCHAR(500)` | Default empty string |
| `sort_order` | number | `sort_order` | `INTEGER` | Integer index (`0` to `4`) |
| `is_visible` | boolean | `is_visible` | `BOOLEAN` | Default `true` |
| `created_at` | string (ISO) | `created_at` | `TIMESTAMPTZ` | Preserved ISO timestamp |

---

## 4. Table: `menu_items`

- **Source Collection**: `backupData.menu_items` (7 records)
- **Primary Key**: `id`
- **Foreign Keys**: 
  - `restaurant_id -> resto_v2.restaurants(id) ON DELETE CASCADE`
  - `category_id -> resto_v2.categories(id) ON DELETE SET NULL`
- **Conflict Rule**: `ON CONFLICT (id) DO UPDATE`

| V1 Backup Field | V1 Data Type | V2 Target Column | V2 Target Data Type | Transformation & Validation Rules |
| :--- | :--- | :--- | :--- | :--- |
| `id` | string | `id` | `VARCHAR(64)` | Preserved (`item-1` to `item-7`) |
| `restaurant_id` | string | `restaurant_id` | `VARCHAR(64)` | Validated against `restaurants.id` |
| `category_id` | string | `category_id` | `VARCHAR(64)` | Nullable FK; validated against `categories.id` |
| `name` | string | `name` | `VARCHAR(255)` | Preserved menu item name |
| `description` | string | `description` | `TEXT` | Item culinary description |
| `price` | number | `price` | `NUMERIC(10, 2)` | Converted to exact 2-decimal numeric |
| `image_url` | string | `image_url` | `VARCHAR(500)` | Preserved Unsplash CDN asset URL |
| `is_vegetarian` / `food_type` | boolean / string | `food_type` | `VARCHAR(20)` | `is_vegetarian === false ? 'non_veg' : 'veg'` |
| `dietary_tags` | array | `dietary_tags` | `JSONB` | Serialized to JSONB array (e.g. `["Gluten-Free"]`) |
| `available` / `is_available` | boolean | `available` | `BOOLEAN` | Default `true` |
| `popular` | boolean | `popular` | `BOOLEAN` | Default `false` |
| `chef_special` | boolean | `chef_special` | `BOOLEAN` | Default `false` |
| `preparation_time_minutes` | number | `preparation_time_minutes` | `INTEGER` | Default `15` |
| `calories` | number | `calories` | `INTEGER` | Nullable integer |
| `allergens` | array | `allergens` | `JSONB` | Serialized to JSONB array |
| `addons` | array | `addons` | `JSONB` | Serialized to JSONB array |
| `sort_order` | number | `sort_order` | `INTEGER` | Default `0` |
| `created_at` | string (ISO) | `created_at` | `TIMESTAMPTZ` | Preserved ISO timestamp |
| `updated_at` | string (ISO) | `updated_at` | `TIMESTAMPTZ` | Preserved ISO timestamp |

---

## 5. Table: `orders`

- **Source Collection**: `backupData.orders` (2 records)
- **Primary Key**: `id`
- **Foreign Keys**:
  - `restaurant_id -> resto_v2.restaurants(id) ON DELETE CASCADE`
  - `table_id -> resto_v2.restaurant_tables(id) ON DELETE SET NULL`
- **Conflict Rule**: `ON CONFLICT (id) DO UPDATE`

| V1 Backup Field | V1 Data Type | V2 Target Column | V2 Target Data Type | Transformation & Validation Rules |
| :--- | :--- | :--- | :--- | :--- |
| `id` | string | `id` | `VARCHAR(64)` | Preserved (`ord-...-66e706`, `ord-...-5c8df5`) |
| `order_number` | string | `order_number` | `VARCHAR(50)` | Preserved (`DF-1001`, `DF-1002`) |
| `restaurant_id` | string | `restaurant_id` | `VARCHAR(64)` | Validated against `restaurants.id` |
| `table_id` | string | `table_id` | `VARCHAR(64)` | Validated against `restaurant_tables.id` |
| `table_number` | string | `table_number` | `VARCHAR(20)` | Preserved (`"06"`, `"07"`) |
| `idempotency_key` | string | `idempotency_key` | `VARCHAR(100)` | Preserved UUID string |
| `tracking_token_hash`| string | `tracking_token_hash`| `VARCHAR(64)` | Preserved SHA-256 hash |
| `customer_name` | string | `customer_name` | `VARCHAR(100)` | Default `'Guest'` |
| `customer_phone`| string | `customer_phone` | `VARCHAR(50)` | Default empty string |
| `subtotal` | number | `subtotal` | `NUMERIC(10, 2)` | ₹395.00 / ₹685.00 |
| `cgst` | number | `cgst` | `NUMERIC(10, 2)` | ₹9.88 / ₹17.13 |
| `sgst` | number | `sgst` | `NUMERIC(10, 2)` | ₹9.87 / ₹17.12 |
| `gst_total` / `tax`| number | `gst_total` | `NUMERIC(10, 2)` | ₹19.75 / ₹34.25 |
| `service_charge`| number | `service_charge` | `NUMERIC(10, 2)` | ₹0.00 |
| `final_total` / `total`| number | `final_total` | `NUMERIC(10, 2)` | ₹414.75 / ₹719.25 |
| `payment_method`| string | `payment_method` | `VARCHAR(20)` | Preserved (`'counter'`) |
| `payment_status`| string | `payment_status` | `VARCHAR(20)` | Preserved (`'pending'`) |
| `status` | string | `status` | `VARCHAR(20)` | Preserved (`'completed'`, `'pending'`) |
| `order_notes` | string | `order_notes` | `TEXT` | Default empty string |
| `cancellation_reason`| string | `cancellation_reason`| `TEXT` | Default empty string |
| `estimated_time_minutes`| number | `estimated_time_minutes`| `INTEGER` | Default `20` |
| `status_timeline`| array | `status_timeline` | `JSONB` | Serialized 6-stage lifecycle objects |
| `created_at` | string (ISO) | `created_at` | `TIMESTAMPTZ` | Preserved ISO timestamp |
| `updated_at` | string (ISO) | `updated_at` | `TIMESTAMPTZ` | Preserved ISO timestamp |

---

## 6. Table: `order_items`

- **Source Collection**: `backupData.order_items` (2 records)
- **Primary Key**: `id`
- **Foreign Keys**:
  - `order_id -> resto_v2.orders(id) ON DELETE CASCADE`
  - `menu_item_id -> resto_v2.menu_items(id) ON DELETE RESTRICT`
- **Conflict Rule**: `ON CONFLICT (id) DO UPDATE`

| V1 Backup Field | V1 Data Type | V2 Target Column | V2 Target Data Type | Transformation & Validation Rules |
| :--- | :--- | :--- | :--- | :--- |
| `id` | string | `id` | `VARCHAR(64)` | Preserved UUID string |
| `order_id` | string | `order_id` | `VARCHAR(64)` | Validated against `orders.id` |
| `menu_item_id` | string | `menu_item_id` | `VARCHAR(64)` | Validated against `menu_items.id` |
| `item_name` | string | `item_name` | `VARCHAR(255)` | Preserved item name |
| `food_type` | string | `food_type` | `VARCHAR(20)` | Default `'veg'` |
| `quantity` | number | `quantity` | `INTEGER` | Checked `> 0` |
| `unit_price` | number | `unit_price` | `NUMERIC(10, 2)` | Checked `>= 0` |
| `total_price` | number | `total_price` | `NUMERIC(10, 2)` | Checked `>= 0` |
| `selected_addons`| array | `selected_addons` | `JSONB` | Default `'[]'::jsonb` |
| `special_instructions`| string | `special_instructions`| `TEXT` | Default empty string |

---

## 7. Table: `payments`

- **Source Collection**: `backupData.payments` (2 records)
- **Primary Key**: `id`
- **Foreign Keys**:
  - `restaurant_id -> resto_v2.restaurants(id) ON DELETE CASCADE`
  - `order_id -> resto_v2.orders(id) ON DELETE CASCADE`
- **Conflict Rule**: `ON CONFLICT (id) DO UPDATE`

| V1 Backup Field | V1 Data Type | V2 Target Column | V2 Target Data Type | Transformation & Validation Rules |
| :--- | :--- | :--- | :--- | :--- |
| `id` | string | `id` | `VARCHAR(64)` | Preserved (`pay-ord-...`) |
| `restaurant_id` | string | `restaurant_id` | `VARCHAR(64)` | Validated against `restaurants.id` |
| `order_id` | string | `order_id` | `VARCHAR(64)` | Validated against `orders.id` |
| `amount` | number | `amount` | `NUMERIC(10, 2)` | ₹414.75 / ₹719.25 |
| `payment_method`| string | `payment_method` | `VARCHAR(20)` | Preserved (`'counter'`) |
| `payment_status`| string | `payment_status` | `VARCHAR(20)` | Preserved (`'pending'`) |
| `transaction_reference`| string | `transaction_reference`| `VARCHAR(100)` | Default empty string |
| `created_at` | string (ISO) | `created_at` | `TIMESTAMPTZ` | Preserved ISO timestamp |

---

## 8. Table: `staff`

- **Source Collection**: `backupData.staff` (1 record)
- **Primary Key**: `id`
- **Foreign Key**: `restaurant_id -> resto_v2.restaurants(id) ON DELETE CASCADE`
- **Conflict Rule**: `ON CONFLICT (id) DO UPDATE`

| V1 Backup Field | V1 Data Type | V2 Target Column | V2 Target Data Type | Transformation & Validation Rules |
| :--- | :--- | :--- | :--- | :--- |
| `id` | string | `id` | `VARCHAR(64)` | Preserved (`stf-c399589a`) |
| `restaurant_id` | string | `restaurant_id` | `VARCHAR(64)` | Validated against `restaurants.id` |
| `full_name` | string | `full_name` | `VARCHAR(100)` | Preserved (`Restaurant Admin`) |
| `email` | string | `email` | `VARCHAR(254)` | Preserved email address |
| `role` | string | `role` | `VARCHAR(50)` | Validated against `restaurant_admin, manager, chef, waiter` |
| `is_active` | boolean | `is_active` | `BOOLEAN` | Default `true` |
| `created_at` | string (ISO) | `created_at` | `TIMESTAMPTZ` | Preserved ISO timestamp |

---

## 9. Table: `realtime_events`

- **Source Collection**: `backupData.realtime_events` (7 records)
- **Primary Key**: `id` (`BIGINT GENERATED ALWAYS AS IDENTITY`)
- **Foreign Key**: `restaurant_id -> resto_v2.restaurants(id) ON DELETE CASCADE`
- **Conflict Rule**: `ON CONFLICT (id) DO NOTHING` with `OVERRIDING SYSTEM VALUE`
- **Sequence Sync**: `SELECT setval(pg_get_serial_sequence('resto_v2.realtime_events', 'id'), MAX(id), true)`

| V1 Backup Field | V1 Data Type | V2 Target Column | V2 Target Data Type | Transformation & Validation Rules |
| :--- | :--- | :--- | :--- | :--- |
| `id` | integer / bigint | `id` | `BIGINT` | Preserved integer IDs (`1` through `7`) |
| `restaurant_id` | string | `restaurant_id` | `VARCHAR(64)` | Validated against `restaurants.id` |
| `event_type` | string | `event_type` | `VARCHAR(50)` | Preserved event types (e.g. `order.created`, `order.status_updated`) |
| `entity_type` | string | `entity_type` | `VARCHAR(50)` | Preserved (`order`) |
| `entity_id` | string | `entity_id` | `VARCHAR(64)` | Preserved order ID reference |
| `payload` | object | `payload` | `JSONB` | Native JSONB object |
| `created_at` | string (ISO) | `created_at` | `TIMESTAMPTZ` | Preserved ISO timestamp |

---

## 10. Table: `service_requests`

- **Source Collection**: `backupData.service_requests` (0 records in backup)
- **Primary Key**: `id`
- **Foreign Keys**:
  - `restaurant_id -> resto_v2.restaurants(id) ON DELETE CASCADE`
  - `table_id -> resto_v2.restaurant_tables(id) ON DELETE SET NULL`
  - `order_id -> resto_v2.orders(id) ON DELETE SET NULL`
- **Conflict Rule**: `ON CONFLICT (id) DO UPDATE`

*Note: Table is cleanly prepared with zero historical rows to import.*
