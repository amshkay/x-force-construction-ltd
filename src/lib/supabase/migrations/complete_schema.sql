-- ==============================================================================
-- XFORCE CONSTRUCTION MANAGEMENT & CUSTOMER PLATFORM (X-FORCE BRICKS)
-- MODULE 02: COMPLETE CONSOLIDATED POSTGRESQL SCHEMA
-- Single-Business Architecture (No multi-tenancy, No tenant_id)
-- ==============================================================================

-- 1. EXTENSIONS & UTILITIES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_business_number(
    prefix TEXT,
    target_table TEXT,
    target_column TEXT
)
RETURNS TEXT AS $$
DECLARE
    seq_val BIGINT;
    generated_number TEXT;
    sql_stmt TEXT;
BEGIN
    sql_stmt := format('SELECT COUNT(*) + 1 FROM %I', target_table);
    EXECUTE sql_stmt INTO seq_val;
    generated_number := prefix || '-' || LPAD(seq_val::TEXT, 6, '0');
    RETURN generated_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 2. ROLES & PERMISSIONS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);

CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(100) UNIQUE NOT NULL,
    module VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_permissions_code ON permissions(code);
CREATE INDEX IF NOT EXISTS idx_permissions_module ON permissions(module);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);

DROP TRIGGER IF EXISTS trg_roles_updated_at ON roles;
CREATE TRIGGER trg_roles_updated_at
    BEFORE UPDATE ON roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 3. PROFILES & USER AUTHENTICATION
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    avatar_url TEXT,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'pending_verification')),
    password_setup_required BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role_id ON profiles(role_id);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM profiles p
        JOIN roles r ON p.role_id = r.id
        WHERE p.id = auth.uid()
          AND r.name = 'administrator'
          AND p.status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM profiles p
        JOIN roles r ON p.role_id = r.id
        WHERE p.id = auth.uid()
          AND r.name IN ('administrator', 'sales_manager', 'warehouse_staff', 'installation_staff', 'pos_staff')
          AND p.status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 4. BUSINESS SETTINGS & MEDIA
-- ------------------------------------------------------------------------------
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
    default_request_prefix VARCHAR(20) DEFAULT 'XFR',
    default_tracking_prefix VARCHAR(20) DEFAULT 'TRK',
    default_payment_prefix VARCHAR(20) DEFAULT 'RCP',
    default_invoice_prefix VARCHAR(20) DEFAULT 'INV',
    short_name VARCHAR(50) DEFAULT 'X-FORCE',
    business_description TEXT,
    business_category VARCHAR(100) DEFAULT 'Manufacturer & Direct Supplier',
    secondary_phone VARCHAR(50),
    location_description TEXT,
    map_link_url TEXT,
    primary_brand_color VARCHAR(30) DEFAULT '#ea580c',
    secondary_brand_color VARCHAR(30) DEFAULT '#0f172a',
    accent_brand_color VARCHAR(30) DEFAULT '#f97316',
    branding JSONB DEFAULT '{}'::JSONB,
    regional_settings JSONB DEFAULT '{}'::JSONB,
    numbering_settings JSONB DEFAULT '{}'::JSONB,
    payment_methods JSONB DEFAULT '[]'::JSONB,
    supported_categories JSONB DEFAULT '[]'::JSONB,
    website_content JSONB DEFAULT '{}'::JSONB,
    version INTEGER DEFAULT 1,
    features JSONB DEFAULT '{"installationsEnabled": true, "posOfflineTransactions": true, "customerPortalEnabled": true, "digitalQuotations": true, "warehouseTracking": true}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

DROP TRIGGER IF EXISTS trg_business_settings_updated_at ON business_settings;
CREATE TRIGGER trg_business_settings_updated_at
    BEFORE UPDATE ON business_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

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
    entity_type VARCHAR(100),
    entity_id UUID,
    is_published BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_media_entity ON media(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_media_bucket ON media(storage_bucket);
CREATE INDEX IF NOT EXISTS idx_media_is_published ON media(is_published);

-- ------------------------------------------------------------------------------
-- 5. CATEGORIES, PRODUCTS & VARIANTS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(150) UNIQUE NOT NULL,
    description TEXT,
    image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);

DROP TRIGGER IF EXISTS trg_categories_updated_at ON categories;
CREATE TRIGGER trg_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    sku VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    unit VARCHAR(50) NOT NULL DEFAULT 'piece',
    cost_price NUMERIC(15, 2) CHECK (cost_price >= 0),
    selling_price NUMERIC(15, 2) NOT NULL CHECK (selling_price >= 0),
    minimum_stock NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (minimum_stock >= 0),
    reorder_level NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (reorder_level >= 0),
    requires_installation BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_published BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_published ON products(is_published);

DROP TRIGGER IF EXISTS trg_products_updated_at ON products;
CREATE TRIGGER trg_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS product_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) UNIQUE NOT NULL,
    color VARCHAR(100),
    size VARCHAR(100),
    finish VARCHAR(100),
    description TEXT,
    image_url TEXT,
    price_override NUMERIC(15, 2) CHECK (price_override >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_variants_sku ON product_variants(sku);

DROP TRIGGER IF EXISTS trg_product_variants_updated_at ON product_variants;
CREATE TRIGGER trg_product_variants_updated_at
    BEFORE UPDATE ON product_variants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 6. STOCK LOCATIONS & INVENTORY
-- ------------------------------------------------------------------------------
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

DROP TRIGGER IF EXISTS trg_stock_locations_updated_at ON stock_locations;
CREATE TRIGGER trg_stock_locations_updated_at
    BEFORE UPDATE ON stock_locations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

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

DROP TRIGGER IF EXISTS trg_inventory_balances_updated_at ON inventory_balances;
CREATE TRIGGER trg_inventory_balances_updated_at
    BEFORE UPDATE ON inventory_balances
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

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
    reference_type VARCHAR(50),
    reference_id VARCHAR(100),
    notes TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_movements_created_at ON stock_movements(created_at DESC);

-- ------------------------------------------------------------------------------
-- 7. CUSTOMERS & SUPPLIERS
-- ------------------------------------------------------------------------------
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
CREATE INDEX IF NOT EXISTS idx_customers_number ON customers(customer_number);

DROP TRIGGER IF EXISTS trg_customers_updated_at ON customers;
CREATE TRIGGER trg_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

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

DROP TRIGGER IF EXISTS trg_suppliers_updated_at ON suppliers;
CREATE TRIGGER trg_suppliers_updated_at
    BEFORE UPDATE ON suppliers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 8. QUOTATIONS & ORDERS
-- ------------------------------------------------------------------------------
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

DROP TRIGGER IF EXISTS trg_quotations_updated_at ON quotations;
CREATE TRIGGER trg_quotations_updated_at
    BEFORE UPDATE ON quotations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

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

DROP TRIGGER IF EXISTS trg_orders_updated_at ON orders;
CREATE TRIGGER trg_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

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

-- ------------------------------------------------------------------------------
-- 9. PAYMENTS, AUDIT LOGS & OFFLINE SYNC
-- ------------------------------------------------------------------------------
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

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email VARCHAR(255),
    actor_user_email VARCHAR(255),
    actor_user_name VARCHAR(255),
    user_role VARCHAR(100),
    actor_user_role VARCHAR(100),
    action VARCHAR(150) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    entity_reference VARCHAR(255),
    old_value JSONB,
    previous_values JSONB,
    new_value JSONB,
    new_values JSONB,
    reason TEXT,
    metadata JSONB,
    source VARCHAR(50) NOT NULL DEFAULT 'Admin Web',
    status VARCHAR(20) NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failure')),
    ip_address VARCHAR(45),
    user_agent TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_ref ON audit_logs(entity_reference);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_source ON audit_logs(source);
CREATE INDEX IF NOT EXISTS idx_audit_logs_status ON audit_logs(status);

CREATE TABLE IF NOT EXISTS offline_sync_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_mutation_id VARCHAR(100) UNIQUE NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    client_timestamp TIMESTAMPTZ NOT NULL,
    server_timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    status VARCHAR(50) NOT NULL DEFAULT 'applied' CHECK (
        status IN ('applied', 'conflict_resolved', 'rejected')
    ),
    details JSONB,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_offline_sync_client_id ON offline_sync_log(client_mutation_id);

-- ------------------------------------------------------------------------------
-- 10. ROW LEVEL SECURITY (RLS) ACTIVATION & POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE offline_sync_log ENABLE ROW LEVEL SECURITY;

-- Base Policies
CREATE POLICY "Authenticated users view roles" ON roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage roles" ON roles FOR ALL TO authenticated USING (public.is_admin());

CREATE POLICY "Authenticated users view permissions" ON permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage permissions" ON permissions FOR ALL TO authenticated USING (public.is_admin());

CREATE POLICY "Authenticated users view role_permissions" ON role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage role_permissions" ON role_permissions FOR ALL TO authenticated USING (public.is_admin());

CREATE POLICY "Users view own profile or staff view all" ON profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_staff());
CREATE POLICY "Users update own profile or admin manage" ON profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.is_admin());
CREATE POLICY "Admins insert profiles" ON profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid() OR public.is_admin());

CREATE POLICY "Public read business settings" ON business_settings FOR SELECT USING (true);
CREATE POLICY "Admins manage business settings" ON business_settings FOR ALL TO authenticated USING (public.is_admin());

CREATE POLICY "Public read active categories" ON categories FOR SELECT USING (is_active = true OR public.is_staff());
CREATE POLICY "Staff manage categories" ON categories FOR ALL TO authenticated USING (public.is_staff());

CREATE POLICY "Public read active published products" ON products FOR SELECT USING ((is_active = true AND is_published = true) OR public.is_staff());
CREATE POLICY "Staff manage products" ON products FOR ALL TO authenticated USING (public.is_staff());

CREATE POLICY "Public read active variants" ON product_variants FOR SELECT USING (is_active = true OR public.is_staff());
CREATE POLICY "Staff manage product variants" ON product_variants FOR ALL TO authenticated USING (public.is_staff());

CREATE POLICY "Staff view stock locations" ON stock_locations FOR SELECT TO authenticated USING (public.is_staff());
CREATE POLICY "Admins manage stock locations" ON stock_locations FOR ALL TO authenticated USING (public.is_admin());

CREATE POLICY "Staff view inventory balances" ON inventory_balances FOR SELECT TO authenticated USING (public.is_staff());
CREATE POLICY "Staff update inventory balances" ON inventory_balances FOR ALL TO authenticated USING (public.is_staff());

CREATE POLICY "Staff view stock movements" ON stock_movements FOR SELECT TO authenticated USING (public.is_staff());
CREATE POLICY "Staff insert stock movements" ON stock_movements FOR INSERT TO authenticated WITH CHECK (public.is_staff());

CREATE POLICY "Staff view customers or customer views own" ON customers FOR SELECT TO authenticated USING (public.is_staff() OR user_id = auth.uid());
CREATE POLICY "Staff or customer create customer record" ON customers FOR INSERT TO authenticated WITH CHECK (public.is_staff() OR user_id = auth.uid());
CREATE POLICY "Staff or customer update customer record" ON customers FOR UPDATE TO authenticated USING (public.is_staff() OR user_id = auth.uid());

CREATE POLICY "Staff manage suppliers" ON suppliers FOR ALL TO authenticated USING (public.is_staff());

CREATE POLICY "Staff or customer view quotations" ON quotations FOR SELECT TO authenticated USING (public.is_staff() OR EXISTS (SELECT 1 FROM customers c WHERE c.id = quotations.customer_id AND c.user_id = auth.uid()));
CREATE POLICY "Staff or customer create quotations" ON quotations FOR INSERT TO authenticated WITH CHECK (public.is_staff() OR EXISTS (SELECT 1 FROM customers c WHERE c.id = customer_id AND c.user_id = auth.uid()));
CREATE POLICY "Staff manage quotations" ON quotations FOR UPDATE TO authenticated USING (public.is_staff());

CREATE POLICY "Staff or customer view quotation items" ON quotation_items FOR SELECT TO authenticated USING (public.is_staff() OR EXISTS (SELECT 1 FROM quotations q JOIN customers c ON q.customer_id = c.id WHERE q.id = quotation_items.quotation_id AND c.user_id = auth.uid()));
CREATE POLICY "Staff manage quotation items" ON quotation_items FOR ALL TO authenticated USING (public.is_staff());

CREATE POLICY "Staff or customer view orders" ON orders FOR SELECT TO authenticated USING (public.is_staff() OR EXISTS (SELECT 1 FROM customers c WHERE c.id = orders.customer_id AND c.user_id = auth.uid()));
CREATE POLICY "Staff manage orders" ON orders FOR ALL TO authenticated USING (public.is_staff());

CREATE POLICY "Staff or customer view order items" ON order_items FOR SELECT TO authenticated USING (public.is_staff() OR EXISTS (SELECT 1 FROM orders o JOIN customers c ON o.customer_id = c.id WHERE o.id = order_items.order_id AND c.user_id = auth.uid()));
CREATE POLICY "Staff manage order items" ON order_items FOR ALL TO authenticated USING (public.is_staff());

CREATE POLICY "Staff or customer view payments" ON payments FOR SELECT TO authenticated USING (public.is_staff() OR EXISTS (SELECT 1 FROM customers c WHERE c.id = payments.customer_id AND c.user_id = auth.uid()));
CREATE POLICY "Staff manage payments" ON payments FOR ALL TO authenticated USING (public.is_staff());

CREATE POLICY "Public read published media" ON media FOR SELECT USING (is_published = true OR public.is_staff());
CREATE POLICY "Staff manage media" ON media FOR ALL TO authenticated USING (public.is_staff());

CREATE POLICY "Admins view audit logs" ON audit_logs FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Staff insert audit logs" ON audit_logs FOR INSERT TO authenticated WITH CHECK (public.is_staff());

CREATE POLICY "Staff view offline sync logs" ON offline_sync_log FOR SELECT TO authenticated USING (public.is_staff() OR user_id = auth.uid());
CREATE POLICY "Staff or user insert offline sync logs" ON offline_sync_log FOR INSERT TO authenticated WITH CHECK (public.is_staff() OR user_id = auth.uid());

-- ------------------------------------------------------------------------------
-- 11. INITIAL SEEDS (Roles, Permissions, Locations)
-- ------------------------------------------------------------------------------
INSERT INTO roles (id, name, display_name, description, is_system)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'administrator', 'Administrator', 'Full unrestricted operational and administrative access', true),
    ('a0000000-0000-0000-0000-000000000002', 'sales_manager', 'Sales Manager', 'Management of quotations, orders, customers, and price approvals', true),
    ('a0000000-0000-0000-0000-000000000003', 'warehouse_staff', 'Warehouse Staff', 'Stock movements, physical counts, receiving, and dispatching', true),
    ('a0000000-0000-0000-0000-000000000004', 'installation_staff', 'Installation Staff', 'On-site installation job execution, measurement and quality reports', true),
    ('a0000000-0000-0000-0000-000000000005', 'pos_staff', 'POS / Cashier Staff', 'Point of sale counter sales, direct receipts, and cash registry', true)
ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description;

INSERT INTO permissions (code, module, description)
VALUES
    ('products.view', 'products', 'View catalog products and pricing'),
    ('products.create', 'products', 'Create new product listings'),
    ('products.update', 'products', 'Update existing product information and prices'),
    ('products.delete', 'products', 'Archive or delete products'),
    ('inventory.view', 'inventory', 'View inventory quantities across locations'),
    ('inventory.adjust', 'inventory', 'Perform manual stock adjustments and write-offs'),
    ('inventory.receive', 'inventory', 'Record incoming stock receipts from suppliers'),
    ('inventory.issue', 'inventory', 'Issue stock for orders and installations'),
    ('warehouse.view', 'warehouse', 'View physical warehouse locations and bays'),
    ('warehouse.update', 'warehouse', 'Manage warehouse locations and bin assignments'),
    ('customers.view', 'customers', 'View customer directory and contact information'),
    ('customers.create', 'customers', 'Add new customer records'),
    ('customers.update', 'customers', 'Modify customer contact and delivery profiles'),
    ('quotations.view', 'quotations', 'View quotations and cost estimates'),
    ('quotations.create', 'quotations', 'Generate draft quotations'),
    ('quotations.update', 'quotations', 'Edit quotations and line items'),
    ('quotations.approve', 'quotations', 'Approve quotations and authorize discounts'),
    ('orders.view', 'orders', 'View customer orders and fulfillment states'),
    ('orders.create', 'orders', 'Create and book orders'),
    ('orders.update', 'orders', 'Update order details and dispatch schedules'),
    ('orders.cancel', 'orders', 'Cancel orders and release reserved stock'),
    ('payments.view', 'payments', 'View payment records and ledger receipts'),
    ('payments.create', 'payments', 'Record customer payments and issue receipts'),
    ('installations.view', 'installations', 'View site installation schedules'),
    ('installations.update', 'installations', 'Update installation status and upload site proof'),
    ('staff.view', 'staff', 'View staff profiles and team members'),
    ('staff.manage', 'staff', 'Invite staff and manage roles and permissions'),
    ('reports.view', 'reports', 'View sales, margin, and stock analytics'),
    ('settings.manage', 'settings', 'Manage business configuration, branding, and rules')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT 'a0000000-0000-0000-0000-000000000001'::uuid, p.id FROM permissions p
ON CONFLICT DO NOTHING;

INSERT INTO stock_locations (name, code, address, is_active, is_default)
VALUES 
    ('Main Factory & Yard', 'MAIN-WH', 'KM 14, Expressway Industrial Corridor, Lagos', true, true),
    ('Lekki Showroom & Store', 'SHOWROOM-01', 'Admiralty Way, Lekki Phase 1, Lagos', true, false)
ON CONFLICT (code) DO NOTHING;

INSERT INTO business_settings (id, company_name, public_brand_name)
VALUES ('current_business', 'XFORCE CONSTRUCTION LTD', 'X-FORCE BRICKS')
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 12. AUTOMATIC PROFILE TRIGGER & ADMIN REPAIR (Module 27)
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS password_setup_required BOOLEAN NOT NULL DEFAULT false;

-- Profile bootstrap trigger for auth.users
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
    admin_role_id UUID;
    is_admin_account BOOLEAN;
BEGIN
    SELECT id INTO admin_role_id FROM public.roles WHERE name = 'administrator' LIMIT 1;
    IF admin_role_id IS NULL THEN
        admin_role_id := 'a0000000-0000-0000-0000-000000000001'::uuid;
    END IF;

    is_admin_account := (NEW.id = '4a56de99-4eb2-4ae2-9e94-b7dceb45976f'::uuid OR lower(NEW.email) = 'admin@xforce.com');

    INSERT INTO public.profiles (
        id,
        full_name,
        email,
        phone,
        avatar_url,
        role_id,
        status,
        password_setup_required,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            CASE WHEN is_admin_account THEN 'Engr. David Adeleke' ELSE split_part(NEW.email, '@', 1) END
        ),
        NEW.email,
        COALESCE(NEW.phone, CASE WHEN is_admin_account THEN '+234 802 111 2233' ELSE NULL END),
        NEW.raw_user_meta_data->>'avatar_url',
        admin_role_id,
        'active',
        false,
        now(),
        now()
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = CASE WHEN is_admin_account THEN 'Engr. David Adeleke' ELSE EXCLUDED.full_name END,
        email = EXCLUDED.email,
        role_id = admin_role_id,
        status = 'active',
        password_setup_required = false,
        updated_at = now();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Repair administrator profile if UID exists in auth.users
DO $$
DECLARE
    target_uid UUID := '4a56de99-4eb2-4ae2-9e94-b7dceb45976f'::uuid;
    admin_role_id UUID := 'a0000000-0000-0000-0000-000000000001'::uuid;
    found_uid UUID;
BEGIN
    -- Check if user exists in auth.users by target UID
    SELECT id INTO found_uid FROM auth.users WHERE id = target_uid LIMIT 1;

    -- If not found by UID, check if user exists by admin email
    IF found_uid IS NULL THEN
        SELECT id INTO found_uid FROM auth.users WHERE lower(email) = 'admin@xforce.com' LIMIT 1;
        -- If found by email under another UUID, align auth.users ID to target_uid
        IF found_uid IS NOT NULL THEN
            UPDATE auth.users SET id = target_uid, updated_at = now() WHERE id = found_uid;
            found_uid := target_uid;
        END IF;
    END IF;

    -- If user exists in auth.users (either originally or aligned to target_uid)
    IF found_uid = target_uid THEN
        -- Upsert profile for the administrator
        INSERT INTO public.profiles (
            id,
            full_name,
            email,
            phone,
            avatar_url,
            role_id,
            status,
            password_setup_required,
            created_at,
            updated_at
        )
        VALUES (
            target_uid,
            'Engr. David Adeleke',
            'admin@xforce.com',
            '+234 802 111 2233',
            null,
            admin_role_id,
            'active',
            false,
            now(),
            now()
        )
        ON CONFLICT (id) DO UPDATE SET
            full_name = 'Engr. David Adeleke',
            email = 'admin@xforce.com',
            role_id = admin_role_id,
            status = 'active',
            password_setup_required = false,
            updated_at = now();
    END IF;
END $$;

