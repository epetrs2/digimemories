import React from 'react';
import { Shield, Lock, Search, Sun, Moon, Laptop } from 'lucide-react';

interface MacTitleBarProps {
  isLocked: boolean;
  onLock: () => void;
  onQuickSearch: () => void;
  isOnline: boolean;
  themePreference: 'system' | 'dark' | 'light';
  onThemeChange: (theme: 'system' | 'dark' | 'light') => void;
}

export const MacTitleBar: React.FC<MacTitleBarProps> = ({
  isLocked,
  onLock,
  onQuickSearch,
  isOnline,
  themePreference,
  onThemeChange
}) => {
  const isElectron = typeof window !== 'undefined' && Boolean((window as any).macOSAdminApi?.isElectron);

  return (
    <header 
      className="mac-drag-region"
      style={{
        height: '48px',
        background: 'var(--mac-bg-surface)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--mac-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1rem',
        paddingLeft: isElectron ? '84px' : '1.25rem', // Traffic lights offset on macOS
        zIndex: 50,
        flexShrink: 0
      }}
    >
      {/* Center Left: App Title & Branch */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--mac-text-primary)', letterSpacing: '-0.01em' }}>
            DigiMemories
          </span>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--mac-text-muted)' }}>
            Estación de Trabajo macOS
          </span>
        </div>

        {/* Realtime Status Indicator */}
        <div 
          className={isOnline ? "mac-badge-emerald" : "mac-badge-amber"}
          style={{ fontSize: '0.68rem', padding: '0.15rem 0.5rem' }}
          title={isOnline ? "Conectado a Supabase Cloud en tiempo real" : "Reconectando con la nube..."}
        >
          <span style={{ 
            width: '6px', 
            height: '6px', 
            borderRadius: '50%', 
            background: isOnline ? '#10b981' : '#f59e0b',
            boxShadow: isOnline ? '0 0 8px #10b981' : 'none'
          }}></span>
          <span>{isOnline ? 'Supabase En Línea' : 'Sincronizando'}</span>
        </div>
      </div>

      {/* Center Right: Quick Search & Lock Controls */}
      <div className="mac-no-drag" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
        {/* Quick Search Button */}
        {!isLocked && (
          <button
            onClick={onQuickSearch}
            className="mac-btn-secondary"
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', height: '30px' }}
            title="Buscar órdenes, clientes o casetes (Cmd + K)"
          >
            <Search size={14} style={{ color: 'var(--mac-accent)' }} />
            <span style={{ color: 'var(--mac-text-secondary)' }}>Buscar...</span>
            <kbd style={{ 
              fontSize: '0.65rem', 
              background: 'rgba(255, 255, 255, 0.1)', 
              padding: '0.1rem 0.35rem', 
              borderRadius: '4px',
              color: '#d6d3d1'
            }}>
              ⌘K
            </kbd>
          </button>
        )}

        {/* Lock Screen Button */}
        {!isLocked && (
          <button
            onClick={onLock}
            className="mac-btn-secondary"
            style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem', height: '30px', color: '#fb923c' }}
            title="Bloquear sesión inmediatamente (Cmd + L)"
          >
            <Lock size={13} />
            <span>Bloquear</span>
            <kbd style={{ 
              fontSize: '0.65rem', 
              background: 'rgba(255, 255, 255, 0.1)', 
              padding: '0.1rem 0.35rem', 
              borderRadius: '4px',
              color: '#d6d3d1'
            }}>
              ⌘L
            </kbd>
          </button>
        )}

        {/* Theme Selector Widget */}
        <div style={{
          display: 'flex',
          background: 'rgba(255, 255, 255, 0.08)',
          borderRadius: '8px',
          padding: '2px',
          border: '1px solid var(--mac-border)',
          height: '28px',
          alignItems: 'center'
        }}>
          <button
            type="button"
            onClick={() => onThemeChange('system')}
            style={{
              background: themePreference === 'system' ? 'var(--mac-accent)' : 'transparent',
              color: themePreference === 'system' ? '#ffffff' : 'var(--mac-text-muted)',
              border: 'none',
              borderRadius: '6px',
              padding: '0.2rem 0.45rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: '0.72rem',
              fontWeight: 700
            }}
            title="Tema Automático según el Sistema macOS"
          >
            <Laptop size={12} /> Auto
          </button>

          <button
            type="button"
            onClick={() => onThemeChange('dark')}
            style={{
              background: themePreference === 'dark' ? 'var(--mac-accent)' : 'transparent',
              color: themePreference === 'dark' ? '#ffffff' : 'var(--mac-text-muted)',
              border: 'none',
              borderRadius: '6px',
              padding: '0.2rem 0.45rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: '0.72rem',
              fontWeight: 700
            }}
            title="Modo Oscuro"
          >
            <Moon size={12} />
          </button>

          <button
            type="button"
            onClick={() => onThemeChange('light')}
            style={{
              background: themePreference === 'light' ? 'var(--mac-accent)' : 'transparent',
              color: themePreference === 'light' ? '#ffffff' : 'var(--mac-text-muted)',
              border: 'none',
              borderRadius: '6px',
              padding: '0.2rem 0.45rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: '0.72rem',
              fontWeight: 700
            }}
            title="Modo Claro"
          >
            <Sun size={12} />
          </button>
        </div>

        <div style={{
          width: '28px',
          height: '28px',
          borderRadius: '8px',
          background: 'rgba(234, 88, 12, 0.15)',
          border: '1px solid rgba(234, 88, 12, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--mac-accent)'
        }}>
          <Shield size={14} />
        </div>
      </div>
    </header>
  );
};

export default MacTitleBar;
