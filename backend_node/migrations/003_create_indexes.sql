-- =====================================================================
-- RESTO V2 DATABASE MIGRATION 003: PERFORMANCE INDEXES
-- Isolated V2 PostgreSQL Schema: resto_v2
-- Tailored to high-throughput customer reads and staff real-time queries
-- =====================================================================

-- 1. RESTAURANTS
CREATE INDEX IF NOT EXISTS idx_v2_restaurants_slug_active 
    ON resto_v2.restaurants (slug, is_active);

-- 2. RESTAURANT_TABLES
CREATE INDEX IF NOT EXISTS idx_v2_tables_restaurant_status 
    ON resto_v2.restaurant_tables (restaurant_id, status);

CREATE INDEX IF NOT EXISTS idx_v2_tables_restaurant_number 
    ON resto_v2.restaurant_tables (restaurant_id, table_number);

-- 3. CATEGORIES
CREATE INDEX IF NOT EXISTS idx_v2_categories_restaurant_order 
    ON resto_v2.categories (restaurant_id, sort_order, is_visible);

-- 4. MENU_ITEMS
CREATE INDEX IF NOT EXISTS idx_v2_menu_items_restaurant_available 
    ON resto_v2.menu_items (restaurant_id, available);

CREATE INDEX IF NOT EXISTS idx_v2_menu_items_restaurant_category 
    ON resto_v2.menu_items (restaurant_id, category_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_v2_menu_items_food_type 
    ON resto_v2.menu_items (restaurant_id, food_type);

-- 5. ORDERS
CREATE INDEX IF NOT EXISTS idx_v2_orders_restaurant_created_at 
    ON resto_v2.orders (restaurant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_v2_orders_restaurant_status 
    ON resto_v2.orders (restaurant_id, status);

CREATE INDEX IF NOT EXISTS idx_v2_orders_restaurant_idempotency 
    ON resto_v2.orders (restaurant_id, idempotency_key) 
    WHERE idempotency_key <> '';

CREATE INDEX IF NOT EXISTS idx_v2_orders_restaurant_table 
    ON resto_v2.orders (restaurant_id, table_number);

CREATE INDEX IF NOT EXISTS idx_v2_orders_tracking_token 
    ON resto_v2.orders (id, tracking_token_hash) 
    WHERE tracking_token_hash <> '';

-- 6. ORDER_ITEMS
CREATE INDEX IF NOT EXISTS idx_v2_order_items_order_id 
    ON resto_v2.order_items (order_id);

CREATE INDEX IF NOT EXISTS idx_v2_order_items_menu_item 
    ON resto_v2.order_items (menu_item_id);

-- 7. PAYMENTS
CREATE INDEX IF NOT EXISTS idx_v2_payments_restaurant_created_at 
    ON resto_v2.payments (restaurant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_v2_payments_restaurant_order 
    ON resto_v2.payments (restaurant_id, order_id);

-- 8. SERVICE_REQUESTS
CREATE INDEX IF NOT EXISTS idx_v2_service_requests_restaurant_status 
    ON resto_v2.service_requests (restaurant_id, status, created_at DESC);

-- 9. STAFF
CREATE INDEX IF NOT EXISTS idx_v2_staff_restaurant_email 
    ON resto_v2.staff (restaurant_id, email, is_active);

-- 10. REALTIME_EVENTS
CREATE INDEX IF NOT EXISTS idx_v2_realtime_events_restaurant_id 
    ON resto_v2.realtime_events (restaurant_id, id ASC);

CREATE INDEX IF NOT EXISTS idx_v2_realtime_events_entity 
    ON resto_v2.realtime_events (restaurant_id, entity_type, entity_id);

