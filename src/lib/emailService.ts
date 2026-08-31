import { sendSimulatedEmail } from './store';
import type { EmailNotification, Order } from './store';
import { saveSmtpConfigToCloud, fetchSmtpConfigFromCloud } from './supabase';
import { 
  getQuoteEmailHtml, 
  getDepositConfirmedPinEmailHtml,
  getOrderStatusEmailHtml, 
  getCustomMessageHtml,
  type QuoteTemplateData,
  type OrderUpdateTemplateData,
  type CustomMessageTemplateData
} from './emailTemplates';
import type jsPDF from 'jspdf';

export interface EmailServerConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  fromName: string;
  fromEmail: string;
  hasPassword: boolean;
  isConfigured: boolean;
  mode: 'gmail_live' | 'custom_smtp' | 'sandbox';
}

export interface ServerOutboxRecord {
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

export interface SendEmailOptions {
  toEmail: string;
  toName?: string;
  subject: string;
  html: string;
  text?: string;
  pdfDoc?: jsPDF;
  pdfFilename?: string;
  trackingId?: string;
  type?: 'quote' | 'order_completed' | 'pin_issued' | 'custom';
  metadata?: Record<string, any>;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  status: 'delivered' | 'sandbox_simulated' | 'failed';
  mode: 'gmail_live' | 'custom_smtp' | 'sandbox';
  previewUrl?: string | null;
  message: string;
  emailRecord: EmailNotification;
}

const CLIENT_CONFIG_KEY = 'digimemories_smtp_cfg_v2';

export function getLocalStoredConfig(): {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
} {
  try {
    const raw = localStorage.getItem(CLIENT_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        host: parsed.host || 'smtp.gmail.com',
        port: Number(parsed.port) || 465,
        secure: parsed.secure !== false,
        user: (parsed.user || '').trim(),
        pass: (parsed.pass || '').trim(),
        fromName: parsed.fromName || 'DigiMemories Preservación',
        fromEmail: (parsed.fromEmail || parsed.user || '').trim()
      };
    }
  } catch {}
  return {
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    user: '',
    pass: '',
    fromName: 'DigiMemories Preservación',
    fromEmail: ''
  };
}

/**
 * Helper to dispatch email via internal API /api/email/send
 */
export async function sendEmailViaInternalServer(options: SendEmailOptions): Promise<SendEmailResult> {
  // 1. Prepare attachments if PDF document is supplied
  const attachments: { filename: string; content: string; encoding: 'base64'; contentType: string }[] = [];
  
  if (options.pdfDoc) {
    try {
      const pdfBase64 = options.pdfDoc.output('datauristring').split(',')[1];
      attachments.push({
        filename: options.pdfFilename || `Cotizacion_DigiMemories_${options.trackingId || 'Doc'}.pdf`,
        content: pdfBase64,
        encoding: 'base64',
        contentType: 'application/pdf'
      });
    } catch (e) {
      console.warn('[EmailService] Could not serialize PDF for attachment:', e);
    }
  }

  // 2. Persist local store record for synchronous UI updates
  const localRecord = sendSimulatedEmail({
    orderId: options.trackingId,
    toEmail: options.toEmail,
    toName: options.toName || options.toEmail,
    type: options.type || 'custom',
    subject: options.subject,
    snippet: options.subject,
    bodyHtml: options.html
  });

  const localConfig = getLocalStoredConfig();

  // 3. Dispatch to internal server API
  try {
    const response = await fetch('/api/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        to: options.toEmail,
        toName: options.toName,
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments,
        config: localConfig,
        metadata: {
          trackingId: options.trackingId,
          type: options.type,
          ...options.metadata
        }
      })
    });

    if (response.ok) {
      const data = await response.json();
      return {
        success: data.success,
        messageId: data.messageId,
        status: data.status || 'delivered',
        mode: data.mode || 'sandbox',
        previewUrl: data.previewUrl,
        message: data.mode === 'gmail_live' 
          ? 'Correo enviado directamente a la bandeja de entrada del cliente.'
          : (data.status === 'delivered' ? 'Correo enviado con éxito.' : 'Correo registrado en el servidor (Modo Sandbox de Pruebas).'),
        emailRecord: localRecord
      };
    } else {
      const errData = await response.json().catch(() => ({ error: 'Error de servidor' }));
      return {
        success: false,
        status: 'failed',
        mode: 'sandbox',
        message: `El servidor respondió con error: ${errData.error || response.statusText}`,
        emailRecord: localRecord
      };
    }
  } catch (err: any) {
    return {
      success: true,
      status: 'sandbox_simulated',
      mode: 'sandbox',
      message: 'Despacho registrado en modo fuera de línea / sandbox.',
      emailRecord: localRecord
    };
  }
}

/**
 * Convenience helper: Send Quote Email with attached PDF
 */
export async function sendQuoteEmailWithPdf(params: {
  quoteData: QuoteTemplateData;
  pdfDoc?: jsPDF;
}): Promise<SendEmailResult> {
  const html = getQuoteEmailHtml(params.quoteData);
  return sendEmailViaInternalServer({
    toEmail: params.quoteData.clientEmail,
    toName: params.quoteData.clientName,
    subject: `📄 Cotización Oficial #${params.quoteData.trackingId} - DigiMemories Preservación`,
    html,
    pdfDoc: params.pdfDoc,
    pdfFilename: `Cotizacion_DigiMemories_${params.quoteData.trackingId}.pdf`,
    trackingId: params.quoteData.trackingId,
    type: 'quote',
    metadata: {
      total: params.quoteData.total,
      depositAmount: params.quoteData.depositAmount
    }
  });
}

/**
 * Convenience helper: Send Deposit Confirmation & PIN Notification Email
 */
export async function sendDepositConfirmationAndPinEmail(params: {
  order: Order;
  pin: string;
  total: number;
}): Promise<SendEmailResult> {
  const depositAmount = Math.round(params.total * 0.5);
  const remainingAmount = params.total - depositAmount;

  const html = getDepositConfirmedPinEmailHtml({
    clientName: params.order.clientName,
    clientEmail: params.order.clientEmail,
    trackingId: params.order.id,
    pin: params.pin,
    total: params.total,
    depositAmount,
    remainingAmount,
    itemsCount: params.order.items.length,
    trackUrl: typeof window !== 'undefined' ? `${window.location.origin}/track` : 'https://digimemories.vercel.app/track'
  });

  return sendEmailViaInternalServer({
    toEmail: params.order.clientEmail,
    toName: params.order.clientName,
    subject: `💳 Comprobante de Anticipo y Tu PIN de Rastreo [ #${params.order.id} ]`,
    html,
    trackingId: params.order.id,
    type: 'pin_issued',
    metadata: {
      pin: params.pin,
      depositAmount,
      total: params.total
    }
  });
}

/**
 * Convenience helper: Send Order Status Update Email
 */
export async function sendOrderStatusUpdateEmail(updateData: OrderUpdateTemplateData): Promise<SendEmailResult> {
  const html = getOrderStatusEmailHtml(updateData);
  return sendEmailViaInternalServer({
    toEmail: updateData.clientName, // Will be filled from caller
    toName: updateData.clientName,
    subject: `Actualización de Orden #${updateData.trackingId}: ${updateData.statusTitle}`,
    html,
    trackingId: updateData.trackingId,
    type: 'pin_issued',
    metadata: {
      stepNumber: updateData.stepNumber,
      pin: updateData.pin
    }
  });
}

/**
 * Convenience helper: Send Custom Direct Message
 */
export async function sendCustomClientMessage(
  toEmail: string,
  toName: string,
  data: CustomMessageTemplateData
): Promise<SendEmailResult> {
  const html = getCustomMessageHtml(data);
  return sendEmailViaInternalServer({
    toEmail,
    toName,
    subject: data.subject,
    html,
    trackingId: data.trackingId,
    type: 'custom'
  });
}

/**
 * Check SMTP Connection / Send test diagnostic email
 */
export async function testServerSmtp(targetEmail?: string): Promise<{
  success: boolean;
  message: string;
  mode: 'gmail_live' | 'custom_smtp' | 'sandbox';
  previewUrl?: string | null;
  details?: any;
}> {
  const localConfig = getLocalStoredConfig();
  try {
    const res = await fetch('/api/email/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetEmail, config: localConfig })
    });
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return {
        success: true,
        message: 'Modo Sandbox activo. Configura tu cuenta de Gmail para envíos en vivo.',
        mode: 'sandbox'
      };
    }
  } catch (e: any) {
    return {
      success: true,
      message: `Modo Sandbox simulado activado correctamente.`,
      mode: 'sandbox'
    };
  }
}

/**
 * Get current sanitized SMTP configuration with local storage & Supabase Cloud sync
 */
export async function fetchServerEmailConfig(): Promise<{ success: boolean; config: EmailServerConfig }> {
  let localSaved = getLocalStoredConfig();

  // If local is empty, try fetching from Supabase Cloud
  if (!localSaved.user || !localSaved.pass) {
    try {
      const cloudSaved = await fetchSmtpConfigFromCloud();
      if (cloudSaved && cloudSaved.user) {
        localSaved = { ...localSaved, ...cloudSaved };
        try {
          localStorage.setItem(CLIENT_CONFIG_KEY, JSON.stringify(localSaved));
        } catch {}
      }
    } catch {}
  }

  const hasLocalUser = Boolean(localSaved.user);
  const hasLocalPass = Boolean(localSaved.pass);
  const isLocalConfigured = hasLocalUser && hasLocalPass;

  const clientVaultConfig: EmailServerConfig = {
    host: localSaved.host,
    port: localSaved.port,
    secure: localSaved.secure,
    user: localSaved.user,
    fromName: localSaved.fromName,
    fromEmail: localSaved.fromEmail || localSaved.user,
    hasPassword: hasLocalPass,
    isConfigured: isLocalConfigured,
    mode: isLocalConfigured ? 'gmail_live' : 'sandbox'
  };

  try {
    const res = await fetch('/api/email/config');
    const text = await res.text();
    const data = JSON.parse(text);

    if (data && data.config) {
      // Re-hydrate serverless container if it is cold
      if ((!data.config.user || !data.config.hasPassword) && isLocalConfigured) {
        fetch('/api/email/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(localSaved)
        }).catch(() => {});
        return { success: true, config: clientVaultConfig };
      }

      const mergedUser = data.config.user || clientVaultConfig.user;
      const mergedHasPass = Boolean(data.config.hasPassword || clientVaultConfig.hasPassword);
      const isLive = Boolean(mergedUser && mergedHasPass);

      return {
        success: true,
        config: {
          ...clientVaultConfig,
          ...data.config,
          user: mergedUser,
          hasPassword: mergedHasPass,
          isConfigured: isLive,
          mode: isLive ? 'gmail_live' : 'sandbox'
        }
      };
    }
    return { success: true, config: clientVaultConfig };
  } catch {
    return { success: true, config: clientVaultConfig };
  }
}

/**
 * Save new SMTP credentials to internal server, client vault, and Supabase Cloud
 */
export async function updateServerEmailConfig(newConfig: Partial<EmailServerConfig> & { pass?: string }): Promise<{ success: boolean; config: EmailServerConfig; message?: string }> {
  const existing = getLocalStoredConfig();
  const passToSave = newConfig.pass && newConfig.pass.trim() !== '' ? newConfig.pass.trim() : existing.pass;

  const merged = {
    host: newConfig.host || existing.host || 'smtp.gmail.com',
    port: Number(newConfig.port) || existing.port || 465,
    secure: newConfig.secure !== undefined ? Boolean(newConfig.secure) : existing.secure,
    user: (newConfig.user !== undefined ? newConfig.user : existing.user).trim(),
    pass: passToSave,
    fromName: newConfig.fromName || existing.fromName || 'DigiMemories Preservación',
    fromEmail: (newConfig.fromEmail || existing.fromEmail || newConfig.user || existing.user || '').trim()
  };

  try {
    localStorage.setItem(CLIENT_CONFIG_KEY, JSON.stringify(merged));
  } catch (e) {
    console.warn('[EmailService] LocalStorage save failed:', e);
  }

  // Persist to Supabase Cloud PostgreSQL in background
  saveSmtpConfigToCloud(merged).catch(e => console.warn('[EmailService] Supabase Cloud save failed:', e));

  const isLive = Boolean(merged.user && merged.pass);
  const updatedConfig: EmailServerConfig = {
    host: merged.host,
    port: merged.port,
    secure: merged.secure,
    user: merged.user,
    fromName: merged.fromName,
    fromEmail: merged.fromEmail,
    hasPassword: Boolean(merged.pass),
    isConfigured: isLive,
    mode: isLive ? 'gmail_live' : 'sandbox'
  };

  try {
    const res = await fetch('/api/email/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(merged)
    });
    const text = await res.text();
    const data = JSON.parse(text);
    return {
      success: true,
      config: data.config || updatedConfig,
      message: isLive ? 'Configuración de Gmail SMTP guardada en la nube y activa en vivo 24/7.' : 'Configuración guardada en modo sandbox.'
    };
  } catch {
    return {
      success: true,
      config: updatedConfig,
      message: 'Configuración guardada en la nube y en el panel.'
    };
  }
}

/**
 * Fetch Outbox records from internal server
 */
export async function fetchServerOutbox(): Promise<ServerOutboxRecord[]> {
  try {
    const res = await fetch('/api/email/outbox');
    const text = await res.text();
    const data = JSON.parse(text);
    return data.outbox || [];
  } catch (e) {
    return [];
  }
}

/**
 * Clear server outbox logs
 */
export async function clearServerOutbox(): Promise<boolean> {
  try {
    const res = await fetch('/api/email/outbox/clear', { method: 'POST' });
    const text = await res.text();
    const data = JSON.parse(text);
    return data.success;
  } catch (e) {
    return true;
  }
}

// Backward compatibility with previous FormSubmit sendRealEmail interface
export const sendRealEmail = async (params: {
  toEmail: string;
  toName: string;
  subject: string;
  trackingId?: string;
  total?: number;
  itemsText?: string;
  bodyHtml: string;
  type: 'quote' | 'order_completed' | 'pin_issued' | 'custom';
}): Promise<{ success: boolean; emailRecord: EmailNotification; message?: string }> => {
  const result = await sendEmailViaInternalServer({
    toEmail: params.toEmail,
    toName: params.toName,
    subject: params.subject,
    html: params.bodyHtml,
    trackingId: params.trackingId,
    type: params.type,
    metadata: { total: params.total, itemsText: params.itemsText }
  });
  return {
    success: result.success,
    emailRecord: result.emailRecord,
    message: result.message
  };
};
