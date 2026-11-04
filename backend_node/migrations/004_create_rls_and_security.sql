-- =====================================================================
-- RESTO V2 DATABASE MIGRATION 004: ROW LEVEL SECURITY & PERMISSIONS
-- Isolated V2 PostgreSQL Schema: resto_v2
-- Strict Least-Privilege Access Controls & Service Role Management
-- =====================================================================

-- 1. Enable RLS and Force RLS on all resto_v2 tables
-- Note: FORCE ROW LEVEL SECURITY ensures table owners (e.g. postgres role)
-- are subject to RLS rules and cannot bypass tenant filters inadvertently.
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
        EXECUTE format('ALTER TABLE resto_v2.%I ENABLE ROW LEVEL SECURITY;', tbl);
        EXECUTE format('ALTER TABLE resto_v2.%I FORCE ROW LEVEL SECURITY;', tbl);
    END LOOP;
END $$;

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
DROP POLICY IF EXISTS public_read_restaurants ON resto_v2.restaurants;
CREATE POLICY public_read_restaurants ON resto_v2.restaurants
    FOR SELECT TO anon, authenticated
    USING (is_active = true);

DROP POLICY IF EXISTS public_read_tables ON resto_v2.restaurant_tables;
CREATE POLICY public_read_tables ON resto_v2.restaurant_tables
    FOR SELECT TO anon, authenticated
    USING (restaurant_id IN (SELECT id FROM resto_v2.restaurants WHERE is_active = true));

DROP POLICY IF EXISTS public_read_categories ON resto_v2.categories;
CREATE POLICY public_read_categories ON resto_v2.categories
    FOR SELECT TO anon, authenticated
    USING (is_visible = true AND restaurant_id IN (SELECT id FROM resto_v2.restaurants WHERE is_active = true));

DROP POLICY IF EXISTS public_read_menu_items ON resto_v2.menu_items;
CREATE POLICY public_read_menu_items ON resto_v2.menu_items
    FOR SELECT TO anon, authenticated
    USING (restaurant_id IN (SELECT id FROM resto_v2.restaurants WHERE is_active = true));

-- 4. Operational Tables Strict Access Lockdown
-- Orders, items, payments, requests, and staff are locked to service_role only
DROP POLICY IF EXISTS orders_service_role_only ON resto_v2.orders;
CREATE POLICY orders_service_role_only ON resto_v2.orders
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS order_items_service_role_only ON resto_v2.order_items;
CREATE POLICY order_items_service_role_only ON resto_v2.order_items
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS payments_service_role_only ON resto_v2.payments;
CREATE POLICY payments_service_role_only ON resto_v2.payments
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS service_requests_service_role_only ON resto_v2.service_requests;
CREATE POLICY service_requests_service_role_only ON resto_v2.service_requests
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS staff_service_role_only ON resto_v2.staff;
CREATE POLICY staff_service_role_only ON resto_v2.staff
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 5. Explicit Table-Level Privilege Grants
-- Required because PostgreSQL checks table privileges before RLS policies
GRANT USAGE ON SCHEMA resto_v2 TO anon, authenticated, service_role;
GRANT SELECT ON resto_v2.restaurants TO anon, authenticated;
GRANT SELECT ON resto_v2.restaurant_tables TO anon, authenticated;
GRANT SELECT ON resto_v2.categories TO anon, authenticated;
GRANT SELECT ON resto_v2.menu_items TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA resto_v2 TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA resto_v2 TO service_role;

-- 6. Realtime Cross-Instance Notification Trigger
-- Dispatches committed events to all Node.js backend instances via pg_notify
CREATE OR REPLACE FUNCTION resto_v2.notify_realtime_event()
RETURNS trigger AS $$
DECLARE
    notification_payload json;
BEGIN
    notification_payload = json_build_object(
        'id', NEW.id,
        'restaurant_id', NEW.restaurant_id,
        'event_type', NEW.event_type,
        'entity_type', NEW.entity_type,
        'entity_id', NEW.entity_id,
        'created_at', NEW.created_at,
        'payload', NEW.payload
    );

    -- pg_notify payload limit is 8000 bytes; if payload is oversized, emit reference only
    IF length(notification_payload::text) > 7500 THEN
        notification_payload = json_build_object(
            'id', NEW.id,
            'restaurant_id', NEW.restaurant_id,
            'event_type', NEW.event_type,
            'entity_type', NEW.entity_type,
            'entity_id', NEW.entity_id,
            'created_at', NEW.created_at,
            '_oversized', true
        );
    END IF;

    PERFORM pg_notify('resto_v2_realtime_channel', notification_payload::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_realtime_event ON resto_v2.realtime_events;
CREATE TRIGGER trg_notify_realtime_event
    AFTER INSERT ON resto_v2.realtime_events
    FOR EACH ROW
    EXECUTE FUNCTION resto_v2.notify_realtime_event();


