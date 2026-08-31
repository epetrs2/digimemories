export interface QuoteTemplateData {
  clientName: string;
  clientEmail: string;
  trackingId: string;
  total: number;
  depositAmount: number;
  remainingAmount: number;
  items: {
    label: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    subtotal: number;
  }[];
  enhanceAudioVideo?: boolean;
  notes?: string;
  tallerAddress?: string;
  tallerPhone?: string;
  trackUrl?: string;
}

export interface DepositConfirmedTemplateData {
  clientName: string;
  clientEmail: string;
  trackingId: string;
  pin: string;
  total: number;
  depositAmount: number;
  remainingAmount: number;
  itemsCount: number;
  trackUrl?: string;
  tallerAddress?: string;
  tallerPhone?: string;
}

export interface OrderUpdateTemplateData {
  clientName: string;
  trackingId: string;
  statusTitle: string;
  statusDescription: string;
  stepNumber: number; // 1 to 4
  pin?: string;
  trackUrl: string;
}

export interface CustomMessageTemplateData {
  clientName: string;
  subject: string;
  message: string;
  trackingId?: string;
  actionUrl?: string;
  actionText?: string;
}

export interface TestEmailTemplateData {
  smtpHost: string;
  smtpUser: string;
  timestamp: string;
  mode: 'gmail_live' | 'custom_smtp' | 'sandbox';
}

const THERMAL_TICKET_STYLES = `
  body { margin: 0; padding: 0; background-color: #f2efe9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Courier New', monospace, sans-serif; -webkit-font-smoothing: antialiased; color: #1c1917; }
  table { border-collapse: collapse; width: 100%; }
  img { border: 0; outline: none; text-decoration: none; }
  .ticket-wrapper { width: 100%; max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 18px; overflow: hidden; box-shadow: 0 15px 35px rgba(28, 25, 23, 0.08); border: 1px solid #e2ddd3; }
  .ticket-header { background: #1c1917; color: #ffffff; padding: 32px 28px 24px 28px; text-align: center; border-bottom: 3px dashed #ea580c; position: relative; }
  .ticket-body { padding: 32px 28px; background-color: #faf9f6; }
  .barcode-strip { font-family: 'Courier New', Courier, monospace; letter-spacing: 3px; font-weight: 700; color: #44403c; text-align: center; margin: 20px 0 10px 0; font-size: 13px; }
  .btn-action { display: inline-block; background: #ea580c; color: #ffffff !important; text-decoration: none; font-weight: 800; font-size: 15px; padding: 15px 32px; border-radius: 12px; text-align: center; box-shadow: 0 4px 15px rgba(234, 88, 12, 0.3); letter-spacing: 0.5px; }
  .pin-badge { background: #1c1917; border: 2px dashed #ea580c; border-radius: 14px; padding: 20px; text-align: center; margin: 24px 0; }
  .ticket-footer { background-color: #f2efe9; padding: 24px 28px; text-align: center; font-size: 11px; color: #78716c; border-top: 2px dashed #d6ccc2; font-family: 'Courier New', monospace; }
`;

/**
 * 1. TEMPLATE: CONFIRMACIÓN DE ANTICIPO & ACTIVACIÓN DE PIN (Ticket Térmico Pro)
 */
export function getDepositConfirmedPinEmailHtml(data: DepositConfirmedTemplateData): string {
  const trackUrl = data.trackUrl || 'https://digimemories.vercel.app/track';
  const nowStr = new Date().toLocaleString('es-MX', { 
    year: 'numeric', month: '2-digit', day: '2-digit', 
    hour: '2-digit', minute: '2-digit', hour12: true 
  });

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Comprobante de Anticipo y PIN de Rastreo #${data.trackingId}</title>
  <style>${THERMAL_TICKET_STYLES}</style>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #f2efe9;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <div class="ticket-wrapper">
          
          <!-- Thermal Header -->
          <div class="ticket-header">
            <div style="font-family: 'Courier New', monospace; font-size: 10px; letter-spacing: 3px; color: #fed7aa; margin-bottom: 6px; text-transform: uppercase;">
              *** COMPROBANTE OFICIAL DE ANTICIPO ***
            </div>
            <div style="font-size: 26px; font-weight: 900; letter-spacing: -0.5px; margin: 0; color: #ffffff;">
              DIGIMEMORIES <span style="color: #ea580c;">LAB</span>
            </div>
            <div style="font-family: 'Courier New', monospace; font-size: 11px; color: #a8a29e; margin-top: 4px;">
              LABORATORIO DE PRESERVACIÓN ANALÓGICA • CDMX
            </div>
          </div>

          <!-- Ticket Body -->
          <div class="ticket-body">
            
            <!-- Metadata Receipt Grid -->
            <div style="border-bottom: 2px dashed #d6ccc2; padding-bottom: 16px; margin-bottom: 20px; font-family: 'Courier New', monospace; font-size: 12px; color: #44403c; line-height: 1.7;">
              <div style="display: flex; justify-content: space-between;">
                <span>FOLIO DE RASTREO:</span>
                <strong style="color: #ea580c; font-size: 14px;">#${data.trackingId}</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span>CLIENTE TITULAR:</span>
                <strong style="color: #1c1917;">${data.clientName}</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span>FECHA DE EMISIÓN:</span>
                <span>${nowStr}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span>ESTADO DE ORDEN:</span>
                <strong style="color: #15803d; background: #dcfce7; padding: 1px 8px; border-radius: 4px;">EN PROCESO DE CAPTURA 1:1</strong>
              </div>
            </div>

            <p style="font-size: 14px; line-height: 1.6; color: #292524; margin: 0 0 16px 0;">
              ¡Hola, <strong>${data.clientName}</strong>! Hemos recibido y validado con éxito el anticipo correspondiente a tu lote de <strong>${data.itemsCount} artículo(s)</strong>. Tu material ya ha ingresado formalmente a nuestra fila de digitalización profesional.
            </p>

            <!-- PIN SECURITY BADGE -->
            <div class="pin-badge">
              <div style="font-family: 'Courier New', monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 2.5px; color: #fed7aa; margin-bottom: 8px;">
                🔐 TU PIN PRIVADO DE SEGUIMIENTO EN VIVO
              </div>
              <div style="font-family: 'Courier New', monospace; font-size: 40px; font-weight: 900; letter-spacing: 10px; color: #ffedd5; margin: 6px 0;">
                ${data.pin}
              </div>
              <div style="font-size: 12px; color: #d6d3d1; margin-top: 8px; line-height: 1.4;">
                Ingresa con tu <strong>Folio #${data.trackingId}</strong> y este <strong>PIN</strong> en nuestro portal para monitorear el avance cinta por cinta en tiempo real.
              </div>
            </div>

            <!-- Financial Summary Box (Receipt Style) -->
            <div style="background: #ffffff; border: 1px solid #e7e2d9; border-radius: 12px; padding: 18px; margin: 20px 0; font-family: 'Courier New', monospace;">
              <div style="font-size: 11px; color: #78716c; letter-spacing: 1px; margin-bottom: 10px; text-transform: uppercase; border-bottom: 1px dashed #e7e2d9; padding-bottom: 6px;">
                Desglose Financiero del Servicio
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px; color: #57534e;">
                <span>Total Estimado del Trabajo:</span>
                <span>$${data.total.toLocaleString('es-MX')} MXN</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 8px; color: #15803d; font-weight: 700;">
                <span>Anticipo Abonado (50%):</span>
                <span>-$${data.depositAmount.toLocaleString('es-MX')} MXN [PAGADO]</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 15px; font-weight: 800; color: #ea580c; border-top: 2px dashed #d6ccc2; padding-top: 10px; margin-top: 6px;">
                <span>Saldo contra-entrega:</span>
                <span>$${data.remainingAmount.toLocaleString('es-MX')} MXN</span>
              </div>
            </div>

            <!-- Action Button CTA -->
            <div style="text-align: center; margin: 30px 0 16px 0;">
              <a href="${trackUrl}" target="_blank" class="btn-action">
                🔍 Consultar Portal de Rastreo en Vivo →
              </a>
            </div>

            <!-- Barcode Pattern Strip -->
            <div class="barcode-strip">
              ||| | ||||| || | |||| || ||| || ||||| |||| | |||
              <div style="font-size: 10px; letter-spacing: 1px; color: #a8a29e; margin-top: 2px;">
                SECURITY HASH: AUTH-PIN-${data.trackingId}-${data.pin}
              </div>
            </div>

          </div>

          <!-- Thermal Footer -->
          <div class="ticket-footer">
            <div style="font-weight: 700; color: #44403c; margin-bottom: 4px;">
              DIGIMEMORIES — TALLER DE PRESERVACIÓN
            </div>
            <div>${data.tallerAddress || 'Av. Insurgentes Sur #450, Col. Roma Sur, CDMX'}</div>
            <div style="margin-top: 4px;">WhatsApp Taller: ${data.tallerPhone || '+52 55 4888 9876'}</div>
            <div style="margin-top: 8px; color: #a8a29e; font-size: 10px;">
              Conserva este correo como comprobante digital de tu servicio.
            </div>
          </div>

        </div>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * 2. TEMPLATE: COTIZACIÓN OFICIAL (Estilo Ticket Térmico con Desglose)
 */
export function getQuoteEmailHtml(data: QuoteTemplateData): string {
  const trackUrl = data.trackUrl || 'https://digimemories.vercel.app/track';
  const nowStr = new Date().toLocaleString('es-MX', { 
    year: 'numeric', month: '2-digit', day: '2-digit', 
    hour: '2-digit', minute: '2-digit', hour12: true 
  });

  const itemsRows = data.items.map(item => `
    <tr style="border-bottom: 1px dashed #e7e2d9; font-family: 'Courier New', monospace; font-size: 13px;">
      <td style="padding: 10px 4px; color: #292524; font-weight: 700;">${item.label}</td>
      <td style="padding: 10px 4px; text-align: center; color: #57534e;">${item.quantity} ${item.unit}</td>
      <td style="padding: 10px 4px; text-align: right; color: #78716c;">$${item.unitPrice}</td>
      <td style="padding: 10px 4px; text-align: right; font-weight: 800; color: #ea580c;">$${item.subtotal.toLocaleString('es-MX')}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cotización Oficial #${data.trackingId}</title>
  <style>${THERMAL_TICKET_STYLES}</style>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #f2efe9;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <div class="ticket-wrapper">
          
          <!-- Thermal Header -->
          <div class="ticket-header">
            <div style="font-family: 'Courier New', monospace; font-size: 10px; letter-spacing: 3px; color: #fed7aa; margin-bottom: 6px; text-transform: uppercase;">
              *** PRESUPUESTO OFICIAL DE DIGITALIZACIÓN ***
            </div>
            <div style="font-size: 26px; font-weight: 900; letter-spacing: -0.5px; margin: 0; color: #ffffff;">
              DIGIMEMORIES <span style="color: #ea580c;">LAB</span>
            </div>
            <div style="font-family: 'Courier New', monospace; font-size: 11px; color: #a8a29e; margin-top: 4px;">
              PRESERVACIÓN DIGITAL 1:1 DE ALTA FIDELIDAD
            </div>
          </div>

          <!-- Ticket Body -->
          <div class="ticket-body">
            
            <!-- Metadata Receipt Grid -->
            <div style="border-bottom: 2px dashed #d6ccc2; padding-bottom: 14px; margin-bottom: 20px; font-family: 'Courier New', monospace; font-size: 12px; color: #44403c; line-height: 1.7;">
              <div style="display: flex; justify-content: space-between;">
                <span>FOLIO COTIZACIÓN:</span>
                <strong style="color: #ea580c; font-size: 14px;">#${data.trackingId}</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span>CLIENTE:</span>
                <strong style="color: #1c1917;">${data.clientName}</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span>FECHA:</span>
                <span>${nowStr}</span>
              </div>
            </div>

            <p style="font-size: 14px; line-height: 1.6; color: #292524; margin: 0 0 18px 0;">
              ¡Hola, <strong>${data.clientName}</strong>! Hemos generado tu presupuesto oficial con entrega en formato digital MP4 y resguardo seguro de tu material original.
            </p>

            <!-- Attachment Notice -->
            <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 10px; padding: 12px 16px; margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 20px;">📎</span>
              <div style="font-size: 13px; color: #9a3412;">
                <strong>Documento PDF Oficial Adjunto:</strong> Hemos adjuntado el presupuesto vectorial formal a este correo para tu control y resguardo.
              </div>
            </div>

            <!-- Items Table -->
            <table style="margin-bottom: 20px;">
              <thead>
                <tr style="border-bottom: 2px solid #1c1917; font-family: 'Courier New', monospace; font-size: 11px; text-transform: uppercase; color: #78716c;">
                  <th align="left" style="padding: 6px 4px;">Formato</th>
                  <th align="center" style="padding: 6px 4px;">Cant.</th>
                  <th align="right" style="padding: 6px 4px;">P. Unit</th>
                  <th align="right" style="padding: 6px 4px;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRows}
              </tbody>
            </table>

            <!-- Financial Totals -->
            <div style="background: #ffffff; border: 1px solid #e7e2d9; border-radius: 12px; padding: 18px; margin: 20px 0; font-family: 'Courier New', monospace;">
              <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px; color: #57534e;">
                <span>Total Estimado:</span>
                <strong style="color: #1c1917;">$${data.total.toLocaleString('es-MX')} MXN</strong>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 8px; color: #ea580c; font-weight: 700;">
                <span>Anticipo Requerido (50%):</span>
                <span>$${data.depositAmount.toLocaleString('es-MX')} MXN</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 800; color: #15803d; border-top: 2px dashed #d6ccc2; padding-top: 10px; margin-top: 6px;">
                <span>Saldo al Recoger:</span>
                <span>$${data.remainingAmount.toLocaleString('es-MX')} MXN</span>
              </div>
            </div>

            <!-- Action CTA -->
            <div style="text-align: center; margin: 30px 0 16px 0;">
              <a href="${trackUrl}" target="_blank" class="btn-action">
                📋 Ver Detalle de Orden en el Portal →
              </a>
            </div>

            <!-- Barcode Pattern Strip -->
            <div class="barcode-strip">
              |||| | || ||||| | ||| |||| | || ||||| || | |||
              <div style="font-size: 10px; letter-spacing: 1px; color: #a8a29e; margin-top: 2px;">
                DIGIMEMORIES QUOTE REGISTRY • FOLIO #${data.trackingId}
              </div>
            </div>

          </div>

          <!-- Thermal Footer -->
          <div class="ticket-footer">
            <div style="font-weight: 700; color: #44403c; margin-bottom: 4px;">
              DIGIMEMORIES — TALLER DE PRESERVACIÓN
            </div>
            <div>${data.tallerAddress || 'Av. Insurgentes Sur #450, Col. Roma Sur, CDMX'}</div>
            <div style="margin-top: 4px;">WhatsApp: ${data.tallerPhone || '+52 55 4888 9876'}</div>
          </div>

        </div>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * 3. TEMPLATE: ACTUALIZACIÓN DE ESTADO
 */
export function getOrderStatusEmailHtml(data: OrderUpdateTemplateData): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Actualización de Orden #${data.trackingId}</title>
  <style>${THERMAL_TICKET_STYLES}</style>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #f2efe9;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <div class="ticket-wrapper">
          <div class="ticket-header">
            <div style="font-family: 'Courier New', monospace; font-size: 10px; letter-spacing: 3px; color: #fed7aa; margin-bottom: 6px; text-transform: uppercase;">
              *** ACTUALIZACIÓN DE PROCESO DE TALLER ***
            </div>
            <div style="font-size: 26px; font-weight: 900; color: #ffffff;">
              DIGIMEMORIES <span style="color: #ea580c;">LAB</span>
            </div>
            <div style="font-family: 'Courier New', monospace; font-size: 12px; color: #ea580c; margin-top: 4px;">
              ORDEN #${data.trackingId}
            </div>
          </div>

          <div class="ticket-body">
            <div style="background: #ffffff; border: 2px solid #ea580c; border-radius: 14px; padding: 20px; text-align: center; margin-bottom: 24px;">
              <div style="font-size: 11px; font-family: 'Courier New', monospace; color: #78716c; text-transform: uppercase; letter-spacing: 2px;">
                ETAPA DEL PROCESO
              </div>
              <div style="font-size: 22px; font-weight: 900; color: #1c1917; margin: 8px 0;">
                ${data.statusTitle}
              </div>
              <div style="font-size: 14px; color: #57534e; line-height: 1.5;">
                ${data.statusDescription}
              </div>
            </div>

            <div style="text-align: center; margin: 28px 0 16px 0;">
              <a href="${data.trackUrl}" target="_blank" class="btn-action">
                Ver Avance en Tiempo Real →
              </a>
            </div>
          </div>

          <div class="ticket-footer">
            <div>DIGIMEMORIES LAB • Preservación Digital</div>
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * 4. TEMPLATE: MENSAJE PERSONALIZADO DEL TALLER
 */
export function getCustomMessageHtml(data: CustomMessageTemplateData): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.subject}</title>
  <style>${THERMAL_TICKET_STYLES}</style>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #f2efe9;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <div class="ticket-wrapper">
          <div class="ticket-header">
            <div style="font-size: 24px; font-weight: 900; color: #ffffff;">
              DIGIMEMORIES <span style="color: #ea580c;">LAB</span>
            </div>
            <div style="font-family: 'Courier New', monospace; font-size: 11px; color: #fed7aa; margin-top: 4px;">
              COMUNICADO OFICIAL DE TALLER
            </div>
          </div>

          <div class="ticket-body">
            <div style="font-size: 15px; line-height: 1.65; color: #292524;">
              <p>Estimado(a) <strong>${data.clientName}</strong>,</p>
              <div style="background: #ffffff; border: 1px solid #e7e2d9; border-left: 4px solid #ea580c; border-radius: 8px; padding: 18px; margin: 20px 0; font-size: 14px; line-height: 1.7; color: #1c1917; white-space: pre-wrap;">${data.message}</div>
            </div>

            ${data.actionUrl ? `
              <div style="text-align: center; margin: 28px 0 16px 0;">
                <a href="${data.actionUrl}" target="_blank" class="btn-action">
                  ${data.actionText || 'Consultar Detalles'} →
                </a>
              </div>
            ` : ''}
          </div>

          <div class="ticket-footer">
            <div>DIGIMEMORIES • Taller de Preservación Analógica</div>
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * 5. TEMPLATE: TEST DIAGNÓSTICO SMTP
 */
export function getTestEmailHtml(data: TestEmailTemplateData): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Prueba Exitosa de Servidor SMTP</title>
  <style>${THERMAL_TICKET_STYLES}</style>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #f2efe9;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <div class="ticket-wrapper">
          <div class="ticket-header" style="background: #064e3b; border-bottom: 3px dashed #10b981;">
            <div style="font-family: 'Courier New', monospace; font-size: 11px; color: #a7f3d0; margin-bottom: 4px;">
              *** DIAGNÓSTICO DE SERVIDOR EXITOSO ***
            </div>
            <div style="font-size: 24px; font-weight: 900; color: #ffffff;">
              SMTP OPERATIVO 🟢
            </div>
          </div>

          <div class="ticket-body">
            <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 18px; margin-bottom: 20px; font-family: 'Courier New', monospace; font-size: 13px; color: #065f46;">
              <div><strong>SERVIDOR HOST:</strong> ${data.smtpHost}</div>
              <div><strong>CUENTA EMISORA:</strong> ${data.smtpUser}</div>
              <div><strong>MODO:</strong> ${data.mode === 'gmail_live' ? 'Gmail SMTP en Vivo 🟢' : 'Sandbox de Pruebas 🟡'}</div>
              <div><strong>TIMESTAMP:</strong> ${data.timestamp}</div>
            </div>
            <p style="font-size: 14px; color: #374151; line-height: 1.5; margin: 0;">
              Tu servidor de correo está despachando mensajes exitosamente. Todas las cotizaciones, comprobantes de anticipo con PIN y avisos de entrega se entregarán de forma inmediata.
            </p>
          </div>

          <div class="ticket-footer">
            <div>DigiMemories Engine • Sistema Interno de Mensajería</div>
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}
