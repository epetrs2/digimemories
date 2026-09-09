import React, { useState, useEffect } from 'react';
import { 
  Search, 
  CheckCircle2, 
  KeyRound, 
  Trash2, 
  Archive, 
  ArchiveRestore, 
  Film, 
  Truck, 
  RefreshCw, 
  Check,
  AlertTriangle
} from 'lucide-react';
import { 
  getOrders, 
  saveOrder, 
  calculateFinalTotal, 
  markOrderAsCompletedAndNotify, 
  updateItem, 
  archiveOrder, 
  deleteOrder, 
  type Order, 
  type OrderItem 
} from '../../lib/store';
import { sendDepositConfirmationAndPinEmail } from '../../lib/emailService';

export const DesktopOrderCockpit: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'activas' | 'pendientes' | 'en_proceso' | 'completadas' | 'archivadas' | 'todas'>('activas');
  const [isGeneratingPin, setIsGeneratingPin] = useState(false);
  const [isCompletingOrder, setIsCompletingOrder] = useState(false);

  const loadOrders = () => {
    const fetched = getOrders();
    setOrders(fetched);
  };

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 3000);
    window.addEventListener('digimemories_orders_sync', loadOrders);
    return () => {
      clearInterval(interval);
      window.removeEventListener('digimemories_orders_sync', loadOrders);
    };
  }, []);

  const filteredOrders = orders.filter(o => {
    if (statusFilter === 'archivadas') return o.isArchived;
    if (statusFilter === 'activas') return !o.isArchived && o.status !== 'completada';
    if (statusFilter === 'pendientes') return !o.isArchived && o.status === 'pendiente';
    if (statusFilter === 'en_proceso') return !o.isArchived && o.status === 'en_proceso';
    if (statusFilter === 'completadas') return !o.isArchived && o.status === 'completada';
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        o.id.toLowerCase().includes(q) ||
        o.clientName.toLowerCase().includes(q) ||
        o.clientEmail.toLowerCase().includes(q) ||
        (o.clientPhone && o.clientPhone.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const selectedOrder = orders.find(o => o.id === selectedOrderId) || filteredOrders[0] || null;

  const handleGeneratePin = async (order: Order) => {
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    const updated: Order = {
      ...order,
      pin,
      depositPaid: true,
      status: 'en_proceso'
    };

    saveOrder(updated);
    loadOrders();

    setIsGeneratingPin(true);
    try {
      await sendDepositConfirmationAndPinEmail({
        order: updated,
        pin,
        total: calculateFinalTotal(updated)
      });
      alert(`✓ PIN ${pin} generado y correo de confirmación de depósito enviado a ${order.clientEmail}.`);
    } catch (err) {
      console.warn('Error enviando correo de PIN:', err);
    } finally {
      setIsGeneratingPin(false);
    }
  };

  const handleItemStatusChange = (orderId: string, itemId: string, newStatus: OrderItem['status']) => {
    const patch: Partial<OrderItem> = { status: newStatus };
    if (newStatus === 'fallida') {
      const order = orders.find(o => o.id === orderId);
      const item = order?.items?.find(i => i.id === itemId);
      if (!item?.failureReason) {
        patch.failureReason = 'Cinta en blanco / sin señal grabada';
      }
    }
    updateItem(orderId, itemId, patch);
    loadOrders();
  };

  const handleUpdateItemField = (orderId: string, itemId: string, patch: Partial<OrderItem>) => {
    updateItem(orderId, itemId, patch);
    loadOrders();
  };

  const handleCompleteOrder = async (order: Order) => {
    if (!window.confirm(`¿Confirmas que se completó la digitalización de la orden #${order.id}? Se enviará la notificación final al cliente.`)) {
      return;
    }

    setIsCompletingOrder(true);
    try {
      await markOrderAsCompletedAndNotify(order.id);
      loadOrders();
      alert('✓ Orden completada y notificación enviada con éxito.');
    } finally {
      setIsCompletingOrder(false);
    }
  };

  const handleToggleArchive = (orderId: string) => {
    archiveOrder(orderId);
    loadOrders();
  };

  const handleDelete = (orderId: string) => {
    if (window.confirm('¿Seguro que deseas eliminar definitivamente esta orden?')) {
      deleteOrder(orderId);
      loadOrders();
    }
  };

  const totalCassettes = orders.reduce((acc, o) => acc + (o.items?.length || 0), 0);
  const activeCassettesInLab = orders
    .filter(o => !o.isArchived && o.status === 'en_proceso')
    .reduce((acc, o) => acc + (o.items?.length || 0), 0);

  return (
    <div style={{ display: 'flex', width: '100%', height: 'calc(100vh - 48px)', overflow: 'hidden' }}>
      
      {/* 1. LEFT COLUMN: ORDERS LIST */}
      <div style={{
        width: '380px',
        borderRight: '1px solid var(--mac-border)',
        background: 'var(--mac-bg-sidebar)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0
      }}>
        {/* Header & Filters */}
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--mac-border)', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--mac-text-primary)' }}>
              Órdenes de Laboratorio ({orders.length})
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--mac-accent)', fontWeight: 700 }}>
              {activeCassettesInLab} en proceso ({totalCassettes} totales)
            </span>
          </div>

          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--mac-text-muted)' }} />
            <input 
              type="text"
              placeholder="Buscar por ID #, cliente o correo..."
              className="mac-input"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%', paddingLeft: '2rem', fontSize: '0.8rem', boxSizing: 'border-box' }}
            />
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
            {[
              { id: 'activas', label: 'Activas' },
              { id: 'pendientes', label: 'Por Iniciar' },
              { id: 'en_proceso', label: 'En Proceso' },
              { id: 'completadas', label: 'Listas' },
              { id: 'archivadas', label: 'Archivadas' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id as any)}
                style={{
                  background: statusFilter === f.id ? 'rgba(234, 88, 12, 0.22)' : 'rgba(255, 255, 255, 0.05)',
                  color: statusFilter === f.id ? 'var(--mac-accent)' : 'var(--mac-text-secondary)',
                  border: statusFilter === f.id ? '1px solid rgba(234, 88, 12, 0.4)' : '1px solid transparent',
                  padding: '0.2rem 0.55rem',
                  borderRadius: '6px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Orders Scroll List */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {filteredOrders.map(o => {
            const isSelected = selectedOrder?.id === o.id;
            const finalTotal = calculateFinalTotal(o);

            return (
              <div
                key={o.id}
                onClick={() => setSelectedOrderId(o.id)}
                style={{
                  padding: '0.9rem 1rem',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                  background: isSelected ? 'rgba(234, 88, 12, 0.12)' : 'transparent',
                  borderLeft: isSelected ? '3px solid var(--mac-accent)' : '3px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--mac-text-primary)' }}>
                    #{o.id} — {o.clientName}
                  </span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#34d399' }}>
                    ${finalTotal.toLocaleString('es-MX')} MXN
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--mac-text-muted)' }}>
                  <span>{o.items?.length || 0} cintas ({o.items?.map(i => i.format).slice(0, 3).join(', ')})</span>
                  <span>{new Date(o.createdAt).toLocaleDateString('es-MX')}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.45rem' }}>
                  <span style={{
                    fontSize: '0.68rem',
                    padding: '0.1rem 0.45rem',
                    borderRadius: '4px',
                    fontWeight: 800,
                    background: o.status === 'completada' ? 'rgba(16, 185, 129, 0.2)' : o.status === 'en_proceso' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                    color: o.status === 'completada' ? '#34d399' : o.status === 'en_proceso' ? '#fbbf24' : '#d6d3d1'
                  }}>
                    {o.status === 'completada' ? 'Completada' : o.status === 'en_proceso' ? 'En Digitalización' : 'Pendiente Depósito'}
                  </span>

                  {o.pin ? (
                    <span style={{ fontSize: '0.68rem', color: '#38bdf8', fontWeight: 800 }}>
                      PIN: {o.pin}
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.68rem', color: '#f87171', fontWeight: 700 }}>
                      Sin PIN
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {filteredOrders.length === 0 && (
            <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--mac-text-muted)', fontSize: '0.85rem' }}>
              No se encontraron órdenes con el filtro actual.
            </div>
          )}
        </div>
      </div>

      {/* 2. RIGHT COLUMN: WORKSTATION COCKPIT INSPECTOR */}
      {selectedOrder ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--mac-bg-base)', overflowY: 'auto' }}>
          
          {/* Cockpit Top Bar */}
          <div style={{
            padding: '1.25rem 2rem',
            borderBottom: '1px solid var(--mac-border)',
            background: 'var(--mac-bg-surface)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'var(--mac-text-primary)' }}>
                  Orden #{selectedOrder.id}
                </h2>
                <span className={selectedOrder.status === 'completada' ? "mac-badge-emerald" : "mac-badge-amber"}>
                  {selectedOrder.status === 'completada' ? 'Completada' : selectedOrder.status === 'en_proceso' ? 'En Digitalización' : 'Pendiente'}
                </span>
                {selectedOrder.isArchived && (
                  <span style={{ fontSize: '0.72rem', background: 'rgba(255, 255, 255, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '999px', color: 'var(--mac-text-muted)' }}>
                    Archivada
                  </span>
                )}
              </div>
              <span style={{ fontSize: '0.85rem', color: 'var(--mac-text-muted)' }}>
                Cliente: {selectedOrder.clientName} ({selectedOrder.clientEmail})
              </span>
            </div>

            {/* Top Action Buttons */}
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
              {!selectedOrder.pin && (
                <button
                  onClick={() => handleGeneratePin(selectedOrder)}
                  disabled={isGeneratingPin}
                  className="mac-btn-primary"
                  style={{ fontSize: '0.82rem' }}
                >
                  {isGeneratingPin ? <RefreshCw size={14} className="animate-spin" /> : <KeyRound size={14} />}
                  Asignar PIN y Confirmar Depósito
                </button>
              )}

              {selectedOrder.status !== 'completada' && (
                <button
                  onClick={() => handleCompleteOrder(selectedOrder)}
                  disabled={isCompletingOrder}
                  style={{
                    padding: '0.55rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid #059669',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    cursor: 'pointer'
                  }}
                >
                  <CheckCircle2 size={15} /> Finalizar y Notificar
                </button>
              )}

              <button
                onClick={() => handleToggleArchive(selectedOrder.id)}
                className="mac-btn-secondary"
                style={{ fontSize: '0.82rem' }}
                title={selectedOrder.isArchived ? "Restaurar orden" : "Archivar orden"}
              >
                {selectedOrder.isArchived ? <ArchiveRestore size={15} /> : <Archive size={15} />}
              </button>

              <button
                onClick={() => handleDelete(selectedOrder.id)}
                className="mac-btn-secondary"
                style={{ fontSize: '0.82rem', color: '#ef4444' }}
                title="Eliminar orden"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>

          {/* Cockpit Content Body */}
          <div style={{ padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Quick Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              
              {/* Card 1: Logistics */}
              <div className="mac-card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--mac-accent)', fontWeight: 800, fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                  <Truck size={16} /> Logística y Entrega
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--mac-text-primary)', fontWeight: 600 }}>
                  {selectedOrder.deliveryType === 'home_delivery' ? 'Entrega a Domicilio' : selectedOrder.deliveryType === 'national_shipping' ? 'Envío Nacional' : 'Recolección en Taller'}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--mac-text-muted)', marginTop: '0.25rem' }}>
                  {selectedOrder.deliveryAddress || 'Recepción física en mostrador'}
                </div>
              </div>

              {/* Card 2: PIN and Tracking */}
              <div className="mac-card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#38bdf8', fontWeight: 800, fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                  <KeyRound size={16} /> Clave PIN de Rastreo
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: selectedOrder.pin ? '#38bdf8' : '#f87171', letterSpacing: '0.1em' }}>
                  {selectedOrder.pin || 'SIN ASIGNAR'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--mac-text-muted)', marginTop: '0.2rem' }}>
                  {selectedOrder.depositPaid ? '✓ Depósito recibido' : 'Pendiente de confirmación'}
                </div>
              </div>

              {/* Card 3: Financials */}
              <div className="mac-card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#34d399', fontWeight: 800, fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                  <Check size={16} /> Total de la Orden
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#34d399' }}>
                  ${calculateFinalTotal(selectedOrder).toLocaleString('es-MX')} MXN
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--mac-text-muted)', marginTop: '0.2rem' }}>
                  {selectedOrder.addAudioVideoEnhancement ? 'Incluye remasterización HD' : 'Digitalización directa estándar'}
                </div>
              </div>

            </div>

            {/* Tape-by-Tape Laboratory Queue */}
            <div className="mac-glass-panel" style={{ borderRadius: '18px', padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Film size={18} style={{ color: 'var(--mac-accent)' }} />
                  <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--mac-text-primary)' }}>
                    Control de Digitalización por Casete ({selectedOrder.items?.length || 0})
                  </h4>
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--mac-text-muted)' }}>
                  Actualización en tiempo real hacia la página web del cliente
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {selectedOrder.items?.map((item, idx) => (
                  <div 
                    key={item.id}
                    style={{
                      padding: '1rem',
                      borderRadius: '12px',
                      background: 'var(--mac-bg-card)',
                      border: item.status === 'fallida' ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--mac-border)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.85rem'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '0.75rem'
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--mac-accent)' }}>
                            #{idx + 1}
                          </span>
                          <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--mac-text-primary)' }}>
                            Formato: {item.format}
                          </span>
                          {item.extraHours > 0 && (
                            <span style={{ fontSize: '0.7rem', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.15)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                              +{item.extraHours}h extras
                            </span>
                          )}
                          {item.status === 'fallida' && (
                            <span style={{ fontSize: '0.72rem', color: '#f87171', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '0.1rem 0.45rem', borderRadius: '6px', fontWeight: 700 }}>
                              Motivo: {item.failureReason || 'Cinta en blanco / sin señal grabada'}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--mac-text-muted)', marginTop: '0.2rem' }}>
                          {item.notes || 'Sin observaciones de laboratorio'}
                        </div>
                      </div>

                      {/* Status Dropdown / Buttons */}
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        {[
                          { id: 'pendiente', label: 'Pendiente', color: '#9ca3af' },
                          { id: 'digitalizando', label: 'En Digitalizadora', color: '#fbbf24' },
                          { id: 'completada', label: 'Digitalizado', color: '#34d399' },
                          { id: 'fallida', label: 'Cinta Dañada', color: '#f87171' }
                        ].map(s => {
                          const isCurrent = item.status === s.id;
                          return (
                            <button
                              key={s.id}
                              onClick={() => handleItemStatusChange(selectedOrder.id, item.id, s.id as any)}
                              style={{
                                padding: '0.35rem 0.7rem',
                                borderRadius: '6px',
                                border: isCurrent ? `1px solid ${s.color}` : '1px solid var(--mac-border)',
                                background: isCurrent ? `${s.color}25` : 'transparent',
                                color: isCurrent ? s.color : 'var(--mac-text-muted)',
                                fontSize: '0.74rem',
                                fontWeight: isCurrent ? 800 : 500,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              {s.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Diagnostic Inspector for Damaged Tapes */}
                    {item.status === 'fallida' && (
                      <div style={{
                        width: '100%',
                        padding: '0.85rem 1rem',
                        borderRadius: '10px',
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.65rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#f87171', fontSize: '0.82rem', fontWeight: 800 }}>
                            <AlertTriangle size={15} />
                            <span>Diagnóstico de Laboratorio: Especificar Motivo de Falla</span>
                          </div>
                          <span style={{ fontSize: '0.72rem', color: 'var(--mac-text-muted)' }}>
                            Se guardará en el expediente de la orden
                          </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
                          <div>
                            <label style={{ fontSize: '0.72rem', color: 'var(--mac-text-secondary)', fontWeight: 700, display: 'block', marginBottom: '0.3rem' }}>
                              Motivo Técnico Específico *
                            </label>
                            <select
                              className="mac-input"
                              style={{ width: '100%', fontSize: '0.78rem', padding: '0.45rem 0.65rem', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                              value={item.failureReason || 'Cinta en blanco / sin señal grabada'}
                              onChange={e => handleUpdateItemField(selectedOrder.id, item.id, { failureReason: e.target.value })}
                            >
                              <option value="Cinta en blanco / sin señal grabada">📼 Cinta en blanco / sin señal grabada</option>
                              <option value="Cinta rota o desprendida del carrete">✂️ Cinta rota o desprendida del carrete</option>
                              <option value="Moho u hongo severo (adhesión química)">🦠 Moho u hongo severo (adhesión química)</option>
                              <option value="Desmagnetización severa / señal irrecuperable">🧲 Desmagnetización / pérdida total de señal</option>
                              <option value="Mecanismo de cartucho trabado / carcasa fracturada">⚙️ Mecanismo de cartucho trabado o roto</option>
                              <option value="Disco con rayas profundas / errores de lectura I/O">💿 Disco rayado con error de lectura I/O</option>
                              <option value="Daño por humedad o calor extremo">🔥 Daño por humedad o calor extremo</option>
                              <option value="Otro motivo técnico">🔍 Otro motivo técnico (especificar notas)</option>
                            </select>
                          </div>

                          <div>
                            <label style={{ fontSize: '0.72rem', color: 'var(--mac-text-secondary)', fontWeight: 700, display: 'block', marginBottom: '0.3rem' }}>
                              Observaciones Técnicas / Notas de Laboratorio
                            </label>
                            <input
                              type="text"
                              className="mac-input"
                              placeholder="ej. Requirió empalme en minuto 12; moho limpiado..."
                              style={{ width: '100%', fontSize: '0.78rem', padding: '0.45rem 0.65rem' }}
                              value={item.notes || ''}
                              onChange={e => handleUpdateItemField(selectedOrder.id, item.id, { notes: e.target.value })}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--mac-text-muted)' }}>
          Selecciona una orden de la lista para ver el control de digitalización.
        </div>
      )}

    </div>
  );
};

export default DesktopOrderCockpit;
