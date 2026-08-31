import { Link } from 'react-router-dom';
import { Heart, ArrowRight } from 'lucide-react';

const About = () => {
  return (
    <div className="container section animate-on-load">
      <div style={{ maxWidth: '800px', margin: '0 auto 3.5rem auto', textAlign: 'center' }}>
        <span className="badge" style={{ marginBottom: '1rem' }}>
          <Heart size={14} fill="var(--accent-color)" /> Nuestra Misión
        </span>
        <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 3.8rem)', marginBottom: '1.25rem', letterSpacing: '-0.02em' }}>
          Preservamos la <span className="text-gradient">memoria viva</span> de tu familia.
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.15rem', lineHeight: '1.7' }}>
          DigiMemories nació de un descubrimiento personal: al abrir viejas cajas de cartón en un armario, encontramos cintas familiares de hace más de 30 años al borde del olvido y la degradación.
        </p>
      </div>

      <div className="glass" style={{ maxWidth: '850px', margin: '0 auto 4rem auto', padding: '3.5rem 3rem', background: 'rgba(255, 255, 255, 0.96)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          
          <div>
            <h2 style={{ fontSize: '1.6rem', color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
              El valor de lo irrepetible
            </h2>
            <p>
              Una cinta magnética (como VHS, Beta o Hi8) no es solo un objeto retro: es el registro único de los primeros pasos de tus hijos, la risa de abuelos que ya no están, o una boda de hace tres décadas.
            </p>
            <p style={{ marginTop: '0.75rem' }}>
              A diferencia de las fotos impresas, la cinta de video magnética pierde calidad silenciosamente con cada año que pasa. Nuestro compromiso es rescatarla a tiempo con la mayor fidelidad posible.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', margin: '1rem 0' }}>
            <div style={{ padding: '1.5rem', background: 'var(--bg-secondary)', borderRadius: '16px', border: '1px solid rgba(214, 204, 194, 0.6)' }}>
              <div style={{ color: 'var(--accent-color)', fontWeight: 800, fontSize: '2rem', marginBottom: '0.25rem' }}>100%</div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Confidencialidad</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Tus videos son privados y se borran tras tu recepción.</div>
            </div>

            <div style={{ padding: '1.5rem', background: 'var(--bg-secondary)', borderRadius: '16px', border: '1px solid rgba(214, 204, 194, 0.6)' }}>
              <div style={{ color: 'var(--accent-color)', fontWeight: 800, fontSize: '2rem', marginBottom: '0.25rem' }}>1:1</div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Captura en Tiempo Real</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Sin aceleraciones artificiales ni compresión agresiva.</div>
            </div>

            <div style={{ padding: '1.5rem', background: 'var(--bg-secondary)', borderRadius: '16px', border: '1px solid rgba(214, 204, 194, 0.6)' }}>
              <div style={{ color: 'var(--accent-color)', fontWeight: 800, fontSize: '2rem', marginBottom: '0.25rem' }}>MP4</div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Compatibilidad Total</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Listo para reproducir en Smart TV, iPad y celulares.</div>
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Trato artesanal y transparente
            </h3>
            <p>
              No somos un servicio masivo automatizado sin rostro. Cada orden es monitoreada por técnicos dedicados que revisan el material segundo a segundo. Si alguna cinta no puede leerse, te lo informamos con total honestidad y no se cobra esa unidad.
            </p>
          </div>

        </div>
      </div>

      {/* CTA Box */}
      <div style={{ textAlign: 'center' }}>
        <Link to="/contact" className="btn btn-primary" style={{ padding: '1rem 2.5rem', fontSize: '1.1rem' }}>
          Cotizar Mis Cintas <ArrowRight size={18} />
        </Link>
      </div>
    </div>
  );
};

export default About;
