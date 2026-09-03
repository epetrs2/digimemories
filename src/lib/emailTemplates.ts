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
  deliveryMethod?: 'uber_flash' | 'national_shipping';
  preferredPaymentMethod?: 'mercadopago' | 'spei';
  qualifiesForFreeReturn?: boolean;
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

const LUXURY_EMAIL_STYLES = `
  body { margin: 0; padding: 0; background-color: #f6f3ee; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #292524; }
  table { border-collapse: collapse; width: 100%; }
  img { border: 0; outline: none; text-decoration: none; }
  .wrapper { width: 100%; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 18px; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05); border: 1px solid #e7e2d9; }
  .header { background: linear-gradient(135deg, #1c1917 0%, #292524 100%); padding: 34px 28px; text-align: center; color: #ffffff; }
  .brand-title { font-size: 26px; font-weight: 900; letter-spacing: -0.5px; margin: 0; color: #ea580c; }
  .brand-sub { font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #d6d3d1; margin-top: 6px; }
  .content { padding: 34px 28px; }
  .badge { display: inline-block; background-color: #ffedd5; color: #c2410c; padding: 5px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; }
  .badge-green { display: inline-block; background-color: #dcfce7; color: #15803d; padding: 5px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; }
  .card { background-color: #faf8f5; border: 1px solid #e7e2d9; border-radius: 14px; padding: 22px; margin: 22px 0; }
  .btn-primary { display: inline-block; background-color: #ea580c; color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 15px; padding: 14px 30px; border-radius: 12px; text-align: center; box-shadow: 0 4px 14px rgba(234, 88, 12, 0.25); }
  .footer { background-color: #f6f3ee; padding: 24px 28px; text-align: center; font-size: 12px; color: #78716c; border-top: 1px solid #e7e2d9; }
`;

/**
 * 1. TEMPLATE: CONFIRMACIÓN DE ANTICIPO & ACTIVACIÓN DE PIN (Diseño Premium Elegante)
 */
export function getDepositConfirmedPinEmailHtml(data: DepositConfirmedTemplateData): string {
  const trackUrl = data.trackUrl || 'https://digimemories.vercel.app/track';

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Comprobante de Anticipo y PIN de Rastreo #${data.trackingId}</title>
  <style>${LUXURY_EMAIL_STYLES}</style>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #f6f3ee;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <div class="wrapper">
          
          <!-- Header -->
          <div class="header">
            <h1 class="brand-title">DIGIMEMORIES</h1>
            <div class="brand-sub">Preservación Digital & Rescate Analógico</div>
          </div>

          <!-- Content -->
          <div class="content">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
              <span class="badge">ORDEN #${data.trackingId}</span>
              <span class="badge-green">✓ Anticipo Confirmado</span>
            </div>

            <h2 style="font-size: 22px; font-weight: 800; color: #1c1917; margin: 0 0 12px 0;">
              ¡Hola, ${data.clientName}!
            </h2>
            <p style="font-size: 15px; line-height: 1.6; color: #44403c; margin: 0 0 20px 0;">
              Hemos validado tu anticipo correspondiente a tu lote de <strong>${data.itemsCount} artículo(s)</strong>. Tu material ya ha ingresado a nuestra fila de digitalización profesional 1:1.
            </p>

            <!-- PIN LUXURY CARD -->
            <div style="background: #1c1917; color: #ffffff; border-radius: 14px; padding: 24px 20px; text-align: center; margin: 24px 0; border: 2px solid #ea580c; box-shadow: 0 8px 20px rgba(0,0,0,0.12);">
              <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #fed7aa; margin-bottom: 8px; font-weight: 700;">
                🔑 TU PIN DE RASTREO EN VIVO
              </div>
              <div style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #ffedd5; margin: 8px 0;">
                ${data.pin}
              </div>
              <div style="font-size: 13px; color: #d6d3d1; margin-top: 8px; line-height: 1.5;">
                Ingresa con tu <strong>Folio #${data.trackingId}</strong> y este <strong>PIN</strong> en nuestro portal de seguimiento para consultar el estado cinta por cinta en tiempo real.
              </div>
            </div>

            <!-- Financial Summary Box -->
            <div class="card">
              <h3 style="font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #78716c; margin: 0 0 12px 0;">
                Resumen Financiero del Servicio
              </h3>
              <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 8px; color: #44403c;">
                <span>Total Estimado:</span>
                <span>$${data.total.toLocaleString('es-MX')} MXN</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 10px; color: #15803d; font-weight: 700;">
                <span>Anticipo Abonado (50%):</span>
                <span>-$${data.depositAmount.toLocaleString('es-MX')} MXN (Pagado)</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: 800; color: #ea580c; border-top: 1px dashed #d6ccc2; padding-top: 10px; margin-top: 6px;">
                <span>Saldo al Recoger:</span>
                <span>$${data.remainingAmount.toLocaleString('es-MX')} MXN</span>
              </div>
            </div>

            <!-- Action Button -->
            <div style="text-align: center; margin: 30px 0 10px 0;">
              <a href="${trackUrl}" target="_blank" class="btn-primary">
                🔍 Consultar Portal de Rastreo →
              </a>
            </div>

          </div>

          <!-- Footer -->
          <div class="footer">
            <div style="font-weight: 700; color: #44403c; margin-bottom: 4px;">
              DigiMemories — Preservación de Memorias Familiares
            </div>
            <div>${data.tallerAddress || 'Av. Insurgentes Sur #450, Col. Roma Sur, CDMX'}</div>
            <div style="margin-top: 4px;">WhatsApp Taller: ${data.tallerPhone || '+52 55 4888 9876'}</div>
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
 * 2. TEMPLATE: COTIZACIÓN OFICIAL (Diseño Premium con Desglose y PDF Adjunto)
 */
export function getQuoteEmailHtml(data: QuoteTemplateData): string {
  const trackUrl = data.trackUrl || 'https://digimemories.vercel.app/track';

  const itemsRows = data.items.map(item => `
    <tr style="border-bottom: 1px solid #f0ede6;">
      <td style="padding: 12px 8px; font-size: 14px; font-weight: 600; color: #292524;">${item.label}</td>
      <td style="padding: 12px 8px; font-size: 14px; text-align: center; color: #57534e;">${item.quantity} ${item.unit}</td>
      <td style="padding: 12px 8px; font-size: 14px; text-align: right; color: #78716c;">$${item.unitPrice}</td>
      <td style="padding: 12px 8px; font-size: 14px; font-weight: 700; text-align: right; color: #ea580c;">$${item.subtotal.toLocaleString('es-MX')}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cotización #${data.trackingId}</title>
  <style>${LUXURY_EMAIL_STYLES}</style>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #f6f3ee;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <div class="wrapper">
          
          <!-- Header -->
          <div class="header">
            <h1 class="brand-title">DIGIMEMORIES</h1>
            <div class="brand-sub">Preservación Digital & Rescate Analógico</div>
          </div>

          <!-- Content -->
          <div class="content">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
              <span class="badge">FOLIO #${data.trackingId}</span>
              <span style="font-size: 13px; color: #78716c;">Cotización Oficial</span>
            </div>

            <h2 style="font-size: 22px; font-weight: 800; color: #1c1917; margin: 0 0 12px 0;">
              ¡Hola, ${data.clientName}!
            </h2>
            <p style="font-size: 15px; line-height: 1.6; color: #44403c; margin: 0 0 20px 0;">
              Gracias por cotizar la digitalización de tus memorias familiares con nosotros. Hemos generado tu presupuesto oficial con entrega en memoria USB en formato MP4 de alta calidad.
            </p>

            <!-- PDF Attachment Callout -->
            <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 12px; padding: 14px 18px; margin-bottom: 24px; display: flex; align-items: center; gap: 12px;">
              <div style="font-size: 24px;">📄</div>
              <div>
                <strong style="color: #c2410c; font-size: 14px; display: block;">Presupuesto PDF Adjunto</strong>
                <span style="color: #7c2d12; font-size: 12px;">Hemos adjuntado el documento formal en PDF a este correo para tu respaldo.</span>
              </div>
            </div>

            <!-- Items Table -->
            <table style="margin-bottom: 20px;">
              <thead>
                <tr style="border-bottom: 2px solid #e7e2d9; font-size: 12px; text-transform: uppercase; color: #78716c;">
                  <th align="left" style="padding: 8px;">Formato</th>
                  <th align="center" style="padding: 8px;">Cantidad</th>
                  <th align="right" style="padding: 8px;">P. Unitario</th>
                  <th align="right" style="padding: 8px;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRows}
              </tbody>
            </table>

            <!-- Financial Card -->
            <div class="card">
              <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 8px; color: #57534e;">
                <span>Total Estimado del Servicio:</span>
                <strong style="color: #1c1917; font-size: 16px;">$${data.total.toLocaleString('es-MX')} MXN</strong>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 10px; color: #ea580c; font-weight: 700;">
                <span>Anticipo para Iniciar (50%):</span>
                <span>$${data.depositAmount.toLocaleString('es-MX')} MXN</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 14px; color: #15803d; border-top: 1px dashed #d6ccc2; padding-top: 8px; margin-bottom: 14px;">
                <span>Saldo Restante contra-entrega:</span>
                <span>$${data.remainingAmount.toLocaleString('es-MX')} MXN</span>
              </div>

              <!-- Logistics & Shipping Selection -->
              <div style="background: #ffffff; border: 1px solid #e7e2d9; border-radius: 10px; padding: 12px; margin-bottom: 12px; font-size: 13px;">
                <div style="font-weight: 700; color: #292524; margin-bottom: 4px;">
                  🚚 Modalidad de Envío Seleccionada:
                </div>
                <div style="color: #44403c;">
                  ${data.deliveryMethod === 'uber_flash' 
                    ? '🛵 <strong>Uber Flash / Didi (CDMX):</strong> Solicita tu chofer a nuestra dirección coordinada por WhatsApp.' 
                    : '📦 <strong>Paquetería Nacional:</strong> Despacha por DHL, FedEx o Estafeta desde tu sucursal más cercana.'}
                </div>
                <div style="font-size: 12px; margin-top: 6px; color: ${data.qualifiesForFreeReturn ? '#15803d' : '#78716c'}; font-weight: ${data.qualifiesForFreeReturn ? '700' : 'normal'};">
                  ${data.qualifiesForFreeReturn 
                    ? '🎉 ¡Tu pedido califica para Retorno GRATIS a tu domicilio!' 
                    : `💡 Retorno gratis aplica en pedidos mayores a $${data.deliveryMethod === 'uber_flash' ? '1,500' : '2,000'} MXN.`}
                </div>
              </div>

              <!-- Payment Method Selection -->
              <div style="background: #ffffff; border: 1px solid #e7e2d9; border-radius: 10px; padding: 12px; font-size: 13px;">
                <div style="font-weight: 700; color: #292524; margin-bottom: 4px;">
                  💳 Método de Pago del Anticipo (50%):
                </div>
                ${data.preferredPaymentMethod === 'mercadopago' ? `
                  <div style="color: #0369a1; font-weight: 600; margin-bottom: 4px;">
                    💙 Mercado Pago (En Línea con Tarjeta de Débito/Crédito o en OXXO)
                  </div>
                  <div style="font-size: 12px; color: #57534e; margin-bottom: 8px;">
                    Puedes abonar tu anticipo de $${data.depositAmount.toLocaleString('es-MX')} MXN de forma 100% segura con el enlace:
                  </div>
                  <a href="https://link.mercadopago.com.mx/digimemories?amount=${data.depositAmount}&description=Anticipo+Orden+${data.trackingId}" target="_blank" style="display: inline-block; background: #009ee3; color: #ffffff; padding: 8px 16px; border-radius: 8px; font-weight: 700; font-size: 12px; text-decoration: none;">
                    Pagar $${data.depositAmount.toLocaleString('es-MX')} con Mercado Pago →
                  </a>
                ` : `
                  <div style="color: #1e293b; font-weight: 600; margin-bottom: 4px;">
                    🏦 Transferencia Bancaria Directa (SPEI)
                  </div>
                  <div style="font-size: 12px; color: #475569; line-height: 1.5; background: #f8fafc; padding: 8px 10px; border-radius: 6px;">
                    <strong>Banco:</strong> BBVA México<br>
                    <strong>CLABE:</strong> 012180015492837190<br>
                    <strong>Beneficiario:</strong> DigiMemories México<br>
                    <strong>Concepto:</strong> #${data.trackingId}
                  </div>
                `}
              </div>
            </div>

            <!-- Action Button -->
            <div style="text-align: center; margin: 30px 0 10px 0;">
              <a href="${trackUrl}" target="_blank" class="btn-primary">
                Ver Detalles en Portal de Rastreo →
              </a>
            </div>

          </div>

          <!-- Footer -->
          <div class="footer">
            <div style="font-weight: 700; color: #44403c; margin-bottom: 4px;">
              DigiMemories — Preservación de Memorias Familiares
            </div>
            <div>${data.tallerAddress || 'Av. Insurgentes Sur #450, Col. Roma Sur, CDMX'}</div>
            <div style="margin-top: 4px;">WhatsApp Taller: ${data.tallerPhone || '+52 55 4888 9876'}</div>
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
 * 3. TEMPLATE: ACTUALIZACIÓN DE ESTADO DE ORDEN
 */
export function getOrderStatusEmailHtml(data: OrderUpdateTemplateData): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Actualización de Orden #${data.trackingId}</title>
  <style>${LUXURY_EMAIL_STYLES}</style>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #f6f3ee;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <div class="wrapper">
          <div class="header">
            <h1 class="brand-title">DIGIMEMORIES</h1>
            <div class="brand-sub">Actualización de Estado</div>
          </div>

          <div class="content">
            <div style="margin-bottom: 20px;">
              <span class="badge">ORDEN #${data.trackingId}</span>
            </div>

            <h2 style="font-size: 20px; font-weight: 800; color: #1c1917; margin: 0 0 12px 0;">
              ¡Hola, ${data.clientName}!
            </h2>

            <div class="card" style="border-left: 4px solid #ea580c;">
              <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #ea580c; font-weight: 700; margin-bottom: 6px;">
                NUEVO ESTADO DEL TRABAJO
              </div>
              <div style="font-size: 18px; font-weight: 800; color: #1c1917; margin-bottom: 8px;">
                ${data.statusTitle}
              </div>
              <div style="font-size: 14px; color: #57534e; line-height: 1.6;">
                ${data.statusDescription}
              </div>
            </div>

            <div style="text-align: center; margin: 30px 0 10px 0;">
              <a href="${data.trackUrl}" target="_blank" class="btn-primary">
                Ver Avance en Tiempo Real →
              </a>
            </div>
          </div>

          <div class="footer">
            <div>DigiMemories • Preservación Digital de Memorias Familiares</div>
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
  <title>${data.subject}</title>
  <style>${LUXURY_EMAIL_STYLES}</style>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #f6f3ee;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <div class="wrapper">
          <div class="header">
            <h1 class="brand-title">DIGIMEMORIES</h1>
            <div class="brand-sub">Comunicado Oficial del Laboratorio</div>
          </div>

          <div class="content">
            <h2 style="font-size: 20px; font-weight: 800; color: #1c1917; margin: 0 0 16px 0;">
              Estimado(a) ${data.clientName},
            </h2>

            <div style="background: #faf8f5; border: 1px solid #e7e2d9; border-left: 4px solid #ea580c; border-radius: 12px; padding: 20px; margin: 20px 0; font-size: 15px; line-height: 1.7; color: #292524; white-space: pre-wrap;">${data.message}</div>

            ${data.actionUrl ? `
              <div style="text-align: center; margin: 30px 0 10px 0;">
                <a href="${data.actionUrl}" target="_blank" class="btn-primary">
                  ${data.actionText || 'Consultar Detalles'} →
                </a>
              </div>
            ` : ''}
          </div>

          <div class="footer">
            <div>DigiMemories • Preservación de Memorias Familiares</div>
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
  <style>${LUXURY_EMAIL_STYLES}</style>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #f6f3ee;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <div class="wrapper">
          <div class="header" style="background: linear-gradient(135deg, #064e3b 0%, #065f46 100%);">
            <h1 class="brand-title" style="color: #34d399;">DIGIMEMORIES</h1>
            <div class="brand-sub" style="color: #a7f3d0;">Diagnóstico de Servidor SMTP Exitoso 🟢</div>
          </div>

          <div class="content">
            <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 18px; margin-bottom: 20px; font-size: 14px; color: #065f46;">
              <div style="margin-bottom: 6px;"><strong>Servidor Host:</strong> ${data.smtpHost}</div>
              <div style="margin-bottom: 6px;"><strong>Cuenta Emisora:</strong> ${data.smtpUser}</div>
              <div style="margin-bottom: 6px;"><strong>Modo Activo:</strong> ${data.mode === 'gmail_live' ? 'Gmail SMTP en Vivo 🟢' : 'Sandbox de Pruebas 🟡'}</div>
              <div><strong>Fecha y Hora:</strong> ${data.timestamp}</div>
            </div>
            <p style="font-size: 15px; color: #374151; line-height: 1.6; margin: 0;">
              Tu servidor de correo está funcionando a la perfección. Todos los avisos de anticipo, PINs de rastreo y presupuestos oficiales en PDF se despacharán de forma inmediata y profesional.
            </p>
          </div>

          <div class="footer">
            <div>DigiMemories Engine • Sistema de Notificaciones Seguras</div>
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}
