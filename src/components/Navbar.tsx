import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Film, Menu, X, ArrowRight } from 'lucide-react';
import { destroyAdminSession } from '../lib/security';

const Navbar = () => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { path: '/', label: 'Inicio' },
    { path: '/process', label: 'Proceso' },
    { path: '/contacto', label: 'Contacto' },
    { path: '/about', label: 'Quiénes Somos' },
    { path: '/faq', label: 'Preguntas' },
    { path: '/track', label: 'Rastrear Orden' }
  ];

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const handleNavClick = () => {
    setMobileMenuOpen(false);
    if (location.pathname.startsWith('/admin')) {
      destroyAdminSession();
    }
  };

  return (
    <nav className="glass-nav" style={{ position: 'sticky', top: 0, zIndex: 100 }}>
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '76px' }}>
        {/* Logo */}
        <Link 
          to="/" 
          onClick={handleNavClick}
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
        <div style={{ display: 'none', gap: '1.5rem', alignItems: 'center' }} className="md-flex nav-links-desktop">
          {navLinks.map((link) => {
            const active = isActive(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={handleNavClick}
                style={{
                  textDecoration: 'none',
                  color: active ? 'var(--accent-color)' : 'var(--text-secondary)',
                  fontWeight: active ? 700 : 500,
                  fontSize: '0.95rem',
                  position: 'relative',
                  padding: '0.5rem 0',
                  transition: 'color var(--transition-fast)'
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
          <Link to="/contact" onClick={handleNavClick} className="btn btn-primary" style={{ padding: '0.65rem 1.35rem', fontSize: '0.95rem' }}>
            Cotizar Cintas <ArrowRight size={16} />
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
              onClick={handleNavClick}
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
            onClick={handleNavClick}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.5rem' }}
          >
            Cotizar Cintas Ahora
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
