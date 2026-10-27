-- ==============================================================================
-- MODULE 02: MIGRATION 11 — STORAGE BUCKETS & STORAGE SECURITY POLICIES
-- XFORCE Construction Management & Customer Platform
-- ==============================================================================

-- 1. Create Core Storage Buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('product-media', 'product-media', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
    ('project-media', 'project-media', true, 15728640, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'video/mp4']),
    ('installation-media', 'installation-media', false, 20971520, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
    ('customer-uploads', 'customer-uploads', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
    ('business-assets', 'business-assets', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'])
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ------------------------------------------------------------------------------
-- 2. Storage Policies on storage.objects
-- ------------------------------------------------------------------------------

-- Public Buckets Read Access (product-media, project-media, business-assets)
CREATE POLICY "Public Read for Public Buckets"
    ON storage.objects FOR SELECT
    USING (bucket_id IN ('product-media', 'project-media', 'business-assets'));

-- Staff Upload to Product & Project Media
CREATE POLICY "Staff Upload Product Media"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id IN ('product-media', 'project-media', 'installation-media') 
        AND public.is_staff()
    );

CREATE POLICY "Staff Modify Product Media"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id IN ('product-media', 'project-media', 'installation-media') 
        AND public.is_staff()
    );

CREATE POLICY "Staff Delete Product Media"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id IN ('product-media', 'project-media', 'installation-media') 
        AND public.is_staff()
    );

-- Installation Media Read (Staff Only)
CREATE POLICY "Staff Read Installation Media"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'installation-media' AND public.is_staff());

-- Customer Uploads (Own files or Staff access)
CREATE POLICY "Customer Read Own Uploads"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'customer-uploads' AND 
        (public.is_staff() OR (auth.uid()::text = (storage.foldername(name))[1]))
    );

CREATE POLICY "Customer Upload Own Files"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'customer-uploads' AND 
        (public.is_staff() OR (auth.uid()::text = (storage.foldername(name))[1]))
    );

-- Business Assets Manage (Admins Only)
CREATE POLICY "Admins Manage Business Assets"
    ON storage.objects FOR ALL
    TO authenticated
    USING (bucket_id = 'business-assets' AND public.is_admin());
