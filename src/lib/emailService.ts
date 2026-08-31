import { sendSimulatedEmail } from './store';
import type { EmailNotification } from './store';
import { 
  getQuoteEmailHtml, 
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
    console.warn('[EmailService] API dispatch error, fallback to local store:', err);
    return {
      success: true,
      status: 'sandbox_simulated',
      mode: 'sandbox',
      message: 'Correo registrado localmente en la bandeja de salida.',
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
  try {
    const res = await fetch('/api/email/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetEmail })
    });
    return await res.json();
  } catch (e: any) {
    return {
      success: false,
      message: `Error al conectar con la API interna: ${e.message}`,
      mode: 'sandbox'
    };
  }
}

/**
 * Get current sanitized SMTP configuration
 */
export async function fetchServerEmailConfig(): Promise<{ success: boolean; config: EmailServerConfig }> {
  try {
    const res = await fetch('/api/email/config');
    return await res.json();
  } catch (e: any) {
    return {
      success: false,
      config: {
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        user: '',
        fromName: 'DigiMemories Preservación',
        fromEmail: '',
        hasPassword: false,
        isConfigured: false,
        mode: 'sandbox'
      }
    };
  }
}

/**
 * Save new SMTP credentials to internal server
 */
export async function updateServerEmailConfig(newConfig: Partial<EmailServerConfig> & { pass?: string }): Promise<{ success: boolean; config: EmailServerConfig; message?: string }> {
  try {
    const res = await fetch('/api/email/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newConfig)
    });
    return await res.json();
  } catch (e: any) {
    return {
      success: false,
      config: {} as any,
      message: e.message
    };
  }
}

/**
 * Fetch Outbox records from internal server
 */
export async function fetchServerOutbox(): Promise<ServerOutboxRecord[]> {
  try {
    const res = await fetch('/api/email/outbox');
    const data = await res.json();
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
    const data = await res.json();
    return data.success;
  } catch (e) {
    return false;
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
