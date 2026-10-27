import dotenv from 'dotenv';
dotenv.config({ path: '.env.local', override: true });
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabaseAdmin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  console.log('Target URL:', url);
  
  // 1. Check storage buckets
  const { data: buckets, error: bErr } = await supabaseAdmin.storage.listBuckets();
  console.log('Buckets list:', buckets?.map(b => b.name) || bErr?.message);

  if (buckets) {
    for (const b of buckets) {
      const { data: files, error: fErr } = await supabaseAdmin.storage.from(b.name).list();
      if (fErr) {
        console.log(`Bucket ${b.name} list error:`, fErr.message);
      } else {
        console.log(`Bucket ${b.name}: ${files.length} file(s)`);
        files.forEach(f => console.log(`  - ${f.name} (${f.metadata?.size || 'unknown'} bytes)`));
      }
    }
  }

  // 2. Check media records
  const { data: media, error: mErr } = await supabaseAdmin.from('media').select('*');
  console.log('Media table count:', media ? media.length : mErr?.message);
  if (media && media.length > 0) {
    media.forEach(m => console.log(`  - [${m.category}] ${m.file_name} -> ${m.public_url}`));
  }

  // 3. Check products with images
  const { data: prods, error: pErr } = await supabaseAdmin.from('products').select('id, name, images');
  console.log('Products count:', prods ? prods.length : pErr?.message);
  if (prods) {
    prods.forEach(p => {
      if (p.images && p.images.length > 0) {
        console.log(`  - Product "${p.name}" images:`, p.images);
      }
    });
  }

  // 4. Check designs with images
  const { data: designs, error: dErr } = await supabaseAdmin.from('designs').select('id, title, images');
  console.log('Designs count:', designs ? designs.length : dErr?.message);
  if (designs) {
    designs.forEach(d => {
      if (d.images && d.images.length > 0) {
        console.log(`  - Design "${d.title}" images:`, d.images);
      }
    });
  }

  // 5. Check projects with images
  const { data: projects, error: prErr } = await supabaseAdmin.from('projects').select('id, title, cover_image_url, gallery_media');
  console.log('Projects count:', projects ? projects.length : prErr?.message);
  if (projects) {
    projects.forEach(pr => {
      console.log(`  - Project "${pr.title}" cover:`, pr.cover_image_url);
    });
  }
}

main().catch(console.error);
