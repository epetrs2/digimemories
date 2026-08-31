import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  MessageSquare, 
  X, 
  Send, 
  RefreshCw
} from 'lucide-react';
import { 
  getOrCreateVisitorThread, 
  addMessageToThread, 
  triggerHumanEscalation,
  markThreadAsReadByVisitor
} from '../lib/chatStore';
import type { ChatMessage, ChatThread } from '../lib/chatStore';

const FAQ_SUGGESTIONS = [
  "¿Cuánto cuesta digitalizar mis cintas?",
  "¿Cómo entregan los archivos finales?",
  "¿Qué formatos de cinta aceptan?",
  "¿Qué pasa si mi cinta tiene moho?",
  "¿Cómo funciona el rastreo de mi orden?",
  "Hablar con un asesor humano"
];

const BOT_KNOWLEDGE: { keywords: string[]; answer: string }[] = [
  {
    keywords: ['precio', 'costo', 'cuanto cuesta', 'tarifa', 'cotizar', 'presupuesto', 'vale'],
    answer: 'Nuestra tarifa base es de **$200 MXN por cinta** (VHS, Beta, Hi8, MiniDV) que incluye hasta 2 horas de digitalización en MP4. Discos DVD a $150 MXN y fotos sueltas a $7 MXN. Si tu cinta dura más de 2h, solo se cobran $50 MXN por hora adicional.'
  },
  {
    keywords: ['entrega', 'usb', 'disco duro', 'formato', 'mp4', 'donde guardan'],
    answer: 'Entregamos tus videos en archivos digitales **MP4 de alta fidelidad** compatibles con Smart TV, computadoras y celulares. Por privacidad y calidad, la entrega es estrictamente física en una memoria USB o Disco Duro. ¡Y te devolvemos todas tus cintas originales intactas!'
  },
  {
    keywords: ['formato', 'vhs', 'beta', 'betamax', 'hi8', 'minidv', 'video8', 'dvd', 'super 8', '8mm'],
    answer: 'Digitalizamos: **VHS, VHS-C, Betamax, Video8, Hi8, Digital8, MiniDV, discos DVD y escaneo de fotos y álbumes**. Todos son capturados en tiempo real 1:1 con equipo profesional.'
  },
  {
    keywords: ['moho', 'hongo', 'rota', 'reparar', 'limpiar', 'danada', 'daño', 'sirve'],
    answer: 'Inspeccionamos cada cinta sin costo. Si una cinta presenta daño físico severo o moho excesivo que impida su lectura segura, te lo notificamos y **no se cobra esa unidad**. No realizamos reparaciones químicas invasivas.'
  },
  {
    keywords: ['tiempo', 'cuanto tarda', 'demora', 'dias', 'plazo', 'urgente'],
    answer: 'El tiempo promedio de entrega es de **3 a 7 días hábiles**, dependiendo de la cantidad de cintas en tu lote. Como digitalizamos a velocidad real 1:1, garantizamos máxima calidad sin aceleraciones destructivas.'
  },
  {
    keywords: ['rastreo', 'rastrear', 'id', 'pin', 'seguimiento', 'estado', 'donde va'],
    answer: 'Al generar tu cotización obtienes un **Número de Rastreo único de 6 dígitos**. Cuando abonas tu anticipo, te entregamos tu PIN de 4 dígitos para ver el estatus de cada cinta en tiempo real en nuestro portal.'
  },
  {
    keywords: ['mejora', 'color', 'audio', 'remasterizar', 'calidad', 'filtro', 'restaurar'],
    answer: 'Ofrecemos el servicio opcional de **Mejora Premium de Color y Audio** ($150 MXN adicionales por cinta) que aplica corrección de saturación, estabilización de brillo y reducción de ruido analógico.'
  },
  {
    keywords: ['donde estan', 'ubicacion', 'direccion', 'sucursal', 'taller', 'horario'],
    answer: 'Nuestro taller principal se encuentra en **Av. Insurgentes Sur #450, Col. Roma Sur, CDMX**. Recibimos material de Lunes a Sábado de 10:00 a 18:00 hrs.'
  },
  {
    keywords: ['hola', 'buenas', 'buen dia', 'saludos', 'que tal'],
    answer: '¡Hola! 👋 Qué gusto saludarte. Soy Guillermo de DigiMemories. ¿Tienes cintas familiares antiguas (VHS, Beta, Hi8) o fotografías que quieras digitalizar?'
  },
  {
    keywords: ['gracias', 'muchas gracias', 'perfecto', 'excelente', 'ok', 'de acuerdo'],
    answer: '¡Con todo gusto! Estamos listos para ayudarte a revivir tus mejores recuerdos familiares. Si tienes cualquier otra pregunta, aquí estaré.'
  }
];

const HUMAN_REQUEST_KEYWORDS = [
  'humano', 'persona', 'asesor', 'agente', 'administrador', 'alguien', 'no entiendes', 
  'factura', 'rfc', 'descuento especial', 'mayoreo', 'paquete especial', 'queja', 'reclamo',
  'uber flash', 'paqueteria urgente', 'cotizacion especial'
];

const LiveChat: React.FC = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [showTeaser, setShowTeaser] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [thread, setThread] = useState<ChatThread | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const syncThread = () => {
    const current = getOrCreateVisitorThread('Visitante', location.pathname);
    setThread(current);
  };

  useEffect(() => {
    syncThread();

    const handleSync = () => syncThread();
    window.addEventListener('digimemories_chat_sync', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      window.removeEventListener('digimemories_chat_sync', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [location.pathname]);

  // Show teaser after 4s
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isOpen && (!thread || thread.messages.length <= 1)) {
        setShowTeaser(true);
      }
    }, 4000);
    return () => clearTimeout(timer);
  }, [isOpen, thread?.messages.length]);

  // Scroll to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [thread?.messages.length, isTyping, isOpen]);

  // Clear unread when opened
  useEffect(() => {
    if (isOpen && thread) {
      setShowTeaser(false);
      markThreadAsReadByVisitor(thread.id);
      syncThread();
      setTimeout(() => inputRef.current?.focus(), 250);
    }
  }, [isOpen]);

  const handleSendMessage = (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query || !thread) return;

    // 1. Add visitor message
    addMessageToThread(thread.id, 'visitor', query, 'Tú');
    if (!textToSend) setInputText('');
    syncThread();

    // 2. If already in human mode or thread is archived, do not auto-respond with bot
    if (thread.mode === 'human' || thread.status === 'archived') {
      return;
    }

    // 3. Bot evaluation
    setIsTyping(true);

    setTimeout(() => {
      const lower = query.toLowerCase();

      // Check if user explicitly wants human or asked complex out-of-scope query
      const wantsHuman = HUMAN_REQUEST_KEYWORDS.some(k => lower.includes(k));
      
      let matchedResponse = BOT_KNOWLEDGE.find(item => 
        item.keywords.some(k => lower.includes(k))
      );

      if (wantsHuman || !matchedResponse) {
        // Bot is NOT capable of answering or human is requested -> ESCALATE TO ADMIN!
        triggerHumanEscalation(thread.id, query);
      } else {
        // Bot answers accurately
        addMessageToThread(thread.id, 'bot', matchedResponse.answer, 'Guillermo (Asistente)');
      }

      setIsTyping(false);
      syncThread();
    }, 750);
  };

  const handleStartNewChat = () => {
    localStorage.removeItem('digimemories_current_visitor_id');
    const fresh = getOrCreateVisitorThread('Visitante', location.pathname);
    setThread(fresh);
  };

  const isContactPage = location.pathname === '/contact';
  const bottomOffset = isContactPage ? '96px' : '24px';

  const unreadCount = thread?.unreadByVisitor || 0;
  const isHumanMode = thread?.mode === 'human';
  const isArchived = thread?.status === 'archived';

  return (
    <div style={{ position: 'fixed', bottom: bottomOffset, right: '24px', zIndex: 999, transition: 'bottom 0.3s ease' }}>
      
      {/* Floating Teaser Greeting Bubble */}
      {showTeaser && !isOpen && (
        <div 
          className="glass animate-on-load"
          style={{
            position: 'absolute',
            bottom: '70px',
            right: '0',
            width: '290px',
            padding: '1rem 1.25rem',
            borderRadius: '18px',
            background: '#ffffff',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid rgba(234, 88, 12, 0.3)',
            cursor: 'pointer'
          }}
          onClick={() => setIsOpen(true)}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }} />
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-color)' }}>Asesor en Vivo</span>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); setShowTeaser(false); }}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
            >
              <X size={14} />
            </button>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', margin: 0, lineHeight: 1.4, fontWeight: 500 }}>
            ¿Tienes dudas sobre cómo rescatar tus cintas VHS o fotos? ¡Pregúntame aquí!
          </p>
        </div>
      )}

      {/* Main Launcher Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="btn btn-primary animate-pulse-glow"
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 25px rgba(234, 88, 12, 0.4)',
            position: 'relative',
            cursor: 'pointer'
          }}
          aria-label="Abrir chat en vivo"
        >
          <MessageSquare size={26} color="#ffffff" />
          
          <span style={{
            position: 'absolute',
            top: '2px',
            right: '2px',
            width: '14px',
            height: '14px',
            borderRadius: '50%',
            background: '#22c55e',
            border: '2px solid #ffffff'
          }} />

          {unreadCount > 0 && (
            <span style={{
              position: 'absolute',
              top: '-4px',
              left: '-4px',
              background: '#ef4444',
              color: '#ffffff',
              fontSize: '0.75rem',
              fontWeight: 800,
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #ffffff'
            }}>
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Open Chat Window */}
      {isOpen && (
        <div 
          className="glass animate-on-load"
          style={{
            width: '380px',
            maxWidth: 'calc(100vw - 32px)',
            height: '560px',
            maxHeight: 'calc(100vh - 120px)',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '24px',
            overflow: 'hidden',
            background: '#ffffff',
            boxShadow: '0 20px 50px rgba(28, 25, 23, 0.25)',
            border: '1px solid rgba(214, 204, 194, 0.8)'
          }}
        >
          {/* Chat Header */}
          <div style={{
            padding: '1.15rem 1.25rem',
            background: isHumanMode ? 'var(--accent-light)' : 'var(--bg-base)',
            borderBottom: '1px solid var(--glass-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ position: 'relative' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: '#ffffff',
                  border: isHumanMode ? '2px solid var(--accent-color)' : '1.5px solid var(--glass-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  color: 'var(--accent-color)',
                  fontSize: '1rem',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  {isHumanMode ? '👨‍💻' : '📼'}
                </div>
                <span style={{
                  position: 'absolute',
                  bottom: '0',
                  right: '0',
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: isArchived ? '#a8a29e' : '#22c55e',
                  border: '2px solid #ffffff'
                }} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: 1.2 }}>
                  {isHumanMode ? 'Operador en Vivo' : 'Guillermo'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  {isArchived ? (
                    <span style={{ color: 'var(--text-muted)' }}>Conversación Finalizada</span>
                  ) : isHumanMode ? (
                    <span style={{ color: 'var(--accent-color)', fontWeight: 700 }}>• Atendido por Administrador</span>
                  ) : (
                    <span>Especialista en Preservación</span>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <button 
                onClick={handleStartNewChat}
                title="Iniciar nuevo chat"
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.4rem', borderRadius: '6px' }}
              >
                <RefreshCw size={16} />
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                title="Cerrar ventana"
                style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '0.4rem', borderRadius: '6px' }}
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Quick FAQ Suggestion Carousel/Pills */}
          {!isArchived && (
            <div style={{
              padding: '0.6rem 0.85rem',
              background: 'var(--bg-secondary)',
              borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
              display: 'flex',
              gap: '0.5rem',
              overflowX: 'auto',
              whiteSpace: 'nowrap',
              scrollbarWidth: 'none'
            }}>
              {FAQ_SUGGESTIONS.map((sug, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(sug)}
                  style={{
                    background: '#ffffff',
                    border: '1px solid rgba(214, 204, 194, 0.7)',
                    borderRadius: '999px',
                    padding: '0.3rem 0.75rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    flexShrink: 0,
                    transition: 'all 0.2s'
                  }}
                >
                  {sug}
                </button>
              ))}
            </div>
          )}

          {/* Messages Container */}
          <div style={{
            flex: 1,
            padding: '1.25rem',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            background: '#ffffff'
          }}>
            {thread?.messages.map((msg: ChatMessage) => {
              const isVisitor = msg.sender === 'visitor';
              const isAdmin = msg.sender === 'admin';
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
                    alignItems: isVisitor ? 'flex-end' : 'flex-start',
                    maxWidth: '88%',
                    alignSelf: isVisitor ? 'flex-end' : 'flex-start'
                  }}
                >
                  {!isVisitor && (
                    <span style={{ fontSize: '0.7rem', color: isAdmin ? 'var(--accent-color)' : 'var(--text-muted)', fontWeight: isAdmin ? 700 : 500, marginBottom: '0.2rem', padding: '0 0.35rem' }}>
                      {isAdmin ? '👨‍💻 Operador Admin' : 'Guillermo (Asistente)'}
                    </span>
                  )}

                  <div style={{
                    padding: '0.85rem 1.15rem',
                    borderRadius: isVisitor ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    background: isVisitor ? 'var(--accent-color)' : isAdmin ? 'var(--accent-light)' : 'var(--bg-secondary)',
                    color: isVisitor ? '#ffffff' : 'var(--text-primary)',
                    fontSize: '0.92rem',
                    lineHeight: 1.55,
                    border: isAdmin ? '1px solid rgba(234, 88, 12, 0.3)' : 'none',
                    boxShadow: isVisitor ? '0 4px 12px var(--accent-glow)' : 'var(--shadow-sm)'
                  }}>
                    {msg.text.split('**').map((part, idx) => 
                      idx % 2 === 1 ? <strong key={idx}>{part}</strong> : part
                    )}
                  </div>

                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem', padding: '0 0.35rem' }}>
                    {msg.timestamp}
                  </span>
                </div>
              );
            })}

            {/* Typing indicator */}
            {isTyping && (
              <div style={{
                alignSelf: 'flex-start',
                padding: '0.65rem 1rem',
                background: 'var(--bg-secondary)',
                borderRadius: '16px 16px 16px 4px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-color)', animation: 'pulseGlow 1.2s infinite' }} />
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-color)', animation: 'pulseGlow 1.2s infinite 0.2s' }} />
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-color)', animation: 'pulseGlow 1.2s infinite 0.4s' }} />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '6px' }}>Escribiendo respuesta...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Bar or Archived Banner */}
          {isArchived ? (
            <div style={{ padding: '1rem', background: 'var(--bg-secondary)', textAlign: 'center', borderTop: '1px solid var(--glass-border)' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 0.5rem 0' }}>
                Esta conversación ha concluido.
              </p>
              <button 
                onClick={handleStartNewChat} 
                className="btn btn-primary"
                style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
              >
                <RefreshCw size={14} /> Iniciar nuevo chat
              </button>
            </div>
          ) : (
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
              style={{
                padding: '0.85rem 1rem',
                background: 'var(--bg-base)',
                borderTop: '1px solid var(--glass-border)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem'
              }}
            >
              <input 
                ref={inputRef}
                type="text" 
                className="input-field" 
                placeholder="Escribe tu duda o pregunta..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                style={{
                  padding: '0.65rem 0.95rem',
                  fontSize: '0.9rem',
                  borderRadius: '12px'
                }}
              />

              <button
                type="submit"
                disabled={!inputText.trim()}
                className="btn btn-primary"
                style={{
                  width: '42px',
                  height: '42px',
                  padding: 0,
                  borderRadius: '12px',
                  flexShrink: 0,
                  opacity: !inputText.trim() ? 0.4 : 1,
                  cursor: !inputText.trim() ? 'default' : 'pointer'
                }}
                aria-label="Enviar mensaje"
              >
                <Send size={18} />
              </button>
            </form>
          )}

        </div>
      )}

    </div>
  );
};

export default LiveChat;
