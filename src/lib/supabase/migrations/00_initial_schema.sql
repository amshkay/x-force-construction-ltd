-- ==============================================================================
-- MODULE 02: MIGRATION 00 — EXTENSIONS & CORE DATABASE FUNCTIONS
-- XFORCE Construction Management & Customer Platform (X-FORCE BRICKS)
-- Single-Business Architecture (No multi-tenancy)
-- ==============================================================================

-- 1. Enable Required PostgreSQL Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Utility Trigger Function: Automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Utility Function: Generate formatted sequential business numbers (e.g. XFQ-000001, XFO-000001)
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
    -- Count existing rows in table to determine next sequential order
    sql_stmt := format('SELECT COUNT(*) + 1 FROM %I', target_table);
    EXECUTE sql_stmt INTO seq_val;
    
    generated_number := prefix || '-' || LPAD(seq_val::TEXT, 6, '0');
    RETURN generated_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
