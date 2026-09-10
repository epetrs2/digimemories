import React from 'react';
import ContactSection from '../components/ContactSection';
import { ShieldCheck, Truck, Clock, HelpCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Contacto: React.FC = () => {
  return (
    <div className="animate-on-load">
      {/* Page Header */}
      <section style={{ 
        background: 'linear-gradient(180deg, rgba(234, 88, 12, 0.05) 0%, rgba(250, 248, 245, 1) 100%)',
        padding: '4.5rem 0 2rem 0',
        textAlign: 'center'
      }}>
        <div className="container" style={{ maxWidth: '780px' }}>
          <span style={{
            display: 'inline-block',
            fontSize: '0.8rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--accent-color)',
            background: 'var(--accent-light)',
            padding: '0.35rem 1rem',
            borderRadius: '999px',
            marginBottom: '1rem',
            border: '1px solid rgba(234, 88, 12, 0.2)'
          }}>
            Atención al Cliente & Laboratorio
          </span>

          <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 3.5rem)', fontWeight: 800, letterSpacing: '-0.03em', color: '#1c1917', marginBottom: '1.25rem', lineHeight: 1.15 }}>
            Estamos aquí para ayudarte a <span className="text-gradient">rescatar tus recuerdos</span>.
          </h1>

          <p style={{ fontSize: '1.15rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 auto 2rem auto', maxWidth: '620px' }}>
            Ya sea que tengas una sola cinta familiar o un archivo audiovisual extenso, nuestro equipo técnico te brindará asesoría especializada paso a paso.
          </p>

          {/* Quick Pillars */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap', marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: '#475569', fontWeight: 600 }}>
              <Clock size={18} style={{ color: 'var(--accent-color)' }} />
              <span>Respuesta rápida el mismo día</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: '#475569', fontWeight: 600 }}>
              <Truck size={18} style={{ color: 'var(--accent-color)' }} />
              <span>Recolección en CDMX & Envíos Nacionales</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: '#475569', fontWeight: 600 }}>
              <ShieldCheck size={18} style={{ color: 'var(--accent-color)' }} />
              <span>Trato confidencial y seguro</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Contact Section (Channels & Box) */}
      <ContactSection />

      {/* Direct FAQ Helper Banner */}
      <section className="section" style={{ background: '#ffffff', borderTop: '1px solid #e7e5e4' }}>
        <div className="container" style={{ maxWidth: '820px', textAlign: 'center' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '18px',
            background: '#fff7ed',
            color: 'var(--accent-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem auto',
            border: '1px solid #fed7aa'
          }}>
            <HelpCircle size={28} />
          </div>

          <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1c1917', marginBottom: '0.75rem' }}>
            ¿Prefieres calcular tu presupuesto tú mismo?
          </h3>

          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6, marginBottom: '1.75rem' }}>
            Puedes usar nuestro cotizador instantáneo interactivo para seleccionar la cantidad exacta de cintas VHS, Betamax, fotos o discos, y descargar tu presupuesto en PDF con desglose completo.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <Link to="/contact" className="btn btn-primary" style={{ padding: '0.85rem 2rem' }}>
              Abrir Calculadora y Cotizador <ArrowRight size={17} />
            </Link>
            <Link to="/process" className="btn btn-secondary" style={{ padding: '0.85rem 1.75rem' }}>
              Conocer Nuestro Proceso de Estudio
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contacto;
