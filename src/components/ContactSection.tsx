import React, { useState } from 'react';
import { 
  MessageCircle, 
  Mail, 
  Send, 
  CheckCircle2, 
  Copy, 
  Check, 
  Clock, 
  MapPin, 
  Sparkles
} from 'lucide-react';
import { reportVisitorAction } from '../lib/visitorPresence';

export interface ContactInquiry {
  id: string;
  name: string;
  email: string;
  phone: string;
  formatType: string;
  itemCount: string;
  message: string;
  submittedAt: string;
}

export const ContactSection: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    formatType: 'cintas_vhs',
    itemCount: '1-5',
    message: ''
  });

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedInquiry, setSubmittedInquiry] = useState<ContactInquiry | null>(null);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const formatOptions = [
    { value: 'cintas_vhs', label: '📼 Cintas de Video (VHS, Betamax, Hi8, MiniDV)' },
    { value: 'fotos_papel', label: '📸 Fotos en Papel y Álbumes Familiares' },
    { value: 'discos_opticos', label: '💿 Discos (DVD, MiniDVD, CD)' },
    { value: 'varios_formatos', label: '📦 Colección Mixta (Cintas + Fotos + Discos)' },
    { value: 'otro', label: '❓ Otro material o duda general' }
  ];

  const handleCopyEmail = () => {
    navigator.clipboard.writeText('contacto@digimemories.mx');
    setCopiedEmail(true);
    reportVisitorAction('Copió correo de contacto');
    setTimeout(() => setCopiedEmail(false), 2500);
  };

  const handleWhatsAppClick = () => {
    reportVisitorAction('Hizo clic en WhatsApp directo');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) return;

    setIsSending(true);

    const inquiry: ContactInquiry = {
      id: `DM-MSG-${Math.floor(1000 + Math.random() * 9000)}`,
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      formatType: formData.formatType,
      itemCount: formData.itemCount,
      message: formData.message.trim(),
      submittedAt: new Date().toISOString()
    };

    // Save to local storage for persistence
    try {
      const existingRaw = localStorage.getItem('digimemories_contact_inquiries');
      const existing: ContactInquiry[] = existingRaw ? JSON.parse(existingRaw) : [];
      existing.unshift(inquiry);
      localStorage.setItem('digimemories_contact_inquiries', JSON.stringify(existing));
      window.dispatchEvent(new CustomEvent('digimemories_contact_sent', { detail: inquiry }));
    } catch {}

    reportVisitorAction(`Envió mensaje de contacto (${inquiry.id})`);

    setTimeout(() => {
      setIsSending(false);
      setIsSubmitted(true);
      setSubmittedInquiry(inquiry);
    }, 600);
  };

  const handleReset = () => {
    setIsSubmitted(false);
    setSubmittedInquiry(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      formatType: 'cintas_vhs',
      itemCount: '1-5',
      message: ''
    });
  };

  const getWhatsAppPrefilledUrl = (inq?: ContactInquiry | null) => {
    const text = inq
      ? `¡Hola DigiMemories! Acabo de enviar un formulario (Folio: ${inq.id}). Mi nombre es ${inq.name}, tengo aproximadamente ${inq.itemCount} piezas de ${inq.formatType}. Mi duda: ${inq.message || 'Quisiera asesoría sobre el rescate de mis recuerdos.'}`
      : '¡Hola DigiMemories! Quisiera recibir información y asesoría para digitalizar mis recuerdos familiares.';
    return `https://wa.me/525548889876?text=${encodeURIComponent(text)}`;
  };

  return (
    <section id="contacto" className="section" style={{ background: '#faf8f5', padding: '5rem 0' }}>
      <div className="container">
        
        {/* Header */}
        <div style={{ textAlign: 'center', maxWidth: '680px', margin: '0 auto 3.5rem auto' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'var(--accent-light)',
            color: 'var(--accent-color)',
            padding: '0.35rem 1rem',
            borderRadius: '999px',
            fontSize: '0.85rem',
            fontWeight: 700,
            marginBottom: '1rem',
            border: '1px solid rgba(234, 88, 12, 0.2)'
          }}>
            <Sparkles size={15} />
            <span>Atención Directa y Personalizada</span>
          </div>

          <h2 style={{ fontSize: 'clamp(2.2rem, 4vw, 3rem)', fontWeight: 800, letterSpacing: '-0.02em', color: '#1c1917', marginBottom: '1rem' }}>
            Contáctanos en un instante
          </h2>

          <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            ¿Tienes dudas sobre el estado de tus cintas, formatos o entregas? Escríbenos directamente por WhatsApp, envíanos un correo o déjanos tus datos en la cajita inferior para que te contactemos de inmediato.
          </p>
        </div>

        {/* 2-Column Layout: Direct Channels on Left, Contact Box on Right */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '2.5rem',
          alignItems: 'start'
        }}>

          {/* LEFT: Quick Direct Channels */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* WhatsApp Card */}
            <div 
              className="glass" 
              style={{
                padding: '2rem',
                borderRadius: '24px',
                background: '#ffffff',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                boxShadow: '0 10px 30px rgba(16, 185, 129, 0.08)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#059669',
                background: '#ecfdf5',
                padding: '0.25rem 0.65rem',
                borderRadius: '999px',
                border: '1px solid #a7f3d0'
              }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                En línea ahora
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1rem' }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  boxShadow: '0 6px 16px rgba(16, 185, 129, 0.3)'
                }}>
                  <MessageCircle size={26} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#1c1917' }}>
                    WhatsApp Directo
                  </h3>
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    Respuesta promedio: &lt; 10 minutos
                  </span>
                </div>
              </div>

              <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.55, marginBottom: '1.5rem' }}>
                Chatea directamente con nuestro equipo de laboratorio. Puedes mandarnos fotos de tus cassettes para ayudarte a identificar qué tipo de cinta tienes.
              </p>

              <a
                href={getWhatsAppPrefilledUrl()}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleWhatsAppClick}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  width: '100%',
                  padding: '0.85rem 1.25rem',
                  borderRadius: '14px',
                  background: '#10b981',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  textDecoration: 'none',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                  transition: 'background 0.2s ease'
                }}
              >
                <MessageCircle size={18} />
                Iniciar Chat por WhatsApp
              </a>
            </div>

            {/* Email Card */}
            <div 
              className="glass" 
              style={{
                padding: '2rem',
                borderRadius: '24px',
                background: '#ffffff',
                border: '1px solid rgba(234, 88, 12, 0.2)',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.04)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1rem' }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '16px',
                  background: 'var(--accent-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-color)',
                  border: '1px solid rgba(234, 88, 12, 0.25)'
                }}>
                  <Mail size={26} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#1c1917' }}>
                    Correo Electrónico
                  </h3>
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    contacto@digimemories.mx
                  </span>
                </div>
              </div>

              <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.55, marginBottom: '1.5rem' }}>
                Ideal para proyectos de digitalización institucional, cotizaciones por volumen o dudas con requerimientos especiales.
              </p>

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <a
                  href="mailto:contacto@digimemories.mx?subject=Consulta%20Digitalizaci%C3%B3n%20DigiMemories"
                  className="btn btn-secondary"
                  style={{ flex: 1, minWidth: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem', padding: '0.75rem 1rem', fontSize: '0.88rem' }}
                >
                  <Mail size={16} /> Abrir Correo
                </a>

                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="btn btn-ghost"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.45rem',
                    padding: '0.75rem 1rem',
                    fontSize: '0.88rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px'
                  }}
                >
                  {copiedEmail ? <Check size={16} style={{ color: '#10b981' }} /> : <Copy size={16} />}
                  <span>{copiedEmail ? '¡Copiado!' : 'Copiar'}</span>
                </button>
              </div>
            </div>

            {/* Service Hours & Trust Note */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '20px',
              padding: '1.35rem 1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.85rem', color: '#334155', fontWeight: 600 }}>
                <Clock size={16} style={{ color: 'var(--accent-color)' }} />
                <span>Horario de Atención: Lunes a Sábado de 9:00 AM a 8:00 PM</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.85rem', color: '#334155', fontWeight: 600 }}>
                <MapPin size={16} style={{ color: 'var(--accent-color)' }} />
                <span>Taller Central: Ciudad de México (Cobertura en todo el país)</span>
              </div>
            </div>

          </div>

          {/* RIGHT: Contact Box ("Cajita donde pueden dejar sus datos") */}
          <div 
            className="glass" 
            style={{
              padding: '2.5rem 2rem',
              borderRadius: '28px',
              background: '#ffffff',
              boxShadow: '0 20px 45px rgba(0, 0, 0, 0.06)',
              border: '1px solid rgba(214, 204, 194, 0.9)'
            }}
          >
            {isSubmitted && submittedInquiry ? (
              <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                <div style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '22px',
                  background: '#ecfdf5',
                  color: '#059669',
                  border: '1px solid #a7f3d0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.25rem auto'
                }}>
                  <CheckCircle2 size={36} />
                </div>

                <span style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#059669', background: '#d1fae5', padding: '0.25rem 0.75rem', borderRadius: '999px' }}>
                  ¡Mensaje Recibido!
                </span>

                <h3 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1c1917', margin: '0.75rem 0 0.5rem 0' }}>
                  Gracias, {submittedInquiry.name}
                </h3>

                <p style={{ fontSize: '0.92rem', color: '#475569', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                  Hemos registrado tus datos correctamente con el folio <strong>{submittedInquiry.id}</strong>. Un especialista de DigiMemories te responderá a tu correo o WhatsApp a la brevedad.
                </p>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1rem', textAlign: 'left', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                  <div style={{ color: '#64748b', marginBottom: '0.25rem' }}>Resumen de tu solicitud:</div>
                  <div style={{ fontWeight: 700, color: '#1e293b' }}>
                    {submittedInquiry.itemCount} piezas de {submittedInquiry.formatType}
                  </div>
                  <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                    Contacto: {submittedInquiry.email} {submittedInquiry.phone ? `• ${submittedInquiry.phone}` : ''}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <a
                    href={getWhatsAppPrefilledUrl(submittedInquiry)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      width: '100%',
                      padding: '0.85rem',
                      borderRadius: '12px',
                      background: '#10b981',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '0.92rem',
                      textDecoration: 'none'
                    }}
                  >
                    <MessageCircle size={18} /> Enviar también por WhatsApp ahora
                  </a>

                  <button
                    type="button"
                    onClick={handleReset}
                    className="btn btn-ghost"
                    style={{ fontSize: '0.88rem', padding: '0.65rem' }}
                  >
                    Enviar otro mensaje
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#1c1917', margin: '0 0 0.35rem 0' }}>
                    Déjanos tus datos
                  </h3>
                  <p style={{ fontSize: '0.88rem', color: '#64748b', margin: 0 }}>
                    Completa este formulario y un técnico se pondrá en contacto contigo.
                  </p>
                </div>

                {/* Name */}
                <div style={{ marginBottom: '1.15rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Nombre completo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. María Elena González"
                    className="input-field"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                {/* Email & Phone Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1.15rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      Correo Electrónico *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="ejemplo@correo.com"
                      className="input-field"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      Teléfono / WhatsApp
                    </label>
                    <input
                      type="tel"
                      placeholder="10 dígitos (opcional)"
                      className="input-field"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>

                {/* Format Selector */}
                <div style={{ marginBottom: '1.15rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Tipo de material a rescatar
                  </label>
                  <select
                    className="input-field"
                    value={formData.formatType}
                    onChange={e => setFormData({ ...formData, formatType: e.target.value })}
                    style={{ background: '#ffffff' }}
                  >
                    {formatOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Item Count Selector */}
                <div style={{ marginBottom: '1.15rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Cantidad aproximada
                  </label>
                  <select
                    className="input-field"
                    value={formData.itemCount}
                    onChange={e => setFormData({ ...formData, itemCount: e.target.value })}
                    style={{ background: '#ffffff' }}
                  >
                    <option value="1-3">1 a 3 piezas</option>
                    <option value="4-10">4 a 10 piezas (Paquete familiar)</option>
                    <option value="11-25">11 a 25 piezas</option>
                    <option value="mas_de_25">Más de 25 piezas (Gran archivo)</option>
                    <option value="por_determinar">Aún no lo sé con certeza</option>
                  </select>
                </div>

                {/* Message */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Mensaje o duda específica
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Cuéntanos sobre tus cintas o cualquier duda que tengas..."
                    className="input-field"
                    style={{ resize: 'vertical' }}
                    value={formData.message}
                    onChange={e => setFormData({ ...formData, message: e.target.value })}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSending}
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    padding: '0.95rem',
                    fontSize: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  {isSending ? (
                    <span>Enviando mensaje...</span>
                  ) : (
                    <>
                      <Send size={18} /> Enviar Mensaje a Taller
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

        </div>

      </div>
    </section>
  );
};

export default ContactSection;
