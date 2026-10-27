# Production Deployment & Environment Configuration Guide

**Project:** XFORCE Construction Ltd / X-FORCE BRICKS  
**Platform Architecture:** React 19 + TypeScript + Vite + Tailwind CSS + PWA (Workbox)  
**Hosting Target:** Vercel (Frontend & SPA Hosting)  
**Backend / Database:** Supabase (PostgreSQL, Supabase Auth, Row Level Security, Supabase Storage, Realtime)  
**Deployment Tier:** Single-Business Enterprise Architecture  

---

## 1. Environment Variables Specification

The platform strictly differentiates between **client-bundled variables** (prefixed with `VITE_`) and **server-side confidential secrets** (without `VITE_`).

### Client-Exposed Variables (Bundled into Browser JavaScript)

| Variable | Required | Description | Example / Format |
| :--- | :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | **Yes** | Public Supabase project REST/GraphQL endpoint | `https://xyzprojectref.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | **Yes** | Supabase anonymous public API key (guarded by PostgreSQL RLS) | `eyJh...` |
| `VITE_PAYSTACK_PUBLIC_KEY` | Optional | Paystack public key for counter & online payments | `pk_live_...` (or `pk_test_...`) |

*Note: Never include passwords, database connection strings, or service-role keys in any `VITE_` variable.*

### Server-Side Confidential Secrets (Never Exposed to Browser)

| Variable | Required | Description | Scope / Consumer |
| :--- | :--- | :--- | :--- |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional | Supabase administrative key that bypasses RLS | Server-only migrations & background functions |
| `GEMINI_API_KEY` | Optional | Google Gemini API key for server AI Assistant proxy | Express server `/api/ai/*` |
| `NODE_ENV` | Optional | Node runtime environment | Set to `production` on Vercel |
| `PORT` | Optional | Local HTTP port for full-stack dev server | Defaults to `3000` |
| `APP_URL` | Optional | Canonical production origin for absolute asset links | `https://your-domain.vercel.app` |

---

## 2. Vercel Deployment Configuration

### 2.1 Project Settings in Vercel Dashboard

When importing the GitHub repository into Vercel:

1. **Framework Preset:** `Vite`
2. **Root Directory:** `./`
3. **Build Command:** `npm run build`
4. **Output Directory:** `dist`
5. **Install Command:** `npm install`
6. **Node.js Version:** `20.x` or `22.x`

### 2.2 SPA Routing & Deep Linking (`vercel.json`)

The included `vercel.json` ensures that:
- Clean URLs are enabled (`cleanUrls: true`).
- All deep-linked SPA routes (`/`, `/products`, `/designs`, `/projects`, `/track`, `/request`, `/customer`, `/admin`) correctly serve `/index.html` upon direct browser access or reload without 404 errors.
- Service worker (`/sw.js`), register script (`/registerSW.js`), and Web App Manifest (`/manifest.webmanifest`) have `Cache-Control: public, max-age=0, must-revalidate` so client devices immediately pick up new deployments.
- Content-hashed static assets in `/assets/` have immutable 1-year caching headers (`Cache-Control: public, max-age=31536000, immutable`).
- Standard defensive HTTP security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `X-XSS-Protection: 1; mode=block`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=(self)`) are applied to all responses.

### 2.3 Environment Separation on Vercel

In the Vercel Dashboard under **Settings -> Environment Variables**:
- **Production Environment:** Populate production `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_PAYSTACK_PUBLIC_KEY`.
- **Preview / Development Environments:** Use staging/test Supabase credentials and `pk_test_...` Paystack keys to isolate preview branch deployments from modifying real factory inventory and orders.

---

## 3. Supabase Production Configuration

### 3.1 Database Migrations Execution

All database migrations are stored sequentially in `src/lib/supabase/migrations/`:
- `00_initial_schema.sql` — PostgreSQL extensions (`uuid-ossp`, `pgcrypto`) & triggers.
- `01_roles_and_permissions.sql` — RBAC roles (`administrator`, `sales_manager`, `warehouse_staff`, `installation_staff`, `pos_staff`).
- `02_profiles_and_users.sql` — Staff & user profiles linked to `auth.users`.
- `03_business_settings_and_media.sql` — Singleton business identity settings and media registry.
- `04_categories_and_products.sql` — Products, categories, and variant matrix.
- `05_locations_and_inventory.sql` — Multi-location stock balances & movement journal.
- `06_customers_and_suppliers.sql` — Customer accounts and supplier directories.
- `07_quotations_and_orders.sql` — Quotation calculations, order booking, and items.
- `08_payments_and_installations.sql` — Payment transaction ledger & service jobs.
- `09_offline_sync_and_audit.sql` — Immutable audit log stream & sync journal.
- `10_row_level_security.sql` — Row Level Security policies across all tables.
- `11_storage_buckets.sql` — Supabase Storage buckets & access control.
- `12_seed_initial_data.sql` — Foundational roles, permissions, and locations.
- `complete_schema.sql` — **All-in-one idempotent setup script**.

#### Applying to a Fresh Production Supabase Project:
1. Open your project on [https://supabase.com/dashboard](https://supabase.com/dashboard).
2. Navigate to **SQL Editor** -> **New Query**.
3. Copy and run `complete_schema.sql`.
4. Copy and run `11_storage_buckets.sql` to initialize storage buckets.

*Safety Rule: Never drop existing tables or run destructive truncates against live production databases.*

### 3.2 Storage Buckets & Access Control

Five purpose-built storage buckets are provisioned:

| Bucket ID | Public Access | Max Size | Allowed MIME Types | Intended Assets |
| :--- | :--- | :--- | :--- | :--- |
| `product-media` | **Yes** | 10 MB | JPEG, PNG, WebP, PDF | Catalogue product photography & specs |
| `project-media` | **Yes** | 15 MB | JPEG, PNG, WebP, PDF, MP4 | Completed site installations & portfolios |
| `business-assets` | **Yes** | 5 MB | JPEG, PNG, WebP, SVG | High-res brand logos, letterheads, stamps |
| `customer-uploads`| **No (Private)** | 10 MB | JPEG, PNG, WebP, PDF | Customer architectural blueprints & surveys |
| `installation-media`| **No (Private)** | 20 MB | JPEG, PNG, WebP, PDF | Site handover forms & milestone sign-offs |

- **Public Buckets**: Files have public URLs for fast CDN delivery on the storefront.
- **Private Buckets**: Access is strictly restricted by PostgreSQL RLS to authenticated staff or the uploading customer's UID.

### 3.3 Authentication & Redirect URL Configuration

In the Supabase Dashboard under **Authentication -> URL Configuration**:

1. **Site URL:** Set to your canonical production URL:
   `https://xforce.vercel.app` (or custom domain `https://xforcebricks.com`)
2. **Redirect URLs (Allowlist):**
   - `http://localhost:3000/**` (local development)
   - `https://*.vercel.app/**` (Vercel preview branches)
   - `https://your-production-domain.vercel.app/**` (production domain)

---

## 4. PWA Production Configuration & Cache Management

The platform includes a Progressive Web App (PWA) configuration built via `vite-plugin-pwa` and Workbox:
- **Service Worker (`dist/sw.js`):** Operates under `autoUpdate` mode. New deployments trigger background precache updates and claim clients cleanly (`skipWaiting: true`, `clientsClaim: true`).
- **Cache Invalidation:** Outdated caches are purged on update (`cleanupOutdatedCaches: true`), preventing clients from remaining on stale JavaScript chunks.
- **Exclusion of Sensitive Endpoints:** The Workbox navigation fallback explicitly denylists dynamic API calls (`navigateFallbackDenylist: [/^\/api/]`). Dynamic authenticated database requests are never cached as public static resources.
- **Offline Resilience:** Local business operations (POS sales, request drafts, inventory counts) are queued in local storage / IndexedDB and synchronized via Module 22's synchronization engine when connectivity resumes.

---

## 5. Production Error Handling & Defense in Depth

- **Global React Error Boundary (`src/components/common/ErrorBoundary.tsx`):** Uncaught rendering exceptions display a branded XFORCE recovery interface with reload and return-to-home actions.
- **Credential Protection:** In production (`import.meta.env.PROD`), raw stack traces, local filesystem paths, environment variables, and database connection strings are stripped from the UI.
- **CSV Formula Injection Defense:** Customer and financial CSV exports disarm spreadsheet formula injection (CWE-1236) by prepending a single quote (`'`) to any cell starting with `=`, `+`, `-`, or `@`.
- **Audit Log Redaction:** Default passwords (`Xforcecon`), Bearer authorization tokens, and API keys are scrubbed before persistence into the immutable audit log table.

---

## 6. Database Backup & Disaster Recovery Procedures

Supabase provides automated database management capabilities:

### Automated Daily Backups
- Projects on the Supabase Pro tier include automated daily backups with Point-In-Time Recovery (PITR) up to 7 or 30 days.

### Manual Backup Procedure (Before Major Releases or Schema Changes)
To capture a point-in-time logical backup prior to schema modification:
```bash
# Using pg_dump with Supabase connection string
pg_dump "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres" \
  --schema=public \
  --clean \
  --if-exists \
  --file="backup_xforce_$(date +%Y%m%d_%H%M%S).sql"
```

### Recovery Procedure
If data corruption occurs:
1. Identify the latest valid automated backup in Supabase Dashboard (**Database -> Backups**).
2. Restore to a new branch or target point in time.
3. If restoring manually via SQL: execute the backup dump script via `psql` or the Supabase SQL Editor.

---

## 7. Production Verification & Smoke Test Checklist

Following any production deployment to Vercel, verify:

- [ ] **Public Storefront:** Homepage renders hero branding, interlocking paver catalog, and pricing.
- [ ] **Public Quote Request:** Submitting a sample quote generates an authoritative `XFR-XXXX` reference code.
- [ ] **Public Tracking:** Searching the reference code displays real-time milestone progress.
- [ ] **WhatsApp Link:** WhatsApp floating button and quote button generate safe `wa.me` links without popup blocking.
- [ ] **Customer Authentication:** Customer portal login works, displaying customer requests with cross-customer isolation.
- [ ] **Staff Authentication:** Staff login functions; initial password `Xforcecon` enforces immediate mandatory password change.
- [ ] **POS Counter Sales:** Cart selection, discount arithmetic, and receipt generation complete with zero balance on full settlement.
- [ ] **Inventory Consistency:** Stock receipts, transfers, and adjustments reflect accurate quantities on hand across locations.
- [ ] **PWA Offline Mode:** App loads when simulated offline in DevTools; offline actions queue safely for resynchronization.
- [ ] **Deep Links & Refresh:** Navigating to `/admin`, `/customer`, `/track`, or deep URLs directly and pressing F5 refreshes without 404.
