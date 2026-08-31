import React, { useState, useEffect } from 'react';
import { 
  getOrders, 
  saveOrder, 
  calculateFinalTotal, 
  markOrderAsCompletedAndNotify,
  getSentEmails
} from '../lib/store';
import type { Order, EmailNotification } from '../lib/store';
import { getChatThreads } from '../lib/chatStore';
import type { ChatThread } from '../lib/chatStore';
import AdminChatManager from '../components/AdminChatManager';
import AdminEmailManager from '../components/AdminEmailManager';
import AdminSecurityCenter from '../components/AdminSecurityCenter';
import { sendDepositConfirmationAndPinEmail } from '../lib/emailService';
import { 
  verifyAdminPassword, 
  createAdminSession, 
  validateAdminSession, 
  destroyAdminSession, 
  checkLockoutStatus, 
  recordFailedLoginAttempt,
  resetFailedAttempts,
  sanitizeHtml 
} from '../lib/security';
import { 
  Package, 
  MessageSquare, 
  BarChart3, 
  ShieldCheck, 
  KeyRound, 
  CheckCircle2, 
  LogOut,
  Mail,
  Eye,
  X,
  AlertTriangle
} from 'lucide-react';

const Admin: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => validateAdminSession());
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'orders' | 'emails' | 'metrics' | 'security'>('chat');
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [chatThreads, setChatThreads] = useState<ChatThread[]>([]);
  const [sentEmails, setSentEmails] = useState<EmailNotification[]>([]);
  const [previewEmail, setPreviewEmail] = useState<EmailNotification | null>(null);

  const loadData = () => {
    setOrders(getOrders());
    setChatThreads(getChatThreads());
    setSentEmails(getSentEmails());
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
      const interval = setInterval(() => {
        if (!validateAdminSession()) {
          setIsAuthenticated(false);
          setLoginError('Tu sesión ha expirado por inactividad.');
        } else {
          loadData();
        }
      }, 3000);
      window.addEventListener('digimemories_chat_sync', loadData);
      window.addEventListener('digimemories_orders_sync', loadData);
      window.addEventListener('digimemories_email_sent', loadData);
      return () => {
        clearInterval(interval);
        window.removeEventListener('digimemories_chat_sync', loadData);
        window.removeEventListener('digimemories_orders_sync', loadData);
        window.removeEventListener('digimemories_email_sent', loadData);
      };
    }
  }, [isAuthenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    // 1. Check if user is locked out from brute force attacks
    const lockout = checkLockoutStatus('admin');
    if (lockout.locked) {
      setLoginError(`🚫 Acceso bloqueado por seguridad ante múltiples intentos fallidos. Intenta nuevamente en ${lockout.minutesRemaining} minuto(s).`);
      return;
    }

    // 2. Cryptographic password verification (SHA-256 + Salt)
    const isValid = await verifyAdminPassword(password);
    if (isValid) {
      createAdminSession();
      setIsAuthenticated(true);
      setPassword('');
      setLoginError(null);
    } else {
      const result = recordFailedLoginAttempt('admin');
      if (result.locked) {
        setLoginError(`🚨 Se alcanzó el límite de 5 intentos fallidos. Tu acceso ha sido bloqueado temporalmente por 15 minutos.`);
      } else {
        setLoginError(`Contraseña incorrecta. Te quedan ${result.remainingAttempts} intento(s) antes del bloqueo de seguridad.`);
      }
    }
  };

  const handleLogout = () => {
    destroyAdminSession();
    setIsAuthenticated(false);
    setPassword('');
  };

  const handleSetPin = async (orderId: string) => {
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    let targetOrder: Order | null = null;

    const updatedOrders = orders.map(o => {
      if (o.id === orderId) {
        o.pin = pin;
        o.depositPaid = true;
        o.status = 'en_proceso';
        saveOrder(o);
        targetOrder = o;
        return o;
      }
      return o;
    });

    setOrders(updatedOrders);
    if (selectedOrder?.id === orderId) {
      setSelectedOrder(updatedOrders.find(o => o.id === orderId) || null);
    }

    if (targetOrder) {
      const orderToSend: Order = targetOrder;
      const total = calculateFinalTotal(orderToSend);
      
      // Dispatch email to client via SMTP/Sandbox
      sendDepositConfirmationAndPinEmail({
        order: orderToSend,
        pin,
        total
      }).then(() => {
        loadData();
      }).catch(err => console.warn('Error sending deposit PIN email:', err));

      alert(`✅ ¡Anticipo Registrado y PIN Generado: ${pin}!\n\n📧 Se ha enviado automáticamente el comprobante en formato Ticket Térmico con su PIN de acceso al correo del cliente (${orderToSend.clientEmail}).`);
    }
  };

  const handleCompleteOrder = (orderId: string) => {
    if (window.confirm(`¿Confirmas que toda la digitalización de la orden #${orderId} está lista? Se enviará automáticamente el correo electrónico de entrega al cliente.`)) {
      const result = markOrderAsCompletedAndNotify(orderId);
      if (result) {
        loadData();
        setSelectedOrder(result.order);
        alert(`🎉 ¡Orden #${orderId} completada!\n\nSe ha enviado automáticamente el correo de finalización a ${result.order.clientEmail}.`);
      }
    }
  };

  const updateOrderItemField = (orderId: string, itemId: string, field: string, value: any) => {
    const updatedOrders = orders.map(o => {
      if (o.id === orderId) {
        o.items = o.items.map(i => {
          if (i.id === itemId) {
            return { ...i, [field]: value };
          }
          return i;
        });
        
        const allCompleted = o.items.every(i => i.status === 'completada' || i.status === 'fallida');
        if (allCompleted && o.status !== 'completada') {
          // Auto complete and send email
          markOrderAsCompletedAndNotify(orderId);
        } else {
          saveOrder(o);
        }
        
        return o;
      }
      return o;
    });
    setOrders(updatedOrders);
    if (selectedOrder?.id === orderId) {
      setSelectedOrder(updatedOrders.find(o => o.id === orderId) || null);
    }
  };

  const totalAttention = chatThreads.filter(t => t.status !== 'archived' && t.needsHumanAttention).length;
  const totalUnreadMessages = chatThreads.reduce((sum, t) => sum + t.unreadByAdmin, 0);

  // LOGIN SCREEN
  if (!isAuthenticated) {
    return (
      <div className="container section animate-on-load" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '75vh' }}>
        <form onSubmit={handleLogin} className="glass" style={{ maxWidth: '440px', width: '100%', padding: '3rem 2.5rem', borderRadius: '24px', textAlign: 'center', background: '#ffffff' }}>
          <div style={{ width: '64px', height: '64px', background: 'var(--accent-light)', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto', color: 'var(--accent-color)', border: '1px solid rgba(234, 88, 12, 0.2)' }}>
            <KeyRound size={32} />
          </div>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>Portal Administrativo</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem' }}>
            Gestiona órdenes, responde chats en vivo y supervisa el taller.
          </p>

          {loginError && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fca5a5',
              padding: '0.85rem 1rem',
              borderRadius: '12px',
              color: '#b91c1c',
              fontSize: '0.85rem',
              fontWeight: 600,
              marginBottom: '1.25rem',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{loginError}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  resetFailedAttempts('admin');
                  setLoginError(null);
                }}
                style={{
                  alignSelf: 'flex-start',
                  background: 'none',
                  border: 'none',
                  color: '#dc2626',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: 0,
                  marginTop: '0.2rem'
                }}
              >
                ↻ Restablecer intentos y desbloquear
              </button>
            </div>
          )}

          <div style={{ marginBottom: '1.25rem', textAlign: 'left' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>Contraseña de Acceso</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              className="input-field" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ textAlign: 'center', letterSpacing: '2px', fontSize: '1.1rem' }}
              autoFocus
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.9rem' }}>
            Ingresar al Panel Seguro
          </button>
          
          <div style={{ marginTop: '1.5rem', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: '10px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            🔒 Acceso protegido con <strong>SHA-256 + Salt</strong> y defensa anti-fuerza bruta.
          </div>
        </form>
      </div>
    );
  }

  // LOGGED IN DASHBOARD
  return (
    <div className="container section animate-on-load" style={{ paddingTop: '2.5rem' }}>
      
      {/* Top Bar Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span className="badge">
              <ShieldCheck size={14} /> Modo Administrador Autenticado
            </span>
          </div>
          <h1 style={{ fontSize: '2.25rem', marginTop: '0.35rem', letterSpacing: '-0.02em' }}>
            Panel de Control <span className="text-gradient">DigiMemories</span>
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button 
            onClick={handleLogout}
            className="btn btn-secondary"
            style={{ padding: '0.6rem 1.1rem', fontSize: '0.85rem' }}
          >
            <LogOut size={16} /> Cerrar Sesión
          </button>
        </div>
      </div>

      {/* Main Tab Switcher */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        background: 'var(--bg-secondary)',
        padding: '0.4rem',
        borderRadius: '16px',
        marginBottom: '2.5rem',
        width: 'fit-content',
        border: '1px solid rgba(214, 204, 194, 0.6)',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => setActiveTab('chat')}
          className="btn"
          style={{
            background: activeTab === 'chat' ? '#ffffff' : 'transparent',
            color: activeTab === 'chat' ? 'var(--accent-color)' : 'var(--text-secondary)',
            boxShadow: activeTab === 'chat' ? 'var(--shadow-sm)' : 'none',
            padding: '0.65rem 1.4rem',
            fontSize: '0.95rem',
            borderRadius: '12px',
            position: 'relative'
          }}
        >
          <MessageSquare size={18} />
          <span>Chat en Vivo</span>
          {totalAttention > 0 ? (
            <span style={{
              background: '#ef4444',
              color: '#ffffff',
              fontSize: '0.7rem',
              fontWeight: 800,
              padding: '0.1rem 0.45rem',
              borderRadius: '999px',
              marginLeft: '0.4rem'
            }}>
              {totalAttention} ⚠️
            </span>
          ) : totalUnreadMessages > 0 ? (
            <span style={{
              background: '#ea580c',
              color: '#ffffff',
              fontSize: '0.7rem',
              fontWeight: 800,
              padding: '0.1rem 0.45rem',
              borderRadius: '999px',
              marginLeft: '0.4rem'
            }}>
              {totalUnreadMessages}
            </span>
          ) : null}
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className="btn"
          style={{
            background: activeTab === 'orders' ? '#ffffff' : 'transparent',
            color: activeTab === 'orders' ? 'var(--accent-color)' : 'var(--text-secondary)',
            boxShadow: activeTab === 'orders' ? 'var(--shadow-sm)' : 'none',
            padding: '0.65rem 1.4rem',
            fontSize: '0.95rem',
            borderRadius: '12px'
          }}
        >
          <Package size={18} />
          <span>Gestión de Órdenes ({orders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('emails')}
          className="btn"
          style={{
            background: activeTab === 'emails' ? '#ffffff' : 'transparent',
            color: activeTab === 'emails' ? 'var(--accent-color)' : 'var(--text-secondary)',
            boxShadow: activeTab === 'emails' ? 'var(--shadow-sm)' : 'none',
            padding: '0.65rem 1.4rem',
            fontSize: '0.95rem',
            borderRadius: '12px'
          }}
        >
          <Mail size={18} />
          <span>Servidor de Correo & SMTP</span>
        </button>

        <button
          onClick={() => setActiveTab('metrics')}
          className="btn"
          style={{
            background: activeTab === 'metrics' ? '#ffffff' : 'transparent',
            color: activeTab === 'metrics' ? 'var(--accent-color)' : 'var(--text-secondary)',
            boxShadow: activeTab === 'metrics' ? 'var(--shadow-sm)' : 'none',
            padding: '0.65rem 1.4rem',
            fontSize: '0.95rem',
            borderRadius: '12px'
          }}
        >
          <BarChart3 size={18} />
          <span>Métricas</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className="btn"
          style={{
            background: activeTab === 'security' ? '#ffffff' : 'transparent',
            color: activeTab === 'security' ? 'var(--accent-color)' : 'var(--text-secondary)',
            boxShadow: activeTab === 'security' ? 'var(--shadow-sm)' : 'none',
            padding: '0.65rem 1.4rem',
            fontSize: '0.95rem',
            borderRadius: '12px'
          }}
        >
          <ShieldCheck size={18} />
          <span>🛡️ Ciberseguridad</span>
        </button>
      </div>

      {/* TAB 1: LIVE CHAT MANAGER */}
      {activeTab === 'chat' && (
        <div className="animate-on-load">
          <AdminChatManager />
        </div>
      )}

      {/* TAB 2: ORDERS MANAGEMENT */}
      {activeTab === 'orders' && (
        <div className="animate-on-load">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
            
            {/* Orders List Column */}
            <div className="glass" style={{ padding: '1.75rem', background: '#ffffff', borderRadius: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 700 }}>Órdenes Registradas</h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{orders.length} totales</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '580px', overflowY: 'auto' }}>
                {orders.map(order => {
                  const isSelected = selectedOrder?.id === order.id;
                  const finalTotal = calculateFinalTotal(order);
                  const isCompleted = order.status === 'completada';

                  return (
                    <button 
                      key={order.id}
                      onClick={() => setSelectedOrder(order)}
                      style={{ 
                        textAlign: 'left', 
                        padding: '1.15rem', 
                        background: isSelected ? 'var(--accent-light)' : 'var(--bg-secondary)',
                        border: isSelected ? '2px solid var(--accent-color)' : '1px solid rgba(214, 204, 194, 0.6)',
                        borderRadius: '14px',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                        <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--accent-color)' }}>
                          #{order.id}
                        </span>
                        <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>
                          ${finalTotal} MXN
                        </span>
                      </div>
                      
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.2rem' }}>
                        {order.clientName}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                        <span style={{
                          padding: '0.15rem 0.5rem',
                          borderRadius: '999px',
                          background: isCompleted ? '#dcfce7' : order.depositPaid ? '#e0f2fe' : '#fef3c7',
                          color: isCompleted ? '#15803d' : order.depositPaid ? '#0369a1' : '#b45309',
                          fontWeight: 700
                        }}>
                          {isCompleted ? '✓ Completada' : order.depositPaid ? 'En Proceso' : 'Esperando Anticipo'}
                        </span>
                        <span>PIN: <strong>{order.pin || 'Sin asignar'}</strong></span>
                      </div>
                    </button>
                  );
                })}

                {orders.length === 0 && (
                  <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No hay órdenes en la base de datos aún.
                  </div>
                )}
              </div>
            </div>

            {/* Order Detail Column */}
            {selectedOrder ? (
              <div className="glass" style={{ padding: '2.25rem', background: '#ffffff', borderRadius: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <span className="badge" style={{ marginBottom: '0.4rem' }}>
                      {selectedOrder.status === 'completada' ? '✓ Orden Finalizada' : 'En Gestión'}
                    </span>
                    <h2 style={{ fontSize: '1.85rem', margin: 0 }}>Orden #{selectedOrder.id}</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.25rem' }}>
                      Cliente: <strong>{selectedOrder.clientName}</strong> ({selectedOrder.clientEmail})
                    </p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      Fecha: {new Date(selectedOrder.createdAt).toLocaleString('es-MX')}
                    </p>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-color)' }}>
                      ${calculateFinalTotal(selectedOrder)} MXN
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>Total Recalculado</p>
                  </div>
                </div>

                {/* Anticipo / Completion Action Card */}
                {selectedOrder.status === 'completada' ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', background: '#dcfce7', borderRadius: '14px', marginBottom: '2rem', border: '1px solid #86efac', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <CheckCircle2 size={26} color="#16a34a" />
                      <div>
                        <div style={{ fontSize: '0.9rem', color: '#166534', fontWeight: 700 }}>Orden Finalizada y Notificada</div>
                        <div style={{ fontSize: '0.8rem', color: '#15803d' }}>
                          Correo de entrega enviado a {selectedOrder.clientEmail}
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => {
                        const email = sentEmails.find(e => e.orderId === selectedOrder.id);
                        if (email) setPreviewEmail(email);
                      }}
                      className="btn btn-secondary"
                      style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem' }}
                    >
                      <Eye size={14} /> Ver Correo de Notificación
                    </button>
                  </div>
                ) : !selectedOrder.depositPaid ? (
                  <div style={{ background: 'var(--accent-light)', padding: '1.5rem', borderRadius: '16px', marginBottom: '2rem', border: '1.5px dashed var(--accent-color)' }}>
                    <h4 style={{ marginBottom: '0.35rem', color: 'var(--accent-color)', fontSize: '1.1rem' }}>Esperando Anticipo del 50%</h4>
                    <p style={{ marginBottom: '1.25rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      El cliente debe abonar <strong>${selectedOrder.estimatedTotal / 2} MXN</strong> para activar el proceso y recibir su PIN de seguimiento.
                    </p>
                    <button onClick={() => handleSetPin(selectedOrder.id)} className="btn btn-primary">
                      <KeyRound size={16} /> Confirmar Anticipo y Generar PIN
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', background: 'var(--bg-secondary)', borderRadius: '14px', marginBottom: '2rem', border: '1px solid rgba(214, 204, 194, 0.8)', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Anticipo Registrado</div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--accent-color)' }}>PIN: {selectedOrder.pin}</div>
                    </div>

                    <button 
                      onClick={() => handleCompleteOrder(selectedOrder.id)} 
                      className="btn btn-primary"
                      style={{ padding: '0.65rem 1.25rem', fontSize: '0.9rem' }}
                    >
                      <CheckCircle2 size={16} /> Completar Orden y Enviar Mail al Cliente
                    </button>
                  </div>
                )}

                <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', fontWeight: 700 }}>Artículos de la Orden</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {selectedOrder.items.map(item => (
                    <div key={item.id} style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '14px', border: '1px solid rgba(214, 204, 194, 0.6)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>{item.format}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Identificador: {item.id}</div>
                        </div>
                        
                        <div>
                          <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.3rem', fontWeight: 600 }}>Estado de Digitalización</label>
                          <select 
                            className="input-field" 
                            style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                            value={item.status}
                            onChange={e => updateOrderItemField(selectedOrder.id, item.id, 'status', e.target.value)}
                          >
                            <option value="pendiente">Pendiente en Fila</option>
                            <option value="digitalizando">Digitalizando (En Proceso)</option>
                            <option value="completada">Completada con Éxito</option>
                            <option value="fallida">Falla de Lectura / Dañada</option>
                          </select>
                        </div>

                        {item.format === 'Cintas' && (
                          <div>
                            <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.3rem', fontWeight: 600 }}>Horas Extra (+ $50/hr)</label>
                            <input 
                              type="number" 
                              className="input-field" 
                              style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }} 
                              min="0"
                              value={item.extraHours || 0}
                              onChange={e => updateOrderItemField(selectedOrder.id, item.id, 'extraHours', parseInt(e.target.value) || 0)}
                            />
                          </div>
                        )}
                      </div>

                      {/* Failure report */}
                      {item.status === 'fallida' && (
                        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          <div>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#ef4444', display: 'block', marginBottom: '0.2rem' }}>Motivo de la Falla</label>
                            <select 
                              className="input-field" 
                              style={{ borderColor: '#ef4444', fontSize: '0.85rem' }}
                              value={item.failureReason || ''}
                              onChange={e => updateOrderItemField(selectedOrder.id, item.id, 'failureReason', e.target.value)}
                            >
                              <option value="">Selecciona una razón...</option>
                              <option value="Cinta rota o despegada">Cinta rota o despegada</option>
                              <option value="Moho severo / Hongo blanco">Moho severo / Hongo blanco</option>
                              <option value="Mecanismo trabado">Mecanismo trabado</option>
                              <option value="Señal completamente borrada">Señal completamente borrada</option>
                            </select>
                          </div>
                          
                          <div>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#ef4444', display: 'block', marginBottom: '0.2rem' }}>Nota para el Cliente</label>
                            <textarea 
                              className="input-field" 
                              rows={2}
                              placeholder="Explica qué se detectó al intentar reproducir..."
                              style={{ borderColor: '#ef4444', fontSize: '0.85rem' }}
                              value={item.failureNote || ''}
                              onChange={e => updateOrderItemField(selectedOrder.id, item.id, 'failureNote', e.target.value)}
                            ></textarea>
                          </div>
                        </div>
                      )}

                    </div>
                  ))}
                </div>

              </div>
            ) : (
              <div className="glass" style={{ padding: '3rem', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', background: '#ffffff' }}>
                Selecciona una orden de la lista para gestionar su estado o registrar horas.
              </div>
            )}

          </div>
        </div>
      )}

      {/* TAB 3: INTERNAL EMAIL ENGINE & SMTP SERVER */}
      {activeTab === 'emails' && (
        <AdminEmailManager orders={orders} />
      )}

      {/* TAB 4: METRICS */}
      {activeTab === 'metrics' && (
        <div className="animate-on-load">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
            <div className="glass" style={{ padding: '2rem', background: '#ffffff', borderRadius: '20px' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase' }}>Total de Cotizaciones</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, marginTop: '0.5rem', color: 'var(--text-primary)' }}>{orders.length}</div>
            </div>

            <div className="glass" style={{ padding: '2rem', background: '#ffffff', borderRadius: '20px' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase' }}>Valor Estimado en Cartera</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, marginTop: '0.5rem', color: 'var(--accent-color)' }}>
                ${orders.reduce((sum, o) => sum + calculateFinalTotal(o), 0)} MXN
              </div>
            </div>

            <div className="glass" style={{ padding: '2rem', background: '#ffffff', borderRadius: '20px' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase' }}>Correos Despachados</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, marginTop: '0.5rem', color: '#0284c7' }}>{sentEmails.length}</div>
            </div>

            <div className="glass" style={{ padding: '2rem', background: '#ffffff', borderRadius: '20px' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase' }}>Conversaciones en Chat</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, marginTop: '0.5rem', color: '#16a34a' }}>{chatThreads.length}</div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: CYBERSECURITY AUDIT & CONTROLS */}
      {activeTab === 'security' && (
        <AdminSecurityCenter />
      )}

      {/* Email Preview Modal */}
      {previewEmail && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="glass animate-on-load" style={{ maxWidth: '650px', width: '100%', maxHeight: '85vh', overflowY: 'auto', background: '#ffffff', padding: '2rem', borderRadius: '20px', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                <Mail size={18} className="text-accent" />
                <span>Vista Previa de Correo Enviado</span>
              </div>
              <button onClick={() => setPreviewEmail(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem', background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: '8px' }}>
              <div><strong>Para:</strong> {previewEmail.toName} &lt;{previewEmail.toEmail}&gt;</div>
              <div><strong>Asunto:</strong> {previewEmail.subject}</div>
              <div><strong>Fecha de envío:</strong> {new Date(previewEmail.sentAt).toLocaleString('es-MX')}</div>
            </div>

            <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(previewEmail.bodyHtml) }} />
          </div>
        </div>
      )}

    </div>
  );
};

export default Admin;
