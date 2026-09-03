import { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const FAQS = [
  {
    question: "¿En qué formato digital se entregan los archivos?",
    answer: "Todos los videos (VHS, Beta, Hi8, MiniDV, DVD) se entregan en formato digital MP4 universal (H.264 / AAC), compatible con cualquier computadora (Mac/Windows), Smart TV, tablet o teléfono móvil. Las fotografías se entregan en JPG de alta definición a 600 DPI."
  },
  {
    question: "¿Cómo es el método de entrega de mis archivos?",
    answer: "Por políticas estrictas de privacidad y debido al alto peso de los videos sin comprimir, la entrega se realiza de forma física. Puedes entregarnos una memoria USB (mínimo 50GB recomendados) o un Disco Duro externo al traer tus cintas, o bien adquirir uno directamente con nosotros a precio de costo."
  },
  {
    question: "¿Cómo hago llegar mis casetes y recuerdos a DigiMemories?",
    answer: "Manejamos 3 modalidades muy cómodas: 1) Punto de Encuentro Seguro (CDMX): Agendamos una cita vía WhatsApp en una plaza o punto céntrico con vigilancia (Parque Delta, Reforma 222, WTC, etc.) para entrega y recepción personal sin costo de envío. 2) Uber Flash / Didi (CDMX): Envías tus casetes el mismo día solicitando un chofer desde tu app de Uber o Didi a la dirección coordinada por WhatsApp (el viaje lo pagas tú directamente en tu app). 3) Paquetería Nacional (DHL, FedEx, Estafeta): Si estás en CDMX o en cualquier estado de la República, empacas tu material y lo despachas desde tu sucursal más cercana pagando tu guía en ventanilla."
  },
  {
    question: "¿Qué sucede si mi cinta dura más de 2 horas?",
    answer: "Nuestra tarifa base de $200 MXN cubre las primeras 2 horas completas de digitalización (tiempo estándar de la mayoría de cintas domésticas). Si la cinta dura más de 2 horas, cada hora adicional se cobra a solo $50 MXN. Podrás ver el desglose exacto de horas en tu portal de rastreo."
  },
  {
    question: "¿Reparan cintas rotas o limpian hongos severos?",
    answer: "No realizamos reparaciones químicas o mecánicas invasivas de cintas rotas ni limpieza profunda de hongos peligrosos. El material debe venir en condiciones reproducibles. Si al inspeccionar tu cinta detectamos que no se puede reproducir de forma segura, te notificaremos de inmediato y no se te cobrará esa unidad."
  },
  {
    question: "¿En qué consiste el servicio opcional de mejora de color y audio?",
    answer: "Es un servicio adicional ($150 MXN por cinta) en el cual aplicamos estabilización de señal, corrección digital de balance de blancos/saturación y filtros de reducción de siseo y ruido estático de audio para que tus videos de los 80s y 90s se vean y escuchen con mayor claridad."
  },
  {
    question: "¿Qué formatos analógicos y digitales digitalizan?",
    answer: "Digitalizamos cintas VHS estándar (normal), Betamax, Video8, Hi8, Digital8 y MiniDV. También extraemos video de discos DVD y Mini DVD, así como escaneo de fotografías en papel y álbumes familiares completos. (Nota importante: Procesamos únicamente VHS estándar normal; no digitalizamos película de cine en rollo de 8mm/Super 8, ni variantes como VHS-C o S-VHS)."
  }
];

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="container section animate-on-load">
      <div style={{ maxWidth: '800px', margin: '0 auto 3.5rem auto', textAlign: 'center' }}>
        <span className="badge" style={{ marginBottom: '1rem' }}>
          <HelpCircle size={14} /> Centro de Ayuda
        </span>
        <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 3.8rem)', marginBottom: '1.25rem', letterSpacing: '-0.02em' }}>
          Preguntas <span className="text-gradient">Frecuentes</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.15rem', lineHeight: '1.7' }}>
          Todo lo que necesitas saber sobre formatos, entrega física, tiempos y cuidado de tus recuerdos.
        </p>
      </div>

      <div style={{ maxWidth: '780px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {FAQS.map((faq, index) => {
          const isOpen = openIndex === index;

          return (
            <div 
              key={index} 
              className="glass" 
              style={{ 
                borderRadius: '16px', 
                overflow: 'hidden',
                background: 'rgba(255, 255, 255, 0.95)',
                border: isOpen ? '1.5px solid var(--accent-color)' : '1px solid var(--glass-border)',
                transition: 'all 0.25s ease'
              }}
            >
              <button 
                onClick={() => toggleFAQ(index)}
                style={{ 
                  width: '100%', 
                  padding: '1.5rem 1.75rem', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  textAlign: 'left',
                  cursor: 'pointer',
                  gap: '1rem'
                }}
              >
                <span>{faq.question}</span>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: isOpen ? 'var(--accent-light)' : 'var(--bg-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'background 0.2s'
                }}>
                  {isOpen ? <ChevronUp size={18} className="text-accent" /> : <ChevronDown size={18} />}
                </div>
              </button>
              
              {isOpen && (
                <div style={{ padding: '0 1.75rem 1.5rem 1.75rem', color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '0.95rem', borderTop: '1px solid rgba(0,0,0,0.04)', paddingTop: '1rem' }}>
                  {faq.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom CTA */}
      <div style={{ textAlign: 'center', marginTop: '4rem' }}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>¿Tienes una consulta específica sobre tu material?</p>
        <Link to="/contact" className="btn btn-primary" style={{ padding: '0.9rem 2rem' }}>
          Cotizar Ahora <ArrowRight size={18} />
        </Link>
      </div>
    </div>
  );
};

export default FAQ;
