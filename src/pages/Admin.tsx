import React, { useState, useEffect } from 'react';
import { 
  getOrders, 
  saveOrder, 
  calculateFinalTotal, 
  markOrderAsCompletedAndNotify,
  getSentEmails,
  updateItem
} from '../lib/store';
import type { Order, EmailNotification, OrderItem } from '../lib/store';
import { getChatThreads } from '../lib/chatStore';
import type { ChatThread } from '../lib/chatStore';
import AdminChatManager from '../components/AdminChatManager';
import AdminEmailManager from '../components/AdminEmailManager';
import AdminSecurityCenter from '../components/AdminSecurityCenter';
import AdminTrafficAnalytics from '../components/AdminTrafficAnalytics';
import AdminOrderEditModal from '../components/AdminOrderEditModal';
import { sendDepositConfirmationAndPinEmail } from '../lib/emailService';
import { 
  verifyAdminPassword, 
  createAdminSession, 
  validateAdminSession, 
  destroyAdminSession, 
  checkLockoutStatus, 
  recordFailedLoginAttempt,
  resetFailedAttempts 
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
  EyeOff,
  Lock,
  X,
  AlertTriangle,
  Compass,
  Edit,
  Truck,
  MapPin
} from 'lucide-react';

const Admin: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => validateAdminSession());
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'orders' | 'traffic' | 'emails' | 'metrics' | 'security'>('chat');
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [chatThreads, setChatThreads] = useState<ChatThread[]>([]);
  const [sentEmails, setSentEmails] = useState<EmailNotification[]>([]);
  const [previewEmail, setPreviewEmail] = useState<EmailNotification | null>(null);

  const loadData = () => {
    const fetchedOrders = getOrders();
    setOrders(fetchedOrders);
    setChatThreads(getChatThreads());
    setSentEmails(getSentEmails());

    // Keep selectedOrder in sync
    if (selectedOrder) {
      const refreshed = fetchedOrders.find(o => o.id === selectedOrder.id);
      if (refreshed) setSelectedOrder(refreshed);
    }
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

    const cleanPass = password.trim();

    // 1. Check lockout status
    const lockout = checkLockoutStatus('admin');
    if (lockout.locked) {
      setLoginError(`🚫 Acceso bloqueado por seguridad ante múltiples intentos fallidos. Intenta nuevamente en ${lockout.minutesRemaining} minuto(s).`);
      return;
    }

    // 2. Cryptographic password verification (SHA-256 + Salt)
    const isValid = await verifyAdminPassword(cleanPass);
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
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const finalTotal = calculateFinalTotal(order);
    const updatedOrder: Order = {
      ...order,
      pin,
      depositPaid: true,
      status: 'en_proceso'
    };

    saveOrder(updatedOrder);
    setOrders(getOrders());
    setSelectedOrder(updatedOrder);

    // Send deposit confirmation & PIN email to client
    try {
      await sendDepositConfirmationAndPinEmail({
        order: updatedOrder,
        pin,
        total: finalTotal
      });
      loadData();
    } catch (err) {
      console.warn('Error sending deposit PIN email:', err);
    }
  };

  const handleCompleteOrder = async (orderId: string) => {
    const res = markOrderAsCompletedAndNotify(orderId);
    if (res) {
      loadData();
      setSelectedOrder(res.order);
      setPreviewEmail(res.email);
    }
  };

  const updateOrderItemField = (orderId: string, itemId: string, field: keyof OrderItem, value: any) => {
    updateItem(orderId, itemId, { [field]: value });
    loadData();
  };

  const totalUnreadMessages = chatThreads.reduce((acc, t) => acc + (t.unreadByAdmin || 0), 0);
  const totalAttention = chatThreads.filter(t => t.needsHumanAttention && t.status === 'active').length;

  if (!isAuthenticated) {
    return (
      <div className="container section animate-on-load" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <div className="glass" style={{ maxWidth: '460px', width: '100%', padding: '3rem 2.5rem', borderRadius: '28px', textAlign: 'center', background: '#ffffff', boxShadow: '0 20px 40px rgba(0,0,0,0.06)', border: '1px solid rgba(214, 204, 194, 0.8)' }}>
          
          <div style={{ width: '68px', height: '68px', background: '#fff7ed', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem auto', color: '#ea580c', border: '1px solid #fed7aa', boxShadow: '0 8px 16px rgba(234, 88, 12, 0.15)' }}>
            <KeyRound size={34} />
          </div>

          <h2 style={{ fontSize: '1.85rem', marginBottom: '0.4rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#1c1917' }}>
            Portal Administrativo
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.75rem', lineHeight: '1.5' }}>
            Gestiona órdenes, responde chats en vivo y supervisa el laboratorio en tiempo real.
          </p>

          {loginError && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fca5a5',
              padding: '0.9rem 1rem',
              borderRadius: '12px',
              color: '#991b1b',
              fontSize: '0.85rem',
              fontWeight: 600,
              marginBottom: '1.25rem',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px', color: '#dc2626' }} />
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

          <form onSubmit={handleLogin} style={{ textAlign: 'left' }}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#292524', marginBottom: '0.4rem' }}>
                Contraseña de Acceso
              </label>

              <div style={{ position: 'relative' }}>
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  placeholder="••••••••" 
                  className="input-field" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ 
                    paddingRight: '2.75rem', 
                    fontSize: '1rem',
                    borderRadius: '12px'
                  }}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#78716c',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title={showPassword ? 'Ocultar' : 'Mostrar'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '0.85rem', fontSize: '0.95rem', fontWeight: 700, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              <Lock size={16} /> Ingresar al Panel Seguro
            </button>
          </form>
          
          <div style={{ marginTop: '1.75rem', padding: '0.75rem', background: '#f5f5f4', borderRadius: '12px', fontSize: '0.75rem', color: '#78716c', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
            <span>🔒 Acceso protegido con SHA-256 + Salt y defensa anti-fuerza bruta.</span>
          </div>
        </div>
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
          onClick={() => setActiveTab('traffic')}
          className="btn"
          style={{
            background: activeTab === 'traffic' ? '#ffffff' : 'transparent',
            color: activeTab === 'traffic' ? 'var(--accent-color)' : 'var(--text-secondary)',
            boxShadow: activeTab === 'traffic' ? 'var(--shadow-sm)' : 'none',
            padding: '0.65rem 1.4rem',
            fontSize: '0.95rem',
            borderRadius: '12px'
          }}
        >
          <Compass size={18} />
          <span>Tráfico & Origen 🌐</span>
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '620px', overflowY: 'auto' }}>
                {orders.map(order => {
                  const isSelected = selectedOrder?.id === order.id;
                  const finalTotal = calculateFinalTotal(order);
                  const isCompleted = order.status === 'completada';

                  return (
                    <div 
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
                        transition: 'all 0.2s ease',
                        position: 'relative'
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

                      {order.deliveryAddress && (
                        <div style={{ fontSize: '0.75rem', color: '#78716c', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                          <MapPin size={12} className="text-orange-500" />
                          <span className="truncate">{order.deliveryAddress}</span>
                        </div>
                      )}

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

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>PIN: <strong>{order.pin || 'Sin asignar'}</strong></span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingOrder(order);
                            }}
                            className="p-1 text-stone-400 hover:text-orange-600 rounded hover:bg-white"
                            title="Editar Datos"
                          >
                            <Edit size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                      <span className="badge">
                        {selectedOrder.status === 'completada' ? '✓ Orden Finalizada' : 'En Gestión'}
                      </span>
                      <button
                        onClick={() => setEditingOrder(selectedOrder)}
                        className="px-2.5 py-1 text-xs font-bold bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg flex items-center gap-1 transition shadow-sm"
                      >
                        <Edit size={13} /> Editar Dirección & Datos
                      </button>
                    </div>
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

                {/* Logistics Info Card */}
                <div style={{ background: '#faf8f5', border: '1px solid #e7e2d9', borderRadius: '14px', padding: '1.25rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: '#c2410c', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Truck size={14} /> Logística y Entrega
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: '#ffedd5', color: '#9a3412' }}>
                      {selectedOrder.deliveryType === 'home_delivery' ? '🛵 Entrega CDMX' : (selectedOrder.deliveryType === 'national_shipping' ? '📦 Envío Nacional' : '🏢 Recoger en Taller')}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.85rem', color: '#44403c', marginBottom: '4px' }}>
                    <strong>Dirección del Cliente:</strong> {selectedOrder.deliveryAddress || 'No especificada (Recolección en sucursal)'}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#44403c' }}>
                    <strong>Taller Asignado:</strong> {selectedOrder.tallerAddress || 'Av. Insurgentes Sur #450, Col. Roma Sur, CDMX'}
                  </div>
                  {selectedOrder.trackingCourierNumber && (
                    <div style={{ fontSize: '0.85rem', color: '#0369a1', marginTop: '4px' }}>
                      <strong>Guía de Paquetería:</strong> {selectedOrder.trackingCourierNumber}
                    </div>
                  )}
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
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', background: '#f0fdf4', borderRadius: '14px', marginBottom: '2rem', border: '1px solid #bbf7d0', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <CheckCircle2 size={24} color="#16a34a" />
                      <div>
                        <div style={{ fontSize: '0.9rem', color: '#166534', fontWeight: 700 }}>Anticipo Registrado</div>
                        <div style={{ fontSize: '0.8rem', color: '#15803d' }}>
                          PIN Activo: <strong>{selectedOrder.pin}</strong>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => handleCompleteOrder(selectedOrder.id)}
                      className="btn btn-primary"
                      style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                    >
                      <CheckCircle2 size={16} /> Marcar Orden como Completada
                    </button>
                  </div>
                )}

                {/* Items Status Inspection */}
                <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Material en Proceso ({selectedOrder.items.length})</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {selectedOrder.items.map((item, index) => (
                    <div key={item.id} className="glass" style={{ padding: '1.25rem', background: 'var(--bg-secondary)', borderRadius: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                          #{index + 1} - {item.format}
                        </span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                          ID: {item.id}
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                        <div>
                          <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.3rem', fontWeight: 600 }}>Estado de la Cinta</label>
                          <select 
                            className="input-field" 
                            style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                            value={item.status}
                            onChange={e => updateOrderItemField(selectedOrder.id, item.id, 'status', e.target.value)}
                          >
                            <option value="pendiente">⏳ Pendiente</option>
                            <option value="digitalizando">🔄 En Digitalización 1:1</option>
                            <option value="completada">✓ Digitalizada con Éxito</option>
                            <option value="fallida">❌ Falla de Lectura / Dañada</option>
                          </select>
                        </div>

                        {item.format.toLowerCase().includes('cinta') && (
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

      {/* TAB 3: TRAFFIC & AUDIENCE ANALYTICS */}
      {activeTab === 'traffic' && (
        <div className="animate-on-load">
          <AdminTrafficAnalytics totalOrdersCount={orders.length} />
        </div>
      )}

      {/* TAB 4: INTERNAL EMAIL ENGINE & SMTP SERVER */}
      {activeTab === 'emails' && (
        <AdminEmailManager orders={orders} />
      )}

      {/* TAB 5: METRICS */}
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
                ${orders.reduce((sum, o) => sum + calculateFinalTotal(o), 0).toLocaleString('es-MX')} MXN
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

      {/* TAB 6: CYBERSECURITY AUDIT & CONTROLS */}
      {activeTab === 'security' && (
        <AdminSecurityCenter />
      )}

      {/* Edit Order Modal */}
      {editingOrder && (
        <AdminOrderEditModal
          order={editingOrder}
          isOpen={!!editingOrder}
          onClose={() => setEditingOrder(null)}
          onSaved={(updated) => {
            loadData();
            setSelectedOrder(updated);
          }}
        />
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
              <div><strong>Para:</strong> {previewEmail.toName} ({previewEmail.toEmail})</div>
              <div><strong>Asunto:</strong> {previewEmail.subject}</div>
              <div><strong>Fecha de Envío:</strong> {new Date(previewEmail.sentAt).toLocaleString('es-MX')}</div>
            </div>

            <div 
              style={{ border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '1rem', background: '#ffffff' }}
              dangerouslySetInnerHTML={{ __html: previewEmail.bodyHtml }}
            />
          </div>
        </div>
      )}

    </div>
  );
};

export default Admin;
