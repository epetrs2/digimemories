import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  MessageSquare, 
  X, 
  Send, 
  RefreshCw,
  Sparkles,
  ArrowRight,
  Camera
} from 'lucide-react';
import { 
  getOrCreateVisitorThread, 
  addMessageToThread, 
  triggerHumanEscalation,
  markThreadAsReadByVisitor,
  setThreadMode
} from '../lib/chatStore';
import type { ChatThread } from '../lib/chatStore';
import { getBotResponse, type BotReplyResult } from '../lib/botTrainer';
import { askGeminiAssistant } from '../lib/geminiService';
import { linkChatThreadToPresence, reportVisitorAction } from '../lib/visitorPresence';

const FAQ_SUGGESTIONS = [
  "¿Cuánto cuesta digitalizar mis cintas?",
  "¿Cómo entregan los archivos finales?",
  "¿Qué formatos de cinta aceptan?",
  "¿Qué pasa si mi cinta tiene moho?",
  "¿Tienen servicio a domicilio?",
  "Hablar con un asesor humano"
];

export const LiveChat: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [showTeaser, setShowTeaser] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [thread, setThread] = useState<ChatThread | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [activeQuickReplies, setActiveQuickReplies] = useState<{ label: string; action: string }[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const syncThread = () => {
    const current = getOrCreateVisitorThread('Visitante', location.pathname);
    setThread(current);
    if (current && current.id) {
      linkChatThreadToPresence(current.id);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 12 * 1024 * 1024) {
      alert('La imagen no debe superar los 12MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1200;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setSelectedImage(dataUrl);
        } else {
          setSelectedImage(reader.result as string);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
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

  // Show teaser after 3.5s
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isOpen && (!thread || thread.messages.length <= 1)) {
        setShowTeaser(true);
      }
    }, 3500);
    return () => clearTimeout(timer);
  }, [isOpen, thread?.messages.length]);

  // Scroll to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [thread?.messages.length, isTyping, isOpen, activeQuickReplies, selectedImage]);

  // Clear unread when opened
  useEffect(() => {
    if (isOpen && thread) {
      setShowTeaser(false);
      markThreadAsReadByVisitor(thread.id);
      syncThread();
      setTimeout(() => inputRef.current?.focus(), 250);
    }
  }, [isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    const imageToSend = selectedImage;

    if ((!query && !imageToSend) || !thread) return;

    setActiveQuickReplies([]);
    setSelectedImage(null);

    // 1. Add visitor message (with photo if present)
    const userDisplayMsg = query || (imageToSend ? '📸 Te adjunto esta fotografía de mis cintas para que me digas qué formato son y su estado.' : '');
    addMessageToThread(thread.id, 'visitor', userDisplayMsg, 'Tú', imageToSend || undefined);
    reportVisitorAction(query ? `Escribió en chat: "${query.substring(0, 32)}..."` : 'Adjuntó imagen en chat', 'Chat en Vivo');
    if (!textToSend) setInputText('');
    syncThread();

    // 2. If thread is archived, skip automated bot response
    if (thread.status === 'archived') {
      return;
    }

    // If an admin has actively replied, let them converse; otherwise allow Guillermo (IA) to assist
    const hasAdminReplied = thread.messages.some(m => m.sender === 'admin');
    if (thread.mode === 'human' && hasAdminReplied) {
      return;
    }

    // 3. Intelligent bot evaluation (Gemini Flash Multimodal with fallback to botTrainer)
    setIsTyping(true);

    try {
      const geminiReply = await askGeminiAssistant(query, imageToSend || undefined);

      if (geminiReply) {
        addMessageToThread(thread.id, 'bot', geminiReply, 'Guillermo (IA)');
      } else {
        // Fallback to rule engine
        const result: BotReplyResult = getBotResponse(query || (imageToSend ? 'fotos' : ''));
        if (result.isEscalation) {
          triggerHumanEscalation(thread.id, query || 'Consulta con fotografía adjunta');
        } else {
          let botText = result.text;
          if (imageToSend && !query) {
            botText = `📸 **Fotografía de recuerdos recibida.**\n\nHe recibido la imagen de tus cintas. Un especialista de nuestro laboratorio inspeccionará el formato y su estado físico en breve.\n\n` + botText;
          }
          addMessageToThread(thread.id, 'bot', botText, 'Guillermo (Asistente)');
        }

        if (result.quickReplies && result.quickReplies.length > 0) {
          setActiveQuickReplies(result.quickReplies);
        }
      }
    } catch (err) {
      console.warn('Error en respuesta del asistente:', err);
      const result = getBotResponse(query || 'fotos');
      addMessageToThread(thread.id, 'bot', result.text, 'Guillermo (Asistente)');
    } finally {
      setIsTyping(false);
      syncThread();
    }
  };

  const renderFormattedMessage = (text: string, isMe: boolean) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      // Format bold, italic, code, and markdown links
      const parts = line.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`|\[.*?\]\(.*?\))/g);
      const formatted = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
          return <strong key={pIdx} style={{ fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**') && part.length >= 2) {
          return <em key={pIdx}>{part.slice(1, -1)}</em>;
        }
        if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
          return (
            <code 
              key={pIdx} 
              style={{ 
                background: isMe ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.06)', 
                padding: '0.1rem 0.35rem', 
                borderRadius: '4px', 
                fontFamily: 'monospace',
                fontSize: '0.85em'
              }}
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
          const linkText = part.slice(1, part.indexOf(']('));
          const linkUrl = part.slice(part.indexOf('](') + 2, -1);
          return (
            <a 
              key={pIdx} 
              href={linkUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ 
                color: isMe ? '#ffffff' : '#ea580c', 
                fontWeight: 700, 
                textDecoration: 'underline' 
              }}
            >
              {linkText}
            </a>
          );
        }
        return part;
      });

      return (
        <React.Fragment key={idx}>
          {formatted}
          {idx < lines.length - 1 && <br />}
        </React.Fragment>
      );
    });
  };

  const handleQuickAction = (action: string, label: string) => {
    if (action === 'NAVIGATE_CALCULATOR') {
      navigate('/#calculator');
      const calcEl = document.getElementById('calculator');
      if (calcEl) calcEl.scrollIntoView({ behavior: 'smooth' });
    } else if (action === 'NAVIGATE_TRACK') {
      navigate('/track');
    } else if (action === 'NAVIGATE_CONTACT') {
      navigate('/contact');
    } else if (action === 'WHATSAPP_CONTACT') {
      window.open('https://wa.me/525548889876?text=Hola%2C%20quisiera%20informaci%C3%B3n%20sobre%20la%20digitalizaci%C3%B3n%20de%20mis%20recuerdos', '_blank');
    } else if (action === 'REQUEST_HUMAN') {
      if (thread) triggerHumanEscalation(thread.id, 'Petición de asesor humano');
    } else if (action === 'LOCATION_INFO') {
      handleSendMessage('¿Dónde están ubicados y cómo entrego mis cintas?');
    } else if (action === 'UBER_FLASH_INFO' || action === 'HOME_PICKUP_INFO') {
      handleSendMessage('¿Cómo funciona el envío por Uber Flash a domicilio?');
    } else if (action === 'NATIONAL_SHIPPING') {
      handleSendMessage('¿Cómo son los envíos a provincia por paquetería?');
    } else if (action === 'FORMATS_INFO') {
      handleSendMessage('¿Qué formatos de video y fotos aceptan?');
    } else if (action === 'MOLD_SAFETY') {
      handleSendMessage('¿Qué pasa si mis cintas tienen moho o daño?');
    } else if (action === 'TURNAROUND_TIME') {
      handleSendMessage('¿Cuánto tiempo tarda la digitalización?');
    } else {
      handleSendMessage(label);
    }
  };

  const handleStartNewChat = () => {
    localStorage.removeItem('digimemories_current_visitor_id');
    const fresh = getOrCreateVisitorThread('Visitante', location.pathname);
    fresh.mode = 'bot';
    fresh.needsHumanAttention = false;
    setThread(fresh);
    setActiveQuickReplies([]);
  };

  const handleSwitchToBot = () => {
    if (!thread) return;
    setThreadMode(thread.id, 'bot');
    addMessageToThread(thread.id, 'system', 'Has vuelto a conectar con Guillermo (Asistente IA).');
    syncThread();
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
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-color)' }}>Guillermo • Asesor IA</span>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); setShowTeaser(false); }}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
            >
              <X size={14} />
            </button>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', margin: 0, lineHeight: 1.4, fontWeight: 500 }}>
            ¿Tienes dudas sobre cómo digitalizar tus cintas VHS, Betamax o fotos? ¡Escríbeme y te cotizo al instante!
          </p>
        </div>
      )}

      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Abrir chat de ayuda"
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
            color: '#ffffff',
            border: 'none',
            boxShadow: '0 10px 25px rgba(234, 88, 12, 0.4)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <MessageSquare size={26} />
          
          <span style={{
            position: 'absolute',
            bottom: '2px',
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
            width: '390px',
            maxWidth: 'calc(100vw - 32px)',
            height: '580px',
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
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: 1.2, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {isHumanMode ? 'Operador en Vivo' : 'Guillermo (IA)'}
                  {!isHumanMode && <Sparkles size={13} className="text-orange-500 inline" />}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  {isArchived ? (
                    <span style={{ color: 'var(--text-muted)' }}>Conversación Finalizada</span>
                  ) : isHumanMode ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ color: 'var(--accent-color)', fontWeight: 700 }}>• Modo Operador</span>
                      <button
                        onClick={handleSwitchToBot}
                        style={{
                          background: '#ffedd5',
                          color: '#c2410c',
                          border: '1px solid #fed7aa',
                          borderRadius: '6px',
                          padding: '0.1rem 0.4rem',
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                        title="Conectar con Guillermo IA"
                      >
                        Volver a IA
                      </button>
                    </div>
                  ) : (
                    <span>Cotizador & Especialista 24/7</span>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <button 
                onClick={handleStartNewChat}
                title="Reiniciar conversación"
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

          {/* Quick FAQ Suggestion Carousel */}
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
                    border: '1px solid rgba(214, 204, 194, 0.8)',
                    borderRadius: '20px',
                    padding: '0.35rem 0.85rem',
                    fontSize: '0.75rem',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent-color)';
                    e.currentTarget.style.color = 'var(--accent-color)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(214, 204, 194, 0.8)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }}
                >
                  {sug}
                </button>
              ))}
            </div>
          )}

          {/* Message List */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            background: '#faf8f5'
          }}>
            {thread?.messages.map((msg) => {
              const isMe = msg.sender === 'visitor';
              const isSys = msg.sender === 'system';

              if (isSys) {
                return (
                  <div key={msg.id} style={{ textAlign: 'center', margin: '0.5rem 0' }}>
                    <span style={{
                      fontSize: '0.75rem',
                      background: 'rgba(0,0,0,0.06)',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '12px',
                      color: 'var(--text-muted)'
                    }}>
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
                    alignItems: isMe ? 'flex-end' : 'flex-start',
                    maxWidth: '88%',
                    alignSelf: isMe ? 'flex-end' : 'flex-start'
                  }}
                >
                  <div style={{
                    fontSize: '0.7rem',
                    color: 'var(--text-muted)',
                    marginBottom: '0.2rem',
                    marginLeft: isMe ? 0 : '0.4rem',
                    marginRight: isMe ? '0.4rem' : 0,
                    fontWeight: 600
                  }}>
                    {msg.senderName || (isMe ? 'Tú' : 'Guillermo')} • {msg.timestamp}
                  </div>

                  <div style={{
                    padding: '0.8rem 1rem',
                    borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    background: isMe 
                      ? 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)' 
                      : '#ffffff',
                    color: isMe ? '#ffffff' : 'var(--text-primary)',
                    fontSize: '0.875rem',
                    lineHeight: 1.5,
                    boxShadow: isMe ? '0 4px 12px rgba(234, 88, 12, 0.25)' : '0 2px 8px rgba(0,0,0,0.04)',
                    border: isMe ? 'none' : '1px solid rgba(231, 226, 217, 0.9)',
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-line'
                  }}>
                    {msg.imageUrl && (
                      <div style={{ marginBottom: msg.text ? '0.6rem' : 0, borderRadius: '12px', overflow: 'hidden' }}>
                        <img 
                          src={msg.imageUrl} 
                          alt="Foto adjunta" 
                          style={{ maxWidth: '100%', maxHeight: '220px', borderRadius: '10px', objectFit: 'cover', display: 'block' }}
                        />
                      </div>
                    )}
                    {renderFormattedMessage(msg.text, isMe)}
                  </div>
                </div>
              );
            })}

            {/* Quick Action Chips from Bot Reply */}
            {activeQuickReplies.length > 0 && !isTyping && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.25rem' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Opciones Sugeridas:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {activeQuickReplies.map((qr, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleQuickAction(qr.action, qr.label)}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #ea580c',
                        color: '#c2410c',
                        borderRadius: '12px',
                        padding: '0.4rem 0.75rem',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        boxShadow: '0 2px 6px rgba(234, 88, 12, 0.1)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {qr.label} <ArrowRight size={12} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Bot Typing Indicator */}
            {isTyping && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.6rem 0.9rem',
                background: '#ffffff',
                borderRadius: '16px',
                width: 'fit-content',
                boxShadow: 'var(--shadow-sm)',
                border: '1px solid var(--glass-border)'
              }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Guillermo está analizando</span>
                <span className="typing-dot" style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--accent-color)' }} />
                <span className="typing-dot" style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--accent-color)', animationDelay: '0.2s' }} />
                <span className="typing-dot" style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--accent-color)', animationDelay: '0.4s' }} />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <div style={{
            background: '#ffffff',
            borderTop: '1px solid var(--glass-border)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Image Preview Banner if selected */}
            {selectedImage && (
              <div style={{
                padding: '0.5rem 0.85rem',
                background: '#fff7ed',
                borderBottom: '1px solid #fed7aa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                  <img 
                    src={selectedImage} 
                    alt="Previsualización" 
                    style={{ width: '38px', height: '38px', borderRadius: '8px', objectFit: 'cover', border: '1.5px solid #ea580c', flexShrink: 0 }} 
                  />
                  <div style={{ fontSize: '0.75rem', color: '#9a3412', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Foto lista para analizar formato y estado
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedImage(null)}
                  style={{
                    background: '#ffedd5',
                    border: 'none',
                    color: '#c2410c',
                    cursor: 'pointer',
                    padding: '0.25rem',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                  title="Quitar foto"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            <div style={{
              padding: '0.85rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem'
            }}>
              {isArchived ? (
                <div style={{ flex: 1, textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', padding: '0.4rem 0' }}>
                  Esta conversación ha finalizado.{' '}
                  <button 
                    onClick={handleStartNewChat}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-color)', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Iniciar nuevo chat
                  </button>
                </div>
              ) : (
                <form 
                  onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%' }}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    accept="image/*" 
                    style={{ display: 'none' }} 
                    onChange={handleImageSelect} 
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Subir foto de cintas o recuerdos para análisis"
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '14px',
                      background: selectedImage ? '#ffedd5' : 'var(--bg-secondary)',
                      color: selectedImage ? '#ea580c' : 'var(--text-muted)',
                      border: selectedImage ? '1.5px solid #ea580c' : '1.5px solid rgba(214, 204, 194, 0.8)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      flexShrink: 0
                    }}
                  >
                    <Camera size={19} />
                  </button>
                  <input 
                    ref={inputRef}
                    type="text"
                    placeholder={selectedImage ? "Añade detalles o presiona enviar..." : (isHumanMode ? "Escribe un mensaje al operador..." : "Escribe tu consulta o cotización...")}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '0.75rem 1rem',
                      borderRadius: '16px',
                      border: '1.5px solid rgba(214, 204, 194, 0.8)',
                      outline: 'none',
                      fontSize: '0.875rem',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)'
                    }}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--accent-color)')}
                    onBlur={(e) => (e.target.style.borderColor = 'rgba(214, 204, 194, 0.8)')}
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim() && !selectedImage}
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '14px',
                      background: (inputText.trim() || selectedImage) ? 'var(--accent-color)' : '#e7e2d9',
                      color: '#ffffff',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: (inputText.trim() || selectedImage) ? 'pointer' : 'default',
                      transition: 'background 0.2s ease',
                      flexShrink: 0
                    }}
                  >
                    <Send size={18} />
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default LiveChat;
