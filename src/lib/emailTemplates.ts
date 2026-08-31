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

const BASE_STYLES = `
  body { margin: 0; padding: 0; background-color: #f6f3ee; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #292524; }
  table { border-collapse: collapse; width: 100%; }
  img { border: 0; outline: none; text-decoration: none; }
  .wrapper { width: 100%; max-width: 620px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.06); border: 1px solid #e7e2d9; }
  .header { background: linear-gradient(135deg, #1c1917 0%, #292524 100%); padding: 36px 32px; text-align: center; color: #ffffff; }
  .brand-title { font-size: 26px; font-weight: 800; letter-spacing: -0.5px; margin: 0; color: #ea580c; }
  .brand-sub { font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #d6d3d1; margin-top: 6px; }
  .content { padding: 36px 32px; }
  .badge { display: inline-block; background-color: #ffedd5; color: #c2410c; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 700; }
  .card { background-color: #faf8f5; border: 1px solid #e7e2d9; border-radius: 12px; padding: 20px; margin: 24px 0; }
  .btn-primary { display: inline-block; background-color: #ea580c; color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 15px; padding: 14px 28px; border-radius: 10px; text-align: center; box-shadow: 0 4px 12px rgba(234, 88, 12, 0.25); }
  .footer { background-color: #f6f3ee; padding: 28px 32px; text-align: center; font-size: 12px; color: #78716c; border-top: 1px solid #e7e2d9; }
`;

/**
 * Modern HTML Template for Quotes
 */
export function getQuoteEmailHtml(data: QuoteTemplateData): string {
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
  <style>${BASE_STYLES}</style>
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

            <h2 style="font-size: 22px; font-weight: 700; color: #1c1917; margin: 0 0 10px 0;">¡Hola, ${data.clientName}!</h2>
            <p style="font-size: 15px; line-height: 1.6; color: #57534e; margin: 0 0 20px 0;">
              Hemos preparado con sumo cuidado la cotización para el rescate y digitalización de tus recuerdos familiares. Encontrarás el <strong>documento oficial en PDF adjunto a este correo</strong>.
            </p>

            <!-- Resumen de Servicios -->
            <div class="card">
              <h3 style="font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #78716c; margin: 0 0 14px 0;">Desglose de Formatos a Digitalizar</h3>
              <table style="width: 100%;">
                <thead>
                  <tr style="border-bottom: 2px solid #e7e2d9; font-size: 12px; text-transform: uppercase; color: #78716c;">
                    <th style="text-align: left; padding: 8px 8px;">Formato</th>
                    <th style="text-align: center; padding: 8px 8px;">Cant.</th>
                    <th style="text-align: right; padding: 8px 8px;">Unitario</th>
                    <th style="text-align: right; padding: 8px 8px;">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsRows}
                  ${data.enhanceAudioVideo ? `
                  <tr style="border-bottom: 1px solid #f0ede6;">
                    <td colspan="3" style="padding: 12px 8px; font-size: 13px; color: #0284c7; font-weight: 600;">✨ Restauración IA & Limpieza de Ruido</td>
                    <td style="padding: 12px 8px; font-size: 13px; font-weight: 700; text-align: right; color: #0284c7;">Incluido</td>
                  </tr>` : ''}
                </tbody>
              </table>

              <!-- Total y Anticipo -->
              <div style="margin-top: 20px; padding-top: 16px; border-top: 2px dashed #e7e2d9;">
                <table style="width: 100%;">
                  <tr>
                    <td style="font-size: 15px; color: #57534e;">Inversión Total Estimada:</td>
                    <td style="font-size: 22px; font-weight: 800; color: #ea580c; text-align: right;">$${data.total.toLocaleString('es-MX')} MXN</td>
                  </tr>
                  <tr>
                    <td style="font-size: 13px; color: #78716c; padding-top: 6px;">Anticipo de inicio (50%):</td>
                    <td style="font-size: 14px; font-weight: 700; color: #1c1917; text-align: right; padding-top: 6px;">$${data.depositAmount.toLocaleString('es-MX')} MXN</td>
                  </tr>
                  <tr>
                    <td style="font-size: 13px; color: #78716c; padding-top: 4px;">Saldo contra-entrega (50%):</td>
                    <td style="font-size: 14px; font-weight: 700; color: #57534e; text-align: right; padding-top: 4px;">$${data.remainingAmount.toLocaleString('es-MX')} MXN</td>
                  </tr>
                </table>
              </div>
            </div>

            <!-- Pasos Siguientes -->
            <div style="background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 12px; padding: 20px; margin-bottom: 28px;">
              <h4 style="margin: 0 0 10px 0; color: #9a3412; font-size: 15px;">📦 ¿Cómo entregar tus cintas o fotos?</h4>
              <ul style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.6; color: #7c2d12;">
                <li><strong>En taller (CDMX):</strong> ${data.tallerAddress || 'Av. Insurgentes Sur #450, Roma Sur, CDMX'} (Lun-Sáb 10:00 - 19:00).</li>
                <li><strong>Recolección a domicilio:</strong> Responde a este correo o escríbenos por WhatsApp al <strong>${data.tallerPhone || '55 4888 9876'}</strong> para agendar tu chofer de confianza.</li>
                <li><strong>Garantía:</strong> Todas tus cintas y fotos originales se devuelven intactas junto a tu memoria USB.</li>
              </ul>
            </div>

            <!-- Botón CTA -->
            <div style="text-align: center; margin: 32px 0 16px 0;">
              <a href="${data.trackUrl || 'http://localhost:5173/track'}" class="btn-primary" target="_blank">
                Rastrear Estado de mi Folio #${data.trackingId} →
              </a>
            </div>
          </div>

          <!-- Footer -->
          <div class="footer">
            <p style="margin: 0 0 8px 0; font-weight: 600; color: #57534e;">DigiMemories • Laboratorio de Digitalización y Archivo</p>
            <p style="margin: 0 0 12px 0;">Taller Central: Av. Insurgentes Sur #450, Col. Roma Sur, CDMX | Tel: 55 4888 9876</p>
            <p style="margin: 0; font-size: 11px; color: #a8a29e;">Este correo fue generado automáticamente por nuestro sistema interno de preservación digital. Tus datos están 100% protegidos.</p>
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Template for Order Updates (e.g. In progress, QA, Completed)
 */
export function getOrderStatusEmailHtml(data: OrderUpdateTemplateData): string {
  const steps = [
    { num: 1, label: 'Recepción & Diagnóstico' },
    { num: 2, label: 'Digitalización 4K/60fps' },
    { num: 3, label: 'Limpieza & Control Calidad' },
    { num: 4, label: 'Listo para Entrega' }
  ];

  const stepsHtml = steps.map(s => {
    const isCompleted = s.num <= data.stepNumber;
    const isCurrent = s.num === data.stepNumber;
    return `
      <td style="text-align: center; width: 25%; padding: 4px;">
        <div style="width: 32px; height: 32px; border-radius: 50%; margin: 0 auto 6px auto; line-height: 32px; font-size: 13px; font-weight: 700; background-color: ${isCompleted ? '#ea580c' : '#e7e2d9'}; color: ${isCompleted ? '#ffffff' : '#78716c'}; ${isCurrent ? 'box-shadow: 0 0 0 4px #ffedd5;' : ''}">
          ${isCompleted ? '✓' : s.num}
        </div>
        <div style="font-size: 11px; font-weight: ${isCurrent ? '700' : '500'}; color: ${isCurrent ? '#ea580c' : '#78716c'}; line-height: 1.2;">
          ${s.label}
        </div>
      </td>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Actualización de Orden #${data.trackingId}</title>
  <style>${BASE_STYLES}</style>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #f6f3ee;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <div class="wrapper">
          <div class="header">
            <h1 class="brand-title">DIGIMEMORIES</h1>
            <div class="brand-sub">Actualización de Estado en Tiempo Real</div>
          </div>

          <div class="content">
            <div style="margin-bottom: 20px;">
              <span class="badge">ORDEN #${data.trackingId}</span>
            </div>

            <h2 style="font-size: 22px; font-weight: 700; color: #1c1917; margin: 0 0 8px 0;">¡Buenas noticias, ${data.clientName}!</h2>
            <h3 style="font-size: 18px; font-weight: 600; color: #ea580c; margin: 0 0 16px 0;">${data.statusTitle}</h3>

            <p style="font-size: 15px; line-height: 1.6; color: #57534e; margin: 0 0 24px 0;">
              ${data.statusDescription}
            </p>

            <!-- Stepper -->
            <div class="card" style="padding: 24px 16px;">
              <table style="width: 100%;">
                <tr>${stepsHtml}</tr>
              </table>
            </div>

            ${data.pin ? `
            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 18px; text-align: center; margin: 24px 0;">
              <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #15803d; font-weight: 700;">Tu Código PIN de Seguimiento Seguro</div>
              <div style="font-size: 28px; font-weight: 800; color: #166534; letter-spacing: 4px; margin: 8px 0;">${data.pin}</div>
              <div style="font-size: 12px; color: #15803d;">Usa este PIN en nuestro portal para ver las notas técnicas de tu digitalización.</div>
            </div>` : ''}

            <div style="text-align: center; margin: 32px 0 16px 0;">
              <a href="${data.trackUrl}" class="btn-primary" target="_blank">
                Ver Progreso en Vivo →
              </a>
            </div>
          </div>

          <div class="footer">
            <p style="margin: 0 0 8px 0; font-weight: 600; color: #57534e;">DigiMemories • Laboratorio Central de Digitalización</p>
            <p style="margin: 0;">¿Dudas sobre tu orden? Escríbenos a soporte@digimemories.mx o por WhatsApp al 55 4888 9876.</p>
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Template for custom direct client messages from Admin
 */
export function getCustomMessageHtml(data: CustomMessageTemplateData): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.subject}</title>
  <style>${BASE_STYLES}</style>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #f6f3ee;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <div class="wrapper">
          <div class="header">
            <h1 class="brand-title">DIGIMEMORIES</h1>
            <div class="brand-sub">Mensaje Directo de Atención al Cliente</div>
          </div>

          <div class="content">
            ${data.trackingId ? `<div style="margin-bottom: 16px;"><span class="badge">FOLIO #${data.trackingId}</span></div>` : ''}
            
            <h2 style="font-size: 20px; font-weight: 700; color: #1c1917; margin: 0 0 16px 0;">Hola, ${data.clientName}</h2>

            <div class="card" style="font-size: 15px; line-height: 1.7; color: #292524; white-space: pre-line;">
              ${data.message}
            </div>

            ${data.actionUrl ? `
            <div style="text-align: center; margin: 28px 0 12px 0;">
              <a href="${data.actionUrl}" class="btn-primary" target="_blank">${data.actionText || 'Ver Detalles'} →</a>
            </div>` : ''}
          </div>

          <div class="footer">
            <p style="margin: 0 0 6px 0; font-weight: 600; color: #57534e;">DigiMemories • Servicio al Cliente</p>
            <p style="margin: 0;">Puedes responder directamente a este correo para comunicarte con nuestro equipo técnico.</p>
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
