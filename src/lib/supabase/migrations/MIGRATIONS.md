# Database Migration & Type Generation Strategy

This document describes how PostgreSQL database migrations, schema verification, storage configuration, and TypeScript type synchronization are managed for **XFORCE Construction Management & Customer Platform** (Brand: **X-FORCE BRICKS**).

---

## 1. Architectural Principles

1. **Strict Single-Business Scope**:
   * No `tenant_id` columns, multi-tenant schemas, or organization partitioning.
   * All tables, settings, products, inventory, customers, and orders represent **XFORCE CONSTRUCTION LTD**.
2. **Deterministic Sequence of Migrations**:
   * Migrations are ordered `00` through `12` with clean dependency order.
   * An all-in-one idempotent script is provided in `complete_schema.sql` for instant initialization in the Supabase SQL Editor.
3. **Row Level Security (RLS) as Hard Security Boundary**:
   * Every single table created has `ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;`.
   * Public read access is strictly constrained to published catalog items, published media, and public business branding.
   * Internal records (cost prices, stock balances, ledger payments, supplier details, audit records) are strictly accessible only by authenticated staff members (`public.is_staff()`) or administrators (`public.is_admin()`).
4. **Separation of Keys**:
   * The `VITE_SUPABASE_ANON_KEY` is the ONLY key bundled for the browser.
   * The `SUPABASE_SERVICE_ROLE_KEY` is strictly server-side and protected by guard assertions in `src/lib/supabase/server.ts`.

---

## 2. Migration Manifest & Dependency Order

| File | Description | Dependencies |
| :--- | :--- | :--- |
| `00_initial_schema.sql` | PostgreSQL extensions (`uuid-ossp`, `pgcrypto`) & utility triggers | None |
| `01_roles_and_permissions.sql` | `roles`, `permissions`, `role_permissions` schema | `00` |
| `02_profiles_and_users.sql` | `profiles` table (linked to `auth.users`), `is_admin()`, `is_staff()` | `01` |
| `03_business_settings_and_media.sql` | Singleton `business_settings` and `media` asset registry | `02` |
| `04_categories_and_products.sql` | `categories`, `products`, and `product_variants` | `00` |
| `05_locations_and_inventory.sql` | `stock_locations`, `inventory_balances`, `stock_movements` | `04` |
| `06_customers_and_suppliers.sql` | `customers` (guest/account) and `suppliers` directory | `02` |
| `07_quotations_and_orders.sql` | `quotations`, `quotation_items`, `orders`, `order_items` | `04`, `06` |
| `08_payments_and_installations.sql` | `payments` transaction ledger | `06`, `07` |
| `09_offline_sync_and_audit.sql` | Immutable `audit_logs` and idempotent `offline_sync_log` | `02` |
| `10_row_level_security.sql` | Row Level Security policies across all tables | `01`–`09` |
| `11_storage_buckets.sql` | Supabase Storage buckets and `storage.objects` RLS policies | `02` |
| `12_seed_initial_data.sql` | System roles, granular permissions, warehouse locations | `01`, `05` |
| `24_repair_admin_profile_and_trigger.sql` | Administrator profile repair (`admin@xforce.com`, UID `4a56de99-4eb2-4ae2-9e94-b7dceb45976f`), `password_setup_required` column, and automatic `auth.users` profile trigger | `02`, `10`, `12` |
| `complete_schema.sql` | **All-in-one consolidated, idempotent script** | All |

---

## 3. Applying Migrations

### Option A: Supabase SQL Editor (Fastest for Web Dashboard)
1. Open your project on [https://supabase.com/dashboard](https://supabase.com/dashboard).
2. Go to **SQL Editor** -> **New Query**.
3. Copy the contents of `src/lib/supabase/migrations/complete_schema.sql`.
4. Paste and click **Run**.
5. Copy the contents of `src/lib/supabase/migrations/11_storage_buckets.sql` and run to initialize storage buckets.

### Option B: Supabase CLI (Production CI/CD)
```bash
# Link your repository to the remote Supabase project
npx supabase link --project-ref <your-supabase-project-id>

# Push the migration files in src/lib/supabase/migrations
npx supabase db push
```

---

## 4. Storage Buckets Configuration

Module 02 establishes 5 purpose-built storage buckets in `11_storage_buckets.sql`:

1. **`product-media`** (Public: Yes): Product catalogue photographs, technical specification sheets. Max 10MB.
2. **`project-media`** (Public: Yes): Completed installation portfolio photos, architectural renders. Max 15MB.
3. **`installation-media`** (Public: No): Site measurement sheets, job card sign-offs, handover checklists. Max 20MB.
4. **`customer-uploads`** (Public: No): Architectural blueprints, site surveys uploaded by customers. Max 10MB.
5. **`business-assets`** (Public: Yes): High-resolution logos, brand stamps, official letterheads. Max 5MB.

---

## 5. Synchronizing TypeScript Types

To refresh `src/types/database.ts` from the live database schema:

```bash
npx supabase gen types typescript --project-id <your-project-ref> > src/types/database.gen.ts
```
The manual contract in `src/types/database.ts` is fully validated against this specification.

---

## 6. Administrator Account Setup & Password Recovery

The designated primary system administrator for XFORCE Construction Ltd:
* **Email**: `admin@xforce.com`
* **Designated Supabase Auth UID**: `4a56de99-4eb2-4ae2-9e94-b7dceb45976f`
* **Full Name**: `Engr. David Adeleke`
* **Role**: `administrator` (`a0000000-0000-0000-0000-000000000001`)
* **Status**: `active`

### Creating / Verifying the Auth Account in Supabase:
If creating the administrator account in a new Supabase project:
1. In the Supabase Dashboard, go to **Authentication** -> **Users** -> **Add user**.
2. Alternatively, in the **SQL Editor**, execute:
```sql
-- Ensure pgcrypto extension is available
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Insert administrator into auth.users with exact UID:
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    '4a56de99-4eb2-4ae2-9e94-b7dceb45976f',
    'authenticated',
    'authenticated',
    'admin@xforce.com',
    crypt('AdminTemporaryPass2026!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Engr. David Adeleke"}',
    now(),
    now()
) ON CONFLICT (id) DO UPDATE SET
    email = 'admin@xforce.com',
    email_confirmed_at = now();
```
3. Run `src/lib/supabase/migrations/24_repair_admin_profile_and_trigger.sql` (or `complete_schema.sql`) to link the profile and assign the Administrator role.

### Password Reset & Account Recovery:
* If the administrator password is unknown or needs to be reset, navigate to `/auth/login` and click **"Forgot password?"** (or browse to `/auth/forgot-password`).
* Enter `admin@xforce.com`. Supabase dispatches a recovery email with a secure token to `/auth/reset-password`.
* Follow the recovery link to set a new password complying with security standards.
* Sign in with `admin@xforce.com` to access the full Management Console and operational modules.
