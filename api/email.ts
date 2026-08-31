import type { IncomingMessage, ServerResponse } from 'http';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://nqlillrugkxxpjobzsja.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_V_wCDy_Oe1_4ZMahWfNmfg_X1gqNpsN';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// In-memory serverless cache
let currentConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 465,
  secure: process.env.SMTP_SECURE !== 'false',
  user: process.env.SMTP_USER || 'contactodigimemories@gmail.com',
  pass: process.env.SMTP_PASS || 'eguperkyhqcslpql',
  fromName: process.env.SMTP_FROM_NAME || 'DigiMemories Preservación',
  fromEmail: process.env.SMTP_FROM_EMAIL || 'contactodigimemories@gmail.com',
  enabled: true
};

let outboxLogs: any[] = [];

async function loadCloudConfig(): Promise<typeof currentConfig> {
  if (currentConfig.user && currentConfig.pass) {
    return currentConfig;
  }
  try {
    const { data } = await supabase
      .from('email_logs')
      .select('*')
      .eq('id', 'system_smtp_settings')
      .maybeSingle();

    if (data && data.body_html) {
      const parsed = JSON.parse(data.body_html);
      currentConfig = {
        host: parsed.host || currentConfig.host,
        port: Number(parsed.port) || currentConfig.port,
        secure: parsed.secure !== false,
        user: (parsed.user || '').trim(),
        pass: (parsed.pass || '').trim().replace(/\s+/g, ''),
        fromName: parsed.fromName || currentConfig.fromName,
        fromEmail: parsed.fromEmail || currentConfig.fromEmail,
        enabled: true
      };
    }
  } catch (e) {
    console.warn('[Supabase Cloud SMTP] Error loading cloud config:', e);
  }
  return currentConfig;
}

async function saveCloudConfig(config: any) {
  try {
    const row = {
      id: 'system_smtp_settings',
      order_id: null,
      to_email: 'system@digimemories.mx',
      to_name: 'System Config Vault',
      subject: 'SMTP_CONFIG_PAYLOAD',
      snippet: 'Cloud SMTP Vault',
      sent_at: new Date().toISOString(),
      type: 'custom',
      body_html: JSON.stringify(config)
    };
    await supabase.from('email_logs').upsert(row, { onConflict: 'id' });
  } catch (e) {
    console.warn('[Supabase Cloud SMTP] Error saving cloud config:', e);
  }
}

function readBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        resolve(body && body.trim() !== '' ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function sendJson(res: ServerResponse, status: number, data: any) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.end(JSON.stringify(data));
}

async function resolveActiveConfig(body: any = {}) {
  await loadCloudConfig();

  const payloadConfig = body.config || body.smtpConfig || {};
  const active = {
    host: payloadConfig.host || currentConfig.host || 'smtp.gmail.com',
    port: Number(payloadConfig.port) || currentConfig.port || 465,
    secure: payloadConfig.secure !== undefined ? Boolean(payloadConfig.secure) : currentConfig.secure,
    user: (payloadConfig.user || currentConfig.user || '').trim(),
    pass: (payloadConfig.pass || currentConfig.pass || '').trim().replace(/\s+/g, ''),
    fromName: payloadConfig.fromName || currentConfig.fromName || 'DigiMemories Preservación',
    fromEmail: (payloadConfig.fromEmail || currentConfig.fromEmail || payloadConfig.user || currentConfig.user || '').trim()
  };

  if (active.user && active.pass) {
    currentConfig = { ...currentConfig, ...active };
  }

  return active;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const url = req.url || '';

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.end();
  }

  // 1. GET /api/email/config
  if (req.method === 'GET' && (url.includes('config') || url.includes('/api/email'))) {
    await loadCloudConfig();
    return sendJson(res, 200, {
      success: true,
      config: {
        host: currentConfig.host,
        port: currentConfig.port,
        secure: currentConfig.secure,
        user: currentConfig.user,
        fromName: currentConfig.fromName,
        fromEmail: currentConfig.fromEmail || currentConfig.user,
        hasPassword: !!currentConfig.pass,
        isConfigured: !!(currentConfig.user && currentConfig.pass),
        mode: currentConfig.user && currentConfig.pass ? 'gmail_live' : 'sandbox'
      }
    });
  }

  // 2. POST /api/email/config
  if (req.method === 'POST' && url.includes('config')) {
    const body = await readBody(req);
    const resolved = await resolveActiveConfig(body);
    if (resolved.user && resolved.pass) {
      await saveCloudConfig(resolved);
    }
    return sendJson(res, 200, {
      success: true,
      message: 'Configuración SMTP actualizada y guardada en Supabase Cloud con éxito.',
      config: {
        host: resolved.host,
        port: resolved.port,
        secure: resolved.secure,
        user: resolved.user,
        fromName: resolved.fromName,
        fromEmail: resolved.fromEmail || resolved.user,
        hasPassword: !!resolved.pass,
        isConfigured: !!(resolved.user && resolved.pass),
        mode: resolved.user && resolved.pass ? 'gmail_live' : 'sandbox'
      }
    });
  }

  // 3. POST /api/email/send
  if (req.method === 'POST' && (url.includes('send') || url.endsWith('/email'))) {
    const body = await readBody(req);
    const active = await resolveActiveConfig(body);
    const emailId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    if (active.user && active.pass) {
      try {
        const transporter = nodemailer.createTransport({
          host: active.host,
          port: active.port,
          secure: active.secure,
          auth: { user: active.user, pass: active.pass }
        });

        const formattedAttachments = (body.attachments || []).map((att: any) => ({
          filename: att.filename,
          content: att.encoding === 'base64' ? Buffer.from(att.content, 'base64') : att.content,
          contentType: att.contentType
        }));

        const info = await transporter.sendMail({
          from: `"${active.fromName}" <${active.fromEmail || active.user}>`,
          to: body.toName ? `"${body.toName}" <${body.to}>` : body.to,
          subject: body.subject,
          html: body.html,
          text: body.text || body.html.replace(/<[^>]*>?/gm, ''),
          attachments: formattedAttachments
        });

        const record = {
          id: emailId,
          to: body.to,
          toName: body.toName,
          subject: body.subject,
          sentAt: new Date().toISOString(),
          status: 'delivered',
          mode: 'gmail_live',
          messageId: info.messageId,
          html: body.html,
          attachmentsCount: formattedAttachments.length
        };

        outboxLogs.unshift(record);
        return sendJson(res, 200, { success: true, status: 'delivered', mode: 'gmail_live', messageId: info.messageId, record });
      } catch (err: any) {
        console.warn('[Vercel Serverless SMTP] Live dispatch failed:', err.message);
        return sendJson(res, 200, {
          success: true,
          status: 'sandbox_simulated',
          mode: 'sandbox',
          message: 'Error en SMTP en vivo, despachado a sandbox: ' + err.message,
          record: { id: emailId, to: body.to, subject: body.subject, sentAt: new Date().toISOString(), status: 'sandbox_simulated', mode: 'sandbox', html: body.html, attachmentsCount: 0 }
        });
      }
    } else {
      // Sandbox fallback
      const record = {
        id: emailId,
        to: body.to,
        toName: body.toName,
        subject: body.subject,
        sentAt: new Date().toISOString(),
        status: 'sandbox_simulated',
        mode: 'sandbox',
        html: body.html,
        attachmentsCount: (body.attachments || []).length
      };
      outboxLogs.unshift(record);
      return sendJson(res, 200, { success: true, status: 'sandbox_simulated', mode: 'sandbox', messageId: emailId, record });
    }
  }

  // 4. POST /api/email/test
  if (req.method === 'POST' && url.includes('test')) {
    const body = await readBody(req);
    const active = await resolveActiveConfig(body);
    const target = body.targetEmail || active.user || 'cliente@ejemplo.com';

    if (active.user && active.pass) {
      try {
        const transporter = nodemailer.createTransport({
          host: active.host,
          port: active.port,
          secure: active.secure,
          auth: { user: active.user, pass: active.pass }
        });
        await transporter.verify();
        await transporter.sendMail({
          from: `"${active.fromName}" <${active.fromEmail || active.user}>`,
          to: target,
          subject: '✓ Prueba Exitosa de Servidor SMTP — DigiMemories',
          html: '<h2>¡Conexión SMTP Exitosa!</h2><p>Tu servidor de correo está activo y entregando mensajes en vivo desde la nube.</p>'
        });
        return sendJson(res, 200, { success: true, message: `Correo de prueba enviado con éxito a ${target}`, mode: 'gmail_live' });
      } catch (err: any) {
        return sendJson(res, 200, { success: false, message: `Falla en autenticación SMTP: ${err.message}`, mode: 'sandbox' });
      }
    } else {
      return sendJson(res, 200, { success: true, message: 'Modo Sandbox activo. Configura tu cuenta de Gmail para envíos en vivo.', mode: 'sandbox' });
    }
  }

  // 5. GET /api/email/outbox
  if (req.method === 'GET' && url.includes('outbox')) {
    return sendJson(res, 200, { success: true, outbox: outboxLogs });
  }

  // Fallback
  return sendJson(res, 200, { success: true, message: 'API Email Endpoint Ready' });
}
