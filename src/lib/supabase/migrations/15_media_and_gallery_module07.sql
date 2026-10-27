-- ==============================================================================
-- MODULE 07: MIGRATION 15 — MEDIA, DESIGNS & PROJECT GALLERY
-- XFORCE Construction Management & Customer Platform (Brand: X-FORCE BRICKS)
-- Single-Business Architecture — Public Media, Architectural Designs & Showcase
-- ==============================================================================

-- 1. Designs Table (Inspiration & Architectural Bond Patterns)
CREATE TABLE IF NOT EXISTS designs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'Interlocking Paving',
    pattern_style VARCHAR(100),
    application_type VARCHAR(100),
    images JSONB NOT NULL DEFAULT '[]'::jsonb,
    video_url TEXT,
    color_palette JSONB NOT NULL DEFAULT '[]'::jsonb,
    suitable_products JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_published BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

DROP TRIGGER IF EXISTS trg_designs_updated_at ON designs;
CREATE TRIGGER trg_designs_updated_at
    BEFORE UPDATE ON designs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 2. Projects Table (Completed Sites, Engineering Showcase & Progression)
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    category VARCHAR(100) NOT NULL DEFAULT 'Commercial Paving',
    location VARCHAR(255) NOT NULL,
    client_type VARCHAR(50) DEFAULT 'Commercial',
    status VARCHAR(50) NOT NULL DEFAULT 'completed',
    completion_date VARCHAR(50),
    description TEXT NOT NULL,
    scope_summary TEXT,
    materials_used JSONB NOT NULL DEFAULT '[]'::jsonb,
    cover_image_url TEXT NOT NULL,
    gallery_media JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of { id, url, caption, phase: 'before'|'during'|'after'|'finished', sortOrder }
    video_url TEXT,
    is_published BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

DROP TRIGGER IF EXISTS trg_projects_updated_at ON projects;
CREATE TRIGGER trg_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 3. Additional Media Table Columns & Indices
ALTER TABLE media
    ADD COLUMN IF NOT EXISTS category VARCHAR(100) NOT NULL DEFAULT 'general',
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

CREATE INDEX IF NOT EXISTS idx_designs_published ON designs(is_published);
CREATE INDEX IF NOT EXISTS idx_designs_category ON designs(category);
CREATE INDEX IF NOT EXISTS idx_designs_sort_order ON designs(sort_order);

CREATE INDEX IF NOT EXISTS idx_projects_published ON projects(is_published);
CREATE INDEX IF NOT EXISTS idx_projects_category ON projects(category);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_sort_order ON projects(sort_order);

CREATE INDEX IF NOT EXISTS idx_media_category ON media(category);
CREATE INDEX IF NOT EXISTS idx_media_entity ON media(entity_type, entity_id);

-- 4. Row Level Security Policies
ALTER TABLE designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Public can read published designs and projects
CREATE POLICY "Public read published designs"
    ON designs FOR SELECT
    USING (is_published = true OR public.is_staff());

CREATE POLICY "Staff manage designs"
    ON designs FOR ALL
    TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

CREATE POLICY "Public read published projects"
    ON projects FOR SELECT
    USING (is_published = true OR public.is_staff());

CREATE POLICY "Staff manage projects"
    ON projects FOR ALL
    TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());
