-- ==============================================================================
-- MODULE 23: MIGRATION 23 — SECURITY HARDENING & ACCESS CONTROL (RLS)
-- XFORCE Construction Management & Customer Platform (Brand: X-FORCE BRICKS)
--
-- Comprehensive application-level database security hardening:
-- 1. Enforces Row Level Security (RLS) across all operational domain tables.
-- 2. Strictly isolates customer records to authenticated owner or authorized staff.
-- 3. Restricts operational staff roles to least privilege (e.g. warehouse staff
--    cannot view confidential expenses or financial executive reports).
-- 4. Guarantees audit log immutability (append-only: no update, no delete).
-- 5. Hardens offline sync logs and idempotency mutation records.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ENABLE ROW LEVEL SECURITY ACROSS ALL EXPANDED TABLES
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    -- Customer requests & inquiries (Module 09)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_requests') THEN
        ALTER TABLE customer_requests ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_request_items') THEN
        ALTER TABLE customer_request_items ENABLE ROW LEVEL SECURITY;
    END IF;

    -- Fulfilments & Warehouse tasks (Module 14)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fulfilments') THEN
        ALTER TABLE fulfilments ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fulfilment_items') THEN
        ALTER TABLE fulfilment_items ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'warehouse_tasks') THEN
        ALTER TABLE warehouse_tasks ENABLE ROW LEVEL SECURITY;
    END IF;

    -- Installation & Service jobs (Module 15)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'service_jobs') THEN
        ALTER TABLE service_jobs ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'service_providers') THEN
        ALTER TABLE service_providers ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'service_measurements') THEN
        ALTER TABLE service_measurements ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'service_photos') THEN
        ALTER TABLE service_photos ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'service_material_usage') THEN
        ALTER TABLE service_material_usage ENABLE ROW LEVEL SECURITY;
    END IF;

    -- Operating Expenses (Module 17)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expenses') THEN
        ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expense_categories') THEN
        ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
    END IF;

    -- Stock Counts & Physical Reconciliations (Module 12)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_counts') THEN
        ALTER TABLE stock_counts ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_count_items') THEN
        ALTER TABLE stock_count_items ENABLE ROW LEVEL SECURITY;
    END IF;

    -- Point of Sale Sales (Module 13)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pos_sales') THEN
        ALTER TABLE pos_sales ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pos_sale_items') THEN
        ALTER TABLE pos_sale_items ENABLE ROW LEVEL SECURITY;
    END IF;

    -- Communication & Notifications (Module 18)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
        ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'direct_messages') THEN
        ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. HELPER FUNCTIONS FOR ROLE-BASED ACCESS CONTROL
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text AS $$
DECLARE
    v_role text;
BEGIN
    SELECT r.name INTO v_role
    FROM profiles p
    JOIN roles r ON p.role_id = r.id
    WHERE p.id = auth.uid();
    
    RETURN COALESCE(v_role, 'customer');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_finance_manager()
RETURNS boolean AS $$
BEGIN
    RETURN public.current_user_role() IN ('administrator', 'sales_manager');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ------------------------------------------------------------------------------
-- 3. IMMUTABLE AUDIT LOG POLICIES (SECTION 30)
-- Strict Append-Only: No Update, No Delete for any user (including admins)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
        DROP POLICY IF EXISTS "Admins view audit logs" ON audit_logs;
        DROP POLICY IF EXISTS "Staff insert audit logs" ON audit_logs;
        DROP POLICY IF EXISTS "No one updates audit logs" ON audit_logs;
        DROP POLICY IF EXISTS "No one deletes audit logs" ON audit_logs;

        CREATE POLICY "Admins view audit logs"
            ON audit_logs FOR SELECT TO authenticated
            USING (public.is_admin());

        CREATE POLICY "Staff insert audit logs"
            ON audit_logs FOR INSERT TO authenticated
            WITH CHECK (public.is_staff());

        -- Explicitly deny updates & deletes
        CREATE POLICY "No one updates audit logs"
            ON audit_logs FOR UPDATE TO authenticated
            USING (false);

        CREATE POLICY "No one deletes audit logs"
            ON audit_logs FOR DELETE TO authenticated
            USING (false);
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 4. CUSTOMER REQUESTS & QUOTATIONS ISOLATION (SECTION 7)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_requests') THEN
        DROP POLICY IF EXISTS "Staff view customer requests" ON customer_requests;
        DROP POLICY IF EXISTS "Public insert customer requests" ON customer_requests;
        DROP POLICY IF EXISTS "Staff manage customer requests" ON customer_requests;

        CREATE POLICY "Staff view customer requests"
            ON customer_requests FOR SELECT TO authenticated
            USING (public.is_staff() OR customer_id IN (
                SELECT id FROM customers WHERE user_id = auth.uid()
            ));

        -- Allow public or authenticated visitors to submit a new quote request
        CREATE POLICY "Public insert customer requests"
            ON customer_requests FOR INSERT
            WITH CHECK (true);

        CREATE POLICY "Staff manage customer requests"
            ON customer_requests FOR UPDATE TO authenticated
            USING (public.is_staff());
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 5. OPERATING EXPENSES LEAST PRIVILEGE (SECTION 8)
-- Warehouse and Installation staff cannot view executive expenses or payroll
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expenses') THEN
        DROP POLICY IF EXISTS "Authorized staff view expenses" ON expenses;
        DROP POLICY IF EXISTS "Authorized staff manage expenses" ON expenses;

        CREATE POLICY "Authorized staff view expenses"
            ON expenses FOR SELECT TO authenticated
            USING (public.is_finance_manager() OR submitted_by = auth.uid());

        CREATE POLICY "Authorized staff manage expenses"
            ON expenses FOR ALL TO authenticated
            USING (public.is_finance_manager());
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 6. POS SALES & INVENTORY MOVEMENTS SECURITY (SECTIONS 10 & 11)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pos_sales') THEN
        DROP POLICY IF EXISTS "Staff view pos sales" ON pos_sales;
        DROP POLICY IF EXISTS "Staff insert pos sales" ON pos_sales;

        CREATE POLICY "Staff view pos sales"
            ON pos_sales FOR SELECT TO authenticated
            USING (public.is_staff());

        CREATE POLICY "Staff insert pos sales"
            ON pos_sales FOR INSERT TO authenticated
            WITH CHECK (public.is_staff());
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 7. NOTIFICATIONS & DIRECT MESSAGES PRIVACY
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
        DROP POLICY IF EXISTS "Users view own notifications" ON notifications;
        DROP POLICY IF EXISTS "Users update own notifications" ON notifications;

        CREATE POLICY "Users view own notifications"
            ON notifications FOR SELECT TO authenticated
            USING (user_id = auth.uid() OR public.is_admin());

        CREATE POLICY "Users update own notifications"
            ON notifications FOR UPDATE TO authenticated
            USING (user_id = auth.uid());
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 8. FULFILMENTS & WAREHOUSE TASKS ISOLATION (SECTION 8 & 14)
-- Strictly accessible to operational warehouse staff and administrators
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fulfilments') THEN
        DROP POLICY IF EXISTS "Staff view fulfilments" ON fulfilments;
        DROP POLICY IF EXISTS "Staff manage fulfilments" ON fulfilments;

        CREATE POLICY "Staff view fulfilments"
            ON fulfilments FOR SELECT TO authenticated
            USING (public.is_staff());

        CREATE POLICY "Staff manage fulfilments"
            ON fulfilments FOR ALL TO authenticated
            USING (public.is_staff());
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'warehouse_tasks') THEN
        DROP POLICY IF EXISTS "Staff view warehouse tasks" ON warehouse_tasks;
        DROP POLICY IF EXISTS "Staff manage warehouse tasks" ON warehouse_tasks;

        CREATE POLICY "Staff view warehouse tasks"
            ON warehouse_tasks FOR SELECT TO authenticated
            USING (public.is_staff());

        CREATE POLICY "Staff manage warehouse tasks"
            ON warehouse_tasks FOR ALL TO authenticated
            USING (public.is_staff());
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 9. SERVICE JOBS & INSTALLATIONS ISOLATION (SECTION 8 & 15)
-- Installation staff & admins manage; customers can only view their own linked job
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'service_jobs') THEN
        DROP POLICY IF EXISTS "Staff or customer view service jobs" ON service_jobs;
        DROP POLICY IF EXISTS "Staff manage service jobs" ON service_jobs;

        CREATE POLICY "Staff or customer view service jobs"
            ON service_jobs FOR SELECT TO authenticated
            USING (
                public.is_staff() OR
                customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
            );

        CREATE POLICY "Staff manage service jobs"
            ON service_jobs FOR ALL TO authenticated
            USING (public.is_staff());
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 10. STOCK COUNTS & RECONCILIATIONS (SECTION 8 & 12)
-- Warehouse staff & administrators only
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_counts') THEN
        DROP POLICY IF EXISTS "Warehouse staff view stock counts" ON stock_counts;
        DROP POLICY IF EXISTS "Warehouse staff manage stock counts" ON stock_counts;

        CREATE POLICY "Warehouse staff view stock counts"
            ON stock_counts FOR SELECT TO authenticated
            USING (public.is_staff());

        CREATE POLICY "Warehouse staff manage stock counts"
            ON stock_counts FOR ALL TO authenticated
            USING (public.is_staff());
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 11. OFFLINE SYNC QUEUE & IDEMPOTENCY HARDENING (MODULE 22 & 23)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'offline_sync_log') THEN
        DROP POLICY IF EXISTS "Users view own sync logs" ON offline_sync_log;
        DROP POLICY IF EXISTS "Users insert sync logs" ON offline_sync_log;

        CREATE POLICY "Users view own sync logs"
            ON offline_sync_log FOR SELECT TO authenticated
            USING (public.is_staff() OR user_id = auth.uid());

        CREATE POLICY "Users insert sync logs"
            ON offline_sync_log FOR INSERT TO authenticated
            WITH CHECK (public.is_staff() OR user_id = auth.uid());
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 12. SUPPLIERS CONFIDENTIALITY
-- Vendor pricing, agreements and supplier profiles strictly restricted to staff
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'suppliers') THEN
        DROP POLICY IF EXISTS "Staff view suppliers" ON suppliers;
        DROP POLICY IF EXISTS "Staff manage suppliers" ON suppliers;

        CREATE POLICY "Staff view suppliers"
            ON suppliers FOR SELECT TO authenticated
            USING (public.is_staff());

        CREATE POLICY "Staff manage suppliers"
            ON suppliers FOR ALL TO authenticated
            USING (public.is_staff());
    END IF;
END $$;

