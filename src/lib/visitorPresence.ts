import { supabase, isSupabaseConfigured } from './supabase';

export interface LiveVisitorPresence {
  sessionId: string;
  visitorId: string;
  city: string;
  region: string;
  country: string;
  isp: string;
  device: 'Móvil' | 'Desktop' | 'Tablet';
  os: string;
  browser: string;
  currentPath: string;
  pageTitle: string;
  activeSection: string;
  currentAction: string;
  scrollDepth: number; // 0 - 100%
  referrer: string;
  referrerCategory: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  connectedAt: string;
  lastActiveAt: string;
  isTabActive: boolean;
  chatThreadId?: string;
}

const SESSION_STORAGE_KEY = 'digimemories_live_presence_session';
const GEO_STORAGE_KEY = 'digimemories_geo_cache_v2';
const SOURCE_STORAGE_KEY = 'digimemories_visitor_source_v2';

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

/**
 * Real Geolocation Resolution (No mock data):
 * Uses ipwhois.app with local caching in sessionStorage and timezone fallback.
 */
async function resolveRealVisitorGeo(): Promise<{ city: string; region: string; country: string; isp: string }> {
  if (typeof window === 'undefined') {
    return { city: 'Ciudad de México', region: 'CDMX', country: 'México 🇲🇽', isp: 'Red de Datos' };
  }

  // 1. Check session cache first
  try {
    const cached = sessionStorage.getItem(GEO_STORAGE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {}

  // 2. Fetch from fast, keyless geo-IP endpoint
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2800);

    const res = await fetch('https://ipwhois.app/json/', {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.success !== false) {
        const result = {
          city: data.city || 'Ciudad de México',
          region: data.region || 'CDMX',
          country: `${data.country || 'México'} ${data.country_code === 'MX' ? '🇲🇽' : (data.country_code ? `(${data.country_code})` : '')}`,
          isp: data.isp || 'ISP Local'
        };
        sessionStorage.setItem(GEO_STORAGE_KEY, JSON.stringify(result));
        return result;
      }
    }
  } catch {
    // Network failure or timeout -> fallback to timezone
  }

  // 3. Fallback to browser timezone
  let tzCity = 'Ciudad de México';
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (tz.includes('Mexico_City')) tzCity = 'Ciudad de México (Centro)';
    else if (tz.includes('Monterrey')) tzCity = 'Monterrey, N.L.';
    else if (tz.includes('Guadalajara') || tz.includes('Hermosillo')) tzCity = 'Guadalajara / Occidente';
    else if (tz.includes('Tijuana')) tzCity = 'Tijuana, B.C.';
    else if (tz.includes('Cancun')) tzCity = 'Cancún / Sureste';
    else if (tz.includes('/')) tzCity = tz.split('/')[1].replace(/_/g, ' ');
  } catch {}

  const fallback = { city: tzCity, region: 'México', country: 'México 🇲🇽', isp: 'Conexión Web' };
  try { sessionStorage.setItem(GEO_STORAGE_KEY, JSON.stringify(fallback)); } catch {}
  return fallback;
}

/**
 * Traffic Source & Campaign Detection (Google Ads, Meta, Organic, Direct)
 */
function resolveVisitorSource(): { category: string; referrer: string; utmSource?: string; utmMedium?: string; utmCampaign?: string } {
  if (typeof window === 'undefined') {
    return { category: 'Directo 🔗', referrer: '' };
  }

  try {
    const cached = sessionStorage.getItem(SOURCE_STORAGE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {}

  const urlParams = new URLSearchParams(window.location.search);
  const utmSource = (urlParams.get('utm_source') || '').toLowerCase();
  const utmMedium = (urlParams.get('utm_medium') || '').toLowerCase();
  const utmCampaign = urlParams.get('utm_campaign') || undefined;
  const gclid = urlParams.get('gclid');
  const fbclid = urlParams.get('fbclid');
  const ttclid = urlParams.get('ttclid');
  const ref = document.referrer || '';

  let category = 'Directo / Marcador 🔗';

  if (gclid || utmSource.includes('google_ads') || utmMedium === 'cpc' || utmMedium === 'ppc') {
    category = 'Google Ads (Búsqueda Patrocinada) 🎯';
  } else if (fbclid || utmSource.includes('instagram') || utmSource.includes('facebook') || utmSource.includes('meta')) {
    category = 'Meta Ads (Instagram / Facebook) 📸';
  } else if (ttclid || utmSource.includes('tiktok')) {
    category = 'TikTok Ads 📱';
  } else if (ref.includes('google.') || ref.includes('google.com.mx')) {
    category = 'Google Búsqueda (Orgánico) 🔍';
  } else if (ref.includes('instagram.com')) {
    category = 'Instagram Orgánico 📸';
  } else if (ref.includes('facebook.com') || ref.includes('fb.com')) {
    category = 'Facebook Orgánico 👥';
  } else if (ref.includes('tiktok.com')) {
    category = 'TikTok 🎵';
  } else if (ref.includes('whatsapp.com') || ref.includes('wa.me')) {
    category = 'WhatsApp 💬';
  } else if (ref.includes('youtube.com')) {
    category = 'YouTube 🎬';
  } else if (ref.includes('bing.com')) {
    category = 'Bing Búsqueda 🔎';
  } else if (ref) {
    try {
      const host = new URL(ref).hostname;
      category = `Referido (${host}) 🌐`;
    } catch {
      category = 'Sitio Externo 🌐';
    }
  }

  const result = {
    category,
    referrer: ref,
    utmSource: utmSource || undefined,
    utmMedium: utmMedium || undefined,
    utmCampaign
  };

  try {
    sessionStorage.setItem(SOURCE_STORAGE_KEY, JSON.stringify(result));
  } catch {}

  return result;
}

function detectClientDevice(): { device: 'Móvil' | 'Desktop' | 'Tablet'; os: string; browser: string } {
  if (typeof window === 'undefined') {
    return { device: 'Desktop', os: 'macOS', browser: 'Chrome' };
  }

  const ua = navigator.userAgent || '';
  let device: 'Móvil' | 'Desktop' | 'Tablet' = 'Desktop';
  if (/iPad|tablet|PlayBook/i.test(ua)) device = 'Tablet';
  else if (/Mobile|Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) device = 'Móvil';

  let os = 'macOS';
  if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS (Apple)';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/Mac OS X|Macintosh/i.test(ua)) os = 'macOS (Apple)';
  else if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Linux/i.test(ua)) os = 'Linux';

  let browser = 'Google Chrome';
  if (/Chrome/i.test(ua) && !/Edge|OPR|Edg/i.test(ua)) browser = 'Chrome';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';
  else if (/Edg/i.test(ua)) browser = 'Edge';
  else if (/OPR/i.test(ua)) browser = 'Opera';

  return { device, os, browser };
}

let activeChannel: any = null;
let heartbeatInterval: any = null;
let scrollListenerActive = false;
let observerInstance: IntersectionObserver | null = null;
let currentPresenceState: LiveVisitorPresence | null = null;

function calculateCurrentScrollDepth(): number {
  if (typeof window === 'undefined') return 0;
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  if (scrollable <= 0) return 100;
  return Math.min(100, Math.max(0, Math.round((window.scrollY / scrollable) * 100)));
}

/**
 * Start tracking public website visitor presence (Wix-style high-accuracy live tracking)
 */
export function initVisitorPresenceTracker(currentPath: string, pageTitle: string) {
  if (typeof window === 'undefined' || !isSupabaseConfigured) return;
  // Ignore tracking when in admin panel
  if (currentPath.startsWith('/admin') || currentPath.startsWith('/desktop')) return;

  const { sessionId, visitorId } = getOrCreateVisitorSession();
  const { device, os, browser } = detectClientDevice();
  const source = resolveVisitorSource();
  const now = new Date().toISOString();

  // Create or update presence state
  if (!currentPresenceState) {
    currentPresenceState = {
      sessionId,
      visitorId,
      city: 'Cargando ubicación...',
      region: 'México',
      country: 'México 🇲🇽',
      isp: 'Buscando...',
      device,
      os,
      browser,
      currentPath,
      pageTitle: pageTitle || document.title || 'DigiMemories',
      activeSection: 'Cabecera de página',
      currentAction: `Explorando ${currentPath === '/' ? 'Inicio' : currentPath}`,
      scrollDepth: calculateCurrentScrollDepth(),
      referrer: source.referrer,
      referrerCategory: source.category,
      utmSource: source.utmSource,
      utmMedium: source.utmMedium,
      utmCampaign: source.utmCampaign,
      connectedAt: now,
      lastActiveAt: now,
      isTabActive: !document.hidden
    };

    // Asynchronously resolve real geo-IP
    resolveRealVisitorGeo().then(geo => {
      if (currentPresenceState) {
        currentPresenceState.city = geo.city;
        currentPresenceState.region = geo.region;
        currentPresenceState.country = geo.country;
        currentPresenceState.isp = geo.isp;
        if (activeChannel) {
          try { activeChannel.track(currentPresenceState); } catch {}
        }
      }
    });
  } else {
    currentPresenceState.currentPath = currentPath;
    currentPresenceState.pageTitle = pageTitle || document.title;
    currentPresenceState.lastActiveAt = now;
    currentPresenceState.scrollDepth = calculateCurrentScrollDepth();
    currentPresenceState.currentAction = `Navegó a ${currentPath === '/' ? 'Inicio' : currentPath}`;
  }

  // Setup Realtime WebSocket Presence channel if not active
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

    // 1. Visibility listener
    const handleVisibilityChange = () => {
      if (!currentPresenceState || !activeChannel) return;
      currentPresenceState.isTabActive = !document.hidden;
      currentPresenceState.lastActiveAt = new Date().toISOString();
      currentPresenceState.currentAction = document.hidden 
        ? 'Pestaña en segundo plano' 
        : `Viendo activamente ${currentPresenceState.currentPath}`;
      try { activeChannel.track(currentPresenceState); } catch {}
    };
    window.addEventListener('visibilitychange', handleVisibilityChange);

    // 2. Scroll Depth Tracking with throttle
    if (!scrollListenerActive) {
      scrollListenerActive = true;
      let scrollTimer: any = null;
      window.addEventListener('scroll', () => {
        if (!scrollTimer) {
          scrollTimer = setTimeout(() => {
            scrollTimer = null;
            if (currentPresenceState && activeChannel && !document.hidden) {
              const depth = calculateCurrentScrollDepth();
              if (Math.abs(depth - currentPresenceState.scrollDepth) >= 5) {
                currentPresenceState.scrollDepth = depth;
                currentPresenceState.lastActiveAt = new Date().toISOString();
                try { activeChannel.track(currentPresenceState); } catch {}
              }
            }
          }, 600);
        }
      }, { passive: true });
    }

    // 3. Section in Viewport Tracking (IntersectionObserver)
    setTimeout(() => {
      try {
        if (observerInstance) observerInstance.disconnect();
        observerInstance = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting && currentPresenceState && activeChannel) {
              const el = entry.target as HTMLElement;
              const sectionName = el.getAttribute('data-section-name') || el.id || el.tagName.toLowerCase();
              const readableName = formatReadableSection(sectionName);
              if (currentPresenceState.activeSection !== readableName) {
                currentPresenceState.activeSection = readableName;
                currentPresenceState.lastActiveAt = new Date().toISOString();
                try { activeChannel.track(currentPresenceState); } catch {}
              }
            }
          });
        }, { threshold: 0.3 });

        // Observe main sections
        document.querySelectorAll('section, header, footer, [id]').forEach(el => {
          if (el.id || el.tagName.toLowerCase() === 'section') {
            observerInstance?.observe(el);
          }
        });
      } catch {}
    }, 1000);

    // 4. Graceful Exit on tab close / reload
    const handleExit = () => {
      if (activeChannel) {
        try {
          activeChannel.untrack();
        } catch {}
      }
    };
    window.addEventListener('beforeunload', handleExit);
    window.addEventListener('pagehide', handleExit);

    // 5. Periodic heartbeat every 15 seconds while tab is active
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    heartbeatInterval = setInterval(() => {
      if (currentPresenceState && activeChannel && !document.hidden) {
        currentPresenceState.lastActiveAt = new Date().toISOString();
        currentPresenceState.scrollDepth = calculateCurrentScrollDepth();
        try {
          activeChannel.track(currentPresenceState);
        } catch {}
      }
    }, 15000);
  } else {
    // Re-track on page transition
    try {
      activeChannel.track(currentPresenceState);
    } catch {}
  }
}

function formatReadableSection(rawId: string): string {
  const map: Record<string, string> = {
    'hero': 'Portada / Vista Principal',
    'calculator': 'Cotizador en Línea',
    'formats': 'Catálogo de Formatos (VHS, Beta, 8mm)',
    'before-after': 'Comparador de Restauración de Video',
    'faq': 'Preguntas Frecuentes',
    'contact': 'Formulario de Contacto & WhatsApp',
    'contacto': 'Formulario de Contacto & WhatsApp',
    'reviews': 'Testimonios de Clientes',
    'process': 'Proceso de Digitalización',
    'track': 'Rastreador de Órdenes',
    'about': 'Quiénes Somos',
    'footer': 'Pie de Página'
  };
  return map[rawId.toLowerCase()] || `Sección: ${rawId}`;
}

/**
 * Report an interactive user micro-action (e.g. calculator changes, WhatsApp button clicks)
 */
export function reportVisitorAction(actionDescription: string, sectionName?: string) {
  if (!currentPresenceState || !activeChannel) return;
  currentPresenceState.lastActiveAt = new Date().toISOString();
  currentPresenceState.currentAction = actionDescription;
  if (sectionName) currentPresenceState.activeSection = sectionName;
  currentPresenceState.scrollDepth = calculateCurrentScrollDepth();
  try {
    activeChannel.track(currentPresenceState);
  } catch {}
}

/**
 * Associate active visitor presence with their live chat thread ID
 */
export function linkChatThreadToPresence(threadId: string) {
  if (!currentPresenceState || !activeChannel) return;
  currentPresenceState.chatThreadId = threadId;
  currentPresenceState.lastActiveAt = new Date().toISOString();
  try {
    activeChannel.track(currentPresenceState);
  } catch {}
}

/**
 * Subscribe to real-time active visitors presence (Used in Desktop Analytics HUD & Chat Center)
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
