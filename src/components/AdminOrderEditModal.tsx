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
      }, 1000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-8">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950/60 flex items-center justify-center text-orange-600 font-bold text-lg border border-orange-200 dark:border-orange-900">
              #{order.id}
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900 dark:text-white">
                Editar Datos de la Orden & Logística
              </h2>
              <p className="text-xs text-stone-500">
                Modifica cliente, dirección de entrega, taller asignado y cintas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 dark:hover:text-white rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* SECTION 1: DATOS DEL CLIENTE */}
          <div className="bg-stone-50 dark:bg-stone-950/50 p-4 rounded-xl border border-stone-200 dark:border-stone-800 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-orange-600 flex items-center gap-2">
              <User size={16} /> Información del Cliente
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={formData.clientName}
                  onChange={e => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg text-stone-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1 flex items-center gap-1">
                  <Mail size={12} /> Correo Electrónico
                </label>
                <input
                  type="email"
                  required
                  value={formData.clientEmail}
                  onChange={e => setFormData(prev => ({ ...prev, clientEmail: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg text-stone-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1 flex items-center gap-1">
                  <Phone size={12} /> WhatsApp / Teléfono
                </label>
                <input
                  type="text"
                  value={formData.clientPhone}
                  onChange={e => setFormData(prev => ({ ...prev, clientPhone: e.target.value }))}
                  placeholder="+52 55 1234 5678"
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg text-stone-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: LOGÍSTICA & DIRECCIONES */}
          <div className="bg-stone-50 dark:bg-stone-950/50 p-4 rounded-xl border border-stone-200 dark:border-stone-800 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-orange-600 flex items-center gap-2">
              <Truck size={16} /> Modalidad y Dirección de Entrega
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, deliveryType: 'taller_pickup' }))}
                className={`p-3 text-left rounded-xl border transition ${
                  formData.deliveryType === 'taller_pickup'
                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 font-bold'
                    : 'border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:bg-white dark:hover:bg-stone-900'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold text-sm">
                  <Building size={16} /> Recoger en Taller
                </div>
                <div className="text-xs text-stone-500 mt-1">El cliente acude a la sucursal física</div>
              </button>

              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, deliveryType: 'home_delivery' }))}
                className={`p-3 text-left rounded-xl border transition ${
                  formData.deliveryType === 'home_delivery'
                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 font-bold'
                    : 'border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:bg-white dark:hover:bg-stone-900'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold text-sm">
                  <MapPin size={16} /> Entrega Local CDMX
                </div>
                <div className="text-xs text-stone-500 mt-1">Chofer o mensajero a domicilio</div>
              </button>

              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, deliveryType: 'national_shipping' }))}
                className={`p-3 text-left rounded-xl border transition ${
                  formData.deliveryType === 'national_shipping'
                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 font-bold'
                    : 'border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:bg-white dark:hover:bg-stone-900'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold text-sm">
                  <Truck size={16} /> Envío Nacional (DHL/Estafeta)
                </div>
                <div className="text-xs text-stone-500 mt-1">Guía con paquetería express</div>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1 flex items-center gap-1">
                  <MapPin size={12} /> Dirección de Entrega / Recolección del Cliente
                </label>
                <textarea
                  rows={2}
                  value={formData.deliveryAddress}
                  onChange={e => setFormData(prev => ({ ...prev, deliveryAddress: e.target.value }))}
                  placeholder="Calle, Número Ext/Int, Colonia, Alcaldía/Municipio, C.P., Referencias..."
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg text-stone-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1 flex items-center gap-1">
                  <Building size={12} /> Dirección del Taller / Sucursal Asignada
                </label>
                <textarea
                  rows={2}
                  value={formData.tallerAddress}
                  onChange={e => setFormData(prev => ({ ...prev, tallerAddress: e.target.value }))}
                  placeholder="Dirección del taller oficial donde se trabaja el material..."
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg text-stone-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none resize-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                  Número de Guía / Tracking de Paquetería (Opcional)
                </label>
                <input
                  type="text"
                  value={formData.trackingCourierNumber}
                  onChange={e => setFormData(prev => ({ ...prev, trackingCourierNumber: e.target.value }))}
                  placeholder="ej. DHL 1849382910 o Uber Flash ID"
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg text-stone-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                  Instrucciones de Entrega / Notas del Repartidor
                </label>
                <input
                  type="text"
                  value={formData.deliveryNotes}
                  onChange={e => setFormData(prev => ({ ...prev, deliveryNotes: e.target.value }))}
                  placeholder="ej. Tocar timbre blanco, dejar con portería..."
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg text-stone-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: ESTADO, PIN & FINANZAS */}
          <div className="bg-stone-50 dark:bg-stone-950/50 p-4 rounded-xl border border-stone-200 dark:border-stone-800 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-orange-600 flex items-center gap-2">
              <DollarSign size={16} /> Estado Financiero y PIN de Rastreo
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">Estado de la Orden</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg text-stone-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
                >
                  <option value="pendiente">Pendiente de Anticipo</option>
                  <option value="en_proceso">En Proceso de Digitalización</option>
                  <option value="completada">Completada y Lista para Entrega</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">Anticipo 50%</label>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, depositPaid: !prev.depositPaid }))}
                  className={`w-full py-2 px-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 border transition ${
                    formData.depositPaid
                      ? 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300 border-green-300 dark:border-green-800'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border-stone-300 dark:border-stone-700'
                  }`}
                >
                  <CheckCircle size={16} /> {formData.depositPaid ? '✓ Pagado' : 'Pendiente'}
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1 flex items-center gap-1">
                  <Hash size={12} /> PIN de Rastreo (4 dígitos)
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={formData.pin}
                  onChange={e => setFormData(prev => ({ ...prev, pin: e.target.value }))}
                  placeholder="ej. 8492"
                  className="w-full px-3 py-2 text-sm font-mono tracking-widest text-center bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg text-orange-600 font-bold focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">Total Estimado ($ MXN)</label>
                <input
                  type="number"
                  value={formData.estimatedTotal}
                  onChange={e => setFormData(prev => ({ ...prev, estimatedTotal: Number(e.target.value) }))}
                  className="w-full px-3 py-2 text-sm font-bold text-stone-900 dark:text-white bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: ITEMS / CINTAS */}
          <div className="bg-stone-50 dark:bg-stone-950/50 p-4 rounded-xl border border-stone-200 dark:border-stone-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-orange-600 flex items-center gap-2">
                <FileText size={16} /> Lote de Cintas y Material ({items.length})
              </h3>
              <button
                type="button"
                onClick={() => handleAddItem()}
                className="px-3 py-1.5 text-xs bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg flex items-center gap-1 transition shadow-sm"
              >
                <Plus size={14} /> Añadir Cinta
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={item.id} className="p-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                  <div className="md:col-span-1 text-xs font-bold text-stone-400">
                    #{idx + 1}
                  </div>
                  <div className="md:col-span-4">
                    <input
                      type="text"
                      value={item.format}
                      onChange={e => handleItemChange(item.id, 'format', e.target.value)}
                      placeholder="Formato (ej. VHS Boda 1995)"
                      className="w-full px-2.5 py-1.5 text-xs bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-lg text-stone-900 dark:text-white outline-none"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <select
                      value={item.status}
                      onChange={e => handleItemChange(item.id, 'status', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-lg text-stone-900 dark:text-white outline-none"
                    >
                      <option value="pendiente">⏳ Pendiente</option>
                      <option value="digitalizando">🔄 En Digitalización</option>
                      <option value="completada">✓ Completada</option>
                      <option value="fallida">❌ Fallida / Dañada</option>
                    </select>
                  </div>
                  <div className="md:col-span-3">
                    <input
                      type="text"
                      value={item.notes}
                      onChange={e => handleItemChange(item.id, 'notes', e.target.value)}
                      placeholder="Notas del técnico..."
                      className="w-full px-2.5 py-1.5 text-xs bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-lg text-stone-900 dark:text-white outline-none"
                    />
                  </div>
                  <div className="md:col-span-1 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-1.5 text-stone-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 transition"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800 rounded-xl transition"
          >
            Cancelar
          </button>
          
          <div className="flex items-center gap-3">
            {saveSuccess && (
              <span className="text-xs font-bold text-green-600 flex items-center gap-1">
                <CheckCircle size={14} /> ¡Cambios guardados con éxito!
              </span>
            )}
            <button
              onClick={handleSubmit}
              disabled={isSaving}
              className="px-6 py-2 text-sm font-bold bg-orange-600 hover:bg-orange-500 text-white rounded-xl shadow-lg shadow-orange-600/20 flex items-center gap-2 transition disabled:opacity-50"
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
