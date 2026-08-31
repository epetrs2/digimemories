import React, { useState, useEffect, useRef } from 'react';
import { 
  getChatThreads, 
  addMessageToThread, 
  setThreadMode, 
  markThreadAsReadByAdmin,
  archiveChatThread
} from '../lib/chatStore';
import type { ChatThread } from '../lib/chatStore';
import { 
  MessageSquare, 
  Send, 
  Search, 
  Zap, 
  ToggleLeft, 
  ToggleRight,
  AlertTriangle,
  Archive,
  RefreshCw
} from 'lucide-react';

const QUICK_TEMPLATES = [
  {
    title: '📍 Taller & Dirección',
    text: '¡Hola! Nuestro taller de recepción física se ubica en Av. Insurgentes Sur #450, Col. Roma Sur, CDMX. Horario: Lunes a Sábado de 10:00 a 18:00 hrs.'
  },
  {
    title: '💰 Precios Base',
    text: 'La tarifa por cinta (VHS, Beta, Hi8, MiniDV) es de $200 MXN e incluye hasta 2 horas en MP4. Si traes más de 5 cintas, te aplicamos 10% de descuento en el total.'
  },
  {
    title: '🛵 Envíos / Uber Flash',
    text: 'Con gusto puedes enviar tu material por Uber Flash, Didi Entrega o paquetería segura. Avísanos antes para estar atentos a la recepción.'
  },
  {
    title: '📼 Cintas con Moho',
    text: 'Hacemos una inspección previa sin costo. Si la cinta puede leerse de forma segura se digitaliza; si tiene daño severo te lo informamos y no se te cobra.'
  },
  {
    title: '⚡ Remasterización',
    text: 'El servicio de mejora de color y audio cuesta $150 MXN adicionales por cinta e incluye reducción de ruido y balance de color.'
  }
];

const AdminChatManager: React.FC = () => {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string>('');
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'active' | 'attention' | 'archived'>('active');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadThreads = () => {
    const list = getChatThreads();
    setThreads(list);
    if (!selectedThreadId && list.length > 0) {
      setSelectedThreadId(list[0].id);
      markThreadAsReadByAdmin(list[0].id);
    }
  };

  useEffect(() => {
    loadThreads();

    const handleSync = () => loadThreads();
    window.addEventListener('digimemories_chat_sync', handleSync);
    window.addEventListener('storage', handleSync);

    const interval = setInterval(loadThreads, 2000);

    return () => {
      window.removeEventListener('digimemories_chat_sync', handleSync);
      window.removeEventListener('storage', handleSync);
      clearInterval(interval);
    };
  }, [selectedThreadId]);

  const selectedThread = threads.find(t => t.id === selectedThreadId);

  useEffect(() => {
    if (selectedThreadId) {
      markThreadAsReadByAdmin(selectedThreadId);
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedThread?.messages.length, selectedThreadId]);

  const handleSelectThread = (id: string) => {
    setSelectedThreadId(id);
    markThreadAsReadByAdmin(id);
    setTimeout(() => inputRef.current?.focus(), 150);
  };

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || !selectedThreadId) return;

    addMessageToThread(selectedThreadId, 'admin', text, 'Tú (Operador Admin)');
    if (!textToSend) setInputText('');
    loadThreads();
  };

  const handleToggleMode = () => {
    if (!selectedThread) return;
    const newMode = selectedThread.mode === 'bot' ? 'human' : 'bot';
    setThreadMode(selectedThread.id, newMode);
    loadThreads();
  };

  const handleArchiveThread = () => {
    if (!selectedThread) return;
    if (window.confirm(`¿Deseas finalizar y archivar la conversación con ${selectedThread.visitorName}?`)) {
      archiveChatThread(selectedThread.id, 'admin');
      loadThreads();
    }
  };

  const handleReopenThread = () => {
    if (!selectedThread) return;
    selectedThread.status = 'active';
    selectedThread.mode = 'human';
    addMessageToThread(selectedThread.id, 'system', 'Conversación reabierta por el Administrador.', 'Sistema');
    loadThreads();
  };

  // Filter threads
  const filteredThreads = threads.filter(t => {
    const matchesSearch = t.visitorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.messages.some(m => m.text.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (!matchesSearch) return false;
    if (filterMode === 'active') return t.status !== 'archived';
    if (filterMode === 'attention') return t.status !== 'archived' && t.needsHumanAttention;
    if (filterMode === 'archived') return t.status === 'archived';
    return true;
  });

  const totalAttention = threads.filter(t => t.status !== 'archived' && t.needsHumanAttention).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Top Banner Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="glass" style={{ padding: '1.25rem', background: '#ffffff', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-color)' }}>
            <MessageSquare size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Chats Activos</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{threads.filter(t => t.status !== 'archived').length}</div>
          </div>
        </div>

        <div className="glass" style={{ padding: '1.25rem', background: '#ffffff', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: totalAttention > 0 ? '#fee2e2' : 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: totalAttention > 0 ? '#ef4444' : 'var(--text-secondary)' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Requieren Atención Humana</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: totalAttention > 0 ? '#ef4444' : 'var(--text-primary)' }}>
              {totalAttention}
            </div>
          </div>
        </div>

        <div className="glass" style={{ padding: '1.25rem', background: '#ffffff', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
            <Zap size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Canal de Soporte</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#16a34a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16a34a' }} />
              En Vivo y Sincronizado
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Hub Container */}
      <div 
        className="glass"
        style={{
          display: 'grid',
          gridTemplateColumns: '330px 1fr',
          minHeight: '620px',
          borderRadius: '20px',
          overflow: 'hidden',
          background: '#ffffff',
          boxShadow: 'var(--shadow-lg)'
        }}
      >
        
        {/* LEFT COLUMN: Inbox Threads List */}
        <div style={{ borderRight: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', background: 'var(--bg-base)' }}>
          
          {/* Search & Filter Header */}
          <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--glass-border)' }}>
            <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text"
                className="input-field"
                placeholder="Buscar cliente o mensaje..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '2.25rem', fontSize: '0.85rem', padding: '0.6rem 0.6rem 0.6rem 2.25rem' }}
              />
            </div>

            {/* Filter tabs */}
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              <button 
                onClick={() => setFilterMode('active')}
                style={{
                  flex: 1,
                  padding: '0.4rem 0.2rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: 'none',
                  background: filterMode === 'active' ? 'var(--accent-color)' : 'transparent',
                  color: filterMode === 'active' ? '#ffffff' : 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                Activos ({threads.filter(t => t.status !== 'archived').length})
              </button>

              <button 
                onClick={() => setFilterMode('attention')}
                style={{
                  flex: 1,
                  padding: '0.4rem 0.2rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: 'none',
                  background: filterMode === 'attention' ? '#ef4444' : 'transparent',
                  color: filterMode === 'attention' ? '#ffffff' : 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                Atención ⚠️ ({totalAttention})
              </button>

              <button 
                onClick={() => setFilterMode('archived')}
                style={{
                  flex: 1,
                  padding: '0.4rem 0.2rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: 'none',
                  background: filterMode === 'archived' ? 'var(--accent-color)' : 'transparent',
                  color: filterMode === 'archived' ? '#ffffff' : 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                Archivados ({threads.filter(t => t.status === 'archived').length})
              </button>
            </div>
          </div>

          {/* Threads List */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            {filteredThreads.length === 0 ? (
              <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No hay conversaciones en esta bandeja.
              </div>
            ) : (
              filteredThreads.map(thread => {
                const isSelected = thread.id === selectedThreadId;
                const lastMsg = thread.messages[thread.messages.length - 1];

                return (
                  <div
                    key={thread.id}
                    onClick={() => handleSelectThread(thread.id)}
                    style={{
                      padding: '1rem 1.25rem',
                      borderBottom: '1px solid rgba(0,0,0,0.05)',
                      background: isSelected ? 'var(--accent-light)' : '#ffffff',
                      borderLeft: isSelected ? '4px solid var(--accent-color)' : '4px solid transparent',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.3rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        {thread.visitorName}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {lastMsg?.timestamp || ''}
                      </span>
                    </div>

                    {thread.needsHumanAttention && thread.status !== 'archived' && (
                      <div style={{ fontSize: '0.75rem', color: '#b91c1c', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.25rem' }}>
                        <AlertTriangle size={13} /> Requiere atención humana
                      </div>
                    )}

                    <p style={{ 
                      fontSize: '0.8rem', 
                      color: thread.unreadByAdmin > 0 ? 'var(--text-primary)' : 'var(--text-muted)', 
                      fontWeight: thread.unreadByAdmin > 0 ? 700 : 400,
                      margin: 0,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      lineHeight: 1.4
                    }}>
                      {lastMsg?.sender === 'admin' ? 'Tú: ' : ''}{lastMsg?.text || 'Nueva conversación'}
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                      <span style={{
                        fontSize: '0.7rem',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '999px',
                        background: thread.status === 'archived' ? 'var(--bg-secondary)' : thread.mode === 'human' ? '#dcfce7' : 'var(--bg-secondary)',
                        color: thread.status === 'archived' ? 'var(--text-muted)' : thread.mode === 'human' ? '#15803d' : 'var(--text-secondary)',
                        fontWeight: 600
                      }}>
                        {thread.status === 'archived' ? '📁 Finalizado' : thread.mode === 'human' ? '👨‍💻 Operador Activo' : '🤖 Asistente Bot'}
                      </span>

                      {thread.unreadByAdmin > 0 && (
                        <span style={{
                          background: '#ef4444',
                          color: '#ffffff',
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          padding: '0.15rem 0.45rem',
                          borderRadius: '999px'
                        }}>
                          {thread.unreadByAdmin}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Active Chat Conversation */}
        {selectedThread ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            
            {/* Thread Header */}
            <div style={{
              padding: '1rem 1.5rem',
              borderBottom: '1px solid var(--glass-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#ffffff',
              flexWrap: 'wrap',
              gap: '0.75rem'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <h3 style={{ fontSize: '1.15rem', margin: 0, fontWeight: 700 }}>
                    {selectedThread.visitorName}
                  </h3>
                  {selectedThread.currentRoute && (
                    <span style={{ fontSize: '0.75rem', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', padding: '0.2rem 0.55rem', borderRadius: '6px', fontWeight: 600 }}>
                      📍 En: {selectedThread.currentRoute}
                    </span>
                  )}
                  {selectedThread.status === 'archived' && (
                    <span style={{ fontSize: '0.75rem', background: 'var(--bg-secondary)', color: 'var(--text-muted)', padding: '0.2rem 0.55rem', borderRadius: '6px', fontWeight: 700 }}>
                      📁 Finalizado
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  ID Sesión: {selectedThread.id}
                </div>
              </div>

              {/* Actions Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                {selectedThread.status !== 'archived' ? (
                  <>
                    <button
                      onClick={handleToggleMode}
                      className="btn"
                      style={{
                        padding: '0.45rem 0.85rem',
                        fontSize: '0.8rem',
                        background: selectedThread.mode === 'human' ? '#dcfce7' : 'var(--bg-secondary)',
                        color: selectedThread.mode === 'human' ? '#15803d' : 'var(--text-primary)',
                        border: '1px solid rgba(0,0,0,0.1)'
                      }}
                    >
                      {selectedThread.mode === 'human' ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                      <span>{selectedThread.mode === 'human' ? 'Humano (Tú respondes)' : 'Bot Automático'}</span>
                    </button>

                    <button
                      onClick={handleArchiveThread}
                      className="btn btn-secondary"
                      style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem', color: '#b91c1c' }}
                      title="Finalizar y archivar chat"
                    >
                      <Archive size={15} /> Finalizar Chat
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleReopenThread}
                    className="btn btn-secondary"
                    style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}
                  >
                    <RefreshCw size={15} /> Reabrir Conversación
                  </button>
                )}
              </div>
            </div>

            {/* Escalation alert banner if needed */}
            {selectedThread.needsHumanAttention && selectedThread.status !== 'archived' && (
              <div style={{ background: '#fef2f2', borderBottom: '1px solid #fecaca', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#991b1b', fontSize: '0.85rem', fontWeight: 600 }}>
                  <AlertTriangle size={16} />
                  <span>El cliente solicitó atención humana o el bot no pudo responder a su consulta.</span>
                </div>
                <button 
                  onClick={() => { setThreadMode(selectedThread.id, 'human'); loadThreads(); }}
                  className="btn btn-primary"
                  style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem' }}
                >
                  Tomar Control Ahora
                </button>
              </div>
            )}

            {/* Messages Scroll Area */}
            <div style={{
              flex: 1,
              padding: '1.5rem',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              background: 'var(--bg-base)'
            }}>
              {selectedThread.messages.map(msg => {
                const isAdmin = msg.sender === 'admin';
                const isBot = msg.sender === 'bot';
                const isSystem = msg.sender === 'system';

                if (isSystem) {
                  return (
                    <div key={msg.id} style={{ textAlign: 'center', margin: '0.5rem 0' }}>
                      <span style={{ fontSize: '0.75rem', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', padding: '0.35rem 0.85rem', borderRadius: '999px', fontWeight: 600 }}>
                        {msg.text}
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isAdmin ? 'flex-end' : 'flex-start',
                      maxWidth: '78%',
                      alignSelf: isAdmin ? 'flex-end' : 'flex-start'
                    }}
                  >
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem', padding: '0 0.3rem' }}>
                      {isAdmin ? '👤 Tú (Administrador)' : isBot ? '🤖 Bot Guillermo' : `💬 ${msg.senderName || selectedThread.visitorName}`}
                    </div>

                    <div style={{
                      padding: '0.85rem 1.15rem',
                      borderRadius: isAdmin ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      background: isAdmin ? 'var(--accent-color)' : isBot ? '#ffffff' : '#f3ede2',
                      color: isAdmin ? '#ffffff' : 'var(--text-primary)',
                      fontSize: '0.9rem',
                      lineHeight: 1.5,
                      boxShadow: 'var(--shadow-sm)',
                      border: isBot ? '1px solid var(--glass-border)' : 'none'
                    }}>
                      {msg.text}
                    </div>

                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.2rem', padding: '0 0.3rem' }}>
                      {msg.timestamp}
                    </span>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Templates Bar */}
            {selectedThread.status !== 'archived' && (
              <div style={{
                padding: '0.6rem 1rem',
                background: '#ffffff',
                borderTop: '1px solid var(--glass-border)',
                display: 'flex',
                gap: '0.5rem',
                overflowX: 'auto',
                whiteSpace: 'nowrap'
              }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Zap size={14} className="text-accent" /> Plantillas:
                </span>
                {QUICK_TEMPLATES.map((tmpl, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(tmpl.text)}
                    style={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid rgba(214, 204, 194, 0.7)',
                      borderRadius: '8px',
                      padding: '0.3rem 0.7rem',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                    title={tmpl.text}
                  >
                    {tmpl.title}
                  </button>
                ))}
              </div>
            )}

            {/* Reply Input Bar or Finalized notice */}
            {selectedThread.status === 'archived' ? (
              <div style={{ padding: '1.25rem', background: '#ffffff', textAlign: 'center', borderTop: '1px solid var(--glass-border)' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginRight: '1rem' }}>
                  Esta conversación está archivada.
                </span>
                <button onClick={handleReopenThread} className="btn btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>
                  <RefreshCw size={14} /> Reabrir para responder
                </button>
              </div>
            ) : (
              <form 
                onSubmit={e => { e.preventDefault(); handleSendMessage(); }}
                style={{
                  padding: '1rem 1.25rem',
                  background: '#ffffff',
                  borderTop: '1px solid var(--glass-border)',
                  display: 'flex',
                  gap: '0.75rem',
                  alignItems: 'center'
                }}
              >
                <input 
                  ref={inputRef}
                  type="text"
                  className="input-field"
                  placeholder={`Escribe tu respuesta como Administrador para ${selectedThread.visitorName}...`}
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  style={{ flex: 1, padding: '0.75rem 1rem' }}
                />
                <button 
                  type="submit"
                  disabled={!inputText.trim()}
                  className="btn btn-primary"
                  style={{
                    padding: '0.75rem 1.5rem',
                    opacity: !inputText.trim() ? 0.5 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <span>Enviar</span>
                  <Send size={16} />
                </button>
              </form>
            )}

          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            Selecciona una conversación a la izquierda.
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminChatManager;
