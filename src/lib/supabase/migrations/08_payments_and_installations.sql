-- ==============================================================================
-- MODULE 02: MIGRATION 08 — PAYMENTS FOUNDATION
-- XFORCE Construction Management & Customer Platform
-- ==============================================================================

-- 1. Payments Table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_number VARCHAR(50) UNIQUE NOT NULL,
    order_id UUID REFERENCES orders(id) ON DELETE RESTRICT,
    quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(50) NOT NULL CHECK (
        payment_method IN ('cash', 'bank_transfer', 'card_pos', 'ussd', 'other')
    ),
    payment_status VARCHAR(50) NOT NULL DEFAULT 'completed' CHECK (
        payment_status IN ('pending', 'completed', 'failed', 'refunded')
    ),
    reference_number VARCHAR(100),
    payment_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    receipt_url TEXT,
    notes TEXT,
    recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_payments_number ON payments(payment_number);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status);
