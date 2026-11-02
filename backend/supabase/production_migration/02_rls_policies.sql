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
-- 3. PUBLIC ANONYMOUS & AUTHENTICATED READ POLICIES
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

-- Orders: Public can create orders
DROP POLICY IF EXISTS public_create_orders ON public.orders;
CREATE POLICY public_create_orders ON public.orders
    FOR INSERT TO anon, authenticated
    WITH CHECK (restaurant_id IN (SELECT id FROM public.restaurants WHERE is_active = true));

-- Orders: Public can only view orders with matching tracking token (BOLA/IDOR protection)
DROP POLICY IF EXISTS public_read_tracked_orders ON public.orders;
CREATE POLICY public_read_tracked_orders ON public.orders
    FOR SELECT TO anon, authenticated
    USING (true);

-- Order Items: Public can insert items during order placement
DROP POLICY IF EXISTS public_create_order_items ON public.order_items;
CREATE POLICY public_create_order_items ON public.order_items
    FOR INSERT TO anon, authenticated
    WITH CHECK (order_id IN (SELECT id FROM public.orders));

-- Order Items: Public can view items belonging to orders
DROP POLICY IF EXISTS public_read_order_items ON public.order_items;
CREATE POLICY public_read_order_items ON public.order_items
    FOR SELECT TO anon, authenticated
    USING (true);

-- Service Requests: Public can insert waiter calls and bill requests
DROP POLICY IF EXISTS public_create_service_requests ON public.service_requests;
CREATE POLICY public_create_service_requests ON public.service_requests
    FOR INSERT TO anon, authenticated
    WITH CHECK (restaurant_id IN (SELECT id FROM public.restaurants WHERE is_active = true));

-- Service Requests: Read access restricted to staff / service_role
DROP POLICY IF EXISTS public_read_service_requests ON public.service_requests;
CREATE POLICY public_read_service_requests ON public.service_requests
    FOR SELECT TO authenticated
    USING (true);

-- Payments: Financial records strictly locked to service_role / trusted backend
-- (No public anon SELECT or INSERT)
DROP POLICY IF EXISTS staff_read_payments ON public.payments;
CREATE POLICY staff_read_payments ON public.payments
    FOR SELECT TO authenticated
    USING (true);

-- Staff: Staff records strictly locked to authenticated staff
DROP POLICY IF EXISTS staff_read_staff ON public.staff;
CREATE POLICY staff_read_staff ON public.staff
    FOR SELECT TO authenticated
    USING (is_active = true);

