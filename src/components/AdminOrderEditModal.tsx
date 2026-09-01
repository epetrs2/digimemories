import React, { useState } from 'react';
import type { Order, OrderItem } from '../lib/store';
import { updateOrder } from '../lib/store';
import { 
  X, 
  Save, 
  MapPin, 
  Truck, 
  Building, 
  User, 
  Mail, 
  Phone, 
  FileText, 
  Plus, 
  Trash2, 
  CheckCircle,
  Hash,
  DollarSign
} from 'lucide-react';

interface Props {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (updatedOrder: Order) => void;
}

export const AdminOrderEditModal: React.FC<Props> = ({ order, isOpen, onClose, onSaved }) => {
  const [formData, setFormData] = useState({
    clientName: order.clientName || '',
    clientEmail: order.clientEmail || '',
    clientPhone: order.clientPhone || '',
    status: order.status || 'pendiente',
    depositPaid: order.depositPaid || false,
    pin: order.pin || '',
    estimatedTotal: order.estimatedTotal || 0,
    generalNotes: order.generalNotes || '',
    addAudioVideoEnhancement: order.addAudioVideoEnhancement || false,
    deliveryType: order.deliveryType || 'taller_pickup',
    deliveryAddress: order.deliveryAddress || '',
    deliveryNotes: order.deliveryNotes || '',
    tallerAddress: order.tallerAddress || 'Av. Insurgentes Sur #450, Col. Roma Sur, Cuauhtémoc, CDMX',
    trackingCourierNumber: order.trackingCourierNumber || ''
  });

  const [items, setItems] = useState<OrderItem[]>(order.items ? JSON.parse(JSON.stringify(order.items)) : []);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const handleAddItem = (formatName: string = 'Cintas (VHS / Beta / Hi8)') => {
    const newItem: OrderItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      format: formatName,
      status: 'pendiente',
      extraHours: 0,
      notes: ''
    };
    setItems(prev => [...prev, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const handleItemChange = (id: string, field: keyof OrderItem, value: any) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const updated = updateOrder(order.id, {
      ...formData,
      items
    });

    setIsSaving(false);
    if (updated) {
      setSaveSuccess(true);
      onSaved(updated);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1200);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(28, 25, 23, 0.75)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      overflowY: 'auto'
    }}>
      <div 
        className="glass animate-on-load"
        style={{
          width: '100%',
          maxWidth: '860px',
          maxHeight: '90vh',
          background: '#ffffff',
          borderRadius: '24px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.3)',
          border: '1px solid rgba(214, 204, 194, 0.9)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          margin: 'auto'
        }}
      >
        
        {/* Modal Header */}
        <div style={{
          padding: '1.25rem 1.75rem',
          borderBottom: '1px solid var(--glass-border)',
          background: '#faf8f5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
              border: '1.5px solid #fed7aa',
              color: '#ea580c',
              fontWeight: 900,
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 10px rgba(234, 88, 12, 0.12)'
            }}>
              #{order.id}
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#1c1917' }}>
                Editar Datos de la Orden & Logística
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#78716c', margin: 0, marginTop: '2px' }}>
                Modifica cliente, dirección de entrega, taller asignado y cintas
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#78716c',
              cursor: 'pointer',
              padding: '0.5rem',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s ease'
            }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Modal Form Scrollable Area */}
        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* SECTION 1: DATOS DEL CLIENTE */}
          <div style={{
            background: '#faf8f5',
            padding: '1.25rem',
            borderRadius: '16px',
            border: '1px solid #e7e2d9',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: '#ea580c', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <User size={16} /> Información del Cliente
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#44403c', marginBottom: '0.35rem' }}>
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  value={formData.clientName}
                  onChange={e => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
                  className="input-field"
                  style={{ width: '100%', padding: '0.65rem 0.9rem', fontSize: '0.9rem', borderRadius: '10px', background: '#ffffff' }}
                />
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 700, color: '#44403c', marginBottom: '0.35rem' }}>
                  <Mail size={13} /> Correo Electrónico
                </label>
                <input
                  type="email"
                  required
                  value={formData.clientEmail}
                  onChange={e => setFormData(prev => ({ ...prev, clientEmail: e.target.value }))}
                  className="input-field"
                  style={{ width: '100%', padding: '0.65rem 0.9rem', fontSize: '0.9rem', borderRadius: '10px', background: '#ffffff' }}
                />
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 700, color: '#44403c', marginBottom: '0.35rem' }}>
                  <Phone size={13} /> WhatsApp / Teléfono
                </label>
                <input
                  type="text"
                  value={formData.clientPhone}
                  onChange={e => setFormData(prev => ({ ...prev, clientPhone: e.target.value }))}
                  placeholder="+52 55 1234 5678"
                  className="input-field"
                  style={{ width: '100%', padding: '0.65rem 0.9rem', fontSize: '0.9rem', borderRadius: '10px', background: '#ffffff' }}
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: LOGÍSTICA & DIRECCIONES */}
          <div style={{
            background: '#faf8f5',
            padding: '1.25rem',
            borderRadius: '16px',
            border: '1px solid #e7e2d9',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: '#ea580c', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Truck size={16} /> Modalidad y Dirección de Entrega
            </div>

            {/* Delivery Type Selector Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, deliveryType: 'taller_pickup' }))}
                style={{
                  padding: '0.9rem',
                  textAlign: 'left',
                  borderRadius: '12px',
                  border: formData.deliveryType === 'taller_pickup' ? '2px solid #ea580c' : '1px solid #d6d3d1',
                  background: formData.deliveryType === 'taller_pickup' ? '#fff7ed' : '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '0.85rem', color: formData.deliveryType === 'taller_pickup' ? '#ea580c' : '#1c1917' }}>
                  <Building size={16} /> Recoger en Taller
                </div>
                <div style={{ fontSize: '0.75rem', color: '#78716c', marginTop: '4px' }}>
                  El cliente acude a la sucursal física
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, deliveryType: 'home_delivery' }))}
                style={{
                  padding: '0.9rem',
                  textAlign: 'left',
                  borderRadius: '12px',
                  border: formData.deliveryType === 'home_delivery' ? '2px solid #ea580c' : '1px solid #d6d3d1',
                  background: formData.deliveryType === 'home_delivery' ? '#fff7ed' : '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '0.85rem', color: formData.deliveryType === 'home_delivery' ? '#ea580c' : '#1c1917' }}>
                  <MapPin size={16} /> Entrega Local CDMX
                </div>
                <div style={{ fontSize: '0.75rem', color: '#78716c', marginTop: '4px' }}>
                  Chofer o mensajero a domicilio
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, deliveryType: 'national_shipping' }))}
                style={{
                  padding: '0.9rem',
                  textAlign: 'left',
                  borderRadius: '12px',
                  border: formData.deliveryType === 'national_shipping' ? '2px solid #ea580c' : '1px solid #d6d3d1',
                  background: formData.deliveryType === 'national_shipping' ? '#fff7ed' : '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '0.85rem', color: formData.deliveryType === 'national_shipping' ? '#ea580c' : '#1c1917' }}>
                  <Truck size={16} /> Envío Nacional
                </div>
                <div style={{ fontSize: '0.75rem', color: '#78716c', marginTop: '4px' }}>
                  Guía con DHL / Estafeta
                </div>
              </button>
            </div>

            {/* Addresses Input Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 700, color: '#44403c', marginBottom: '0.35rem' }}>
                  <MapPin size={13} /> Dirección de Entrega / Recolección del Cliente
                </label>
                <textarea
                  rows={2}
                  value={formData.deliveryAddress}
                  onChange={e => setFormData(prev => ({ ...prev, deliveryAddress: e.target.value }))}
                  placeholder="Calle, Número Ext/Int, Colonia, Alcaldía/Municipio, C.P., Referencias..."
                  className="input-field"
                  style={{ width: '100%', padding: '0.65rem 0.9rem', fontSize: '0.85rem', borderRadius: '10px', background: '#ffffff', resize: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 700, color: '#44403c', marginBottom: '0.35rem' }}>
                  <Building size={13} /> Dirección del Taller / Sucursal Asignada
                </label>
                <textarea
                  rows={2}
                  value={formData.tallerAddress}
                  onChange={e => setFormData(prev => ({ ...prev, tallerAddress: e.target.value }))}
                  placeholder="Dirección del taller oficial donde se trabaja el material..."
                  className="input-field"
                  style={{ width: '100%', padding: '0.65rem 0.9rem', fontSize: '0.85rem', borderRadius: '10px', background: '#ffffff', resize: 'none' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#44403c', marginBottom: '0.35rem' }}>
                  Número de Guía / Tracking de Paquetería (Opcional)
                </label>
                <input
                  type="text"
                  value={formData.trackingCourierNumber}
                  onChange={e => setFormData(prev => ({ ...prev, trackingCourierNumber: e.target.value }))}
                  placeholder="ej. DHL 1849382910 o Uber Flash ID"
                  className="input-field"
                  style={{ width: '100%', padding: '0.65rem 0.9rem', fontSize: '0.85rem', borderRadius: '10px', background: '#ffffff' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#44403c', marginBottom: '0.35rem' }}>
                  Instrucciones de Entrega / Notas del Repartidor
                </label>
                <input
                  type="text"
                  value={formData.deliveryNotes}
                  onChange={e => setFormData(prev => ({ ...prev, deliveryNotes: e.target.value }))}
                  placeholder="ej. Tocar timbre blanco, dejar en portería..."
                  className="input-field"
                  style={{ width: '100%', padding: '0.65rem 0.9rem', fontSize: '0.85rem', borderRadius: '10px', background: '#ffffff' }}
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: ESTADO, PIN & FINANZAS */}
          <div style={{
            background: '#faf8f5',
            padding: '1.25rem',
            borderRadius: '16px',
            border: '1px solid #e7e2d9',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: '#ea580c', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <DollarSign size={16} /> Estado Financiero y PIN de Rastreo
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#44403c', marginBottom: '0.35rem' }}>
                  Estado de la Orden
                </label>
                <select
                  value={formData.status}
                  onChange={e => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                  className="input-field"
                  style={{ width: '100%', padding: '0.65rem 0.9rem', fontSize: '0.85rem', borderRadius: '10px', background: '#ffffff' }}
                >
                  <option value="pendiente">⏳ Pendiente de Anticipo</option>
                  <option value="en_proceso">🔄 En Digitalización</option>
                  <option value="completada">✓ Completada y Lista</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#44403c', marginBottom: '0.35rem' }}>
                  Anticipo 50%
                </label>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, depositPaid: !prev.depositPaid }))}
                  style={{
                    width: '100%',
                    padding: '0.65rem',
                    borderRadius: '10px',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    border: formData.depositPaid ? '1px solid #86efac' : '1px solid #d6d3d1',
                    background: formData.depositPaid ? '#dcfce7' : '#f5f5f4',
                    color: formData.depositPaid ? '#15803d' : '#78716c',
                    cursor: 'pointer'
                  }}
                >
                  <CheckCircle size={15} /> {formData.depositPaid ? '✓ Pagado' : 'Pendiente'}
                </button>
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 700, color: '#44403c', marginBottom: '0.35rem' }}>
                  <Hash size={13} /> PIN de Rastreo (4 dígitos)
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={formData.pin}
                  onChange={e => setFormData(prev => ({ ...prev, pin: e.target.value }))}
                  placeholder="ej. 8492"
                  className="input-field"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.9rem',
                    fontSize: '0.95rem',
                    fontFamily: 'monospace',
                    fontWeight: 900,
                    textAlign: 'center',
                    letterSpacing: '3px',
                    color: '#ea580c',
                    borderRadius: '10px',
                    background: '#ffffff'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#44403c', marginBottom: '0.35rem' }}>
                  Total Estimado ($ MXN)
                </label>
                <input
                  type="number"
                  value={formData.estimatedTotal}
                  onChange={e => setFormData(prev => ({ ...prev, estimatedTotal: Number(e.target.value) }))}
                  className="input-field"
                  style={{ width: '100%', padding: '0.65rem 0.9rem', fontSize: '0.9rem', fontWeight: 800, borderRadius: '10px', background: '#ffffff' }}
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: ITEMS / CINTAS */}
          <div style={{
            background: '#faf8f5',
            padding: '1.25rem',
            borderRadius: '16px',
            border: '1px solid #e7e2d9',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: '#ea580c', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={16} /> Lote de Cintas y Material ({items.length})
              </div>
              <button
                type="button"
                onClick={() => handleAddItem()}
                style={{
                  padding: '0.4rem 0.85rem',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  borderRadius: '8px',
                  background: '#ea580c',
                  color: '#ffffff',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(234, 88, 12, 0.25)'
                }}
              >
                <Plus size={14} /> Añadir Cinta
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {items.map((item, idx) => (
                <div 
                  key={item.id} 
                  style={{
                    padding: '0.75rem',
                    background: '#ffffff',
                    border: '1px solid #e7e2d9',
                    borderRadius: '12px',
                    display: 'grid',
                    gridTemplateColumns: '30px 1.5fr 1fr 1fr 36px',
                    gap: '0.6rem',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#a8a29e' }}>
                    #{idx + 1}
                  </div>

                  <input
                    type="text"
                    value={item.format}
                    onChange={e => handleItemChange(item.id, 'format', e.target.value)}
                    placeholder="Formato (ej. VHS Boda 1995)"
                    className="input-field"
                    style={{ padding: '0.45rem 0.65rem', fontSize: '0.8rem', borderRadius: '8px' }}
                  />

                  <select
                    value={item.status}
                    onChange={e => handleItemChange(item.id, 'status', e.target.value)}
                    className="input-field"
                    style={{ padding: '0.45rem 0.65rem', fontSize: '0.8rem', borderRadius: '8px' }}
                  >
                    <option value="pendiente">⏳ Pendiente</option>
                    <option value="digitalizando">🔄 En Digitalización</option>
                    <option value="completada">✓ Completada</option>
                    <option value="fallida">❌ Fallida</option>
                  </select>

                  <input
                    type="text"
                    value={item.notes}
                    onChange={e => handleItemChange(item.id, 'notes', e.target.value)}
                    placeholder="Notas técnicas..."
                    className="input-field"
                    style={{ padding: '0.45rem 0.65rem', fontSize: '0.8rem', borderRadius: '8px' }}
                  />

                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#a8a29e',
                      cursor: 'pointer',
                      padding: '0.4rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '6px'
                    }}
                    title="Eliminar ítem"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div style={{
          padding: '1.25rem 1.75rem',
          borderTop: '1px solid var(--glass-border)',
          background: '#faf8f5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '0.6rem 1.25rem', fontSize: '0.85rem' }}
          >
            Cancelar
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            {saveSuccess && (
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle size={16} /> ¡Cambios guardados con éxito!
              </span>
            )}
            <button
              onClick={handleSubmit}
              disabled={isSaving}
              className="btn btn-primary"
              style={{ padding: '0.7rem 1.75rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Save size={16} /> {isSaving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
export default AdminOrderEditModal;
