import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { getTestEmailHtml } from './emailTemplates.ts';

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
  enabled: boolean;
}

export interface EmailAttachment {
  filename: string;
  content: string; // Base64 or plain string
  encoding?: 'base64' | 'utf-8';
  contentType?: string;
}

export interface OutboxEmailRecord {
  id: string;
  to: string;
  toName?: string;
  subject: string;
  sentAt: string;
  status: 'delivered' | 'sandbox_simulated' | 'failed';
  mode: 'gmail_live' | 'custom_smtp' | 'sandbox';
  previewUrl?: string | null;
  messageId?: string;
  errorMessage?: string;
  html: string;
  attachmentsCount: number;
  metadata?: Record<string, any>;
}

// Config file path in project root
const CONFIG_FILE = path.resolve(process.cwd(), 'server', 'smtpConfig.json');
const OUTBOX_FILE = path.resolve(process.cwd(), 'server', 'outboxLogs.json');

// Default initial configuration
let currentConfig: SmtpConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 465,
  secure: process.env.SMTP_SECURE !== 'false',
  user: process.env.SMTP_USER || '',
  pass: process.env.SMTP_PASS || '',
  fromName: process.env.SMTP_FROM_NAME || 'DigiMemories Preservación',
  fromEmail: process.env.SMTP_FROM_EMAIL || '',
  enabled: true
};

// Try loading saved config if exists
try {
  if (fs.existsSync(CONFIG_FILE)) {
    const saved = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    currentConfig = { ...currentConfig, ...saved };
  }
} catch (e) {
  console.warn('[Mailer] Could not read saved SMTP config, using defaults:', e);
}

// In-memory outbox log with fallback persistence
let outboxLogs: OutboxEmailRecord[] = [];
try {
  if (fs.existsSync(OUTBOX_FILE)) {
    outboxLogs = JSON.parse(fs.readFileSync(OUTBOX_FILE, 'utf-8'));
  }
} catch (e) {
  outboxLogs = [];
}

const saveOutbox = () => {
  try {
    const dir = path.dirname(OUTBOX_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(OUTBOX_FILE, JSON.stringify(outboxLogs.slice(0, 100), null, 2), 'utf-8');
  } catch (e) {
    console.error('[Mailer] Error saving outbox logs:', e);
  }
};

const saveConfig = () => {
  try {
    const dir = path.dirname(CONFIG_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(currentConfig, null, 2), 'utf-8');
  } catch (e) {
    console.error('[Mailer] Error saving SMTP config:', e);
  }
};

/**
 * Creates the appropriate Nodemailer transporter based on current configuration
 */
async function createTransporter(): Promise<{ transporter: nodemailer.Transporter; isSandbox: boolean }> {
  // Check if live credentials are provided and valid
  const hasUser = !!currentConfig.user && currentConfig.user.trim().length > 0;
  const hasPass = !!currentConfig.pass && currentConfig.pass.trim().length > 0;

  if (hasUser && hasPass) {
    // If it's a Gmail account, optimize with Gmail service preset
    const isGmail = currentConfig.user.includes('@gmail.com') || currentConfig.host.includes('gmail');
    
    const transportOptions: nodemailer.TransportOptions = isGmail ? {
      service: 'gmail',
      auth: {
        user: currentConfig.user.trim(),
        pass: currentConfig.pass.trim().replace(/\s+/g, '') // remove spaces from App Passwords
      }
    } as any : {
      host: currentConfig.host,
      port: currentConfig.port,
      secure: currentConfig.secure,
      auth: {
        user: currentConfig.user.trim(),
        pass: currentConfig.pass.trim()
      },
      tls: {
        rejectUnauthorized: false
      }
    } as any;

    return {
      transporter: nodemailer.createTransport(transportOptions),
      isSandbox: false
    };
  }

  // Fallback to Sandbox mode (Ethereal test transport or JSON transport)
  const testAccount = await nodemailer.createTestAccount().catch(() => null);
  if (testAccount) {
    return {
      transporter: nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      }),
      isSandbox: true
    };
  }

  // Pure JSON fallback
  return {
    transporter: nodemailer.createTransport({
      jsonTransport: true
    }),
    isSandbox: true
  };
}

export interface SendEmailPayload {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
  metadata?: Record<string, any>;
}

/**
 * Sends an email using the internal mail engine
 */
export async function sendEmail(payload: SendEmailPayload): Promise<{
  success: boolean;
  messageId: string;
  status: 'delivered' | 'sandbox_simulated' | 'failed';
  mode: 'gmail_live' | 'custom_smtp' | 'sandbox';
  previewUrl?: string | null;
  error?: string;
  record: OutboxEmailRecord;
}> {
  const emailId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const fromAddress = `"${currentConfig.fromName}" <${currentConfig.fromEmail || currentConfig.user || 'notificaciones@digimemories.mx'}>`;

  // Format attachments for Nodemailer
  const formattedAttachments = (payload.attachments || []).map(att => ({
    filename: att.filename,
    content: att.encoding === 'base64' ? Buffer.from(att.content, 'base64') : att.content,
    contentType: att.contentType
  }));

  try {
    const { transporter, isSandbox } = await createTransporter();

    const mailOptions: nodemailer.SendMailOptions = {
      from: fromAddress,
      to: payload.toName ? `"${payload.toName}" <${payload.to}>` : payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text || payload.html.replace(/<[^>]*>?/gm, ''),
      replyTo: payload.replyTo || currentConfig.fromEmail || currentConfig.user,
      attachments: formattedAttachments
    };

    const info = await transporter.sendMail(mailOptions);
    const previewUrl = isSandbox ? nodemailer.getTestMessageUrl(info) || null : null;
    const mode = isSandbox ? 'sandbox' : (currentConfig.user.includes('@gmail.com') ? 'gmail_live' : 'custom_smtp');

    const record: OutboxEmailRecord = {
      id: emailId,
      to: payload.to,
      toName: payload.toName,
      subject: payload.subject,
      sentAt: new Date().toISOString(),
      status: isSandbox ? 'sandbox_simulated' : 'delivered',
      mode,
      previewUrl,
      messageId: info.messageId || emailId,
      html: payload.html,
      attachmentsCount: formattedAttachments.length,
      metadata: payload.metadata
    };

    outboxLogs.unshift(record);
    saveOutbox();

    return {
      success: true,
      messageId: record.messageId || emailId,
      status: record.status,
      mode: record.mode,
      previewUrl,
      record
    };
  } catch (error: any) {
    console.error('[Mailer] Send Error:', error);

    const record: OutboxEmailRecord = {
      id: emailId,
      to: payload.to,
      toName: payload.toName,
      subject: payload.subject,
      sentAt: new Date().toISOString(),
      status: 'failed',
      mode: currentConfig.user.includes('@gmail.com') ? 'gmail_live' : 'custom_smtp',
      errorMessage: error.message || 'Error de conexión SMTP',
      html: payload.html,
      attachmentsCount: formattedAttachments.length,
      metadata: payload.metadata
    };

    outboxLogs.unshift(record);
    saveOutbox();

    return {
      success: false,
      messageId: emailId,
      status: 'failed',
      mode: record.mode,
      error: error.message || 'Error al conectar con servidor SMTP',
      record
    };
  }
}

/**
 * Tests the SMTP Connection and optionally sends a diagnosis email
 */
export async function testSmtpConnection(targetEmail?: string): Promise<{
  success: boolean;
  message: string;
  mode: 'gmail_live' | 'custom_smtp' | 'sandbox';
  previewUrl?: string | null;
  details: {
    host: string;
    port: number;
    user: string;
    authValid: boolean;
  };
}> {
  const { transporter, isSandbox } = await createTransporter();
  const mode = isSandbox ? 'sandbox' : (currentConfig.user.includes('@gmail.com') ? 'gmail_live' : 'custom_smtp');

  try {
    if (!isSandbox) {
      await transporter.verify();
    }

    let previewUrl: string | null = null;

    if (targetEmail) {
      const html = getTestEmailHtml({
        smtpHost: isSandbox ? 'Ethereal Sandbox (Pruebas)' : currentConfig.host,
        smtpUser: isSandbox ? 'Modo Simulado' : currentConfig.user,
        timestamp: new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' }),
        mode
      });

      const sendResult = await sendEmail({
        to: targetEmail,
        toName: 'Administrador DigiMemories',
        subject: '✓ Diagnóstico del Servidor Interno de Correo - DigiMemories',
        html
      });
      previewUrl = sendResult.previewUrl || null;
    }

    return {
      success: true,
      message: isSandbox 
        ? 'El servidor de correo está en Modo Sandbox (Pruebas). Los correos se simulan y quedan en la bandeja de salida.'
        : '¡Conexión SMTP con Gmail validada exitosamente! Los correos se enviarán directamente a las bandejas de entrada.',
      mode,
      previewUrl,
      details: {
        host: isSandbox ? 'smtp.ethereal.email (Sandbox)' : currentConfig.host,
        port: isSandbox ? 587 : currentConfig.port,
        user: isSandbox ? '(Sin credenciales activas)' : currentConfig.user,
        authValid: true
      }
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Error de autenticación SMTP: ${err.message || 'Credenciales no válidas o bloqueo de seguridad de Google'}`,
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

/**
 * Returns current configuration with masked password
 */
export function getSanitizedConfig() {
  const hasUser = !!currentConfig.user && currentConfig.user.trim().length > 0;
  const hasPass = !!currentConfig.pass && currentConfig.pass.trim().length > 0;
  
  return {
    host: currentConfig.host,
    port: currentConfig.port,
    secure: currentConfig.secure,
    user: currentConfig.user,
    fromName: currentConfig.fromName,
    fromEmail: currentConfig.fromEmail,
    hasPassword: hasPass,
    isConfigured: hasUser && hasPass,
    mode: (hasUser && hasPass) ? (currentConfig.user.includes('@gmail.com') ? 'gmail_live' : 'custom_smtp') : 'sandbox'
  };
}

/**
 * Updates SMTP configuration dynamically
 */
export function updateConfig(newConfig: Partial<SmtpConfig>) {
  currentConfig = {
    ...currentConfig,
    ...newConfig
  };
  saveConfig();
  return getSanitizedConfig();
}

/**
 * Returns outbox history
 */
export function getOutbox() {
  return outboxLogs;
}

/**
 * Clears outbox logs
 */
export function clearOutbox() {
  outboxLogs = [];
  saveOutbox();
  return { success: true };
}
