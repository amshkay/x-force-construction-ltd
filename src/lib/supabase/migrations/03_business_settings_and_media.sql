-- ==============================================================================
-- MODULE 02: MIGRATION 03 — BUSINESS SETTINGS & MEDIA ARCHITECTURE
-- XFORCE Construction Management & Customer Platform
-- ==============================================================================

-- 1. Business Settings Table (Single-Business Singleton Record)
CREATE TABLE IF NOT EXISTS business_settings (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'current_business',
    company_name VARCHAR(255) NOT NULL DEFAULT 'XFORCE CONSTRUCTION LTD',
    public_brand_name VARCHAR(255) NOT NULL DEFAULT 'X-FORCE BRICKS',
    slogan TEXT DEFAULT 'Engineered For Strength. Crafted For Distinction.',
    logo_url TEXT,
    favicon_url TEXT,
    tin_number VARCHAR(100),
    currency_code VARCHAR(10) NOT NULL DEFAULT 'NGN',
    currency_symbol VARCHAR(10) NOT NULL DEFAULT '₦',
    country_code VARCHAR(10) NOT NULL DEFAULT 'NG',
    contact_email VARCHAR(255) DEFAULT 'sales@xforcebricks.com',
    contact_phone VARCHAR(50) DEFAULT '+234 800 936 7231',
    whatsapp_number VARCHAR(50) DEFAULT '+234 800 936 7231',
    website_url VARCHAR(255) DEFAULT 'https://xforcebricks.com',
    address JSONB DEFAULT '{"street": "KM 14, Expressway Industrial Corridor", "city": "Lagos", "state": "Lagos State", "country": "Nigeria"}'::JSONB,
    gps_latitude NUMERIC(10, 7) DEFAULT 6.5243793,
    gps_longitude NUMERIC(10, 7) DEFAULT 3.3792057,
    social_links JSONB DEFAULT '{"instagram": "https://instagram.com/xforcebricks", "facebook": "https://facebook.com/xforcebricks"}'::JSONB,
    operating_hours JSONB DEFAULT '{"weekdays": "08:00 - 17:30", "saturdays": "09:00 - 16:00", "sundays": "Closed"}'::JSONB,
    hero_text TEXT DEFAULT 'Premium architectural face bricks, structural masonry, and turnkey installation services for residential and commercial developments.',
    hero_images JSONB DEFAULT '[]'::JSONB,
    default_order_prefix VARCHAR(20) NOT NULL DEFAULT 'XFO',
    default_quotation_prefix VARCHAR(20) NOT NULL DEFAULT 'XFQ',
    default_customer_prefix VARCHAR(20) NOT NULL DEFAULT 'XFC',
    features JSONB DEFAULT '{"installationsEnabled": true, "posOfflineTransactions": true, "customerPortalEnabled": true, "digitalQuotations": true, "warehouseTracking": true}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

DROP TRIGGER IF EXISTS trg_business_settings_updated_at ON business_settings;
CREATE TRIGGER trg_business_settings_updated_at
    BEFORE UPDATE ON business_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 2. Media Table (Universal File/Asset Metadata Registry)
CREATE TABLE IF NOT EXISTS media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    storage_provider VARCHAR(50) NOT NULL DEFAULT 'supabase',
    storage_bucket VARCHAR(100) NOT NULL DEFAULT 'product-media',
    storage_path TEXT NOT NULL,
    public_url TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size INTEGER NOT NULL CHECK (file_size >= 0),
    alt_text VARCHAR(255),
    caption TEXT,
    entity_type VARCHAR(100), -- 'product', 'product_variant', 'project', 'installation', 'customer', 'business_asset'
    entity_id UUID,
    is_published BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_media_entity ON media(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_media_bucket ON media(storage_bucket);
CREATE INDEX IF NOT EXISTS idx_media_is_published ON media(is_published);
CREATE INDEX IF NOT EXISTS idx_media_created_at ON media(created_at DESC);
