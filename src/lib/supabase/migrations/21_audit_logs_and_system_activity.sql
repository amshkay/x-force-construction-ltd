-- ==============================================================================
-- MODULE 21: MIGRATION 21 — AUDIT LOGS & SYSTEM ACTIVITY LEDGER (RESILIENT & IDEMPOTENT)
-- XFORCE Construction Ltd / X-FORCE BRICKS
-- ==============================================================================

-- 1. Ensure base table exists (supporting both UUID and string primary keys)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    action VARCHAR(150) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100) NOT NULL
);

-- 2. Safely ensure all Module 09 & Module 21 columns exist on existing table
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ DEFAULT timezone('utc'::text, now());
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_email VARCHAR(255);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_user_email VARCHAR(255);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_user_name VARCHAR(255);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_role VARCHAR(100);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_user_role VARCHAR(100);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS action VARCHAR(150);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_type VARCHAR(100);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_id VARCHAR(100);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_reference VARCHAR(255);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS old_value JSONB;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS previous_values JSONB;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS new_value JSONB;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS new_values JSONB;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'Admin Web';
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'success';
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- 3. Synchronize bidirectional fields between legacy and Module 21 column conventions
UPDATE audit_logs SET timestamp = created_at WHERE timestamp IS NULL AND created_at IS NOT NULL;
UPDATE audit_logs SET created_at = timestamp WHERE created_at IS NULL AND timestamp IS NOT NULL;
UPDATE audit_logs SET actor_user_id = user_id WHERE actor_user_id IS NULL AND user_id IS NOT NULL;
UPDATE audit_logs SET user_id = actor_user_id WHERE user_id IS NULL AND actor_user_id IS NOT NULL;
UPDATE audit_logs SET actor_user_email = user_email WHERE actor_user_email IS NULL AND user_email IS NOT NULL;
UPDATE audit_logs SET user_email = actor_user_email WHERE user_email IS NULL AND actor_user_email IS NOT NULL;
UPDATE audit_logs SET actor_user_role = user_role WHERE actor_user_role IS NULL AND user_role IS NOT NULL;
UPDATE audit_logs SET user_role = actor_user_role WHERE user_role IS NULL AND actor_user_role IS NOT NULL;
UPDATE audit_logs SET previous_values = old_value WHERE previous_values IS NULL AND old_value IS NOT NULL;
UPDATE audit_logs SET old_value = previous_values WHERE old_value IS NULL AND previous_values IS NOT NULL;
UPDATE audit_logs SET new_values = new_value WHERE new_values IS NULL AND new_value IS NOT NULL;
UPDATE audit_logs SET new_value = new_values WHERE new_value IS NULL AND new_values IS NOT NULL;

-- 4. Trigger to maintain bidirectional column compatibility automatically on insert/update
CREATE OR REPLACE FUNCTION public.sync_audit_log_fields()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.timestamp IS NULL AND NEW.created_at IS NOT NULL THEN
        NEW.timestamp := NEW.created_at;
    ELSIF NEW.created_at IS NULL AND NEW.timestamp IS NOT NULL THEN
        NEW.created_at := NEW.timestamp;
    ELSIF NEW.timestamp IS NULL AND NEW.created_at IS NULL THEN
        NEW.timestamp := timezone('utc'::text, now());
        NEW.created_at := NEW.timestamp;
    END IF;

    IF NEW.actor_user_id IS NULL AND NEW.user_id IS NOT NULL THEN
        NEW.actor_user_id := NEW.user_id;
    ELSIF NEW.user_id IS NULL AND NEW.actor_user_id IS NOT NULL THEN
        NEW.user_id := NEW.actor_user_id;
    END IF;

    IF NEW.actor_user_email IS NULL AND NEW.user_email IS NOT NULL THEN
        NEW.actor_user_email := NEW.user_email;
    ELSIF NEW.user_email IS NULL AND NEW.actor_user_email IS NOT NULL THEN
        NEW.user_email := NEW.actor_user_email;
    END IF;

    IF NEW.actor_user_role IS NULL AND NEW.user_role IS NOT NULL THEN
        NEW.actor_user_role := NEW.user_role;
    ELSIF NEW.user_role IS NULL AND NEW.actor_user_role IS NOT NULL THEN
        NEW.user_role := NEW.actor_user_role;
    END IF;

    IF NEW.previous_values IS NULL AND NEW.old_value IS NOT NULL THEN
        NEW.previous_values := NEW.old_value;
    ELSIF NEW.old_value IS NULL AND NEW.previous_values IS NOT NULL THEN
        NEW.old_value := NEW.previous_values;
    END IF;

    IF NEW.new_values IS NULL AND NEW.new_value IS NOT NULL THEN
        NEW.new_values := NEW.new_value;
    ELSIF NEW.new_value IS NULL AND NEW.new_values IS NOT NULL THEN
        NEW.new_value := NEW.new_values;
    END IF;

    IF NEW.source IS NULL THEN
        NEW.source := 'Admin Web';
    END IF;

    IF NEW.status IS NULL THEN
        NEW.status := 'success';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_audit_log_fields ON audit_logs;
CREATE TRIGGER trg_sync_audit_log_fields
    BEFORE INSERT OR UPDATE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_audit_log_fields();

-- 5. Performance & Filter Indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_ref ON audit_logs(entity_reference);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_source ON audit_logs(source);
CREATE INDEX IF NOT EXISTS idx_audit_logs_status ON audit_logs(status);

-- 6. Row-Level Security (RLS) Configuration
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 7. Strictly Append-Only & Authorized Access Policies
DROP POLICY IF EXISTS "Authorized staff can read audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Admins view audit logs" ON audit_logs;
CREATE POLICY "Authorized staff can read audit logs"
    ON audit_logs
    FOR SELECT
    TO authenticated
    USING (
        public.is_admin() OR public.is_staff() OR (
            EXISTS (
                SELECT 1 FROM profiles p
                JOIN roles r ON p.role_id = r.id
                WHERE p.id = auth.uid()
                AND r.name IN ('administrator', 'sales_manager')
                AND p.status = 'active'
            )
        )
    );

DROP POLICY IF EXISTS "Authenticated users can insert audit records" ON audit_logs;
DROP POLICY IF EXISTS "Staff insert audit logs" ON audit_logs;
CREATE POLICY "Authenticated users can insert audit records"
    ON audit_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Strict Immutability: Prohibit UPDATE and DELETE modifications
DROP POLICY IF EXISTS "No one updates audit logs" ON audit_logs;
CREATE POLICY "No one updates audit logs"
    ON audit_logs
    FOR UPDATE
    TO authenticated
    USING (false);

DROP POLICY IF EXISTS "No one deletes audit logs" ON audit_logs;
CREATE POLICY "No one deletes audit logs"
    ON audit_logs
    FOR DELETE
    TO authenticated
    USING (false);
