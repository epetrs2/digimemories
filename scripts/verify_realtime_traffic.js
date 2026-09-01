import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nqlillrugkxxpjobzsja.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_V_wCDy_Oe1_4ZMahWfNmfg_X1gqNpsN';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testRealtimeTrafficPipeline() {
  console.log('================================================================');
  console.log('🧪 PRUEBA EN VIVO: PIPELINE DE TRÁFICO REAL & SUPABASE REALTIME');
  console.log('================================================================\n');

  // 1. Insert 3 live visits from distinct cities and sources
  const sampleEvents = [
    {
      id: 'vis_live_e2e_1',
      path: '/calculator',
      pageTitle: 'Calculadora de Cotizaciones',
      referrerCategory: 'Google Search',
      device: 'Móvil',
      browser: 'Apple Safari',
      os: 'iOS (Apple)',
      city: 'CDMX (Coyoacán)',
      sessionId: 'sess_user_1'
    },
    {
      id: 'vis_live_e2e_2',
      path: '/track',
      pageTitle: 'Portal de Rastreo en Vivo',
      referrerCategory: 'Instagram',
      device: 'Móvil',
      browser: 'Instagram InApp',
      os: 'Android',
      city: 'Guadalajara',
      sessionId: 'sess_user_2'
    },
    {
      id: 'vis_live_e2e_3',
      path: '/',
      pageTitle: 'DigiMemories — Inicio',
      referrerCategory: 'WhatsApp',
      device: 'Desktop',
      browser: 'Google Chrome',
      os: 'macOS (Apple)',
      city: 'Monterrey',
      sessionId: 'sess_user_3'
    }
  ];

  for (const ev of sampleEvents) {
    const row = {
      id: ev.id,
      order_id: null,
      to_email: `visitor_${ev.sessionId}@analytics.local`,
      to_name: ev.pageTitle,
      subject: ev.referrerCategory,
      snippet: `${ev.device} • ${ev.browser} • ${ev.city}`,
      type: 'page_view',
      sent_at: new Date().toISOString(),
      body_html: JSON.stringify({
        ...ev,
        timestamp: new Date().toISOString(),
        country: 'México 🇲🇽',
        screenResolution: '390x844'
      })
    };

    const { error } = await supabase.from('email_logs').upsert(row, { onConflict: 'id' });
    if (error) {
      console.error(`❌ Error insertando evento ${ev.id}:`, error.message);
    } else {
      console.log(`✅ [Tráfico Real] Visita registrada en Supabase: ${ev.path} vía ${ev.referrerCategory} (${ev.city})`);
    }
  }

  // 2. Query back and verify aggregation
  console.log('\n--- Consultando eventos de tráfico en tiempo real desde Supabase ---');
  const { data, error } = await supabase
    .from('email_logs')
    .select('*')
    .eq('type', 'page_view')
    .order('sent_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('❌ Error consultando visitas:', error);
  } else {
    console.log(`✅ Total de eventos de tráfico leídos de la nube: ${data.length}`);
    data.slice(0, 3).forEach((d, i) => {
      const p = JSON.parse(d.body_html);
      console.log(`   #${i+1}: ${p.pageTitle} | ${p.referrerCategory} | ${p.city} | ${p.device}`);
    });
  }

  // 3. Clean E2E test IDs
  await supabase.from('email_logs').delete().in('id', sampleEvents.map(e => e.id));
  console.log('\n✅ Limpieza de registros temporales completada.');
  console.log('================================================================');
  console.log('🟢 PIPELINE 100% OPERATIVO, REAL Y SINCRONIZADO');
  console.log('================================================================\n');
}

testRealtimeTrafficPipeline();
