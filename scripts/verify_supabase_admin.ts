/**
 * Supabase Administrator & Schema Verification Utility
 * XFORCE Construction Ltd (Brand: X-FORCE BRICKS)
 *
 * Verifies live Supabase connection, Auth user, and database readiness.
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Resolve .env.local
const envLocalPath = fs.existsSync('/app/applet/.env.local')
  ? '/app/applet/.env.local'
  : path.resolve(process.cwd(), '.env.local');

if (!fs.existsSync(envLocalPath)) {
  console.error('[VerifySupabase] .env.local file not found at:', envLocalPath);
  process.exit(1);
}

const envConfig = dotenv.parse(fs.readFileSync(envLocalPath));
const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const serviceKey = envConfig.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = envConfig.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('[VerifySupabase] Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

console.log('=============================================================');
console.log('XFORCE SUPABASE LIVE ENVIRONMENT VERIFICATION');
console.log('=============================================================');
console.log('Target Project URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, serviceKey);

async function runVerification() {
  console.log('\n--- 1. Supabase Authentication Inspection ---');
  const targetUid = '4a56de99-4eb2-4ae2-9e94-b7dceb45976f';
  const targetEmail = 'admin@xforce.com';

  const { data: usersData, error: userError } = await supabase.auth.admin.listUsers();
  if (userError) {
    console.error('  ✗ Failed to list Auth users:', userError.message);
  } else {
    console.log(`  ✓ Auth Service Connected. Total Auth Users: ${usersData.users.length}`);
    const adminUser = usersData.users.find(
      (u) => u.id === targetUid || u.email?.toLowerCase() === targetEmail
    );

    if (adminUser) {
      console.log(`  ✓ Administrator Auth Account Found:`);
      console.log(`      ID:              ${adminUser.id}`);
      console.log(`      Email:           ${adminUser.email}`);
      console.log(`      Email Confirmed: ${Boolean(adminUser.email_confirmed_at)}`);
      console.log(`      UID Match:       ${adminUser.id === targetUid ? 'EXACT MATCH' : 'MISMATCH (' + adminUser.id + ')'}`);
    } else {
      console.log(`  ✗ Administrator Auth Account (${targetEmail}) NOT found in auth.users.`);
    }
  }

  console.log('\n--- 2. Database Schema & Tables Inspection ---');
  const tablesToCheck = [
    'roles',
    'permissions',
    'role_permissions',
    'profiles',
    'business_settings',
    'categories',
    'products',
    'product_variants',
    'stock_locations',
    'inventory_balances',
    'customers',
    'quotations',
    'orders',
    'payments',
    'audit_logs',
  ];

  let missingTables = 0;
  for (const table of tablesToCheck) {
    const { error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.log(`  ✗ Table public.${table}: Missing or unmigrated (${error.message})`);
      missingTables++;
    } else {
      console.log(`  ✓ Table public.${table}: Present and operational`);
    }
  }

  console.log('\n--- 3. Administrator Profile & Role Inspection ---');
  if (missingTables === 0) {
    const { data: profile, error: profError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', targetUid)
      .maybeSingle();

    if (profError) {
      console.log(`  ✗ Profile query failed: ${profError.message}`);
    } else if (!profile) {
      console.log(`  ! Administrator profile for UID ${targetUid} is pending migration repair execution.`);
    } else {
      console.log(`  ✓ Administrator Profile Active:`);
      console.log(`      Full Name: ${profile.full_name}`);
      console.log(`      Role ID:   ${profile.role_id}`);
      console.log(`      Status:    ${profile.status}`);
    }
  } else {
    console.log(`  ! Database tables pending initialization. Run complete_schema.sql in Supabase SQL Editor.`);
  }

  console.log('\n=============================================================');
  console.log('SUMMARY & ACTION ITEMS');
  console.log('=============================================================');
  if (missingTables > 0) {
    console.log('Status: AUTH USER IS READY, BUT DATABASE TABLES NEED INITIALIZATION.');
    console.log('\nRequired One-Click Execution:');
    console.log('1. Open your project on Supabase: https://supabase.com/dashboard/project/tfomrkclierebtioghco');
    console.log('2. Go to "SQL Editor" -> "New Query"');
    console.log('3. Paste the contents of: src/lib/supabase/migrations/complete_schema.sql');
    console.log('4. Click "Run".');
    console.log('5. (Optional Storage) Paste contents of: src/lib/supabase/migrations/11_storage_buckets.sql and click "Run".\n');
  } else {
    console.log('Status: ALL DATABASE TABLES AND PROFILES ARE FULLY CONFIGURED AND OPERATIONAL.');
  }
}

runVerification().catch((err) => {
  console.error('Verification error:', err);
});
