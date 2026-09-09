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
  UserCheck
} from 'lucide-react';
import { 
  getChatThreads, 
  addMessageToThread, 
  setThreadMode, 
  markThreadAsReadByAdmin,
  type ChatThread 
} from '../../lib/chatStore';

export const DesktopChatCenter: React.FC = () => {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'urgent' | 'unread'>('all');
  const [soundEnabled, setSoundEnabled] = useState(true);

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

  useEffect(() => {
    loadThreads();
    const interval = setInterval(loadThreads, 3000);
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

  const selectedThread = threads.find(t => t.id === selectedThreadId) || threads[0] || null;

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

  const filteredThreads = threads.filter(t => {
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

  const cannedReplies = [
    '¡Hola! Con gusto podemos cotizar y revisar tus cintas en el laboratorio.',
    'El tiempo promedio de digitalización es de 3 a 5 días hábiles.',
    'Contamos con recolección y entrega a domicilio segura.',
    'Te comparto los detalles del depósito para iniciar tu orden.'
  ];

  return (
    <div style={{ display: 'flex', width: '100%', height: 'calc(100vh - 48px)', overflow: 'hidden' }}>
      
      {/* 1. LEFT COLUMN: CONVERSATIONS LIST */}
      <div style={{
        width: '320px',
        borderRight: '1px solid var(--mac-border)',
        background: 'rgba(20, 17, 15, 0.7)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0
      }}>
        {/* Search & Filter Header */}
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--mac-border)', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f5f5f4' }}>
              Conversaciones ({threads.length})
            </span>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              style={{ background: 'none', border: 'none', color: soundEnabled ? 'var(--mac-accent)' : 'var(--mac-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              title={soundEnabled ? 'Silenciar campanilla' : 'Activar sonido de notificación'}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
          </div>

          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--mac-text-muted)' }} />
            <input 
              type="text"
              placeholder="Buscar por cliente o mensaje..."
              className="mac-input"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%', paddingLeft: '2rem', fontSize: '0.8rem', boxSizing: 'border-box' }}
            />
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            <button
              onClick={() => setFilter('all')}
              style={{
                background: filter === 'all' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                color: filter === 'all' ? '#ffffff' : 'var(--mac-text-secondary)',
                border: 'none',
                padding: '0.25rem 0.55rem',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Todas
            </button>
            <button
              onClick={() => setFilter('urgent')}
              style={{
                background: filter === 'urgent' ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                color: filter === 'urgent' ? '#fca5a5' : 'var(--mac-text-secondary)',
                border: 'none',
                padding: '0.25rem 0.55rem',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Urgentes
            </button>
            <button
              onClick={() => setFilter('unread')}
              style={{
                background: filter === 'unread' ? 'rgba(234, 88, 12, 0.2)' : 'transparent',
                color: filter === 'unread' ? '#fdba74' : 'var(--mac-text-secondary)',
                border: 'none',
                padding: '0.25rem 0.55rem',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              No leídos
            </button>
          </div>
        </div>

        {/* Thread Item List */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {filteredThreads.map(t => {
            const isSelected = selectedThread?.id === t.id;
            const lastMsg = t.messages[t.messages.length - 1];

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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f5f5f4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>
                    {t.visitorName}
                  </span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--mac-text-muted)' }}>
                    {lastMsg ? lastMsg.timestamp : ''}
                  </span>
                </div>

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

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.4rem' }}>
                  <span style={{
                    fontSize: '0.65rem',
                    padding: '0.1rem 0.4rem',
                    borderRadius: '4px',
                    background: t.mode === 'human' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                    color: t.mode === 'human' ? '#34d399' : '#fbbf24',
                    fontWeight: 700
                  }}>
                    {t.mode === 'human' ? 'Operador Humano' : 'Bot Asistente'}
                  </span>

                  {t.needsHumanAttention && (
                    <span style={{
                      fontSize: '0.65rem',
                      padding: '0.1rem 0.4rem',
                      borderRadius: '4px',
                      background: 'rgba(239, 68, 68, 0.2)',
                      color: '#f87171',
                      fontWeight: 800
                    }}>
                      Atención Urgente
                    </span>
                  )}

                  {t.unreadByAdmin > 0 && (
                    <span style={{
                      marginLeft: 'auto',
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
            );
          })}

          {filteredThreads.length === 0 && (
            <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--mac-text-muted)', fontSize: '0.85rem' }}>
              No se encontraron conversaciones con el filtro seleccionado.
            </div>
          )}
        </div>
      </div>

      {/* 2. CENTER COLUMN: ACTIVE CHAT CONVERSATION */}
      {selectedThread ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'rgba(12, 10, 9, 0.5)' }}>
          {/* Chat Header */}
          <div style={{
            height: '56px',
            padding: '0 1.5rem',
            borderBottom: '1px solid var(--mac-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(18, 16, 15, 0.6)',
            backdropFilter: 'blur(12px)'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#f5f5f4' }}>
                  {selectedThread.visitorName}
                </h3>
                {selectedThread.currentRoute && (
                  <span style={{ fontSize: '0.7rem', color: 'var(--mac-text-muted)' }}>
                    (Viendo: {selectedThread.currentRoute})
                  </span>
                )}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--mac-text-muted)' }}>
                {selectedThread.visitorEmail || 'Sin correo especificado'} • {selectedThread.messages.length} mensajes
              </span>
            </div>

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
                    maxWidth: '80%',
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
                        ? 'rgba(255, 255, 255, 0.08)' 
                        : isBot 
                        ? 'rgba(245, 158, 11, 0.15)' 
                        : 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
                      color: '#ffffff',
                      fontSize: '0.88rem',
                      lineHeight: 1.45,
                      border: isVisitor ? '1px solid var(--mac-border)' : 'none',
                      boxShadow: isAdmin ? '0 4px 14px rgba(234, 88, 12, 0.25)' : 'none'
                    }}
                  >
                    {m.text}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Replies Chips */}
          <div style={{ padding: '0.5rem 1.5rem', display: 'flex', gap: '0.4rem', overflowX: 'auto', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
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
                  whiteSpace: 'nowrap'
                }}
              >
                + {canned.substring(0, 32)}...
              </button>
            ))}
          </div>

          {/* Message Input Bar */}
          <form onSubmit={handleSendReply} style={{ padding: '0.85rem 1.5rem', borderTop: '1px solid var(--mac-border)', display: 'flex', gap: '0.75rem', background: 'rgba(18, 16, 15, 0.8)' }}>
            <input 
              type="text"
              placeholder="Escribe una respuesta como Operador de Laboratorio..."
              className="mac-input"
              style={{ flex: 1, fontSize: '0.9rem' }}
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

      {/* 3. RIGHT COLUMN: CUSTOMER DOSSIER */}
      {selectedThread && (
        <div style={{
          width: '260px',
          borderLeft: '1px solid var(--mac-border)',
          background: 'rgba(18, 16, 15, 0.65)',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          flexShrink: 0
        }}>
          <div>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--mac-text-muted)' }}>
              Ficha del Cliente
            </span>
            <h4 style={{ margin: '0.35rem 0 0.1rem 0', fontSize: '1rem', fontWeight: 800, color: '#f5f5f4' }}>
              {selectedThread.visitorName}
            </h4>
            <span style={{ fontSize: '0.75rem', color: 'var(--mac-text-muted)' }}>
              ID: {selectedThread.id}
            </span>
          </div>

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

          <div>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--mac-text-muted)' }}>
              Modo de Operación
            </span>
            <div style={{ marginTop: '0.4rem', padding: '0.75rem', borderRadius: '10px', background: selectedThread.mode === 'human' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', fontWeight: 700, color: selectedThread.mode === 'human' ? '#34d399' : '#fbbf24' }}>
                {selectedThread.mode === 'human' ? <UserCheck size={16} /> : <Bot size={16} />}
                <span>{selectedThread.mode === 'human' ? 'Control Humano Activo' : 'Asistente IA Respondiendo'}</span>
              </div>
              <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.72rem', color: 'var(--mac-text-muted)', lineHeight: 1.35 }}>
                {selectedThread.mode === 'human' 
                  ? 'El bot está pausado para esta conversación. Tus mensajes se envían directamente.' 
                  : 'El bot responde preguntas comunes y ayuda a calcular cotizaciones.'}
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DesktopChatCenter;
