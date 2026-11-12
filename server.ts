import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config();
if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local', override: true });
}
process.env.DISABLE_HMR = 'true';

// Supabase Admin Client for durable Cloud Storage
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = (supabaseUrl && supabaseServiceKey && !supabaseUrl.includes('placeholder'))
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

// Circuit-breaker to avoid hanging or noisy log warnings if Supabase host is offline/unreachable
let isSupabaseStorageOnline = false;
let lastSupabaseCheckTime = 0;

async function checkSupabaseReachability(): Promise<boolean> {
  if (!supabaseAdmin || !supabaseUrl) return false;
  const now = Date.now();
  // Cache reachability for 60 seconds
  if (now - lastSupabaseCheckTime < 60000) {
    return isSupabaseStorageOnline;
  }
  lastSupabaseCheckTime = now;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${supabaseServiceKey}`,
        apikey: supabaseServiceKey,
      },
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));
    isSupabaseStorageOnline = res.ok || res.status === 401 || res.status === 403;
  } catch {
    isSupabaseStorageOnline = false;
  }
  return isSupabaseStorageOnline;
}


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Persistent Media Upload Directory (with safe fallback for read-only serverless runtimes)
const UPLOADS_DIR = process.env.VERCEL
  ? path.resolve('/tmp/uploads')
  : path.resolve(__dirname, 'public/uploads');

try {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
} catch {
  // Read-only serverless environment safe fallback
}

// Basic in-memory rate limiter helper
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
function createRateLimiter(maxRequests: number, windowMs: number) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const clientData = rateLimitMap.get(ip);

    if (!clientData || now > clientData.resetTime) {
      rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (clientData.count >= maxRequests) {
      return res.status(429).json({
        error: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((clientData.resetTime - now) / 1000),
      });
    }

    clientData.count++;
    next();
  };
}

// Periodically clean up expired rate limit entries
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 60000);

// Request parsing with limits for media base64 uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded media statically
app.use('/uploads', express.static(UPLOADS_DIR));

// Rate limiters
const generalApiLimiter = createRateLimiter(120, 60000);
const aiApiLimiter = createRateLimiter(30, 60000);

// Health check endpoint (for container readiness probes)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'XFORCE Construction Management Platform',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Server-side Gemini API Configuration & Proxy
const geminiApiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
let genAI: GoogleGenAI | null = null;
if (geminiApiKey) {
  try {
    genAI = new GoogleGenAI({ apiKey: geminiApiKey });
  } catch (err) {
    console.warn('[Server] Could not initialize GoogleGenAI client:', err);
  }
}

app.get('/api/ai/config', generalApiLimiter, (req, res) => {
  res.json({
    isConfigured: Boolean(geminiApiKey && genAI),
    model: 'gemini-3.8-flash',
  });
});

app.post('/api/ai/generate', aiApiLimiter, async (req, res) => {
  if (!genAI || !geminiApiKey) {
    return res.status(503).json({
      error: 'Gemini API is not configured on the server. Falling back to local intelligence.',
    });
  }

  try {
    const { contents, config } = req.body;
    const response = await genAI.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config,
    });
    return res.json(response);
  } catch (err: any) {
    console.error('[Server AI Proxy] Error generating content:', err);
    return res.status(500).json({
      error: err.message || 'Error executing Gemini request.',
    });
  }
});

// Persistent Media Upload API with Supabase Cloud Storage
app.post('/api/media/upload', generalApiLimiter, async (req, res) => {
  try {
    const { filename, dataUrl, contentBase64, bucket, category } = req.body;
    if (!filename || (!dataUrl && !contentBase64)) {
      return res.status(400).json({ error: 'Missing filename or media data.' });
    }

    // Map requested bucket to one of the 5 verified Supabase buckets
    const bucketNormalized = String(bucket || 'project-media').toLowerCase();
    let targetBucket = 'project-media';
    if (bucketNormalized.includes('product')) targetBucket = 'product-media';
    else if (bucketNormalized.includes('installation')) targetBucket = 'installation-media';
    else if (bucketNormalized.includes('customer')) targetBucket = 'customer-uploads';
    else if (
      bucketNormalized.includes('business') ||
      bucketNormalized.includes('brand') ||
      bucketNormalized.includes('logo') ||
      bucketNormalized.includes('favicon') ||
      bucketNormalized.includes('asset')
    ) targetBucket = 'business-assets';

    const safeFolder = (category || 'general').replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    const ext = path.extname(filename) || '.jpg';
    const baseName = path.basename(filename, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueName = `${baseName}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}${ext}`;
    const storagePath = `${safeFolder}/${uniqueName}`;

    let rawBuffer: Buffer;
    let mimeType = req.body.mimeType || 'image/jpeg';
    if (dataUrl && dataUrl.includes(';base64,')) {
      const parts = dataUrl.split(';base64,');
      rawBuffer = Buffer.from(parts[1], 'base64');
      const headerPart = parts[0].split(':')[1];
      if (headerPart) mimeType = headerPart.split(';')[0];
    } else if (contentBase64) {
      rawBuffer = Buffer.from(contentBase64, 'base64');
    } else {
      rawBuffer = Buffer.from(dataUrl, 'utf-8');
    }

    // Save local disk copy for offline access & container fallback
    try {
      const bucketDir = path.join(UPLOADS_DIR, targetBucket);
      if (!fs.existsSync(bucketDir)) {
        fs.mkdirSync(bucketDir, { recursive: true });
      }
      const filePath = path.join(bucketDir, uniqueName);
      fs.writeFileSync(filePath, rawBuffer);
    } catch (diskErr) {
      console.warn('[Server Upload] Local disk write skipped or read-only filesystem:', diskErr);
    }

    let finalPublicUrl = `/uploads/${targetBucket}/${uniqueName}`;
    let providerUsed = 'persistent-disk';
    const mediaId = crypto.randomUUID();

    // Upload to permanent cloud Supabase Storage if reachable
    const isOnline = await checkSupabaseReachability();
    if (supabaseAdmin && isOnline) {
      try {
        const { data: uploadData, error: uploadErr } = await supabaseAdmin.storage
          .from(targetBucket)
          .upload(storagePath, rawBuffer, {
            contentType: mimeType,
            upsert: true,
          });

        if (!uploadErr && uploadData?.path) {
          const { data: pubData } = supabaseAdmin.storage.from(targetBucket).getPublicUrl(uploadData.path);
          if (pubData?.publicUrl) {
            finalPublicUrl = pubData.publicUrl;
            providerUsed = 'supabase';
          }

          // Register in Supabase media table
          try {
            await supabaseAdmin.from('media').insert([{
              id: mediaId,
              storage_provider: 'supabase',
              storage_bucket: targetBucket,
              storage_path: uploadData.path,
              public_url: finalPublicUrl,
              file_name: uniqueName,
              mime_type: mimeType,
              file_size: rawBuffer.length,
              category: safeFolder,
              is_published: true,
              created_at: new Date().toISOString(),
            }]);
          } catch {
            // Optional table registration
          }
        } else if (uploadErr) {
          isSupabaseStorageOnline = false;
        }
      } catch {
        isSupabaseStorageOnline = false;
      }
    }

    return res.json({
      success: true,
      id: mediaId,
      url: finalPublicUrl,
      path: storagePath,
      filename: uniqueName,
      sizeBytes: rawBuffer.length,
      mimeType,
      provider: providerUsed,
      createdAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[Server Upload] Error:', err);
    return res.status(500).json({ error: err.message || 'Failed to process media upload.' });
  }
});

// Persistent Media Delete API with Supabase Synchronization
app.delete('/api/media/delete', generalApiLimiter, async (req, res) => {
  try {
    const { path: mediaPath, bucket } = req.body;
    if (!mediaPath) {
      return res.status(400).json({ error: 'Missing media path.' });
    }
    const safePath = path.normalize(mediaPath).replace(/^(\.\.(\/|\\|$))+/, '');
    const fullPath = path.join(UPLOADS_DIR, safePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
    if (supabaseAdmin) {
      try {
        const targetBucket = bucket || 'project-media';
        await supabaseAdmin.storage.from(targetBucket).remove([safePath]);
        await supabaseAdmin.from('media').delete().eq('storage_path', safePath);
      } catch {
        // Safe exit
      }
    }
    return res.json({ success: true, deleted: safePath });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to delete media.' });
  }
});


// Persistent Media List API
app.get('/api/media/list', generalApiLimiter, async (req, res) => {
  try {
    const bucket = (req.query.bucket as string) || 'general';
    const safeBucket = bucket.replace(/[^a-zA-Z0-9_-]/g, '_');
    const bucketDir = path.join(UPLOADS_DIR, safeBucket);
    if (!fs.existsSync(bucketDir)) {
      return res.json({ success: true, files: [] });
    }
    const filenames = fs.readdirSync(bucketDir);
    const files = filenames.map((name) => {
      const stats = fs.statSync(path.join(bucketDir, name));
      return {
        filename: name,
        url: `/uploads/${safeBucket}/${name}`,
        path: `${safeBucket}/${name}`,
        sizeBytes: stats.size,
        createdAt: stats.birthtime.toISOString(),
      };
    });
    return res.json({ success: true, files });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to list media files.' });
  }
});

// Persistent Homepage & Public Content API
const PUBLIC_CONTENT_FILE = path.join(UPLOADS_DIR, 'public-homepage-config.json');

app.get('/api/public/content', generalApiLimiter, (req, res) => {
  try {
    if (fs.existsSync(PUBLIC_CONTENT_FILE)) {
      const data = JSON.parse(fs.readFileSync(PUBLIC_CONTENT_FILE, 'utf-8'));
      return res.json({ success: true, data });
    }
    return res.json({ success: true, data: null });
  } catch (err: any) {
    return res.json({ success: false, data: null });
  }
});

app.post('/api/public/content', generalApiLimiter, (req, res) => {
  try {
    const payload = req.body;
    let existing: Record<string, any> = {};
    if (fs.existsSync(PUBLIC_CONTENT_FILE)) {
      try {
        existing = JSON.parse(fs.readFileSync(PUBLIC_CONTENT_FILE, 'utf-8'));
      } catch {
        existing = {};
      }
    }
    const merged = {
      ...existing,
      ...payload,
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(PUBLIC_CONTENT_FILE, JSON.stringify(merged, null, 2), 'utf-8');
    return res.json({ success: true, data: merged });
  } catch (err: any) {
    console.error('[Public Content] Save error:', err);
    return res.status(500).json({ error: err.message || 'Failed to save public content.' });
  }
});

// Persistent Business Settings API (Authenticated via SUPABASE_SERVICE_ROLE_KEY to bypass client RLS)
const SETTINGS_FILE = path.join(UPLOADS_DIR, 'business-settings.json');

app.get('/api/settings', generalApiLimiter, async (req, res) => {
  try {
    const isOnline = await checkSupabaseReachability();
    if (supabaseAdmin && isOnline) {
      const { data, error } = await supabaseAdmin
        .from('business_settings')
        .select('*')
        .eq('id', 'current_business')
        .maybeSingle();

      if (!error && data) {
        return res.json({ success: true, source: 'supabase', data });
      }
    }

    if (fs.existsSync(SETTINGS_FILE)) {
      try {
        const fileData = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
        return res.json({ success: true, source: 'file', data: fileData });
      } catch {
        // file parse error
      }
    }

    return res.json({ success: true, source: 'none', data: null });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/settings', generalApiLimiter, async (req, res) => {
  try {
    const { settings, dbPayload } = req.body;
    if (!settings && !dbPayload) {
      return res.status(400).json({ success: false, error: 'No settings data provided.' });
    }

    // Build DB payload from settings object if not directly passed
    let payload = dbPayload;
    if (!payload && settings) {
      payload = {
        id: 'current_business',
        company_name: settings.companyName,
        public_brand_name: settings.publicBrandName,
        short_name: settings.shortName,
        slogan: settings.slogan,
        business_description: settings.businessDescription,
        business_category: settings.businessCategory,
        tin_number: settings.tinNumber,
        logo_url: settings.branding?.logoUrl || null,
        favicon_url: settings.branding?.faviconUrl || null,
        primary_brand_color: settings.branding?.primaryBrandColor || '#ea580c',
        secondary_brand_color: settings.branding?.secondaryBrandColor || '#0f172a',
        accent_brand_color: settings.branding?.accentBrandColor || '#f97316',
        currency_code: settings.regional?.currencyCode || 'NGN',
        currency_symbol: settings.regional?.currencySymbol || '₦',
        country_code: settings.regional?.countryCode || 'NG',
        contact_email: settings.contactEmail,
        contact_phone: settings.contactPhone,
        secondary_phone: settings.secondaryPhone,
        whatsapp_number: settings.whatsappNumber,
        website_url: settings.websiteUrl,
        address: settings.address,
        gps_latitude: settings.location?.latitude,
        gps_longitude: settings.location?.longitude,
        location_description: settings.location?.locationDescription,
        map_link_url: settings.location?.mapLinkUrl,
        social_links: settings.socialLinks,
        operating_hours: settings.operatingHours,
        hero_text: settings.websiteContent?.heroHeading,
        hero_images: [
          settings.websiteContent?.heroImageUrl,
          settings.websiteContent?.secondaryHeroImageUrl,
        ].filter(Boolean),
        website_content: settings.websiteContent,
        branding: settings.branding,
        regional_settings: settings.regional,
        numbering_settings: settings.numbering,
        payment_methods: settings.paymentMethods,
        default_customer_prefix: settings.numbering?.defaultCustomerPrefix || 'XFC',
        default_request_prefix: settings.numbering?.defaultRequestPrefix || 'XFR',
        default_quotation_prefix: settings.numbering?.defaultQuotationPrefix || 'XFQ',
        default_order_prefix: settings.numbering?.defaultOrderPrefix || 'XFO',
        default_tracking_prefix: settings.numbering?.defaultTrackingPrefix || 'XFT',
        default_payment_prefix: settings.numbering?.defaultPaymentPrefix || 'XFP',
        default_invoice_prefix: settings.numbering?.defaultInvoicePrefix || 'XFI',
        features: settings.features,
        supported_categories: settings.supportedMaterialCategories,
        version: (settings.version || 1) + 1,
        updated_at: new Date().toISOString(),
      };
    }

    // 1. Save to local fallback cache file
    try {
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(payload, null, 2), 'utf-8');
    } catch (fsErr) {
      console.warn('[Server Settings] Local file cache write skipped:', fsErr);
    }

    // 2. Persist to Supabase using Admin Client (Service Role key bypasses RLS)
    let remoteSuccess = false;
    let remoteError: string | null = null;
    const isOnline = await checkSupabaseReachability();

    if (supabaseAdmin && isOnline) {
      try {
        const { error: sbError } = await supabaseAdmin
          .from('business_settings')
          .upsert(payload, { onConflict: 'id' });

        if (sbError) {
          console.warn('[Server Settings] Supabase upsert error:', sbError.message);
          remoteError = sbError.message;
        } else {
          remoteSuccess = true;
          console.log('[Server Settings] Business settings successfully saved to Supabase with service role.');
        }
      } catch (sbEx: any) {
        console.warn('[Server Settings] Supabase upsert exception:', sbEx.message);
        remoteError = sbEx.message;
      }
    }

    // Also sync public content file
    if (payload.website_content || payload.logo_url) {
      try {
        let existingPub: Record<string, any> = {};
        if (fs.existsSync(PUBLIC_CONTENT_FILE)) {
          try {
            existingPub = JSON.parse(fs.readFileSync(PUBLIC_CONTENT_FILE, 'utf-8'));
          } catch {
            existingPub = {};
          }
        }
        const updatedPub = {
          ...existingPub,
          logoUrl: payload.logo_url || payload.branding?.logoUrl || existingPub.logoUrl,
          heroImageUrl: payload.website_content?.heroImageUrl || existingPub.heroImageUrl,
          secondaryHeroImageUrl: payload.website_content?.secondaryHeroImageUrl || existingPub.secondaryHeroImageUrl,
          heroHeading: payload.hero_text || existingPub.heroHeading,
          slogan: payload.slogan || existingPub.slogan,
          updatedAt: payload.updated_at,
        };
        fs.writeFileSync(PUBLIC_CONTENT_FILE, JSON.stringify(updatedPub, null, 2), 'utf-8');
      } catch {
        // Safe exit
      }
    }

    return res.json({
      success: true,
      remoteSuccess,
      remoteError,
      data: payload,
      updatedAt: payload.updated_at,
    });
  } catch (err: any) {
    console.error('[Server Settings] Save failed:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to save settings.' });
  }
});

// ============================================================================
// Inventory & Stock Management API (Server-side Supabase Admin Bridge)
// Handles valid UUIDs, functional unique index upserts, and RLS-resilient staff writes
// ============================================================================
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type InventoryPermissionResolver = string | ((req: express.Request) => string[]);

function requireInventoryPermission(requiredPermission: InventoryPermissionResolver) {
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!supabaseAdmin) {
      return res.status(503).json({ success: false, error: 'Supabase admin client is not configured.' });
    }

    const token = /^Bearer\s+(.+)$/i.exec(req.get('authorization') || '')?.[1];
    if (!token) {
      return res.status(401).json({ success: false, error: 'Authentication is required.' });
    }

    try {
      const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (authError || !authData.user) {
        return res.status(401).json({ success: false, error: 'A valid session is required.' });
      }

      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('role_id, status')
        .eq('id', authData.user.id)
        .maybeSingle();
      if (profileError) {
        console.error('[Inventory API] Failed to load staff profile:', profileError);
        return res.status(500).json({ success: false, error: 'Could not verify staff permissions.' });
      }
      if (!profile || profile.status !== 'active') {
        return res.status(403).json({ success: false, error: 'An active staff account is required.' });
      }

      const { data: role, error: roleError } = await supabaseAdmin
        .from('roles')
        .select('name')
        .eq('id', profile.role_id)
        .maybeSingle();
      if (roleError) {
        console.error('[Inventory API] Failed to load staff role:', roleError);
        return res.status(500).json({ success: false, error: 'Could not verify staff permissions.' });
      }
      if (!role) {
        return res.status(403).json({ success: false, error: 'A staff role is required.' });
      }

      if (role.name !== 'administrator') {
        const { data: permissionRows, error: permissionError } = await supabaseAdmin
          .from('role_permissions')
          .select('permissions(code)')
          .eq('role_id', profile.role_id);
        if (permissionError) {
          console.error('[Inventory API] Failed to load role permissions:', permissionError);
          return res.status(500).json({ success: false, error: 'Could not verify staff permissions.' });
        }

        const grantedPermissions = new Set(
          (permissionRows || []).flatMap((row: any) => {
            const relation = row.permissions;
            return Array.isArray(relation)
              ? relation.map((permission: any) => permission.code)
              : [relation?.code];
          }).filter((permission: unknown): permission is string => typeof permission === 'string')
        );
        const required = typeof requiredPermission === 'function'
          ? requiredPermission(req)
          : [requiredPermission];

        if (!required.some((permission) => grantedPermissions.has(permission))) {
          return res.status(403).json({ success: false, error: 'You do not have permission to access inventory.' });
        }
      }

      return next();
    } catch (err) {
      console.error('[Inventory API] Authorization failed:', err);
      return res.status(500).json({ success: false, error: 'Could not verify staff permissions.' });
    }
  };
}

function getBalancePermissions(req: express.Request): string[] {
  const body = req.body || {};
  if (body.absoluteQuantityOnHand !== undefined && body.absoluteQuantityOnHand !== null) {
    return ['inventory.adjust'];
  }
  const delta = Number(body.quantityOnHandDelta) || 0;
  if (delta < 0) {
    return ['inventory.issue', 'inventory.transfer', 'inventory.adjust'];
  }
  if (delta > 0) {
    return ['inventory.receive', 'inventory.transfer', 'inventory.adjust'];
  }
  if (Number(body.deltaReserved) !== 0) {
    return ['inventory.issue', 'inventory.adjust'];
  }
  return [];
}

function getMovementPermissions(req: express.Request): string[] {
  const movementType = String(req.body?.movementType || 'adjustment').toLowerCase();
  switch (movementType) {
    case 'received':
    case 'return':
      return ['inventory.receive'];
    case 'opening_balance':
      return ['inventory.receive', 'inventory.adjust'];
    case 'issued':
    case 'pos_sale':
      return ['inventory.issue'];
    case 'transfer':
      return ['inventory.transfer'];
    default:
      return ['inventory.adjust'];
  }
}

app.get('/api/inventory/locations', generalApiLimiter, requireInventoryPermission('inventory.view'), async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ success: false, error: 'Supabase admin client is not configured.' });
    }
    const { data, error } = await supabaseAdmin
      .from('stock_locations')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
    return res.json({ success: true, data: data || [] });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to load stock locations.' });
  }
});

app.post('/api/inventory/locations', generalApiLimiter, requireInventoryPermission('inventory.manage_locations'), async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ success: false, error: 'Supabase admin client is not configured.' });
    }
    const { id, name, code, address, isActive, isDefault, isUpdate } = req.body || {};
    if (!name || !code) {
      return res.status(400).json({ success: false, error: 'Location name and code are required.' });
    }

    const safeId = id && UUID_REGEX.test(String(id)) ? String(id) : crypto.randomUUID();
    const now = new Date().toISOString();

    if (isDefault) {
      await supabaseAdmin
        .from('stock_locations')
        .update({ is_default: false, updated_at: now })
        .neq('id', safeId);
    }

    if (isUpdate && id && UUID_REGEX.test(String(id))) {
      const { data, error } = await supabaseAdmin
        .from('stock_locations')
        .update({
          name: String(name).trim(),
          code: String(code).trim().toUpperCase(),
          address: address ? String(address).trim() : null,
          is_active: isActive !== undefined ? Boolean(isActive) : true,
          is_default: Boolean(isDefault),
          updated_at: now,
        })
        .eq('id', safeId)
        .select()
        .single();

      if (error) {
        return res.status(400).json({ success: false, error: error.message });
      }
      return res.json({ success: true, data });
    }

    const { data, error } = await supabaseAdmin
      .from('stock_locations')
      .insert({
        id: safeId,
        name: String(name).trim(),
        code: String(code).trim().toUpperCase(),
        address: address ? String(address).trim() : null,
        is_active: isActive !== undefined ? Boolean(isActive) : true,
        is_default: Boolean(isDefault),
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }
    return res.json({ success: true, data });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to save stock location.' });
  }
});

app.get('/api/inventory/balances', generalApiLimiter, requireInventoryPermission('inventory.view'), async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ success: false, error: 'Supabase admin client is not configured.' });
    }
    let query = supabaseAdmin.from('inventory_balances').select('*');
    const locationId = req.query.locationId as string | undefined;
    const productId = req.query.productId as string | undefined;

    if (locationId && locationId !== 'all') {
      query = query.eq('location_id', locationId);
    }
    if (productId) {
      query = query.eq('product_id', productId);
    }

    const { data, error } = await query;
    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
    return res.json({ success: true, data: data || [] });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch inventory balances.' });
  }
});

app.get('/api/inventory/movements', generalApiLimiter, requireInventoryPermission('inventory.view'), async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ success: false, error: 'Supabase admin client is not configured.' });
    }
    let query = supabaseAdmin
      .from('stock_movements')
      .select('*')
      .order('created_at', { ascending: false });

    const locationId = req.query.locationId as string | undefined;
    const productId = req.query.productId as string | undefined;
    const variantId = req.query.variantId as string | undefined;
    const movementType = req.query.movementType as string | undefined;

    if (locationId && locationId !== 'all') {
      query = query.or(`source_location_id.eq.${locationId},destination_location_id.eq.${locationId}`);
    }
    if (productId) query = query.eq('product_id', productId);
    if (variantId) query = query.eq('variant_id', variantId);
    if (movementType) query = query.eq('movement_type', movementType);

    const { data, error } = await query;
    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
    return res.json({ success: true, data: data || [] });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch stock movements.' });
  }
});

app.post('/api/inventory/balance', generalApiLimiter, requireInventoryPermission(getBalancePermissions), async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ success: false, error: 'Supabase admin client is not configured.' });
    }

    const {
      id,
      productId,
      variantId,
      locationId,
      quantityOnHandDelta,
      absoluteQuantityOnHand,
      deltaReserved,
    } = req.body || {};

    if (!productId || !UUID_REGEX.test(String(productId))) {
      return res.status(400).json({ success: false, error: 'Valid productId UUID is required.' });
    }
    if (!locationId || !UUID_REGEX.test(String(locationId))) {
      return res.status(400).json({ success: false, error: 'Valid locationId UUID is required.' });
    }
    const cleanVariantId = variantId && UUID_REGEX.test(String(variantId)) ? String(variantId) : null;

    // Look up existing row matching functional unique index (product_id, COALESCE(variant_id, nil), location_id)
    let findQuery = supabaseAdmin
      .from('inventory_balances')
      .select('*')
      .eq('product_id', productId)
      .eq('location_id', locationId);

    if (cleanVariantId) {
      findQuery = findQuery.eq('variant_id', cleanVariantId);
    } else {
      findQuery = findQuery.is('variant_id', null);
    }

    const { data: existingRows, error: findErr } = await findQuery.limit(1);
    if (findErr) {
      return res.status(500).json({ success: false, error: findErr.message });
    }

    const existing = existingRows && existingRows.length > 0 ? existingRows[0] : null;
    const now = new Date().toISOString();

    if (existing) {
      const curOnHand = Number(existing.quantity_on_hand) || 0;
      const curReserved = Number(existing.quantity_reserved) || 0;

      const nextOnHand =
        absoluteQuantityOnHand !== undefined && absoluteQuantityOnHand !== null
          ? Math.max(0, Number(absoluteQuantityOnHand))
          : Math.max(0, curOnHand + (Number(quantityOnHandDelta) || 0));

      const nextReserved =
        deltaReserved !== undefined && deltaReserved !== null
          ? Math.max(0, curReserved + Number(deltaReserved))
          : curReserved;

      const { data: updatedRow, error: updErr } = await supabaseAdmin
        .from('inventory_balances')
        .update({
          quantity_on_hand: nextOnHand,
          quantity_reserved: nextReserved,
          updated_at: now,
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (updErr) {
        return res.status(400).json({ success: false, error: updErr.message });
      }
      return res.json({ success: true, data: updatedRow });
    }

    // Insert new balance row with valid UUID
    const initialOnHand =
      absoluteQuantityOnHand !== undefined && absoluteQuantityOnHand !== null
        ? Math.max(0, Number(absoluteQuantityOnHand))
        : Math.max(0, Number(quantityOnHandDelta) || 0);

    const initialReserved =
      deltaReserved !== undefined && deltaReserved !== null
        ? Math.max(0, Number(deltaReserved))
        : 0;

    const newId = id && UUID_REGEX.test(String(id)) ? String(id) : crypto.randomUUID();
    const { data: insertedRow, error: insErr } = await supabaseAdmin
      .from('inventory_balances')
      .insert({
        id: newId,
        product_id: productId,
        variant_id: cleanVariantId,
        location_id: locationId,
        quantity_on_hand: initialOnHand,
        quantity_reserved: initialReserved,
        updated_at: now,
      })
      .select()
      .single();

    if (insErr) {
      return res.status(400).json({ success: false, error: insErr.message });
    }
    return res.json({ success: true, data: insertedRow });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to update inventory balance.' });
  }
});

app.post('/api/inventory/movement', generalApiLimiter, requireInventoryPermission(getMovementPermissions), async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ success: false, error: 'Supabase admin client is not configured.' });
    }

    const m = req.body || {};
    if (!m.productId || !UUID_REGEX.test(String(m.productId))) {
      return res.status(400).json({ success: false, error: 'Valid productId UUID is required.' });
    }
    const qty = Number(m.quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      return res.status(400).json({ success: false, error: 'Movement quantity must be greater than zero.' });
    }

    const allowedMovementTypes = new Set([
      'opening_balance',
      'received',
      'issued',
      'transfer',
      'adjustment',
      'wastage',
      'return',
      'damaged',
    ]);
    let dbMovementType = String(m.movementType || 'adjustment');
    if (!allowedMovementTypes.has(dbMovementType)) {
      if (dbMovementType === 'stock_count_reconciliation') dbMovementType = 'adjustment';
      else if (dbMovementType === 'pos_sale') dbMovementType = 'issued';
      else dbMovementType = 'adjustment';
    }

    const safeId = m.id && UUID_REGEX.test(String(m.id)) ? String(m.id) : crypto.randomUUID();
    const safeVariantId = m.variantId && UUID_REGEX.test(String(m.variantId)) ? String(m.variantId) : null;
    const safeSourceLoc =
      m.sourceLocationId && UUID_REGEX.test(String(m.sourceLocationId)) ? String(m.sourceLocationId) : null;
    const safeDestLoc =
      m.destinationLocationId && UUID_REGEX.test(String(m.destinationLocationId))
        ? String(m.destinationLocationId)
        : null;
    let safeCreatedBy: string | null =
      m.performedBy && UUID_REGEX.test(String(m.performedBy)) ? String(m.performedBy) : null;

    let movementNumber = String(m.movementNumber || `SM-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`);

    const buildRow = () => ({
      id: safeId,
      movement_number: movementNumber,
      movement_type: dbMovementType,
      product_id: m.productId,
      variant_id: safeVariantId,
      source_location_id: safeSourceLoc,
      destination_location_id: safeDestLoc,
      quantity: qty,
      unit_cost: m.unitCost !== undefined && m.unitCost !== null ? Number(m.unitCost) : null,
      reference_type: m.referenceType || null,
      reference_id: m.referenceId || null,
      notes: m.notes || m.reason || null,
      created_by: safeCreatedBy,
      created_at: m.createdAt || new Date().toISOString(),
    });

    let { data, error } = await supabaseAdmin.from('stock_movements').insert(buildRow()).select().single();

    // Retry on foreign key violation for created_by (e.g. non-auth.users UUID)
    if (error && error.code === '23503' && safeCreatedBy !== null) {
      safeCreatedBy = null;
      const retry = await supabaseAdmin.from('stock_movements').insert(buildRow()).select().single();
      data = retry.data;
      error = retry.error;
    }

    // Retry on movement_number uniqueness collision
    if (error && error.code === '23505') {
      movementNumber = `${movementNumber}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const retry = await supabaseAdmin.from('stock_movements').insert(buildRow()).select().single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    return res.json({ success: true, data });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to record stock movement.' });
  }
});

// Vite middleware in dev or static in prod
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  // Explicitly listen on '0.0.0.0' and specified PORT
  server.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`[Server] XFORCE Construction Platform listening on http://0.0.0.0:${PORT}`);
  });
}

// Only start standalone HTTP server in non-serverless environments (local dev, AI Studio, container)
if (!process.env.VERCEL) {
  startServer().catch((err) => {
    console.error('[Server] Fatal error starting server:', err);
    process.exit(1);
  });
}

export { app, server };
export default app;
