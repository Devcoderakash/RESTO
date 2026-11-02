-- =====================================================================
-- RESTO PRODUCTION SUPABASE POSTGRESQL: SYNC_SEQUENCES.SQL
-- Task 2: PostgreSQL Dynamic Sequence Synchronization
-- Safely resets all sequences to MAX(id) after explicit ID imports
-- Handles empty tables with is_called=false
-- =====================================================================

DO $$
DECLARE
    seq RECORD;
    max_val BIGINT;
    query TEXT;
    sync_count INT := 0;
BEGIN
    RAISE NOTICE '=== STARTING POSTGRESQL SEQUENCE SYNCHRONIZATION ===';

    FOR seq IN
        SELECT
            c.relname AS sequence_name,
            t.relname AS table_name,
            a.attname AS column_name
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        JOIN pg_depend d ON d.objid = c.oid AND d.classid = 'pg_class'::regclass AND d.refclassid = 'pg_class'::regclass
        JOIN pg_class t ON t.oid = d.refobjid
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = d.refobjsubid
        WHERE c.relkind = 'S' AND n.nspname = 'public'
    LOOP
        query := format('SELECT COALESCE(MAX(%I), 0) FROM public.%I;', seq.column_name, seq.table_name);
        EXECUTE query INTO max_val;
        IF max_val > 0 THEN
            EXECUTE format('SELECT setval(%L, %s, true);', 'public.' || seq.sequence_name, max_val);
            RAISE NOTICE 'Synchronized sequence % on %.% to %', seq.sequence_name, seq.table_name, seq.column_name, max_val;
        ELSE
            EXECUTE format('SELECT setval(%L, 1, false);', 'public.' || seq.sequence_name);
            RAISE NOTICE 'Reset empty sequence % on %.% to 1 (is_called=false)', seq.sequence_name, seq.table_name, seq.column_name;
        END IF;
        sync_count := sync_count + 1;
    END LOOP;

    -- Explicit fallback guarantee for realtime_events_id_seq
    IF EXISTS (SELECT 1 FROM pg_class WHERE relkind = 'S' AND relname = 'realtime_events_id_seq') THEN
        SELECT COALESCE(MAX(id), 0) INTO max_val FROM public.realtime_events;
        IF max_val > 0 THEN
            PERFORM setval('public.realtime_events_id_seq', max_val, true);
        ELSE
            PERFORM setval('public.realtime_events_id_seq', 1, false);
        END IF;
        RAISE NOTICE 'Explicit check: realtime_events_id_seq set to %', GREATEST(max_val, 1);
    END IF;

    RAISE NOTICE '=== SEQUENCE SYNCHRONIZATION COMPLETED: % SEQUENCES PROCESSED ===', sync_count;
END $$;

