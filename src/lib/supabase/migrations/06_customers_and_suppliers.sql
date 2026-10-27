-- ==============================================================================
-- MODULE 02: MIGRATION 06 — CUSTOMERS & SUPPLIERS FOUNDATION
-- XFORCE Construction Management & Customer Platform
-- ==============================================================================

-- 1. Customers Table (Supports both guest requests, portal users & walk-ins)
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_number VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    full_name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    gps_latitude NUMERIC(10, 7),
    gps_longitude NUMERIC(10, 7),
    customer_type VARCHAR(50) NOT NULL DEFAULT 'individual' CHECK (
        customer_type IN ('individual', 'contractor', 'corporate', 'distributor')
    ),
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (
        status IN ('active', 'inactive', 'lead', 'blacklisted')
    ),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_number ON customers(customer_number);
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);

DROP TRIGGER IF EXISTS trg_customers_updated_at ON customers;
CREATE TRIGGER trg_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 2. Suppliers Table
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_number VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    bank_details JSONB,
    tax_id VARCHAR(100),
    notes TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (
        status IN ('active', 'inactive', 'suspended')
    ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_suppliers_number ON suppliers(supplier_number);
CREATE INDEX IF NOT EXISTS idx_suppliers_phone ON suppliers(phone);
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(status);

DROP TRIGGER IF EXISTS trg_suppliers_updated_at ON suppliers;
CREATE TRIGGER trg_suppliers_updated_at
    BEFORE UPDATE ON suppliers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
