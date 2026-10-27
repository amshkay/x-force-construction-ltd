/**
 * Comprehensive Live Supabase Backend Verification & Codebase Validation Utility
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Validates:
 * 1. Supabase Auth connection & Administrator user account (admin@xforce.com / 4a56de99-4eb2-4ae2-9e94-b7dceb45976f)
 * 2. Profiles table, Administrator profile status & role assignment
 * 3. Roles and Permissions tables (RBAC matrices)
 * 4. All Core Database Tables across Modules 1-24:
 *    - business_settings, categories, products, product_variants, stock_locations,
 *      inventory_balances, customers, quotations, quotation_items, orders, order_items,
 *      payments, audit_logs (Module 21 attributes), offline_sync_log
 * 5. Supabase Storage Buckets
 * 6. Live end-to-end read/write check via Service Role
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Resolve configuration
function resolveCredentials() {
  const args = process.argv.slice(2);
  let url = args[0] || '';
  let serviceKey = args[1] || '';
  let anonKey = args[2] || '';

  // Check .env.local in root or applet
  const envPaths = [
    path.resolve(process.cwd(), '.env.local'),
    '/app/applet/.env.local',
    path.resolve(process.cwd(), '.env'),
  ];

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      try {
        const parsed = dotenv.parse(fs.readFileSync(envPath));
        if (!url && parsed.VITE_SUPABASE_URL) url = parsed.VITE_SUPABASE_URL;
        if (!serviceKey && parsed.SUPABASE_SERVICE_ROLE_KEY) serviceKey = parsed.SUPABASE_SERVICE_ROLE_KEY;
        if (!anonKey && parsed.VITE_SUPABASE_ANON_KEY) anonKey = parsed.VITE_SUPABASE_ANON_KEY;
      } catch (e) {
        // Ignore parse error
      }
    }
  }

  // Fallback to process.env
  if (!url) url = process.env.VITE_SUPABASE_URL || '';
  if (!serviceKey) serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!anonKey) anonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

  return { url, serviceKey, anonKey };
}

export async function runLiveValidation() {
  const { url, serviceKey, anonKey } = resolveCredentials();

  console.log('======================================================================');
  console.log('XFORCE LIVE SUPABASE BACKEND VERIFICATION & VALIDATION');
  console.log('======================================================================');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Target Supabase URL:', url || '(NOT SPECIFIED)');

  if (!url) {
    console.error('\n[ERROR] Missing Supabase URL.');
    console.log('Please provide your Supabase URL (e.g. https://tfomrkclierebtioghco.supabase.co)');
    process.exit(1);
  }

  if (!serviceKey) {
    console.error('\n[ERROR] Missing Supabase Service Role Key.');
    console.log('Please save SUPABASE_SERVICE_ROLE_KEY in .env.local or pass it as an argument:');
    console.log('  npx tsx scripts/verify_live_supabase.ts <SUPABASE_URL> <SERVICE_ROLE_KEY>');
    process.exit(1);
  }

  // Decode JWT payload to verify project ref
  try {
    const parts = serviceKey.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      console.log(`Key Project Ref:   ${payload.ref}`);
      console.log(`Key Role:          ${payload.role}`);
      if (!url.includes(payload.ref)) {
        console.warn(`[WARNING] The service role key is for project "${payload.ref}", but URL target is "${url}"!`);
      }
    }
  } catch {
    // Ignore JWT decode errors
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const checkResults: { category: string; test: string; status: 'PASS' | 'FAIL' | 'WARN'; detail: string }[] = [];

  // -------------------------------------------------------------------------
  // 1. SUPABASE AUTH VERIFICATION
  // -------------------------------------------------------------------------
  console.log('\n--- 1. AUTHENTICATION & ADMIN USER VERIFICATION ---');
  const targetAdminUid = '4a56de99-4eb2-4ae2-9e94-b7dceb45976f';
  const targetAdminEmail = 'admin@xforce.com';

  try {
    const { data: usersData, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
      console.error(`  ✗ Auth connection error: ${authError.message}`);
      checkResults.push({
        category: 'Auth',
        test: 'Admin Auth Listing',
        status: 'FAIL',
        detail: authError.message,
      });
    } else {
      console.log(`  ✓ Auth Service Connected. Total Users: ${usersData.users.length}`);
      checkResults.push({
        category: 'Auth',
        test: 'Auth Service Connection',
        status: 'PASS',
        detail: `Connected, ${usersData.users.length} users registered.`,
      });

      const adminUser = usersData.users.find(
        (u) => u.id === targetAdminUid || u.email?.toLowerCase() === targetAdminEmail
      );

      if (adminUser) {
        console.log(`  ✓ Administrator Account Exists:`);
        console.log(`      ID:              ${adminUser.id}`);
        console.log(`      Email:           ${adminUser.email}`);
        console.log(`      Email Confirmed: ${Boolean(adminUser.email_confirmed_at)}`);
        console.log(`      UID Match:       ${adminUser.id === targetAdminUid ? 'EXACT MATCH' : 'Different UID (' + adminUser.id + ')'}`);

        checkResults.push({
          category: 'Auth',
          test: 'Administrator Account',
          status: 'PASS',
          detail: `User found (${adminUser.email}), Confirmed: ${Boolean(adminUser.email_confirmed_at)}, UID: ${adminUser.id}`,
        });
      } else {
        console.log(`  ✗ Administrator Account (${targetAdminEmail}) not found in auth.users.`);
        checkResults.push({
          category: 'Auth',
          test: 'Administrator Account',
          status: 'FAIL',
          detail: `User ${targetAdminEmail} with UID ${targetAdminUid} does not exist in auth.users.`,
        });
      }
    }
  } catch (err: any) {
    console.error(`  ✗ Auth query exception: ${err.message}`);
    checkResults.push({ category: 'Auth', test: 'Auth Exception', status: 'FAIL', detail: err.message });
  }

  // -------------------------------------------------------------------------
  // 2. ROLES & RBAC MATRIX VERIFICATION
  // -------------------------------------------------------------------------
  console.log('\n--- 2. ROLES & RBAC CONFIGURATION ---');
  try {
    const { data: roles, error: rolesError } = await supabase.from('roles').select('*');
    if (rolesError) {
      console.log(`  ✗ Table 'roles' error: ${rolesError.message}`);
      checkResults.push({ category: 'RBAC', test: 'Roles Table', status: 'FAIL', detail: rolesError.message });
    } else {
      console.log(`  ✓ Table 'roles' operational. Total Roles: ${roles.length}`);
      const expectedRoles = ['administrator', 'sales_manager', 'warehouse_staff', 'installation_staff', 'pos_staff'];
      const missingRoles = expectedRoles.filter((r) => !roles.some((role: any) => role.name === r));
      if (missingRoles.length === 0) {
        console.log(`  ✓ All 5 Core System Roles Present: ${roles.map((r: any) => r.name).join(', ')}`);
        checkResults.push({ category: 'RBAC', test: 'Core Roles', status: 'PASS', detail: `${roles.length} roles verified.` });
      } else {
        console.log(`  ! Missing roles: ${missingRoles.join(', ')}`);
        checkResults.push({ category: 'RBAC', test: 'Core Roles', status: 'WARN', detail: `Missing: ${missingRoles.join(', ')}` });
      }
    }

    const { data: permissions, error: permError } = await supabase.from('permissions').select('count', { count: 'exact' });
    if (permError) {
      console.log(`  ✗ Table 'permissions' error: ${permError.message}`);
      checkResults.push({ category: 'RBAC', test: 'Permissions Table', status: 'FAIL', detail: permError.message });
    } else {
      console.log(`  ✓ Table 'permissions' operational.`);
      checkResults.push({ category: 'RBAC', test: 'Permissions Table', status: 'PASS', detail: 'Operational' });
    }

    const { data: rolePerms, error: rpError } = await supabase.from('role_permissions').select('count', { count: 'exact' });
    if (rpError) {
      console.log(`  ✗ Table 'role_permissions' error: ${rpError.message}`);
      checkResults.push({ category: 'RBAC', test: 'Role Permissions Matrix', status: 'FAIL', detail: rpError.message });
    } else {
      console.log(`  ✓ Table 'role_permissions' operational.`);
      checkResults.push({ category: 'RBAC', test: 'Role Permissions Matrix', status: 'PASS', detail: 'Operational' });
    }
  } catch (err: any) {
    console.error(`  ✗ RBAC check exception: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // 3. ADMINISTRATOR PROFILE VERIFICATION
  // -------------------------------------------------------------------------
  console.log('\n--- 3. PROFILES & ADMIN USER PROFILE ---');
  try {
    const { data: adminProfile, error: profError } = await supabase
      .from('profiles')
      .select('*, roles(*)')
      .eq('id', targetAdminUid)
      .maybeSingle();

    if (profError) {
      console.log(`  ✗ Profiles query error: ${profError.message}`);
      checkResults.push({ category: 'Profile', test: 'Admin Profile', status: 'FAIL', detail: profError.message });
    } else if (!adminProfile) {
      console.log(`  ✗ Administrator profile (UID ${targetAdminUid}) not found.`);
      checkResults.push({ category: 'Profile', test: 'Admin Profile', status: 'FAIL', detail: 'Profile row missing' });
    } else {
      console.log(`  ✓ Administrator Profile Found:`);
      console.log(`      Full Name: ${adminProfile.full_name}`);
      console.log(`      Email:     ${adminProfile.email}`);
      console.log(`      Role ID:   ${adminProfile.role_id}`);
      console.log(`      Status:    ${adminProfile.status}`);
      const isAdministrator = adminProfile.roles?.name === 'administrator' || adminProfile.role_id === 'a0000000-0000-0000-0000-000000000001';
      console.log(`      Admin Role Verified: ${isAdministrator ? 'YES' : 'NO'}`);
      checkResults.push({
        category: 'Profile',
        test: 'Admin Profile',
        status: isAdministrator && adminProfile.status === 'active' ? 'PASS' : 'WARN',
        detail: `Status: ${adminProfile.status}, Role: ${adminProfile.roles?.name || adminProfile.role_id}`,
      });
    }
  } catch (err: any) {
    console.error(`  ✗ Profile exception: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // 4. DATABASE TABLES INSPECTION (MODULES 1 TO 24)
  // -------------------------------------------------------------------------
  console.log('\n--- 4. DATABASE TABLES INSPECTION (ALL 25 TABLES ACROSS MODULES 1-24) ---');
  const tables = [
    { name: 'business_settings', module: 'Module 01: Core Settings' },
    { name: 'roles', module: 'Module 01: Roles & RBAC' },
    { name: 'permissions', module: 'Module 01: Roles & RBAC' },
    { name: 'role_permissions', module: 'Module 01: Roles & RBAC' },
    { name: 'profiles', module: 'Module 02: Staff & User Profiles' },
    { name: 'media', module: 'Module 03: Media & Gallery' },
    { name: 'categories', module: 'Module 04: Product Catalogue' },
    { name: 'products', module: 'Module 04: Product Catalogue' },
    { name: 'product_variants', module: 'Module 04: Product Catalogue' },
    { name: 'stock_locations', module: 'Module 05: Inventory & Warehouses' },
    { name: 'inventory_balances', module: 'Module 05: Inventory & Warehouses' },
    { name: 'stock_movements', module: 'Module 05: Inventory & Warehouses' },
    { name: 'customers', module: 'Module 06 & 08: CRM & Customers' },
    { name: 'suppliers', module: 'Module 06: Suppliers' },
    { name: 'quotations', module: 'Module 07: Commercial Quotes' },
    { name: 'quotation_items', module: 'Module 07: Commercial Quotes' },
    { name: 'orders', module: 'Module 08: Orders & Fulfillment' },
    { name: 'order_items', module: 'Module 08: Orders & Fulfillment' },
    { name: 'payments', module: 'Module 10: Payments & Financials' },
    { name: 'designs', module: 'Module 15: Designs & Media' },
    { name: 'projects', module: 'Module 15: Construction Projects' },
    { name: 'customer_requests', module: 'Module 16: Customer Requests' },
    { name: 'customer_request_items', module: 'Module 16: Customer Requests' },
    { name: 'audit_logs', module: 'Module 21: Audit Logs & Ledger' },
    { name: 'offline_sync_log', module: 'Module 09: Offline Sync' },
  ];

  let passedTables = 0;
  for (const t of tables) {
    try {
      const { data, error } = await supabase.from(t.name).select('*').limit(1);
      if (error) {
        console.log(`  ✗ [${t.module}] ${t.name}: FAILED (${error.message})`);
        checkResults.push({ category: 'Tables', test: t.name, status: 'FAIL', detail: error.message });
      } else {
        console.log(`  ✓ [${t.module}] ${t.name}: LIVE & OPERATIONAL`);
        checkResults.push({ category: 'Tables', test: t.name, status: 'PASS', detail: 'Operational' });
        passedTables++;
      }
    } catch (e: any) {
      console.log(`  ✗ [${t.module}] ${t.name}: EXCEPTION (${e.message})`);
      checkResults.push({ category: 'Tables', test: t.name, status: 'FAIL', detail: e.message });
    }
  }

  // -------------------------------------------------------------------------
  // 5. AUDIT LOGS MODULE 21 COLUMN VALIDATION
  // -------------------------------------------------------------------------
  console.log('\n--- 5. MODULE 21 AUDIT LOGS ATTRIBUTE VALIDATION ---');
  try {
    const testAuditEntry = {
      action: 'SYSTEM_VALIDATION',
      entity_type: 'system',
      entity_id: 'qa-check-' + Date.now(),
      entity_reference: 'XFO-QA-PROBE',
      actor_user_id: targetAdminUid,
      actor_user_email: targetAdminEmail,
      actor_user_role: 'administrator',
      source: 'System Probe',
      status: 'success',
      reason: 'Automated live backend verification probe',
      metadata: { validated_by: 'verify_live_supabase' },
    };

    const { data: inserted, error: insertError } = await supabase
      .from('audit_logs')
      .insert(testAuditEntry)
      .select()
      .single();

    if (insertError) {
      console.log(`  ✗ Module 21 audit_logs insert probe: FAILED (${insertError.message})`);
      checkResults.push({
        category: 'Audit',
        test: 'Audit Log Module 21 Attributes',
        status: 'FAIL',
        detail: insertError.message,
      });
    } else {
      console.log(`  ✓ Module 21 audit_logs insert probe: SUCCESS!`);
      console.log(`      Audit Row ID:    ${inserted.id}`);
      console.log(`      Timestamp:       ${inserted.timestamp || inserted.created_at}`);
      console.log(`      Entity Ref:      ${inserted.entity_reference}`);
      console.log(`      Actor:           ${inserted.actor_user_email || inserted.user_email}`);
      checkResults.push({
        category: 'Audit',
        test: 'Audit Log Module 21 Attributes',
        status: 'PASS',
        detail: 'Insert and column sync confirmed.',
      });
    }
  } catch (err: any) {
    console.error(`  ✗ Audit probe exception: ${err.message}`);
    checkResults.push({ category: 'Audit', test: 'Audit Log Probe', status: 'FAIL', detail: err.message });
  }

  // -------------------------------------------------------------------------
  // 6. STORAGE BUCKETS VALIDATION
  // -------------------------------------------------------------------------
  console.log('\n--- 6. STORAGE BUCKETS INSPECTION ---');
  try {
    const { data: buckets, error: bError } = await supabase.storage.listBuckets();
    if (bError) {
      console.log(`  ! Storage buckets list error: ${bError.message}`);
      checkResults.push({ category: 'Storage', test: 'Buckets Listing', status: 'WARN', detail: bError.message });
    } else {
      console.log(`  ✓ Storage Connected. Buckets: ${buckets.map((b) => b.name).join(', ') || '(none)'}`);
      checkResults.push({
        category: 'Storage',
        test: 'Buckets Listing',
        status: 'PASS',
        detail: `${buckets.length} bucket(s) found`,
      });
    }
  } catch (err: any) {
    console.log(`  ! Storage exception: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // 7. BROWSER ANON CLIENT READ VALIDATION (RLS & Public Access)
  // -------------------------------------------------------------------------
  console.log('\n--- 7. CLIENT BROWSER ANON ACCESS (RLS VERIFICATION) ---');
  if (anonKey) {
    try {
      const anonClient = createClient(url, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const { data: catData, error: catError } = await anonClient.from('categories').select('id, name');
      if (catError) {
        console.log(`  ✗ Anon query on 'categories': FAILED (${catError.message})`);
        checkResults.push({ category: 'AnonRLS', test: 'Public Categories Read', status: 'FAIL', detail: catError.message });
      } else {
        console.log(`  ✓ Public Anon Read 'categories': SUCCESS (${catData.length} categories visible)`);
        checkResults.push({ category: 'AnonRLS', test: 'Public Categories Read', status: 'PASS', detail: `${catData.length} categories accessible` });
      }

      const { data: settsData, error: settsError } = await anonClient.from('business_settings').select('company_name');
      if (settsError) {
        console.log(`  ✗ Anon query on 'business_settings': FAILED (${settsError.message})`);
        checkResults.push({ category: 'AnonRLS', test: 'Public Settings Read', status: 'FAIL', detail: settsError.message });
      } else {
        console.log(`  ✓ Public Anon Read 'business_settings': SUCCESS (${settsData[0]?.company_name || 'Configured'})`);
        checkResults.push({ category: 'AnonRLS', test: 'Public Settings Read', status: 'PASS', detail: 'Operational' });
      }
    } catch (anonErr: any) {
      console.log(`  ✗ Anon client error: ${anonErr.message}`);
    }
  } else {
    console.log('  ! VITE_SUPABASE_ANON_KEY not set, skipping anon RLS check.');
  }

  // -------------------------------------------------------------------------
  // SUMMARY REPORT
  // -------------------------------------------------------------------------
  console.log('\n======================================================================');
  console.log('VALIDATION RESULTS SUMMARY');
  console.log('======================================================================');
  const passedCount = checkResults.filter((r) => r.status === 'PASS').length;
  const failCount = checkResults.filter((r) => r.status === 'FAIL').length;
  const warnCount = checkResults.filter((r) => r.status === 'WARN').length;

  console.log(`Passed:   ${passedCount}`);
  console.log(`Failed:   ${failCount}`);
  console.log(`Warnings: ${warnCount}`);

  if (failCount === 0) {
    console.log('\n🎉 ALL CHECKS PASSED: Live Supabase backend is 100% operational!');
  } else {
    console.log('\n⚠️ SOME CHECKS FAILED: Review the details above.');
  }

  return { passedCount, failCount, warnCount, checkResults };
}

runLiveValidation().catch((e) => {
  console.error('Fatal error running validation:', e);
  process.exit(1);
});
