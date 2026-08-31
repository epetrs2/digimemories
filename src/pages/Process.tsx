import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, HardDrive, Cpu, Search, Sparkles } from 'lucide-react';

const Process = () => {
  const steps = [
    {
      step: '01',
      title: 'Recepción e Inspección Inicial',
      icon: <Search size={22} className="text-accent" />,
      image: '/step1.jpg',
      alt: 'Inspección meticulosa de cinta VHS',
      desc: 'Revisamos minuciosamente cada cartucho analógico. Verificamos el estado físico de la carcasa, la tensión del carrete y comprobamos que no existan hongos o roturas mecánicas severas antes de insertar el material.',
      bullets: [
        'Inspección física y visual del carrete',
        'Clasificación por formato (VHS, Betamax, Hi8, MiniDV)',
        'Asignación de código de identificación único para rastreo'
      ]
    },
    {
      step: '02',
      title: 'Digitalización y Monitoreo en Tiempo Real',
      icon: <Cpu size={22} className="text-accent" />,
      image: '/step2.jpg',
      alt: 'Digitalización con reproductores de video de estudio',
      desc: 'Reproducimos tus cintas en cabezales profesionales limpios y calibrados. La señal se digitaliza a velocidad real 1:1 conectada a tarjetas de captura dedicadas para evitar pérdida de cuadros (frame drop) o compresión destructiva.',
      bullets: [
        'Captura en tiempo real (cinta de 2h = 2h de proceso)',
        'Estabilización de señal y reducción de artefactos analógicos',
        'Conversión directa a MP4 en alta tasa de bits (H.264 / AAC)'
      ]
    },
    {
      step: '03',
      title: 'Entrega Física en Memoria USB y Devolución',
      icon: <HardDrive size={22} className="text-accent" />,
      image: '/step3_usb.svg',
      alt: 'Entrega segura en USB de videos familiares',
      desc: 'Guardamos tus archivos digitales en una memoria USB o Disco Duro organizados por carpetas claras (fechas y nombres). Te devolvemos todas tus cintas originales intactas para que las conserves como reliquia familiar.',
      bullets: [
        'Archivos MP4 universales compatibles con Smart TV, PC, Mac y celulares',
        'Devolución íntegra de tus cartuchos originales',
        'Servicio opcional de mejora y corrección de color'
      ]
    }
  ];

  return (
    <div className="animate-on-load">
      <div className="container section">
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '4.5rem', maxWidth: '750px', margin: '0 auto 4.5rem auto' }}>
          <span className="badge" style={{ marginBottom: '1rem' }}>
            <Sparkles size={15} /> Metodología Profesional
          </span>
          <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 3.8rem)', marginBottom: '1.25rem', letterSpacing: '-0.02em' }}>
            Nuestro <span className="text-gradient">Proceso de Preservación</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.15rem', lineHeight: '1.7' }}>
            Cuidamos tus recuerdos como si fueran los nuestros. Cada cinta sigue un protocolo de manipulación seguro y trazable desde que entra a nuestro taller hasta que vuelve a tus manos.
          </p>
        </div>

        {/* Steps Timeline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5rem', maxWidth: '1050px', margin: '0 auto' }}>
          {steps.map((item, index) => {
            const isEven = index % 2 === 1;
            return (
              <div 
                key={item.step}
                className="glass"
                style={{
                  padding: '2.5rem',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                  gap: '3.5rem',
                  alignItems: 'center',
                  background: 'rgba(255, 255, 255, 0.95)'
                }}
              >
                {/* Image side */}
                <div style={{ order: isEven ? 2 : 1, position: 'relative' }}>
                  <div style={{
                    borderRadius: '18px',
                    overflow: 'hidden',
                    boxShadow: 'var(--shadow-md)',
                    border: '1px solid rgba(0,0,0,0.06)'
                  }}>
                    <img 
                      src={item.image} 
                      alt={item.alt} 
                      style={{ width: '100%', height: '340px', objectFit: 'cover', display: 'block' }}
                    />
                  </div>
                </div>

                {/* Content side */}
                <div style={{ order: isEven ? 1 : 2 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                    <span style={{ 
                      fontSize: '0.9rem', 
                      fontWeight: 800, 
                      color: 'var(--accent-color)', 
                      background: 'var(--accent-light)', 
                      padding: '0.35rem 0.8rem', 
                      borderRadius: '999px',
                      border: '1px solid rgba(234, 88, 12, 0.2)'
                    }}>
                      PASO {item.step}
                    </span>
                  </div>

                  <h2 style={{ fontSize: '1.85rem', marginBottom: '1rem', lineHeight: 1.25 }}>
                    {item.title}
                  </h2>

                  <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: '1.7', marginBottom: '1.5rem' }}>
                    {item.desc}
                  </p>

                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {item.bullets.map((bullet, bi) => (
                      <li key={bi} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                        <CheckCircle2 size={18} className="text-accent" style={{ marginTop: '0.2rem', flexShrink: 0 }} />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA Card */}
        <div style={{ textAlign: 'center', marginTop: '6rem' }}>
          <div className="glass" style={{ maxWidth: '700px', margin: '0 auto', padding: '3rem 2rem', background: 'var(--bg-secondary)' }}>
            <h3 style={{ fontSize: '2rem', marginBottom: '1rem' }}>
              ¿Tienes dudas sobre el estado de tus cintas?
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', marginBottom: '2rem' }}>
              Genera tu cotización en línea o escríbenos directamente para asesorarte sobre tu material analógico.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <Link to="/contact" className="btn btn-primary" style={{ padding: '0.9rem 2rem', fontSize: '1.05rem' }}>
                Cotizar Mis Cintas <ArrowRight size={18} />
              </Link>
              <Link to="/faq" className="btn btn-secondary" style={{ padding: '0.9rem 1.75rem', fontSize: '1.05rem' }}>
                Preguntas Frecuentes
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Process;
