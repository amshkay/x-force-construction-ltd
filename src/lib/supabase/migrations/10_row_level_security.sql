-- ==============================================================================
-- MODULE 02: MIGRATION 10 — ROW LEVEL SECURITY (RLS) POLICIES
-- XFORCE Construction Management & Customer Platform
-- ==============================================================================

-- 1. Enable RLS Across All Tables
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

-- ------------------------------------------------------------------------------
-- 2. ROLES & PERMISSIONS POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Authenticated users view roles"
    ON roles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage roles"
    ON roles FOR ALL TO authenticated USING (public.is_admin());

CREATE POLICY "Authenticated users view permissions"
    ON permissions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage permissions"
    ON permissions FOR ALL TO authenticated USING (public.is_admin());

CREATE POLICY "Authenticated users view role_permissions"
    ON role_permissions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage role_permissions"
    ON role_permissions FOR ALL TO authenticated USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 3. PROFILES POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Users view own profile or staff view all"
    ON profiles FOR SELECT TO authenticated
    USING (id = auth.uid() OR public.is_staff());

CREATE POLICY "Users update own profile or admin manage"
    ON profiles FOR UPDATE TO authenticated
    USING (id = auth.uid() OR public.is_admin());

CREATE POLICY "Admins insert profiles"
    ON profiles FOR INSERT TO authenticated
    WITH CHECK (id = auth.uid() OR public.is_admin());

-- ------------------------------------------------------------------------------
-- 4. BUSINESS SETTINGS POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Public read business settings"
    ON business_settings FOR SELECT USING (true);

CREATE POLICY "Admins manage business settings"
    ON business_settings FOR ALL TO authenticated USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 5. CATEGORIES POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Public read active categories"
    ON categories FOR SELECT USING (is_active = true OR public.is_staff());

CREATE POLICY "Staff manage categories"
    ON categories FOR ALL TO authenticated USING (public.is_staff());

-- ------------------------------------------------------------------------------
-- 6. PRODUCTS & VARIANTS POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Public read active published products"
    ON products FOR SELECT USING ((is_active = true AND is_published = true) OR public.is_staff());

CREATE POLICY "Staff manage products"
    ON products FOR ALL TO authenticated USING (public.is_staff());

CREATE POLICY "Public read active variants"
    ON product_variants FOR SELECT USING (is_active = true OR public.is_staff());

CREATE POLICY "Staff manage product variants"
    ON product_variants FOR ALL TO authenticated USING (public.is_staff());

-- ------------------------------------------------------------------------------
-- 7. STOCK LOCATIONS & INVENTORY POLICIES (STRICTLY PRIVATE TO STAFF)
-- ------------------------------------------------------------------------------
CREATE POLICY "Staff view stock locations"
    ON stock_locations FOR SELECT TO authenticated USING (public.is_staff());

CREATE POLICY "Admins manage stock locations"
    ON stock_locations FOR ALL TO authenticated USING (public.is_admin());

CREATE POLICY "Staff view inventory balances"
    ON inventory_balances FOR SELECT TO authenticated USING (public.is_staff());

CREATE POLICY "Staff update inventory balances"
    ON inventory_balances FOR ALL TO authenticated USING (public.is_staff());

CREATE POLICY "Staff view stock movements"
    ON stock_movements FOR SELECT TO authenticated USING (public.is_staff());

CREATE POLICY "Staff insert stock movements"
    ON stock_movements FOR INSERT TO authenticated WITH CHECK (public.is_staff());

-- ------------------------------------------------------------------------------
-- 8. CUSTOMERS & SUPPLIERS POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Staff view customers or customer views own"
    ON customers FOR SELECT TO authenticated
    USING (public.is_staff() OR user_id = auth.uid());

CREATE POLICY "Staff or customer create customer record"
    ON customers FOR INSERT TO authenticated
    WITH CHECK (public.is_staff() OR user_id = auth.uid());

CREATE POLICY "Staff or customer update customer record"
    ON customers FOR UPDATE TO authenticated
    USING (public.is_staff() OR user_id = auth.uid());

CREATE POLICY "Staff manage suppliers"
    ON suppliers FOR ALL TO authenticated USING (public.is_staff());

-- ------------------------------------------------------------------------------
-- 9. QUOTATIONS & ORDERS POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Staff or customer view quotations"
    ON quotations FOR SELECT TO authenticated
    USING (
        public.is_staff() OR 
        EXISTS (SELECT 1 FROM customers c WHERE c.id = quotations.customer_id AND c.user_id = auth.uid())
    );

CREATE POLICY "Staff or customer create quotations"
    ON quotations FOR INSERT TO authenticated
    WITH CHECK (
        public.is_staff() OR 
        EXISTS (SELECT 1 FROM customers c WHERE c.id = customer_id AND c.user_id = auth.uid())
    );

CREATE POLICY "Staff manage quotations"
    ON quotations FOR UPDATE TO authenticated USING (public.is_staff());

CREATE POLICY "Staff or customer view quotation items"
    ON quotation_items FOR SELECT TO authenticated
    USING (
        public.is_staff() OR 
        EXISTS (
            SELECT 1 FROM quotations q 
            JOIN customers c ON q.customer_id = c.id
            WHERE q.id = quotation_items.quotation_id AND c.user_id = auth.uid()
        )
    );

CREATE POLICY "Staff manage quotation items"
    ON quotation_items FOR ALL TO authenticated USING (public.is_staff());

CREATE POLICY "Staff or customer view orders"
    ON orders FOR SELECT TO authenticated
    USING (
        public.is_staff() OR 
        EXISTS (SELECT 1 FROM customers c WHERE c.id = orders.customer_id AND c.user_id = auth.uid())
    );

CREATE POLICY "Staff manage orders"
    ON orders FOR ALL TO authenticated USING (public.is_staff());

CREATE POLICY "Staff or customer view order items"
    ON order_items FOR SELECT TO authenticated
    USING (
        public.is_staff() OR 
        EXISTS (
            SELECT 1 FROM orders o 
            JOIN customers c ON o.customer_id = c.id
            WHERE o.id = order_items.order_id AND c.user_id = auth.uid()
        )
    );

CREATE POLICY "Staff manage order items"
    ON order_items FOR ALL TO authenticated USING (public.is_staff());

-- ------------------------------------------------------------------------------
-- 10. PAYMENTS POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Staff or customer view payments"
    ON payments FOR SELECT TO authenticated
    USING (
        public.is_staff() OR 
        EXISTS (SELECT 1 FROM customers c WHERE c.id = payments.customer_id AND c.user_id = auth.uid())
    );

CREATE POLICY "Staff manage payments"
    ON payments FOR ALL TO authenticated USING (public.is_staff());

-- ------------------------------------------------------------------------------
-- 11. MEDIA POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Public read published media"
    ON media FOR SELECT USING (is_published = true OR public.is_staff());

CREATE POLICY "Staff manage media"
    ON media FOR ALL TO authenticated USING (public.is_staff());

-- ------------------------------------------------------------------------------
-- 12. AUDIT LOGS & OFFLINE SYNC POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Admins view audit logs"
    ON audit_logs FOR SELECT TO authenticated USING (public.is_admin());

CREATE POLICY "Staff insert audit logs"
    ON audit_logs FOR INSERT TO authenticated WITH CHECK (public.is_staff());

CREATE POLICY "Staff view offline sync logs"
    ON offline_sync_log FOR SELECT TO authenticated USING (public.is_staff() OR user_id = auth.uid());

CREATE POLICY "Staff or user insert offline sync logs"
    ON offline_sync_log FOR INSERT TO authenticated WITH CHECK (public.is_staff() OR user_id = auth.uid());
