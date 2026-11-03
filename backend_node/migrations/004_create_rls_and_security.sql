-- =====================================================================
-- RESTO V2 DATABASE MIGRATION 004: ROW LEVEL SECURITY & PERMISSIONS
-- Isolated V2 PostgreSQL Schema: resto_v2
-- Strict Least-Privilege Access Controls & Service Role Management
-- =====================================================================

-- 1. Enable RLS on all resto_v2 tables
ALTER TABLE resto_v2.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE resto_v2.restaurant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE resto_v2.restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE resto_v2.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE resto_v2.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE resto_v2.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE resto_v2.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE resto_v2.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE resto_v2.service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE resto_v2.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE resto_v2.realtime_events ENABLE ROW LEVEL SECURITY;

-- 2. Service Role Bypass Policies (Allows backend_node full operational access)
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN
        SELECT unnest(ARRAY[
            'restaurants', 'restaurant_settings', 'restaurant_tables',
            'categories', 'menu_items', 'orders', 'order_items',
            'payments', 'service_requests', 'staff', 'realtime_events'
        ])
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS service_role_v2_all ON resto_v2.%I;', tbl);
        EXECUTE format(
            'CREATE POLICY service_role_v2_all ON resto_v2.%I
             FOR ALL TO service_role
             USING (true)
             WITH CHECK (true);',
            tbl
        );
    END LOOP;
END $$;

-- 3. Public Read Policies for Customer Ordering
-- Only active catalog entities are readable by anon/authenticated roles
CREATE POLICY public_read_restaurants ON resto_v2.restaurants
    FOR SELECT TO anon, authenticated
    USING (is_active = true);

CREATE POLICY public_read_tables ON resto_v2.restaurant_tables
    FOR SELECT TO anon, authenticated
    USING (restaurant_id IN (SELECT id FROM resto_v2.restaurants WHERE is_active = true));

CREATE POLICY public_read_categories ON resto_v2.categories
    FOR SELECT TO anon, authenticated
    USING (is_visible = true AND restaurant_id IN (SELECT id FROM resto_v2.restaurants WHERE is_active = true));

CREATE POLICY public_read_menu_items ON resto_v2.menu_items
    FOR SELECT TO anon, authenticated
    USING (restaurant_id IN (SELECT id FROM resto_v2.restaurants WHERE is_active = true));

-- 4. Operational Tables Strict Access Lockdown
-- Orders, items, payments, requests, and staff are locked to service_role only
CREATE POLICY orders_service_role_only ON resto_v2.orders
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY order_items_service_role_only ON resto_v2.order_items
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY payments_service_role_only ON resto_v2.payments
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY service_requests_service_role_only ON resto_v2.service_requests
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY staff_service_role_only ON resto_v2.staff
    FOR ALL TO service_role USING (true) WITH CHECK (true);
