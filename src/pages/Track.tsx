import React, { useState } from 'react';
import { getOrders, calculateFinalTotal } from '../lib/store';
import type { Order } from '../lib/store';
import { 
  Package, 
  Search, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Sparkles, 
  Download, 
  Truck
} from 'lucide-react';
import { generateQuotePDF } from '../lib/pdfGenerator';
import { checkLockoutStatus, recordFailedLoginAttempt, resetFailedAttempts } from '../lib/security';

const Track: React.FC = () => {
  const [trackingId, setTrackingId] = useState('');
  const [pin, setPin] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const cleanId = trackingId.replace('#', '').trim();
    if (!cleanId) {
      setError('Por favor ingresa tu número de rastreo.');
      return;
    }

    // Check brute-force lockout for this tracking ID
    const lockout = checkLockoutStatus(`pin_${cleanId}`);
    if (lockout.locked) {
      setError(`🚫 Demasiados intentos fallidos para el folio #${cleanId}. Bloqueo temporal por ${lockout.minutesRemaining} minuto(s).`);
      return;
    }

    const orders = getOrders();
    const found = orders.find(o => o.id === cleanId);

    if (!found) {
      setError('Número de rastreo no encontrado. Verifica tu código de 6 dígitos.');
      return;
    }

    if (!found.depositPaid || !found.pin) {
      setError('Esta orden está pendiente de registro de anticipo. Contáctanos por WhatsApp para activar tu PIN.');
      return;
    }

    if (found.pin !== pin.trim()) {
      const result = recordFailedLoginAttempt(`pin_${cleanId}`);
      if (result.locked) {
        setError(`🚨 Has superado el límite de 5 intentos. El acceso a este folio ha sido bloqueado por 15 minutos por seguridad.`);
      } else {
        setError(`El PIN de 4 dígitos es incorrecto. Te quedan ${result.remainingAttempts} intento(s) antes del bloqueo.`);
      }
      return;
    }

    // Reset failed attempts on success
    resetFailedAttempts(`pin_${cleanId}`);
    setOrder(found);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completada': return <CheckCircle className="text-accent" size={24} />;
      case 'digitalizando': return <Clock style={{ color: '#ea580c' }} size={24} />;
      case 'fallida': return <AlertCircle style={{ color: '#ef4444' }} size={24} />;
      default: return <Package size={24} style={{ color: 'var(--text-muted)' }} />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completada': return '✓ Digitalizado y Verificado';
      case 'digitalizando': return '⏳ En Proceso de Captura 1:1';
      case 'fallida': return '⚠️ Falla de Lectura / Daño Físico';
      default: return '📦 En Fila de Espera';
    }
  };

  const handleDownloadSummaryPDF = () => {
    if (!order) return;
    const finalTotal = calculateFinalTotal(order);

    const itemsSummary = order.items.map(item => ({
      label: `${item.format} (${item.id})`,
      quantity: 1,
      unit: 'unidad',
      unitPrice: item.format === 'Cintas' ? 200 : item.format === 'Discos' ? 150 : 7,
      subtotal: item.format === 'Cintas' ? 200 : item.format === 'Discos' ? 150 : 7
    }));

    const totalExtraHours = order.items.reduce((sum, i) => sum + (i.extraHours || 0), 0);

    const doc = generateQuotePDF({
      trackingId: order.id,
      clientName: order.clientName,
      clientEmail: order.clientEmail,
      clientPhone: order.clientPhone,
      notes: order.generalNotes,
      items: itemsSummary,
      extraHours: totalExtraHours,
      enhanceAudioVideo: order.addAudioVideoEnhancement,
      total: finalTotal
    });

    doc.save(`Comprobante_DigiMemories_#${order.id}.pdf`);
  };

  // LOGIN SCREEN
  if (!order) {
    return (
      <div className="container section animate-on-load">
        <div style={{ maxWidth: '520px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ width: '74px', height: '74px', background: 'var(--accent-light)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto', border: '1px solid rgba(234, 88, 12, 0.2)' }}>
            <Search size={34} className="text-accent" />
          </div>
          <span className="badge" style={{ marginBottom: '0.75rem' }}>
            <Sparkles size={14} /> Consulta en Tiempo Real
          </span>
          <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 3rem)', marginBottom: '1rem', letterSpacing: '-0.02em' }}>
            Rastrea tu <span className="text-gradient">Orden</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem', fontSize: '1.05rem', lineHeight: 1.6 }}>
            Ingresa tu número de rastreo (#ID) y el PIN de 4 dígitos que te enviamos al registrar tu anticipo.
          </p>

          <form onSubmit={handleLogin} className="glass" style={{ padding: '2.5rem 2rem', borderRadius: '24px', background: '#ffffff' }}>
            <div style={{ marginBottom: '1.25rem', textAlign: 'left' }}>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: 600 }}>Número de Rastreo (6 dígitos)</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="Ej. 849201" 
                value={trackingId}
                onChange={e => setTrackingId(e.target.value)}
                required
                style={{ fontSize: '1.1rem', letterSpacing: '1px' }}
              />
            </div>

            <div style={{ marginBottom: '1.75rem', textAlign: 'left' }}>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: 600 }}>PIN de Seguridad (4 dígitos)</label>
              <input 
                type="password" 
                className="input-field" 
                placeholder="••••" 
                value={pin}
                onChange={e => setPin(e.target.value)}
                required
                style={{ textAlign: 'center', fontSize: '1.3rem', letterSpacing: '4px' }}
              />
            </div>

            {error && (
              <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#b91c1c', padding: '0.9rem', borderRadius: '12px', marginBottom: '1.5rem', fontSize: '0.875rem', textAlign: 'left' }}>
                ⚠️ {error}
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.95rem' }}>
              Consultar Avance de mis Cintas
            </button>
          </form>
        </div>
      </div>
    );
  }

  const finalTotal = calculateFinalTotal(order);
  const depositAmount = Math.round(order.estimatedTotal * 0.5);
  const remainingBalance = Math.max(0, finalTotal - depositAmount);
  const isCompleted = order.status === 'completada';

  return (
    <div className="container section animate-on-load">
      
      {/* Top Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span className="badge" style={{ marginBottom: '0.4rem' }}>
            {isCompleted ? '✓ 100% Completado' : 'En Proceso de Digitalización'}
          </span>
          <h1 style={{ fontSize: '2.35rem', margin: 0, letterSpacing: '-0.02em' }}>
            Orden <span className="text-gradient">#{order.id}</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.2rem' }}>
            Cliente: <strong>{order.clientName}</strong> ({order.clientEmail})
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button onClick={handleDownloadSummaryPDF} className="btn btn-secondary" style={{ padding: '0.65rem 1.25rem', fontSize: '0.9rem' }}>
            <Download size={16} /> Descargar Comprobante PDF
          </button>
          <button onClick={() => setOrder(null)} className="btn btn-secondary" style={{ padding: '0.65rem 1.25rem', fontSize: '0.9rem' }}>
            Cerrar Consulta
          </button>
        </div>
      </div>

      {/* Completion Celebration Banner */}
      {isCompleted && (
        <div className="glass" style={{ padding: '1.75rem 2rem', background: '#dcfce7', border: '1px solid #86efac', borderRadius: '20px', marginBottom: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: 'var(--shadow-sm)' }}>
              <CheckCircle size={32} color="#15803d" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.35rem', color: '#14532d', margin: '0 0 0.25rem 0' }}>
                🎉 ¡Tus recuerdos están listos para entrega!
              </h3>
              <p style={{ color: '#166534', margin: 0, fontSize: '0.95rem' }}>
                La digitalización ha finalizado con éxito. Te hemos enviado un correo de notificación a <strong>{order.clientEmail}</strong>.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <a 
              href={`https://wa.me/525548889876?text=${encodeURIComponent(
                `¡Hola DigiMemories! Soy ${order.clientName}. Veo en el portal que mi orden #${order.id} ya está finalizada con éxito.\n\n` +
                `📌 *Folio:* #${order.id}\n` +
                `📼 *Total de artículos:* ${order.items.length} unidades\n` +
                `💰 *Total Final:* $${finalTotal} MXN\n` +
                `💳 *Saldo Restante:* $${remainingBalance} MXN\n` +
                `🚚 *Modalidad:* ${order.deliveryType === 'home_delivery' ? '🛵 Uber Flash (CDMX)' : '📦 Paquetería Nacional (DHL / FedEx)'}\n` +
                (order.qualifiesForFreeReturn ? `🎉 *¡Califica para Retorno GRATIS a mi domicilio!*\n` : '') +
                (order.deliveryAddress ? `📍 *Dirección de Entrega:* ${order.deliveryAddress}\n\n` : '\n') +
                `¿Me ayudan a coordinar el despacho/recepción de mis recuerdos y memoria USB? ¡Muchas gracias!`
              )}`}
              target="_blank" 
              rel="noreferrer"
              className="btn btn-primary"
              style={{ fontSize: '0.9rem', padding: '0.65rem 1.3rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              💬 Coordinar Entrega por WhatsApp
            </a>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', marginBottom: '4rem' }}>
        
        {/* Financial Breakdown Card */}
        <div className="glass" style={{ padding: '2.25rem', borderRadius: '20px', background: '#ffffff' }}>
          <h3 style={{ marginBottom: '1.25rem', fontSize: '1.15rem', fontWeight: 700 }}>
            Resumen Financiero Transparente
          </h3>
          
          <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(214, 204, 194, 0.6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.95rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Total Final Calculado:</span>
              <strong style={{ color: 'var(--text-primary)' }}>${finalTotal} MXN</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.95rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Anticipo del 50% Registrado:</span>
              <strong style={{ color: '#16a34a' }}>- ${depositAmount} MXN</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '1rem', borderTop: '1px solid rgba(0, 0, 0, 0.08)', fontSize: '1.35rem', fontWeight: 800 }}>
              <span style={{ color: 'var(--text-primary)' }}>Saldo Restante:</span>
              <span style={{ color: 'var(--accent-color)' }}>${remainingBalance} MXN</span>
            </div>

            {remainingBalance > 0 && (
              <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px dashed rgba(0, 0, 0, 0.12)' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.6rem' }}>
                  💳 Opciones para Liquidar Saldo (${remainingBalance} MXN):
                </div>
                <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                  <a
                    href={`https://link.mercadopago.com.mx/digimemories?amount=${remainingBalance}&description=Liquidacion+Orden+${order.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '0.55rem 0.95rem',
                      background: '#009ee3',
                      color: '#ffffff',
                      borderRadius: '10px',
                      textDecoration: 'none',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    Pagar con Mercado Pago →
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText('012180015492837190');
                      alert(`CLABE BBVA copiada: 012180015492837190 (Monto: $${remainingBalance} MXN, Concepto: #${order.id})`);
                    }}
                    style={{
                      padding: '0.55rem 0.95rem',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      color: '#334155',
                      borderRadius: '10px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Copiar CLABE BBVA para SPEI
                  </button>
                </div>
              </div>
            )}

            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.75rem', margin: '0.75rem 0 0 0' }}>
              * Se liquida al concluir la digitalización para autorizar el despacho de tu paquete con memoria USB.
            </p>
          </div>

          <div style={{ marginTop: '1.75rem', padding: '1.25rem', background: 'var(--accent-light)', borderRadius: '14px', border: '1px solid rgba(234, 88, 12, 0.2)' }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--accent-color)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Truck size={16} /> Modalidad: {order.deliveryType === 'home_delivery' ? '🛵 Uber Flash (CDMX)' : '📦 Paquetería Nacional (DHL / FedEx)'}
              </div>
              {order.qualifiesForFreeReturn && (
                <span style={{ fontSize: '0.75rem', background: '#dcfce7', color: '#166534', border: '1px solid #86efac', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                  🎉 Retorno GRATIS Incluido
                </span>
              )}
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              {order.qualifiesForFreeReturn 
                ? '¡Tu orden califica para Retorno GRATIS! DigiMemories absorbe el flete de entrega de tus cintas y memoria USB a tu domicilio.' 
                : 'Coordinación y despacho por Uber Flash (CDMX) o Paquetería Nacional (DHL / FedEx / Estafeta). El número de guía o seguimiento se te comparte vía WhatsApp.'}
            </p>
          </div>
        </div>

        {/* Timeline by Item */}
        <div className="glass" style={{ padding: '2.25rem', borderRadius: '20px', background: '#ffffff' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.15rem', fontWeight: 700 }}>
            Avance por Artículo ({order.items.length} unidades)
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {order.items.map((item, index) => (
              <div key={item.id} style={{ display: 'flex', gap: '1.25rem', position: 'relative' }}>
                
                {/* Timeline Connector Line */}
                {index !== order.items.length - 1 && (
                  <div style={{ position: 'absolute', left: '15px', top: '34px', bottom: '-20px', width: '2px', background: 'var(--glass-border)' }}></div>
                )}
                
                <div style={{ background: '#ffffff', borderRadius: '50%', padding: '2px', zIndex: 1, boxShadow: 'var(--shadow-sm)' }}>
                  {getStatusIcon(item.status)}
                </div>
                
                <div style={{ flex: 1, paddingBottom: '0.5rem' }}>
                  <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                    {item.format} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>({item.id})</span>
                  </div>
                  
                  <div style={{ color: item.status === 'fallida' ? '#ef4444' : item.status === 'completada' ? '#15803d' : 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600, marginTop: '0.2rem' }}>
                    {getStatusText(item.status)}
                  </div>

                  {item.extraHours > 0 && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                      Metraje extendido: +{item.extraHours} hora(s) adicional(es)
                    </div>
                  )}

                  {/* Failure report card */}
                  {item.status === 'fallida' && (
                    <div style={{ marginTop: '0.75rem', padding: '1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px' }}>
                      <div style={{ fontWeight: 700, color: '#991b1b', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                        Motivo: {item.failureReason || 'No especificado'}
                      </div>
                      {item.failureNote && (
                        <p style={{ fontSize: '0.8rem', color: '#7f1d1d', margin: '0 0 0.5rem 0', lineHeight: 1.4 }}>
                          "{item.failureNote}"
                        </p>
                      )}
                      {item.failurePhotoUrl && (
                        <a href={item.failurePhotoUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', color: '#ea580c', fontWeight: 600 }}>
                          Ver fotografía de evidencia →
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Track;
