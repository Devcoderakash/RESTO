-- =====================================================================
-- RESTO PRODUCTION SUPABASE POSTGRESQL MIGRATION: 03_INDEXES.SQL
-- Deliverable C: Production Index Optimization
-- Based on Actual Query Patterns, High-Throughput Reads & Concurrency
-- =====================================================================

-- 1. RESTAURANTS INDEXES
CREATE INDEX IF NOT EXISTS idx_restaurants_slug_active 
    ON public.restaurants (slug, is_active);

-- 2. RESTAURANT_TABLES INDEXES
CREATE INDEX IF NOT EXISTS idx_tables_restaurant_status 
    ON public.restaurant_tables (restaurant_id, status);

CREATE INDEX IF NOT EXISTS idx_tables_restaurant_number 
    ON public.restaurant_tables (restaurant_id, table_number);

-- 3. CATEGORIES INDEXES
CREATE INDEX IF NOT EXISTS idx_categories_restaurant_order 
    ON public.categories (restaurant_id, sort_order, is_visible);

-- 4. MENU_ITEMS INDEXES
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_available 
    ON public.menu_items (restaurant_id, available);

CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_category 
    ON public.menu_items (restaurant_id, category_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_menu_items_food_type 
    ON public.menu_items (restaurant_id, food_type);

-- 5. ORDERS INDEXES
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_created_at 
    ON public.orders (restaurant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_restaurant_status 
    ON public.orders (restaurant_id, status);

CREATE INDEX IF NOT EXISTS idx_orders_restaurant_idempotency 
    ON public.orders (restaurant_id, idempotency_key) 
    WHERE idempotency_key <> '';

CREATE INDEX IF NOT EXISTS idx_orders_restaurant_table 
    ON public.orders (restaurant_id, table_number);

CREATE INDEX IF NOT EXISTS idx_orders_tracking_token 
    ON public.orders (id, tracking_token_hash) 
    WHERE tracking_token_hash <> '';

-- 6. ORDER_ITEMS INDEXES
CREATE INDEX IF NOT EXISTS idx_order_items_order_id 
    ON public.order_items (order_id);

CREATE INDEX IF NOT EXISTS idx_order_items_menu_item 
    ON public.order_items (menu_item_id);

-- 7. PAYMENTS INDEXES
CREATE INDEX IF NOT EXISTS idx_payments_restaurant_created_at 
    ON public.payments (restaurant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payments_restaurant_order 
    ON public.payments (restaurant_id, order_id);

-- 8. SERVICE_REQUESTS INDEXES
CREATE INDEX IF NOT EXISTS idx_service_requests_restaurant_status 
    ON public.service_requests (restaurant_id, status, created_at DESC);

-- 9. STAFF INDEXES
CREATE INDEX IF NOT EXISTS idx_staff_restaurant_email 
    ON public.staff (restaurant_id, email, is_active);

-- 10. REALTIME_EVENTS INDEXES
CREATE INDEX IF NOT EXISTS idx_realtime_events_restaurant_id 
    ON public.realtime_events (restaurant_id, id ASC);

CREATE INDEX IF NOT EXISTS idx_realtime_events_entity 
    ON public.realtime_events (restaurant_id, entity_type, entity_id);

