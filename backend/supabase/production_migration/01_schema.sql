-- =====================================================================
-- RESTO PRODUCTION SUPABASE POSTGRESQL MIGRATION: 01_SCHEMA.SQL
-- Deliverable A: Complete Database Schema
-- Idempotent, Non-destructive, Strict Constraints & Foreign Keys
-- Compatible with Django ORM Models and Supabase PostgreSQL
-- =====================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================================
-- 2. TABLE: RESTAURANTS
-- Multi-tenant root entity storing operational settings and branding
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.restaurants (
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

-- =====================================================================
-- 3. TABLE: RESTAURANT_TABLES
-- Physical dining tables with capacity, zone, status, and QR codes
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.restaurant_tables (
    id VARCHAR(64) PRIMARY KEY,
    restaurant_id VARCHAR(64) NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    table_number VARCHAR(20) NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 4 CHECK (capacity > 0),
    zone VARCHAR(50) NOT NULL DEFAULT 'Main Dining',
    status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'inactive', 'reserved')),
    qr_code_url VARCHAR(500) NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_restaurant_table_number UNIQUE (restaurant_id, table_number)
);

-- =====================================================================
-- 4. TABLE: CATEGORIES
-- Menu categories (Starters, Mains, Hearth Pizza, Beverages, etc.)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.categories (
    id VARCHAR(64) PRIMARY KEY,
    restaurant_id VARCHAR(64) NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    image_url VARCHAR(500) NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_visible BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_restaurant_category_name UNIQUE (restaurant_id, name)
);

-- =====================================================================
-- 5. TABLE: MENU_ITEMS
-- Dishes with price, dietary type, addons, allergens, and availability
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.menu_items (
    id VARCHAR(64) PRIMARY KEY,
    restaurant_id VARCHAR(64) NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    category_id VARCHAR(64) REFERENCES public.categories(id) ON DELETE SET NULL,
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
    calories INTEGER CHECK (calories IS NULL OR calories > 0),
    allergens JSONB NOT NULL DEFAULT '[]'::jsonb,
    addons JSONB NOT NULL DEFAULT '[]'::jsonb,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- =====================================================================
-- 6. TABLE: ORDERS
-- Customer orders with 5% GST breakdown, status, and tracking token
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.orders (
    id VARCHAR(64) PRIMARY KEY,
    order_number VARCHAR(50) NOT NULL,
    restaurant_id VARCHAR(64) NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    table_id VARCHAR(64) REFERENCES public.restaurant_tables(id) ON DELETE SET NULL,
    table_number VARCHAR(20) NOT NULL,
    idempotency_key VARCHAR(128) NOT NULL DEFAULT '',
    tracking_token_hash VARCHAR(128) NOT NULL DEFAULT '',
    customer_name VARCHAR(120) NOT NULL DEFAULT '',
    customer_phone VARCHAR(40) NOT NULL DEFAULT '',
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (subtotal >= 0),
    cgst NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (cgst >= 0),
    sgst NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (sgst >= 0),
    gst_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (gst_total >= 0),
    service_charge NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (service_charge >= 0),
    final_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (final_total >= 0),
    payment_method VARCHAR(20) NOT NULL DEFAULT 'counter' CHECK (payment_method IN ('counter', 'upi', 'card', 'online')),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'served', 'completed', 'cancelled')),
    order_notes TEXT NOT NULL DEFAULT '',
    cancellation_reason TEXT NOT NULL DEFAULT '',
    estimated_time_minutes INTEGER NOT NULL DEFAULT 20 CHECK (estimated_time_minutes >= 0),
    status_timeline JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- =====================================================================
-- 7. TABLE: ORDER_ITEMS
-- Relational line items belonging to an order
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.order_items (
    id VARCHAR(64) PRIMARY KEY,
    order_id VARCHAR(64) NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    menu_item_id VARCHAR(64) NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    food_type VARCHAR(20) NOT NULL DEFAULT 'veg',
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
    total_price NUMERIC(12, 2) NOT NULL CHECK (total_price >= 0),
    selected_addons JSONB NOT NULL DEFAULT '[]'::jsonb,
    special_instructions TEXT NOT NULL DEFAULT ''
);

-- =====================================================================
-- 8. TABLE: PAYMENTS
-- Financial transactions linked to orders
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.payments (
    id VARCHAR(64) PRIMARY KEY,
    restaurant_id VARCHAR(64) NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    order_id VARCHAR(64) NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    payment_method VARCHAR(20) NOT NULL DEFAULT 'counter',
    payment_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    transaction_reference VARCHAR(100) NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- =====================================================================
-- 9. TABLE: SERVICE_REQUESTS
-- Customer table-side calls (waiter, water, bill, assistance)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.service_requests (
    id VARCHAR(64) PRIMARY KEY,
    restaurant_id VARCHAR(64) NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    table_number VARCHAR(20) NOT NULL,
    order_id VARCHAR(64) NOT NULL DEFAULT '',
    request_type VARCHAR(20) NOT NULL DEFAULT 'waiter' CHECK (request_type IN ('waiter', 'bill', 'water', 'assistance', 'other')),
    message TEXT NOT NULL DEFAULT '',
    payment_preference VARCHAR(50) NOT NULL DEFAULT '',
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- =====================================================================
-- 10. TABLE: STAFF
-- Restaurant operators and managers
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.staff (
    id VARCHAR(64) PRIMARY KEY,
    restaurant_id VARCHAR(64) NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(254) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'manager' CHECK (role IN ('super_admin', 'restaurant_admin', 'manager', 'chef', 'waiter')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- =====================================================================
-- 11. TABLE: REALTIME_EVENTS
-- Append-only event stream table for real-time synchronization
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.realtime_events (
    id BIGSERIAL PRIMARY KEY,
    restaurant_id VARCHAR(64) NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    event_type VARCHAR(64) NOT NULL,
    entity_type VARCHAR(32) NOT NULL,
    entity_id VARCHAR(64) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
