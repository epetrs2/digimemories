import React, { useState, useEffect, useRef } from 'react';
import { 
  getChatThreads, 
  addMessageToThread, 
  setThreadMode, 
  markThreadAsReadByAdmin,
  archiveChatThread
} from '../lib/chatStore';
import type { ChatThread } from '../lib/chatStore';
import { adminNotifier } from '../lib/audioNotification';
import { 
  MessageSquare, 
  Send, 
  Search, 
  Zap, 
  ToggleLeft, 
  ToggleRight,
  AlertTriangle,
  Archive,
  RefreshCw,
  Volume2,
  VolumeX,
  ArrowLeft,
  Bell,
  CheckCheck
} from 'lucide-react';

const QUICK_TEMPLATES = [
  {
    title: '👋 Saludo Inicial',
    text: '¡Hola! Con mucho gusto te atendemos. ¿Cuántas cintas o recuerdos te gustaría digitalizar?'
  },
  {
    title: '📍 Dirección Taller CDMX',
    text: 'Nuestro taller se ubica en Av. Insurgentes Sur #450, Col. Roma Sur, Cuauhtémoc, CDMX (frente a Metrobús Chilpancingo). Horario: Lun-Vie 9am-7pm, Sáb 10am-3pm.'
  },
  {
    title: '💰 Precios y Tarifas',
    text: 'La tarifa es de $200 MXN por cinta VHS normal (hasta 2 horas de contenido). Incluye conversión a MP4 en alta definición y entrega en USB.'
  },
  {
    title: '🚚 Recolección a Domicilio',
    text: 'Contamos con servicio de recolección en toda la CDMX por chofer o mensajero express. Si gustas, compártenos tu dirección para programarlo.'
  },
  {
    title: '💳 Datos para Anticipo',
    text: 'Puedes realizar tu anticipo del 50% vía transferencia SPEI a BBVA CLABE: 012180015492837190 a nombre de DigiMemories. Favor de poner tu número de orden de concepto.'
  },
  {
    title: '⚡ Remasterización HD',
    text: 'Ofrecemos servicio opcional de remasterización y corrección de color/audio por $150 MXN adicionales por cinta para dejar tus videos impecables.'
  }
];

export const AdminChatManager: React.FC = () => {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string>('');
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'active' | 'attention' | 'archived'>('active');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => adminNotifier.isSoundEnabled());
  const [pushEnabled, setPushEnabled] = useState<boolean>(false);
  const [showMobileChat, setShowMobileChat] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevUnreadCountRef = useRef<number>(0);

  // Handle window resizing
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setShowMobileChat(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadThreads = () => {
    const list = getChatThreads();
    setThreads(list);

    // Calculate total unread by admin
    const currentUnread = list.reduce((acc, t) => acc + (t.unreadByAdmin || 0), 0);
    if (currentUnread > prevUnreadCountRef.current) {
      // New visitor message arrived! Play chime
      adminNotifier.playIncomingMessageSound();
      const lastUpdated = list.find(t => t.unreadByAdmin > 0);
      if (lastUpdated) {
        const lastMsg = lastUpdated.messages[lastUpdated.messages.length - 1];
        adminNotifier.showBrowserNotification(
          `Nuevo mensaje de ${lastUpdated.visitorName}`,
          lastMsg ? lastMsg.text : 'Tienes un nuevo mensaje en el chat'
        );
      }
    }
    prevUnreadCountRef.current = currentUnread;

    // If desktop and no selection or selectedThread is missing, auto-pick first available
    const currentStillValid = list.some(t => t.id === selectedThreadId);
    if ((!selectedThreadId || !currentStillValid) && list.length > 0 && !isMobile) {
      const firstActive = list.find(t => t.status !== 'archived') || list[0];
      setSelectedThreadId(firstActive.id);
      markThreadAsReadByAdmin(firstActive.id);
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
  }, [selectedThreadId, isMobile]);

  const selectedThread = threads.find(t => t.id === selectedThreadId);

  useEffect(() => {
    if (selectedThreadId) {
      markThreadAsReadByAdmin(selectedThreadId);
      // Safe vertical-only scroll without horizontal grid distortion
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
      if (mainContainerRef.current) {
        mainContainerRef.current.scrollLeft = 0;
      }
    }
  }, [selectedThread?.messages.length, selectedThreadId, showMobileChat]);

  const handleSelectThread = (id: string) => {
    setSelectedThreadId(id);
    markThreadAsReadByAdmin(id);
    if (isMobile) {
      setShowMobileChat(true);
    }
    setTimeout(() => inputRef.current?.focus(), 150);
  };

  const handleBackToInboxMobile = () => {
    setShowMobileChat(false);
  };

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || !selectedThreadId) return;

    addMessageToThread(selectedThreadId, 'admin', text, 'Tú (Operador Admin)');
    if (!textToSend) setInputText('');
    loadThreads();
    setTimeout(() => inputRef.current?.focus(), 100);
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
      if (isMobile) setShowMobileChat(false);
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

  const handleToggleSound = () => {
    const next = adminNotifier.toggleSound();
    setSoundEnabled(next);
  };

  const handleRequestPush = async () => {
    const granted = await adminNotifier.requestPushPermission();
    setPushEnabled(granted);
    if (granted) {
      adminNotifier.showBrowserNotification('DigiMemories Admin', '🔔 ¡Notificaciones de chat activadas en tu dispositivo!');
    }
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
  const totalActive = threads.filter(t => t.status !== 'archived').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Top Banner Stats & Mobile Controls */}
      <div style={{
        background: '#ffffff',
        padding: '1.25rem',
        borderRadius: '18px',
        border: '1px solid var(--glass-border)',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-color)' }}>
              <MessageSquare size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Chats Activos</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#1c1917', lineHeight: 1.1 }}>{totalActive}</div>
            </div>
          </div>

          {totalAttention > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#fee2e2', padding: '0.4rem 0.85rem', borderRadius: '12px', border: '1px solid #fca5a5' }}>
              <AlertTriangle size={18} color="#dc2626" />
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#991b1b' }}>
                {totalAttention} {totalAttention === 1 ? 'requiere atención' : 'requieren atención'}
              </span>
            </div>
          )}
        </div>

        {/* Audio & Notification Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleToggleSound}
            style={{
              padding: '0.5rem 0.85rem',
              fontSize: '0.75rem',
              fontWeight: 800,
              borderRadius: '10px',
              border: soundEnabled ? '1px solid #86efac' : '1px solid #d6d3d1',
              background: soundEnabled ? '#dcfce7' : '#f5f5f4',
              color: soundEnabled ? '#15803d' : '#78716c',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
            title="Activar/Desactivar sonido de timbre de mensaje"
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span>{soundEnabled ? 'Timbre Activo' : 'Silenciado'}</span>
          </button>

          <button
            onClick={handleRequestPush}
            style={{
              padding: '0.5rem 0.85rem',
              fontSize: '0.75rem',
              fontWeight: 800,
              borderRadius: '10px',
              border: '1px solid #fed7aa',
              background: '#fff7ed',
              color: '#c2410c',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
            title="Solicitar permiso de notificaciones push en este móvil"
          >
            <Bell size={15} />
            <span>{pushEnabled ? 'Push OK' : 'Activar Push'}</span>
          </button>
        </div>
      </div>

      {/* Main Chat Hub Container (Responsive: Flex Row on Desktop, Single View on Mobile) */}
      <div 
        ref={mainContainerRef}
        className="glass"
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          minHeight: '620px',
          height: isMobile ? 'calc(100vh - 200px)' : '680px',
          borderRadius: '20px',
          overflow: 'hidden',
          background: '#ffffff',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid rgba(214, 204, 194, 0.9)',
          position: 'relative'
        }}
      >
        
        {/* LEFT COLUMN: Inbox Threads List (Hidden on Mobile when Chat View is Active) */}
        {(!isMobile || !showMobileChat) && (
          <div style={{
            width: isMobile ? '100%' : '350px',
            minWidth: isMobile ? '100%' : '350px',
            maxWidth: isMobile ? '100%' : '350px',
            flexShrink: 0,
            borderRight: isMobile ? 'none' : '1px solid var(--glass-border)',
            display: 'flex',
            flexDirection: 'column',
            background: '#faf8f5',
            height: '100%',
            overflow: 'hidden'
          }}>
            
            {/* Search & Filter Header */}
            <div style={{ padding: '1.15rem', borderBottom: '1px solid var(--glass-border)', background: '#ffffff' }}>
              <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#a8a29e' }} />
                <input 
                  type="text"
                  className="input-field"
                  placeholder="Buscar cliente o mensaje..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: '2.25rem', fontSize: '0.85rem', padding: '0.6rem 0.6rem 0.6rem 2.25rem', borderRadius: '10px' }}
                />
              </div>

              {/* Filter tabs */}
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <button 
                  onClick={() => setFilterMode('active')}
                  style={{
                    flex: 1,
                    padding: '0.45rem 0.2rem',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    borderRadius: '8px',
                    border: 'none',
                    background: filterMode === 'active' ? '#ea580c' : '#f5f5f4',
                    color: filterMode === 'active' ? '#ffffff' : '#78716c',
                    cursor: 'pointer'
                  }}
                >
                  Activos ({totalActive})
                </button>

                <button 
                  onClick={() => setFilterMode('attention')}
                  style={{
                    flex: 1,
                    padding: '0.45rem 0.2rem',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    borderRadius: '8px',
                    border: 'none',
                    background: filterMode === 'attention' ? '#ef4444' : '#f5f5f4',
                    color: filterMode === 'attention' ? '#ffffff' : '#78716c',
                    cursor: 'pointer'
                  }}
                >
                  ⚠️ Atención ({totalAttention})
                </button>

                <button 
                  onClick={() => setFilterMode('archived')}
                  style={{
                    flex: 1,
                    padding: '0.45rem 0.2rem',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    borderRadius: '8px',
                    border: 'none',
                    background: filterMode === 'archived' ? '#57534e' : '#f5f5f4',
                    color: filterMode === 'archived' ? '#ffffff' : '#78716c',
                    cursor: 'pointer'
                  }}
                >
                  Archivados
                </button>
              </div>
            </div>

            {/* Threads List */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              {filteredThreads.length === 0 ? (
                <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: '#a8a29e', fontSize: '0.85rem' }}>
                  No hay conversaciones en esta bandeja.
                </div>
              ) : (
                filteredThreads.map(thread => {
                  const isSelected = thread.id === selectedThreadId && !isMobile;
                  const lastMsg = thread.messages[thread.messages.length - 1];

                  return (
                    <div
                      key={thread.id}
                      onClick={() => handleSelectThread(thread.id)}
                      style={{
                        padding: '1rem 1.15rem',
                        borderBottom: '1px solid #f0ede6',
                        background: isSelected ? '#fff7ed' : '#ffffff',
                        borderLeft: isSelected ? '4px solid #ea580c' : '4px solid transparent',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1c1917', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          {thread.visitorName}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#a8a29e', fontFamily: 'monospace' }}>
                          {lastMsg?.timestamp || ''}
                        </span>
                      </div>

                      {thread.needsHumanAttention && thread.status !== 'archived' && (
                        <div style={{ fontSize: '0.75rem', color: '#b91c1c', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.25rem' }}>
                          <AlertTriangle size={13} /> Requiere atención humana
                        </div>
                      )}

                      <p style={{ 
                        fontSize: '0.8rem', 
                        color: thread.unreadByAdmin > 0 ? '#1c1917' : '#78716c', 
                        fontWeight: thread.unreadByAdmin > 0 ? 800 : 500,
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
                          background: thread.status === 'archived' ? '#f5f5f4' : thread.mode === 'human' ? '#dcfce7' : '#ffedd5',
                          color: thread.status === 'archived' ? '#78716c' : thread.mode === 'human' ? '#15803d' : '#c2410c',
                          fontWeight: 700
                        }}>
                          {thread.status === 'archived' ? '📁 Finalizado' : thread.mode === 'human' ? '👨‍💻 Operador Activo' : '🤖 Asistente Bot'}
                        </span>

                        {thread.unreadByAdmin > 0 && (
                          <span style={{
                            background: '#ef4444',
                            color: '#ffffff',
                            fontSize: '0.7rem',
                            fontWeight: 900,
                            padding: '0.15rem 0.5rem',
                            borderRadius: '999px',
                            boxShadow: '0 2px 5px rgba(239, 68, 68, 0.3)'
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
        )}

        {/* RIGHT COLUMN: Active Chat Conversation (Full screen on Mobile when Active) */}
        {(!isMobile || showMobileChat) && (
          <div style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            background: '#faf8f5',
            overflow: 'hidden'
          }}>
            {selectedThread ? (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', overflow: 'hidden' }}>
              
              {/* Thread Header */}
              <div style={{
                padding: '0.9rem 1.25rem',
                borderBottom: '1px solid var(--glass-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#ffffff',
                flexWrap: 'wrap',
                gap: '0.6rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  {isMobile && (
                    <button
                      onClick={handleBackToInboxMobile}
                      style={{
                        background: '#f5f5f4',
                        border: '1px solid #e7e2d9',
                        borderRadius: '8px',
                        padding: '0.4rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#44403c'
                      }}
                      title="Volver a la lista de mensajes"
                    >
                      <ArrowLeft size={18} />
                    </button>
                  )}

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 800, color: '#1c1917' }}>
                        {selectedThread.visitorName}
                      </h3>
                      {selectedThread.currentRoute && (
                        <span style={{ fontSize: '0.7rem', background: '#f5f5f4', color: '#78716c', padding: '0.15rem 0.5rem', borderRadius: '6px', fontWeight: 600 }}>
                          📍 {selectedThread.currentRoute}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#a8a29e' }}>
                      {selectedThread.mode === 'human' ? '👨‍💻 Atendido por Administrador' : '🤖 Atendido por Bot IA'}
                    </div>
                  </div>
                </div>

                {/* Actions Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {selectedThread.status !== 'archived' ? (
                    <>
                      <button
                        onClick={handleToggleMode}
                        style={{
                          padding: '0.4rem 0.8rem',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          borderRadius: '10px',
                          border: selectedThread.mode === 'human' ? '1px solid #86efac' : '1px solid #fed7aa',
                          background: selectedThread.mode === 'human' ? '#dcfce7' : '#fff7ed',
                          color: selectedThread.mode === 'human' ? '#15803d' : '#c2410c',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem'
                        }}
                      >
                        {selectedThread.mode === 'human' ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                        <span>{selectedThread.mode === 'human' ? 'Modo Humano' : 'Modo Bot'}</span>
                      </button>

                      <button
                        onClick={handleArchiveThread}
                        style={{
                          padding: '0.4rem 0.75rem',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          borderRadius: '10px',
                          border: '1px solid #fecaca',
                          background: '#fef2f2',
                          color: '#dc2626',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}
                        title="Finalizar y archivar chat"
                      >
                        <Archive size={14} /> Finalizar
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleReopenThread}
                      className="btn btn-secondary"
                      style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
                    >
                      <RefreshCw size={14} /> Reabrir Chat
                    </button>
                  )}
                </div>
              </div>

              {/* Escalation alert banner if needed */}
              {selectedThread.needsHumanAttention && selectedThread.status !== 'archived' && (
                <div style={{ background: '#fef2f2', borderBottom: '1px solid #fecaca', padding: '0.65rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#991b1b', fontSize: '0.8rem', fontWeight: 700 }}>
                    <AlertTriangle size={15} />
                    <span>El cliente solicita atención personalizada</span>
                  </div>
                  <button 
                    onClick={() => { setThreadMode(selectedThread.id, 'human'); loadThreads(); }}
                    style={{
                      padding: '0.35rem 0.75rem',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      borderRadius: '8px',
                      border: 'none',
                      background: '#ea580c',
                      color: '#ffffff',
                      cursor: 'pointer'
                    }}
                  >
                    Tomar Control
                  </button>
                </div>
              )}

              {/* Messages Scroll Area */}
              <div 
                ref={messagesContainerRef}
                style={{
                  flex: 1,
                  padding: '1.25rem',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                  background: '#faf8f5'
                }}>
                {selectedThread.messages.map(msg => {
                  const isAdmin = msg.sender === 'admin';
                  const isBot = msg.sender === 'bot';
                  const isSystem = msg.sender === 'system';

                  if (isSystem) {
                    return (
                      <div key={msg.id} style={{ textAlign: 'center', margin: '0.4rem 0' }}>
                        <span style={{ fontSize: '0.7rem', background: '#e7e5e4', color: '#57534e', padding: '0.25rem 0.75rem', borderRadius: '999px', fontWeight: 600 }}>
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
                        maxWidth: isMobile ? '88%' : '80%',
                        alignSelf: isAdmin ? 'flex-end' : 'flex-start'
                      }}
                    >
                      <div style={{ fontSize: '0.7rem', color: '#a8a29e', marginBottom: '0.15rem', padding: '0 0.3rem', fontWeight: 600 }}>
                        {isAdmin ? '👤 Tú' : isBot ? '🤖 Guillermo (IA)' : `💬 ${msg.senderName || selectedThread.visitorName}`}
                      </div>

                      <div style={{
                        padding: '0.75rem 1rem',
                        borderRadius: isAdmin ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        background: isAdmin 
                          ? 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)' 
                          : '#ffffff',
                        color: isAdmin ? '#ffffff' : '#1c1917',
                        fontSize: '0.875rem',
                        lineHeight: 1.5,
                        boxShadow: isAdmin ? '0 3px 10px rgba(234, 88, 12, 0.25)' : '0 1px 4px rgba(0,0,0,0.05)',
                        border: isAdmin ? 'none' : '1px solid #e7e2d9',
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-line'
                      }}>
                        {msg.text}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.65rem', color: '#a8a29e', marginTop: '0.15rem', padding: '0 0.3rem' }}>
                        <span>{msg.timestamp}</span>
                        {isAdmin && <CheckCheck size={12} color="#ea580c" />}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quick Templates Bar (Scrollable Pills for 1-Tap Answers on Mobile) */}
              {selectedThread.status !== 'archived' && (
                <div style={{
                  padding: '0.5rem 0.85rem',
                  background: '#ffffff',
                  borderTop: '1px solid #e7e2d9',
                  display: 'flex',
                  gap: '0.45rem',
                  overflowX: 'auto',
                  whiteSpace: 'nowrap',
                  scrollbarWidth: 'none'
                }}>
                  <span style={{ fontSize: '0.75rem', color: '#ea580c', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
                    <Zap size={14} /> Respuestas Rápidas:
                  </span>
                  {QUICK_TEMPLATES.map((tmpl, i) => (
                    <button
                      key={i}
                      onClick={() => handleSendMessage(tmpl.text)}
                      style={{
                        background: '#faf8f5',
                        border: '1px solid #fed7aa',
                        borderRadius: '20px',
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: '#c2410c',
                        cursor: 'pointer',
                        flexShrink: 0,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                        transition: 'all 0.15s ease'
                      }}
                      title={tmpl.text}
                    >
                      {tmpl.title}
                    </button>
                  ))}
                </div>
              )}

              {/* Reply Input Bar */}
              {selectedThread.status === 'archived' ? (
                <div style={{ padding: '1rem', background: '#ffffff', textAlign: 'center', borderTop: '1px solid #e7e2d9', color: '#78716c', fontSize: '0.85rem' }}>
                  Esta conversación ha sido archivada.{' '}
                  <button 
                    onClick={handleReopenThread} 
                    style={{ background: 'none', border: 'none', color: '#ea580c', fontWeight: 800, cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Reabrir
                  </button>
                </div>
              ) : (
                <div style={{
                  padding: '0.75rem 1rem',
                  background: '#ffffff',
                  borderTop: '1px solid #e7e2d9',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem'
                }}>
                  <form 
                    onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%' }}
                  >
                    <input 
                      ref={inputRef}
                      type="text"
                      className="input-field"
                      placeholder="Escribe tu respuesta como Administrador..."
                      value={inputText}
                      onChange={e => setInputText(e.target.value)}
                      autoComplete="off"
                      enterKeyHint="send"
                      style={{ flex: 1, padding: '0.75rem 1rem', fontSize: '0.9rem', borderRadius: '12px' }}
                    />
                    <button
                      type="submit"
                      disabled={!inputText.trim()}
                      className="btn btn-primary"
                      style={{
                        padding: '0.75rem 1.1rem',
                        fontSize: '0.85rem',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        flexShrink: 0
                      }}
                    >
                      <Send size={16} />
                      {!isMobile && <span>Enviar</span>}
                    </button>
                  </form>
                </div>
              )}

            </div>
          ) : (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#a8a29e', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '0.75rem' }}>
              <MessageSquare size={36} color="#d6d3d1" />
              <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>Selecciona una conversación para responder</div>
            </div>
          )}
        </div>
      )}

      </div>
    </div>
  );
};
export default AdminChatManager;
