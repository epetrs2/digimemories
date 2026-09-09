import React, { useState, useEffect, useCallback } from 'react';
import './styles/macos.css';
import MacTitleBar from './components/MacTitleBar';
import MacSidebar, { type MacTab } from './components/MacSidebar';
import MacLockScreen from './components/MacLockScreen';
import DesktopChatCenter from './views/DesktopChatCenter';
import DesktopOrderCockpit from './views/DesktopOrderCockpit';
import DesktopAnalyticsHUD from './views/DesktopAnalyticsHUD';
import DesktopEmailOutbox from './views/DesktopEmailOutbox';
import DesktopBusinessSettings from './views/DesktopBusinessSettings';
import DesktopSecurityVault from './views/DesktopSecurityVault';

import { validateAdminSession, destroyAdminSession } from '../lib/security';
import { getOrders, type Order } from '../lib/store';
import { getChatThreads, type ChatThread } from '../lib/chatStore';
import { fetchOrdersFromCloud, fetchChatThreadsFromCloud, initSupabaseRealtimeListeners } from '../lib/supabase';
import { Search, X, Package, MessageSquare } from 'lucide-react';

export const DesktopApp: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => validateAdminSession());
  const [activeTab, setActiveTab] = useState<MacTab>('chat');
  const [orders, setOrders] = useState<Order[]>([]);
  const [chatThreads, setChatThreads] = useState<ChatThread[]>([]);
  const [showSearchModal, setShowSearchModal] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isOnline, setIsOnline] = useState<boolean>(true);

  // Auto-lock idle timer (15 minutes)
  const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
  const lastActivityRef = React.useRef<number>(Date.now());

  const handleUserActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('click', handleUserActivity);

    const idleCheckInterval = setInterval(() => {
      if (isAuthenticated && Date.now() - lastActivityRef.current > IDLE_TIMEOUT_MS) {
        destroyAdminSession();
        setIsAuthenticated(false);
      }
    }, 15000);

    return () => {
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('click', handleUserActivity);
      clearInterval(idleCheckInterval);
    };
  }, [isAuthenticated, handleUserActivity]);

  // Load Realtime Data from cache & update Dock
  const refreshData = useCallback(() => {
    const fetchedOrders = getOrders();
    const fetchedChats = getChatThreads();
    setOrders(fetchedOrders);
    setChatThreads(fetchedChats);

    // Update Dock Badge in Electron
    const totalUnreadChats = fetchedChats.reduce((acc, t) => acc + (t.unreadByAdmin || 0), 0);
    const activeOrdersCount = fetchedOrders.filter(o => !o.isArchived && o.status !== 'completada').length;
    const totalBadge = totalUnreadChats + (activeOrdersCount > 0 ? 1 : 0);

    if (typeof window !== 'undefined' && (window as any).macOSAdminApi?.setDockBadge) {
      (window as any).macOSAdminApi.setDockBadge(totalBadge > 0 ? String(totalBadge) : '');
    }
  }, []);

  // 100% Direct Cloud Sync with Supabase Database
  const syncWithCloud = useCallback(async () => {
    try {
      const [cloudOrders, cloudChats] = await Promise.all([
        fetchOrdersFromCloud(),
        fetchChatThreadsFromCloud()
      ]);

      if (cloudOrders) {
        localStorage.setItem('digimemories_orders_mock', JSON.stringify(cloudOrders));
        setOrders(cloudOrders);
      }
      if (cloudChats) {
        localStorage.setItem('digimemories_chat_threads_v3', JSON.stringify(cloudChats));
        setChatThreads(cloudChats);
      }
      setIsOnline(true);
    } catch (e) {
      console.warn('[DesktopApp] Supabase Cloud sync warning:', e);
      setIsOnline(false);
    }
  }, []);

  useEffect(() => {
    initSupabaseRealtimeListeners();
    refreshData();
    syncWithCloud();

    const localInterval = setInterval(refreshData, 3000);
    const cloudInterval = setInterval(syncWithCloud, 6000);

    window.addEventListener('digimemories_orders_sync', refreshData);
    window.addEventListener('digimemories_chat_sync', refreshData);
    window.addEventListener('online', () => { setIsOnline(true); syncWithCloud(); });
    window.addEventListener('offline', () => setIsOnline(false));

    return () => {
      clearInterval(localInterval);
      clearInterval(cloudInterval);
      window.removeEventListener('digimemories_orders_sync', refreshData);
      window.removeEventListener('digimemories_chat_sync', refreshData);
    };
  }, [refreshData, syncWithCloud]);


  // Keyboard Shortcuts (Cmd+1..6, Cmd+L, Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
        if (e.key === '1') { e.preventDefault(); setActiveTab('chat'); }
        else if (e.key === '2') { e.preventDefault(); setActiveTab('orders'); }
        else if (e.key === '3') { e.preventDefault(); setActiveTab('analytics'); }
        else if (e.key === '4') { e.preventDefault(); setActiveTab('emails'); }
        else if (e.key === '5') { e.preventDefault(); setActiveTab('business'); }
        else if (e.key === '6') { e.preventDefault(); setActiveTab('security'); }
        else if (e.key === 'l' || e.key === 'L') {
          e.preventDefault();
          destroyAdminSession();
          setIsAuthenticated(false);
        }
        else if (e.key === 'k' || e.key === 'K') {
          e.preventDefault();
          setShowSearchModal(prev => !prev);
        }
      }
      if (e.key === 'Escape' && showSearchModal) {
        setShowSearchModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Native macOS Menu Bar Listener (from electron preload)
    if (typeof window !== 'undefined' && (window as any).macOSAdminApi?.onMenuAction) {
      const unsubscribe = (window as any).macOSAdminApi.onMenuAction((action: string) => {
        if (action === 'lock_screen') {
          destroyAdminSession();
          setIsAuthenticated(false);
        } else if (action === 'quick_search') {
          setShowSearchModal(true);
        } else if (action === 'nav_chat') setActiveTab('chat');
        else if (action === 'nav_orders') setActiveTab('orders');
        else if (action === 'nav_analytics') setActiveTab('analytics');
        else if (action === 'nav_emails') setActiveTab('emails');
        else if (action === 'nav_business') setActiveTab('business');
        else if (action === 'nav_security') setActiveTab('security');
      });
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        if (typeof unsubscribe === 'function') unsubscribe();
      };
    }

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSearchModal]);

  const handleLock = () => {
    destroyAdminSession();
    setIsAuthenticated(false);
  };

  const unreadChatsCount = chatThreads.reduce((acc, t) => acc + (t.unreadByAdmin || 0), 0);
  const urgentChatsCount = chatThreads.filter(t => t.needsHumanAttention && t.status === 'active').length;
  const activeOrdersCount = orders.filter(o => !o.isArchived && o.status !== 'completada').length;

  // Search Results for Spotlight Modal
  const searchResults = searchQuery.trim() ? {
    orders: orders.filter(o => 
      o.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
      o.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.clientEmail.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 5),
    chats: chatThreads.filter(t => 
      t.visitorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.visitorEmail && t.visitorEmail.toLowerCase().includes(searchQuery.toLowerCase()))
    ).slice(0, 5)
  } : null;

  return (
    <div className="mac-app-container">
      {/* 1. TOP TITLEBAR */}
      <MacTitleBar 
        isLocked={!isAuthenticated}
        onLock={handleLock}
        onQuickSearch={() => setShowSearchModal(true)}
        isOnline={isOnline}
      />

      {/* 2. MAIN WORKSTATION BODY */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left Sidebar */}
        <MacSidebar 
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          unreadChats={unreadChatsCount}
          attentionChats={urgentChatsCount}
          activeOrders={activeOrdersCount}
        />

        {/* Center/Right Dynamic View */}
        <main style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
          {activeTab === 'chat' && <DesktopChatCenter />}
          {activeTab === 'orders' && <DesktopOrderCockpit />}
          {activeTab === 'analytics' && <DesktopAnalyticsHUD />}
          {activeTab === 'emails' && <DesktopEmailOutbox />}
          {activeTab === 'business' && <DesktopBusinessSettings />}
          {activeTab === 'security' && <DesktopSecurityVault />}
        </main>
      </div>

      {/* 3. MAC LOCK SCREEN MODAL */}
      {!isAuthenticated && (
        <MacLockScreen onUnlock={() => setIsAuthenticated(true)} />
      )}

      {/* 4. APPLE SPOTLIGHT SEARCH MODAL (Cmd + K) */}
      {showSearchModal && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 90,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: '12vh'
          }}
          onClick={() => setShowSearchModal(false)}
        >
          <div 
            className="mac-glass-panel"
            style={{
              width: '580px',
              borderRadius: '16px',
              padding: '1rem',
              boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
              border: '1px solid rgba(255, 255, 255, 0.15)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.5rem 0.75rem 0.5rem', borderBottom: '1px solid var(--mac-border)' }}>
              <Search size={18} style={{ color: 'var(--mac-accent)' }} />
              <input 
                type="text"
                placeholder="Buscar órdenes, clientes, casetes o chats..."
                className="mac-input"
                style={{ flex: 1, border: 'none', background: 'transparent', fontSize: '1rem', padding: 0 }}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                autoFocus
              />
              <button 
                onClick={() => setShowSearchModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--mac-text-muted)', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Results */}
            <div style={{ maxHeight: '340px', overflowY: 'auto', padding: '0.75rem 0' }}>
              {searchResults ? (
                <div>
                  {searchResults.orders.length > 0 && (
                    <div style={{ marginBottom: '1rem' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--mac-text-muted)', padding: '0 0.5rem' }}>
                        Órdenes Encontradas
                      </span>
                      {searchResults.orders.map(o => (
                        <div 
                          key={o.id}
                          onClick={() => {
                            setActiveTab('orders');
                            setShowSearchModal(false);
                          }}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '0.6rem 0.75rem',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'background 0.1s ease'
                          }}
                          className="mac-card"
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Package size={15} style={{ color: 'var(--mac-accent)' }} />
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f5f5f4' }}>
                              #{o.id} — {o.clientName}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--mac-text-muted)' }}>
                            {o.items?.length || 0} casetes
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {searchResults.chats.length > 0 && (
                    <div>
                      <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--mac-text-muted)', padding: '0 0.5rem' }}>
                        Chats Encontrados
                      </span>
                      {searchResults.chats.map(t => (
                        <div 
                          key={t.id}
                          onClick={() => {
                            setActiveTab('chat');
                            setShowSearchModal(false);
                          }}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '0.6rem 0.75rem',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            marginTop: '0.3rem'
                          }}
                          className="mac-card"
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <MessageSquare size={15} style={{ color: '#10b981' }} />
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f5f5f4' }}>
                              {t.visitorName}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--mac-text-muted)' }}>
                            {t.messages?.length || 0} mensajes
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {searchResults.orders.length === 0 && searchResults.chats.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--mac-text-muted)', fontSize: '0.85rem' }}>
                      No se encontraron resultados para "{searchQuery}".
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--mac-text-muted)', fontSize: '0.8rem' }}>
                  Escribe un número de orden, nombre de cliente o correo para buscar al instante.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DesktopApp;
