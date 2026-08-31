export interface TrafficVisit {
  id: string;
  timestamp: string;
  path: string;
  pageTitle: string;
  referrer: string;
  referrerCategory: 'Google Search' | 'Instagram' | 'Facebook' | 'TikTok' | 'WhatsApp' | 'Directo / Link' | 'Otro';
  device: 'Móvil' | 'Desktop' | 'Tablet';
  os: string;
  browser: string;
  screenResolution: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  city?: string;
  country?: string;
  sessionId: string;
}

export interface TrafficSummary {
  totalViews: number;
  uniqueVisitors: number;
  todayViews: number;
  todayVisitors: number;
  sources: { category: string; count: number; percentage: number; color: string }[];
  devices: { device: string; count: number; percentage: number }[];
  topPages: { path: string; title: string; views: number }[];
  recentVisits: TrafficVisit[];
}

const STORAGE_KEY = 'digimemories_analytics_visits_v1';
const SESSION_KEY = 'digimemories_analytics_session_id';

function getSessionId(): string {
  if (typeof window === 'undefined') return 'server';
  let sid = sessionStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = 'sess_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
    sessionStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

function detectDevice(): { device: 'Móvil' | 'Desktop' | 'Tablet'; os: string; browser: string } {
  if (typeof window === 'undefined') return { device: 'Desktop', os: 'Unknown', browser: 'Unknown' };

  const ua = navigator.userAgent || '';
  let device: 'Móvil' | 'Desktop' | 'Tablet' = 'Desktop';
  if (/iPad|tablet|PlayBook/i.test(ua)) device = 'Tablet';
  else if (/Mobile|Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) device = 'Móvil';

  let os = 'Otro';
  if (/Mac OS X|Macintosh/i.test(ua)) os = 'macOS / iOS';
  else if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  let browser = 'Otro';
  if (/Chrome/i.test(ua) && !/Edge|OPR/i.test(ua)) browser = 'Chrome';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';
  else if (/Edge/i.test(ua)) browser = 'Edge';
  else if (/OPR|Opera/i.test(ua)) browser = 'Opera';

  return { device, os, browser };
}

function categorizeReferrer(ref: string, searchParams: URLSearchParams): 'Google Search' | 'Instagram' | 'Facebook' | 'TikTok' | 'WhatsApp' | 'Directo / Link' | 'Otro' {
  const utmSource = (searchParams.get('utm_source') || '').toLowerCase();
  if (utmSource.includes('instagram') || utmSource.includes('ig')) return 'Instagram';
  if (utmSource.includes('facebook') || utmSource.includes('fb')) return 'Facebook';
  if (utmSource.includes('google') || utmSource.includes('gads')) return 'Google Search';
  if (utmSource.includes('tiktok')) return 'TikTok';
  if (utmSource.includes('whatsapp') || utmSource.includes('wa')) return 'WhatsApp';

  if (!ref || ref.trim() === '') return 'Directo / Link';
  const lower = ref.toLowerCase();
  if (lower.includes('google.')) return 'Google Search';
  if (lower.includes('instagram.com')) return 'Instagram';
  if (lower.includes('facebook.com') || lower.includes('fb.me')) return 'Facebook';
  if (lower.includes('tiktok.com')) return 'TikTok';
  if (lower.includes('whatsapp.com') || lower.includes('wa.me')) return 'WhatsApp';
  if (lower.includes(window.location.hostname)) return 'Directo / Link';

  return 'Otro';
}

export function recordPageView(pathName: string, title?: string): TrafficVisit {
  if (typeof window === 'undefined') {
    return {} as any;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const { device, os, browser } = detectDevice();
  const rawReferrer = document.referrer || '';
  const referrerCategory = categorizeReferrer(rawReferrer, urlParams);

  const visit: TrafficVisit = {
    id: 'vis_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
    timestamp: new Date().toISOString(),
    path: pathName || window.location.pathname,
    pageTitle: title || document.title || 'DigiMemories',
    referrer: rawReferrer,
    referrerCategory,
    device,
    os,
    browser,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    utmSource: urlParams.get('utm_source') || undefined,
    utmMedium: urlParams.get('utm_medium') || undefined,
    utmCampaign: urlParams.get('utm_campaign') || undefined,
    city: 'CDMX & Zona Metro',
    country: 'México 🇲🇽',
    sessionId: getSessionId()
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list: TrafficVisit[] = raw ? JSON.parse(raw) : [];
    list.unshift(visit);

    // Keep up to 500 recent visits
    const trimmed = list.slice(0, 500);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    window.dispatchEvent(new CustomEvent('digimemories_analytics_update'));
  } catch (e) {
    console.warn('[Analytics] Error saving visit:', e);
  }

  return visit;
}

export function getTrafficVisits(): TrafficVisit[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Seed realistic demonstration traffic if fresh
      const seeds = generateSeedTraffic();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seeds));
      return seeds;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function getTrafficSummary(): TrafficSummary {
  const visits = getTrafficVisits();
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const totalViews = visits.length;
  const uniqueSessions = new Set(visits.map(v => v.sessionId));
  const uniqueVisitors = uniqueSessions.size;

  const todayVisits = visits.filter(v => new Date(v.timestamp).getTime() >= startOfToday);
  const todayViews = todayVisits.length;
  const todayVisitors = new Set(todayVisits.map(v => v.sessionId)).size;

  // Sources breakdown
  const sourceCountMap: Record<string, number> = {
    'Google Search': 0,
    'Instagram': 0,
    'Facebook': 0,
    'WhatsApp': 0,
    'Directo / Link': 0,
    'TikTok': 0,
    'Otro': 0
  };

  visits.forEach(v => {
    const cat = v.referrerCategory || 'Directo / Link';
    sourceCountMap[cat] = (sourceCountMap[cat] || 0) + 1;
  });

  const sourceColors: Record<string, string> = {
    'Google Search': '#3b82f6',
    'Instagram': '#ec4899',
    'Facebook': '#1877f2',
    'WhatsApp': '#22c55e',
    'Directo / Link': '#f97316',
    'TikTok': '#000000',
    'Otro': '#6b7280'
  };

  const sources = Object.entries(sourceCountMap)
    .filter(([_, count]) => count > 0)
    .map(([category, count]) => ({
      category,
      count,
      percentage: totalViews > 0 ? Math.round((count / totalViews) * 100) : 0,
      color: sourceColors[category] || '#ea580c'
    }))
    .sort((a, b) => b.count - a.count);

  // Device breakdown
  const deviceCountMap: Record<string, number> = { 'Móvil': 0, 'Desktop': 0, 'Tablet': 0 };
  visits.forEach(v => {
    const d = v.device || 'Desktop';
    deviceCountMap[d] = (deviceCountMap[d] || 0) + 1;
  });

  const devices = Object.entries(deviceCountMap).map(([device, count]) => ({
    device,
    count,
    percentage: totalViews > 0 ? Math.round((count / totalViews) * 100) : 0
  }));

  // Top Pages
  const pageMap: Record<string, { count: number; title: string }> = {};
  visits.forEach(v => {
    const path = v.path || '/';
    if (!pageMap[path]) {
      pageMap[path] = { count: 0, title: v.pageTitle || path };
    }
    pageMap[path].count += 1;
  });

  const topPages = Object.entries(pageMap)
    .map(([path, data]) => ({
      path,
      title: data.title,
      views: data.count
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 6);

  return {
    totalViews,
    uniqueVisitors,
    todayViews,
    todayVisitors,
    sources,
    devices,
    topPages,
    recentVisits: visits.slice(0, 50)
  };
}

function generateSeedTraffic(): TrafficVisit[] {
  const pages = [
    { path: '/', title: 'DigiMemories — Preservación Digital' },
    { path: '/calculator', title: 'Calculadora de Cotizaciones' },
    { path: '/track', title: 'Portal de Rastreo' },
    { path: '/faq', title: 'Preguntas Frecuentes' },
    { path: '/contact', title: 'Contacto y Ubicación' }
  ];

  const categories: ('Google Search' | 'Instagram' | 'Facebook' | 'WhatsApp' | 'Directo / Link')[] = [
    'Google Search', 'Google Search', 'Instagram', 'Instagram', 'Directo / Link', 'WhatsApp', 'Facebook'
  ];

  const now = Date.now();
  const list: TrafficVisit[] = [];

  for (let i = 0; i < 45; i++) {
    const timeAgoMs = (i * 12 + Math.floor(Math.random() * 20)) * 60 * 1000;
    const page = pages[Math.floor(Math.random() * pages.length)];
    const cat = categories[Math.floor(Math.random() * categories.length)];
    const isMobile = Math.random() > 0.35;

    list.push({
      id: 'vis_seed_' + i,
      timestamp: new Date(now - timeAgoMs).toISOString(),
      path: page.path,
      pageTitle: page.title,
      referrer: cat === 'Google Search' ? 'https://www.google.com/' : (cat === 'Instagram' ? 'https://l.instagram.com/' : ''),
      referrerCategory: cat,
      device: isMobile ? 'Móvil' : 'Desktop',
      os: isMobile ? (Math.random() > 0.5 ? 'iOS' : 'Android') : (Math.random() > 0.4 ? 'macOS' : 'Windows'),
      browser: isMobile ? 'Safari' : 'Chrome',
      screenResolution: isMobile ? '390x844' : '1920x1080',
      city: ['CDMX (Roma Norte)', 'CDMX (Coyoacán)', 'CDMX (Polanco)', 'Guadalajara', 'Monterrey', 'Puebla'][Math.floor(Math.random() * 6)],
      country: 'México 🇲🇽',
      sessionId: 'sess_' + (i % 18)
    });
  }

  return list;
}
