import React, { useState, useEffect } from 'react';
import { getTrafficSummary, type TrafficSummary } from '../lib/analytics';
import { 
  Globe, 
  Smartphone, 
  Monitor, 
  TrendingUp, 
  Users, 
  Eye, 
  Compass, 
  RefreshCw,
  MapPin,
  Clock
} from 'lucide-react';

interface Props {
  totalOrdersCount: number;
}

export const AdminTrafficAnalytics: React.FC<Props> = ({ totalOrdersCount }) => {
  const [summary, setSummary] = useState<TrafficSummary>(() => getTrafficSummary());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const reloadData = () => {
    setIsRefreshing(true);
    setSummary(getTrafficSummary());
    setTimeout(() => setIsRefreshing(false), 400);
  };

  useEffect(() => {
    const handleUpdate = () => setSummary(getTrafficSummary());
    window.addEventListener('digimemories_analytics_update', handleUpdate);
    const interval = setInterval(handleUpdate, 4000);
    return () => {
      window.removeEventListener('digimemories_analytics_update', handleUpdate);
      clearInterval(interval);
    };
  }, []);

  const conversionRate = summary.uniqueVisitors > 0 
    ? ((totalOrdersCount / summary.uniqueVisitors) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-6">
      
      {/* Top Header & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-stone-900 p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <h2 className="text-xl font-bold text-stone-900 dark:text-white">
              Monitoreo de Tráfico Real & Origen de Visitantes
            </h2>
          </div>
          <p className="text-sm text-stone-500 mt-1">
            Métricas de adquisición de clientes, canales de procedencia y comportamiento en tiempo real
          </p>
        </div>

        <button
          onClick={reloadData}
          disabled={isRefreshing}
          className="self-start sm:self-auto px-4 py-2 text-sm font-semibold bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 rounded-xl flex items-center gap-2 transition"
        >
          <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          Actualizar Datos
        </button>
      </div>

      {/* KPI Highlight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Visitas Hoy */}
        <div className="bg-gradient-to-br from-orange-500 to-amber-600 text-white p-5 rounded-2xl shadow-lg shadow-orange-500/20 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-orange-100">Visitas Hoy</p>
              <h3 className="text-3xl font-black mt-1">{summary.todayViews}</h3>
            </div>
            <div className="p-2.5 bg-white/15 rounded-xl backdrop-blur-sm">
              <Eye size={22} className="text-white" />
            </div>
          </div>
          <div className="mt-3 text-xs text-orange-100 flex items-center gap-1 font-medium">
            <span className="font-bold text-white">{summary.todayVisitors}</span> visitantes únicos hoy
          </div>
        </div>

        {/* Card 2: Total Visitantes Únicos */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-5 rounded-2xl shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-stone-500">Visitantes Únicos</p>
              <h3 className="text-3xl font-black text-stone-900 dark:text-white mt-1">{summary.uniqueVisitors}</h3>
            </div>
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/50 rounded-xl text-blue-600 border border-blue-100 dark:border-blue-900">
              <Users size={22} />
            </div>
          </div>
          <div className="mt-3 text-xs text-stone-500">
            Total acumulado de sesiones
          </div>
        </div>

        {/* Card 3: Tasa de Conversión */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-5 rounded-2xl shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-stone-500">Conversión a Cotización</p>
              <h3 className="text-3xl font-black text-stone-900 dark:text-white mt-1">{conversionRate}%</h3>
            </div>
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl text-emerald-600 border border-emerald-100 dark:border-emerald-900">
              <TrendingUp size={22} />
            </div>
          </div>
          <div className="mt-3 text-xs text-stone-500">
            <span className="font-bold text-emerald-600">{totalOrdersCount} órdenes</span> de {summary.uniqueVisitors} visitantes
          </div>
        </div>

        {/* Card 4: Páginas Vistas Totales */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-5 rounded-2xl shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-stone-500">Páginas Vistas</p>
              <h3 className="text-3xl font-black text-stone-900 dark:text-white mt-1">{summary.totalViews}</h3>
            </div>
            <div className="p-2.5 bg-purple-50 dark:bg-purple-950/50 rounded-xl text-purple-600 border border-purple-100 dark:border-purple-900">
              <Globe size={22} />
            </div>
          </div>
          <div className="mt-3 text-xs text-stone-500">
            ~{summary.uniqueVisitors > 0 ? (summary.totalViews / summary.uniqueVisitors).toFixed(1) : '1'} páginas por visitante
          </div>
        </div>
      </div>

      {/* Main Grid: Fuentes de Tráfico & Dispositivos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Col 1 & 2: Canales de Adquisición / Tráfico */}
        <div className="lg:col-span-2 bg-white dark:bg-stone-900 p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-stone-900 dark:text-white flex items-center gap-2">
              <Compass size={18} className="text-orange-500" />
              ¿De Dónde Llegan Tus Clientes? (Canales de Origen)
            </h3>
            <span className="text-xs text-stone-400">Desglose porcentual</span>
          </div>

          <div className="space-y-3">
            {summary.sources.map((src) => (
              <div key={src.category} className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: src.color }}></span>
                    {src.category}
                  </span>
                  <span className="text-stone-500">
                    {src.count} visitas ({src.percentage}%)
                  </span>
                </div>
                <div className="w-full bg-stone-100 dark:bg-stone-800 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500" 
                    style={{ width: `${src.percentage}%`, backgroundColor: src.color }}
                  ></div>
                </div>
              </div>
            ))}
          </div>

          {/* Top Páginas Vistas */}
          <div className="pt-4 border-t border-stone-200 dark:border-stone-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3">
              Páginas Más Visitadas
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {summary.topPages.map((page) => (
                <div key={page.path} className="p-2.5 bg-stone-50 dark:bg-stone-950/50 border border-stone-200 dark:border-stone-800 rounded-xl flex items-center justify-between">
                  <div className="truncate pr-2">
                    <div className="text-xs font-bold text-stone-800 dark:text-stone-200 truncate">{page.title}</div>
                    <div className="text-[11px] font-mono text-stone-400 truncate">{page.path}</div>
                  </div>
                  <span className="px-2 py-0.5 text-xs font-bold bg-orange-100 dark:bg-orange-950/60 text-orange-600 rounded-md">
                    {page.views}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Col 3: Dispositivos & Tecnologías */}
        <div className="bg-white dark:bg-stone-900 p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-6">
          <h3 className="text-base font-bold text-stone-900 dark:text-white flex items-center gap-2">
            <Smartphone size={18} className="text-orange-500" />
            Dispositivos & Tecnología
          </h3>

          <div className="space-y-4">
            {summary.devices.map((dev) => (
              <div key={dev.device} className="p-3.5 bg-stone-50 dark:bg-stone-950/50 rounded-xl border border-stone-200 dark:border-stone-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white dark:bg-stone-900 rounded-lg border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300">
                    {dev.device === 'Móvil' ? <Smartphone size={18} /> : (dev.device === 'Desktop' ? <Monitor size={18} /> : <Globe size={18} />)}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-stone-900 dark:text-white">{dev.device}</div>
                    <div className="text-xs text-stone-500">{dev.count} sesiones</div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-extrabold text-orange-600">{dev.percentage}%</span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/50 rounded-xl">
            <div className="text-xs font-bold text-orange-800 dark:text-orange-300 flex items-center gap-1.5">
              💡 Recomendación de Marketing
            </div>
            <p className="text-xs text-orange-700 dark:text-orange-400 mt-1 leading-relaxed">
              La mayoría de usuarios cotizan desde dispositivos móviles mediante enlaces en redes sociales. Asegúrate de mantener la experiencia de chat y cotizador rápida y fluida.
            </p>
          </div>
        </div>
      </div>

      {/* Feed en Vivo de Últimas Visitas */}
      <div className="bg-white dark:bg-stone-900 p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-stone-900 dark:text-white flex items-center gap-2">
            <Clock size={18} className="text-orange-500" />
            Flujo de Visitantes en Tiempo Real (Últimas Actividades)
          </h3>
          <span className="text-xs text-stone-400">Actualización en vivo</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 dark:border-stone-800 text-stone-400 uppercase text-[10px] tracking-wider">
                <th className="pb-3 font-semibold">Hora</th>
                <th className="pb-3 font-semibold">Página</th>
                <th className="pb-3 font-semibold">Origen / Canal</th>
                <th className="pb-3 font-semibold">Dispositivo</th>
                <th className="pb-3 font-semibold">Ubicación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {summary.recentVisits.slice(0, 10).map((v) => (
                <tr key={v.id} className="hover:bg-stone-50 dark:hover:bg-stone-950/40 transition">
                  <td className="py-3 text-stone-500 whitespace-nowrap">
                    {new Date(v.timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-3">
                    <span className="font-semibold text-stone-800 dark:text-stone-200">{v.pageTitle}</span>
                    <span className="block text-[11px] font-mono text-stone-400">{v.path}</span>
                  </td>
                  <td className="py-3">
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                      {v.referrerCategory}
                    </span>
                  </td>
                  <td className="py-3 text-stone-600 dark:text-stone-400 whitespace-nowrap">
                    {v.device} • {v.browser}
                  </td>
                  <td className="py-3 text-stone-500 flex items-center gap-1 whitespace-nowrap">
                    <MapPin size={12} className="text-orange-500" /> {v.city || 'México'}
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
