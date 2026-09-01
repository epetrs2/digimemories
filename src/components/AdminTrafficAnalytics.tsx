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
  Smartphone,
  CheckCircle2
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
      <div style={{ padding: '3rem', textAlign: 'center', color: '#78716c', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
        <RefreshCw size={24} className="animate-spin text-accent" />
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      
      {/* Top YouTube Creator Studio Header Bar */}
      <div style={{
        background: 'linear-gradient(135deg, #1c1917 0%, #292524 100%)',
        color: '#ffffff',
        padding: '1.75rem',
        borderRadius: '20px',
        border: '1px solid #44403c',
        boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#3b82f6', display: 'inline-block', boxShadow: '0 0 10px #3b82f6' }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#93c5fd' }}>
              YouTube Analytics Engine • Tiempo Real
            </span>
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 900, margin: '0.4rem 0 0 0', color: '#ffffff', letterSpacing: '-0.02em' }}>
            Rendimiento del Canal & Tráfico en Vivo
          </h2>
          <p style={{ fontSize: '0.8rem', color: '#a8a29e', margin: '0.25rem 0 0 0' }}>
            Métricas de audiencia sincronizadas con WebSockets de Supabase PostgreSQL
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleSimulateLiveVisit}
            style={{
              padding: '0.65rem 1.15rem',
              fontSize: '0.8rem',
              fontWeight: 800,
              borderRadius: '12px',
              border: 'none',
              background: justSimulated ? '#16a34a' : 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
              color: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 4px 12px rgba(234, 88, 12, 0.3)',
              transition: 'all 0.2s ease'
            }}
          >
            <Zap size={15} />
            {justSimulated ? '✓ ¡Visita Registrada en Vivo!' : '⚡ Simular Visita en Vivo'}
          </button>

          <button
            onClick={loadTrafficData}
            disabled={isRefreshing}
            style={{
              padding: '0.65rem',
              borderRadius: '12px',
              border: '1px solid #57534e',
              background: '#292524',
              color: '#e7e5e4',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Actualizar datos"
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* YOUTUBE STUDIO REAL-TIME HIGHLIGHT CARDS (60 Min & 24 Hours) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        
        {/* CARD 1: ÚLTIMOS 60 MINUTOS */}
        <div className="glass" style={{ padding: '1.75rem', background: '#ffffff', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#57534e' }}>
                  Tiempo Real: Últimos 60 minutos
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.4rem' }}>
                <span style={{ fontSize: '2.5rem', fontWeight: 900, color: '#1c1917', lineHeight: 1 }}>
                  {metrics.viewsLast60Min}
                </span>
                <span style={{ fontSize: '0.8rem', color: '#78716c', fontWeight: 600 }}>vistas en la última hora</span>
              </div>
            </div>

            {/* Active Visitors Badge */}
            <div style={{
              padding: '0.4rem 0.85rem',
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#065f46' }}>
                {metrics.activeNow} {metrics.activeNow === 1 ? 'activo ahora' : 'activos ahora'}
              </span>
            </div>
          </div>

          {/* Interactive 60-Minute Bar Chart */}
          <div style={{ background: '#faf8f5', padding: '0.85rem', borderRadius: '14px', border: '1px solid #e7e2d9' }}>
            <div style={{ height: '110px', display: 'flex', alignItems: 'flex-end', gap: '2px', position: 'relative' }}>
              {metrics.minuteHistogram.map((m, idx) => {
                const heightPct = m.count > 0 ? Math.max((m.count / maxMinCount) * 100, 15) : 6;
                const isCurrent = m.isCurrent;

                return (
                  <div
                    key={idx}
                    onMouseEnter={() => setHoveredMinute({ label: m.label, count: m.count })}
                    onMouseLeave={() => setHoveredMinute(null)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'flex-end',
                      alignItems: 'center',
                      height: '100%',
                      cursor: 'pointer'
                    }}
                  >
                    <div
                      style={{
                        width: '100%',
                        height: `${heightPct}%`,
                        borderRadius: '2px 2px 0 0',
                        background: m.count > 0 
                          ? (isCurrent ? '#ea580c' : '#2563eb')
                          : '#e7e5e4',
                        transition: 'all 0.2s ease'
                      }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Tooltip & Time Range Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#a8a29e', marginTop: '0.5rem', fontFamily: 'monospace' }}>
              <span>-60 min</span>
              <span style={{ fontWeight: 800, color: hoveredMinute ? '#ea580c' : '#78716c', fontSize: '0.8rem' }}>
                {hoveredMinute ? `${hoveredMinute.label}: ${hoveredMinute.count} vista(s)` : 'Pasa el cursor sobre las barras'}
              </span>
              <span style={{ fontWeight: 800, color: '#ea580c' }}>Ahora (0m)</span>
            </div>
          </div>
        </div>

        {/* CARD 2: ÚLTIMAS 24 HORAS */}
        <div className="glass" style={{ padding: '1.75rem', background: '#ffffff', borderRadius: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#57534e' }}>
                  Vistas en las Últimas 24 Horas
                </span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.4rem' }}>
                  <span style={{ fontSize: '2.5rem', fontWeight: 900, color: '#1c1917', lineHeight: 1 }}>
                    {metrics.viewsLast24Hours}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#78716c', fontWeight: 600 }}>vistas hoy</span>
                </div>
              </div>

              <div style={{ padding: '0.6rem', background: '#eff6ff', borderRadius: '12px', color: '#2563eb' }}>
                <Activity size={22} />
              </div>
            </div>

            {/* Interactive 24-Hour Bar Chart */}
            <div style={{ background: '#faf8f5', padding: '0.85rem', borderRadius: '14px', border: '1px solid #e7e2d9', marginTop: '1rem' }}>
              <div style={{ height: '110px', display: 'flex', alignItems: 'flex-end', gap: '4px' }}>
                {metrics.hourHistogram.map((h, idx) => {
                  const heightPct = h.count > 0 ? Math.max((h.count / maxHourCount) * 100, 15) : 8;
                  return (
                    <div
                      key={idx}
                      onMouseEnter={() => setHoveredHour({ label: h.label, count: h.count })}
                      onMouseLeave={() => setHoveredHour(null)}
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-end',
                        alignItems: 'center',
                        height: '100%',
                        cursor: 'pointer'
                      }}
                    >
                      <div
                        style={{
                          width: '100%',
                          height: `${heightPct}%`,
                          borderRadius: '3px 3px 0 0',
                          background: h.count > 0 
                            ? (h.isCurrent ? '#ea580c' : '#4f46e5')
                            : '#e7e5e4',
                          transition: 'all 0.2s ease'
                        }}
                      />
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#a8a29e', marginTop: '0.5rem', fontFamily: 'monospace' }}>
                <span>-24 hrs</span>
                <span style={{ fontWeight: 800, color: hoveredHour ? '#4f46e5' : '#78716c', fontSize: '0.8rem' }}>
                  {hoveredHour ? `${hoveredHour.label}: ${hoveredHour.count} vista(s)` : ''}
                </span>
                <span>Hora actual</span>
              </div>
            </div>
          </div>

          <div style={{ paddingTop: '0.75rem', borderTop: '1px solid #f0ede6', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#78716c' }}>
            <span>Total Histórico Acumulado:</span>
            <strong style={{ color: '#1c1917', fontWeight: 800 }}>{metrics.viewsTotal} vistas</strong>
          </div>
        </div>

      </div>

      {/* TABS SELECTOR */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #e7e2d9', paddingBottom: '0.5rem', overflowX: 'auto' }}>
        <button
          onClick={() => setActiveRange('realtime')}
          style={{
            padding: '0.5rem 1rem',
            fontSize: '0.8rem',
            fontWeight: 800,
            borderRadius: '10px',
            border: 'none',
            background: activeRange === 'realtime' ? '#1c1917' : '#f5f5f4',
            color: activeRange === 'realtime' ? '#ffffff' : '#78716c',
            cursor: 'pointer'
          }}
        >
          ⏱️ Tiempo Real (60 Min)
        </button>

        <button
          onClick={() => setActiveRange('24h')}
          style={{
            padding: '0.5rem 1rem',
            fontSize: '0.8rem',
            fontWeight: 800,
            borderRadius: '10px',
            border: 'none',
            background: activeRange === '24h' ? '#1c1917' : '#f5f5f4',
            color: activeRange === '24h' ? '#ffffff' : '#78716c',
            cursor: 'pointer'
          }}
        >
          📅 Últimas 24 Horas
        </button>

        <button
          onClick={() => setActiveRange('7d')}
          style={{
            padding: '0.5rem 1rem',
            fontSize: '0.8rem',
            fontWeight: 800,
            borderRadius: '10px',
            border: 'none',
            background: activeRange === '7d' ? '#1c1917' : '#f5f5f4',
            color: activeRange === '7d' ? '#ffffff' : '#78716c',
            cursor: 'pointer'
          }}
        >
          📈 Últimos 7 Días
        </button>

        <button
          onClick={() => setActiveRange('all')}
          style={{
            padding: '0.5rem 1rem',
            fontSize: '0.8rem',
            fontWeight: 800,
            borderRadius: '10px',
            border: 'none',
            background: activeRange === 'all' ? '#1c1917' : '#f5f5f4',
            color: activeRange === 'all' ? '#ffffff' : '#78716c',
            cursor: 'pointer'
          }}
        >
          🌐 Historial Completo
        </button>
      </div>

      {/* GRID OF MODULES */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.75rem' }}>
        
        {/* MODULE 1: TOP PÁGINAS */}
        <div className="glass" style={{ padding: '1.75rem', background: '#ffffff', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Layers size={18} className="text-accent" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>
                Páginas Más Vistas (Contenido Principal)
              </h3>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#78716c', margin: '0.2rem 0 0 0' }}>
              Distribución de visitas por sección
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {metrics.topPages.map((page, index) => (
              <div 
                key={page.path}
                style={{
                  background: '#faf8f5',
                  padding: '0.85rem 1rem',
                  borderRadius: '12px',
                  border: '1px solid #e7e2d9',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span style={{ width: '22px', height: '22px', borderRadius: '6px', background: '#ffedd5', color: '#c2410c', fontWeight: 900, fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      #{index + 1}
                    </span>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1c1917' }}>{page.title}</div>
                      <div style={{ fontSize: '0.75rem', color: '#a8a29e', fontFamily: 'monospace' }}>{page.path}</div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 900, color: '#1c1917' }}>{page.views}</span>
                    <span style={{ fontSize: '0.75rem', color: '#78716c', marginLeft: '4px' }}>({page.percentage}%)</span>
                  </div>
                </div>

                <div style={{ width: '100%', height: '5px', background: '#e7e5e4', borderRadius: '999px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.max(page.percentage, 5)}%`, height: '100%', background: '#ea580c', borderRadius: '999px' }} />
                </div>
              </div>
            ))}
          </div>

          {/* EMBUDO DE CONVERSIÓN */}
          <div style={{ paddingTop: '1rem', borderTop: '1px solid #f0ede6' }}>
            <h4 style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: '#78716c', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <TrendingUp size={14} color="#16a34a" /> Embudo de Conversión en Vivo
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.5rem' }}>
              <div style={{ background: '#faf8f5', padding: '0.75rem', borderRadius: '10px', border: '1px solid #e7e2d9', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: '#78716c', fontWeight: 700 }}>1. Visitas</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1c1917' }}>{totalViews}</div>
              </div>

              <div style={{ background: '#faf8f5', padding: '0.75rem', borderRadius: '10px', border: '1px solid #e7e2d9', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: '#2563eb', fontWeight: 700 }}>2. Calculadora</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#2563eb' }}>{calculatorViews}</div>
              </div>

              <div style={{ background: '#faf8f5', padding: '0.75rem', borderRadius: '10px', border: '1px solid #e7e2d9', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: '#ea580c', fontWeight: 700 }}>3. Cotizaciones</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#ea580c' }}>{quotesGenerated}</div>
                <div style={{ fontSize: '0.65rem', color: '#c2410c', fontWeight: 700 }}>{conversionRate}% conv.</div>
              </div>

              <div style={{ background: '#ecfdf5', padding: '0.75rem', borderRadius: '10px', border: '1px solid #a7f3d0', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: '#065f46', fontWeight: 700 }}>4. En Proceso</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#16a34a' }}>{totalOrdersCount}</div>
                <div style={{ fontSize: '0.65rem', color: '#15803d', fontWeight: 700 }}>PIN Activo</div>
              </div>
            </div>
          </div>
        </div>

        {/* MODULE 2: FUENTES & DISPOSITIVOS */}
        <div className="glass" style={{ padding: '1.75rem', background: '#ffffff', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Compass size={18} className="text-accent" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>
                Fuentes de Tráfico (Adquisición)
              </h3>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#78716c', margin: '0.2rem 0 0 0' }}>
              Canales por donde llegan los clientes
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {metrics.sources.map((src) => (
              <div key={src.category} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#292524' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: src.color }} />
                    {src.category}
                  </span>
                  <span style={{ color: '#78716c' }}>
                    <strong>{src.count}</strong> ({src.percentage}%)
                  </span>
                </div>
                <div style={{ width: '100%', height: '6px', background: '#f5f5f4', borderRadius: '999px', overflow: 'hidden' }}>
                  <div style={{ width: `${src.percentage}%`, height: '100%', background: src.color, borderRadius: '999px' }} />
                </div>
              </div>
            ))}
          </div>

          {/* AUDIENCIA & CIUDADES */}
          <div style={{ paddingTop: '1rem', borderTop: '1px solid #f0ede6', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <h4 style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: '#78716c', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <MapPin size={14} color="#ea580c" /> Principales Ciudades
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {metrics.cities.map((c) => (
                <div key={c.city} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, color: '#44403c' }}>
                  <span>{c.city}</span>
                  <span style={{ color: '#78716c' }}>{c.percentage}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* DISPOSITIVOS */}
          <div style={{ paddingTop: '0.75rem', borderTop: '1px solid #f0ede6', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <h4 style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: '#78716c', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Smartphone size={14} color="#2563eb" /> Dispositivos
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '0.5rem', textAlign: 'center' }}>
              {metrics.devices.map(d => (
                <div key={d.device} style={{ background: '#faf8f5', padding: '0.6rem', borderRadius: '10px', border: '1px solid #e7e2d9' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1c1917' }}>{d.device}</div>
                  <div style={{ fontSize: '1rem', fontWeight: 900, color: '#ea580c', marginTop: '2px' }}>{d.percentage}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* FEED EN TIEMPO REAL */}
      <div className="glass" style={{ padding: '1.75rem', background: '#ffffff', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={18} className="text-accent" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>
              Registro de Visitas en Vivo (Streaming en Tiempo Real)
            </h3>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#78716c', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={13} color="#16a34a" /> Conectado a Supabase WebSockets
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e7e2d9', color: '#a8a29e', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.5px' }}>
                <th style={{ padding: '0.6rem 0.5rem' }}>Hora</th>
                <th style={{ padding: '0.6rem 0.5rem' }}>Página Visitada</th>
                <th style={{ padding: '0.6rem 0.5rem' }}>Canal de Origen</th>
                <th style={{ padding: '0.6rem 0.5rem' }}>Dispositivo</th>
                <th style={{ padding: '0.6rem 0.5rem' }}>Ubicación</th>
              </tr>
            </thead>
            <tbody>
              {metrics.recentVisits.slice(0, 15).map((v) => (
                <tr key={v.id} style={{ borderBottom: '1px solid #f5f5f4' }}>
                  <td style={{ padding: '0.75rem 0.5rem', color: '#78716c', whiteSpace: 'nowrap' }}>
                    {new Date(v.timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>
                    <span style={{ fontWeight: 700, color: '#1c1917' }}>{v.pageTitle}</span>
                    <span style={{ display: 'block', fontSize: '0.7rem', color: '#a8a29e', fontFamily: 'monospace' }}>{v.path}</span>
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>
                    <span style={{ padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, background: '#eff6ff', color: '#1d4ed8' }}>
                      {v.referrerCategory}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem', color: '#57534e', whiteSpace: 'nowrap' }}>
                    {v.device} • {v.browser}
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem', color: '#78716c', whiteSpace: 'nowrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <MapPin size={12} color="#ea580c" /> {v.city || 'México'}
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
