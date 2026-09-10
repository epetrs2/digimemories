import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Activity, 
  RefreshCw, 
  Film,
  Globe,
  Radio,
  Smartphone, Monitor, MapPin, Compass, Clock, Layers
} from 'lucide-react';
import { 
  fetchCloudTrafficVisits, 
  subscribeToRealtimeTraffic, 
  computeYouTubeMetrics, 
  type YouTubeStyleMetrics,
  type TrafficVisit
} from '../../lib/analytics';
import { getOrders } from '../../lib/store';
import { subscribeToVisitorPresence, type LiveVisitorPresence } from '../../lib/visitorPresence';

export const DesktopAnalyticsHUD: React.FC = () => {
  const [metrics, setMetrics] = useState<YouTubeStyleMetrics | null>(null);
  const [rawVisits, setRawVisits] = useState<TrafficVisit[]>([]);
  const [livePresences, setLivePresences] = useState<LiveVisitorPresence[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hoveredMinute, setHoveredMinute] = useState<{ label: string; count: number } | null>(null);
  const orders = getOrders();

  const loadData = async () => {
    setIsRefreshing(true);
    try {
      const data = await fetchCloudTrafficVisits();
      setRawVisits(data);
      setMetrics(computeYouTubeMetrics(data));
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();

    // 1. Subscribe to live visits from Supabase WebSocket channel
    const unsubVisits = subscribeToRealtimeTraffic((newVisit) => {
      setRawVisits(prev => {
        const filtered = prev.filter(v => v.id !== newVisit.id);
        const updated = [newVisit, ...filtered];
        setMetrics(computeYouTubeMetrics(updated));
        return updated;
      });
    });

    // 2. Subscribe to Wix-style Realtime Presence
    const unsubPresence = subscribeToVisitorPresence((visitors) => {
      setLivePresences(visitors);
    });

    const interval = setInterval(() => {
      setRawVisits(prev => {
        if (prev.length > 0) setMetrics(computeYouTubeMetrics(prev));
        return prev;
      });
    }, 4000);

    return () => {
      unsubVisits();
      unsubPresence();
      clearInterval(interval);
    };
  }, []);


  // Format distribution from orders
  const formatCounts: Record<string, number> = {};
  orders.forEach(o => {
    o.items?.forEach(i => {
      const f = i.format || 'Otro';
      formatCounts[f] = (formatCounts[f] || 0) + 1;
    });
  });
  const totalCassettes = Object.values(formatCounts).reduce((a, b) => a + b, 0);

  const maxMinuteCount = Math.max(1, ...(metrics?.minuteHistogram.map(m => m.count) || [1]));

  return (
    <div style={{ flex: 1, padding: '2rem', overflowY: 'auto', background: 'var(--mac-bg-base)' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #ea580c, #f97316)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px var(--mac-accent-glow)'
            }}>
              <BarChart3 size={20} color="#ffffff" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: 'var(--mac-text-primary)' }}>
                Telemetría & Tráfico en Tiempo Real
              </h2>
              <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.82rem', color: 'var(--mac-text-muted)' }}>
                Conexión continua a Supabase Cloud con registro 1:1 de visitas, sesiones activas y actividad en taller.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>

          <button
            onClick={loadData}
            disabled={isRefreshing}
            className="mac-btn-primary"
            style={{ fontSize: '0.8rem', padding: '0.45rem 0.95rem' }}
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            Actualizar Telemetría
          </button>
        </div>
      </div>

      {/* Main KPIs Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        
        {/* KPI 1: Active Visitors Right Now */}
        <div className="mac-card" style={{ padding: '1.4rem', borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--mac-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Usuarios Activos (Últ. 5 min)
            </span>
            <span className="mac-badge-emerald" style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }}></span>
              En Vivo
            </span>
          </div>
          <div style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--mac-text-primary)', letterSpacing: '-0.03em' }}>
            {metrics?.activeNow || 0}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#10b981', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
            <Activity size={13} /> {metrics?.viewsLast60Min || 0} visitas en los últimos 60 min
          </div>
        </div>

        {/* KPI 2: Total 24h Views */}
        <div className="mac-card" style={{ padding: '1.4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--mac-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Vistas en 24 Horas
            </span>
            <TrendingUp size={16} style={{ color: 'var(--mac-accent)' }} />
          </div>
          <div style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--mac-text-primary)', letterSpacing: '-0.03em' }}>
            {metrics?.viewsLast24Hours || 0}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--mac-text-secondary)', marginTop: '0.35rem' }}>
            {metrics?.viewsLast48Hours || 0} en las últimas 48 horas
          </div>
        </div>

        {/* KPI 3: Total Recorded Visits */}
        <div className="mac-card" style={{ padding: '1.4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--mac-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Base de Datos Supabase
            </span>
            <Globe size={16} style={{ color: '#3b82f6' }} />
          </div>
          <div style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--mac-text-primary)', letterSpacing: '-0.03em' }}>
            {metrics?.viewsTotal || rawVisits.length}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--mac-text-secondary)', marginTop: '0.35rem' }}>
            {metrics?.uniqueVisitorsTotal || 0} sesiones únicas detectadas
          </div>
        </div>

        {/* KPI 4: Orders in Lab */}
        <div className="mac-card" style={{ padding: '1.4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--mac-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Cintas en Proceso
            </span>
            <Film size={16} style={{ color: '#f59e0b' }} />
          </div>
          <div style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--mac-text-primary)', letterSpacing: '-0.03em' }}>
            {orders.filter(o => !o.isArchived && o.status === 'en_proceso').length}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--mac-text-secondary)', marginTop: '0.35rem' }}>
            {totalCassettes} cassettes totales registrados
          </div>
        </div>

      </div>

      {/* Wix-Style Live Visitor Activity Monitor */}
      <div className="mac-card" style={{ padding: '1.75rem', marginBottom: '2rem', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10b981'
            }}>
              <Radio size={20} className="animate-pulse" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--mac-text-primary)' }}>
                  Monitor de Actividad en Vivo (Estilo Wix Live View)
                </h3>
                <span className="mac-badge-emerald" style={{ fontSize: '0.72rem' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }}></span>
                  {livePresences.length > 0 ? `${livePresences.length} en línea ahora` : 'Escuchando en tiempo real'}
                </span>
              </div>
              <span style={{ fontSize: '0.78rem', color: 'var(--mac-text-muted)' }}>
                Supervisión directa de qué página y sección exacta está explorando cada visitante en tu sitio web.
              </span>
            </div>
          </div>

        </div>

        {/* Active Visitors Stream / Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
          {livePresences.length > 0 ? (
            livePresences.map((vis) => {
              const connectedMs = vis.connectedAt ? Date.now() - new Date(vis.connectedAt).getTime() : 0;
              const mins = Math.floor(connectedMs / 60000);
              const secs = Math.floor((connectedMs % 60000) / 1000);
              const durationStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

              // Source color badge
              let sourceColor = '#9ca3af';
              let sourceBg = 'rgba(156, 163, 175, 0.15)';
              const catLower = (vis.referrerCategory || '').toLowerCase();
              if (catLower.includes('google ads') || catLower.includes('patrocinad')) {
                sourceColor = '#f59e0b';
                sourceBg = 'rgba(245, 158, 11, 0.2)';
              } else if (catLower.includes('google')) {
                sourceColor = '#38bdf8';
                sourceBg = 'rgba(56, 189, 248, 0.2)';
              } else if (catLower.includes('meta') || catLower.includes('instagram') || catLower.includes('facebook')) {
                sourceColor = '#ec4899';
                sourceBg = 'rgba(236, 72, 153, 0.2)';
              } else if (catLower.includes('whatsapp')) {
                sourceColor = '#34d399';
                sourceBg = 'rgba(52, 211, 153, 0.2)';
              }

              return (
                <div 
                  key={vis.sessionId} 
                  style={{
                    padding: '1.15rem',
                    background: 'var(--mac-bg-surface)',
                    borderRadius: '12px',
                    border: '1px solid var(--mac-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--mac-text-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        {vis.device === 'Móvil' ? <Smartphone size={14} /> : <Monitor size={14} />}
                        {vis.visitorId || 'Visitante'}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--mac-text-muted)' }}>
                        • {vis.browser} ({vis.os})
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{
                        fontSize: '0.68rem',
                        padding: '0.15rem 0.45rem',
                        borderRadius: '999px',
                        background: 'rgba(255,255,255,0.06)',
                        color: 'var(--mac-text-secondary)',
                        fontWeight: 600
                      }}>
                        ⏱ {durationStr}
                      </span>
                      <span style={{
                        fontSize: '0.7rem',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '999px',
                        background: vis.isTabActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: vis.isTabActive ? '#34d399' : '#fbbf24',
                        fontWeight: 700
                      }}>
                        {vis.isTabActive ? '🟢 Activo' : '🟡 2° plano'}
                      </span>
                    </div>
                  </div>

                  {/* Location & Referrer Tag */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.78rem', color: 'var(--mac-text-primary)', fontWeight: 600 }}>
                      <MapPin size={13} style={{ color: 'var(--mac-accent)', flexShrink: 0 }} />
                      <span>{vis.city || 'México'} {vis.region && vis.region !== vis.city ? `(${vis.region})` : ''} • {vis.country || 'México 🇲🇽'}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '0.15rem 0.55rem',
                        borderRadius: '6px',
                        background: sourceBg,
                        color: sourceColor,
                        border: `1px solid ${sourceColor}40`
                      }}>
                        {vis.referrerCategory || 'Directo 🔗'}
                      </span>
                      {vis.isp && (
                        <span style={{ fontSize: '0.68rem', color: 'var(--mac-text-muted)' }}>
                          • {vis.isp}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Current Page, Section & Action */}
                  <div style={{
                    background: 'var(--mac-bg-base)',
                    padding: '0.75rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid var(--mac-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: 'var(--mac-text-muted)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Compass size={12} />
                        <span>Ruta: <strong>{vis.currentPath}</strong></span>
                      </div>
                      <span>Scroll: {vis.scrollDepth || 0}%</span>
                    </div>

                    {/* Scroll progress bar */}
                    <div style={{ width: '100%', height: '3px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: `${vis.scrollDepth || 0}%`, height: '100%', background: 'var(--mac-accent)', transition: 'width 0.3s ease' }}></div>
                    </div>

                    <div style={{ fontSize: '0.75rem', color: 'var(--mac-text-secondary)', fontWeight: 600 }}>
                      👁️ Sección: <strong>{vis.activeSection || 'Página principal'}</strong>
                    </div>

                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--mac-accent)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      ⚡ {vis.currentAction || 'Navegando activamente'}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{
              gridColumn: '1 / -1',
              padding: '2.5rem 1.5rem',
              textAlign: 'center',
              background: 'var(--mac-bg-surface)',
              borderRadius: '12px',
              border: '1px dashed var(--mac-border)',
              color: 'var(--mac-text-muted)'
            }}>
              <Radio size={28} style={{ margin: '0 auto 0.5rem auto', opacity: 0.4 }} />
              <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>
                Canal de Presencia en Vivo Activo
              </p>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.78rem' }}>
                Cuando los clientes naveguen por la página web, verás aquí su ubicación, la sección donde están y su actividad en tiempo real.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 60-Minute Real-Time Histogram (YouTube Studio Style) */}
      <div className="mac-card" style={{ padding: '1.75rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={18} style={{ color: 'var(--mac-accent)' }} />
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--mac-text-primary)' }}>
                Actividad por Minuto (Últimos 60 minutos)
              </h3>
              <span style={{ fontSize: '0.76rem', color: 'var(--mac-text-muted)' }}>
                {hoveredMinute ? `${hoveredMinute.label}: ${hoveredMinute.count} visualizaciones` : 'Pasa el cursor por cada barra para inspeccionar el volumen exacto'}
              </span>
            </div>
          </div>
          <span className="mac-badge-emerald" style={{ fontSize: '0.7rem' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></span>
            Métricas 100% en Vivo
          </span>
        </div>

        {/* 60 Bars Container */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: '3px',
          height: '110px',
          padding: '0.75rem 0',
          borderBottom: '1px solid var(--mac-border)',
          position: 'relative'
        }}>
          {metrics?.minuteHistogram.map((m, idx) => {
            const heightPercent = m.count > 0 ? Math.max(15, (m.count / maxMinuteCount) * 100) : 4;
            const isHovered = hoveredMinute?.label === m.label;
            return (
              <div
                key={idx}
                onMouseEnter={() => setHoveredMinute(m)}
                onMouseLeave={() => setHoveredMinute(null)}
                style={{
                  flex: 1,
                  height: `${heightPercent}%`,
                  background: m.isCurrent 
                    ? '#10b981' 
                    : isHovered 
                      ? 'var(--mac-accent)' 
                      : m.count > 0 
                        ? 'rgba(234, 88, 12, 0.75)' 
                        : 'rgba(255, 255, 255, 0.08)',
                  borderRadius: '3px 3px 0 0',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  position: 'relative'
                }}
                title={`${m.label}: ${m.count} visitas`}
              />
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.72rem', color: 'var(--mac-text-muted)' }}>
          <span>Hace 60 minutos</span>
          <span>Hace 30 minutos</span>
          <span style={{ color: '#10b981', fontWeight: 800 }}>Minuto Actual (Ahora)</span>
        </div>
      </div>

      {/* 2-COLUMN SECTION: LIVE STREAM FEED & FORMAT / SOURCES BREAKDOWN */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.75rem', marginBottom: '2rem' }}>
        
        {/* Real-Time Live Traffic Stream */}
        <div className="mac-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={18} style={{ color: '#10b981' }} />
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--mac-text-primary)' }}>
                Feed de Visitas Recientes ({metrics?.recentVisits?.length || 0})
              </h3>
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--mac-text-muted)' }}>
              Actualización continua
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '380px', overflowY: 'auto' }}>
            {metrics?.recentVisits && metrics.recentVisits.length > 0 ? (
              metrics.recentVisits.map(visit => {
                const timeStr = new Date(visit.timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                return (
                  <div 
                    key={visit.id}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '10px',
                      background: 'var(--mac-bg-surface)',
                      border: '1px solid var(--mac-border)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.3rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--mac-text-primary)' }}>
                        {visit.pageTitle || visit.path}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--mac-text-muted)', fontFamily: 'monospace' }}>
                        {timeStr}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', flexWrap: 'wrap', fontSize: '0.72rem', color: 'var(--mac-text-secondary)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        {visit.device === 'Móvil' ? <Smartphone size={12} /> : <Monitor size={12} />}
                        {visit.device} ({visit.browser})
                      </span>
                      {visit.city && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <MapPin size={12} /> {visit.city}
                        </span>
                      )}
                      <span style={{
                        padding: '0.1rem 0.4rem',
                        borderRadius: '4px',
                        background: 'rgba(234, 88, 12, 0.12)',
                        color: 'var(--mac-accent)',
                        fontWeight: 700
                      }}>
                        {visit.referrerCategory}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--mac-text-muted)', fontSize: '0.85rem' }}>
                Sin registros en el búfer. Haz clic en "Probar Evento en Vivo" para emitir telemetría.
              </div>
            )}
          </div>
        </div>

        {/* Distribution by Tape Format in Laboratory */}
        <div className="mac-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <Layers size={18} style={{ color: 'var(--mac-accent)' }} />
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--mac-text-primary)' }}>
              Cintas Físicas en Laboratorio por Formato
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
            {Object.entries(formatCounts).map(([format, count]) => {
              const percent = totalCassettes > 0 ? Math.round((count / totalCassettes) * 100) : 0;
              return (
                <div key={format} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700 }}>
                    <span style={{ color: 'var(--mac-text-primary)' }}>📼 Formato {format}</span>
                    <span style={{ color: 'var(--mac-accent)' }}>{count} ({percent}%)</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'var(--mac-bg-surface)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{ width: `${percent}%`, height: '100%', background: 'linear-gradient(90deg, #ea580c, #f97316)', borderRadius: '999px', transition: 'width 0.4s ease' }}></div>
                  </div>
                </div>
              );
            })}

            {Object.keys(formatCounts).length === 0 && (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--mac-text-muted)', fontSize: '0.85rem' }}>
                No hay cintas activas registradas en las órdenes.
              </div>
            )}

            {/* Traffic Source Breakdown */}
            {metrics?.sources && metrics.sources.length > 0 && (
              <div style={{ marginTop: 'auto', paddingTop: '1.25rem', borderTop: '1px solid var(--mac-border)' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--mac-text-muted)', display: 'block', marginBottom: '0.65rem' }}>
                  Canales de Adquisición de Tráfico Web
                </span>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {metrics.sources.map(s => (
                    <span 
                      key={s.category}
                      style={{
                        fontSize: '0.72rem',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '6px',
                        background: 'var(--mac-bg-surface)',
                        border: '1px solid var(--mac-border)',
                        color: 'var(--mac-text-secondary)',
                        fontWeight: 600
                      }}
                    >
                      {s.category}: <strong style={{ color: 'var(--mac-text-primary)' }}>{s.count}</strong> ({s.percentage}%)
                    </span>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>

      </div>

    </div>
  );
};

export default DesktopAnalyticsHUD;
