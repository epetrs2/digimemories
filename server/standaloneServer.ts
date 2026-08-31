import http from 'http';
import fs from 'fs';
import path from 'path';
import { 
  sendEmail, 
  testSmtpConnection, 
  getSanitizedConfig, 
  updateConfig, 
  getOutbox, 
  clearOutbox 
} from './mailer.ts';

const PORT = Number(process.env.PORT) || 3001;
const DIST_DIR = path.resolve(process.cwd(), 'dist');

// Rate limiting in-memory store
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string, limit: number, windowMs: number): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }

  if (entry.count >= limit) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }

  entry.count += 1;
  return { allowed: true, retryAfter: 0 };
}

function readJsonBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { 
      body += chunk.toString(); 
      // DoS Protection: Limit payload size to 15MB
      if (body.length > 15 * 1024 * 1024) {
        req.destroy();
        reject(new Error('Payload Too Large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body && body.trim() !== '' ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', err => reject(err));
  });
}

function sendJson(res: http.ServerResponse, statusCode: number, data: any) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  const url = req.url || '/';
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

  // Handle CORS
  if (req.method === 'OPTIONS' && url.startsWith('/api/email')) {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.end();
  }

  // 1. POST /api/email/send (Rate Limit: 10/min)
  if (req.method === 'POST' && url.startsWith('/api/email/send')) {
    const rateCheck = checkRateLimit(`${clientIp}:send`, 10, 60 * 1000);
    if (!rateCheck.allowed) {
      return sendJson(res, 429, { 
        success: false, 
        error: `Límite de envíos excedido. Espera ${rateCheck.retryAfter} segundos.` 
      });
    }

    try {
      const body = await readJsonBody(req);
      const result = await sendEmail(body);
      return sendJson(res, 200, result);
    } catch (e: any) {
      return sendJson(res, 500, { success: false, error: e.message });
    }
  }

  // 2. POST /api/email/test (Rate Limit: 3/5min)
  if (req.method === 'POST' && url.startsWith('/api/email/test')) {
    const rateCheck = checkRateLimit(`${clientIp}:test`, 3, 5 * 60 * 1000);
    if (!rateCheck.allowed) {
      return sendJson(res, 429, { 
        success: false, 
        error: `Límite de pruebas excedido. Espera ${rateCheck.retryAfter} segundos.` 
      });
    }

    try {
      const body = await readJsonBody(req);
      const result = await testSmtpConnection(body.targetEmail);
      return sendJson(res, 200, result);
    } catch (e: any) {
      return sendJson(res, 500, { success: false, error: e.message });
    }
  }

  if (req.method === 'GET' && url.startsWith('/api/email/config')) {
    return sendJson(res, 200, { success: true, config: getSanitizedConfig() });
  }

  if (req.method === 'POST' && url.startsWith('/api/email/config')) {
    try {
      const body = await readJsonBody(req);
      return sendJson(res, 200, { success: true, config: updateConfig(body) });
    } catch (e: any) {
      return sendJson(res, 500, { success: false, error: e.message });
    }
  }

  if (req.method === 'GET' && url.startsWith('/api/email/outbox')) {
    return sendJson(res, 200, { success: true, outbox: getOutbox() });
  }

  if (req.method === 'POST' && url.startsWith('/api/email/outbox/clear')) {
    return sendJson(res, 200, clearOutbox());
  }

  // Serve static files if in production dist mode
  if (fs.existsSync(DIST_DIR)) {
    let filePath = path.join(DIST_DIR, url === '/' ? 'index.html' : url);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(DIST_DIR, 'index.html');
    }
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf'
    };
    res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    return fs.createReadStream(filePath).pipe(res);
  }

  res.statusCode = 404;
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`[DigiMemories Security Hardened Mail Server] Running on http://localhost:${PORT}`);
});
