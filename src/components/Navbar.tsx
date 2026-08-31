import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Film, Menu, X, ArrowRight, ShieldCheck } from 'lucide-react';

const Navbar = () => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { path: '/', label: 'Inicio' },
    { path: '/process', label: 'Proceso' },
    { path: '/about', label: 'Quiénes Somos' },
    { path: '/faq', label: 'Preguntas' },
    { path: '/track', label: 'Rastrear Orden' }
  ];

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <nav className="glass-nav" style={{ position: 'sticky', top: 0, zIndex: 100 }}>
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '76px' }}>
        {/* Logo */}
        <Link 
          to="/" 
          onClick={() => setMobileMenuOpen(false)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', textDecoration: 'none', color: 'var(--text-primary)' }}
        >
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'var(--accent-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(234, 88, 12, 0.2)'
          }}>
            <Film className="text-accent" size={22} />
          </div>
          <div>
            <span style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.02em', display: 'block', lineHeight: 1.1 }}>
              DigiMemories
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.02em' }}>
              Preservación Analógica
            </span>
          </div>
        </Link>

        {/* Desktop Links */}
        <div style={{ display: 'none', gap: '2rem', alignItems: 'center' }} className="md-flex">
          {navLinks.map((link) => {
            const active = isActive(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                style={{
                  textDecoration: 'none',
                  fontWeight: active ? 600 : 500,
                  fontSize: '0.95rem',
                  color: active ? 'var(--accent-color)' : 'var(--text-secondary)',
                  position: 'relative',
                  padding: '0.35rem 0',
                  transition: 'color 0.2s ease'
                }}
              >
                {link.label}
                {active && (
                  <span
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: '2px',
                      background: 'var(--accent-color)',
                      borderRadius: '2px'
                    }}
                  />
                )}
              </Link>
            );
          })}
          <Link to="/contact" className="btn btn-primary" style={{ padding: '0.65rem 1.35rem', fontSize: '0.95rem' }}>
            Cotizar Cintas <ArrowRight size={16} />
          </Link>
          <Link 
            to="/admin" 
            title="Portal de Operadores & Administración"
            className="btn btn-secondary" 
            style={{ 
              padding: '0.6rem 0.95rem', 
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              borderRadius: '12px',
              border: '1px solid rgba(214, 204, 194, 0.8)'
            }}
          >
            <ShieldCheck size={16} className="text-accent" />
            <span>Admin</span>
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="btn btn-ghost"
          style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          aria-label="Abrir menú"
        >
          {mobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div 
          className="glass animate-on-load"
          style={{
            margin: '0.5rem 1rem 1rem 1rem',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            boxShadow: 'var(--shadow-lg)'
          }}
        >
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setMobileMenuOpen(false)}
              style={{
                textDecoration: 'none',
                fontWeight: isActive(link.path) ? 700 : 500,
                fontSize: '1.05rem',
                color: isActive(link.path) ? 'var(--accent-color)' : 'var(--text-primary)',
                padding: '0.5rem 0',
                borderBottom: '1px solid rgba(0, 0, 0, 0.05)'
              }}
            >
              {link.label}
            </Link>
          ))}
          <Link
            to="/contact"
            onClick={() => setMobileMenuOpen(false)}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.5rem' }}
          >
            Cotizar Cintas Ahora
          </Link>
          <Link
            to="/admin"
            onClick={() => setMobileMenuOpen(false)}
            className="btn btn-secondary"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            <ShieldCheck size={16} className="text-accent" />
            Acceso Administrativo / Taller
          </Link>
        </div>
      )}

      {/* Responsive media helper in CSS */}
      <style>{`
        @media (min-width: 860px) {
          .md-flex { display: flex !important; }
          button[aria-label="Abrir menú"] { display: none !important; }
        }
      `}</style>
    </nav>
  );
};

export default Navbar;
