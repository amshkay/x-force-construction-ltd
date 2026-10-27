-- ==============================================================================
-- MODULE 02: MIGRATION 12 — SEED INITIAL ROLES, PERMISSIONS & FOUNDATION DATA
-- XFORCE Construction Management & Customer Platform
-- (Minimal System Seeds only — No fake business records or dummy sales)
-- ==============================================================================

-- 1. Seed Core System Roles
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

-- 2. Seed Granular Permissions
INSERT INTO permissions (code, module, description)
VALUES
    -- Products
    ('products.view', 'products', 'View catalog products and pricing'),
    ('products.create', 'products', 'Create new product listings'),
    ('products.update', 'products', 'Update existing product information and prices'),
    ('products.delete', 'products', 'Archive or delete products'),

    -- Inventory & Warehouse
    ('inventory.view', 'inventory', 'View inventory quantities across locations'),
    ('inventory.adjust', 'inventory', 'Perform manual stock adjustments and write-offs'),
    ('inventory.receive', 'inventory', 'Record incoming stock receipts from suppliers'),
    ('inventory.issue', 'inventory', 'Issue stock for orders and installations'),
    ('warehouse.view', 'warehouse', 'View physical warehouse locations and bays'),
    ('warehouse.update', 'warehouse', 'Manage warehouse locations and bin assignments'),

    -- Customers
    ('customers.view', 'customers', 'View customer directory and contact information'),
    ('customers.create', 'customers', 'Add new customer records'),
    ('customers.update', 'customers', 'Modify customer contact and delivery profiles'),

    -- Quotations
    ('quotations.view', 'quotations', 'View quotations and cost estimates'),
    ('quotations.create', 'quotations', 'Generate draft quotations'),
    ('quotations.update', 'quotations', 'Edit quotations and line items'),
    ('quotations.approve', 'quotations', 'Approve quotations and authorize discounts'),

    -- Orders
    ('orders.view', 'orders', 'View customer orders and fulfillment states'),
    ('orders.create', 'orders', 'Create and book orders'),
    ('orders.update', 'orders', 'Update order details and dispatch schedules'),
    ('orders.cancel', 'orders', 'Cancel orders and release reserved stock'),

    -- Payments
    ('payments.view', 'payments', 'View payment records and ledger receipts'),
    ('payments.create', 'payments', 'Record customer payments and issue receipts'),

    -- Installations
    ('installations.view', 'installations', 'View site installation schedules'),
    ('installations.update', 'installations', 'Update installation status and upload site proof'),

    -- Staff & Administration
    ('staff.view', 'staff', 'View staff profiles and team members'),
    ('staff.manage', 'staff', 'Invite staff and manage roles and permissions'),
    ('reports.view', 'reports', 'View sales, margin, and stock analytics'),
    ('settings.manage', 'settings', 'Manage business configuration, branding, and rules')
ON CONFLICT (code) DO UPDATE SET
    description = EXCLUDED.description;

-- 3. Assign All Permissions to Administrator Role
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    'a0000000-0000-0000-0000-000000000001'::uuid, 
    p.id 
FROM permissions p
ON CONFLICT DO NOTHING;

-- 4. Assign Operational Permissions to Sales Manager
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    'a0000000-0000-0000-0000-000000000002'::uuid, 
    p.id 
FROM permissions p
WHERE p.code IN (
    'products.view', 'products.create', 'products.update',
    'inventory.view',
    'customers.view', 'customers.create', 'customers.update',
    'quotations.view', 'quotations.create', 'quotations.update', 'quotations.approve',
    'orders.view', 'orders.create', 'orders.update',
    'payments.view', 'payments.create',
    'installations.view',
    'reports.view'
)
ON CONFLICT DO NOTHING;

-- 5. Assign Warehouse Staff Permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    'a0000000-0000-0000-0000-000000000003'::uuid, 
    p.id 
FROM permissions p
WHERE p.code IN (
    'products.view',
    'inventory.view', 'inventory.adjust', 'inventory.receive', 'inventory.issue',
    'warehouse.view', 'warehouse.update',
    'orders.view'
)
ON CONFLICT DO NOTHING;

-- 6. Assign Installation Staff Permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    'a0000000-0000-0000-0000-000000000004'::uuid, 
    p.id 
FROM permissions p
WHERE p.code IN (
    'products.view',
    'orders.view',
    'installations.view', 'installations.update'
)
ON CONFLICT DO NOTHING;

-- 7. Assign POS Staff Permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    'a0000000-0000-0000-0000-000000000005'::uuid, 
    p.id 
FROM permissions p
WHERE p.code IN (
    'products.view',
    'inventory.view',
    'customers.view', 'customers.create',
    'orders.view', 'orders.create',
    'payments.view', 'payments.create'
)
ON CONFLICT DO NOTHING;

-- 8. Seed Default Warehouse Location
INSERT INTO stock_locations (name, code, address, is_active, is_default)
VALUES 
    ('Main Factory & Yard', 'MAIN-WH', 'KM 14, Expressway Industrial Corridor, Lagos', true, true),
    ('Lekki Showroom & Store', 'SHOWROOM-01', 'Admiralty Way, Lekki Phase 1, Lagos', true, false)
ON CONFLICT (code) DO NOTHING;
