# XFORCE Construction Management & Customer Platform

A high-reliability, customer-facing and business management Progressive Web Application (PWA) built for **XFORCE CONSTRUCTION LTD** (public brand: **X-FORCE BRICKS**).

---

## 1. Project Purpose & Scope

The platform serves as a unified system combining:
1. **Public Customer Portal**: Product catalog, architectural brick designs, project showcase, instant quote requests, and order tracking.
2. **Administrative Management Console**: Point of Sale (POS), warehouse inventory, dispatch notes, site installation oversight, customer directory, audit logging, and reporting.

### Architecture Principle: Single-Business Scope
* Initially dedicated to **ONE business instance**.
* **NO multi-tenant complexity** or `tenant_id` columns at this stage.
* All business identities, contact numbers, and currency formats are driven dynamically through `src/config/business.config.ts`, making the platform cleanly adaptable to other building-material operations (blocks, tiles, roofing, plumbing) in future iterations.

---

## 2. Technology Stack

* **Frontend**: React 19 (Vite), TypeScript (strict mode)
* **Styling**: Tailwind CSS with custom CSS theme variables (`src/index.css`)
* **PWA & Offline**: `vite-plugin-pwa`, Workbox Service Worker, offline queue abstraction
* **Database & Auth**: Supabase (PostgreSQL with Row Level Security, Supabase Auth)
* **Storage**: Modular `MediaService` abstraction (Supabase Storage with Cloudflare R2 portability)
* **Icons**: `lucide-react`
* **Deployment Target**: Vercel / Cloud Run containers

---

## 3. Getting Started & Setup

### Prerequisites
* Node.js 18+ or 20+
* npm or pnpm

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local

# 3. Start development server (binds to all interfaces on port 3000)
npm run dev
# Open http://localhost:3000 in your browser

# 4. Build for production & verify TypeScript
npm run build
```

---

## 4. Environment Variables

Documented in `.env.example`:

| Variable | Client / Server | Description |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | Client (Public) | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Client (Public) | Supabase anonymous public API key |
| `VITE_PAYSTACK_PUBLIC_KEY` | Client (Public) | Paystack public key for counter & online payments |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server Only** | Supabase service-role secret key (never exposed to browser) |
| `GEMINI_API_KEY` | **Server Only** | Google Gemini API key for server-side construction assistant |

---

## 5. Deployment Guide (GitHub & Vercel)

### Step 1: Push Code to GitHub
```bash
git init
git add .
git commit -m "feat: complete XFORCE enterprise construction platform"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo-name>.git
git push -u origin main
```

### Step 2: Deploy to Vercel
1. Log in to your [Vercel Dashboard](https://vercel.com).
2. Click **Add New...** -> **Project** -> **Import Git Repository**.
3. Select your newly pushed GitHub repository.
4. Verify the build configuration:
   - **Framework Preset:** `Vite`
   - **Root Directory:** `./`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Under **Environment Variables**, add:
   - `VITE_SUPABASE_URL` = your Supabase URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase Anon key
   - `SUPABASE_SERVICE_ROLE_KEY` = your Supabase Service Role key (for storage & migrations)
   - `GEMINI_API_KEY` = your Google Gemini API key (optional, for AI features)
   - `VITE_PAYSTACK_PUBLIC_KEY` = your Paystack Public key (optional, for card payments)
6. Click **Deploy**. Vercel will build the frontend assets, configure serverless API routes (`/api/*` via `api/index.ts`), and issue a production HTTPS domain with SSL and global CDN caching.

---

## 6. Architectural Directory Layout

```text
src/
├── app/                  # Application initialization & routing orchestrator
├── components/
│   ├── layout/          # PublicLayout, AdminLayout, PublicHeader, PublicFooter
│   └── ui/              # Button, Input, Modal, Table, Tabs, Drawer, Badge, Toast, etc.
├── config/              # Centralized business.config.ts and app.config.ts
├── constants/           # Storage keys, module IDs, route definitions
├── features/            # Feature module contracts (auth, pos, inventory, orders, etc.)
├── hooks/               # useTheme, useToast, etc.
├── lib/
│   ├── storage/         # Safe localStorage and offline action queue
│   └── supabase/        # Browser-safe client, server admin client, SQL migrations
├── pwa/                 # OfflineIndicator, PWAInstallButton, hooks
├── repositories/        # Base repository interfaces (IBaseRepository)
├── services/            # MediaService, AuditService
├── types/               # TypeScript interfaces (auth, database, storage, pwa, audit)
└── utils/               # cn, formatters (currency, date), errorHandler, validation
```

---

## 6. AI Development Rules (Summary)

To ensure long-term architectural stability across progressive modules:
1. **Never build ahead of prompt scope**: Complete only the explicitly designated module.
2. **Strict Single-Business Discipline**: Never introduce unrequested multi-tenant structures.
3. **No Hardcoded Business Data**: Always import from `src/config/business.config.ts`.
4. **No Secrets in Client Code**: All service-role keys and AI tokens remain server-side.
5. **No `any` Types**: Every model, parameter, and response must have an explicit TypeScript type.
6. **Feature Isolation**: Logic belongs inside feature modules, not bundled into monolithic files.
7. **Accurate Status Representation**: Never claim a feature is implemented if it is only a foundation or placeholder.
