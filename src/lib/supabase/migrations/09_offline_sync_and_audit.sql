-- ==============================================================================
-- MODULE 02: MIGRATION 09 — AUDIT LOGGING & OFFLINE SYNC RECONCILIATION
-- XFORCE Construction Management & Customer Platform
-- ==============================================================================

-- 1. Immutable Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email VARCHAR(255),
    user_role VARCHAR(100),
    action VARCHAR(150) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    old_value JSONB,
    new_value JSONB,
    reason TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- 2. Offline Synchronization Log (Idempotent replay & conflict record)
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
CREATE INDEX IF NOT EXISTS idx_offline_sync_entity ON offline_sync_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_offline_sync_status ON offline_sync_log(status);
