import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  FileText, 
  Download, 
  ExternalLink, 
  MessageCircle, 
  CheckCircle2, 
  AlertTriangle, 
  HardDrive, 
  Truck, 
  CreditCard, 
  ArrowLeft, 
  Search,
  RefreshCw
} from 'lucide-react';
import { getOrders } from '../lib/store';
import type { Order } from '../lib/store';
import { fetchOrderByIdFromCloud } from '../lib/supabase';
import { generateQuotePDF } from '../lib/pdfGenerator';
import { createMercadoPagoPreference, handleMercadoPagoCallback } from '../lib/mercadoPagoService';

export const QuoteView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [manualId, setManualId] = useState<string>('');
  const [notFound, setNotFound] = useState<boolean>(false);
  const [isPayingWithMp, setIsPayingWithMp] = useState<boolean>(false);
  const [paymentSuccessMsg, setPaymentSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const targetId = (id || '').replace('#', '').trim();

    // Revisa si regresó de un cobro exitoso en Mercado Pago o si viene para pagar
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      handleMercadoPagoCallback(searchParams).then(res => {
        if (res.detected && res.approved) {
          setPaymentSuccessMsg('🎉 ¡Pago de anticipo aprobado con éxito en Mercado Pago! Tu orden está confirmada.');
          setOrder(prev => prev ? { ...prev, depositPaid: true } : prev);
        }
      });
    }

    async function loadQuote() {
      if (!targetId) {
        setLoading(false);
        setNotFound(true);
        return;
      }

      setLoading(true);
      setNotFound(false);

      // 1. Try local storage first
      const localOrders = getOrders();
      let match = localOrders.find(o => o.id === targetId);

      // 2. If not found locally, fetch from cloud
      if (!match) {
        match = (await fetchOrderByIdFromCloud(targetId)) || undefined;
      }

      if (!active) return;

      if (match) {
        setOrder(match);
        // Generate PDF blob for viewing
        try {
          const rawItems = (match as any).quoteItems || [];
          const itemsForPdf = rawItems.length > 0 ? rawItems : match.items.map(i => ({
            label: `${i.format} (${i.id})`,
            quantity: 1,
            unit: 'unidad',
            unitPrice: i.format === 'Cintas' ? 200 : i.format === 'Discos' ? 150 : 7,
            subtotal: i.format === 'Cintas' ? 200 : i.format === 'Discos' ? 150 : 7
          }));

          const extraHours = (match as any).extraHours || match.items.reduce((s, i) => s + (i.extraHours || 0), 0);
          const qualifiesForFreeReturn = match.qualifiesForFreeReturn ?? (match.estimatedTotal >= 1500);

          const pdf = generateQuotePDF({
            trackingId: match.id,
            clientName: match.clientName,
            clientEmail: match.clientEmail,
            clientPhone: match.clientPhone,
            notes: match.generalNotes,
            deliveryMethod: (match.deliveryType === 'national_shipping' ? 'national_shipping' : 'uber_flash'),
            preferredPaymentMethod: match.preferredPaymentMethod || 'mercadopago',
            qualifiesForFreeReturn,
            items: itemsForPdf,
            extraHours,
            enhanceAudioVideo: match.addAudioVideoEnhancement,
            total: match.estimatedTotal
          });

          const blob = pdf.output('blob');
          const blobUrl = URL.createObjectURL(blob);
          setPdfBlobUrl(blobUrl);
        } catch (e) {
          console.warn('[QuoteView] Could not generate PDF blob:', e);
        }
      } else {
        setNotFound(true);
      }
      setLoading(false);
    }

    loadQuote();

    return () => {
      active = false;
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
    };
  }, [id]);

  const handleDownloadPDF = () => {
    if (!order) return;
    try {
      const rawItems = (order as any).quoteItems || [];
      const itemsForPdf = rawItems.length > 0 ? rawItems : order.items.map(i => ({
        label: `${i.format} (${i.id})`,
        quantity: 1,
        unit: 'unidad',
        unitPrice: i.format === 'Cintas' ? 200 : i.format === 'Discos' ? 150 : 7,
        subtotal: i.format === 'Cintas' ? 200 : i.format === 'Discos' ? 150 : 7
      }));

      const extraHours = (order as any).extraHours || order.items.reduce((s, i) => s + (i.extraHours || 0), 0);
      const qualifiesForFreeReturn = order.qualifiesForFreeReturn ?? (order.estimatedTotal >= 1500);

      const pdf = generateQuotePDF({
        trackingId: order.id,
        clientName: order.clientName,
        clientEmail: order.clientEmail,
        clientPhone: order.clientPhone,
        notes: order.generalNotes,
        deliveryMethod: (order.deliveryType === 'national_shipping' ? 'national_shipping' : 'uber_flash'),
        preferredPaymentMethod: order.preferredPaymentMethod || 'mercadopago',
        qualifiesForFreeReturn,
        items: itemsForPdf,
        extraHours,
        enhanceAudioVideo: order.addAudioVideoEnhancement,
        total: order.estimatedTotal
      });

      pdf.save(`Cotizacion_DigiMemories_#${order.id}.pdf`);
    } catch (e) {
      console.error('[QuoteView] Download failed:', e);
    }
  };

  const depositAmount = order ? Math.round(order.estimatedTotal * 0.5) : 0;
  const remainingAmount = order ? order.estimatedTotal - depositAmount : 0;

  const handlePayWithMercadoPago = async () => {
    if (!order) return;
    setIsPayingWithMp(true);
    try {
      const pref = await createMercadoPagoPreference({
        orderId: order.id,
        title: `Anticipo 50% - Orden #${order.id}`,
        amount: depositAmount,
        clientEmail: order.clientEmail,
        clientName: order.clientName
      });
      if (pref.success && pref.initPoint) {
        window.location.href = pref.initPoint;
      } else {
        alert(pref.error || 'No se pudo generar la orden de pago. Intenta nuevamente.');
      }
    } catch (err: any) {
      alert(`Error al conectar con Mercado Pago: ${err?.message || err}`);
    } finally {
      setIsPayingWithMp(false);
    }
  };

  const waMessage = order 
    ? encodeURIComponent(`¡Hola DigiMemories! Estoy consultando mi presupuesto con Folio #${order.id} por un total de $${order.estimatedTotal.toLocaleString('es-MX')} MXN. Quisiera coordinar el envío de mis cintas y resolver unas dudas.`)
    : '';

  return (
    <div style={{ backgroundColor: '#fcfbf8', minHeight: '85vh', padding: '2.5rem 1rem 4rem 1rem' }}>
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        
        {/* Top Back Nav */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <Link 
            to="/" 
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.4rem', 
              color: 'var(--text-secondary)', 
              textDecoration: 'none',
              fontSize: '0.9rem',
              fontWeight: 500
            }}
          >
            <ArrowLeft size={16} /> Volver a DigiMemories
          </Link>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Link 
              to="/track" 
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '0.35rem', 
                fontSize: '0.85rem', 
                color: 'var(--accent-color)', 
                textDecoration: 'none',
                fontWeight: 600
              }}
            >
              Portal de Rastreo →
            </Link>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="card text-center" style={{ padding: '4rem 2rem', background: '#ffffff', borderRadius: '16px' }}>
            <div className="spinner" style={{ margin: '0 auto 1.25rem auto' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1c1917', marginBottom: '0.5rem' }}>
              Cargando Presupuesto...
            </h3>
            <p style={{ color: '#78716c', fontSize: '0.95rem' }}>
              Estamos recuperando los detalles de tu cotización en alta fidelidad.
            </p>
          </div>
        )}

        {/* Not Found State */}
        {!loading && notFound && (
          <div className="card text-center" style={{ padding: '3.5rem 2rem', background: '#ffffff', borderRadius: '16px', border: '1px solid #e7e2d9' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
              <Search size={30} style={{ color: '#ea580c' }} />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1c1917', marginBottom: '0.5rem' }}>
              Presupuesto No Encontrado
            </h2>
            <p style={{ color: '#57534e', maxWidth: '520px', margin: '0 auto 1.5rem auto', fontSize: '0.95rem', lineHeight: 1.6 }}>
              No localizamos ninguna cotización con el identificador ingresado. Puedes buscar tu folio de 6 dígitos aquí o generar una nueva cotización al instante.
            </p>

            <div style={{ display: 'flex', maxWidth: '400px', margin: '0 auto 2rem auto', gap: '0.5rem' }}>
              <input
                type="text"
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
                placeholder="Ejemplo: 482910"
                className="input-field"
                style={{ flex: 1, textAlign: 'center', fontWeight: 600, fontSize: '1.05rem', letterSpacing: '0.05em' }}
              />
              <button 
                onClick={() => {
                  if (manualId.trim()) {
                    window.location.href = `/quote/${manualId.trim()}`;
                  }
                }}
                className="btn btn-primary"
                style={{ padding: '0.65rem 1.25rem' }}
              >
                Buscar
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <Link to="/contact" className="btn btn-secondary">
                Generar Nueva Cotización
              </Link>
              <a 
                href="https://wa.me/525548889876?text=Hola%20DigiMemories,%20necesito%20ayuda%20para%20localizar%20mi%20presupuesto" 
                target="_blank" 
                rel="noreferrer"
                className="btn"
                style={{ background: '#25D366', color: '#ffffff' }}
              >
                <MessageCircle size={18} /> Asistencia por WhatsApp
              </a>
            </div>
          </div>
        )}

        {/* Found Order View */}
        {!loading && order && (
          <div>
            {/* Header Card */}
            <div style={{ background: '#ffffff', border: '1px solid #e7e2d9', borderRadius: '16px', padding: '1.75rem', marginBottom: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.4rem' }}>
                    <span style={{ background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa', padding: '0.3rem 0.75rem', borderRadius: '8px', fontWeight: 800, fontSize: '0.9rem', letterSpacing: '0.04em' }}>
                      FOLIO #{order.id}
                    </span>
                    <span style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', padding: '0.3rem 0.65rem', borderRadius: '8px', fontWeight: 600, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <CheckCircle2 size={14} /> Presupuesto Formal
                    </span>
                  </div>
                  <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#1c1917', margin: '0 0 0.35rem 0' }}>
                    Cotización para {order.clientName}
                  </h1>
                  <div style={{ fontSize: '0.85rem', color: '#78716c' }}>
                    Emitida el {new Date(order.createdAt).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })} • Válida por 15 días
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                  <button 
                    onClick={handleDownloadPDF}
                    className="btn btn-primary"
                    style={{ padding: '0.65rem 1.25rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '10px' }}
                  >
                    <Download size={18} /> Descargar PDF
                  </button>
                  {pdfBlobUrl && (
                    <a 
                      href={pdfBlobUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      className="btn btn-secondary"
                      style={{ padding: '0.65rem 1rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem', borderRadius: '10px' }}
                    >
                      <ExternalLink size={16} /> Abrir PDF ↗
                    </a>
                  )}
                  <a 
                    href={`https://wa.me/525548889876?text=${waMessage}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn"
                    style={{ background: '#25D366', color: '#ffffff', padding: '0.65rem 1.15rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem', borderRadius: '10px' }}
                  >
                    <MessageCircle size={18} /> WhatsApp
                  </a>
                </div>
              </div>

              {/* Financial Metrics Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', background: '#fcfaf6', padding: '1.25rem', borderRadius: '12px', border: '1px solid #f0ede6' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#78716c', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em', marginBottom: '0.2rem' }}>
                    Total Estimado del Servicio
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1c1917' }}>
                    ${order.estimatedTotal.toLocaleString('es-MX')} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#78716c' }}>MXN</span>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.8rem', color: '#c2410c', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em', marginBottom: '0.2rem' }}>
                    Anticipo Requerido (50%)
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ea580c' }}>
                    ${depositAmount.toLocaleString('es-MX')} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#78716c' }}>MXN</span>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.8rem', color: '#15803d', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em', marginBottom: '0.2rem' }}>
                    Saldo Estimado contra-entrega
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#166534' }}>
                    ${remainingAmount.toLocaleString('es-MX')} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#78716c' }}>MXN*</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment success alert if redirected from MP */}
            {paymentSuccessMsg && (
              <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: '14px', padding: '1rem 1.25rem', marginBottom: '1.25rem', color: '#15803d', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={20} />
                <span>{paymentSuccessMsg}</span>
              </div>
            )}

            {/* MANDATORY POLICY CLARIFICATION 1: USB / STORAGE DRIVE */}
            <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: '14px', padding: '1.25rem 1.5rem', marginBottom: '1.25rem', boxShadow: '0 2px 10px rgba(22, 101, 52, 0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div style={{ background: '#dcfce7', color: '#15803d', padding: '0.5rem', borderRadius: '10px' }}>
                  <HardDrive size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#14532d', margin: '0 0 0.35rem 0' }}>
                    Aviso Importante sobre la Memoria USB / Disco Duro
                  </h3>
                  <p style={{ fontSize: '0.9rem', color: '#166534', margin: 0, lineHeight: 1.6 }}>
                    <strong>El cliente proporciona su propia memoria USB o disco duro externo</strong> (mínimo 50GB recomendados) al hacernos llegar su material. 
                    <br />
                    <em>DigiMemories no regala ni proporciona el dispositivo físico de almacenamiento; la carga, conversión y organización de tus archivos digitales en formato MP4 de alta fidelidad está 100% incluida sin costo adicional.</em>
                  </p>
                </div>
              </div>
            </div>

            {/* MANDATORY POLICY CLARIFICATION 2: BALANCE ADJUSTMENT & TAPE DURATION */}
            <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: '14px', padding: '1.25rem 1.5rem', marginBottom: '1.5rem', boxShadow: '0 2px 10px rgba(146, 64, 14, 0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div style={{ background: '#fef3c7', color: '#b45309', padding: '0.5rem', borderRadius: '10px' }}>
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#78350f', margin: '0 0 0.35rem 0' }}>
                    Aviso de Ajuste del Saldo Restante
                  </h3>
                  <p style={{ fontSize: '0.9rem', color: '#92400e', margin: '0 0 0.5rem 0', lineHeight: 1.6 }}>
                    El total y el saldo restante son <strong>estimaciones iniciales</strong> calculadas con base en el conteo aproximado. El saldo final a liquidar se ajustará tras la captura técnica en laboratorio:
                  </p>
                  <ul style={{ fontSize: '0.85rem', color: '#78350f', margin: 0, paddingLeft: '1.25rem', lineHeight: 1.6 }}>
                    <li>
                      <strong>Cintas vacías o con daño físico irreparable:</strong> Si una cinta viene en blanco o no es posible reproducirla por daño extremo, <strong>NO se cobra y se descuenta íntegramente de tu saldo restante</strong>.
                    </li>
                    <li>
                      <strong>Horas adicionales (&gt;2 horas):</strong> La tarifa base de $200 MXN cubre hasta 2 horas completas por cinta. Si alguna cinta contiene metraje superior a 2 horas, el tiempo excedente se factura a <strong>$50 MXN por hora extra</strong>.
                    </li>
                  </ul>
                  <p style={{ fontSize: '0.85rem', color: '#92400e', margin: '0.5rem 0 0 0', fontStyle: 'italic' }}>
                    Podrás auditar en tiempo real el avance cinta por cinta y tu saldo final exacto en el portal de rastreo con tu PIN personal.
                  </p>
                </div>
              </div>
            </div>

            {/* Embedded PDF Viewer Section */}
            <div style={{ background: '#ffffff', border: '1px solid #e7e2d9', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileText size={20} style={{ color: '#ea580c' }} />
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1c1917', margin: 0 }}>
                    Vista Previa del Documento PDF
                  </h2>
                </div>
                <button 
                  onClick={handleDownloadPDF}
                  className="btn btn-secondary"
                  style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Download size={15} /> Descargar Archivo
                </button>
              </div>

              {pdfBlobUrl ? (
                <div style={{ border: '1px solid #e7e2d9', borderRadius: '12px', overflow: 'hidden', background: '#f8fafc' }}>
                  <iframe 
                    src={pdfBlobUrl} 
                    title={`Presupuesto DigiMemories #${order.id}`}
                    style={{ width: '100%', height: '580px', border: 'none', display: 'block' }}
                  />
                </div>
              ) : (
                <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#78716c' }}>
                  Generando visualizador de documento...
                </div>
              )}
            </div>

            {/* Delivery & Payment Instructions Footer */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
              {/* Shipping card */}
              <div style={{ background: '#ffffff', border: '1px solid #e7e2d9', borderRadius: '14px', padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ea580c', fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.5rem' }}>
                  <Truck size={18} /> Modalidad de Envío
                </div>
                <div style={{ fontSize: '0.9rem', color: '#44403c', lineHeight: 1.5, marginBottom: '0.5rem' }}>
                  {order.deliveryType === 'national_shipping' 
                    ? '📦 Paquetería Nacional (DHL / FedEx / Estafeta) a toda la República Mexicana.' 
                    : '🛵 Despacho y Recepción local vía Uber Flash / Didi en CDMX y Área Metropolitana.'}
                </div>
                <div style={{ fontSize: '0.85rem', color: order.qualifiesForFreeReturn ? '#15803d' : '#78716c', fontWeight: order.qualifiesForFreeReturn ? 700 : 500 }}>
                  {order.qualifiesForFreeReturn 
                    ? '🎉 ¡Tu orden califica para Retorno GRATIS a tu domicilio!' 
                    : '💡 Retorno gratis aplica en órdenes mayores a $1,500 en CDMX o $2,000 nacional.'}
                </div>
              </div>

              {/* Payment card */}
              <div id="payment-section" style={{ background: '#ffffff', border: '1px solid #e7e2d9', borderRadius: '14px', padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0369a1', fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.5rem' }}>
                  <CreditCard size={18} /> Pago de Anticipo (50%)
                </div>
                <div style={{ fontSize: '0.9rem', color: '#44403c', lineHeight: 1.5, marginBottom: '0.75rem' }}>
                  {order.depositPaid ? (
                    <div style={{ background: '#f0fdf4', color: '#15803d', padding: '0.6rem 0.8rem', borderRadius: '8px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <CheckCircle2 size={18} /> Anticipo del 50% Cubierto
                    </div>
                  ) : order.preferredPaymentMethod === 'mercadopago' ? (
                    <div>
                      Abona $<strong>{depositAmount.toLocaleString('es-MX')} MXN</strong> con Tarjeta de Débito/Crédito, SPEI o en OXXO mediante Mercado Pago.
                      <div style={{ marginTop: '0.65rem' }}>
                        <button 
                          onClick={handlePayWithMercadoPago}
                          disabled={isPayingWithMp}
                          className="btn"
                          style={{ background: '#009ee3', color: '#ffffff', padding: '0.55rem 1.1rem', fontSize: '0.875rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.45rem', borderRadius: '8px', cursor: 'pointer', border: 'none' }}
                        >
                          {isPayingWithMp ? <RefreshCw size={16} className="animate-spin" /> : <CreditCard size={16} />}
                          {isPayingWithMp ? 'Generando pago seguro...' : 'Pagar con Mercado Pago →'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.85rem', color: '#475569', background: '#f8fafc', padding: '0.6rem 0.8rem', borderRadius: '8px' }}>
                      <strong>BBVA CLABE:</strong> 012180015492837190<br />
                      <strong>Beneficiario:</strong> DigiMemories México<br />
                      <strong>Concepto:</strong> #{order.id}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Support Callout */}
            <div style={{ textAlign: 'center', padding: '1.5rem', background: '#f6f3ee', borderRadius: '14px' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#292524', margin: '0 0 0.35rem 0' }}>
                ¿Tienes dudas sobre tu presupuesto o cómo preparar tus cintas?
              </h4>
              <p style={{ fontSize: '0.85rem', color: '#57534e', margin: '0 0 1rem 0' }}>
                Nuestro equipo técnico está disponible 24/7 para asesorarte en el empaque y coordinar tu recolección.
              </p>
              <a 
                href={`https://wa.me/525548889876?text=${waMessage}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.65rem 1.35rem' }}
              >
                <MessageCircle size={18} /> Conversar con un Asesor por WhatsApp
              </a>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};

export default QuoteView;
