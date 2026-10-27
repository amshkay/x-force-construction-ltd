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
    else if (bucketNormalized.includes('business')) targetBucket = 'business-assets';

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

    // Upload directly to permanent cloud Supabase Storage
    if (supabaseAdmin) {
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
          } catch (dbErr) {
            console.warn('[Server Upload] Supabase media record registration warning:', dbErr);
          }
        } else if (uploadErr) {
          console.warn('[Server Upload] Supabase storage upload warning:', uploadErr.message);
        }
      } catch (sbErr) {
        console.warn('[Server Upload] Supabase storage exception:', sbErr);
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
