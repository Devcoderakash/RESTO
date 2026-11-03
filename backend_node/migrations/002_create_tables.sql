-- =====================================================================
-- RESTO V2 DATABASE MIGRATION 002: ENTITY SCHEMAS & CONSTRAINTS
-- Isolated V2 PostgreSQL Schema: resto_v2
-- Strict typing, foreign keys, and decimal monetary safety
-- =====================================================================

-- 1. TABLE: RESTAURANTS
CREATE TABLE IF NOT EXISTS resto_v2.restaurants (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    phone VARCHAR(50) NOT NULL DEFAULT '',
    email VARCHAR(254) NOT NULL DEFAULT '',
    logo_url VARCHAR(500) NOT NULL DEFAULT '',
    opening_hours JSONB NOT NULL DEFAULT '{}'::jsonb,
    wifi_ssid VARCHAR(100) NOT NULL DEFAULT '',
    wifi_password VARCHAR(100) NOT NULL DEFAULT '',
    tax_percentage NUMERIC(5, 2) NOT NULL DEFAULT 5.00 CHECK (tax_percentage >= 0),
    service_charge_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (service_charge_percentage >= 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Kolkata',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 2. TABLE: RESTAURANT_SETTINGS (Extended configuration)
CREATE TABLE IF NOT EXISTS resto_v2.restaurant_settings (
    restaurant_id VARCHAR(64) PRIMARY KEY REFERENCES resto_v2.restaurants(id) ON DELETE CASCADE,
    auto_accept_orders BOOLEAN NOT NULL DEFAULT false,
    order_notification_sound BOOLEAN NOT NULL DEFAULT true,
    allow_custom_notes BOOLEAN NOT NULL DEFAULT true,
    enable_waiter_call BOOLEAN NOT NULL DEFAULT true,
    enable_bill_request BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 3. TABLE: RESTAURANT_TABLES
CREATE TABLE IF NOT EXISTS resto_v2.restaurant_tables (
    id VARCHAR(64) PRIMARY KEY,
    restaurant_id VARCHAR(64) NOT NULL REFERENCES resto_v2.restaurants(id) ON DELETE CASCADE,
    table_number VARCHAR(20) NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 4 CHECK (capacity > 0),
    zone VARCHAR(50) NOT NULL DEFAULT 'Main Dining',
    status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'inactive', 'reserved')),
    qr_code_url VARCHAR(500) NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_v2_restaurant_table_number UNIQUE (restaurant_id, table_number)
);

-- 4. TABLE: CATEGORIES
CREATE TABLE IF NOT EXISTS resto_v2.categories (
    id VARCHAR(64) PRIMARY KEY,
    restaurant_id VARCHAR(64) NOT NULL REFERENCES resto_v2.restaurants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    image_url VARCHAR(500) NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_visible BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_v2_restaurant_category_name UNIQUE (restaurant_id, name)
);

-- 5. TABLE: MENU_ITEMS
CREATE TABLE IF NOT EXISTS resto_v2.menu_items (
    id VARCHAR(64) PRIMARY KEY,
    restaurant_id VARCHAR(64) NOT NULL REFERENCES resto_v2.restaurants(id) ON DELETE CASCADE,
    category_id VARCHAR(64) REFERENCES resto_v2.categories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    image_url VARCHAR(500) NOT NULL DEFAULT '',
    food_type VARCHAR(20) NOT NULL DEFAULT 'veg' CHECK (food_type IN ('veg', 'non_veg')),
    dietary_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    available BOOLEAN NOT NULL DEFAULT true,
    popular BOOLEAN NOT NULL DEFAULT false,
    chef_special BOOLEAN NOT NULL DEFAULT false,
    preparation_time_minutes INTEGER NOT NULL DEFAULT 15 CHECK (preparation_time_minutes > 0),
    calories INTEGER,
    allergens JSONB NOT NULL DEFAULT '[]'::jsonb,
    addons JSONB NOT NULL DEFAULT '[]'::jsonb,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 6. TABLE: ORDERS
CREATE TABLE IF NOT EXISTS resto_v2.orders (
    id VARCHAR(64) PRIMARY KEY,
    order_number VARCHAR(50) NOT NULL,
    restaurant_id VARCHAR(64) NOT NULL REFERENCES resto_v2.restaurants(id) ON DELETE CASCADE,
    table_id VARCHAR(64) REFERENCES resto_v2.restaurant_tables(id) ON DELETE SET NULL,
    table_number VARCHAR(20) NOT NULL,
    idempotency_key VARCHAR(100) NOT NULL DEFAULT '',
    tracking_token_hash VARCHAR(64) NOT NULL DEFAULT '',
    customer_name VARCHAR(100),
    customer_phone VARCHAR(50),
    subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (subtotal >= 0),
    cgst NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (cgst >= 0),
    sgst NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (sgst >= 0),
    gst_total NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (gst_total >= 0),
    service_charge NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (service_charge >= 0),
    final_total NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (final_total >= 0),
    payment_method VARCHAR(20) NOT NULL DEFAULT 'counter' CHECK (payment_method IN ('counter', 'upi', 'card', 'online')),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'served', 'completed', 'cancelled')),
    order_notes TEXT,
    cancellation_reason TEXT,
    estimated_time_minutes INTEGER NOT NULL DEFAULT 20,
    status_timeline JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 7. TABLE: ORDER_ITEMS
CREATE TABLE IF NOT EXISTS resto_v2.order_items (
    id VARCHAR(64) PRIMARY KEY,
    order_id VARCHAR(64) NOT NULL REFERENCES resto_v2.orders(id) ON DELETE CASCADE,
    menu_item_id VARCHAR(64) NOT NULL REFERENCES resto_v2.menu_items(id) ON DELETE RESTRICT,
    item_name VARCHAR(255) NOT NULL,
    food_type VARCHAR(20) NOT NULL DEFAULT 'veg',
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
    total_price NUMERIC(10, 2) NOT NULL CHECK (total_price >= 0),
    selected_addons JSONB NOT NULL DEFAULT '[]'::jsonb,
    special_instructions TEXT
);

-- 8. TABLE: PAYMENTS
CREATE TABLE IF NOT EXISTS resto_v2.payments (
    id VARCHAR(64) PRIMARY KEY,
    restaurant_id VARCHAR(64) NOT NULL REFERENCES resto_v2.restaurants(id) ON DELETE CASCADE,
    order_id VARCHAR(64) NOT NULL REFERENCES resto_v2.orders(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    payment_method VARCHAR(20) NOT NULL DEFAULT 'counter',
    payment_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    transaction_reference VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 9. TABLE: SERVICE_REQUESTS
CREATE TABLE IF NOT EXISTS resto_v2.service_requests (
    id VARCHAR(64) PRIMARY KEY,
    restaurant_id VARCHAR(64) NOT NULL REFERENCES resto_v2.restaurants(id) ON DELETE CASCADE,
    table_id VARCHAR(64) REFERENCES resto_v2.restaurant_tables(id) ON DELETE SET NULL,
    table_number VARCHAR(20) NOT NULL,
    request_type VARCHAR(50) NOT NULL CHECK (request_type IN ('waiter', 'water', 'bill', 'assistance', 'call_waiter', 'request_bill', 'other')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    order_id VARCHAR(64) REFERENCES resto_v2.orders(id) ON DELETE SET NULL,
    message TEXT,
    payment_preference VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    resolved_at TIMESTAMPTZ
);

-- 10. TABLE: STAFF
CREATE TABLE IF NOT EXISTS resto_v2.staff (
    id VARCHAR(64) PRIMARY KEY,
    restaurant_id VARCHAR(64) NOT NULL REFERENCES resto_v2.restaurants(id) ON DELETE CASCADE,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(254) NOT NULL,
    username VARCHAR(150),
    password_hash VARCHAR(255) NOT NULL DEFAULT '',
    role VARCHAR(50) NOT NULL DEFAULT 'manager' CHECK (role IN ('super_admin', 'restaurant_admin', 'manager', 'chef', 'waiter')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 11. TABLE: REALTIME_EVENTS
CREATE TABLE IF NOT EXISTS resto_v2.realtime_events (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    restaurant_id VARCHAR(64) NOT NULL REFERENCES resto_v2.restaurants(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(64) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
