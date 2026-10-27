-- ==============================================================================
-- MODULE 27: MIGRATION 24 — REPAIR ADMINISTRATOR PROFILE, ROLE & AUTH TRIGGER
-- XFORCE Construction Management & Customer Platform (Brand: X-FORCE BRICKS)
--
-- Administrator Target:
-- Email: admin@xforce.com
-- Supabase Auth UID: 4a56de99-4eb2-4ae2-9e94-b7dceb45976f
-- Role: administrator (Full Access)
-- ==============================================================================

-- 1. Ensure password_setup_required column exists on profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS password_setup_required BOOLEAN NOT NULL DEFAULT false;

-- 2. Ensure Administrator Role exists in public.roles
INSERT INTO public.roles (id, name, display_name, description, is_system)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'administrator',
    'Administrator',
    'Full unrestricted operational and administrative access subject to audit logs',
    true
)
ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description;

-- 3. Safely insert or repair the Administrator Profile for UID 4a56de99-4eb2-4ae2-9e94-b7dceb45976f
-- Note: Reconciles auth.users by target UID or by admin@xforce.com email,
-- ensuring profiles foreign key is satisfied and administrator role is enforced.
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

-- 4. Automatic profile bootstrap trigger for auth.users
-- Ensures that any new staff or administrator created in Supabase Auth
-- automatically receives an active profile matching their email and role.
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

-- Re-create trigger idempotently
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
