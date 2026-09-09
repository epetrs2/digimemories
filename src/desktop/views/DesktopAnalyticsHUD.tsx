import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Activity, 
  Layers, 
  RefreshCw, 
  Film
} from 'lucide-react';
import { 
  fetchCloudTrafficVisits, 
  subscribeToRealtimeTraffic, 
  computeYouTubeMetrics, 
  type YouTubeStyleMetrics 
} from '../../lib/analytics';
import { getOrders } from '../../lib/store';

export const DesktopAnalyticsHUD: React.FC = () => {
  const [metrics, setMetrics] = useState<YouTubeStyleMetrics | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const orders = getOrders();

  const loadData = async () => {
    setIsRefreshing(true);
    try {
      const data = await fetchCloudTrafficVisits();
      setMetrics(computeYouTubeMetrics(data));
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = subscribeToRealtimeTraffic(() => loadData());
    const interval = setInterval(loadData, 8000);
    return () => {
      unsub();
      clearInterval(interval);
    };
  }, []);

  // Compute format distribution from orders
  const formatCounts: Record<string, number> = {};
  orders.forEach(o => {
    o.items?.forEach(i => {
      const f = i.format || 'Otro';
      formatCounts[f] = (formatCounts[f] || 0) + 1;
    });
  });

  const totalCassettes = Object.values(formatCounts).reduce((a, b) => a + b, 0);

  return (
    <div style={{ flex: 1, padding: '2rem', overflowY: 'auto', background: 'rgba(12, 10, 9, 0.6)' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart3 size={20} style={{ color: 'var(--mac-accent)' }} />
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#f5f5f4' }}>
              Métricas & Telemetría en Vivo
            </h2>
          </div>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--mac-text-muted)' }}>
            Supervisión continua de tráfico web, cotizaciones activas y distribución de cintas en laboratorio.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={isRefreshing}
          className="mac-btn-secondary"
          style={{ fontSize: '0.8rem' }}
        >
          <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
          Actualizar Métricas
        </button>
      </div>

      {/* Main KPIs Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        
        {/* KPI 1: Active Visitors */}
        <div className="mac-card" style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--mac-text-muted)', textTransform: 'uppercase' }}>
              Visitantes en Vivo (48h)
            </span>
            <span className="mac-badge-emerald">
              <Activity size={12} className="animate-pulse" /> Tiempo Real
            </span>
          </div>
          <div style={{ fontSize: '2.25rem', fontWeight: 800, color: '#f5f5f4', letterSpacing: '-0.02em' }}>
            {metrics?.viewsLast48Hours || 0}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#34d399', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <TrendingUp size={13} /> {metrics?.viewsLast60Min || 0} visitas en los últimos 60 minutos
          </div>
        </div>

        {/* KPI 2: Quotes / Orders Volume */}
        <div className="mac-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--mac-text-muted)', textTransform: 'uppercase' }}>
              Órdenes Registradas
            </span>
            <span className="mac-badge-amber">
              Laboratorio
            </span>
          </div>
          <div style={{ fontSize: '2.25rem', fontWeight: 800, color: '#f5f5f4', letterSpacing: '-0.02em' }}>
            {orders.length}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--mac-text-secondary)', marginTop: '0.35rem' }}>
            {orders.filter(o => !o.isArchived && o.status === 'en_proceso').length} actualmente en digitalizadora
          </div>
        </div>

        {/* KPI 3: Total Cassettes */}
        <div className="mac-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--mac-text-muted)', textTransform: 'uppercase' }}>
              Cintas Procesadas
            </span>
            <Film size={18} style={{ color: 'var(--mac-accent)' }} />
          </div>
          <div style={{ fontSize: '2.25rem', fontWeight: 800, color: '#f5f5f4', letterSpacing: '-0.02em' }}>
            {totalCassettes}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--mac-text-secondary)', marginTop: '0.35rem' }}>
            VHS, Video8, Hi8, MiniDV, Betamax
          </div>
        </div>

      </div>

      {/* Format Breakdown Section */}
      <div className="mac-glass-panel" style={{ borderRadius: '20px', padding: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <Layers size={18} style={{ color: 'var(--mac-accent)' }} />
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#f5f5f4' }}>
            Distribución por Formato de Cinta en Laboratorio
          </h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {Object.entries(formatCounts).map(([format, count]) => {
            const percent = totalCassettes > 0 ? Math.round((count / totalCassettes) * 100) : 0;
            return (
              <div key={format} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700 }}>
                  <span style={{ color: '#f5f5f4' }}>{format}</span>
                  <span style={{ color: 'var(--mac-accent)' }}>{count} casetes ({percent}%)</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                  <div style={{ width: `${percent}%`, height: '100%', background: 'linear-gradient(90deg, #ea580c, #f97316)', borderRadius: '999px', transition: 'width 0.4s ease' }}></div>
                </div>
              </div>
            );
          })}

          {Object.keys(formatCounts).length === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--mac-text-muted)' }}>
              Aún no hay cintas registradas para calcular estadísticas.
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default DesktopAnalyticsHUD;
