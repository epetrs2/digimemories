export type OrderStatus = 'pendiente' | 'en_proceso' | 'completada';
export type ItemStatus = 'pendiente' | 'digitalizando' | 'completada' | 'fallida';

export interface OrderItem {
  id: string;
  format: string;
  status: ItemStatus;
  extraHours: number;
  notes: string;
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
}

import { 
  saveOrderToCloud, 
  fetchOrdersFromCloud, 
  saveEmailToCloud, 
  initSupabaseRealtimeListeners 
} from './supabase';

const ORDERS_KEY = 'digimemories_orders_mock';
const EMAILS_KEY = 'digimemories_emails_outbox';

// Start Realtime listeners on initial load
if (typeof window !== 'undefined') {
  initSupabaseRealtimeListeners();
  
  // Background cloud fetch on start
  fetchOrdersFromCloud().then(cloudOrders => {
    if (cloudOrders && cloudOrders.length > 0) {
      const local = getOrders();
      const mergedMap = new Map<string, Order>();
      local.forEach(o => mergedMap.set(o.id, o));
      cloudOrders.forEach(o => mergedMap.set(o.id, o));
      const merged = Array.from(mergedMap.values());
      localStorage.setItem(ORDERS_KEY, JSON.stringify(merged));
      window.dispatchEvent(new CustomEvent('digimemories_orders_sync'));
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

export const calculateFinalTotal = (order: Order) => {
  let total = 0;
  
  order.items.forEach(item => {
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

          <h3 style="color: #1c1917; font-size: 15px; margin: 16px 0 8px 0;">📍 Instrucciones de Entrega y Recolección:</h3>
          <ul style="color: #57534e; font-size: 14px; line-height: 1.6; padding-left: 20px; margin: 0 0 20px 0;">
            <li>Puedes pasar a recoger tu memoria USB y tus cintas originales en nuestro taller: <strong>Av. Insurgentes Sur #450, Col. Roma Sur, CDMX</strong> (Lunes a Sábado de 10:00 a 18:00 hrs).</li>
            <li>Si prefieres entrega a domicilio por Uber Flash o mensajería privada, escríbenos por WhatsApp al <strong>55 4888 9876</strong> para coordinar el envío.</li>
          </ul>

          <div style="text-align: center; margin-top: 24px;">
            <a href="http://localhost:5173/track" style="background: #ea580c; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 15px; display: inline-block;">
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
