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
} from './mailer';

const PORT = Number(process.env.PORT) || 3001;
const DIST_DIR = path.resolve(process.cwd(), 'dist');

function readJsonBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
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
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  const url = req.url || '/';

  // Handle CORS
  if (req.method === 'OPTIONS' && url.startsWith('/api/email')) {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.end();
  }

  // API Endpoints
  if (req.method === 'POST' && url.startsWith('/api/email/send')) {
    try {
      const body = await readJsonBody(req);
      const result = await sendEmail(body);
      return sendJson(res, 200, result);
    } catch (e: any) {
      return sendJson(res, 500, { success: false, error: e.message });
    }
  }

  if (req.method === 'POST' && url.startsWith('/api/email/test')) {
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
    return fs.createReadStream(filePath).pipe(res);
  }

  res.statusCode = 404;
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`[DigiMemories Mail Server] Running on http://localhost:${PORT}`);
});
