import React, { useState, useEffect } from 'react';
import { 
  getBusinessSettings, 
  saveBusinessSettings, 
  fetchCloudBusinessSettings,
  type BusinessSettings 
} from '../lib/businessSettings';
import { testMercadoPagoConnection } from '../lib/mercadoPagoService';
import { testGeminiConnection } from '../lib/geminiService';
import { 
  Truck,
  CreditCard, 
  DollarSign, 
  Phone, 
  Mail, 
  Clock, 
  Save, 
  CheckCircle2, 
  Megaphone, 
  RefreshCw,
  ShieldCheck,
  AlertCircle,
  Zap,
  Sparkles,
  Eye,
  EyeOff,
  Bot
} from 'lucide-react';

export const AdminBusinessSettings: React.FC = () => {
  const [settings, setSettings] = useState<BusinessSettings>(() => getBusinessSettings());
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeSection, setActiveSection] = useState<'location' | 'bank' | 'pricing' | 'contact' | 'banner' | 'gemini'>('location');
  const [mpTestStatus, setMpTestStatus] = useState<{ loading: boolean; message?: string; success?: boolean } | null>(null);
  const [geminiTestStatus, setGeminiTestStatus] = useState<{ loading: boolean; message?: string; success?: boolean } | null>(null);
  const [showGeminiKey, setShowGeminiKey] = useState(false);

  useEffect(() => {
    fetchCloudBusinessSettings().then(cloud => {
      if (cloud) setSettings(cloud);
    });
  }, []);

  const handleChange = (field: keyof BusinessSettings, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await saveBusinessSettings(settings);
    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      
      {/* Top Banner Header */}
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
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ea580c', display: 'inline-block', boxShadow: '0 0 10px #ea580c' }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#fed7aa' }}>
              Configuración Global del Negocio
            </span>
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 900, margin: '0.4rem 0 0 0', color: '#ffffff', letterSpacing: '-0.02em' }}>
            Datos de la Empresa, Taller & Tarifas
          </h2>
          <p style={{ fontSize: '0.8rem', color: '#a8a29e', margin: '0.25rem 0 0 0' }}>
            Los cambios se reflejan automáticamente en la web pública, correos, cotizaciones y portal de clientes.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {saveSuccess && (
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#86efac', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle2 size={16} /> ¡Sincronizado con Éxito!
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            style={{
              padding: '0.75rem 1.5rem',
              fontSize: '0.85rem',
              fontWeight: 800,
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
              color: '#ffffff',
              cursor: isSaving ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 14px rgba(234, 88, 12, 0.4)',
              transition: 'all 0.2s ease'
            }}
          >
            {isSaving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
            {isSaving ? 'Guardando...' : 'Guardar Cambios Globales'}
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #e7e2d9', paddingBottom: '0.5rem', overflowX: 'auto' }}>
        <button
          type="button"
          onClick={() => setActiveSection('location')}
          style={{
            padding: '0.6rem 1.1rem',
            fontSize: '0.85rem',
            fontWeight: 800,
            borderRadius: '12px',
            border: 'none',
            background: activeSection === 'location' ? '#1c1917' : '#f5f5f4',
            color: activeSection === 'location' ? '#ffffff' : '#78716c',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <Truck size={16} /> Identidad & Logística
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('bank')}
          style={{
            padding: '0.6rem 1.1rem',
            fontSize: '0.85rem',
            fontWeight: 800,
            borderRadius: '12px',
            border: 'none',
            background: activeSection === 'bank' ? '#1c1917' : '#f5f5f4',
            color: activeSection === 'bank' ? '#ffffff' : '#78716c',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <CreditCard size={16} /> Métodos de Pago & Facturación
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('pricing')}
          style={{
            padding: '0.6rem 1.1rem',
            fontSize: '0.85rem',
            fontWeight: 800,
            borderRadius: '12px',
            border: 'none',
            background: activeSection === 'pricing' ? '#1c1917' : '#f5f5f4',
            color: activeSection === 'pricing' ? '#ffffff' : '#78716c',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <DollarSign size={16} /> Tarifas & Precios Base
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('contact')}
          style={{
            padding: '0.6rem 1.1rem',
            fontSize: '0.85rem',
            fontWeight: 800,
            borderRadius: '12px',
            border: 'none',
            background: activeSection === 'contact' ? '#1c1917' : '#f5f5f4',
            color: activeSection === 'contact' ? '#ffffff' : '#78716c',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <Phone size={16} /> Contacto & Redes
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('banner')}
          style={{
            padding: '0.6rem 1.1rem',
            fontSize: '0.85rem',
            fontWeight: 800,
            borderRadius: '12px',
            border: 'none',
            background: activeSection === 'banner' ? '#1c1917' : '#f5f5f4',
            color: activeSection === 'banner' ? '#ffffff' : '#78716c',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <Megaphone size={16} /> Aviso de Cabecera
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('gemini')}
          style={{
            padding: '0.6rem 1.1rem',
            fontSize: '0.85rem',
            fontWeight: 800,
            borderRadius: '12px',
            border: 'none',
            background: activeSection === 'gemini' ? 'linear-gradient(135deg, #4338ca 0%, #312e81 100%)' : '#f5f5f4',
            color: activeSection === 'gemini' ? '#ffffff' : '#78716c',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            boxShadow: activeSection === 'gemini' ? '0 4px 12px rgba(67, 56, 202, 0.3)' : 'none'
          }}
        >
          <Sparkles size={16} color={activeSection === 'gemini' ? '#a5b4fc' : '#818cf8'} /> Asistente IA (Gemini Flash)
        </button>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* SECTION 1: IDENTIDAD Y LOGÍSTICA */}
        {activeSection === 'location' && (
          <div className="glass animate-on-load" style={{ padding: '2rem', background: '#ffffff', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Truck size={20} className="text-accent" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                  Identidad y Logística de Operación
                </h3>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#78716c', margin: '0.25rem 0 0 0' }}>
                Configuración general de la marca, logística de recepción/envíos y horarios de atención al cliente.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#44403c', marginBottom: '0.35rem' }}>
                  Nombre Comercial del Negocio
                </label>
                <input
                  type="text"
                  value={settings.businessName}
                  onChange={e => handleChange('businessName', e.target.value)}
                  className="input-field"
                  style={{ width: '100%', padding: '0.75rem 1rem', fontSize: '0.9rem', borderRadius: '10px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#44403c', marginBottom: '0.35rem' }}>
                  Eslogan / Descripción Breve
                </label>
                <input
                  type="text"
                  value={settings.brandTagline}
                  onChange={e => handleChange('brandTagline', e.target.value)}
                  placeholder="Laboratorio Especializado en Preservación y Digitalización..."
                  className="input-field"
                  style={{ width: '100%', padding: '0.75rem 1rem', fontSize: '0.9rem', borderRadius: '10px' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 700, color: '#44403c', marginBottom: '0.35rem' }}>
                <Truck size={14} className="text-accent" /> Modalidad de Recepción de Material
              </label>
              <input
                type="text"
                value={settings.tallerAddress}
                onChange={e => handleChange('tallerAddress', e.target.value)}
                placeholder="Recepción por Uber Flash (CDMX) y Paquetería Nacional (DHL / FedEx / Estafeta)"
                className="input-field"
                style={{ width: '100%', padding: '0.75rem 1rem', fontSize: '0.9rem', borderRadius: '10px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#44403c', marginBottom: '0.35rem' }}>
                Instrucciones / Logística para el Cliente
              </label>
              <input
                type="text"
                value={settings.tallerReferences}
                onChange={e => handleChange('tallerReferences', e.target.value)}
                placeholder="Dirección exacta coordinada por WhatsApp para el chofer de Uber Flash o guía de paquetería"
                className="input-field"
                style={{ width: '100%', padding: '0.75rem 1rem', fontSize: '0.9rem', borderRadius: '10px' }}
              />
            </div>

            {/* Horarios */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', paddingTop: '0.5rem', borderTop: '1px solid #f0ede6' }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 700, color: '#44403c', marginBottom: '0.35rem' }}>
                  <Clock size={14} className="text-accent" /> Horario de Atención (Lunes a Viernes)
                </label>
                <input
                  type="text"
                  value={settings.businessHoursWeekdays}
                  onChange={e => handleChange('businessHoursWeekdays', e.target.value)}
                  placeholder="Lunes a Viernes: 9:00 AM – 7:00 PM"
                  className="input-field"
                  style={{ width: '100%', padding: '0.75rem 1rem', fontSize: '0.9rem', borderRadius: '10px' }}
                />
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 700, color: '#44403c', marginBottom: '0.35rem' }}>
                  <Clock size={14} className="text-accent" /> Horario de Atención (Fines de Semana)
                </label>
                <input
                  type="text"
                  value={settings.businessHoursWeekend}
                  onChange={e => handleChange('businessHoursWeekend', e.target.value)}
                  placeholder="Sábados: 10:00 AM – 3:00 PM"
                  className="input-field"
                  style={{ width: '100%', padding: '0.75rem 1rem', fontSize: '0.9rem', borderRadius: '10px' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: DATOS BANCARIOS & PASARELA */}
        {activeSection === 'bank' && (
          <>
            <div className="glass animate-on-load" style={{ padding: '2rem', background: '#ffffff', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CreditCard size={20} className="text-accent" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                  Cuentas Bancarias para Anticipos (50%) & Transferencias
                </h3>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#78716c', margin: '0.25rem 0 0 0' }}>
                Estos datos se adjuntan en los correos de confirmación y en la calculadora para que el cliente deposite su anticipo.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#44403c', marginBottom: '0.35rem' }}>
                  Institución Bancaria (Banco)
                </label>
                <input
                  type="text"
                  value={settings.bankName}
                  onChange={e => handleChange('bankName', e.target.value)}
                  placeholder="BBVA México / Santander"
                  className="input-field"
                  style={{ width: '100%', padding: '0.75rem 1rem', fontSize: '0.9rem', borderRadius: '10px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#44403c', marginBottom: '0.35rem' }}>
                  Nombre del Titular / Beneficiario
                </label>
                <input
                  type="text"
                  value={settings.bankAccountHolder}
                  onChange={e => handleChange('bankAccountHolder', e.target.value)}
                  placeholder="DigiMemories Laboratorio Digital"
                  className="input-field"
                  style={{ width: '100%', padding: '0.75rem 1rem', fontSize: '0.9rem', borderRadius: '10px' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#44403c', marginBottom: '0.35rem' }}>
                  CLABE Interbancaria (18 dígitos)
                </label>
                <input
                  type="text"
                  maxLength={18}
                  value={settings.bankClabe}
                  onChange={e => handleChange('bankClabe', e.target.value)}
                  placeholder="012180015492837190"
                  className="input-field"
                  style={{ width: '100%', padding: '0.75rem 1rem', fontSize: '1rem', fontFamily: 'monospace', fontWeight: 800, letterSpacing: '1.5px', borderRadius: '10px', color: '#15803d' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#44403c', marginBottom: '0.35rem' }}>
                  Número de Cuenta / Tarjeta
                </label>
                <input
                  type="text"
                  value={settings.bankAccountNumber}
                  onChange={e => handleChange('bankAccountNumber', e.target.value)}
                  placeholder="1549283719"
                  className="input-field"
                  style={{ width: '100%', padding: '0.75rem 1rem', fontSize: '0.9rem', fontFamily: 'monospace', borderRadius: '10px' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#44403c', marginBottom: '0.35rem' }}>
                Instrucciones de Pago para el Cliente
              </label>
              <textarea
                rows={3}
                value={settings.bankPaymentInstructions}
                onChange={e => handleChange('bankPaymentInstructions', e.target.value)}
                placeholder="Indica qué concepto de pago debe colocar el cliente..."
                className="input-field"
                style={{ width: '100%', padding: '0.75rem 1rem', fontSize: '0.85rem', borderRadius: '10px', resize: 'none' }}
              />
            </div>
          </div>

          {/* TARJETA 2 DENTRO DEL MISMO TAB: MERCADO PAGO MÉXICO */}
          <div className="glass animate-on-load" style={{ padding: '2rem', background: '#ffffff', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1.25rem', border: '1px solid #e0f2fe' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ background: '#e0f2fe', color: '#0284c7', padding: '0.5rem', borderRadius: '10px' }}>
                    <Zap size={22} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#0c4a6e' }}>
                      Conexión y Cobros con Mercado Pago México
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: '#78716c', margin: '0.2rem 0 0 0' }}>
                      Permite a tus clientes pagar el anticipo del 50% con Tarjeta de Crédito, Débito, SPEI y en OXXO.
                    </p>
                  </div>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', background: settings.mercadopagoEnabled ? '#f0fdf4' : '#f5f5f4', padding: '0.4rem 0.8rem', borderRadius: '10px', border: settings.mercadopagoEnabled ? '1px solid #bbf7d0' : '1px solid #e7e5e4' }}>
                  <input
                    type="checkbox"
                    checked={settings.mercadopagoEnabled}
                    onChange={e => handleChange('mercadopagoEnabled', e.target.checked)}
                    style={{ accentColor: '#16a34a', width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: settings.mercadopagoEnabled ? '#15803d' : '#78716c' }}>
                    {settings.mercadopagoEnabled ? 'Activo en el sitio' : 'Desactivado'}
                  </span>
                </label>
              </div>
            </div>

            {/* Step-by-step setup guide */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.25rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <ShieldCheck size={18} color="#0284c7" />
                Guía Paso a Paso para Conectar tu Cuenta de Mercado Pago
              </h4>
              <ol style={{ fontSize: '0.85rem', color: '#475569', margin: 0, paddingLeft: '1.25rem', lineHeight: 1.7 }}>
                <li>
                  Inicia sesión en tu cuenta de <a href="https://www.mercadopago.com.mx/developers/panel/app" target="_blank" rel="noreferrer" style={{ color: '#0284c7', fontWeight: 700 }}>Mercado Pago Developers México ↗</a>.
                </li>
                <li>
                  Ve a <strong>Tus integraciones</strong> y abre tu aplicación (o crea una seleccionando "Pagos en línea / Checkout Pro").
                </li>
                <li>
                  En el menú izquierdo, haz clic en <strong>Credenciales de producción</strong> (o <em>Credenciales de prueba</em> si pruebas en Sandbox).
                </li>
                <li>
                  Copia tu <strong>Access Token</strong> (comienza con <code>APP_USR-</code> o <code>TEST-</code>) y pégalo en el campo de abajo.
                </li>
                <li>
                  Haz clic en el botón <strong>"Probar Conexión con Mercado Pago"</strong> para verificar en tiempo real que tus credenciales funcionen.
                </li>
              </ol>
            </div>

            {/* Credential Inputs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#44403c', marginBottom: '0.35rem' }}>
                  Mercado Pago Access Token (Requerido para Checkout Pro)
                </label>
                <input
                  type="password"
                  value={settings.mercadopagoAccessToken}
                  onChange={e => handleChange('mercadopagoAccessToken', e.target.value)}
                  placeholder="APP_USR-1234567890-..."
                  className="input-field"
                  style={{ width: '100%', padding: '0.75rem 1rem', fontSize: '0.9rem', fontFamily: 'monospace', borderRadius: '10px' }}
                />
                <span style={{ fontSize: '0.75rem', color: '#78716c', marginTop: '0.25rem', display: 'block' }}>
                  Tu clave privada se utiliza exclusivamente del lado del servidor para generar órdenes con monto exacto.
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#44403c', marginBottom: '0.35rem' }}>
                  Mercado Pago Public Key (Opcional)
                </label>
                <input
                  type="text"
                  value={settings.mercadopagoPublicKey}
                  onChange={e => handleChange('mercadopagoPublicKey', e.target.value)}
                  placeholder="APP_USR-..."
                  className="input-field"
                  style={{ width: '100%', padding: '0.75rem 1rem', fontSize: '0.9rem', fontFamily: 'monospace', borderRadius: '10px' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#44403c', marginBottom: '0.35rem' }}>
                Link de Pago Personalizado / Fallback de Mercado Pago
              </label>
              <input
                type="text"
                value={settings.mercadopagoPaymentLink}
                onChange={e => handleChange('mercadopagoPaymentLink', e.target.value)}
                placeholder="https://link.mercadopago.com.mx/digimemories"
                className="input-field"
                style={{ width: '100%', padding: '0.75rem 1rem', fontSize: '0.9rem', borderRadius: '10px' }}
              />
              <span style={{ fontSize: '0.75rem', color: '#78716c', marginTop: '0.25rem', display: 'block' }}>
                Enlace directo utilizado en caso de que no configures Access Token de API.
              </span>
            </div>

            {/* Sandbox switch & Test button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderTop: '1px solid #f5f5f4', paddingTop: '1.25rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.mercadopagoSandbox}
                  onChange={e => handleChange('mercadopagoSandbox', e.target.checked)}
                  style={{ accentColor: '#eab308', width: '16px', height: '16px' }}
                />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#44403c' }}>
                  Modo Sandbox (Pruebas con credenciales TEST-)
                </span>
              </label>

              <button
                type="button"
                onClick={async () => {
                  setMpTestStatus({ loading: true });
                  const res = await testMercadoPagoConnection(settings.mercadopagoAccessToken);
                  setMpTestStatus({ loading: false, message: res.message, success: res.success });
                }}
                disabled={mpTestStatus?.loading}
                className="btn"
                style={{
                  background: '#0284c7',
                  color: '#ffffff',
                  padding: '0.6rem 1.25rem',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  borderRadius: '10px'
                }}
              >
                {mpTestStatus?.loading ? <RefreshCw size={15} className="animate-spin" /> : <Zap size={15} />}
                Probar Conexión con Mercado Pago
              </button>
            </div>

            {/* Connection Test Result */}
            {mpTestStatus && (
              <div style={{
                background: mpTestStatus.success ? '#f0fdf4' : '#fef2f2',
                border: mpTestStatus.success ? '1px solid #86efac' : '1px solid #fca5a5',
                color: mpTestStatus.success ? '#15803d' : '#b91c1c',
                padding: '0.85rem 1.15rem',
                borderRadius: '10px',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                {mpTestStatus.success ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                <span>{mpTestStatus.message}</span>
              </div>
            )}
          </div>
        </>
      )}

      {/* SECTION 3: TARIFAS Y PRECIOS BASE */}
        {activeSection === 'pricing' && (
          <div className="glass animate-on-load" style={{ padding: '2rem', background: '#ffffff', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <DollarSign size={20} className="text-accent" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                  Tarifas Base & Precios del Negocio ($ MXN)
                </h3>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#78716c', margin: '0.25rem 0 0 0' }}>
                Modifica los precios unitarios para que la calculadora y cotizador del bot respondan con los montos actualizados.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#44403c', marginBottom: '0.35rem' }}>
                  📼 Cinta VHS / Beta / Hi8
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontWeight: 800, color: '#ea580c' }}>$</span>
                  <input
                    type="number"
                    value={settings.priceTape}
                    onChange={e => handleChange('priceTape', Number(e.target.value))}
                    className="input-field"
                    style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem', fontWeight: 800, borderRadius: '10px' }}
                  />
                  <span style={{ fontSize: '0.8rem', color: '#78716c' }}>MXN</span>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#44403c', marginBottom: '0.35rem' }}>
                  💿 Disco DVD / Mini DVD
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontWeight: 800, color: '#ea580c' }}>$</span>
                  <input
                    type="number"
                    value={settings.priceDvd}
                    onChange={e => handleChange('priceDvd', Number(e.target.value))}
                    className="input-field"
                    style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem', fontWeight: 800, borderRadius: '10px' }}
                  />
                  <span style={{ fontSize: '0.8rem', color: '#78716c' }}>MXN</span>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#44403c', marginBottom: '0.35rem' }}>
                  📸 Foto Suelta en Papel (600 DPI)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontWeight: 800, color: '#ea580c' }}>$</span>
                  <input
                    type="number"
                    value={settings.pricePhotoScan}
                    onChange={e => handleChange('pricePhotoScan', Number(e.target.value))}
                    className="input-field"
                    style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem', fontWeight: 800, borderRadius: '10px' }}
                  />
                  <span style={{ fontSize: '0.8rem', color: '#78716c' }}>MXN</span>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#44403c', marginBottom: '0.35rem' }}>
                  📚 Álbum Familiar Completo
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontWeight: 800, color: '#ea580c' }}>$</span>
                  <input
                    type="number"
                    value={1200}
                    disabled
                    className="input-field"
                    style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem', fontWeight: 800, borderRadius: '10px', background: '#f5f5f4' }}
                  />
                  <span style={{ fontSize: '0.8rem', color: '#78716c' }}>MXN</span>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#44403c', marginBottom: '0.35rem' }}>
                  ⏱️ Hora Extra (+2 hrs)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontWeight: 800, color: '#ea580c' }}>$</span>
                  <input
                    type="number"
                    value={settings.priceExtraHour}
                    onChange={e => handleChange('priceExtraHour', Number(e.target.value))}
                    className="input-field"
                    style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem', fontWeight: 800, borderRadius: '10px' }}
                  />
                  <span style={{ fontSize: '0.8rem', color: '#78716c' }}>MXN</span>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#44403c', marginBottom: '0.35rem' }}>
                  🛵 Entrega Local CDMX
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontWeight: 800, color: '#ea580c' }}>$</span>
                  <input
                    type="number"
                    value={settings.priceLocalDeliveryCdmx}
                    onChange={e => handleChange('priceLocalDeliveryCdmx', Number(e.target.value))}
                    className="input-field"
                    style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem', fontWeight: 800, borderRadius: '10px' }}
                  />
                  <span style={{ fontSize: '0.8rem', color: '#78716c' }}>MXN</span>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#44403c', marginBottom: '0.35rem' }}>
                  📦 Envío Nacional DHL / Estafeta
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontWeight: 800, color: '#ea580c' }}>$</span>
                  <input
                    type="number"
                    value={settings.priceNationalShippingDhl}
                    onChange={e => handleChange('priceNationalShippingDhl', Number(e.target.value))}
                    className="input-field"
                    style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem', fontWeight: 800, borderRadius: '10px' }}
                  />
                  <span style={{ fontSize: '0.8rem', color: '#78716c' }}>MXN</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 4: CONTACTO Y REDES */}
        {activeSection === 'contact' && (
          <div className="glass animate-on-load" style={{ padding: '2rem', background: '#ffffff', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Phone size={20} className="text-accent" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                  Canales de Contacto Directo & Redes Sociales
                </h3>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#78716c', margin: '0.25rem 0 0 0' }}>
                Configura los números y enlaces donde los clientes te pueden contactar.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 700, color: '#44403c', marginBottom: '0.35rem' }}>
                  <Phone size={14} className="text-accent" /> WhatsApp de Atención
                </label>
                <input
                  type="text"
                  value={settings.contactWhatsApp}
                  onChange={e => handleChange('contactWhatsApp', e.target.value)}
                  placeholder="+52 55 1234 5678"
                  className="input-field"
                  style={{ width: '100%', padding: '0.75rem 1rem', fontSize: '0.9rem', borderRadius: '10px' }}
                />
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 700, color: '#44403c', marginBottom: '0.35rem' }}>
                  <Mail size={14} className="text-accent" /> Correo Electrónico Principal
                </label>
                <input
                  type="email"
                  value={settings.contactEmail}
                  onChange={e => handleChange('contactEmail', e.target.value)}
                  placeholder="contactodigimemories@gmail.com"
                  className="input-field"
                  style={{ width: '100%', padding: '0.75rem 1rem', fontSize: '0.9rem', borderRadius: '10px' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#44403c', marginBottom: '0.35rem' }}>
                  Instagram (Usuario / Handle)
                </label>
                <input
                  type="text"
                  value={settings.instagramHandle}
                  onChange={e => handleChange('instagramHandle', e.target.value)}
                  placeholder="@digimemories_mx"
                  className="input-field"
                  style={{ width: '100%', padding: '0.75rem 1rem', fontSize: '0.9rem', borderRadius: '10px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#44403c', marginBottom: '0.35rem' }}>
                  Página de Facebook (URL)
                </label>
                <input
                  type="url"
                  value={settings.facebookUrl}
                  onChange={e => handleChange('facebookUrl', e.target.value)}
                  placeholder="https://facebook.com/digimemories.mx"
                  className="input-field"
                  style={{ width: '100%', padding: '0.75rem 1rem', fontSize: '0.9rem', borderRadius: '10px' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* SECTION 5: AVISO DE CABECERA */}
        {activeSection === 'banner' && (
          <div className="glass animate-on-load" style={{ padding: '2rem', background: '#ffffff', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Megaphone size={20} className="text-accent" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                  Aviso Promocional en Barra Superior
                </h3>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#78716c', margin: '0.25rem 0 0 0' }}>
                Muestra un mensaje importante o promoción en la parte superior de la página web.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: '#faf8f5', borderRadius: '14px', border: '1px solid #e7e2d9' }}>
              <input
                type="checkbox"
                id="bannerEnabled"
                checked={settings.announcementBannerEnabled}
                onChange={e => handleChange('announcementBannerEnabled', e.target.checked)}
                style={{ width: '20px', height: '20px', accentColor: '#ea580c', cursor: 'pointer' }}
              />
              <label htmlFor="bannerEnabled" style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1c1917', cursor: 'pointer' }}>
                Activar barra de anuncio en la cabecera
              </label>
            </div>

            {settings.announcementBannerEnabled && (
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#44403c', marginBottom: '0.35rem' }}>
                  Texto del Anuncio
                </label>
                <input
                  type="text"
                  value={settings.announcementBannerText}
                  onChange={e => handleChange('announcementBannerText', e.target.value)}
                  placeholder="ej. 🚚 Recolección y entrega a domicilio gratis en compras mayores a $1,000 MXN"
                  className="input-field"
                  style={{ width: '100%', padding: '0.75rem 1rem', fontSize: '0.9rem', borderRadius: '10px' }}
                />

                {/* Live Preview */}
                <div style={{ marginTop: '1.25rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#78716c', marginBottom: '0.35rem' }}>
                    Vista Previa en Vivo:
                  </div>
                  <div style={{
                    padding: '0.65rem 1rem',
                    background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    textAlign: 'center',
                    borderRadius: '10px',
                    boxShadow: '0 2px 8px rgba(234, 88, 12, 0.25)'
                  }}>
                    {settings.announcementBannerText || 'Escribe un mensaje para previsualizarlo'}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SECTION 6: ASISTENTE IA GEMINI FLASH (MULTIMODAL GRATUITO) */}
        {activeSection === 'gemini' && (
          <div className="glass animate-on-load" style={{ padding: '2rem', background: '#ffffff', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            
            {/* Header */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)' }}>
                    <Sparkles size={22} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#1c1917' }}>
                      Asistente Virtual con Google Gemini Flash (Multimodal)
                    </h3>
                    <p style={{ fontSize: '0.82rem', color: '#78716c', margin: '0.15rem 0 0 0' }}>
                      Inteligencia artificial que responde preguntas técnicas y analiza fotografías de cassettes en tiempo real.
                    </p>
                  </div>
                </div>

                <span style={{ 
                  padding: '0.4rem 0.8rem', 
                  borderRadius: '20px', 
                  fontSize: '0.75rem', 
                  fontWeight: 800, 
                  background: '#ecfdf5', 
                  color: '#047857',
                  border: '1px solid #a7f3d0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}>
                  <CheckCircle2 size={14} /> Nivel Gratuito de Google AI (Cero Costo)
                </span>
              </div>
            </div>

            {/* Explanation Banner */}
            <div style={{ 
              padding: '1.25rem', 
              background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', 
              borderRadius: '16px', 
              border: '1px solid #cbd5e1',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.6rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, color: '#334155', fontSize: '0.9rem' }}>
                <Bot size={18} color="#4f46e5" /> ¿Cómo funciona Gemini Flash en DigiMemories?
              </div>
              <p style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.6, margin: 0 }}>
                • <strong>Capacidad Multimodal con Fotos:</strong> El cliente puede subir una foto de su cassette, disco o álbum en el chat. Gemini analiza la imagen, identifica el formato exacto (VHS, Hi8, Betamax, etc.) y detecta si tiene hongos o daño para darle un diagnóstico profesional inmediato.<br />
                • <strong>Cero Costo (Google AI Studio):</strong> Google ofrece un cupo gratuito de hasta 15 consultas por minuto y 1,500 consultas por día sin necesidad de tarjeta bancaria.<br />
                • <strong>Seguridad y Respaldo (Fallback):</strong> Si la API se satura o no tiene clave, el chat pasa automáticamente a su motor de respuestas pre-entrenadas sin interrumpir la atención.
              </p>
            </div>

            {/* Main Toggle */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              padding: '1.25rem', 
              background: settings.geminiEnabled ? '#eef2ff' : '#f5f5f4', 
              borderRadius: '16px', 
              border: settings.geminiEnabled ? '1px solid #c7d2fe' : '1px solid #e7e2d9' 
            }}>
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1c1917' }}>
                  Habilitar Asistente Inteligente Gemini Flash
                </div>
                <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.2rem' }}>
                  Permite que Guillermo responda con IA generativa multimodal en el chat en vivo.
                </div>
              </div>
              <input
                type="checkbox"
                id="geminiEnabled"
                checked={settings.geminiEnabled}
                onChange={e => handleChange('geminiEnabled', e.target.checked)}
                style={{ width: '22px', height: '22px', accentColor: '#4f46e5', cursor: 'pointer' }}
              />
            </div>

            {/* API Key Configuration */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
                  Google AI Studio API Key (Clave Gratuita)
                </label>
                <a 
                  href="https://aistudio.google.com/app/apikey" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ fontSize: '0.78rem', fontWeight: 700, color: '#4f46e5', textDecoration: 'underline' }}
                >
                  Obtener mi clave gratuita en Google AI Studio ↗
                </a>
              </div>
              
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type={showGeminiKey ? 'text' : 'password'}
                  value={settings.geminiApiKey}
                  onChange={e => handleChange('geminiApiKey', e.target.value)}
                  placeholder="AIzaSy..."
                  className="input-field"
                  style={{ width: '100%', padding: '0.75rem 3rem 0.75rem 1rem', fontSize: '0.9rem', borderRadius: '10px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowGeminiKey(!showGeminiKey)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title={showGeminiKey ? 'Ocultar clave' : 'Mostrar clave'}
                >
                  {showGeminiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.35rem' }}>
                Tu clave se almacena de forma segura en tu base de datos y permite la atención multimodal 24/7 sin costo.
              </p>
            </div>

            {/* Model Selector & Connection Test */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                  Modelo de Gemini
                </label>
                <select
                  value={settings.geminiModel || 'gemini-2.5-flash'}
                  onChange={e => handleChange('geminiModel', e.target.value)}
                  className="input-field"
                  style={{ width: '100%', padding: '0.75rem 1rem', fontSize: '0.9rem', borderRadius: '10px', background: '#ffffff' }}
                >
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash (Recomendado - Ultrarrápido, Multimodal y Gratuito)</option>
                  <option value="gemini-flash-latest">Gemini Flash Latest (Última versión disponible)</option>
                  <option value="gemini-2.5-pro">Gemini 2.5 Pro (Razonamiento profundo)</option>
                </select>
              </div>

              <div>
                <button
                  type="button"
                  onClick={async () => {
                    setGeminiTestStatus({ loading: true });
                    const res = await testGeminiConnection(settings.geminiApiKey, settings.geminiModel || 'gemini-2.5-flash');
                    setGeminiTestStatus({ loading: false, success: res.success, message: res.message });
                  }}
                  disabled={geminiTestStatus?.loading || !settings.geminiApiKey}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1.25rem',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    borderRadius: '10px',
                    border: '1px solid #c7d2fe',
                    background: '#eef2ff',
                    color: '#3730a3',
                    cursor: (!settings.geminiApiKey || geminiTestStatus?.loading) ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <Zap size={16} />
                  {geminiTestStatus?.loading ? 'Comprobando conexión...' : 'Probar Conexión con Gemini'}
                </button>
              </div>
            </div>

            {/* Test Status Feedback */}
            {geminiTestStatus && (
              <div style={{
                padding: '1rem',
                borderRadius: '12px',
                fontSize: '0.85rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: geminiTestStatus.success ? '#ecfdf5' : '#fef2f2',
                color: geminiTestStatus.success ? '#065f46' : '#991b1b',
                border: geminiTestStatus.success ? '1px solid #a7f3d0' : '1px solid #fecaca'
              }}>
                {geminiTestStatus.success ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                <span>{geminiTestStatus.message}</span>
              </div>
            )}

            {/* Quick 3-step Instructions Card */}
            <div style={{ 
              padding: '1.25rem', 
              background: '#f8fafc', 
              borderRadius: '14px', 
              border: '1px dashed #cbd5e1' 
            }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#334155', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Pasos para activar tu clave gratuita de Google en 60 segundos:
              </div>
              <ol style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.82rem', color: '#475569', lineHeight: 1.7 }}>
                <li>Abre <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" style={{ color: '#4f46e5', fontWeight: 700 }}>aistudio.google.com/app/apikey</a> con tu cuenta de Google.</li>
                <li>Haz clic en el botón azul <strong>"Create API key"</strong> (Crear clave de API).</li>
                <li>Copia el código que te da y pégalo arriba en el campo de <strong>API Key</strong>. ¡Listo!</li>
              </ol>
            </div>

          </div>
        )}

      </form>

    </div>
  );
};
export default AdminBusinessSettings;
