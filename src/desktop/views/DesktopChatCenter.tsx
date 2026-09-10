import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Bot, 
  Phone, 
  Mail, 
  Clock, 
  Search, 
  Volume2, 
  VolumeX, 
  UserCheck, 
  Trash2, 
  MapPin, 
  Radio, 
  Zap, 
  Eye
} from 'lucide-react';
import { 
  getChatThreads, 
  addMessageToThread, 
  setThreadMode, 
  markThreadAsReadByAdmin, 
  deleteChatThread, 
  type ChatThread 
} from '../../lib/chatStore';
import { 
  subscribeToVisitorPresence, 
  type LiveVisitorPresence 
} from '../../lib/visitorPresence';

export const DesktopChatCenter: React.FC = () => {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'online' | 'urgent' | 'unread'>('all');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Live presence state & auto-cleanup
  const [activeVisitors, setActiveVisitors] = useState<LiveVisitorPresence[]>([]);
  const [autoCleanupOnDisconnect, setAutoCleanupOnDisconnect] = useState<boolean>(true);
  const [lastCleanedNotice, setLastCleanedNotice] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const playChime = () => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.12); // A5
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    } catch {}
  };

  const loadThreads = () => {
    const fetched = getChatThreads();
    setThreads(fetched);

    // Update Dock Badge if on Electron
    const totalUnread = fetched.reduce((acc, t) => acc + (t.unreadByAdmin || 0), 0);
    if (typeof window !== 'undefined' && (window as any).macOSAdminApi?.setDockBadge) {
      (window as any).macOSAdminApi.setDockBadge(totalUnread > 0 ? String(totalUnread) : '');
    }
  };

  // Helper to match a thread with live visitor presence
  const getVisitorForThread = (thread: ChatThread): LiveVisitorPresence | undefined => {
    return activeVisitors.find(v => 
      v.chatThreadId === thread.id || 
      thread.id.includes(v.visitorId) || 
      (v.visitorId && v.visitorId !== 'server' && thread.visitorName.includes(v.visitorId))
    );
  };

  const isThreadOnline = (thread: ChatThread): boolean => {
    if (thread.id.startsWith('demo-')) return true;
    return Boolean(getVisitorForThread(thread));
  };

  // Subscribe to live visitor presence & handle automatic cleanup on disconnect
  useEffect(() => {
    const unsubscribe = subscribeToVisitorPresence((visitors) => {
      setActiveVisitors(visitors);

      if (autoCleanupOnDisconnect) {
        const currentThreads = getChatThreads();
        const realVisitorThreads = currentThreads.filter(t => t.id.startsWith('visitor-'));

        realVisitorThreads.forEach(async (t) => {
          const isOnline = visitors.some(v => 
            v.chatThreadId === t.id || 
            t.id.includes(v.visitorId) || 
            (v.visitorId && v.visitorId !== 'server' && t.visitorName.includes(v.visitorId))
          );

          if (!isOnline) {
            // Visitor disconnected: automatically close and delete the thread
            await deleteChatThread(t.id);
            setLastCleanedNotice(`⚡ Chat con "${t.visitorName}" cerrado y eliminado automáticamente al desconectarse.`);
            loadThreads();
            if (selectedThreadId === t.id) {
              setSelectedThreadId(null);
            }
          }
        });
      }
    });

    return () => unsubscribe();
  }, [autoCleanupOnDisconnect, selectedThreadId]);

  // Initial load and periodic sync
  useEffect(() => {
    loadThreads();
    const interval = setInterval(loadThreads, 15000);
    const handleSync = () => {
      loadThreads();
      playChime();
    };
    window.addEventListener('digimemories_chat_sync', handleSync);

    return () => {
      clearInterval(interval);
      window.removeEventListener('digimemories_chat_sync', handleSync);
    };
  }, [soundEnabled]);

  // Auto-dismiss cleanup notice
  useEffect(() => {
    if (lastCleanedNotice) {
      const timer = setTimeout(() => setLastCleanedNotice(null), 5500);
      return () => clearTimeout(timer);
    }
  }, [lastCleanedNotice]);

  const selectedThread = threads.find(t => t.id === selectedThreadId) || threads[0] || null;
  const currentVisitor = selectedThread ? getVisitorForThread(selectedThread) : undefined;
  const isCurrentOnline = selectedThread ? isThreadOnline(selectedThread) : false;

  useEffect(() => {
    if (selectedThread && selectedThread.unreadByAdmin > 0) {
      markThreadAsReadByAdmin(selectedThread.id);
      loadThreads();
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedThreadId, selectedThread?.messages?.length]);

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedThread || !replyText.trim()) return;

    addMessageToThread(selectedThread.id, 'admin', replyText.trim(), 'Operador de Laboratorio');
    setReplyText('');
    loadThreads();
  };

  const handleToggleMode = () => {
    if (!selectedThread) return;
    const nextMode = selectedThread.mode === 'bot' ? 'human' : 'bot';
    setThreadMode(selectedThread.id, nextMode);
    loadThreads();
  };

  const handleDeleteThread = async (threadId?: string) => {
    const idToDelete = threadId || selectedThread?.id;
    if (!idToDelete) return;
    const target = threads.find(t => t.id === idToDelete);
    const targetName = target ? target.visitorName : 'esta conversación';
    if (window.confirm(`¿Estás seguro de eliminar permanentemente la conversación con "${targetName}"? Se borrará de la aplicación y de Supabase Cloud.`)) {
      await deleteChatThread(idToDelete);
      const remaining = threads.filter(t => t.id !== idToDelete);
      setThreads(remaining);
      if (selectedThreadId === idToDelete) {
        setSelectedThreadId(remaining.length > 0 ? remaining[0].id : null);
      }
    }
  };

  const filteredThreads = threads.filter(t => {
    const online = isThreadOnline(t);
    if (filter === 'online') return online;
    if (filter === 'urgent') return t.needsHumanAttention && t.status === 'active';
    if (filter === 'unread') return t.unreadByAdmin > 0;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        t.visitorName.toLowerCase().includes(q) ||
        (t.visitorEmail && t.visitorEmail.toLowerCase().includes(q)) ||
        t.messages.some(m => m.text.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const onlineCount = threads.filter(t => isThreadOnline(t)).length;
  const urgentCount = threads.filter(t => t.needsHumanAttention && t.status === 'active').length;
  const unreadCount = threads.filter(t => t.unreadByAdmin > 0).length;

  const cannedReplies = [
    '¡Hola! Con gusto podemos cotizar y revisar tus cintas en el laboratorio.',
    'El tiempo promedio de digitalización es de 3 a 5 días hábiles.',
    'Contamos con recolección y entrega a domicilio segura.',
    '¿Cuántas cintas o fotografías tienes aproximadamente?',
    'Te comparto los detalles del depósito para iniciar tu orden.'
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: 'calc(100vh - 48px)', overflow: 'hidden' }}>
      
      {/* Realtime Disconnect Notification Bar */}
      {lastCleanedNotice && (
        <div style={{
          background: 'linear-gradient(90deg, #ea580c 0%, #c2410c 100%)',
          color: '#ffffff',
          padding: '0.45rem 1.25rem',
          fontSize: '0.78rem',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          zIndex: 50
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Zap size={14} />
            <span>{lastCleanedNotice}</span>
          </div>
          <button
            onClick={() => setLastCleanedNotice(null)}
            style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', fontSize: '0.85rem' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Main 3-Column Layout */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* 1. LEFT COLUMN: CONVERSATIONS LIST */}
        <div style={{
          width: '340px',
          borderRight: '1px solid var(--mac-border)',
          background: 'var(--mac-bg-sidebar)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0
        }}>
          
          {/* Header Controls */}
          <div style={{ padding: '0.9rem 1rem', borderBottom: '1px solid var(--mac-border)', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--mac-text-primary)' }}>
                  Atención a Clientes
                </span>
                <span style={{
                  fontSize: '0.68rem',
                  padding: '0.15rem 0.45rem',
                  borderRadius: '999px',
                  background: 'rgba(234, 88, 12, 0.2)',
                  color: '#fdba74',
                  fontWeight: 800
                }}>
                  {threads.length}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                {/* Auto Cleanup Toggle */}
                <button
                  type="button"
                  onClick={() => setAutoCleanupOnDisconnect(!autoCleanupOnDisconnect)}
                  style={{
                    background: autoCleanupOnDisconnect ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid',
                    borderColor: autoCleanupOnDisconnect ? 'rgba(16, 185, 129, 0.4)' : 'var(--mac-border)',
                    color: autoCleanupOnDisconnect ? '#34d399' : 'var(--mac-text-muted)',
                    padding: '0.2rem 0.45rem',
                    borderRadius: '6px',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                  title={autoCleanupOnDisconnect ? 'Auto-limpieza de chats desconectados ACTIVA: se cierran y borran cuando el usuario sale' : 'Auto-limpieza pausada'}
                >
                  <Zap size={11} />
                  <span>Auto-cierre: {autoCleanupOnDisconnect ? 'ON' : 'OFF'}</span>
                </button>

                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  style={{ background: 'none', border: 'none', color: soundEnabled ? 'var(--mac-accent)' : 'var(--mac-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.2rem' }}
                  title={soundEnabled ? 'Silenciar sonido' : 'Activar sonido de notificación'}
                >
                  {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
                </button>
              </div>
            </div>

            {/* Search Box */}
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--mac-text-muted)' }} />
              <input 
                type="text"
                placeholder="Buscar por visitante o mensaje..."
                className="mac-input"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ width: '100%', paddingLeft: '2rem', fontSize: '0.78rem', boxSizing: 'border-box' }}
              />
            </div>

            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => setFilter('all')}
                style={{
                  background: filter === 'all' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                  color: filter === 'all' ? '#ffffff' : 'var(--mac-text-secondary)',
                  border: 'none',
                  padding: '0.22rem 0.5rem',
                  borderRadius: '6px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Todas ({threads.length})
              </button>
              <button
                onClick={() => setFilter('online')}
                style={{
                  background: filter === 'online' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                  color: filter === 'online' ? '#6ee7b7' : 'var(--mac-text-secondary)',
                  border: 'none',
                  padding: '0.22rem 0.5rem',
                  borderRadius: '6px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
              >
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                En línea ({onlineCount})
              </button>
              <button
                onClick={() => setFilter('urgent')}
                style={{
                  background: filter === 'urgent' ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                  color: filter === 'urgent' ? '#fca5a5' : 'var(--mac-text-secondary)',
                  border: 'none',
                  padding: '0.22rem 0.5rem',
                  borderRadius: '6px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Urgentes ({urgentCount})
              </button>
              <button
                onClick={() => setFilter('unread')}
                style={{
                  background: filter === 'unread' ? 'rgba(234, 88, 12, 0.2)' : 'transparent',
                  color: filter === 'unread' ? '#fdba74' : 'var(--mac-text-secondary)',
                  border: 'none',
                  padding: '0.22rem 0.5rem',
                  borderRadius: '6px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                No leídos ({unreadCount})
              </button>
            </div>
          </div>

          {/* Conversation Cards Stream */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            {filteredThreads.map(t => {
              const isSelected = selectedThread?.id === t.id;
              const lastMsg = t.messages[t.messages.length - 1];
              const visitor = getVisitorForThread(t);
              const online = isThreadOnline(t);

              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedThreadId(t.id)}
                  style={{
                    padding: '0.85rem 1rem',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    background: isSelected ? 'rgba(234, 88, 12, 0.12)' : 'transparent',
                    borderLeft: isSelected ? '3px solid var(--mac-accent)' : '3px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {/* Top line: Visitor Name + Online Status dot + Timestamp */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', overflow: 'hidden' }}>
                      <span 
                        style={{
                          width: '7px',
                          height: '7px',
                          borderRadius: '50%',
                          background: online ? '#10b981' : '#64748b',
                          boxShadow: online ? '0 0 6px rgba(16, 185, 129, 0.8)' : 'none',
                          flexShrink: 0
                        }} 
                        title={online ? 'Visitante en línea navegando el sitio' : 'Visitante desconectado'}
                      />
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f5f5f4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '170px' }}>
                        {t.visitorName}
                      </span>
                    </div>

                    <span style={{ fontSize: '0.68rem', color: 'var(--mac-text-muted)', flexShrink: 0 }}>
                      {lastMsg ? lastMsg.timestamp : ''}
                    </span>
                  </div>

                  {/* Visitor Location & Source Subtext */}
                  {visitor && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.68rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        <MapPin size={10} style={{ color: 'var(--mac-accent)' }} />
                        {visitor.city || 'CDMX'}
                      </span>
                      <span>•</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {visitor.referrerCategory}
                      </span>
                    </div>
                  )}

                  {/* Last Message Preview */}
                  <p style={{
                    margin: 0,
                    fontSize: '0.76rem',
                    color: t.unreadByAdmin > 0 ? '#f5f5f4' : 'var(--mac-text-muted)',
                    fontWeight: t.unreadByAdmin > 0 ? 700 : 400,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {lastMsg ? lastMsg.text : 'Conversación iniciada'}
                  </p>

                  {/* Badges & Actions footer */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.45rem' }}>
                    <span style={{
                      fontSize: '0.64rem',
                      padding: '0.1rem 0.4rem',
                      borderRadius: '4px',
                      background: t.mode === 'human' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      color: t.mode === 'human' ? '#34d399' : '#fbbf24',
                      fontWeight: 700
                    }}>
                      {t.mode === 'human' ? 'Operador' : 'Bot IA'}
                    </span>

                    {t.needsHumanAttention && (
                      <span style={{
                        fontSize: '0.64rem',
                        padding: '0.1rem 0.4rem',
                        borderRadius: '4px',
                        background: 'rgba(239, 68, 68, 0.2)',
                        color: '#f87171',
                        fontWeight: 800
                      }}>
                        Urgente
                      </span>
                    )}

                    {visitor?.activeSection && (
                      <span style={{
                        fontSize: '0.64rem',
                        padding: '0.1rem 0.4rem',
                        borderRadius: '4px',
                        background: 'rgba(255, 255, 255, 0.06)',
                        color: '#cbd5e1',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '90px'
                      }}>
                        {visitor.activeSection}
                      </span>
                    )}

                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteThread(t.id);
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '0.15rem 0.25rem',
                          color: 'var(--mac-text-muted)',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        title="Eliminar y cerrar conversación"
                      >
                        <Trash2 size={12} />
                      </button>

                      {t.unreadByAdmin > 0 && (
                        <span style={{
                          fontSize: '0.65rem',
                          background: 'var(--mac-accent)',
                          color: '#ffffff',
                          fontWeight: 800,
                          padding: '0.1rem 0.4rem',
                          borderRadius: '999px'
                        }}>
                          {t.unreadByAdmin}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredThreads.length === 0 && (
              <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center', color: 'var(--mac-text-muted)', fontSize: '0.85rem' }}>
                <p>No se encontraron conversaciones con el filtro activo.</p>
                {autoCleanupOnDisconnect && (
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    ⚡ Los chats de visitantes desconectados se eliminan automáticamente.
                  </span>
                )}
              </div>
            )}
          </div>

        </div>

        {/* 2. CENTER COLUMN: ACTIVE CONVERSATION */}
        {selectedThread ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--mac-bg-base)', position: 'relative' }}>
            
            {/* Conversation Header with Live Visitor Presence Bar */}
            <div style={{
              padding: '0.75rem 1.5rem',
              borderBottom: '1px solid var(--mac-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--mac-bg-surface)',
              backdropFilter: 'blur(12px)'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span 
                    style={{
                      width: '9px',
                      height: '9px',
                      borderRadius: '50%',
                      background: isCurrentOnline ? '#10b981' : '#64748b',
                      boxShadow: isCurrentOnline ? '0 0 8px rgba(16, 185, 129, 0.8)' : 'none'
                    }} 
                  />
                  <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: 'var(--mac-text-primary)' }}>
                    {selectedThread.visitorName}
                  </h3>
                  <span style={{
                    fontSize: '0.68rem',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '999px',
                    background: isCurrentOnline ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                    color: isCurrentOnline ? '#34d399' : '#94a3b8',
                    fontWeight: 700
                  }}>
                    {isCurrentOnline ? 'En línea en la web' : 'Desconectado'}
                  </span>
                </div>

                {/* Realtime browsing telemetry subheader */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem', fontSize: '0.74rem', color: 'var(--mac-text-muted)' }}>
                  {currentVisitor ? (
                    <>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#38bdf8' }}>
                        <Eye size={12} /> Viendo: <strong>{currentVisitor.activeSection}</strong> ({currentVisitor.scrollDepth}% scroll)
                      </span>
                      <span>•</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <MapPin size={11} style={{ color: 'var(--mac-accent)' }} /> {currentVisitor.city}, {currentVisitor.country}
                      </span>
                      <span>•</span>
                      <span>{currentVisitor.referrerCategory}</span>
                    </>
                  ) : (
                    <span>{selectedThread.visitorEmail || 'Sin correo registrado'} • {selectedThread.messages.length} mensajes</span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <button
                  onClick={handleToggleMode}
                  className={selectedThread.mode === 'human' ? 'mac-btn-secondary' : 'mac-btn-primary'}
                  style={{ fontSize: '0.78rem', padding: '0.4rem 0.8rem' }}
                >
                  {selectedThread.mode === 'human' ? (
                    <>
                      <Bot size={14} /> Delegar a Bot IA
                    </>
                  ) : (
                    <>
                      <UserCheck size={14} /> Relevar Bot (Tomar Control)
                    </>
                  )}
                </button>

                <button
                  onClick={() => handleDeleteThread(selectedThread.id)}
                  className="mac-btn-secondary"
                  style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem', color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.35)' }}
                  title="Cerrar y eliminar conversación"
                >
                  <Trash2 size={13} /> Cerrar & Borrar
                </button>
              </div>
            </div>

            {/* Messages Stream */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {selectedThread.messages.map(m => {
                const isVisitor = m.sender === 'visitor';
                const isBot = m.sender === 'bot';
                const isAdmin = m.sender === 'admin';

                return (
                  <div
                    key={m.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isVisitor ? 'flex-start' : 'flex-end',
                      maxWidth: '82%',
                      alignSelf: isVisitor ? 'flex-start' : 'flex-end'
                    }}
                  >
                    <span style={{ fontSize: '0.68rem', color: 'var(--mac-text-muted)', marginBottom: '0.2rem', padding: '0 0.4rem' }}>
                      {m.senderName || (isVisitor ? 'Visitante' : isBot ? 'Guillermo (IA)' : 'Administrador')} • {m.timestamp}
                    </span>

                    <div
                      style={{
                        padding: '0.75rem 1rem',
                        borderRadius: isVisitor ? '16px 16px 16px 4px' : '16px 16px 4px 16px',
                        background: isVisitor 
                          ? 'var(--mac-bg-card)' 
                          : isBot 
                          ? 'rgba(245, 158, 11, 0.15)' 
                          : 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
                        color: isVisitor ? 'var(--mac-text-primary)' : isBot ? '#f59e0b' : '#ffffff',
                        fontSize: '0.88rem',
                        lineHeight: 1.45,
                        border: isVisitor ? '1px solid var(--mac-border)' : 'none',
                        boxShadow: isAdmin ? '0 4px 14px rgba(234, 88, 12, 0.25)' : 'none'
                      }}
                    >
                      {m.imageUrl && (
                        <img 
                          src={m.imageUrl} 
                          alt="Adjunto de cinta" 
                          style={{ maxWidth: '240px', borderRadius: '10px', marginBottom: '0.5rem', display: 'block' }} 
                        />
                      )}
                      {m.text}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Canned Replies Bar */}
            <div style={{ padding: '0.5rem 1.5rem', display: 'flex', gap: '0.4rem', overflowX: 'auto', borderTop: '1px solid rgba(255, 255, 255, 0.05)', background: 'rgba(0,0,0,0.1)' }}>
              {cannedReplies.map((canned, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setReplyText(canned)}
                  style={{
                    padding: '0.25rem 0.65rem',
                    borderRadius: '999px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--mac-border)',
                    color: 'var(--mac-text-secondary)',
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--mac-accent)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--mac-border)')}
                >
                  + {canned.substring(0, 32)}...
                </button>
              ))}
            </div>

            {/* Input Reply Bar */}
            <form onSubmit={handleSendReply} style={{ padding: '0.85rem 1.5rem', borderTop: '1px solid var(--mac-border)', display: 'flex', gap: '0.75rem', background: 'var(--mac-bg-surface)' }}>
              <input 
                type="text"
                placeholder="Escribe una respuesta como Operador de Laboratorio..."
                className="mac-input"
                style={{ flex: 1, fontSize: '0.88rem' }}
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                autoFocus
              />
              <button type="submit" className="mac-btn-primary" disabled={!replyText.trim()}>
                <Send size={15} /> Enviar
              </button>
            </form>

          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--mac-text-muted)', fontSize: '0.9rem' }}>
            Selecciona una conversación a la izquierda para interactuar.
          </div>
        )}

        {/* 3. RIGHT COLUMN: LIVE VISITOR DOSSIER & TELEMETRY */}
        {selectedThread && (
          <div style={{
            width: '280px',
            borderLeft: '1px solid var(--mac-border)',
            background: 'var(--mac-bg-sidebar)',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            flexShrink: 0,
            overflowY: 'auto'
          }}>
            {/* Header */}
            <div>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--mac-text-muted)', letterSpacing: '0.05em' }}>
                Ficha del Visitante
              </span>
              <h4 style={{ margin: '0.35rem 0 0.1rem 0', fontSize: '0.98rem', fontWeight: 800, color: 'var(--mac-text-primary)' }}>
                {selectedThread.visitorName}
              </h4>
              <span style={{ fontSize: '0.72rem', color: 'var(--mac-text-muted)' }}>
                ID: {selectedThread.id}
              </span>
            </div>

            {/* Live Presence Dossier Card */}
            {currentVisitor ? (
              <div className="mac-card" style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '0.45rem' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Radio size={12} className="animate-pulse" /> TELEMETRÍA EN VIVO
                  </span>
                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    color: currentVisitor.isTabActive ? '#34d399' : '#fbbf24',
                    background: currentVisitor.isTabActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                    padding: '0.1rem 0.35rem',
                    borderRadius: '4px'
                  }}>
                    {currentVisitor.isTabActive ? 'Pestaña Activa' : 'Segundo Plano'}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <span style={{ fontSize: '0.68rem', color: 'var(--mac-text-muted)' }}>Ubicación Real:</span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f5f5f4', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <MapPin size={13} style={{ color: 'var(--mac-accent)' }} />
                    {currentVisitor.city}, {currentVisitor.region} ({currentVisitor.country})
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <span style={{ fontSize: '0.68rem', color: 'var(--mac-text-muted)' }}>Proveedor de Red:</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--mac-text-secondary)' }}>
                    {currentVisitor.isp}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <span style={{ fontSize: '0.68rem', color: 'var(--mac-text-muted)' }}>Origen de Tráfico:</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fed7aa' }}>
                    {currentVisitor.referrerCategory}
                  </span>
                  {currentVisitor.utmCampaign && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--mac-text-muted)' }}>
                      Campaña: {currentVisitor.utmCampaign}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <span style={{ fontSize: '0.68rem', color: 'var(--mac-text-muted)' }}>Sección que está viendo:</span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#38bdf8' }}>
                    {currentVisitor.activeSection}
                  </span>
                  
                  {/* Scroll Meter */}
                  <div style={{ marginTop: '0.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--mac-text-muted)', marginBottom: '0.15rem' }}>
                      <span>Scroll:</span>
                      <span>{currentVisitor.scrollDepth}%</span>
                    </div>
                    <div style={{ width: '100%', height: '4px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: `${currentVisitor.scrollDepth}%`, height: '100%', background: 'linear-gradient(90deg, #ea580c, #10b981)', transition: 'width 0.3s ease' }} />
                    </div>
                  </div>
                </div>

                {currentVisitor.currentAction && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', background: 'rgba(255, 255, 255, 0.03)', padding: '0.4rem 0.5rem', borderRadius: '6px' }}>
                    <span style={{ fontSize: '0.66rem', color: 'var(--mac-text-muted)' }}>Última acción:</span>
                    <span style={{ fontSize: '0.74rem', color: '#e2e8f0', fontStyle: 'italic' }}>
                      "{currentVisitor.currentAction}"
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="mac-card" style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: 'var(--mac-text-secondary)' }}>
                  <Mail size={14} style={{ color: 'var(--mac-accent)' }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {selectedThread.visitorEmail || 'No registrado'}
                  </span>
                </div>
                {selectedThread.visitorPhone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: 'var(--mac-text-secondary)' }}>
                    <Phone size={14} style={{ color: '#10b981' }} />
                    <span>{selectedThread.visitorPhone}</span>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: 'var(--mac-text-secondary)' }}>
                  <Clock size={14} style={{ color: '#f59e0b' }} />
                  <span>Iniciado: {new Date(selectedThread.createdAt).toLocaleDateString('es-MX')}</span>
                </div>
              </div>
            )}

            {/* Mode Box */}
            <div>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--mac-text-muted)' }}>
                Modo de Respuesta
              </span>
              <div style={{ marginTop: '0.4rem', padding: '0.75rem', borderRadius: '10px', background: selectedThread.mode === 'human' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', fontWeight: 700, color: selectedThread.mode === 'human' ? '#34d399' : '#fbbf24' }}>
                  {selectedThread.mode === 'human' ? <UserCheck size={16} /> : <Bot size={16} />}
                  <span>{selectedThread.mode === 'human' ? 'Control Humano' : 'Asistente IA'}</span>
                </div>
                <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.72rem', color: 'var(--mac-text-muted)', lineHeight: 1.35 }}>
                  {selectedThread.mode === 'human' 
                    ? 'El bot está pausado. Tus respuestas van directas al cliente.' 
                    : 'El bot responde preguntas comunes y ayuda a cotizar.'}
                </p>
              </div>
            </div>

            {/* Bottom Actions */}
            <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--mac-border)' }}>
              <button
                onClick={() => handleDeleteThread(selectedThread.id)}
                className="mac-btn-secondary"
                style={{
                  width: '100%',
                  padding: '0.55rem',
                  fontSize: '0.75rem',
                  color: '#f87171',
                  borderColor: 'rgba(239, 68, 68, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.45rem',
                  fontWeight: 700
                }}
                title="Cerrar y eliminar conversación"
              >
                <Trash2 size={13} /> Cerrar & Eliminar Chat
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};

export default DesktopChatCenter;
