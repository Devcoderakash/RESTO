-- =====================================================================
-- RESTO PRODUCTION SUPABASE POSTGRESQL MIGRATION: 04_STORAGE.SQL
-- Deliverable D: Supabase Storage Configuration & Storage RLS Policies
-- Bucket: resto-media (Food photography, restaurant logos, branding)
-- =====================================================================

-- 1. Create or Update Storage Bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'resto-media',
    'resto-media',
    true,
    10485760, -- 10 MB limit
    ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

-- =====================================================================
-- 2. STORAGE OBJECTS ROW LEVEL SECURITY POLICIES
-- =====================================================================

-- Allow public read access to all images in resto-media bucket
DROP POLICY IF EXISTS "Public can view resto-media images" ON storage.objects;
CREATE POLICY "Public can view resto-media images" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'resto-media');

-- Allow service_role full control over bucket objects
DROP POLICY IF EXISTS "Service role full access to resto-media" ON storage.objects;
CREATE POLICY "Service role full access to resto-media" ON storage.objects
    FOR ALL TO service_role
    USING (bucket_id = 'resto-media')
    WITH CHECK (bucket_id = 'resto-media');

-- Allow authenticated staff to upload food images
DROP POLICY IF EXISTS "Staff can upload images to resto-media" ON storage.objects;
CREATE POLICY "Staff can upload images to resto-media" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'resto-media');

-- Allow authenticated staff to update food images
DROP POLICY IF EXISTS "Staff can update images in resto-media" ON storage.objects;
CREATE POLICY "Staff can update images in resto-media" ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'resto-media')
    WITH CHECK (bucket_id = 'resto-media');

