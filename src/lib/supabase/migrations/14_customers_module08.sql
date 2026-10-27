-- ==============================================================================
-- MODULE 08: MIGRATION 14 — CUSTOMER MANAGEMENT ENHANCEMENTS
-- XFORCE Construction Management & Customer Platform (Brand: X-FORCE BRICKS)
-- ==============================================================================

-- 1. Ensure customers table exists and add Module 08 fields
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
    customer_type VARCHAR(50) NOT NULL DEFAULT 'individual',
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Add Module 08 specific columns if not existing
ALTER TABLE customers ADD COLUMN IF NOT EXISTS first_name VARCHAR(120);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_name VARCHAR(120);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS alt_phone VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'Nigeria';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS preferred_contact_method VARCHAR(50) DEFAULT 'phone';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS registration_source VARCHAR(50) DEFAULT 'staff';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS account_status VARCHAR(50) DEFAULT 'no_account';

-- 3. Drop legacy tight check constraint on customer_type and status if present
DO $$
BEGIN
    -- Drop old check constraint if it restricts customer_type to 4 options
    IF EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage 
        WHERE table_name = 'customers' AND constraint_name = 'customers_customer_type_check'
    ) THEN
        ALTER TABLE customers DROP CONSTRAINT customers_customer_type_check;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage 
        WHERE table_name = 'customers' AND constraint_name = 'customers_status_check'
    ) THEN
        ALTER TABLE customers DROP CONSTRAINT customers_status_check;
    END IF;
END $$;

-- 4. Add updated check constraints supporting all business classifications
ALTER TABLE customers ADD CONSTRAINT chk_customers_status CHECK (
    status IN ('active', 'inactive', 'suspended', 'lead', 'blacklisted')
);

ALTER TABLE customers ADD CONSTRAINT chk_customers_account_status CHECK (
    account_status IN ('active', 'pending', 'no_account', 'suspended')
);

ALTER TABLE customers ADD CONSTRAINT chk_customers_preferred_contact CHECK (
    preferred_contact_method IN ('phone', 'whatsapp', 'email', 'sms')
);

-- 5. Indexes for fast customer lookup and duplicate verification
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_number ON customers(customer_number);
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_type ON customers(customer_type);
CREATE INDEX IF NOT EXISTS idx_customers_full_name ON customers(full_name);

-- 6. Trigger for updated_at
DROP TRIGGER IF EXISTS trg_customers_updated_at ON customers;
CREATE TRIGGER trg_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 7. Row Level Security
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Customer can view their own profile
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'customers' AND policyname = 'Customer view own record'
    ) THEN
        CREATE POLICY "Customer view own record"
            ON customers FOR SELECT
            TO authenticated
            USING (user_id = auth.uid() OR public.is_staff());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'customers' AND policyname = 'Customer update own profile'
    ) THEN
        CREATE POLICY "Customer update own profile"
            ON customers FOR UPDATE
            TO authenticated
            USING (user_id = auth.uid() OR public.is_staff());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'customers' AND policyname = 'Staff manage customers'
    ) THEN
        CREATE POLICY "Staff manage customers"
            ON customers FOR ALL
            TO authenticated
            USING (public.is_staff());
    END IF;
END $$;
