import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface QuotePDFData {
  trackingId: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  notes?: string;
  items: {
    label: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    subtotal: number;
  }[];
  extraHours?: number;
  enhanceAudioVideo?: boolean;
  deliveryMethod?: 'uber_flash' | 'national_shipping';
  preferredPaymentMethod?: 'mercadopago' | 'spei';
  qualifiesForFreeReturn?: boolean;
  total: number;
}

export const generateQuotePDF = (data: QuotePDFData): jsPDF => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const primaryColor: [number, number, number] = [234, 88, 12]; // #ea580c Terracotta
  const darkStone: [number, number, number] = [28, 25, 23];
  const mutedGray: [number, number, number] = [100, 95, 90];
  const warmBg: [number, number, number] = [248, 244, 238];

  const now = new Date();
  const expiryDate = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);

  // 1. Top Decorative Bar
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 6, 'F');

  // 2. Header Brand & Folio
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(...primaryColor);
  doc.text('DigiMemories', 14, 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...mutedGray);
  doc.text('PRESERVACIÓN DIGITAL Y RESCATE ANALÓGICO', 14, 28);
  doc.text('Taller: Av. Insurgentes Sur #450, Col. Roma Sur, CDMX | Tel: 55 4888 9876', 14, 33);

  // Quote Folio Badge (Right aligned)
  doc.setFillColor(...warmBg);
  doc.roundedRect(138, 14, 58, 22, 3, 3, 'F');
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.3);
  doc.roundedRect(138, 14, 58, 22, 3, 3, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...primaryColor);
  doc.text(`PRESUPUESTO #${data.trackingId}`, 142, 21);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...darkStone);
  doc.text(`Emisión: ${now.toLocaleDateString('es-MX')}`, 142, 27);
  doc.text(`Válido hasta: ${expiryDate.toLocaleDateString('es-MX')}`, 142, 32);

  // 3. Client Information Box
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(220, 215, 205);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, 42, 182, 26, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...primaryColor);
  doc.text('INFORMACIÓN DEL CLIENTE', 18, 48);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...darkStone);
  doc.text('Nombre:', 18, 55);
  doc.setFont('helvetica', 'normal');
  doc.text(data.clientName || 'Cliente Particular', 36, 55);

  doc.setFont('helvetica', 'bold');
  doc.text('Correo:', 18, 61);
  doc.setFont('helvetica', 'normal');
  doc.text(data.clientEmail || 'No proporcionado', 36, 61);

  doc.setFont('helvetica', 'bold');
  doc.text('Teléfono:', 110, 55);
  doc.setFont('helvetica', 'normal');
  doc.text(data.clientPhone || 'No especificado', 128, 55);

  doc.setFont('helvetica', 'bold');
  doc.text('Método:', 110, 61);
  doc.setFont('helvetica', 'normal');
  doc.text('Entrega física en USB / Taller', 128, 61);

  // 4. Items Table
  const tableRows: (string | number)[][] = [];

  data.items.forEach(item => {
    tableRows.push([
      item.label,
      `${item.quantity} ${item.unit}`,
      `$${item.unitPrice.toLocaleString('es-MX')} MXN`,
      `$${item.subtotal.toLocaleString('es-MX')} MXN`
    ]);
  });

  if (data.extraHours && data.extraHours > 0) {
    tableRows.push([
      'Horas adicionales de digitalización (metraje > 2h)',
      `${data.extraHours} hora(s)`,
      '$50 MXN',
      `$${(data.extraHours * 50).toLocaleString('es-MX')} MXN`
    ]);
  }

  if (data.enhanceAudioVideo) {
    const tapesCount = data.items.find(i => i.label.toLowerCase().includes('cintas'))?.quantity || 1;
    tableRows.push([
      'Mejora Premium de Color, Brillo y Limpieza de Audio',
      `${tapesCount} cinta(s)`,
      '$150 MXN',
      `$${(tapesCount * 150).toLocaleString('es-MX')} MXN`
    ]);
  }

  autoTable(doc, {
    startY: 74,
    head: [['Descripción del Servicio / Formato', 'Cantidad', 'Tarifa Unitaria', 'Subtotal']],
    body: tableRows,
    foot: [
      ['', '', 'SUBTOTAL:', `$${data.total.toLocaleString('es-MX')} MXN`],
      ['', '', 'TOTAL ESTIMADO:', `$${data.total.toLocaleString('es-MX')} MXN`]
    ],
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'left'
    },
    columnStyles: {
      0: { cellWidth: 95 },
      1: { cellWidth: 32, halign: 'center' },
      2: { cellWidth: 28, halign: 'right' },
      3: { cellWidth: 27, halign: 'right' }
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: darkStone,
      cellPadding: 3
    },
    footStyles: {
      fillColor: warmBg,
      textColor: darkStone,
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'right'
    },
    alternateRowStyles: {
      fillColor: [252, 250, 247]
    }
  });

  const finalTableY = (doc as any).lastAutoTable?.finalY || 120;

  // 5. Payment Details Box (Left) & Delivery Notice (Right)
  const depositAmount = Math.round(data.total * 0.5);
  const remainingAmount = data.total - depositAmount;

  doc.setFillColor(...warmBg);
  doc.roundedRect(14, finalTableY + 8, 90, 42, 3, 3, 'F');
  doc.setDrawColor(220, 215, 205);
  doc.roundedRect(14, finalTableY + 8, 90, 42, 3, 3, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...primaryColor);
  doc.text('CONDICIONES DE PAGO:', 18, finalTableY + 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...darkStone);
  doc.text(`• Anticipo de inicio (50%): $${depositAmount.toLocaleString('es-MX')} MXN`, 18, finalTableY + 21);
  doc.text(`• Saldo contra-entrega (50%): $${remainingAmount.toLocaleString('es-MX')} MXN`, 18, finalTableY + 27);
  doc.text(`• Método elegido: ${data.preferredPaymentMethod === 'mercadopago' ? 'Mercado Pago (Tarjeta/OXXO)' : 'Transferencia SPEI (BBVA)'}`, 18, finalTableY + 33);
  doc.text(`• BBVA CLABE: 012180015492837190 | Ref: #${data.trackingId}`, 18, finalTableY + 39);
  doc.text('• Beneficiario: DigiMemories México', 18, finalTableY + 45);

  // Delivery & Tracking Notice (Right)
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(108, finalTableY + 8, 88, 42, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...primaryColor);
  doc.text('ENTREGA Y RASTREO:', 112, finalTableY + 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...darkStone);
  doc.text(`• Modalidad: ${data.deliveryMethod === 'uber_flash' ? 'Uber Flash / Didi (CDMX)' : 'Paquetería Nacional (DHL/FedEx)'}`, 112, finalTableY + 21);
  if (data.qualifiesForFreeReturn) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(21, 128, 61); // Green
    doc.text('• ¡Califica para Retorno GRATIS a tu domicilio!', 112, finalTableY + 27);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...darkStone);
  } else {
    doc.text(`• Retorno gratis en pedidos de $${data.deliveryMethod === 'uber_flash' ? '1,500' : '2,000'}+ MXN`, 112, finalTableY + 27);
  }
  doc.text('• Entrega en Memoria USB y devolución de cintas', 112, finalTableY + 33);
  doc.text('• Rastrear orden con PIN en: digimemories.mx/track', 112, finalTableY + 39);
  doc.text('• Despacho seguro coordinado vía WhatsApp', 112, finalTableY + 45);

  // 6. Legal Terms & Guarantees
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...mutedGray);
  doc.text('TÉRMINOS Y GARANTÍA DE PRESERVACIÓN:', 14, finalTableY + 56);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('1. Cotización válida por 15 días a partir de la fecha de emisión.', 14, finalTableY + 61);
  doc.text('2. El costo final se ajusta de acuerdo a la duración real comprobada de cada cinta durante la digitalización.', 14, finalTableY + 66);
  doc.text('3. Si una cinta no puede reproducirse por daño físico extremo o moho severo, se te notificará y NO se cobrará esa unidad.', 14, finalTableY + 71);
  doc.text('4. Estricta confidencialidad: tus videos se procesan de forma local y se eliminan temporalmente tras tu confirmación de entrega.', 14, finalTableY + 76);

  // 7. Footer Stamp / Verification
  doc.setFillColor(...primaryColor);
  doc.rect(0, 287, 210, 10, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('DigiMemories © Rescate y Preservación de Memorias Familiares', 14, 293);
  doc.text(`Folio Digital: #${data.trackingId}`, 160, 293);

  return doc;
};
