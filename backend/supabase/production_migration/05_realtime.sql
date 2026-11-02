-- =====================================================================
-- RESTO PRODUCTION SUPABASE POSTGRESQL MIGRATION: 05_REALTIME.SQL
-- Deliverable E: Supabase Realtime Publication Configuration
-- Enables low-latency live streaming strictly for operational tables
-- =====================================================================

-- 1. Set Replica Identity FULL
-- Ensures Realtime payloads deliver both old and new record values on UPDATE/DELETE
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.service_requests REPLICA IDENTITY FULL;
ALTER TABLE public.restaurant_tables REPLICA IDENTITY FULL;
ALTER TABLE public.menu_items REPLICA IDENTITY FULL;
ALTER TABLE public.realtime_events REPLICA IDENTITY FULL;

-- 2. Add Tables to supabase_realtime Publication Safely
DO $$
DECLARE
    target_table text;
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        FOR target_table IN
            SELECT unnest(ARRAY['orders', 'service_requests', 'restaurant_tables', 'menu_items', 'realtime_events'])
        LOOP
            IF NOT EXISTS (
                SELECT 1 FROM pg_publication_tables 
                WHERE pubname = 'supabase_realtime' 
                  AND schemaname = 'public' 
                  AND tablename = target_table
            ) THEN
                EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', target_table);
            END IF;
        END LOOP;
    END IF;
END $$;
