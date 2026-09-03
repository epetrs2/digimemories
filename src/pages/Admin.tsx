import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  getOrders, 
  saveOrder, 
  calculateFinalTotal, 
  markOrderAsCompletedAndNotify,
  getSentEmails,
  updateItem,
  archiveOrder,
  deleteOrder
} from '../lib/store';
import type { Order, EmailNotification, OrderItem } from '../lib/store';
import { getChatThreads } from '../lib/chatStore';
import type { ChatThread } from '../lib/chatStore';
import AdminChatManager from '../components/AdminChatManager';
import AdminEmailManager from '../components/AdminEmailManager';
import AdminSecurityCenter from '../components/AdminSecurityCenter';
import AdminTrafficAnalytics from '../components/AdminTrafficAnalytics';
import AdminOrderEditModal from '../components/AdminOrderEditModal';
import AdminBusinessSettings from '../components/AdminBusinessSettings';
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
  MapPin,
  Building,
  Smartphone,
  Download,
  Share2,
  Zap,
  Archive,
  ArchiveRestore,
  Trash2
} from 'lucide-react';

const Admin: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isAuthenticated, setIsAuthenticated] = useState(() => validateAdminSession());
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  
  // Tab sync with URL query param ?tab=chat
  const initialTab = (searchParams.get('tab') as any) || 'chat';
  const [activeTab, setActiveTab] = useState<'chat' | 'orders' | 'business' | 'traffic' | 'emails' | 'metrics' | 'security'>(initialTab);
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderFilter, setOrderFilter] = useState<'activas' | 'completadas' | 'archivadas' | 'todas'>('activas');
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [chatThreads, setChatThreads] = useState<ChatThread[]>([]);
  const [sentEmails, setSentEmails] = useState<EmailNotification[]>([]);
  const [previewEmail, setPreviewEmail] = useState<EmailNotification | null>(null);
  const [showAppModal, setShowAppModal] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleTabChange = (tab: 'chat' | 'orders' | 'business' | 'traffic' | 'emails' | 'metrics' | 'security') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

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
    if (field === 'status' && value === 'fallida') {
      const order = orders.find(o => o.id === orderId);
      const item = order?.items.find(i => i.id === itemId);
      updateItem(orderId, itemId, { 
        status: 'fallida', 
        failureReason: item?.failureReason || 'Cinta en blanco / sin señal grabada' 
      });
    } else {
      updateItem(orderId, itemId, { [field]: value });
    }
    loadData();
  };

  const handleArchiveOrder = (orderId: string, archive: boolean = true) => {
    archiveOrder(orderId, archive);
    loadData();
    if (selectedOrder?.id === orderId) {
      setSelectedOrder(prev => prev ? { ...prev, isArchived: archive } : null);
    }
  };

  const handleDeleteOrder = (orderId: string) => {
    if (window.confirm(`¿Estás seguro de eliminar permanentemente la orden #${orderId}? Esta acción no se puede deshacer.`)) {
      deleteOrder(orderId);
      loadData();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(null);
      }
    }
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
    <div className="container section animate-on-load" style={{ paddingTop: '2rem', paddingBottom: isMobile ? '85px' : '2.5rem' }}>
      
      {/* Top Bar Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span className="badge">
              <ShieldCheck size={14} /> Modo Administrador Autenticado
            </span>
          </div>
          <h1 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.25rem)', marginTop: '0.35rem', letterSpacing: '-0.02em' }}>
            Panel de Control <span className="text-gradient">DigiMemories</span>
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Mobile App & APK Button */}
          <button
            onClick={() => setShowAppModal(true)}
            style={{
              padding: '0.6rem 1.1rem',
              fontSize: '0.85rem',
              fontWeight: 800,
              borderRadius: '12px',
              border: '1.5px solid #fed7aa',
              background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
              color: '#c2410c',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              boxShadow: '0 2px 8px rgba(234, 88, 12, 0.15)',
              transition: 'all 0.2s ease'
            }}
          >
            <Smartphone size={16} /> 📲 App Móvil / APK
          </button>

          <button 
            onClick={handleLogout}
            className="btn btn-secondary"
            style={{ padding: '0.6rem 1.1rem', fontSize: '0.85rem' }}
          >
            <LogOut size={16} /> Cerrar Sesión
          </button>
        </div>
      </div>

      {/* Main Tab Switcher (Desktop Tabs) */}
      {!isMobile && (
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          background: 'var(--bg-secondary)',
          padding: '0.4rem',
          borderRadius: '16px',
          marginBottom: '2.25rem',
          width: 'fit-content',
          border: '1px solid rgba(214, 204, 194, 0.6)',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => handleTabChange('chat')}
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
            onClick={() => handleTabChange('orders')}
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
            onClick={() => handleTabChange('business')}
            className="btn"
            style={{
              background: activeTab === 'business' ? '#ffffff' : 'transparent',
              color: activeTab === 'business' ? 'var(--accent-color)' : 'var(--text-secondary)',
              boxShadow: activeTab === 'business' ? 'var(--shadow-sm)' : 'none',
              padding: '0.65rem 1.4rem',
              fontSize: '0.95rem',
              borderRadius: '12px'
            }}
          >
            <Building size={18} />
            <span>Datos del Negocio 🏢</span>
          </button>

          <button
            onClick={() => handleTabChange('traffic')}
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
            onClick={() => handleTabChange('emails')}
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
            onClick={() => handleTabChange('metrics')}
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
            onClick={() => handleTabChange('security')}
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
      )}

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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 700 }}>Órdenes Registradas</h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {orders.filter(order => {
                    if (orderFilter === 'activas') return !order.isArchived && order.status !== 'completada';
                    if (orderFilter === 'completadas') return order.status === 'completada' && !order.isArchived;
                    if (orderFilter === 'archivadas') return !!order.isArchived;
                    return true;
                  }).length} de {orders.length}
                </span>
              </div>

              {/* Filter Tabs */}
              <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '1.15rem', flexWrap: 'wrap' }}>
                <button 
                  onClick={() => setOrderFilter('activas')}
                  style={{
                    padding: '0.4rem 0.65rem',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    borderRadius: '8px',
                    border: 'none',
                    background: orderFilter === 'activas' ? '#ea580c' : '#f5f5f4',
                    color: orderFilter === 'activas' ? '#ffffff' : '#78716c',
                    cursor: 'pointer'
                  }}
                >
                  Activas ({orders.filter(o => !o.isArchived && o.status !== 'completada').length})
                </button>
                <button 
                  onClick={() => setOrderFilter('completadas')}
                  style={{
                    padding: '0.4rem 0.65rem',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    borderRadius: '8px',
                    border: 'none',
                    background: orderFilter === 'completadas' ? '#16a34a' : '#f5f5f4',
                    color: orderFilter === 'completadas' ? '#ffffff' : '#78716c',
                    cursor: 'pointer'
                  }}
                >
                  ✓ Completadas ({orders.filter(o => o.status === 'completada' && !o.isArchived).length})
                </button>
                <button 
                  onClick={() => setOrderFilter('archivadas')}
                  style={{
                    padding: '0.4rem 0.65rem',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    borderRadius: '8px',
                    border: 'none',
                    background: orderFilter === 'archivadas' ? '#57534e' : '#f5f5f4',
                    color: orderFilter === 'archivadas' ? '#ffffff' : '#78716c',
                    cursor: 'pointer'
                  }}
                >
                  📁 Archivadas ({orders.filter(o => o.isArchived).length})
                </button>
                <button 
                  onClick={() => setOrderFilter('todas')}
                  style={{
                    padding: '0.4rem 0.65rem',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    borderRadius: '8px',
                    border: 'none',
                    background: orderFilter === 'todas' ? '#292524' : '#f5f5f4',
                    color: orderFilter === 'todas' ? '#ffffff' : '#78716c',
                    cursor: 'pointer'
                  }}
                >
                  Todas ({orders.length})
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '620px', overflowY: 'auto' }}>
                {orders.filter(order => {
                  if (orderFilter === 'activas') return !order.isArchived && order.status !== 'completada';
                  if (orderFilter === 'completadas') return order.status === 'completada' && !order.isArchived;
                  if (orderFilter === 'archivadas') return !!order.isArchived;
                  return true;
                }).map(order => {
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
                        background: isSelected ? 'var(--accent-light)' : (order.isArchived ? '#f5f5f4' : 'var(--bg-secondary)'),
                        border: isSelected ? '2px solid var(--accent-color)' : '1px solid rgba(214, 204, 194, 0.6)',
                        borderRadius: '14px',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        position: 'relative',
                        opacity: order.isArchived && !isSelected ? 0.75 : 1
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--accent-color)' }}>
                            #{order.id}
                          </span>
                          {order.isArchived && (
                            <span style={{ fontSize: '0.65rem', background: '#e7e5e4', color: '#57534e', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                              📁 Archivada
                            </span>
                          )}
                        </div>
                        <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>
                          ${finalTotal} MXN
                        </span>
                      </div>
                      
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.2rem' }}>
                        {order.clientName}
                      </div>

                      {order.deliveryAddress && (
                        <div style={{ fontSize: '0.75rem', color: '#78716c', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                          <MapPin size={12} color="#ea580c" />
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '240px' }}>{order.deliveryAddress}</span>
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <span style={{
                          padding: '0.15rem 0.5rem',
                          borderRadius: '999px',
                          background: isCompleted ? '#dcfce7' : order.depositPaid ? '#e0f2fe' : '#fef3c7',
                          color: isCompleted ? '#15803d' : order.depositPaid ? '#0369a1' : '#b45309',
                          fontWeight: 700
                        }}>
                          {isCompleted ? '✓ Completada' : order.depositPaid ? 'En Proceso' : 'Esperando Anticipo'}
                        </span>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>PIN: <strong>{order.pin || 'Sin asignar'}</strong></span>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingOrder(order);
                            }}
                            style={{
                              background: '#ffffff',
                              border: '1px solid #e7e2d9',
                              color: '#ea580c',
                              padding: '0.35rem 0.55rem',
                              borderRadius: '8px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                            }}
                            title="Editar Datos"
                          >
                            <Edit size={12} /> Editar
                          </button>

                          {order.isArchived ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleArchiveOrder(order.id, false);
                              }}
                              style={{
                                background: '#ffffff',
                                border: '1px solid #d6d3d1',
                                color: '#44403c',
                                padding: '0.35rem 0.55rem',
                                borderRadius: '8px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                              title="Desarchivar"
                            >
                              <ArchiveRestore size={12} />
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleArchiveOrder(order.id, true);
                              }}
                              style={{
                                background: '#ffffff',
                                border: '1px solid #e7e2d9',
                                color: '#57534e',
                                padding: '0.35rem 0.55rem',
                                borderRadius: '8px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                              title="Archivar orden"
                            >
                              <Archive size={12} />
                            </button>
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteOrder(order.id);
                            }}
                            style={{
                              background: '#ffffff',
                              border: '1px solid #fecaca',
                              color: '#dc2626',
                              padding: '0.35rem 0.55rem',
                              borderRadius: '8px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                            title="Eliminar orden permanentemente"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {orders.filter(order => {
                  if (orderFilter === 'activas') return !order.isArchived && order.status !== 'completada';
                  if (orderFilter === 'completadas') return order.status === 'completada' && !order.isArchived;
                  if (orderFilter === 'archivadas') return !!order.isArchived;
                  return true;
                }).length === 0 && (
                  <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No hay órdenes en la categoría "{orderFilter}".
                  </div>
                )}
              </div>
            </div>

            {/* Order Detail Column */}
            {selectedOrder ? (
              <div className="glass" style={{ padding: '2.25rem', background: '#ffffff', borderRadius: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                      <span className="badge">
                        {selectedOrder.status === 'completada' ? '✓ Orden Finalizada' : 'En Gestión'}
                      </span>

                      {selectedOrder.isArchived && (
                        <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '8px', background: '#e7e5e4', color: '#44403c', fontWeight: 700 }}>
                          📁 Archivada
                        </span>
                      )}

                      <button
                        onClick={() => setEditingOrder(selectedOrder)}
                        style={{
                          padding: '0.45rem 0.95rem',
                          fontSize: '0.8rem',
                          fontWeight: 800,
                          background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
                          color: '#c2410c',
                          border: '1.5px solid #fed7aa',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          boxShadow: '0 2px 6px rgba(234, 88, 12, 0.15)',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <Edit size={14} /> Editar Dirección & Datos
                      </button>

                      {selectedOrder.isArchived ? (
                        <button
                          onClick={() => handleArchiveOrder(selectedOrder.id, false)}
                          style={{
                            padding: '0.45rem 0.85rem',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            borderRadius: '10px',
                            border: '1px solid #d6d3d1',
                            background: '#ffffff',
                            color: '#44403c',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem'
                          }}
                          title="Sacar de archivo y volver a activar"
                        >
                          <ArchiveRestore size={13} /> Desarchivar
                        </button>
                      ) : (
                        <button
                          onClick={() => handleArchiveOrder(selectedOrder.id, true)}
                          style={{
                            padding: '0.45rem 0.85rem',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            borderRadius: '10px',
                            border: '1px solid #e7e5e4',
                            background: '#fafaf9',
                            color: '#57534e',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem'
                          }}
                          title="Archivar para despejar la lista activa"
                        >
                          <Archive size={13} /> Archivar
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteOrder(selectedOrder.id)}
                        style={{
                          padding: '0.45rem 0.85rem',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          borderRadius: '10px',
                          border: '1px solid #fecaca',
                          background: '#fff1f2',
                          color: '#e11d48',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem'
                        }}
                        title="Eliminar permanentemente esta orden"
                      >
                        <Trash2 size={13} /> Eliminar
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
                        <div style={{ fontSize: '0.9rem', color: '#166534', fontWeight: 700 }}>
                          Orden Finalizada {selectedOrder.isArchived ? '• (Archivada)' : ''}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#15803d' }}>
                          Correo de entrega enviado a {selectedOrder.clientEmail}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button 
                        onClick={() => {
                          const email = sentEmails.find(e => e.orderId === selectedOrder.id);
                          if (email) setPreviewEmail(email);
                        }}
                        className="btn btn-secondary"
                        style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}
                      >
                        <Eye size={14} /> Ver Correo
                      </button>

                      {selectedOrder.isArchived ? (
                        <button
                          onClick={() => handleArchiveOrder(selectedOrder.id, false)}
                          className="btn btn-secondary"
                          style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}
                          title="Sacar de archivo y regresar a activas"
                        >
                          <ArchiveRestore size={14} /> Desarchivar
                        </button>
                      ) : (
                        <button
                          onClick={() => handleArchiveOrder(selectedOrder.id, true)}
                          style={{
                            padding: '0.45rem 0.85rem',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            borderRadius: '10px',
                            border: '1px solid #fed7aa',
                            background: '#fff7ed',
                            color: '#c2410c',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem'
                          }}
                          title="Archivar para despejar la lista activa"
                        >
                          <Archive size={14} /> Archivar Orden
                        </button>
                      )}
                    </div>
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

                        {/* MOTIVOS PREESTABLECIDOS DE FALLA */}
                        {item.status === 'fallida' && (
                          <div style={{
                            gridColumn: '1 / -1',
                            background: '#fef2f2',
                            border: '1px solid #fca5a5',
                            borderRadius: '12px',
                            padding: '1rem',
                            marginTop: '0.5rem'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#991b1b', fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.65rem' }}>
                              <AlertTriangle size={16} color="#dc2626" />
                              <span>Motivo de Falla / Diagnóstico Técnico:</span>
                            </div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
                              <div>
                                <label style={{ fontSize: '0.75rem', display: 'block', marginBottom: '0.3rem', fontWeight: 700, color: '#7f1d1d' }}>
                                  Razón Preestablecida *
                                </label>
                                <select
                                  className="input-field"
                                  style={{ padding: '0.5rem 0.65rem', fontSize: '0.85rem', borderColor: '#f87171', background: '#ffffff', color: '#1c1917' }}
                                  value={item.failureReason || 'Cinta en blanco / sin señal grabada'}
                                  onChange={e => updateOrderItemField(selectedOrder.id, item.id, 'failureReason', e.target.value)}
                                >
                                  <option value="Cinta en blanco / sin señal grabada">📼 Cinta en blanco / sin señal grabada</option>
                                  <option value="Cinta rota o desprendida del carrete">✂️ Cinta rota o desprendida del carrete</option>
                                  <option value="Moho u hongo severo (adhesión química)">🦠 Moho u hongo severo (adhesión química)</option>
                                  <option value="Desmagnetización severa / pérdida total de señal">🧲 Desmagnetización / señal irrecuperable</option>
                                  <option value="Mecanismo de cartucho trabado / carcasa rota">⚙️ Mecanismo de cartucho trabado o roto</option>
                                  <option value="Disco con rayas profundas / errores de lectura I/O">💿 Disco rayado con error de lectura I/O</option>
                                  <option value="Daño por humedad o calor extremo">🔥 Daño por humedad o calor extremo</option>
                                  <option value="Otro motivo técnico">🔍 Otro motivo técnico (especificar al lado)</option>
                                </select>
                              </div>

                              <div>
                                <label style={{ fontSize: '0.75rem', display: 'block', marginBottom: '0.3rem', fontWeight: 700, color: '#7f1d1d' }}>
                                  Detalle para el Cliente (Visible en Portal de Rastreo)
                                </label>
                                <input
                                  type="text"
                                  className="input-field"
                                  style={{ padding: '0.5rem 0.65rem', fontSize: '0.85rem', borderColor: '#f87171', background: '#ffffff' }}
                                  placeholder="Ej: Se probó en 2 videocaseteras. No se cobrará esta cinta."
                                  value={item.failureNote || ''}
                                  onChange={e => updateOrderItemField(selectedOrder.id, item.id, 'failureNote', e.target.value)}
                                />
                              </div>
                            </div>

                            <div style={{ fontSize: '0.75rem', color: '#991b1b', marginTop: '0.6rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span>💡 <strong>Garantía de Satisfacción:</strong> Este formato no se cobra y el importe fue descontado automáticamente del total final de la orden.</span>
                            </div>
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

      {/* TAB 3: BUSINESS PROFILE & PRICING SETTINGS */}
      {activeTab === 'business' && (
        <div className="animate-on-load">
          <AdminBusinessSettings />
        </div>
      )}

      {/* TAB 4: TRAFFIC & AUDIENCE ANALYTICS */}
      {activeTab === 'traffic' && (
        <div className="animate-on-load">
          <AdminTrafficAnalytics totalOrdersCount={orders.length} />
        </div>
      )}

      {/* TAB 5: INTERNAL EMAIL ENGINE & SMTP SERVER */}
      {activeTab === 'emails' && (
        <AdminEmailManager orders={orders} />
      )}

      {/* TAB 6: METRICS */}
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

      {/* TAB 7: CYBERSECURITY AUDIT & CONTROLS */}
      {activeTab === 'security' && (
        <AdminSecurityCenter />
      )}

      {/* Mobile Bottom Navigation Bar (Fixed for Cellphones) */}
      {isMobile && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '66px',
          background: 'rgba(255, 255, 255, 0.96)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(214, 204, 194, 0.8)',
          boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.08)',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          zIndex: 998,
          padding: '0 0.5rem'
        }}>
          <button
            onClick={() => handleTabChange('chat')}
            style={{
              background: 'none',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
              color: activeTab === 'chat' ? '#ea580c' : '#78716c',
              cursor: 'pointer',
              position: 'relative',
              flex: 1
            }}
          >
            <MessageSquare size={20} />
            <span style={{ fontSize: '0.7rem', fontWeight: activeTab === 'chat' ? 800 : 600 }}>Chats</span>
            {totalAttention > 0 ? (
              <span style={{ position: 'absolute', top: '-4px', right: '18px', background: '#ef4444', color: '#fff', fontSize: '0.65rem', fontWeight: 900, width: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                !
              </span>
            ) : totalUnreadMessages > 0 ? (
              <span style={{ position: 'absolute', top: '-4px', right: '18px', background: '#ea580c', color: '#fff', fontSize: '0.65rem', fontWeight: 900, width: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {totalUnreadMessages}
              </span>
            ) : null}
          </button>

          <button
            onClick={() => handleTabChange('orders')}
            style={{
              background: 'none',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
              color: activeTab === 'orders' ? '#ea580c' : '#78716c',
              cursor: 'pointer',
              flex: 1
            }}
          >
            <Package size={20} />
            <span style={{ fontSize: '0.7rem', fontWeight: activeTab === 'orders' ? 800 : 600 }}>Órdenes</span>
          </button>

          <button
            onClick={() => handleTabChange('business')}
            style={{
              background: 'none',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
              color: activeTab === 'business' ? '#ea580c' : '#78716c',
              cursor: 'pointer',
              flex: 1
            }}
          >
            <Building size={20} />
            <span style={{ fontSize: '0.7rem', fontWeight: activeTab === 'business' ? 800 : 600 }}>Negocio</span>
          </button>

          <button
            onClick={() => handleTabChange('traffic')}
            style={{
              background: 'none',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
              color: activeTab === 'traffic' ? '#ea580c' : '#78716c',
              cursor: 'pointer',
              flex: 1
            }}
          >
            <Compass size={20} />
            <span style={{ fontSize: '0.7rem', fontWeight: activeTab === 'traffic' ? 800 : 600 }}>Tráfico</span>
          </button>

          <button
            onClick={() => handleTabChange('security')}
            style={{
              background: 'none',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
              color: activeTab === 'security' ? '#ea580c' : '#78716c',
              cursor: 'pointer',
              flex: 1
            }}
          >
            <ShieldCheck size={20} />
            <span style={{ fontSize: '0.7rem', fontWeight: activeTab === 'security' ? 800 : 600 }}>Seguridad</span>
          </button>
        </div>
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

      {/* App Móvil & APK Guide Modal */}
      {showAppModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(28, 25, 23, 0.75)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '1rem' }}>
          <div className="glass animate-on-load" style={{ maxWidth: '560px', width: '100%', maxHeight: '90vh', overflowY: 'auto', background: '#ffffff', padding: '2rem', borderRadius: '24px', position: 'relative', boxShadow: '0 25px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ea580c' }}>
                  <Smartphone size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#1c1917' }}>
                    Acceso Móvil & Instalación en Celular
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: '#78716c', margin: 0 }}>
                    Gestiona chats y órdenes directamente desde tu smartphone
                  </p>
                </div>
              </div>
              <button onClick={() => setShowAppModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#78716c', padding: '0.4rem' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Direct APK Download Button */}
              <div style={{ background: '#f0fdf4', padding: '1.25rem', borderRadius: '16px', border: '1.5px solid #86efac' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <Download size={18} color="#16a34a" />
                  <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#166534' }}>
                    📦 Archivo APK Compilado y Listo para Instalar
                  </span>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#15803d', lineHeight: 1.5, margin: '0 0 0.85rem 0' }}>
                  Ya compilamos el paquete instalador <strong>.apk</strong> para tu celular Android. Puedes descargarlo e instalarlo con 1 clic:
                </p>

                <a
                  href="/DigiMemories-Admin.apk"
                  download="DigiMemories-Admin.apk"
                  style={{
                    background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                    color: '#ffffff',
                    padding: '0.85rem 1.25rem',
                    borderRadius: '12px',
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    textDecoration: 'none',
                    boxShadow: '0 4px 14px rgba(22, 163, 74, 0.35)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Download size={18} /> Descargar APK Instalador (11 MB)
                </a>

                <div style={{ fontSize: '0.75rem', color: '#166534', marginTop: '0.65rem' }}>
                  💡 <em>Al abrir el archivo en tu celular Android, selecciona "Instalar" (o "Permitir instalación desde este origen" si te lo solicita).</em>
                </div>
              </div>

              {/* Option 2: PWA Instant Install */}
              <div style={{ background: '#faf8f5', padding: '1.25rem', borderRadius: '16px', border: '1.5px solid #fed7aa' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <Zap size={18} color="#ea580c" />
                  <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#c2410c' }}>
                    Opción 2: Instalación Web Instantánea (PWA)
                  </span>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#44403c', lineHeight: 1.5, margin: '0 0 0.75rem 0' }}>
                  No requiere descargar archivos:
                </p>
                <div style={{ fontSize: '0.8rem', color: '#57534e', display: 'flex', flexDirection: 'column', gap: '0.4rem', background: '#ffffff', padding: '0.85rem', borderRadius: '10px', border: '1px solid #e7e2d9' }}>
                  <div><strong>📱 En Android (Google Chrome):</strong> Abre <code style={{ color: '#ea580c' }}>https://digimemories.vercel.app/admin</code>, toca los tres puntos <code style={{ fontWeight: 800 }}>⋮</code> y selecciona <strong>"Instalar aplicación"</strong>.</div>
                  <div style={{ marginTop: '0.3rem' }}><strong>🍎 En iPhone (Safari):</strong> Abre la página, toca el botón de compartir <Share2 size={13} style={{ display: 'inline' }} /> y selecciona <strong>"Añadir a pantalla de inicio"</strong>.</div>
                </div>
              </div>

              <div style={{ padding: '0.75rem', background: '#ecfdf5', borderRadius: '12px', border: '1px solid #a7f3d0', fontSize: '0.75rem', color: '#065f46', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CheckCircle2 size={16} color="#16a34a" />
                <span>Incluye notificaciones sonoras en tiempo real al recibir mensajes de clientes.</span>
              </div>

              <button
                onClick={() => setShowAppModal(false)}
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.75rem', fontSize: '0.9rem', fontWeight: 800, borderRadius: '12px' }}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
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
