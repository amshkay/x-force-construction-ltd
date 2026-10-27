-- ==============================================================================
-- MODULE 09: MIGRATION 16 — CUSTOMER REQUESTS & QUOTATION MANAGEMENT
-- XFORCE Construction Management & Customer Platform (Brand: X-FORCE BRICKS)
-- ==============================================================================

-- 1. Customer Requests Table
CREATE TABLE IF NOT EXISTS customer_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    request_type VARCHAR(50) NOT NULL DEFAULT 'general_quotation' CHECK (
        request_type IN (
            'product_only',
            'service_only',
            'product_and_service',
            'site_inspection',
            'general_quotation'
        )
    ),
    status VARCHAR(50) NOT NULL DEFAULT 'submitted' CHECK (
        status IN (
            'submitted',
            'under_review',
            'awaiting_customer_info',
            'quotation_prepared',
            'quotation_sent',
            'customer_reviewing',
            'accepted',
            'declined',
            'cancelled',
            'closed'
        )
    ),
    -- Customer Contact Snapshot (supports guest users and rapid access)
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    customer_email VARCHAR(255),
    company_name VARCHAR(255),
    -- Project & Site Details
    project_address TEXT,
    project_city VARCHAR(100),
    project_state VARCHAR(100),
    gps_latitude NUMERIC(10, 7),
    gps_longitude NUMERIC(10, 7),
    desired_timeline VARCHAR(100),
    preferred_contact_method VARCHAR(50) DEFAULT 'phone' CHECK (
        preferred_contact_method IN ('phone', 'whatsapp', 'email', 'sms')
    ),
    -- Notes & Communication
    customer_comments TEXT,
    internal_notes TEXT,
    -- Assignment
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    assigned_to_name VARCHAR(255),
    -- Supporting Media / Attachments (array of { url, name, size, mimeType })
    attachments JSONB DEFAULT '[]'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_requests_number ON customer_requests(request_number);
CREATE INDEX IF NOT EXISTS idx_requests_customer ON customer_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON customer_requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_type ON customer_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_requests_created_at ON customer_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_requests_assigned_to ON customer_requests(assigned_to);

DROP TRIGGER IF EXISTS trg_customer_requests_updated_at ON customer_requests;
CREATE TRIGGER trg_customer_requests_updated_at
    BEFORE UPDATE ON customer_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 2. Customer Request Items Table
CREATE TABLE IF NOT EXISTS customer_request_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL REFERENCES customer_requests(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
    item_name VARCHAR(255) NOT NULL,
    item_category VARCHAR(100),
    quantity NUMERIC(12, 2) NOT NULL CHECK (quantity > 0),
    unit VARCHAR(50) NOT NULL DEFAULT 'piece',
    customer_notes TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_request_items_request ON customer_request_items(request_id);
CREATE INDEX IF NOT EXISTS idx_request_items_product ON customer_request_items(product_id);

-- 3. Enhance Quotations Table for Module 09
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS request_id UUID REFERENCES customer_requests(id) ON DELETE SET NULL;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50);
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255);
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS customer_address TEXT;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'NGN';
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC(5, 2) DEFAULT 0;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS other_charges_fee NUMERIC(15, 2) DEFAULT 0;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS other_charges_description VARCHAR(255);
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5, 2) DEFAULT 0;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS accepted_by VARCHAR(255);
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS declined_at TIMESTAMPTZ;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS decline_reason TEXT;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ;

-- Drop old status check if needed and apply expanded status constraint
DO $$
BEGIN
    ALTER TABLE quotations DROP CONSTRAINT IF EXISTS quotations_status_check;
    ALTER TABLE quotations ADD CONSTRAINT quotations_status_check CHECK (
        status IN ('draft', 'pending_approval', 'sent', 'viewed', 'accepted', 'declined', 'expired', 'converted', 'cancelled')
    );
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_quotations_request ON quotations(request_id);

-- 4. Enhance Quotation Items Table
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS item_type VARCHAR(50) NOT NULL DEFAULT 'product';
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS sku VARCHAR(100);
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(15, 2);

-- 5. Row Level Security Policies
ALTER TABLE customer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_request_items ENABLE ROW LEVEL SECURITY;

-- Customer Requests RLS
DROP POLICY IF EXISTS "Staff manage all customer requests" ON customer_requests;
CREATE POLICY "Staff manage all customer requests"
    ON customer_requests FOR ALL TO authenticated
    USING (public.is_staff());

DROP POLICY IF EXISTS "Public can submit customer requests" ON customer_requests;
CREATE POLICY "Public can submit customer requests"
    ON customer_requests FOR INSERT TO anon, authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Customers view own requests" ON customer_requests;
CREATE POLICY "Customers view own requests"
    ON customer_requests FOR SELECT TO authenticated
    USING (
        customer_id IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM customers c
            WHERE c.id = customer_requests.customer_id AND c.user_id = auth.uid()
        )
    );

-- Customer Request Items RLS
DROP POLICY IF EXISTS "Staff manage all customer request items" ON customer_request_items;
CREATE POLICY "Staff manage all customer request items"
    ON customer_request_items FOR ALL TO authenticated
    USING (public.is_staff());

DROP POLICY IF EXISTS "Public can insert request items" ON customer_request_items;
CREATE POLICY "Public can insert request items"
    ON customer_request_items FOR INSERT TO anon, authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Customers view own request items" ON customer_request_items;
CREATE POLICY "Customers view own request items"
    ON customer_request_items FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM customer_requests r
            JOIN customers c ON r.customer_id = c.id
            WHERE r.id = customer_request_items.request_id AND c.user_id = auth.uid()
        )
    );

-- 6. Register Permissions for Module 09
INSERT INTO permissions (code, module, description)
VALUES
    ('requests.view', 'requests', 'View customer requests and inquiry pipeline'),
    ('requests.create', 'requests', 'Submit customer requests manually on behalf of clients'),
    ('requests.update', 'requests', 'Update customer request status and details'),
    ('requests.assign', 'requests', 'Assign requests to specific sales engineers or staff'),
    ('requests.close', 'requests', 'Close or cancel customer requests'),
    ('quotations.send', 'quotations', 'Send quotations to customer via digital channels'),
    ('quotations.cancel', 'quotations', 'Cancel active or draft quotations')
ON CONFLICT (code) DO UPDATE SET
    description = EXCLUDED.description;

-- Assign new permissions to Administrator role
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    'a0000000-0000-0000-0000-000000000001'::uuid, 
    p.id 
FROM permissions p
WHERE p.code IN (
    'requests.view', 'requests.create', 'requests.update', 'requests.assign', 'requests.close',
    'quotations.send', 'quotations.cancel'
)
ON CONFLICT DO NOTHING;

-- Assign operational permissions to Sales Manager role
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    'a0000000-0000-0000-0000-000000000002'::uuid, 
    p.id 
FROM permissions p
WHERE p.code IN (
    'requests.view', 'requests.create', 'requests.update', 'requests.assign', 'requests.close',
    'quotations.view', 'quotations.create', 'quotations.update', 'quotations.approve',
    'quotations.send', 'quotations.cancel'
)
ON CONFLICT DO NOTHING;
