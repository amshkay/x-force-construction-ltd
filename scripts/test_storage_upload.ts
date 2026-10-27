import dotenv from 'dotenv';
dotenv.config({ path: '.env.local', override: true });
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabaseAdmin = createClient(url, serviceKey);
const supabaseAnon = createClient(url, anonKey);

async function testStorageUpload() {
  console.log('Testing upload to Supabase storage on:', url);
  const buckets = ['product-media', 'project-media', 'installation-media', 'customer-uploads', 'business-assets'];
  
  // Tiny 1x1 png buffer
  const png1x1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

  for (const b of buckets) {
    console.log(`\nTesting bucket: ${b}`);
    const testPath = `test/probe-${Date.now()}.png`;

    // 1. Upload via Admin
    const { data: adminUpload, error: adminErr } = await supabaseAdmin.storage.from(b).upload(testPath, png1x1, {
      contentType: 'image/png',
      upsert: true,
    });
    if (adminErr) {
      console.error(`  Admin upload error in ${b}:`, adminErr.message);
    } else {
      console.log(`  ✓ Admin upload success in ${b}: ${adminUpload.path}`);
      const { data: pubData } = supabaseAdmin.storage.from(b).getPublicUrl(adminUpload.path);
      console.log(`  ✓ Public URL: ${pubData.publicUrl}`);

      // Verify public URL is accessible
      try {
        const res = await fetch(pubData.publicUrl);
        console.log(`  ✓ Public URL HTTP status: ${res.status} (${res.statusText})`);
      } catch (err: any) {
        console.error(`  ✗ Public URL fetch error: ${err.message}`);
      }

      // Clean up test file
      await supabaseAdmin.storage.from(b).remove([testPath]);
      console.log(`  ✓ Cleaned up test probe in ${b}`);
    }

    // 2. Upload via Anon / Authenticated
    const testAnonPath = `test/anon-probe-${Date.now()}.png`;
    const { data: anonUpload, error: anonErr } = await supabaseAnon.storage.from(b).upload(testAnonPath, png1x1, {
      contentType: 'image/png',
      upsert: true,
    });
    if (anonErr) {
      console.log(`  ! Anon upload in ${b}: ${anonErr.message} (Note: May require authenticated staff session based on RLS)`);
    } else {
      console.log(`  ✓ Anon upload success in ${b}: ${anonUpload.path}`);
      await supabaseAdmin.storage.from(b).remove([testAnonPath]);
    }
  }
}

testStorageUpload().catch(console.error);
