import React from 'react';
import { 
  MessageSquare, 
  Package, 
  BarChart3, 
  Mail, 
  Settings, 
  ShieldCheck, 
  Sparkles
} from 'lucide-react';

export type MacTab = 'chat' | 'orders' | 'analytics' | 'emails' | 'business' | 'security';

interface MacSidebarProps {
  activeTab: MacTab;
  onSelectTab: (tab: MacTab) => void;
  unreadChats: number;
  attentionChats: number;
  activeOrders: number;
}

export const MacSidebar: React.FC<MacSidebarProps> = ({
  activeTab,
  onSelectTab,
  unreadChats,
  attentionChats,
  activeOrders
}) => {
  const navItems: Array<{
    id: MacTab;
    label: string;
    icon: React.ReactNode;
    shortcut: string;
    badge?: number;
    badgeColor?: string;
    alertBadge?: number;
  }> = [
    {
      id: 'chat',
      label: 'Atención & Chats',
      icon: <MessageSquare size={17} />,
      shortcut: '⌘1',
      badge: unreadChats,
      badgeColor: '#ea580c',
      alertBadge: attentionChats
    },
    {
      id: 'orders',
      label: 'Laboratorio & Órdenes',
      icon: <Package size={17} />,
      shortcut: '⌘2',
      badge: activeOrders,
      badgeColor: '#10b981'
    },
    {
      id: 'analytics',
      label: 'Métricas & Tráfico',
      icon: <BarChart3 size={17} />,
      shortcut: '⌘3'
    },
    {
      id: 'emails',
      label: 'Bandeja de Correos',
      icon: <Mail size={17} />,
      shortcut: '⌘4'
    },
    {
      id: 'business',
      label: 'Configuración Negocio',
      icon: <Settings size={17} />,
      shortcut: '⌘5'
    },
    {
      id: 'security',
      label: 'Bóveda & Touch ID',
      icon: <ShieldCheck size={17} />,
      shortcut: '⌘6'
    }
  ];

  return (
    <aside
      style={{
        width: '260px',
        height: 'calc(100vh - 48px)',
        background: 'var(--mac-bg-sidebar)',
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        borderRight: '1px solid var(--mac-border)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '1.25rem 0.85rem',
        flexShrink: 0
      }}
    >
      {/* Navigation Group */}
      <div>
        <div style={{ 
          fontSize: '0.68rem', 
          fontWeight: 800, 
          textTransform: 'uppercase', 
          letterSpacing: '0.08em', 
          color: 'var(--mac-text-muted)', 
          padding: '0 0.6rem 0.6rem 0.6rem' 
        }}>
          Estación Administrativa
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          {navItems.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '10px',
                  border: 'none',
                  background: isActive 
                    ? 'linear-gradient(135deg, rgba(234, 88, 12, 0.22) 0%, rgba(249, 115, 22, 0.12) 100%)' 
                    : 'transparent',
                  color: isActive ? '#ffffff' : 'var(--mac-text-secondary)',
                  cursor: 'pointer',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.86rem',
                  transition: 'all 0.15s ease',
                  outline: 'none',
                  boxShadow: isActive ? 'inset 0 0 0 1px rgba(234, 88, 12, 0.35)' : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <span style={{ color: isActive ? 'var(--mac-accent)' : 'var(--mac-text-muted)', display: 'flex' }}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {item.alertBadge && item.alertBadge > 0 ? (
                    <span style={{
                      background: '#ef4444',
                      color: '#ffffff',
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      padding: '0.1rem 0.4rem',
                      borderRadius: '999px',
                      boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)'
                    }} title="Requiere atención humana">
                      !
                    </span>
                  ) : null}

                  {item.badge && item.badge > 0 ? (
                    <span style={{
                      background: item.badgeColor || 'var(--mac-accent)',
                      color: '#ffffff',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      padding: '0.1rem 0.45rem',
                      borderRadius: '999px',
                      minWidth: '18px',
                      textAlign: 'center'
                    }}>
                      {item.badge}
                    </span>
                  ) : null}

                  <kbd style={{ 
                    fontSize: '0.65rem', 
                    color: isActive ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.2)',
                    fontWeight: 600
                  }}>
                    {item.shortcut}
                  </kbd>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Live Laboratory Status Pill */}
      <div 
        className="mac-card" 
        style={{ 
          padding: '0.85rem', 
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.07)',
          borderRadius: '12px' 
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
          <Sparkles size={14} style={{ color: 'var(--mac-accent)' }} />
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#f5f5f4' }}>
            Laboratorio DigiMemories
          </span>
        </div>
        <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--mac-text-muted)', lineHeight: 1.4 }}>
          {activeOrders} órdenes activas en cola de digitalización. Sincronización continua con clientes.
        </p>
      </div>
    </aside>
  );
};

export default MacSidebar;
