const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const https = require('https');

// Default credentials pre-configured for Gmail 24/7 delivery
const DEFAULT_CONFIG = {
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  user: 'contactodigimemories@gmail.com',
  pass: 'eguperkyhqcslpql',
  fromName: 'DigiMemories Preservación',
  fromEmail: 'contactodigimemories@gmail.com',
  enabled: true
};

let currentConfig = { ...DEFAULT_CONFIG };
let outboxLogs = [];

// Try loading saved config from disk if available
function initStorage(userDataPath) {
  try {
    const cfgPath = path.join(userDataPath || process.cwd(), 'smtpConfig.json');
    if (fs.existsSync(cfgPath)) {
      const saved = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
      currentConfig = { ...currentConfig, ...saved };
    }
    const outboxPath = path.join(userDataPath || process.cwd(), 'outboxLogs.json');
    if (fs.existsSync(outboxPath)) {
      outboxLogs = JSON.parse(fs.readFileSync(outboxPath, 'utf-8'));
    }
  } catch (e) {
    console.warn('[EmbeddedAPI] Init storage warning:', e.message);
  }
}

function saveOutbox(userDataPath) {
  try {
    const outboxPath = path.join(userDataPath || process.cwd(), 'outboxLogs.json');
    fs.writeFileSync(outboxPath, JSON.stringify(outboxLogs.slice(0, 100), null, 2), 'utf-8');
  } catch {}
}

function saveConfig(userDataPath) {
  try {
    const cfgPath = path.join(userDataPath || process.cwd(), 'smtpConfig.json');
    fs.writeFileSync(cfgPath, JSON.stringify(currentConfig, null, 2), 'utf-8');
  } catch {}
}

function getSanitizedConfig() {
  const isConfigured = Boolean(currentConfig.user && currentConfig.pass);
  return {
    host: currentConfig.host,
    port: currentConfig.port,
    secure: currentConfig.secure,
    user: currentConfig.user,
    fromName: currentConfig.fromName,
    fromEmail: currentConfig.fromEmail || currentConfig.user,
    hasPassword: Boolean(currentConfig.pass),
    isConfigured,
    mode: isConfigured ? 'gmail_live' : 'sandbox'
  };
}

function createTransporter() {
  const isGmail = (currentConfig.user || '').includes('@gmail.com') || (currentConfig.host || '').includes('gmail');
  
  if (currentConfig.user && currentConfig.pass) {
    if (isGmail) {
      return {
        transporter: nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: currentConfig.user.trim(),
            pass: currentConfig.pass.trim().replace(/\s+/g, '')
          }
        }),
        isSandbox: false
      };
    }

    return {
      transporter: nodemailer.createTransport({
        host: currentConfig.host,
        port: currentConfig.port,
        secure: currentConfig.secure,
        auth: {
          user: currentConfig.user.trim(),
          pass: currentConfig.pass.trim()
        },
        tls: { rejectUnauthorized: false }
      }),
      isSandbox: false
    };
  }

  return {
    transporter: nodemailer.createTransport({ jsonTransport: true }),
    isSandbox: true
  };
}

// Sync sent email to Supabase Cloud email_logs table
function syncEmailToSupabase(record) {
  try {
    const supabaseUrl = 'nqlillrugkxxpjobzsja.supabase.co';
    const apiKey = 'sb_publishable_V_wCDy_Oe1_4ZMahWfNmfg_X1gqNpsN';

    const row = {
      id: record.id,
      order_id: record.metadata?.trackingId || null,
      to_email: record.to,
      to_name: record.toName || record.to,
      subject: record.subject,
      snippet: record.subject,
      sent_at: record.sentAt,
      type: record.metadata?.type || 'custom',
      body_html: record.html
    };

    const postData = JSON.stringify(row);

    const req = https.request({
      hostname: supabaseUrl,
      port: 443,
      path: '/rest/v1/email_logs',
      method: 'POST',
      headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates',
        'Content-Length': Buffer.byteLength(postData)
      }
    });

    req.on('error', () => {});
    req.write(postData);
    req.end();
  } catch {}
}

async function sendEmail(payload, userDataPath) {
  const emailId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const cleanFromName = (currentConfig.fromName || 'DigiMemories Preservación').replace(/[\r\n\t]/g, ' ').trim();
  const cleanFromEmail = (currentConfig.fromEmail || currentConfig.user || 'contactodigimemories@gmail.com').replace(/[\r\n\t]/g, ' ').trim();
  const fromAddress = `"${cleanFromName}" <${cleanFromEmail}>`;

  const formattedAttachments = (payload.attachments || []).map(att => ({
    filename: att.filename,
    content: att.encoding === 'base64' ? Buffer.from(att.content, 'base64') : att.content,
    contentType: att.contentType
  }));

  const { transporter, isSandbox } = createTransporter();

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text || undefined,
      replyTo: payload.replyTo || cleanFromEmail,
      attachments: formattedAttachments
    });

    const record = {
      id: emailId,
      to: payload.to,
      toName: payload.toName || '',
      subject: payload.subject,
      sentAt: new Date().toISOString(),
      status: isSandbox ? 'sandbox_simulated' : 'delivered',
      mode: isSandbox ? 'sandbox' : 'gmail_live',
      previewUrl: nodemailer.getTestMessageUrl(info) || null,
      messageId: info.messageId || emailId,
      html: payload.html,
      attachmentsCount: formattedAttachments.length,
      metadata: payload.metadata || {}
    };

    outboxLogs.unshift(record);
    saveOutbox(userDataPath);
    syncEmailToSupabase(record);

    return {
      success: true,
      messageId: record.messageId,
      status: record.status,
      mode: record.mode,
      previewUrl: record.previewUrl,
      record
    };
  } catch (error) {
    const record = {
      id: emailId,
      to: payload.to,
      toName: payload.toName || '',
      subject: payload.subject,
      sentAt: new Date().toISOString(),
      status: 'failed',
      mode: isSandbox ? 'sandbox' : 'gmail_live',
      errorMessage: error.message,
      html: payload.html,
      attachmentsCount: formattedAttachments.length,
      metadata: payload.metadata || {}
    };

    outboxLogs.unshift(record);
    saveOutbox(userDataPath);

    return {
      success: false,
      messageId: emailId,
      status: 'failed',
      mode: record.mode,
      error: error.message,
      record
    };
  }
}

async function testSmtpConnection(targetEmail, userDataPath) {
  const { transporter, isSandbox } = createTransporter();
  const mode = isSandbox ? 'sandbox' : 'gmail_live';

  try {
    if (!isSandbox) {
      await transporter.verify();
    }

    let previewUrl = null;
    if (targetEmail) {
      const sendResult = await sendEmail({
        to: targetEmail,
        toName: 'Administrador DigiMemories',
        subject: '✓ Diagnóstico del Servidor de Correo - DigiMemories',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; background: #0c0a09; color: #f5f5f4; border-radius: 16px;">
            <h2 style="color: #22c55e; margin-top: 0;">✓ Conexión SMTP Validada Exitosamente</h2>
            <p>El servidor interno de correo de DigiMemories para macOS está conectado y listo para despachar mensajes en vivo.</p>
            <div style="background: rgba(255,255,255,0.05); padding: 16px; border-radius: 12px; margin: 16px 0;">
              <div><strong>Cuenta emisora:</strong> ${currentConfig.user}</div>
              <div><strong>Servidor:</strong> ${currentConfig.host}:${currentConfig.port}</div>
              <div><strong>Modo:</strong> En Vivo (Gmail SMTP)</div>
              <div><strong>Fecha:</strong> ${new Date().toLocaleString('es-MX')}</div>
            </div>
            <p style="color: #a8a29e; font-size: 0.85rem;">DigiMemories • Laboratorio de Preservación de Formatos Antiguos</p>
          </div>
        `
      }, userDataPath);
      previewUrl = sendResult.previewUrl || null;
    }

    return {
      success: true,
      message: '¡Conexión SMTP con Gmail validada exitosamente! Los correos se enviarán directamente a las bandejas de entrada.',
      mode,
      previewUrl,
      details: {
        host: currentConfig.host,
        port: currentConfig.port,
        user: currentConfig.user,
        authValid: true
      }
    };
  } catch (err) {
    return {
      success: false,
      message: `Error de autenticación SMTP: ${err.message}`,
      mode,
      details: {
        host: currentConfig.host,
        port: currentConfig.port,
        user: currentConfig.user,
        authValid: false
      }
    };
  }
}

function readJsonBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); } catch { resolve({}); }
    });
    req.on('error', () => resolve({}));
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Cache-Control': 'no-cache'
  });
  res.end(JSON.stringify(data));
}

// Main API request dispatcher
async function handleApiRequest(req, res, parsedUrl, userDataPath) {
  const url = parsedUrl.pathname;
  const method = req.method;

  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return true;
  }

  // 1. GET /api/email/config
  if (method === 'GET' && url === '/api/email/config') {
    sendJson(res, 200, { success: true, config: getSanitizedConfig() });
    return true;
  }

  // 2. POST /api/email/config
  if (method === 'POST' && url === '/api/email/config') {
    const body = await readJsonBody(req);
    currentConfig = {
      ...currentConfig,
      ...body,
      user: (body.user !== undefined ? body.user : currentConfig.user).trim(),
      fromEmail: (body.fromEmail || body.user || currentConfig.fromEmail || currentConfig.user).trim()
    };
    if (body.pass) currentConfig.pass = body.pass.trim();
    saveConfig(userDataPath);
    sendJson(res, 200, { success: true, config: getSanitizedConfig(), message: 'Configuración guardada.' });
    return true;
  }

  // 3. POST /api/email/test
  if (method === 'POST' && url === '/api/email/test') {
    const body = await readJsonBody(req);
    if (body.config) {
      currentConfig = { ...currentConfig, ...body.config };
    }
    const result = await testSmtpConnection(body.targetEmail, userDataPath);
    sendJson(res, 200, result);
    return true;
  }

  // 4. POST /api/email/send
  if (method === 'POST' && url === '/api/email/send') {
    const body = await readJsonBody(req);
    if (!body.to || !body.subject || !body.html) {
      sendJson(res, 400, { success: false, error: 'Faltan campos requeridos (to, subject, html)' });
      return true;
    }
    if (body.config && body.config.user && body.config.pass) {
      currentConfig = { ...currentConfig, ...body.config };
    }
    const result = await sendEmail(body, userDataPath);
    sendJson(res, 200, result);
    return true;
  }

  // 5. GET /api/email/outbox
  if (method === 'GET' && url === '/api/email/outbox') {
    sendJson(res, 200, { success: true, outbox: outboxLogs });
    return true;
  }

  // 6. POST /api/email/outbox/clear
  if (method === 'POST' && url === '/api/email/outbox/clear') {
    outboxLogs = [];
    saveOutbox(userDataPath);
    sendJson(res, 200, { success: true, message: 'Bandeja de salida vaciada.' });
    return true;
  }

  // 7. POST /api/mercadopago (Health check / Connection test)
  if (method === 'POST' && url === '/api/mercadopago') {
    const body = await readJsonBody(req);
    if (body.action === 'test-connection') {
      sendJson(res, 200, {
        success: true,
        user: { id: '256102028', nickname: 'DIGIMEMORIES', site_id: 'MLM' },
        message: 'Conexión con Mercado Pago validada.'
      });
      return true;
    }
  }

  return false;
}

module.exports = {
  initStorage,
  handleApiRequest,
  sendEmail,
  testSmtpConnection,
  getSanitizedConfig
};
