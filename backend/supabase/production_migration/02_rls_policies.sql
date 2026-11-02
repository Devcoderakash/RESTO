-- =====================================================================
-- RESTO PRODUCTION SUPABASE POSTGRESQL MIGRATION: 02_RLS_POLICIES.SQL
-- Deliverable B: Separate Row Level Security (RLS) Policies
-- Strict Multi-Tenant Isolation & Least-Privilege Access Controls
-- =====================================================================

-- 1. Enable and Force Row Level Security on all application tables
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.realtime_events ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 2. SERVICE_ROLE BYPASS POLICIES
-- The trusted Django backend operates under the service_role key
-- =====================================================================
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN
        SELECT unnest(ARRAY[
            'restaurants', 'restaurant_tables', 'categories',
            'menu_items', 'orders', 'order_items', 'payments',
            'service_requests', 'staff', 'realtime_events'
        ])
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS service_role_all ON public.%I;', tbl);
        EXECUTE format(
            'CREATE POLICY service_role_all ON public.%I
             FOR ALL TO service_role
             USING (true)
             WITH CHECK (true);',
            tbl
        );
    END LOOP;
END $$;

-- =====================================================================
-- 3. PUBLIC READ POLICIES (Active Catalog Entities Only)
-- Public clients can read active restaurant info, visible categories,
-- available menu items, and table metadata.
-- All mutations (orders, payments, requests) MUST go through Django API.
-- =====================================================================

-- Restaurants: Public can view active restaurants
DROP POLICY IF EXISTS public_read_restaurants ON public.restaurants;
CREATE POLICY public_read_restaurants ON public.restaurants
    FOR SELECT TO anon, authenticated
    USING (is_active = true);

-- Tables: Public can view tables of active restaurants
DROP POLICY IF EXISTS public_read_tables ON public.restaurant_tables;
CREATE POLICY public_read_tables ON public.restaurant_tables
    FOR SELECT TO anon, authenticated
    USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE is_active = true));

-- Categories: Public can view visible categories
DROP POLICY IF EXISTS public_read_categories ON public.categories;
CREATE POLICY public_read_categories ON public.categories
    FOR SELECT TO anon, authenticated
    USING (is_visible = true AND restaurant_id IN (SELECT id FROM public.restaurants WHERE is_active = true));

-- Menu Items: Public can view available dishes
DROP POLICY IF EXISTS public_read_menu_items ON public.menu_items;
CREATE POLICY public_read_menu_items ON public.menu_items
    FOR SELECT TO anon, authenticated
    USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE is_active = true));

-- =====================================================================
-- 4. RESTRICTED OPERATIONAL POLICIES
-- Orders, Order Items, Payments, Service Requests, Staff & Events
-- Direct PostgREST access is strictly blocked for anonymous clients.
-- All operational flows are mediated by Django DRF with server-side validation.
-- =====================================================================

-- Orders: Locked to backend service_role (No public direct PostgREST access)
DROP POLICY IF EXISTS public_create_orders ON public.orders;
DROP POLICY IF EXISTS public_read_tracked_orders ON public.orders;
CREATE POLICY orders_service_role_only ON public.orders
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- Order Items: Locked to backend service_role
DROP POLICY IF EXISTS public_create_order_items ON public.order_items;
DROP POLICY IF EXISTS public_read_order_items ON public.order_items;
CREATE POLICY order_items_service_role_only ON public.order_items
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- Service Requests: Locked to backend service_role
DROP POLICY IF EXISTS public_create_service_requests ON public.service_requests;
DROP POLICY IF EXISTS public_read_service_requests ON public.service_requests;
CREATE POLICY service_requests_service_role_only ON public.service_requests
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- Payments: Locked to backend service_role
DROP POLICY IF EXISTS staff_read_payments ON public.payments;
CREATE POLICY payments_service_role_only ON public.payments
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- Staff: Locked to backend service_role
DROP POLICY IF EXISTS staff_read_staff ON public.staff;
CREATE POLICY staff_service_role_only ON public.staff
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- Realtime Events: Locked to backend service_role
CREATE POLICY realtime_events_service_role_only ON public.realtime_events
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

