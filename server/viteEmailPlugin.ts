import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';
import { 
  sendEmail, 
  testSmtpConnection, 
  getSanitizedConfig, 
  updateConfig, 
  getOutbox, 
  clearOutbox 
} from './mailer.ts';

/**
 * Helper to read JSON request body from IncomingMessage
 */
function readJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        if (!body || body.trim() === '') {
          resolve({});
        } else {
          resolve(JSON.parse(body));
        }
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', err => reject(err));
  });
}

/**
 * Helper to send JSON response
 */
function sendJson(res: ServerResponse, statusCode: number, data: any) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.end(JSON.stringify(data));
}

/**
 * Vite plugin that adds the email server API endpoints directly into Vite's dev server
 */
export function viteEmailPlugin(): Plugin {
  return {
    name: 'vite-plugin-email-server',
    configureServer(server) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next) => {
        const url = req.url || '';

        // CORS Preflight
        if (req.method === 'OPTIONS' && url.startsWith('/api/email')) {
          res.statusCode = 204;
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
          res.end();
          return;
        }

        // 1. POST /api/email/send
        if (req.method === 'POST' && url.startsWith('/api/email/send')) {
          try {
            const body = await readJsonBody(req);
            if (!body.to || !body.subject || !body.html) {
              return sendJson(res, 400, { 
                success: false, 
                error: 'Faltan campos obligatorios (to, subject, html)' 
              });
            }

            const result = await sendEmail({
              to: body.to,
              toName: body.toName,
              subject: body.subject,
              html: body.html,
              text: body.text,
              replyTo: body.replyTo,
              attachments: body.attachments || [],
              metadata: body.metadata
            });

            return sendJson(res, 200, result);
          } catch (err: any) {
            console.error('[API /api/email/send] Error:', err);
            return sendJson(res, 500, { success: false, error: err.message || 'Error interno al procesar correo' });
          }
        }

        // 2. POST /api/email/test
        if (req.method === 'POST' && url.startsWith('/api/email/test')) {
          try {
            const body = await readJsonBody(req);
            const result = await testSmtpConnection(body.targetEmail);
            return sendJson(res, 200, result);
          } catch (err: any) {
            console.error('[API /api/email/test] Error:', err);
            return sendJson(res, 500, { success: false, error: err.message || 'Error en prueba SMTP' });
          }
        }

        // 3. GET /api/email/config
        if (req.method === 'GET' && url.startsWith('/api/email/config')) {
          try {
            const config = getSanitizedConfig();
            return sendJson(res, 200, { success: true, config });
          } catch (err: any) {
            return sendJson(res, 500, { success: false, error: err.message });
          }
        }

        // 4. POST /api/email/config
        if (req.method === 'POST' && url.startsWith('/api/email/config')) {
          try {
            const body = await readJsonBody(req);
            const updated = updateConfig(body);
            return sendJson(res, 200, { success: true, config: updated, message: 'Configuración SMTP actualizada.' });
          } catch (err: any) {
            return sendJson(res, 500, { success: false, error: err.message });
          }
        }

        // 5. GET /api/email/outbox
        if (req.method === 'GET' && url.startsWith('/api/email/outbox')) {
          try {
            const outbox = getOutbox();
            return sendJson(res, 200, { success: true, outbox });
          } catch (err: any) {
            return sendJson(res, 500, { success: false, error: err.message });
          }
        }

        // 6. POST /api/email/outbox/clear
        if (req.method === 'POST' && url.startsWith('/api/email/outbox/clear')) {
          try {
            clearOutbox();
            return sendJson(res, 200, { success: true, message: 'Bandeja de salida limpiada.' });
          } catch (err: any) {
            return sendJson(res, 500, { success: false, error: err.message });
          }
        }

        next();
      });
    }
  };
}
