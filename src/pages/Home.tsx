import { Link } from 'react-router-dom';
import { 
  Disc, 
  Film, 
  CassetteTape, 
  ArrowRight, 
  HelpCircle, 
  ShieldCheck, 
  Clock, 
  Sparkles, 
  CheckCircle2, 
  Star,
  HardDrive
} from 'lucide-react';
import Carousel from '../components/Carousel';
import BeforeAfterSlider from '../components/BeforeAfterSlider';

const Home = () => {
  return (
    <div className="animate-on-load">
      {/* Hero Section */}
      <section className="container section" style={{ minHeight: '85vh', display: 'flex', alignItems: 'center', paddingTop: '3rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '4.5rem', alignItems: 'center', width: '100%' }}>
          
          {/* Left Column: Value Prop */}
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'var(--accent-light)', color: 'var(--accent-color)', padding: '0.4rem 1.1rem', borderRadius: '999px', fontSize: '0.875rem', fontWeight: 600, marginBottom: '1.5rem', border: '1px solid rgba(234, 88, 12, 0.2)' }}>
              <span>📼 VHS • Betamax • Hi8 • MiniDV • DVD</span>
            </div>

            <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 3.8rem)', lineHeight: '1.12', marginBottom: '1.5rem', letterSpacing: '-0.03em' }}>
              Tus recuerdos familiares merecen <span className="text-gradient">volver a la vida</span>.
            </h1>

            <p style={{ fontSize: '1.15rem', color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: '1.7', maxWidth: '540px' }}>
              El tiempo borra las cintas magnéticas año con año. Digitalizamos tus grabaciones analógicas con equipo profesional de estudio para que las disfrutes hoy en tu Smart TV, computadora o celular.
            </p>

            {/* Trust highlights */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', marginBottom: '2.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                <CheckCircle2 size={18} className="text-accent" />
                <span>+1,500 horas recuperadas</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                <ShieldCheck size={18} className="text-accent" />
                <span>100% Confidencial y Seguro</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                <HardDrive size={18} className="text-accent" />
                <span>Entrega directa en USB</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <Link to="/contact" className="btn btn-primary animate-pulse-glow" style={{ padding: '0.95rem 2.25rem', fontSize: '1.05rem' }}>
                Cotizar Mis Cintas <ArrowRight size={18} />
              </Link>
              <Link to="/process" className="btn btn-secondary" style={{ padding: '0.95rem 1.85rem', fontSize: '1.05rem' }}>
                Ver Proceso
              </Link>
            </div>
          </div>

          {/* Right Column: Hero Visual Card */}
          <div style={{ position: 'relative' }}>
            <div style={{
              position: 'relative',
              borderRadius: '24px',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-lg)',
              border: '1px solid rgba(255, 255, 255, 0.8)',
              background: '#ffffff'
            }}>
              <img 
                src="/tapes_stack.jpg" 
                alt="Colección de cintas familiares VHS y Betamax listas para digitalizar" 
                style={{ width: '100%', height: '440px', objectFit: 'cover', display: 'block' }}
              />

              {/* Floating Badge Top Left */}
              <div style={{
                position: 'absolute',
                top: '1.25rem',
                left: '1.25rem',
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(12px)',
                padding: '0.6rem 1rem',
                borderRadius: '14px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                border: '1px solid rgba(255, 255, 255, 0.9)'
              }}>
                <Sparkles size={16} className="text-accent" />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Colección Familiar de los 90s
                </span>
              </div>

              {/* Floating Card Bottom */}
              <div style={{
                position: 'absolute',
                bottom: '1.25rem',
                left: '1.25rem',
                right: '1.25rem',
                background: 'rgba(251, 249, 245, 0.95)',
                backdropFilter: 'blur(16px)',
                padding: '1rem 1.25rem',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.9)',
                boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                    Tarifa Transparente
                  </div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Desde $200 MXN <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>/ cinta</span>
                  </div>
                </div>
                <Link to="/contact" className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                  Calcular
                </Link>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Before / After Restoration Section */}
      <section className="section" style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--glass-border)', borderBottom: '1px solid var(--glass-border)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <span className="badge" style={{ marginBottom: '1rem' }}>
              <Sparkles size={15} /> Calidad Profesional
            </span>
            <h2 style={{ fontSize: 'clamp(2rem, 4vw, 2.75rem)', marginBottom: '1rem' }}>
              Restaura la vitalidad de tus videos
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '640px', margin: '0 auto' }}>
              No solo transferimos tus cintas: con nuestro servicio opcional de optimización, estabilizamos la señal analógica, corregimos el balance de color y limpiamos el ruido del audio.
            </p>
          </div>

          <div style={{ maxWidth: '850px', margin: '0 auto' }}>
            <BeforeAfterSlider 
              beforeImage="/step1.jpg"
              afterImage="/tapes_stack.jpg"
              beforeLabel="Cinta Original (Sin procesar)"
              afterLabel="Captura Optimizada & Remasterizada"
            />
          </div>
        </div>
      </section>

      {/* Formats Rescued Section */}
      <section className="section">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 style={{ fontSize: 'clamp(2rem, 4vw, 2.75rem)', marginBottom: '1rem' }}>
              ¿Qué formatos podemos rescatar?
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>
              Precios por unidad fijos y claros. Sin letras pequeñas ni sorpresas de último momento.
            </p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '2rem' }}>
            {[
              { 
                icon: <CassetteTape size={36} />, 
                title: "Cintas de Video", 
                price: "$200 MXN", 
                detail: "Por cinta (hasta 2 hrs)",
                formats: "VHS • Betamax • Hi8 • Video8 • MiniDV", 
                desc: "Digitalización a velocidad real con reproductores profesionales y tarjetas de captura dedicadas." 
              },
              { 
                icon: <Disc size={36} />, 
                title: "Discos Ópticos", 
                price: "$150 MXN", 
                detail: "Por disco",
                formats: "DVD • MiniDVD • CD-ROM • VCD", 
                desc: "Extracción directa de video sin recodificación innecesaria, listo para guardar en tu disco duro." 
              },
              { 
                icon: <Film size={36} />, 
                title: "Película de Cine", 
                price: "$350 MXN", 
                detail: "Por rollo base",
                formats: "8mm • Super 8mm", 
                desc: "Digitalización cuadro por cuadro para preservar cada fotograma histórico con máxima nitidez." 
              },
              { 
                icon: <Sparkles size={36} />, 
                title: "Fotografías y Álbumes", 
                price: "$7 MXN", 
                detail: "Por foto suelta",
                formats: "Fotos sueltas • Álbumes completos", 
                desc: "Escaneo óptico en 600 DPI con corrección de contraste para álbumes familiares antiguos." 
              }
            ].map((item, i) => (
              <div key={i} className="glass glass-hover" style={{ padding: '2.25rem 2rem', display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ 
                  color: 'var(--accent-color)', 
                  marginBottom: '1.5rem', 
                  display: 'inline-flex', 
                  padding: '0.9rem', 
                  background: 'var(--accent-light)', 
                  borderRadius: '14px',
                  width: 'fit-content',
                  border: '1px solid rgba(234, 88, 12, 0.15)'
                }}>
                  {item.icon}
                </div>

                <h3 style={{ fontSize: '1.4rem', marginBottom: '0.35rem' }}>{item.title}</h3>
                
                <div style={{ marginBottom: '1rem' }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>{item.price}</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginLeft: '0.4rem' }}>{item.detail}</span>
                </div>

                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-color)', marginBottom: '0.85rem' }}>
                  {item.formats}
                </div>

                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6', flexGrow: 1, marginBottom: '1.5rem' }}>
                  {item.desc}
                </p>

                <Link to="/contact" className="btn btn-secondary" style={{ width: '100%', fontSize: '0.9rem' }}>
                  Cotizar este formato
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Urgency & Carousel Section */}
      <section className="section" style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--glass-border)' }}>
        <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '4rem', alignItems: 'center' }}>
          
          <div style={{ order: 1 }}>
            <Carousel />
          </div>

          <div style={{ order: 2 }}>
            <span className="badge" style={{ marginBottom: '1rem' }}>
              <Clock size={15} /> Preservación Urgente
            </span>
            <h2 style={{ fontSize: 'clamp(2rem, 4vw, 2.75rem)', marginBottom: '1.25rem', lineHeight: 1.15 }}>
              ¿Por qué el tiempo corre contra tus cintas?
            </h2>
            
            <div style={{ background: 'rgba(255, 255, 255, 0.8)', borderLeft: '4px solid var(--accent-color)', padding: '1.15rem 1.25rem', borderRadius: '0 12px 12px 0', marginBottom: '1.75rem' }}>
              <p style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.95rem', margin: 0 }}>
                ⚠️ <strong>Dato técnico:</strong> Las cintas magnéticas fueron fabricadas para durar entre 15 y 20 años. Hoy, la mayoría ya supera los 25 años de antigüedad, acumulando humedad y pérdida de datos.
              </p>
            </div>

            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem', fontSize: '1.05rem', lineHeight: '1.7' }}>
              El aglutinante químico que une las partículas de óxido magnético a la cinta de plástico se degrada naturalmente. Cada año que pasa guardado en un cajón, aumenta el riesgo de que la cinta sea ilegible.
            </p>

            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '1.05rem', lineHeight: '1.7' }}>
              Digitalizarlas hoy garantiza que tus videos queden a salvo en formato digital permanente (MP4) para las próximas generaciones.
            </p>

            <Link to="/contact" className="btn btn-primary" style={{ padding: '0.9rem 2rem' }}>
              Salvar Mis Recuerdos Ahora <ArrowRight size={18} />
            </Link>
          </div>

        </div>
      </section>

      {/* Testimonials Section */}
      <section className="section">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 style={{ fontSize: 'clamp(2rem, 4vw, 2.75rem)', marginBottom: '1rem' }}>
              Historias que volvieron a vivirse
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
              Testimonios de quienes recuperaron momentos invaluables.
            </p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            {[
              { 
                text: "Encontré las cintas de la boda de mis papás de 1991. Lloramos toda la familia al volver a ver a nuestros abuelos sonriendo. La calidad fue mucho mejor de lo que imaginábamos.", 
                author: "Sofía Munguía", 
                city: "Ciudad de México",
                date: "Hace 2 semanas" 
              },
              { 
                text: "El cotizador en línea es súper transparente. Sabía exactamente cuánto iba a pagar antes de mandar el material. Y la entrega en USB quedó impecable.", 
                author: "Alejandro Ruiz", 
                city: "Guadalajara",
                date: "Hace 1 mes" 
              },
              { 
                text: "Tenía 6 cassettes MiniDV de cuando mis hijos eran bebés. El seguimiento por portal y la atención personalizada por WhatsApp me dieron toda la confianza.", 
                author: "Carmen Villalobos", 
                city: "Monterrey",
                date: "Hace 2 meses" 
              }
            ].map((t, i) => (
              <div key={i} className="glass glass-hover" style={{ padding: '2.25rem', position: 'relative', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', gap: '3px', color: '#f59e0b', marginBottom: '1.25rem' }}>
                  {[...Array(5)].map((_, starIndex) => (
                    <Star key={starIndex} size={16} fill="#f59e0b" />
                  ))}
                </div>

                <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: '1.65', marginBottom: '1.75rem', flexGrow: 1, fontStyle: 'italic' }}>
                  "{t.text}"
                </p>

                <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '1rem' }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{t.author}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t.city} • {t.date}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Preview Section */}
      <section className="section" style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--glass-border)' }}>
        <div className="container" style={{ maxWidth: '850px', textAlign: 'center' }}>
          <div style={{ 
            width: '54px', 
            height: '54px', 
            borderRadius: '16px', 
            background: 'var(--accent-light)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            margin: '0 auto 1.5rem auto',
            border: '1px solid rgba(234, 88, 12, 0.2)'
          }}>
            <HelpCircle size={28} className="text-accent" />
          </div>

          <h2 style={{ fontSize: 'clamp(2rem, 4vw, 2.5rem)', marginBottom: '1rem' }}>
            Preguntas Frecuentes
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '3rem', fontSize: '1.05rem' }}>
            Resolvemos tus dudas antes de iniciar tu proceso.
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left', marginBottom: '3rem' }}>
            <div className="glass" style={{ padding: '1.5rem 1.75rem' }}>
              <h4 style={{ fontSize: '1.15rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                ¿Cómo recibo mis videos digitalizados?
              </h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6', margin: 0 }}>
                La entrega se realiza en formato digital MP4 en una memoria USB o Disco Duro que tú nos proporciones (o puedes adquirir una con nosotros). Además, te devolvemos intactas todas tus cintas originales.
              </p>
            </div>

            <div className="glass" style={{ padding: '1.5rem 1.75rem' }}>
              <h4 style={{ fontSize: '1.15rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                ¿Qué pasa si una cinta dura más de 2 horas?
              </h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6', margin: 0 }}>
                El costo base de $200 MXN cubre las primeras 2 horas completas de digitalización. Si la cinta dura más tiempo, cada hora adicional tiene un costo de solo $50 MXN, el cual se reporta transparentemente en tu portal de rastreo.
              </p>
            </div>

            <div className="glass" style={{ padding: '1.5rem 1.75rem' }}>
              <h4 style={{ fontSize: '1.15rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                ¿Mis videos son confidenciales?
              </h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6', margin: 0 }}>
                Absolutamente. Manejamos tu material con estricta confidencialidad profesional. Una vez entregados tus archivos y confirmada tu recepción, los datos temporales son borrados de manera segura de nuestros servidores locales.
              </p>
            </div>
          </div>
          
          <Link to="/faq" className="btn btn-secondary" style={{ padding: '0.8rem 2rem' }}>
            Ver todas las preguntas frecuentes
          </Link>
        </div>
      </section>

      {/* CTA Final Banner */}
      <section className="section" style={{ textAlign: 'center' }}>
        <div className="container">
          <div 
            className="glass" 
            style={{ 
              padding: '4.5rem 2rem', 
              borderRadius: '28px', 
              background: 'linear-gradient(135deg, rgba(234, 88, 12, 0.08) 0%, rgba(251, 249, 245, 0.95) 100%)',
              border: '1px solid rgba(234, 88, 12, 0.2)'
            }}
          >
            <h2 style={{ fontSize: 'clamp(2.2rem, 5vw, 3.2rem)', marginBottom: '1.25rem', letterSpacing: '-0.02em' }}>
              No dejes que tus recuerdos se apaguen.
            </h2>
            <p style={{ fontSize: '1.15rem', color: 'var(--text-secondary)', marginBottom: '2.5rem', maxWidth: '600px', margin: '0 auto 2.5rem auto', lineHeight: '1.7' }}>
              Cotiza en menos de 1 minuto con nuestra calculadora instantánea y obtén tu presupuesto oficial en PDF.
            </p>
            <Link to="/contact" className="btn btn-primary animate-pulse-glow" style={{ padding: '1.15rem 3rem', fontSize: '1.15rem' }}>
              Iniciar Cotización Sin Compromiso <ArrowRight size={20} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
