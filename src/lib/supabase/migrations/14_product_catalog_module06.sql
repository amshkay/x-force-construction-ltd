-- ==============================================================================
-- MODULE 06: MIGRATION 14 — PRODUCT CATALOGUE & VARIANTS ENHANCEMENTS
-- XFORCE Construction Management & Customer Platform (Brand: X-FORCE BRICKS)
-- Single-Business Architecture — Generic Building Materials Catalogue Foundation
-- ==============================================================================

-- 1. Extend products table with generic catalogue features
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS short_description TEXT,
    ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS price_on_request BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS images JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- 2. Extend product_variants table with attributes and sort order
ALTER TABLE product_variants
    ADD COLUMN IF NOT EXISTS attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- 3. Additional performance indices
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured);
CREATE INDEX IF NOT EXISTS idx_products_sort_order ON products(sort_order);
CREATE INDEX IF NOT EXISTS idx_product_variants_sort_order ON product_variants(sort_order);

-- 4. Initial Foundational Product Categories for XFORCE Construction Ltd
-- (Idempotent seed of standard building material departments)
INSERT INTO categories (id, name, slug, description, is_active, sort_order)
VALUES
    ('c1000000-0000-0000-0000-000000000001', 'Interlocking Bricks & Blocks', 'interlocking-bricks', 'Eco-friendly, precision-engineered soil-cement hydraulic interlocking blocks and hollow blocks.', true, 1),
    ('c1000000-0000-0000-0000-000000000002', 'Paving Stones & Walkway Pavers', 'paving-stones', 'Heavy-duty industrial and residential concrete pavers, interlocking stones, and kerbs.', true, 2),
    ('c1000000-0000-0000-0000-000000000003', 'Raw Aggregates & Binders', 'aggregates-binders', 'High-grade Portland cement, sharp sand, granite quarry dust, and natural stone gravel.', true, 3),
    ('c1000000-0000-0000-0000-000000000004', 'Coping & Structural Concrete', 'coping-structural', 'Wall coping caps, pillar caps, precast lintels, drainage gutters, and fencing balustrades.', true, 4),
    ('c1000000-0000-0000-0000-000000000005', 'Installation Accessories & Tools', 'installation-accessories', 'Specialist alignment rubbers, bricklaying mallets, jointing sand, and sealer chemicals.', true, 5)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    sort_order = EXCLUDED.sort_order;
