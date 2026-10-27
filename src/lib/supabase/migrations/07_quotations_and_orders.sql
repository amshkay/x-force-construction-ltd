-- ==============================================================================
-- MODULE 02: MIGRATION 07 — QUOTATIONS & ORDERS FOUNDATION
-- XFORCE Construction Management & Customer Platform
-- ==============================================================================

-- 1. Quotations Table
CREATE TABLE IF NOT EXISTS quotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quotation_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (
        status IN ('draft', 'pending_approval', 'sent', 'approved', 'rejected', 'expired', 'converted')
    ),
    quotation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until DATE NOT NULL,
    subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
    discount_amount NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    delivery_fee NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
    installation_fee NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (installation_fee >= 0),
    tax_amount NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    deposit_required NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (deposit_required >= 0),
    balance_due NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (balance_due >= 0),
    notes TEXT,
    terms_and_conditions TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_quotations_number ON quotations(quotation_number);
CREATE INDEX IF NOT EXISTS idx_quotations_customer ON quotations(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotations_date ON quotations(quotation_date DESC);

DROP TRIGGER IF EXISTS trg_quotations_updated_at ON quotations;
CREATE TRIGGER trg_quotations_updated_at
    BEFORE UPDATE ON quotations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 2. Quotation Line Items
CREATE TABLE IF NOT EXISTS quotation_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
    variant_id UUID REFERENCES product_variants(id) ON DELETE RESTRICT,
    description VARCHAR(255) NOT NULL,
    unit VARCHAR(50) NOT NULL DEFAULT 'piece',
    quantity NUMERIC(12, 2) NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(15, 2) NOT NULL CHECK (unit_price >= 0),
    discount_amount NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    line_total NUMERIC(15, 2) NOT NULL CHECK (line_total >= 0),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_quotation_items_quote ON quotation_items(quotation_id);

-- 3. Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (
        status IN ('draft', 'confirmed', 'processing', 'ready_for_dispatch', 'dispatched', 'delivered', 'completed', 'cancelled')
    ),
    payment_status VARCHAR(50) NOT NULL DEFAULT 'unpaid' CHECK (
        payment_status IN ('unpaid', 'partially_paid', 'paid', 'refunded')
    ),
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
    discount_amount NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    delivery_fee NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
    installation_fee NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (installation_fee >= 0),
    tax_amount NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    amount_paid NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
    balance_due NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (balance_due >= 0),
    delivery_address TEXT,
    delivery_state VARCHAR(100),
    delivery_city VARCHAR(100),
    delivery_notes TEXT,
    requires_installation BOOLEAN NOT NULL DEFAULT false,
    internal_notes TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(order_date DESC);

DROP TRIGGER IF EXISTS trg_orders_updated_at ON orders;
CREATE TRIGGER trg_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4. Order Line Items
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
    variant_id UUID REFERENCES product_variants(id) ON DELETE RESTRICT,
    description VARCHAR(255) NOT NULL,
    unit VARCHAR(50) NOT NULL DEFAULT 'piece',
    quantity NUMERIC(12, 2) NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(15, 2) NOT NULL CHECK (unit_price >= 0),
    unit_cost NUMERIC(15, 2) CHECK (unit_cost >= 0),
    discount_amount NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    line_total NUMERIC(15, 2) NOT NULL CHECK (line_total >= 0),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
