import { useState } from 'react';
import { 
  ArrowRight, 
  CheckCircle2, 
  Sparkles, 
  Copy, 
  Check, 
  RefreshCw,
  Mail,
  Download,
  Eye,
  X,
  ExternalLink
} from 'lucide-react';
import { generateQuotePDF } from '../lib/pdfGenerator';
import { saveOrder } from '../lib/store';
import { sendQuoteEmailWithPdf } from '../lib/emailService';
import type { EmailNotification } from '../lib/store';

const FORMATS = [
  { 
    id: 'cintas', 
    label: 'Cintas de Video (VHS, Betamax, Hi8, MiniDV)', 
    price: 200, 
    unit: 'cinta(s)', 
    desc: 'Digitalización 1:1 en MP4 de alta calidad. Incluye hasta 2 horas completas por cinta.',
    badge: 'Más Popular'
  },
  { 
    id: 'discos', 
    label: 'Discos Ópticos (DVD, MiniDVD, CD)', 
    price: 150, 
    unit: 'disco(s)', 
    desc: 'Extracción directa de video sin pérdidas de compresión innecesarias.',
    badge: 'Rápido'
  },
  { 
    id: 'fotos', 
    label: 'Fotografía Suelta en Papel', 
    price: 7, 
    unit: 'foto(s)', 
    desc: 'Escaneo plano en 600 DPI de alta resolución con corrección de contraste.',
    badge: '600 DPI'
  },
  { 
    id: 'albumes', 
    label: 'Álbum Fotográfico Completo', 
    price: 1200, 
    unit: 'álbum(es)', 
    desc: 'Digitalización de álbum completo encuadernado (hasta 200 fotos por álbum).',
    badge: 'Integral'
  },
];

const Contact = () => {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  
  // Add-ons para cintas
  const [extraHours, setExtraHours] = useState<number>(0);
  const [enhanceAudioVideo, setEnhanceAudioVideo] = useState<boolean>(false);

  // Form
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', details: '' });
  
  // Status
  const [isGenerated, setIsGenerated] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatusText, setEmailStatusText] = useState('');
  const [trackingId, setTrackingId] = useState('');
  const [copied, setCopied] = useState(false);
  const [sentEmailData, setSentEmailData] = useState<EmailNotification | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);

  const updateQuantity = (id: string, amount: number) => {
    const newQty = Math.max(0, amount);
    setQuantities(prev => ({ ...prev, [id]: newQty }));
    
    if (id === 'cintas' && newQty === 0) {
      setExtraHours(0);
      setEnhanceAudioVideo(false);
    }
  };

  const applyPreset = (presetQuantities: Record<string, number>) => {
    setQuantities(presetQuantities);
  };

  const calculateTotal = () => {
    let total = FORMATS.reduce((sum, f) => {
      const qty = quantities[f.id] || 0;
      return sum + (f.price * qty);
    }, 0);

    const tapesQty = quantities['cintas'] || 0;
    if (tapesQty > 0) {
      total += extraHours * 50;
      if (enhanceAudioVideo) {
        total += tapesQty * 150;
      }
    }

    return total;
  };

  const total = calculateTotal();
  const totalItemsCount = Object.values(quantities).reduce((a, b) => a + b, 0);

  const handleCopyId = () => {
    navigator.clipboard.writeText(trackingId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPDF = () => {
    const itemsForPdf = FORMATS.filter(f => (quantities[f.id] || 0) > 0).map(f => ({
      label: f.label,
      quantity: quantities[f.id] || 0,
      unit: f.unit,
      unitPrice: f.price,
      subtotal: (quantities[f.id] || 0) * f.price
    }));

    const pdfDoc = generateQuotePDF({
      trackingId,
      clientName: formData.name,
      clientEmail: formData.email,
      clientPhone: formData.phone,
      notes: formData.details,
      items: itemsForPdf,
      extraHours,
      enhanceAudioVideo,
      total
    });

    pdfDoc.save(`Cotizacion_DigiMemories_#${trackingId}.pdf`);
  };

  const handleOpenMailto = () => {
    const subject = encodeURIComponent(`Presupuesto DigiMemories #${trackingId}`);
    const body = encodeURIComponent(
      `Hola ${formData.name},\n\n` +
      `Tu cotización oficial con DigiMemories ha sido generada con el Folio #${trackingId}.\n` +
      `Total Estimado: $${total} MXN.\n\n` +
      `Puedes consultar el avance en: http://localhost:5173/track\n` +
      `Taller: Av. Insurgentes Sur #450, Col. Roma Sur, CDMX.\nTel: 55 4888 9876`
    );
    window.open(`mailto:${formData.email}?subject=${subject}&body=${body}`, '_blank');
  };

  const generatePDFAndSend = async () => {
    if (total === 0) {
      alert("Por favor selecciona al menos un formato para cotizar.");
      return;
    }
    if (!formData.name || !formData.email) {
      alert("Por favor completa tu Nombre y Correo para generar tu presupuesto.");
      document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    const newTrackingId = Math.floor(100000 + Math.random() * 900000).toString();
    setTrackingId(newTrackingId);
    setIsSendingEmail(true);
    setEmailStatusText('Despachando correo a tu bandeja de entrada...');

    // 1. Prepare items for PDF and DB
    const itemsForPdf = FORMATS.filter(f => (quantities[f.id] || 0) > 0).map(f => ({
      label: f.label,
      quantity: quantities[f.id] || 0,
      unit: f.unit,
      unitPrice: f.price,
      subtotal: (quantities[f.id] || 0) * f.price
    }));

    const orderItems: any[] = [];
    let itemsSummaryText = '';

    FORMATS.forEach(format => {
      const qty = quantities[format.id] || 0;
      if (qty > 0) {
        itemsSummaryText += `${qty} ${format.unit} de ${format.label}, `;
      }
      for (let i = 0; i < qty; i++) {
        let formatStr = 'Desconocido';
        if (format.id === 'cintas') formatStr = 'Cintas';
        if (format.id === 'discos') formatStr = 'Discos';
        if (format.id === 'fotos') formatStr = 'Fotos (Sueltas)';
        if (format.id === 'albumes') formatStr = 'Álbum Completo';

        orderItems.push({
          id: `${format.id}-${i+1}`,
          format: formatStr,
          status: 'pendiente',
          extraHours: format.id === 'cintas' && i === 0 ? extraHours : 0, 
          notes: ''
        });
      }
    });

    // 2. Generate and Download Redesigned Luxury PDF
    const pdfDoc = generateQuotePDF({
      trackingId: newTrackingId,
      clientName: formData.name,
      clientEmail: formData.email,
      clientPhone: formData.phone,
      notes: formData.details,
      items: itemsForPdf,
      extraHours,
      enhanceAudioVideo,
      total
    });

    pdfDoc.save(`Cotizacion_DigiMemories_#${newTrackingId}.pdf`);

    // 3. Save Order to mock database
    const newOrder = {
      id: newTrackingId,
      clientName: formData.name,
      clientEmail: formData.email,
      clientPhone: formData.phone,
      createdAt: new Date().toISOString(),
      estimatedTotal: total,
      depositPaid: false,
      pin: null,
      status: 'pendiente' as any,
      items: orderItems,
      addAudioVideoEnhancement: enhanceAudioVideo,
      generalNotes: formData.details
    };
    saveOrder(newOrder);

    // 4. Send email via internal mail service with PDF attached
    const depositAmount = Math.round(total * 0.5);
    const remainingAmount = total - depositAmount;

    const emailResult = await sendQuoteEmailWithPdf({
      quoteData: {
        clientName: formData.name,
        clientEmail: formData.email,
        trackingId: newTrackingId,
        total,
        depositAmount,
        remainingAmount,
        items: itemsForPdf,
        enhanceAudioVideo,
        notes: formData.details,
        tallerAddress: 'Av. Insurgentes Sur #450, Col. Roma Sur, CDMX',
        tallerPhone: '55 4888 9876',
        trackUrl: `${window.location.origin}/track`
      },
      pdfDoc
    });

    setSentEmailData(emailResult.emailRecord);
    setIsSendingEmail(false);
    setEmailStatusText(emailResult.message || 'Despachado a tu correo');

    // 5. WhatsApp Redirection
    const waNumber = '525548889876';
    let waText = `¡Hola DigiMemories! Soy ${formData.name}. Acabo de generar una cotización en su sitio web.\n\n` +
      `📌 *Número de Rastreo:* #${newTrackingId}\n` +
      `💰 *Total Estimado:* $${total} MXN\n\n` +
      `*Detalle de formatos:*\n`;
    
    FORMATS.forEach(f => {
      const qty = quantities[f.id] || 0;
      if (qty > 0) waText += `• ${qty} ${f.unit} de ${f.label}\n`;
    });

    if ((quantities['cintas'] || 0) > 0) {
      if (extraHours > 0) waText += `• ${extraHours} hora(s) extra estimadas.\n`;
      if (enhanceAudioVideo) waText += `• Servicio Premium de mejora de color y audio incluido.\n`;
    }

    if (formData.details) {
      waText += `\nNotas adicionales: ${formData.details}\n`;
    }
    
    waText += `\n¿Me indican los horarios del taller para llevar mi material? ¡Gracias!`;

    const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(waText)}`;
    window.open(waUrl, '_blank');
    
    setIsGenerated(true);
  };

  // SUCCESS CONFIRMATION SCREEN
  if (isGenerated) {
    return (
      <div className="container section animate-on-load" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="glass" style={{ maxWidth: '680px', width: '100%', padding: '3.5rem 2.5rem', textAlign: 'center', background: 'rgba(255, 255, 255, 0.98)' }}>
          <div style={{ width: '74px', height: '74px', background: 'var(--accent-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto', border: '1px solid rgba(234, 88, 12, 0.2)' }}>
            <CheckCircle2 size={40} className="text-accent" />
          </div>

          <h2 style={{ fontSize: '2.25rem', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
            ¡Presupuesto Generado con Éxito!
          </h2>
          
          {/* Email confirmation badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#dcfce7', color: '#15803d', padding: '0.5rem 1.15rem', borderRadius: '999px', fontSize: '0.9rem', fontWeight: 600, marginBottom: '1.75rem' }}>
            <Mail size={16} />
            <span>Enviado a {formData.email} {emailStatusText ? `(${emailStatusText})` : ''}</span>
          </div>

          {/* Direct Notice about spam / inbox */}
          <div style={{ background: '#fef3c7', border: '1px solid #fde68a', color: '#92400e', padding: '0.75rem 1rem', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '1.5rem', textAlign: 'left' }}>
            💡 <strong>Nota sobre tu correo:</strong> Si no lo ves en tu bandeja principal en unos minutos, revisa tu carpeta de <em>Spam / Correo no deseado</em> o <em>Promociones</em>.
          </div>

          {/* Tracking ID Box */}
          <div style={{ padding: '1.5rem', background: 'var(--bg-secondary)', borderRadius: '16px', marginBottom: '2rem', border: '1px solid rgba(214, 204, 194, 0.8)' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
              Tu Número de Rastreo Oficial:
            </span>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--accent-color)', letterSpacing: '3px' }}>
                #{trackingId}
              </div>
              <button 
                onClick={handleCopyId}
                className="btn btn-secondary"
                style={{ padding: '0.5rem 0.85rem', fontSize: '0.85rem' }}
                title="Copiar ID"
              >
                {copied ? <Check size={16} className="text-accent" /> : <Copy size={16} />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem', margin: 0 }}>
              Podrás consultar el estado de cada cinta en tiempo real desde la pestaña <strong>Rastrear</strong>.
            </p>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.85rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            <button 
              onClick={handleDownloadPDF} 
              className="btn btn-primary"
              style={{ fontSize: '0.95rem' }}
            >
              <Download size={16} /> Descargar PDF Oficial
            </button>

            <button 
              onClick={handleOpenMailto} 
              className="btn btn-secondary"
              style={{ fontSize: '0.95rem' }}
              title="Abrir en tu app de correo electrónico"
            >
              <ExternalLink size={16} /> Abrir en mi Correo
            </button>

            {sentEmailData && (
              <button 
                onClick={() => setShowEmailModal(true)} 
                className="btn btn-secondary"
                style={{ fontSize: '0.95rem' }}
              >
                <Eye size={16} /> Ver Vista Previa del Mail
              </button>
            )}

            <button 
              onClick={() => {
                setIsGenerated(false);
                setQuantities({});
                setExtraHours(0);
                setEnhanceAudioVideo(false);
                setFormData({ name: '', email: '', phone: '', details: '' });
              }} 
              className="btn btn-secondary"
              style={{ fontSize: '0.95rem' }}
            >
              <RefreshCw size={16} /> Nueva Cotización
            </button>
          </div>

          <div>
            <a href="/track" style={{ color: 'var(--accent-color)', textDecoration: 'none', fontWeight: 600, fontSize: '0.95rem' }}>
              Ir al Portal de Rastreo de Cintas →
            </a>
          </div>
        </div>

        {/* Email Preview Modal */}
        {showEmailModal && sentEmailData && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
            <div className="glass animate-on-load" style={{ maxWidth: '650px', width: '100%', maxHeight: '85vh', overflowY: 'auto', background: '#ffffff', padding: '2rem', borderRadius: '20px', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  <Mail size={18} className="text-accent" />
                  <span>Notificación por Correo Electrónico</span>
                </div>
                <button onClick={() => setShowEmailModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>

              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem', background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: '8px' }}>
                <div><strong>Para:</strong> {sentEmailData.toName} &lt;{sentEmailData.toEmail}&gt;</div>
                <div><strong>Asunto:</strong> {sentEmailData.subject}</div>
                <div><strong>Fecha:</strong> {new Date(sentEmailData.sentAt).toLocaleString('es-MX')}</div>
              </div>

              <div dangerouslySetInnerHTML={{ __html: sentEmailData.bodyHtml }} />
            </div>
          </div>
        )}
      </div>
    );
  }

  // MAIN CALCULATOR SCREEN
  return (
    <>
      <div className="container section animate-on-load" style={{ paddingBottom: '12rem' }}>
        
        {/* Header */}
        <div style={{ maxWidth: '800px', margin: '0 auto 3rem auto', textAlign: 'center' }}>
          <span className="badge" style={{ marginBottom: '1rem' }}>
            <Sparkles size={14} /> Cotizador Interactivo 1-Click
          </span>
          <h1 style={{ fontSize: 'clamp(2.3rem, 5vw, 3.5rem)', marginBottom: '1rem', letterSpacing: '-0.02em' }}>
            Calcula el costo de tus <span className="text-gradient">recuerdos</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.15rem', lineHeight: '1.7' }}>
            Selecciona la cantidad de formatos que tienes en casa. El presupuesto se calcula al instante de forma 100% transparente y se enviará a tu correo en PDF.
          </p>

          {/* Quick Presets */}
          <div style={{ marginTop: '2rem', display: 'flex', flexWrap: 'wrap', gap: '0.65rem', justifyContent: 'center', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Presets Rápidos:</span>
            <button 
              onClick={() => applyPreset({ cintas: 1 })}
              className="btn btn-secondary"
              style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem' }}
            >
              📼 1 Cinta ($200)
            </button>
            <button 
              onClick={() => applyPreset({ cintas: 5 })}
              className="btn btn-secondary"
              style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem' }}
            >
              📦 Caja Familiar: 5 Cintas ($1,000)
            </button>
            <button 
              onClick={() => applyPreset({ discos: 5 })}
              className="btn btn-secondary"
              style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem' }}
            >
              💿 5 Discos DVD ($750)
            </button>
            <button 
              onClick={() => applyPreset({ cintas: 10, fotos: 50 })}
              className="btn btn-secondary"
              style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem' }}
            >
              ⭐ Pack Completo
            </button>
          </div>
        </div>

        {/* Main Card */}
        <div className="glass" style={{ maxWidth: '850px', margin: '0 auto', padding: '2.5rem', borderRadius: '24px', background: 'rgba(255, 255, 255, 0.96)' }}>
          
          {/* Format List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2.5rem' }}>
            {FORMATS.map(f => {
              const qty = quantities[f.id] || 0;
              const isSelected = qty > 0;

              return (
                <div 
                  key={f.id} 
                  style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap',
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    gap: '1rem',
                    padding: '1.5rem', 
                    background: isSelected ? 'var(--accent-light)' : 'var(--bg-secondary)', 
                    borderRadius: '16px', 
                    border: isSelected ? '2px solid var(--accent-color)' : '1px solid rgba(214, 204, 194, 0.6)', 
                    transition: 'all 0.25s ease' 
                  }}
                >
                  <div style={{ flex: '1 1 280px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                      <h3 style={{ fontSize: '1.2rem', margin: 0 }}>{f.label}</h3>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        fontWeight: 700, 
                        background: isSelected ? 'var(--accent-color)' : 'rgba(0,0,0,0.08)', 
                        color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                        padding: '0.2rem 0.6rem', 
                        borderRadius: '999px' 
                      }}>
                        {f.badge}
                      </span>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem', lineHeight: 1.5 }}>
                      {f.desc}
                    </p>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--accent-color)' }}>
                      ${f.price} MXN <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)' }}>/ {f.unit}</span>
                    </div>
                  </div>
                  
                  {/* Stepper Controls */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.75rem', 
                    background: '#ffffff', 
                    padding: '0.5rem 0.75rem', 
                    borderRadius: '12px',
                    border: '1px solid rgba(0,0,0,0.08)',
                    boxShadow: 'var(--shadow-sm)'
                  }}>
                    <button 
                      onClick={() => updateQuantity(f.id, qty - 1)} 
                      aria-label={`Reducir ${f.label}`}
                      style={{ 
                        width: '38px', 
                        height: '38px', 
                        borderRadius: '8px', 
                        border: 'none', 
                        background: 'var(--bg-secondary)', 
                        fontSize: '1.3rem', 
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background 0.2s'
                      }}
                    >
                      -
                    </button>
                    
                    <div style={{ width: '40px', textAlign: 'center', fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {qty}
                    </div>

                    <button 
                      onClick={() => updateQuantity(f.id, qty + 1)} 
                      aria-label={`Aumentar ${f.label}`}
                      style={{ 
                        width: '38px', 
                        height: '38px', 
                        borderRadius: '8px', 
                        border: 'none', 
                        background: 'var(--accent-color)', 
                        color: '#ffffff', 
                        fontSize: '1.3rem', 
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background 0.2s'
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add-ons for Tapes */}
          {(quantities['cintas'] || 0) > 0 && (
            <div className="animate-on-load" style={{ padding: '1.75rem', background: 'var(--accent-light)', borderRadius: '18px', border: '1px solid rgba(234, 88, 12, 0.3)', marginBottom: '2.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <Sparkles size={20} className="text-accent" />
                <h4 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', margin: 0, fontWeight: 700 }}>
                  Personalización para Cintas de Video ({quantities['cintas']} seleccionadas)
                </h4>
              </div>
              
              {/* Extra hours */}
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', paddingBottom: '1.25rem', borderBottom: '1px solid rgba(234, 88, 12, 0.15)' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Horas extra estimadas de metraje</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    La base incluye 2 horas. Si alguna cinta dura más de 2 hrs (+ $50 MXN / hr adicional).
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button onClick={() => setExtraHours(Math.max(0, extraHours - 1))} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', minWidth: '36px' }}>-</button>
                  <span style={{ width: '32px', textAlign: 'center', fontWeight: 800, fontSize: '1.1rem' }}>{extraHours}</span>
                  <button onClick={() => setExtraHours(extraHours + 1)} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', minWidth: '36px' }}>+</button>
                </div>
              </div>

              {/* Audio/Video Enhancement Checkbox */}
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', cursor: 'pointer', paddingTop: '1.25rem' }}>
                <input 
                  type="checkbox" 
                  checked={enhanceAudioVideo} 
                  onChange={e => setEnhanceAudioVideo(e.target.checked)} 
                  style={{ width: '22px', height: '22px', accentColor: 'var(--accent-color)', marginTop: '0.2rem', cursor: 'pointer' }} 
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                    Mejora Premium de Color y Limpieza de Audio (+ $150 MXN por cinta)
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Aplicamos estabilización de señal, corrección de saturación/brillo y reducción de siseo estático.
                  </div>
                </div>
              </label>
            </div>
          )}

          {/* Contact Details Form */}
          <div id="contact-form" style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '2.5rem' }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
              ¿A dónde enviamos tu presupuesto oficial por correo?
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1.75rem' }}>
              Te enviaremos el documento oficial en PDF con validez de 15 días y tu folio de seguimiento.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: 600 }}>Nombre Completo *</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Ej. María Elena González" 
                  value={formData.name} 
                  onChange={e => setFormData({ ...formData, name: e.target.value })} 
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: 600 }}>Correo Electrónico (para recibir el PDF) *</label>
                <input 
                  type="email" 
                  className="input-field" 
                  placeholder="tu@correo.com" 
                  value={formData.email} 
                  onChange={e => setFormData({ ...formData, email: e.target.value })} 
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: 600 }}>Teléfono WhatsApp (Opcional)</label>
                <input 
                  type="tel" 
                  className="input-field" 
                  placeholder="Ej. 55 1234 5678" 
                  value={formData.phone} 
                  onChange={e => setFormData({ ...formData, phone: e.target.value })} 
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: 600 }}>Comentarios o notas adicionales (Opcional)</label>
                <textarea 
                  className="input-field" 
                  placeholder="Ej. ¿Puedo pasar al taller en sábado a dejar las cintas?" 
                  rows={2} 
                  value={formData.details} 
                  onChange={e => setFormData({ ...formData, details: e.target.value })}
                ></textarea>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Sticky Bottom Bar */}
      <div className="sticky-bottom-bar animate-on-load">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              {totalItemsCount > 0 ? `${totalItemsCount} formato(s) seleccionados` : 'Presupuesto Instantáneo'}
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
              ${total} <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>MXN</span>
            </div>
          </div>
        </div>
        
        <button 
          onClick={generatePDFAndSend} 
          disabled={total === 0 || isSendingEmail} 
          className="btn btn-primary animate-pulse-glow" 
          style={{ fontSize: '1.05rem', padding: '0.95rem 2.25rem', opacity: total === 0 ? 0.45 : 1, cursor: total === 0 ? 'not-allowed' : 'pointer' }}
        >
          {isSendingEmail ? 'Enviando correo...' : total === 0 ? 'Selecciona formatos arriba' : 'Generar Cotización y Enviar'} <ArrowRight size={18} />
        </button>
      </div>
    </>
  );
};

export default Contact;
