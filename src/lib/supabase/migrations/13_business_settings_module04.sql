-- ==============================================================================
-- MODULE 04: MIGRATION 13 — EXTENDED BUSINESS SETTINGS & SYSTEM CONFIGURATION
-- XFORCE Construction Management & Customer Platform
-- ==============================================================================

-- Expand business_settings singleton to support full Module 04 configuration
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS short_name VARCHAR(50) DEFAULT 'X-FORCE';
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS business_description TEXT;
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS business_category VARCHAR(100) DEFAULT 'Manufacturer & Direct Supplier';
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS secondary_phone VARCHAR(50);
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS location_description TEXT;
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS map_link_url TEXT;

-- Brand & Palette
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS primary_brand_color VARCHAR(30) DEFAULT '#ea580c';
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS secondary_brand_color VARCHAR(30) DEFAULT '#0f172a';
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS accent_brand_color VARCHAR(30) DEFAULT '#f97316';
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS branding JSONB DEFAULT '{}'::JSONB;

-- Regional & Financial
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS regional_settings JSONB DEFAULT '{}'::JSONB;
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS payment_methods JSONB DEFAULT '[]'::JSONB;

-- Numbering Sequences
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS default_request_prefix VARCHAR(20) DEFAULT 'XFR';
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS default_tracking_prefix VARCHAR(20) DEFAULT 'TRK';
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS default_payment_prefix VARCHAR(20) DEFAULT 'RCP';
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS default_invoice_prefix VARCHAR(20) DEFAULT 'INV';
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS numbering_settings JSONB DEFAULT '{}'::JSONB;

-- Catalog & Content
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS supported_categories JSONB DEFAULT '[]'::JSONB;
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS website_content JSONB DEFAULT '{}'::JSONB;

-- Optimistic Concurrency Version
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Ensure RLS is enabled and policies are active
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'business_settings' AND policyname = 'Public read business settings'
    ) THEN
        CREATE POLICY "Public read business settings"
            ON business_settings FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'business_settings' AND policyname = 'Admins manage business settings'
    ) THEN
        CREATE POLICY "Admins manage business settings"
            ON business_settings FOR ALL TO authenticated USING (public.is_admin());
    END IF;
END $$;
