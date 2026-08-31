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

    return data.map((row: any): Order => ({
      id: row.id,
      clientName: row.client_name,
      clientEmail: row.client_email,
      clientPhone: row.client_phone,
      createdAt: row.created_at,
      estimatedTotal: Number(row.estimated_total) || 0,
      depositPaid: Boolean(row.deposit_paid),
      pin: row.pin,
      status: row.status || 'pendiente',
      completedAt: row.completed_at,
      completionEmailSent: Boolean(row.completion_email_sent),
      items: row.items || [],
      addAudioVideoEnhancement: Boolean(row.add_audio_video_enhancement),
      generalNotes: row.general_notes || ''
    }));
  } catch (e) {
    console.warn('[Supabase] Exception fetching orders:', e);
    return null;
  }
}

export async function saveOrderToCloud(order: Order): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
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
      general_notes: order.generalNotes
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
      sentAt: row.sent_at,
      type: row.type,
      bodyHtml: row.body_html
    }));
  } catch (e) {
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
      sent_at: email.sentAt,
      type: email.type,
      body_html: email.bodyHtml
    };

    const { error } = await supabase
      .from('email_logs')
      .upsert(row, { onConflict: 'id' });

    if (error) {
      return false;
    }
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * -------------------------------------------------------------
 * 4. SYSTEM SMTP CONFIGURATION (Cloud-Native 24/7 Persistence)
 * -------------------------------------------------------------
 */

export async function saveSmtpConfigToCloud(config: any): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const row = {
      id: 'system_smtp_settings',
      order_id: null,
      to_email: 'system@digimemories.mx',
      to_name: 'System Config Vault',
      subject: 'SMTP_CONFIG_PAYLOAD',
      snippet: 'Cloud SMTP Vault',
      sent_at: new Date().toISOString(),
      type: 'custom',
      body_html: JSON.stringify(config)
    };
    const { error } = await supabase
      .from('email_logs')
      .upsert(row, { onConflict: 'id' });

    return !error;
  } catch {
    return false;
  }
}

export async function fetchSmtpConfigFromCloud(): Promise<any | null> {
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, async () => {
        const freshOrders = await fetchOrdersFromCloud();
        if (freshOrders) {
          localStorage.setItem('digimemories_orders_mock', JSON.stringify(freshOrders));
          window.dispatchEvent(new CustomEvent('digimemories_orders_sync'));
        }
      })
      .subscribe();

    // Listen to chat updates
    supabase
      .channel('public:chats_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_threads' }, async () => {
        const freshChats = await fetchChatThreadsFromCloud();
        if (freshChats) {
          localStorage.setItem('digimemories_chat_threads_v3', JSON.stringify(freshChats));
          window.dispatchEvent(new CustomEvent('digimemories_chat_sync'));
        }
      })
      .subscribe();

    console.log('[Supabase] Realtime channels active and listening.');
  } catch (e) {
    console.warn('[Supabase] Could not start realtime listeners:', e);
  }
}
