-- ==============================================================================
-- MODULE 02: MIGRATION 05 — LOCATIONS, INVENTORY BALANCES & STOCK MOVEMENTS
-- XFORCE Construction Management & Customer Platform
-- ==============================================================================

-- 1. Physical Stock Locations (Main Warehouse, Showroom Store, Yard, etc.)
CREATE TABLE IF NOT EXISTS stock_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    address TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_stock_locations_code ON stock_locations(code);
CREATE INDEX IF NOT EXISTS idx_stock_locations_active ON stock_locations(is_active);

DROP TRIGGER IF EXISTS trg_stock_locations_updated_at ON stock_locations;
CREATE TRIGGER trg_stock_locations_updated_at
    BEFORE UPDATE ON stock_locations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 2. Inventory Balances (Multi-location item balances)
CREATE TABLE IF NOT EXISTS inventory_balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES stock_locations(id) ON DELETE RESTRICT,
    quantity_on_hand NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),
    quantity_reserved NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (quantity_reserved >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_balances_unique 
    ON inventory_balances (product_id, COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'::uuid), location_id);

CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory_balances(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_variant ON inventory_balances(variant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_location ON inventory_balances(location_id);

DROP TRIGGER IF EXISTS trg_inventory_balances_updated_at ON inventory_balances;
CREATE TRIGGER trg_inventory_balances_updated_at
    BEFORE UPDATE ON inventory_balances
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 3. Stock Movements (Immutable Ledger of Stock Changes)
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    movement_number VARCHAR(100) UNIQUE,
    movement_type VARCHAR(50) NOT NULL CHECK (
        movement_type IN ('opening_balance', 'received', 'issued', 'transfer', 'adjustment', 'wastage', 'return', 'damaged')
    ),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    variant_id UUID REFERENCES product_variants(id) ON DELETE RESTRICT,
    source_location_id UUID REFERENCES stock_locations(id) ON DELETE RESTRICT,
    destination_location_id UUID REFERENCES stock_locations(id) ON DELETE RESTRICT,
    quantity NUMERIC(12, 2) NOT NULL CHECK (quantity > 0),
    unit_cost NUMERIC(15, 2) CHECK (unit_cost >= 0),
    reference_type VARCHAR(50), -- 'purchase_order', 'sales_order', 'manual_adjustment', 'initial_import', 'installation'
    reference_id VARCHAR(100),
    notes TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_movements_type ON stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_movements_ref ON stock_movements(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_movements_created_at ON stock_movements(created_at DESC);
