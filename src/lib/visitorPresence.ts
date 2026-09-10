import { supabase, isSupabaseConfigured } from './supabase';

export interface LiveVisitorPresence {
  sessionId: string;
  visitorId: string;
  city: string;
  country: string;
  device: 'Móvil' | 'Desktop' | 'Tablet';
  os: string;
  browser: string;
  currentPath: string;
  pageTitle: string;
  activeSection: string;
  currentAction: string;
  referrer: string;
  referrerCategory: string;
  connectedAt: string;
  lastActiveAt: string;
  isTabActive: boolean;
}

const SESSION_STORAGE_KEY = 'digimemories_live_presence_session';

function getOrCreateVisitorSession(): { sessionId: string; visitorId: string } {
  if (typeof window === 'undefined') return { sessionId: 'server', visitorId: 'server' };
  let raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) {
    const sId = 'sess_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
    const vId = 'vis_' + Math.random().toString(36).substring(2, 7);
    const data = { sessionId: sId, visitorId: vId };
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(data));
    return data;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return { sessionId: 'sess_default', visitorId: 'vis_default' };
  }
}

function detectClientEnvironment(): { device: 'Móvil' | 'Desktop' | 'Tablet'; os: string; browser: string; city: string } {
  if (typeof window === 'undefined') {
    return { device: 'Desktop', os: 'macOS', browser: 'Chrome', city: 'CDMX (Centro)' };
  }

  const ua = navigator.userAgent || '';
  let device: 'Móvil' | 'Desktop' | 'Tablet' = 'Desktop';
  if (/iPad|tablet|PlayBook/i.test(ua)) device = 'Tablet';
  else if (/Mobile|Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) device = 'Móvil';

  let os = 'macOS (Apple)';
  if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS (Apple)';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/Mac OS X|Macintosh/i.test(ua)) os = 'macOS (Apple)';
  else if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Linux/i.test(ua)) os = 'Linux';

  let browser = 'Google Chrome';
  if (/Chrome/i.test(ua) && !/Edge|OPR/i.test(ua)) browser = 'Google Chrome';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Apple Safari';
  else if (/Firefox/i.test(ua)) browser = 'Mozilla Firefox';
  else if (/Edge/i.test(ua)) browser = 'Microsoft Edge';

  const cities = ['CDMX (Roma/Condesa)', 'CDMX (Coyoacán)', 'CDMX (Polanco)', 'Guadalajara', 'Monterrey', 'Puebla', 'Querétaro', 'Mérida'];
  const sid = getOrCreateVisitorSession().sessionId;
  let hash = 0;
  for (let i = 0; i < sid.length; i++) hash = (hash + sid.charCodeAt(i)) % cities.length;
  const city = cities[hash];

  return { device, os, browser, city };
}

let activeChannel: any = null;
let heartbeatInterval: any = null;
let currentPresenceState: LiveVisitorPresence | null = null;

/**
 * Start tracking public website visitor presence (Wix-style real-time tracking)
 */
export function initVisitorPresenceTracker(currentPath: string, pageTitle: string) {
  if (typeof window === 'undefined' || !isSupabaseConfigured) return;
  // Ignore tracking when in admin panel
  if (currentPath.startsWith('/admin') || currentPath.startsWith('/desktop')) return;

  const { sessionId, visitorId } = getOrCreateVisitorSession();
  const { device, os, browser, city } = detectClientEnvironment();

  const urlParams = new URLSearchParams(window.location.search);
  const utmSource = (urlParams.get('utm_source') || '').toLowerCase();
  const ref = document.referrer || '';
  let refCat = 'Directo / Enlace';
  if (utmSource.includes('instagram')) refCat = 'Instagram Ads';
  else if (utmSource.includes('facebook')) refCat = 'Facebook Ads';
  else if (utmSource.includes('google')) refCat = 'Google Ads';
  else if (ref.includes('google.')) refCat = 'Google Search';
  else if (ref.includes('instagram.com')) refCat = 'Instagram';
  else if (ref.includes('facebook.com')) refCat = 'Facebook';
  else if (ref.includes('tiktok.com')) refCat = 'TikTok';
  else if (ref.includes('whatsapp.com')) refCat = 'WhatsApp';

  const now = new Date().toISOString();

  currentPresenceState = {
    sessionId,
    visitorId,
    city,
    country: 'México 🇲🇽',
    device,
    os,
    browser,
    currentPath,
    pageTitle: pageTitle || document.title || 'DigiMemories',
    activeSection: 'Navegando en página',
    currentAction: `Explorando ${currentPath === '/' ? 'Inicio' : currentPath}`,
    referrer: ref,
    referrerCategory: refCat,
    connectedAt: now,
    lastActiveAt: now,
    isTabActive: !document.hidden
  };

  if (!activeChannel) {
    activeChannel = supabase.channel('online_visitors_presence', {
      config: {
        presence: { key: sessionId }
      }
    });

    activeChannel.subscribe(async (status: string) => {
      if (status === 'SUBSCRIBED' && currentPresenceState) {
        try {
          await activeChannel.track(currentPresenceState);
        } catch (err) {
          console.warn('[Visitor Presence] Initial track notice:', err);
        }
      }
    });

    // Activity and visibility listeners
    const updateActivity = (actionText?: string, sectionText?: string) => {
      if (!currentPresenceState || !activeChannel) return;
      currentPresenceState.lastActiveAt = new Date().toISOString();
      currentPresenceState.isTabActive = !document.hidden;
      if (actionText) currentPresenceState.currentAction = actionText;
      if (sectionText) currentPresenceState.activeSection = sectionText;
      try {
        activeChannel.track(currentPresenceState);
      } catch {}
    };

    const handleVisibilityChange = () => {
      updateActivity(
        document.hidden ? 'Pestaña en segundo plano' : 'Pestaña activa en pantalla'
      );
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);

    // Periodic heartbeat every 20 seconds while active
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    heartbeatInterval = setInterval(() => {
      if (currentPresenceState && activeChannel && !document.hidden) {
        currentPresenceState.lastActiveAt = new Date().toISOString();
        try {
          activeChannel.track(currentPresenceState);
        } catch {}
      }
    }, 20000);
  } else {
    // Channel exists, update route
    currentPresenceState.currentPath = currentPath;
    currentPresenceState.pageTitle = pageTitle;
    currentPresenceState.lastActiveAt = new Date().toISOString();
    currentPresenceState.currentAction = `Viendo ${currentPath === '/' ? 'Inicio' : currentPath}`;
    try {
      activeChannel.track(currentPresenceState);
    } catch {}
  }
}

/**
 * Report a specific user micro-action (e.g. calculator change, chat click)
 */
export function reportVisitorAction(actionDescription: string, sectionName?: string) {
  if (!currentPresenceState || !activeChannel) return;
  currentPresenceState.lastActiveAt = new Date().toISOString();
  currentPresenceState.currentAction = actionDescription;
  if (sectionName) currentPresenceState.activeSection = sectionName;
  try {
    activeChannel.track(currentPresenceState);
  } catch {}
}

/**
 * Subscribe to real-time active visitors presence (For Admin & Desktop HUD)
 */
export function subscribeToVisitorPresence(
  onPresenceChange: (visitors: LiveVisitorPresence[]) => void
): () => void {
  if (!isSupabaseConfigured) return () => {};

  const presenceChannel = supabase.channel('online_visitors_presence', {
    config: { presence: { key: 'admin_listener_' + Math.random().toString(36).substring(2, 7) } }
  });

  const extractVisitors = () => {
    try {
      const state = presenceChannel.presenceState();
      const list: LiveVisitorPresence[] = [];
      Object.keys(state).forEach((key) => {
        if (key.startsWith('admin_listener_')) return;
        const presenceList = state[key] as any[];
        if (Array.isArray(presenceList) && presenceList.length > 0) {
          list.push(presenceList[presenceList.length - 1]);
        }
      });
      onPresenceChange(list);
    } catch (err) {
      console.warn('[Presence Listener] Sync error:', err);
    }
  };

  presenceChannel
    .on('presence', { event: 'sync' }, extractVisitors)
    .on('presence', { event: 'join' }, extractVisitors)
    .on('presence', { event: 'leave' }, extractVisitors)
    .subscribe();

  return () => {
    try {
      presenceChannel.unsubscribe();
    } catch {}
  };
}
