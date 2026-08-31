import { Link } from 'react-router-dom';
import { Film, ShieldCheck } from 'lucide-react';

const Footer = () => {
  return (
    <footer style={{ borderTop: '1px solid var(--glass-border)', padding: '4rem 0 2.5rem 0', marginTop: '4rem', background: '#faf8f5' }}>
      <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'var(--accent-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(234, 88, 12, 0.2)'
          }}>
            <Film className="text-accent" size={20} />
          </div>
          <span style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.35rem' }}>DigiMemories</span>
        </div>

        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', maxWidth: '450px', margin: 0, fontSize: '0.95rem' }}>
          Taller especializado en rescate y preservación digital de formatos analógicos (VHS, Beta, 8mm, fotos y discos).
        </p>

        {/* Quick Links Navigation */}
        <div style={{
          display: 'flex',
          gap: '1.5rem',
          flexWrap: 'wrap',
          justifyContent: 'center',
          fontSize: '0.9rem',
          fontWeight: 600,
          margin: '0.5rem 0'
        }}>
          <Link to="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Inicio</Link>
          <Link to="/process" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Proceso</Link>
          <Link to="/track" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Rastrear Orden</Link>
          <Link to="/faq" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Preguntas Frecuentes</Link>
          <Link to="/contact" style={{ color: 'var(--accent-color)', textDecoration: 'none' }}>Cotizador</Link>
          <Link 
            to="/admin" 
            style={{ 
              color: 'var(--text-muted)', 
              textDecoration: 'none', 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.3rem',
              background: '#f5f3ef',
              padding: '0.2rem 0.6rem',
              borderRadius: '6px',
              border: '1px solid #e7e2d9'
            }}
          >
            <ShieldCheck size={14} className="text-accent" />
            Acceso Administrador
          </Link>
        </div>

        <div style={{ width: '100%', height: '1px', background: 'var(--glass-border)', margin: '0.5rem 0' }}></div>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.825rem', margin: 0 }}>
          © {new Date().getFullYear()} DigiMemories. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
