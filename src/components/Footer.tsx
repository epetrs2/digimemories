import { Film } from 'lucide-react';

const Footer = () => {
  return (
    <footer style={{ borderTop: '1px solid var(--glass-border)', padding: '4rem 0 2rem 0', marginTop: '4rem' }}>
      <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Film className="text-accent" size={24} />
          <span style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.25rem' }}>DigiMemories</span>
        </div>
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', maxWidth: '400px' }}>
          Rescatando tus recuerdos más preciados en formatos analógicos para las futuras generaciones.
        </p>
        <div style={{ width: '100%', height: '1px', background: 'var(--glass-border)', margin: '1rem 0' }}></div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          © {new Date().getFullYear()} DigiMemories. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
