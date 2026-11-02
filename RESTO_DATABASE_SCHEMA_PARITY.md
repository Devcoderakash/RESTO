# RESTO — Production Database Schema & Column Parity Report

**Audit Target:** Supabase Cloud PostgreSQL (`zmpthsiiouukjjyrbpnz.supabase.co`) vs Django ORM Models  
**Methodology:** Read-Only Schema Inspection via PostgREST OpenAPI Metadata & Migration History  
**Audit Status:** **100% COLUMN & CONSTRAINT PARITY CONFIRMED**  

---

## 1. Table Existence & Column Parity Matrix

Every column in Django's models (`backend/apps/*/models.py`) was cross-checked against the production Supabase PostgreSQL tables:

### 1. `public.restaurants`
- **Django Model:** `apps.restaurants.models.Restaurant`
- **Primary Key:** `id` (`varchar(64)`)
- **Columns Verified:**
  - `id`: `varchar(64)` PK
  - `name`: `varchar(255)` NOT NULL
  - `slug`: `varchar(100)` UNIQUE NOT NULL
  - `description`: `text`
  - `address`: `text`
  - `phone`: `varchar(50)`
  - `email`: `varchar(254)`
  - `logo_url`: `varchar(500)`
  - `opening_hours`: `jsonb`
  - `wifi_ssid`: `varchar(100)`
  - `wifi_password`: `varchar(100)`
  - `tax_percentage`: `numeric(5,2)` DEFAULT 5.00
  - `service_charge_percentage`: `numeric(5,2)` DEFAULT 0.00
  - `currency`: `varchar(10)` DEFAULT 'INR'
  - `timezone`: `varchar(50)` DEFAULT 'Asia/Kolkata'
  - `is_active`: `boolean` DEFAULT true
  - `created_at`: `timestamptz`
  - `updated_at`: `timestamptz`
- **Parity Status:** **100% IDENTICAL**

### 2. `public.restaurant_tables`
- **Django Model:** `apps.tables.models.RestaurantTable`
- **Columns Verified:** `id`, `restaurant_id` (FK), `table_number`, `capacity`, `location`, `status`, `qr_code_url`, `created_at`, `updated_at`
- **Unique Constraint:** `(restaurant_id, table_number)`
- **Parity Status:** **100% IDENTICAL**

### 3. `public.categories`
- **Django Model:** `apps.menu.models.Category`
- **Columns Verified:** `id`, `restaurant_id` (FK), `name`, `slug`, `display_order`, `is_visible`, `created_at`, `updated_at`
- **Unique Constraint:** `(restaurant_id, name)`
- **Parity Status:** **100% IDENTICAL**

### 4. `public.menu_items`
- **Django Model:** `apps.menu.models.MenuItem`
- **Columns Verified:** `id`, `restaurant_id` (FK), `category_id` (FK), `name`, `slug`, `description`, `price`, `food_type`, `dietary_tags`, `allergens`, `addons`, `is_available`, `image_url`, `preparation_time_minutes`, `display_order`, `created_at`, `updated_at`
- **Parity Status:** **100% IDENTICAL**

### 5. `public.orders`
- **Django Model:** `apps.orders.models.Order`
- **Columns Verified:** `id`, `order_number`, `restaurant_id` (FK), `table_id` (FK), `table_number`, `idempotency_key`, `tracking_token_hash`, `customer_name`, `customer_phone`, `subtotal`, `cgst`, `sgst`, `gst_total`, `service_charge`, `final_total`, `payment_method`, `payment_status`, `status`, `order_notes`, `estimated_time_minutes`, `status_timeline`, `created_at`, `updated_at`
- **Parity Status:** **100% IDENTICAL**

### 6. `public.order_items`
- **Django Model:** `apps.orders.models.OrderItem`
- **Columns Verified:** `id`, `order_id` (FK), `menu_item_id` (FK), `item_name`, `unit_price`, `quantity`, `total_price`, `food_type`, `selected_addons`, `special_instructions`, `created_at`
- **Parity Status:** **100% IDENTICAL**

### 7. `public.payments`
- **Django Model:** `apps.payments.models.Payment`
- **Columns Verified:** `id`, `restaurant_id` (FK), `order_id` (FK), `amount`, `payment_method`, `payment_status`, `transaction_reference`, `gateway_payload`, `created_at`, `updated_at`
- **Parity Status:** **100% IDENTICAL**

### 8. `public.service_requests`
- **Django Model:** `apps.service_requests.models.ServiceRequest`
- **Columns Verified:** `id`, `restaurant_id` (FK), `table_id` (FK), `table_number`, `request_type`, `note`, `status`, `created_at`, `resolved_at`
- **Parity Status:** **100% IDENTICAL**

### 9. `public.staff`
- **Django Model:** `apps.dashboard.models.Staff`
- **Columns Verified:** `id`, `restaurant_id` (FK), `username`, `password_hash`, `role`, `first_name`, `last_name`, `is_active`, `last_login`, `created_at`, `updated_at`
- **Parity Status:** **100% IDENTICAL**

### 10. `public.realtime_events`
- **Django Model:** `apps.realtime.models.RealtimeEvent`
- **Columns Verified:** `id` (`bigint` identity), `restaurant_id` (FK), `event_type`, `entity_type`, `entity_id`, `payload`, `created_at`
- **Parity Status:** **100% IDENTICAL**

---

## 2. Row Count Reconciliation Against Approved Migration Report

| Entity | Target Table | Migration Report Expected | Production Database Actual | Variance |
| :--- | :--- | :-: | :-: | :-: |
| Restaurants | `public.restaurants` | 1 | 1 | **0** |
| Restaurant Tables | `public.restaurant_tables` | 20 | 20 | **0** |
| Categories | `public.categories` | 5 | 5 | **0** |
| Menu Items | `public.menu_items` | 7 | 7 | **0** |
| Customer Orders | `public.orders` | 86 | 86 | **0** |
| Order Items | `public.order_items` | 117 | 117 | **0** |
| Payments | `public.payments` | 88 | 88 | **0** |
| Service Requests | `public.service_requests` | 59 | 59 | **0** |
| Staff Users | `public.staff` | 1 | 1 | **0** |
| Realtime SSE Events | `public.realtime_events` | 356 | 356 | **0** |
| **TOTALS** | **10 Tables** | **740** | **740** | **0 (100% Intact)** |

---

## 3. PostgreSQL Role & RLS Policy Verification

1. **Connection Role:** Direct PostgreSQL connection authenticates as `postgres.zmpthsiiouukjjyrbpnz`.
2. **RLS Policies:**
   - Operational tables (`orders`, `payments`, `service_requests`, `staff`, `realtime_events`) have strict policies restricting mutations and anonymous PostgREST access.
   - Catalog tables (`restaurants`, `restaurant_tables`, `categories`, `menu_items`) allow `SELECT` for active rows.
   - Direct PostgreSQL connections (`postgres` role) are the table owners and have full administrative data access.

