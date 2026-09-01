import React, { useState, useEffect } from 'react';
import { 
  fetchCloudTrafficVisits, 
  recordPageView, 
  subscribeToRealtimeTraffic, 
  computeYouTubeMetrics, 
  type TrafficVisit,
  type YouTubeStyleMetrics 
} from '../lib/analytics';
import { 
  TrendingUp, 
  Compass, 
  RefreshCw, 
  MapPin, 
  Clock, 
  Zap, 
  Activity, 
  Layers,
  Smartphone
} from 'lucide-react';

interface Props {
  totalOrdersCount: number;
}

export const AdminTrafficAnalytics: React.FC<Props> = ({ totalOrdersCount }) => {
  const [, setVisits] = useState<TrafficVisit[]>([]);
  const [metrics, setMetrics] = useState<YouTubeStyleMetrics | null>(null);
  const [activeRange, setActiveRange] = useState<'realtime' | '24h' | '7d' | 'all'>('realtime');
  const [hoveredMinute, setHoveredMinute] = useState<{ label: string; count: number } | null>(null);
  const [hoveredHour, setHoveredHour] = useState<{ label: string; count: number } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [justSimulated, setJustSimulated] = useState(false);

  const loadTrafficData = async () => {
    setIsRefreshing(true);
    const data = await fetchCloudTrafficVisits();
    setVisits(data);
    setMetrics(computeYouTubeMetrics(data));
    setIsRefreshing(false);
  };

  useEffect(() => {
    loadTrafficData();

    // 1. Subscribe to Supabase WebSocket Realtime Events
    const unsubscribe = subscribeToRealtimeTraffic((newVisit) => {
      setVisits(prev => {
        const filtered = prev.filter(v => v.id !== newVisit.id);
        const updated = [newVisit, ...filtered];
        setMetrics(computeYouTubeMetrics(updated));
        return updated;
      });
    });

    // 2. Poll every 5s for minute ticker updates
    const interval = setInterval(() => {
      setVisits(prev => {
        if (prev.length > 0) setMetrics(computeYouTubeMetrics(prev));
        return prev;
      });
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const handleSimulateLiveVisit = () => {
    const testPages = ['/calculator', '/', '/track', '/contact', '/process'];
    const testSources = ['Instagram', 'Google Search', 'WhatsApp', 'Directo / Link'];
    const pickPage = testPages[Math.floor(Math.random() * testPages.length)];
    const pickSource = testSources[Math.floor(Math.random() * testSources.length)];

    const simulated = recordPageView(pickPage, `Página ${pickPage}`);
    simulated.referrerCategory = pickSource as any;

    setVisits(prev => {
      const updated = [simulated, ...prev];
      setMetrics(computeYouTubeMetrics(updated));
      return updated;
    });

    setJustSimulated(true);
    setTimeout(() => setJustSimulated(false), 2500);
  };

  if (!metrics) {
    return (
      <div className="p-12 text-center text-stone-500 flex flex-col items-center justify-center gap-3">
        <RefreshCw size={24} className="animate-spin text-orange-500" />
        <span>Cargando analíticas en tiempo real desde Supabase...</span>
      </div>
    );
  }

  // Calculate maximum for 60-min and 24-hr bar chart heights
  const maxMinCount = Math.max(...metrics.minuteHistogram.map(m => m.count), 1);
  const maxHourCount = Math.max(...metrics.hourHistogram.map(h => h.count), 1);

  // Conversion funnel metrics
  const totalViews = metrics.viewsTotal;
  const calculatorViews = metrics.topPages.find(p => p.path === '/calculator')?.views || Math.round(totalViews * 0.45);
  const quotesGenerated = totalOrdersCount;
  const conversionRate = metrics.uniqueVisitorsTotal > 0 
    ? ((quotesGenerated / metrics.uniqueVisitorsTotal) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-6">
      
      {/* Top YouTube Creator Studio Header Bar */}
      <div className="bg-stone-900 text-white p-6 rounded-2xl border border-stone-800 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
              YouTube Analytics Engine • Tiempo Real
            </span>
          </div>
          <h2 className="text-2xl font-black mt-1 text-white tracking-tight">
            Rendimiento del Canal & Tráfico en Vivo
          </h2>
          <p className="text-xs text-stone-400 mt-1">
            Métricas de audiencia sincronizadas con WebSockets de Supabase PostgreSQL
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleSimulateLiveVisit}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition ${
              justSimulated 
                ? 'bg-green-600 text-white' 
                : 'bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-600/25'
            }`}
          >
            <Zap size={14} className={justSimulated ? 'animate-bounce' : ''} />
            {justSimulated ? '✓ ¡Visita Registrada en Vivo!' : '⚡ Simular Visita en Vivo'}
          </button>

          <button
            onClick={loadTrafficData}
            disabled={isRefreshing}
            className="p-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl transition"
            title="Actualizar datos"
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* YOUTUBE STUDIO REAL-TIME HIGHLIGHT CARDS (60 Min & 48 Hours) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* CARD 1: ÚLTIMOS 60 MINUTOS (Histograma Minuto a Minuto) */}
        <div className="lg:col-span-7 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
                </span>
                <h3 className="text-sm font-bold text-stone-900 dark:text-white uppercase tracking-wider">
                  Tiempo Real: Últimos 60 minutos
                </h3>
              </div>
              <div className="flex items-baseline gap-3 mt-1">
                <span className="text-4xl font-black text-stone-900 dark:text-white">
                  {metrics.viewsLast60Min}
                </span>
                <span className="text-xs text-stone-500 font-medium">vistas en la última hora</span>
              </div>
            </div>

            {/* Active Visitors Badge */}
            <div className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400">
                {metrics.activeNow} {metrics.activeNow === 1 ? 'activo ahora' : 'activos ahora'}
              </span>
            </div>
          </div>

          {/* Interactive 60-Minute Bar Chart */}
          <div className="space-y-1 pt-2">
            <div className="h-28 flex items-end gap-[3px] bg-stone-50 dark:bg-stone-950/60 p-2.5 rounded-xl border border-stone-100 dark:border-stone-800 relative">
              {metrics.minuteHistogram.map((m, idx) => {
                const heightPct = m.count > 0 ? Math.max((m.count / maxMinCount) * 100, 15) : 6;
                return (
                  <div
                    key={idx}
                    onMouseEnter={() => setHoveredMinute({ label: m.label, count: m.count })}
                    onMouseLeave={() => setHoveredMinute(null)}
                    className="flex-1 flex flex-col justify-end items-center h-full group relative cursor-pointer"
                  >
                    <div
                      className={`w-full rounded-t-sm transition-all duration-300 ${
                        m.count > 0 
                          ? (m.isCurrent ? 'bg-orange-500 shadow-sm' : 'bg-blue-600 dark:bg-blue-500 hover:bg-blue-400')
                          : 'bg-stone-200 dark:bg-stone-800 hover:bg-stone-300'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    ></div>
                  </div>
                );
              })}
            </div>

            {/* Tooltip / Legend */}
            <div className="flex justify-between items-center text-[11px] text-stone-400 font-mono pt-1 px-1">
              <span>-60 min</span>
              <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
                {hoveredMinute ? `${hoveredMinute.label}: ${hoveredMinute.count} vistas` : 'Pasa el cursor sobre las barras para ver detalles'}
              </span>
              <span className="text-orange-600 font-bold">Ahora (0m)</span>
            </div>
          </div>
        </div>

        {/* CARD 2: ÚLTIMAS 24/48 HORAS (Histograma Hora por Hora) */}
        <div className="lg:col-span-5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-bold text-stone-900 dark:text-white uppercase tracking-wider">
                  Vistas en las Últimas 24 Horas
                </h3>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-4xl font-black text-stone-900 dark:text-white">
                    {metrics.viewsLast24Hours}
                  </span>
                  <span className="text-xs text-stone-500">vistas hoy</span>
                </div>
              </div>

              <div className="p-2.5 bg-blue-50 dark:bg-blue-950/50 rounded-xl text-blue-600 border border-blue-100 dark:border-blue-900">
                <Activity size={20} />
              </div>
            </div>

            {/* Interactive 24-Hour Bar Chart */}
            <div className="h-28 flex items-end gap-1 bg-stone-50 dark:bg-stone-950/60 p-2.5 rounded-xl border border-stone-100 dark:border-stone-800 mt-4">
              {metrics.hourHistogram.map((h, idx) => {
                const heightPct = h.count > 0 ? Math.max((h.count / maxHourCount) * 100, 15) : 8;
                return (
                  <div
                    key={idx}
                    onMouseEnter={() => setHoveredHour({ label: h.label, count: h.count })}
                    onMouseLeave={() => setHoveredHour(null)}
                    className="flex-1 flex flex-col justify-end items-center h-full cursor-pointer"
                  >
                    <div
                      className={`w-full rounded-t-sm transition-all duration-300 ${
                        h.count > 0 
                          ? (h.isCurrent ? 'bg-orange-500' : 'bg-indigo-600 hover:bg-indigo-400')
                          : 'bg-stone-200 dark:bg-stone-800'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    ></div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between items-center text-[11px] text-stone-400 font-mono pt-1 px-1">
              <span>-24 hrs</span>
              <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
                {hoveredHour ? `${hoveredHour.label}: ${hoveredHour.count} vistas` : ''}
              </span>
              <span>Hora actual</span>
            </div>
          </div>

          <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex justify-between text-xs text-stone-500">
            <span>Total Histórico Acumulado:</span>
            <strong className="text-stone-900 dark:text-white font-bold">{metrics.viewsTotal} vistas</strong>
          </div>
        </div>

      </div>

      {/* TABS SELECTOR (YouTube Studio View Filters) */}
      <div className="flex items-center gap-2 border-b border-stone-200 dark:border-stone-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveRange('realtime')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
            activeRange === 'realtime'
              ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900 shadow-md'
              : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'
          }`}
        >
          ⏱️ Tiempo Real (60 Min)
        </button>
        <button
          onClick={() => setActiveRange('24h')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
            activeRange === '24h'
              ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900 shadow-md'
              : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'
          }`}
        >
          📅 Últimas 24 Horas
        </button>
        <button
          onClick={() => setActiveRange('7d')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
            activeRange === '7d'
              ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900 shadow-md'
              : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'
          }`}
        >
          📈 Últimos 7 Días
        </button>
        <button
          onClick={() => setActiveRange('all')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
            activeRange === 'all'
              ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900 shadow-md'
              : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'
          }`}
        >
          🌐 Historial Completo
        </button>
      </div>

      {/* GRID OF YOUTUBE ANALYTICS MODULES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* MODULE 1: CONTENIDO PRINCIPAL (Top Videos/Pages en estilo YT Studio) */}
        <div className="lg:col-span-2 bg-white dark:bg-stone-900 p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-stone-900 dark:text-white flex items-center gap-2">
                <Layers size={18} className="text-orange-500" />
                Páginas Más Vistas (Contenido Principal)
              </h3>
              <p className="text-xs text-stone-400 mt-0.5">Distribución de visitas por sección</p>
            </div>
            <span className="text-xs font-bold text-stone-400">Vistas & %</span>
          </div>

          <div className="space-y-3">
            {metrics.topPages.map((page, index) => (
              <div key={page.path} className="p-3.5 bg-stone-50 dark:bg-stone-950/50 rounded-xl border border-stone-200 dark:border-stone-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 truncate pr-2">
                    <span className="w-6 h-6 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-orange-600 font-extrabold text-xs flex items-center justify-center">
                      #{index + 1}
                    </span>
                    <div className="truncate">
                      <div className="text-xs font-bold text-stone-900 dark:text-white truncate">
                        {page.title}
                      </div>
                      <div className="text-[11px] font-mono text-stone-400">
                        {page.path}
                      </div>
                    </div>
                  </div>
                  <div className="text-right whitespace-nowrap">
                    <span className="text-sm font-extrabold text-stone-900 dark:text-white">{page.views}</span>
                    <span className="text-xs text-stone-400 ml-1.5 font-semibold">({page.percentage}%)</span>
                  </div>
                </div>

                <div className="w-full bg-stone-200 dark:bg-stone-800 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-orange-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(page.percentage, 5)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>

          {/* EMBUDO DE CONVERSIÓN EN VIVO */}
          <div className="pt-4 border-t border-stone-200 dark:border-stone-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3 flex items-center gap-1.5">
              <TrendingUp size={14} className="text-emerald-500" />
              Embudo de Conversión de Visitante a Cliente
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-stone-50 dark:bg-stone-950/60 rounded-xl border border-stone-200 dark:border-stone-800 text-center">
                <div className="text-[11px] font-bold text-stone-500">1. Visitas Web</div>
                <div className="text-xl font-black text-stone-900 dark:text-white mt-1">{totalViews}</div>
                <div className="text-[10px] text-stone-400">100% Tráfico</div>
              </div>

              <div className="p-3 bg-stone-50 dark:bg-stone-950/60 rounded-xl border border-stone-200 dark:border-stone-800 text-center">
                <div className="text-[11px] font-bold text-stone-500">2. Calculadora</div>
                <div className="text-xl font-black text-blue-600 mt-1">{calculatorViews}</div>
                <div className="text-[10px] text-blue-500 font-semibold">{totalViews > 0 ? Math.round((calculatorViews / totalViews) * 100) : 0}% Exploraron</div>
              </div>

              <div className="p-3 bg-stone-50 dark:bg-stone-950/60 rounded-xl border border-stone-200 dark:border-stone-800 text-center">
                <div className="text-[11px] font-bold text-stone-500">3. Cotizaciones</div>
                <div className="text-xl font-black text-orange-600 mt-1">{quotesGenerated}</div>
                <div className="text-[10px] text-orange-500 font-semibold">{conversionRate}% Tasa Final</div>
              </div>

              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 text-center">
                <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">4. En Producción</div>
                <div className="text-xl font-black text-emerald-600 mt-1">{totalOrdersCount}</div>
                <div className="text-[10px] text-emerald-600 font-bold">Anticipos / PINs</div>
              </div>
            </div>
          </div>
        </div>

        {/* MODULE 2: CÓMO TE ENCUENTRAN LOS USUARIOS (Fuentes de Tráfico) */}
        <div className="bg-white dark:bg-stone-900 p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-bold text-stone-900 dark:text-white flex items-center gap-2">
              <Compass size={18} className="text-orange-500" />
              Fuentes de Tráfico (Adquisición)
            </h3>
            <p className="text-xs text-stone-400 mt-0.5">Canales por donde llegan los clientes</p>
          </div>

          <div className="space-y-4">
            {metrics.sources.map((src) => (
              <div key={src.category} className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: src.color }}></span>
                    {src.category}
                  </span>
                  <span className="text-stone-500">
                    <strong>{src.count}</strong> ({src.percentage}%)
                  </span>
                </div>
                <div className="w-full bg-stone-100 dark:bg-stone-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500" 
                    style={{ width: `${src.percentage}%`, backgroundColor: src.color }}
                  ></div>
                </div>
              </div>
            ))}
          </div>

          {/* AUDIENCIA & CIUDADES */}
          <div className="pt-4 border-t border-stone-200 dark:border-stone-800 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
              <MapPin size={14} className="text-orange-500" />
              Principales Ciudades de México
            </h4>

            <div className="space-y-2">
              {metrics.cities.map((c) => (
                <div key={c.city} className="flex justify-between text-xs font-semibold text-stone-700 dark:text-stone-300">
                  <span>{c.city}</span>
                  <span className="text-stone-500">{c.percentage}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* DISPOSITIVOS */}
          <div className="pt-4 border-t border-stone-200 dark:border-stone-800 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
              <Smartphone size={14} className="text-blue-500" />
              Dispositivos
            </h4>

            <div className="grid grid-cols-2 gap-2 text-center">
              {metrics.devices.map(d => (
                <div key={d.device} className="p-2.5 bg-stone-50 dark:bg-stone-950/60 rounded-xl border border-stone-200 dark:border-stone-800">
                  <div className="text-xs font-bold text-stone-900 dark:text-white">{d.device}</div>
                  <div className="text-sm font-extrabold text-orange-600 mt-0.5">{d.percentage}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* FEED EN TIEMPO REAL (Últimos Eventos Entrantes) */}
      <div className="bg-white dark:bg-stone-900 p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-orange-500" />
            <h3 className="text-base font-bold text-stone-900 dark:text-white">
              Registro de Visitas en Vivo (Streaming en Tiempo Real)
            </h3>
          </div>
          <span className="text-xs font-mono text-stone-400">Actualizado vía WebSockets</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 dark:border-stone-800 text-stone-400 uppercase text-[10px] tracking-wider">
                <th className="pb-3 font-semibold">Hora</th>
                <th className="pb-3 font-semibold">Página Visitada</th>
                <th className="pb-3 font-semibold">Canal de Origen</th>
                <th className="pb-3 font-semibold">Dispositivo & SO</th>
                <th className="pb-3 font-semibold">Ubicación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {metrics.recentVisits.slice(0, 15).map((v) => (
                <tr key={v.id} className="hover:bg-stone-50 dark:hover:bg-stone-950/40 transition">
                  <td className="py-3 text-stone-500 whitespace-nowrap">
                    {new Date(v.timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  <td className="py-3">
                    <span className="font-semibold text-stone-900 dark:text-white">{v.pageTitle}</span>
                    <span className="block text-[11px] font-mono text-stone-400">{v.path}</span>
                  </td>
                  <td className="py-3">
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900">
                      {v.referrerCategory}
                    </span>
                  </td>
                  <td className="py-3 text-stone-600 dark:text-stone-400 whitespace-nowrap">
                    {v.device} • {v.os} • {v.browser}
                  </td>
                  <td className="py-3 text-stone-500 whitespace-nowrap">
                    <span className="flex items-center gap-1">
                      <MapPin size={12} className="text-orange-500" /> {v.city || 'México'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
export default AdminTrafficAnalytics;
