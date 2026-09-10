export type OrderStatus = 'pendiente' | 'en_proceso' | 'completada';
export type ItemStatus = 'pendiente' | 'digitalizando' | 'completada' | 'fallida';

export interface OrderItem {
  id: string;
  format: string;
  status: ItemStatus;
  extraHours: number;
  notes: string;
  customLabel?: string; // Etiqueta manuscrita original marcada en el casete
  failureReason?: string;
  failureNote?: string;
  failurePhotoUrl?: string;
}

export interface EmailNotification {
  id: string;
  orderId?: string;
  toEmail: string;
  toName: string;
  subject: string;
  snippet: string;
  bodyHtml: string;
  type: 'quote' | 'order_completed' | 'pin_issued' | 'custom';
  sentAt: string;
}

export interface Order {
  id: string; // 6-digit tracking ID
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  createdAt: string;
  updatedAt?: string;
  
  // Pricing
  estimatedTotal: number;
  depositPaid: boolean;
  
  // Tracking & Auth
  pin: string | null;
  status: OrderStatus;
  completedAt?: string;
  completionEmailSent?: boolean;
  
  // Details
  items: OrderItem[];
  addAudioVideoEnhancement: boolean;
  generalNotes: string;

  // Delivery & Logistics
  deliveryType?: 'taller_pickup' | 'home_delivery' | 'national_shipping';
  deliveryAddress?: string;
  deliveryNotes?: string;
  tallerAddress?: string;
  trackingCourierNumber?: string;
  qualifiesForFreeReturn?: boolean;

  // Payments
  preferredPaymentMethod?: 'mercadopago' | 'spei';

  // Archiving & Organization
  isArchived?: boolean;
  archivedAt?: string;
}

import { 
  saveOrderToCloud, 
  deleteOrderFromCloud,
  fetchOrdersFromCloud, 
  saveEmailToCloud, 
  initSupabaseRealtimeListeners,
  registerOrdersReconciler
} from './supabase';

const ORDERS_KEY = 'digimemories_orders_mock';
const EMAILS_KEY = 'digimemories_emails_outbox';
const TOMBSTONES_KEY = 'digimemories_deleted_order_ids';

// In-memory lock for orders recently modified locally (protects against stale cloud overwrite)
const dirtyOrdersMap = new Map<string, number>();

export const markOrderDirty = (orderId: string, durationMs = 15000) => {
  dirtyOrdersMap.set(orderId, Date.now() + durationMs);
};

export const isOrderDirty = (orderId: string): boolean => {
  const expiry = dirtyOrdersMap.get(orderId);
  return expiry ? Date.now() < expiry : false;
};

export const getDeletedOrderIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(TOMBSTONES_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
};

export const addDeletedOrderId = (id: string) => {
  try {
    const set = getDeletedOrderIds();
    set.add(id);
    localStorage.setItem(TOMBSTONES_KEY, JSON.stringify(Array.from(set)));
  } catch (e) {
    console.warn('Error saving tombstone:', e);
  }
};

export const removeDeletedOrderId = (id: string) => {
  try {
    const set = getDeletedOrderIds();
    set.delete(id);
    localStorage.setItem(TOMBSTONES_KEY, JSON.stringify(Array.from(set)));
  } catch (e) {
    console.warn('Error removing tombstone:', e);
  }
};

/**
 * Intelligent Two-Way Reconciler:
 * - Drops any orders present in local tombstones (prevents resurrection of deleted orders).
 * - Protects locally modified orders (dirty) from being overwritten by delayed cloud fetches.
 * - Merges metadata (isArchived, deliveryType, customLabel) non-destructively.
 */
export const reconcileAndStoreOrders = (cloudOrders: Order[]): Order[] => {
  const localOrders = getOrders();
  const deletedIds = getDeletedOrderIds();

  // Filter out any cloud orders that were deleted locally
  const validCloudOrders = cloudOrders.filter(co => !deletedIds.has(co.id));
  const map = new Map<string, Order>();

  // 1. Seed with local orders that aren't deleted
  localOrders.forEach(loc => {
    if (!deletedIds.has(loc.id)) {
      map.set(loc.id, loc);
    }
  });

  // 2. Reconcile with cloud orders
  validCloudOrders.forEach(cloud => {
    const local = map.get(cloud.id);
    if (!local) {
      map.set(cloud.id, cloud);
      return;
    }

    // If local was edited recently (<15s), local state WINS and we re-push to cloud
    if (isOrderDirty(local.id)) {
      saveOrderToCloud(local);
      return;
    }

    const localTime = local.updatedAt ? new Date(local.updatedAt).getTime() : 0;
    const cloudTime = cloud.updatedAt ? new Date(cloud.updatedAt).getTime() : 0;

    if (localTime > cloudTime + 1000) {
      // Local is newer, keep local and re-sync
      saveOrderToCloud(local);
      return;
    }

    // Merge non-empty metadata
    map.set(cloud.id, {
      ...local,
      ...cloud,
      isArchived: cloud.isArchived !== undefined ? cloud.isArchived : local.isArchived,
      archivedAt: cloud.archivedAt || local.archivedAt,
      deliveryType: cloud.deliveryType || local.deliveryType,
      deliveryAddress: cloud.deliveryAddress || local.deliveryAddress,
      deliveryNotes: cloud.deliveryNotes || local.deliveryNotes,
      tallerAddress: cloud.tallerAddress || local.tallerAddress,
      trackingCourierNumber: cloud.trackingCourierNumber || local.trackingCourierNumber,
      preferredPaymentMethod: cloud.preferredPaymentMethod || local.preferredPaymentMethod,
      qualifiesForFreeReturn: cloud.qualifiesForFreeReturn !== undefined ? cloud.qualifiesForFreeReturn : local.qualifiesForFreeReturn
    });
  });

  const reconciled = Array.from(map.values());
  localStorage.setItem(ORDERS_KEY, JSON.stringify(reconciled));
  window.dispatchEvent(new CustomEvent('digimemories_orders_sync'));
  return reconciled;
};

// Register reconciler with Supabase realtime engine
registerOrdersReconciler(reconcileAndStoreOrders);

// Start Realtime listeners and reconcile on initial load
if (typeof window !== 'undefined') {
  initSupabaseRealtimeListeners();
  
  fetchOrdersFromCloud().then(cloudOrders => {
    if (cloudOrders && cloudOrders.length > 0) {
      reconcileAndStoreOrders(cloudOrders);
    }
  });
}

// --- ORDERS STORE ---

export const getOrders = (): Order[] => {
  try {
    const data = localStorage.getItem(ORDERS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const saveOrder = (order: Order) => {
  order.updatedAt = new Date().toISOString();
  markOrderDirty(order.id, 15000);
  removeDeletedOrderId(order.id);

  const orders = getOrders();
  const index = orders.findIndex(o => o.id === order.id);
  if (index >= 0) {
    orders[index] = order;
  } else {
    orders.push(order);
  }
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  window.dispatchEvent(new CustomEvent('digimemories_orders_sync'));

  // Sync to Supabase in background
  saveOrderToCloud(order);
};

export const updateOrder = (orderId: string, updates: Partial<Order>): Order | null => {
  const order = getOrderById(orderId);
  if (!order) return null;
  const updated: Order = {
    ...order,
    ...updates,
    id: order.id // Prevent ID change
  };
  saveOrder(updated);
  return updated;
};

export const getOrderById = (id: string): Order | undefined => {
  return getOrders().find(o => o.id === id);
};

export const updateOrderStatus = (id: string, status: OrderStatus) => {
  const order = getOrderById(id);
  if (order) {
    order.status = status;
    saveOrder(order);
  }
};

export const updateItem = (orderId: string, itemId: string, updates: Partial<OrderItem>) => {
  const order = getOrderById(orderId);
  if (order) {
    const itemIndex = order.items.findIndex(i => i.id === itemId);
    if (itemIndex >= 0) {
      order.items[itemIndex] = { ...order.items[itemIndex], ...updates };
      saveOrder(order);
    }
  }
};

export const archiveOrder = (orderId: string, isArchived: boolean = true) => {
  const order = getOrderById(orderId);
  if (order) {
    order.isArchived = isArchived;
    order.archivedAt = isArchived ? new Date().toISOString() : undefined;
    saveOrder(order);
  }
};

export const deleteOrder = (orderId: string) => {
  addDeletedOrderId(orderId);
  const orders = getOrders().filter(o => o.id !== orderId);
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  window.dispatchEvent(new CustomEvent('digimemories_orders_sync'));
  deleteOrderFromCloud(orderId);
};

export const calculateFinalTotal = (order: Order) => {
  let total = 0;
  
  order.items.forEach(item => {
    // Si el material falló por daño físico o desmagnetización, no se le cobra al cliente
    if (item.status === 'fallida') return;

    if (item.format === 'Cintas') total += 200;
    if (item.format === 'Discos') total += 150;
    if (item.format === 'Fotos (Sueltas)') total += 7;
    if (item.format === 'Álbum Completo') total += 1200;
    
    if (item.format === 'Cintas' && item.extraHours > 0) {
      total += item.extraHours * 50;
    }
    
    if (item.format === 'Cintas' && order.addAudioVideoEnhancement) {
      total += 150;
    }
  });
  
  return total;
};

// --- EMAIL DISPATCH & OUTBOX SYSTEM ---

export const getSentEmails = (): EmailNotification[] => {
  try {
    const data = localStorage.getItem(EMAILS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const sendSimulatedEmail = (email: Omit<EmailNotification, 'id' | 'sentAt'>): EmailNotification => {
  const emails = getSentEmails();
  const newEmail: EmailNotification = {
    ...email,
    id: `email-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    sentAt: new Date().toISOString()
  };

  emails.unshift(newEmail);
  localStorage.setItem(EMAILS_KEY, JSON.stringify(emails));
  window.dispatchEvent(new CustomEvent('digimemories_email_sent', { detail: newEmail }));
  
  // Sync to Supabase in background
  saveEmailToCloud(newEmail);
  return newEmail;
};

// Auto complete order & send celebration completion email
export const markOrderAsCompletedAndNotify = (orderId: string): { order: Order; email: EmailNotification } | undefined => {
  const order = getOrderById(orderId);
  if (!order) return undefined;

  // Mark order & items as completed
  order.status = 'completada';
  order.completedAt = new Date().toISOString();
  order.items = order.items.map(item => ({
    ...item,
    status: item.status === 'fallida' ? 'fallida' : 'completada'
  }));

  const finalTotal = calculateFinalTotal(order);
  const depositPaidAmount = Math.round(order.estimatedTotal * 0.5);
  const balanceDue = Math.max(0, finalTotal - depositPaidAmount);

  // Send completion email
  const email = sendSimulatedEmail({
    orderId: order.id,
    toEmail: order.clientEmail,
    toName: order.clientName,
    type: 'order_completed',
    subject: `🎉 ¡Tus recuerdos están listos! - Orden #${order.id} Completada en DigiMemories`,
    snippet: `Hola ${order.clientName}, nos complace informarte que la digitalización de tu material ha finalizado con éxito.`,
    bodyHtml: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fbf9f5; padding: 24px; border-radius: 16px; border: 1px solid #e7dfd5;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #ea580c; margin: 0; font-size: 26px;">DigiMemories</h1>
          <p style="color: #6b635b; font-size: 13px; margin: 4px 0 0 0;">Preservación Digital de Memorias Familiares</p>
        </div>
        
        <div style="background: #ffffff; padding: 24px; border-radius: 12px; border: 1px solid #f0e8dc;">
          <div style="background: #dcfce7; color: #15803d; padding: 8px 16px; border-radius: 999px; font-weight: bold; font-size: 13px; display: inline-block; margin-bottom: 12px;">
            ✓ Orden Completada y Lista para Entrega
          </div>
          
          <h2 style="color: #1c1917; margin: 0 0 12px 0; font-size: 20px;">¡Hola, ${order.clientName}!</h2>
          <p style="color: #44403c; line-height: 1.6; font-size: 15px;">
            Nos alegra informarte que hemos terminado el proceso de digitalización de tu material analógico. Tus videos han sido transferidos en formato digital MP4 de alta fidelidad y guardados de manera segura en tu memoria USB.
          </p>

          <div style="background: #f8f5ee; padding: 16px; border-radius: 10px; margin: 20px 0;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #78716c; font-size: 14px;">Número de Orden:</span>
              <strong style="color: #ea580c; font-size: 15px;">#${order.id}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #78716c; font-size: 14px;">Total de Artículos:</span>
              <strong style="color: #1c1917; font-size: 14px;">${order.items.length} unidades</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #78716c; font-size: 14px;">Total Final:</span>
              <strong style="color: #1c1917; font-size: 14px;">$${finalTotal} MXN</strong>
            </div>
            <div style="display: flex; justify-content: space-between; border-top: 1px dashed #d6ccc2; padding-top: 8px;">
              <span style="color: #78716c; font-size: 14px;">Saldo Restante contra-entrega:</span>
              <strong style="color: #ea580c; font-size: 16px;">$${balanceDue} MXN</strong>
            </div>
          </div>

          <div style="background: #fff7ed; border: 1.5px solid #fdba74; border-radius: 12px; padding: 18px; margin: 20px 0;">
            <h3 style="color: #9a3412; font-size: 15px; margin: 0 0 8px 0;">🚚 Coordinación de Despacho y Retorno:</h3>
            <p style="color: #431407; font-size: 14px; line-height: 1.6; margin: 0 0 12px 0;">
              ${order.deliveryType === 'home_delivery' 
                ? 'Tus recuerdos originales y tu memoria USB están empacados de forma segura. Escríbenos por WhatsApp para coordinar el horario de recepción o despacho vía <strong>Uber Flash / Didi en CDMX</strong>.' 
                : 'Tus recuerdos y memoria USB están embalados en su caja reforzada. Escríbenos por WhatsApp para confirmar los datos finales de tu domicilio y emitir tu <strong>guía de Paquetería Nacional (DHL / FedEx)</strong>.'}
            </p>
            ${order.qualifiesForFreeReturn ? `
              <div style="background: #dcfce7; border: 1px solid #86efac; border-radius: 8px; padding: 8px 12px; color: #166534; font-size: 13px; font-weight: bold; margin-bottom: 12px;">
                🎉 ¡Tu orden superó el monto mínimo y cuenta con Retorno GRATIS a tu domicilio!
              </div>
            ` : ''}
            <div style="text-align: center; margin-top: 10px;">
              <a href="https://wa.me/525548889876?text=${encodeURIComponent(`¡Hola DigiMemories! Soy ${order.clientName}. Recibí el correo de que mi orden #${order.id} está completada. ¿Me ayudan a coordinar el envío de retorno de mis recuerdos y memoria USB?`)}" 
                 style="background: #25d366; color: #ffffff; padding: 10px 22px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">
                💬 Coordinar Despacho por WhatsApp →
              </a>
            </div>
          </div>

          <div style="text-align: center; margin-top: 24px;">
            <a href="https://digimemories.vercel.app/track" style="background: #ea580c; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 15px; display: inline-block;">
              Consultar Detalles en Portal de Rastreo
            </a>
          </div>
        </div>

        <div style="text-align: center; margin-top: 20px; color: #a8a29e; font-size: 12px;">
          DigiMemories © Rescate y Preservación de Memorias Familiares.
        </div>
      </div>
    `
  });

  order.completionEmailSent = true;
  saveOrder(order);

  // Dispatch to internal email server API in background
  try {
    fetch('/api/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: order.clientEmail,
        toName: order.clientName,
        subject: email.subject,
        html: email.bodyHtml,
        metadata: { trackingId: order.id, type: 'order_completed' }
      })
    }).catch(e => console.warn('Background email dispatch note:', e));
  } catch (e) {
    // Ignore background network failure
  }

  return { order, email };
};
