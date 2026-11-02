-- =====================================================================
-- RESTO PRODUCTION SUPABASE POSTGRESQL MIGRATION: 06_VERIFICATION.SQL
-- Deliverable G: Verification Queries for Schema, Foreign Keys, RLS, Indexes
-- Run this in the Supabase SQL Editor after applying migrations
-- =====================================================================

-- 1. Verify All 10 Application Tables Exist
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'restaurants', 'restaurant_tables', 'categories', 'menu_items',
    'orders', 'order_items', 'payments', 'service_requests',
    'staff', 'realtime_events'
  )
ORDER BY table_name;

-- 2. Verify Foreign Key Constraints and Target Relationships
SELECT
    tc.table_name AS source_table,
    kcu.column_name AS foreign_key_column,
    ccu.table_name AS target_table,
    ccu.column_name AS target_primary_key,
    rc.delete_rule AS on_delete_action
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY source_table, foreign_key_column;

-- 3. Verify Unique Constraints (Slug, Table Number, Category Name)
SELECT
    tc.table_name,
    tc.constraint_name,
    string_agg(kcu.column_name, ', ') AS columns
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'UNIQUE'
  AND tc.table_schema = 'public'
GROUP BY tc.table_name, tc.constraint_name
ORDER BY tc.table_name;

-- 4. Verify Row Level Security (RLS) is ENABLED on All 10 Tables
SELECT 
    relname AS table_name,
    CASE WHEN relrowsecurity THEN 'ENABLED' ELSE 'DISABLED' END AS rls_status,
    CASE WHEN relforcerowsecurity THEN 'FORCED' ELSE 'NORMAL' END AS rls_enforcement
FROM pg_class
WHERE relnamespace = 'public'::regnamespace
  AND relname IN (
    'restaurants', 'restaurant_tables', 'categories', 'menu_items',
    'orders', 'order_items', 'payments', 'service_requests',
    'staff', 'realtime_events'
  )
ORDER BY relname;

-- 5. Verify RLS Security Policies
SELECT 
    tablename,
    policyname,
    roles,
    cmd AS operation
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 6. Verify Production Indexes
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- 7. Verify Supabase Storage Configuration
SELECT 
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets
WHERE id = 'resto-media';

-- 8. Verify Realtime Publication Membership
SELECT 
    schemaname,
    tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND schemaname = 'public'
ORDER BY tablename;

-- 9. Verify Record Counts Across All Entities
SELECT 'restaurants' AS entity, COUNT(*) AS count FROM public.restaurants
UNION ALL
SELECT 'restaurant_tables', COUNT(*) FROM public.restaurant_tables
UNION ALL
SELECT 'categories', COUNT(*) FROM public.categories
UNION ALL
SELECT 'menu_items', COUNT(*) FROM public.menu_items
UNION ALL
SELECT 'orders', COUNT(*) FROM public.orders
UNION ALL
SELECT 'order_items', COUNT(*) FROM public.order_items
UNION ALL
SELECT 'payments', COUNT(*) FROM public.payments
UNION ALL
SELECT 'service_requests', COUNT(*) FROM public.service_requests
UNION ALL
SELECT 'staff', COUNT(*) FROM public.staff
UNION ALL
SELECT 'realtime_events', COUNT(*) FROM public.realtime_events;
