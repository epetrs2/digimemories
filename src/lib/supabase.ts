import { createClient } from '@supabase/supabase-js';
import type { Order, EmailNotification } from './store';
import type { ChatThread } from './chatStore';

// Supabase Project configuration
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://nqlillrugkxxpjobzsja.supabase.co';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_V_wCDy_Oe1_4ZMahWfNmfg_X1gqNpsN';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

/**
 * -------------------------------------------------------------
 * 1. ORDERS REPOSITORY (Cloud Sync & Realtime)
 * -------------------------------------------------------------
 */

export const lastLocalSavedOrders = new Map<string, number>();
export const lastLocalSavedChats = new Map<string, number>();

type OrdersReconciler = (orders: Order[]) => Order[];
type ChatsReconciler = (chats: ChatThread[]) => ChatThread[];

let registeredOrdersReconciler: OrdersReconciler | null = null;
let registeredChatsReconciler: ChatsReconciler | null = null;

export function registerOrdersReconciler(fn: OrdersReconciler) {
  registeredOrdersReconciler = fn;
}

export function registerChatsReconciler(fn: ChatsReconciler) {
  registeredChatsReconciler = fn;
}

// Regex to extract and strip metadata envelope from general_notes
const META_REGEX = /<!--DM_META:(.*?)-->/s;

function parseNotesAndMetadata(rawNotes: string | null | undefined): { cleanNotes: string; meta: any } {
  if (!rawNotes) return { cleanNotes: '', meta: {} };
  const match = rawNotes.match(META_REGEX);
  if (!match) return { cleanNotes: rawNotes.trim(), meta: {} };
  try {
    const meta = JSON.parse(match[1]);
    const cleanNotes = rawNotes.replace(META_REGEX, '').trim();
    return { cleanNotes, meta };
  } catch {
    return { cleanNotes: rawNotes.trim(), meta: {} };
  }
}

function packNotesAndMetadata(cleanNotes: string | null | undefined, meta: any): string {
  const base = (cleanNotes || '').replace(META_REGEX, '').trim();
  const json = JSON.stringify(meta);
  return base ? `${base}\n<!--DM_META:${json}-->` : `<!--DM_META:${json}-->`;
}

export async function fetchOrdersFromCloud(): Promise<Order[] | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[Supabase] fetchOrders error:', error.message);
      return null;
    }

    if (!data) return [];

    return data.map((row: any): Order => {
      const { cleanNotes, meta } = parseNotesAndMetadata(row.general_notes);

      return {
        id: row.id,
        clientName: row.client_name,
        clientEmail: row.client_email,
        clientPhone: row.client_phone,
        createdAt: row.created_at,
        updatedAt: meta.updatedAt || row.created_at,
        estimatedTotal: Number(row.estimated_total) || 0,
        depositPaid: Boolean(row.deposit_paid),
        pin: row.pin,
        status: row.status || 'pendiente',
        completedAt: row.completed_at,
        completionEmailSent: Boolean(row.completion_email_sent),
        items: row.items || [],
        addAudioVideoEnhancement: Boolean(row.add_audio_video_enhancement),
        generalNotes: cleanNotes,
        deliveryType: meta.deliveryType || row.delivery_type,
        deliveryAddress: meta.deliveryAddress || row.delivery_address,
        deliveryNotes: meta.deliveryNotes,
        tallerAddress: meta.tallerAddress,
        trackingCourierNumber: meta.trackingCourierNumber || row.tracking_courier_number,
        preferredPaymentMethod: meta.preferredPaymentMethod || row.preferred_payment_method,
        qualifiesForFreeReturn: meta.qualifiesForFreeReturn !== undefined ? Boolean(meta.qualifiesForFreeReturn) : Boolean(row.qualifies_for_free_return),
        isArchived: Boolean(meta.isArchived),
        archivedAt: meta.archivedAt
      };
    });
  } catch (e) {
    console.warn('[Supabase] Exception fetching orders:', e);
    return null;
  }
}

export async function saveOrderToCloud(order: Order): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    lastLocalSavedOrders.set(order.id, Date.now());

    const metaPayload = {
      isArchived: order.isArchived,
      archivedAt: order.archivedAt,
      deliveryType: order.deliveryType,
      deliveryAddress: order.deliveryAddress,
      deliveryNotes: order.deliveryNotes,
      tallerAddress: order.tallerAddress,
      trackingCourierNumber: order.trackingCourierNumber,
      preferredPaymentMethod: order.preferredPaymentMethod,
      qualifiesForFreeReturn: order.qualifiesForFreeReturn,
      updatedAt: order.updatedAt || new Date().toISOString()
    };

    const fullNotes = packNotesAndMetadata(order.generalNotes, metaPayload);

    const row = {
      id: order.id,
      client_name: order.clientName,
      client_email: order.clientEmail,
      client_phone: order.clientPhone,
      created_at: order.createdAt,
      estimated_total: order.estimatedTotal,
      deposit_paid: order.depositPaid,
      pin: order.pin,
      status: order.status,
      completed_at: order.completedAt,
      completion_email_sent: order.completionEmailSent,
      items: order.items,
      add_audio_video_enhancement: order.addAudioVideoEnhancement,
      general_notes: fullNotes
    };

    const { error } = await supabase
      .from('orders')
      .upsert(row, { onConflict: 'id' });

    if (error) {
      console.warn('[Supabase] saveOrder error:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('[Supabase] Exception saving order:', e);
    return false;
  }
}

export async function deleteOrderFromCloud(orderId: string): Promise<boolean> {
  if (!isSupabaseConfigured || !orderId) return false;
  try {
    lastLocalSavedOrders.set(orderId, Date.now());
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId.trim());

    if (error) {
      console.warn('[Supabase] deleteOrder error:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('[Supabase] Exception deleting order from cloud:', e);
    return false;
  }
}

export async function updateOrderInCloud(id: string, updates: Partial<Order>): Promise<boolean> {
  if (!isSupabaseConfigured || !id) return false;
  try {
    const existing = await fetchOrderByIdFromCloud(id);
    if (!existing) return false;
    const merged: Order = { ...existing, ...updates };
    return await saveOrderToCloud(merged);
  } catch (e) {
    console.warn('[Supabase] Exception updating order in cloud:', e);
    return false;
  }
}

export async function fetchOrderByIdFromCloud(id: string): Promise<Order | null> {
  if (!isSupabaseConfigured || !id) return null;
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id.trim())
      .maybeSingle();

    if (error || !data) return null;

    const { cleanNotes, meta } = parseNotesAndMetadata(data.general_notes);

    return {
      id: data.id,
      clientName: data.client_name,
      clientEmail: data.client_email,
      clientPhone: data.client_phone,
      createdAt: data.created_at,
      updatedAt: meta.updatedAt || data.created_at,
      estimatedTotal: Number(data.estimated_total) || 0,
      depositPaid: Boolean(data.deposit_paid),
      pin: data.pin,
      status: data.status || 'pendiente',
      completedAt: data.completed_at,
      completionEmailSent: Boolean(data.completion_email_sent),
      items: data.items || [],
      addAudioVideoEnhancement: Boolean(data.add_audio_video_enhancement),
      generalNotes: cleanNotes,
      deliveryType: meta.deliveryType || data.delivery_type,
      deliveryAddress: meta.deliveryAddress || data.delivery_address,
      deliveryNotes: meta.deliveryNotes,
      tallerAddress: meta.tallerAddress,
      trackingCourierNumber: meta.trackingCourierNumber || data.tracking_courier_number,
      preferredPaymentMethod: meta.preferredPaymentMethod || data.preferred_payment_method,
      qualifiesForFreeReturn: meta.qualifiesForFreeReturn !== undefined ? Boolean(meta.qualifiesForFreeReturn) : Boolean(data.qualifies_for_free_return),
      isArchived: Boolean(meta.isArchived),
      archivedAt: meta.archivedAt
    };
  } catch (e) {
    console.warn('[Supabase] Exception fetching order by ID:', e);
    return null;
  }
}

/**
 * -------------------------------------------------------------
 * 2. CHAT THREADS REPOSITORY (Realtime Multi-Device Messaging)
 * -------------------------------------------------------------
 */

export async function fetchChatThreadsFromCloud(): Promise<ChatThread[] | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from('chat_threads')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.warn('[Supabase] fetchChatThreads error:', error.message);
      return null;
    }

    if (!data) return [];

    return data.map((row: any): ChatThread => ({
      id: row.id,
      visitorName: row.visitor_name,
      visitorEmail: row.visitor_email,
      visitorPhone: row.visitor_phone,
      status: row.status || 'active',
      mode: row.mode || 'bot',
      needsHumanAttention: Boolean(row.needs_human_attention),
      unreadByAdmin: row.unread_by_admin || 0,
      unreadByVisitor: row.unread_by_visitor || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      currentRoute: row.current_route,
      messages: row.messages || []
    }));
  } catch (e) {
    console.warn('[Supabase] Exception fetching chat threads:', e);
    return null;
  }
}

export async function saveChatThreadToCloud(thread: ChatThread): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    lastLocalSavedChats.set(thread.id, Date.now());

    const row = {
      id: thread.id,
      visitor_name: thread.visitorName,
      visitor_email: thread.visitorEmail,
      visitor_phone: thread.visitorPhone,
      status: thread.status,
      mode: thread.mode,
      needs_human_attention: thread.needsHumanAttention,
      unread_by_admin: thread.unreadByAdmin,
      unread_by_visitor: thread.unreadByVisitor,
      created_at: thread.createdAt,
      updated_at: thread.updatedAt,
      current_route: thread.currentRoute,
      messages: thread.messages
    };

    const { error } = await supabase
      .from('chat_threads')
      .upsert(row, { onConflict: 'id' });

    if (error) {
      console.warn('[Supabase] saveChatThread error:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('[Supabase] Exception saving chat thread:', e);
    return false;
  }
}

export async function deleteChatThreadFromCloud(threadId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    lastLocalSavedChats.set(threadId, Date.now());

    const { error } = await supabase
      .from('chat_threads')
      .delete()
      .eq('id', threadId);

    if (error) {
      console.warn('[Supabase] deleteChatThread error:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('[Supabase] Exception deleting chat thread:', e);
    return false;
  }
}

/**
 * -------------------------------------------------------------
 * 3. EMAIL NOTIFICATIONS REPOSITORY
 * -------------------------------------------------------------
 */

export async function fetchEmailsFromCloud(): Promise<EmailNotification[] | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from('email_logs')
      .select('*')
      .order('sent_at', { ascending: false });

    if (error) {
      return null;
    }

    if (!data) return [];

    return data.map((row: any): EmailNotification => ({
      id: row.id,
      orderId: row.order_id,
      toEmail: row.to_email,
      toName: row.to_name,
      subject: row.subject,
      snippet: row.snippet,
      bodyHtml: row.body_html,
      type: row.type || 'custom',
      sentAt: row.sent_at
    }));
  } catch (e) {
    console.warn('[Supabase] Exception fetching email logs:', e);
    return null;
  }
}

export async function saveEmailToCloud(email: EmailNotification): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const row = {
      id: email.id,
      order_id: email.orderId,
      to_email: email.toEmail,
      to_name: email.toName,
      subject: email.subject,
      snippet: email.snippet,
      body_html: email.bodyHtml,
      type: email.type,
      sent_at: email.sentAt
    };

    const { error } = await supabase
      .from('email_logs')
      .upsert(row, { onConflict: 'id' });

    if (error) {
      console.warn('[Supabase] saveEmail error:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('[Supabase] Exception saving email log:', e);
    return false;
  }
}

export async function saveSmtpSettingsToCloud(settings: any): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase
      .from('email_logs')
      .upsert({
        id: 'system_smtp_settings',
        order_id: null,
        to_email: 'smtp@digimemories.system',
        to_name: 'SMTP Credentials',
        subject: 'Credenciales del Servidor de Correo',
        snippet: `Host: ${settings.host} • User: ${settings.user}`,
        type: 'smtp_credentials',
        sent_at: new Date().toISOString(),
        body_html: JSON.stringify(settings)
      }, { onConflict: 'id' });

    return !error;
  } catch {
    return false;
  }
}

export async function fetchSmtpSettingsFromCloud(): Promise<any | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from('email_logs')
      .select('*')
      .eq('id', 'system_smtp_settings')
      .maybeSingle();

    if (error || !data || !data.body_html) return null;
    return JSON.parse(data.body_html);
  } catch {
    return null;
  }
}

export const saveSmtpConfigToCloud = saveSmtpSettingsToCloud;
export const fetchSmtpConfigFromCloud = fetchSmtpSettingsFromCloud;

/**
 * -------------------------------------------------------------
 * 4. REALTIME LISTENERS INITIALIZER
 * -------------------------------------------------------------
 */

let isRealtimeInitialized = false;

export function initSupabaseRealtimeListeners() {
  if (!isSupabaseConfigured || isRealtimeInitialized) return;
  isRealtimeInitialized = true;

  try {
    // Listen to orders updates
    supabase
      .channel('public:orders_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, async (payload: any) => {
        // Self-echo suppression: if this change was saved by our local client < 4000ms ago, ignore
        const changedId = payload.new?.id || payload.old?.id;
        if (changedId && lastLocalSavedOrders.has(changedId)) {
          const elapsed = Date.now() - (lastLocalSavedOrders.get(changedId) || 0);
          if (elapsed < 4000) {
            return;
          }
        }

        const freshOrders = await fetchOrdersFromCloud();
        if (freshOrders) {
          if (registeredOrdersReconciler) {
            registeredOrdersReconciler(freshOrders);
          } else {
            localStorage.setItem('digimemories_orders_mock', JSON.stringify(freshOrders));
            window.dispatchEvent(new CustomEvent('digimemories_orders_sync'));
          }
        }
      })
      .subscribe();

    // Listen to chat updates
    supabase
      .channel('public:chats_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_threads' }, async (payload: any) => {
        // Self-echo suppression: if this change was saved by our local client < 4000ms ago, ignore
        const changedId = payload.new?.id || payload.old?.id;
        if (changedId && lastLocalSavedChats.has(changedId)) {
          const elapsed = Date.now() - (lastLocalSavedChats.get(changedId) || 0);
          if (elapsed < 4000) {
            return;
          }
        }

        const freshChats = await fetchChatThreadsFromCloud();
        if (freshChats) {
          if (registeredChatsReconciler) {
            registeredChatsReconciler(freshChats);
          } else {
            localStorage.setItem('digimemories_chat_threads_v3', JSON.stringify(freshChats));
            window.dispatchEvent(new CustomEvent('digimemories_chat_sync'));
          }
        }
      })
      .subscribe();

    console.log('[Supabase] Realtime channels active with echo suppression and non-destructive reconciliation.');
  } catch (e) {
    console.warn('[Supabase] Could not start realtime listeners:', e);
  }
}
