import React, { useState, useEffect } from 'react';
import { 
  getBusinessSettings, 
  saveBusinessSettings, 
  fetchCloudBusinessSettings,
  type BusinessSettings 
} from '../lib/businessSettings';
import { 
  Building, 
  MapPin, 
  CreditCard, 
  DollarSign, 
  Phone, 
  Mail, 
  Clock, 
  Globe, 
  Save, 
  CheckCircle2, 
  Megaphone, 
  RefreshCw 
} from 'lucide-react';

export const AdminBusinessSettings: React.FC = () => {
  const [settings, setSettings] = useState<BusinessSettings>(() => getBusinessSettings());
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeSection, setActiveSection] = useState<'location' | 'bank' | 'pricing' | 'contact' | 'banner'>('location');

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
          <Building size={16} /> Ubicación & Taller
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
          <CreditCard size={16} /> Cuentas Bancarias & Anticipos
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
          <DollarSign size={16} /> Tarifas & Precios Oficiales
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
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* SECTION 1: UBICACIÓN Y TALLER */}
        {activeSection === 'location' && (
          <div className="glass animate-on-load" style={{ padding: '2rem', background: '#ffffff', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Building size={20} className="text-accent" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                  Ubicación del Taller & Laboratorio Central
                </h3>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#78716c', margin: '0.25rem 0 0 0' }}>
                Esta dirección se muestra a los clientes que eligen la opción "Recoger en Taller" y en el pie de página.
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
                  RFC / Identificador Fiscal
                </label>
                <input
                  type="text"
                  value={settings.rfcTaxId}
                  onChange={e => handleChange('rfcTaxId', e.target.value)}
                  placeholder="ej. DGM-210408-9A1"
                  className="input-field"
                  style={{ width: '100%', padding: '0.75rem 1rem', fontSize: '0.9rem', borderRadius: '10px' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 700, color: '#44403c', marginBottom: '0.35rem' }}>
                  <MapPin size={14} className="text-accent" /> Calle, Número Exterior e Interior
                </label>
                <input
                  type="text"
                  value={settings.tallerAddress}
                  onChange={e => handleChange('tallerAddress', e.target.value)}
                  placeholder="Av. Insurgentes Sur #450, Piso 2, Int. 204"
                  className="input-field"
                  style={{ width: '100%', padding: '0.75rem 1rem', fontSize: '0.9rem', borderRadius: '10px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#44403c', marginBottom: '0.35rem' }}>
                  Colonia y Alcaldía / Municipio
                </label>
                <input
                  type="text"
                  value={settings.tallerNeighborhood}
                  onChange={e => handleChange('tallerNeighborhood', e.target.value)}
                  placeholder="Col. Roma Sur, Alcaldía Cuauhtémoc"
                  className="input-field"
                  style={{ width: '100%', padding: '0.75rem 1rem', fontSize: '0.9rem', borderRadius: '10px' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#44403c', marginBottom: '0.35rem' }}>
                  Ciudad y Estado
                </label>
                <input
                  type="text"
                  value={settings.tallerCityState}
                  onChange={e => handleChange('tallerCityState', e.target.value)}
                  placeholder="Ciudad de México, CDMX"
                  className="input-field"
                  style={{ width: '100%', padding: '0.75rem 1rem', fontSize: '0.9rem', borderRadius: '10px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#44403c', marginBottom: '0.35rem' }}>
                  Código Postal (C.P.)
                </label>
                <input
                  type="text"
                  value={settings.tallerPostalCode}
                  onChange={e => handleChange('tallerPostalCode', e.target.value)}
                  placeholder="06760"
                  className="input-field"
                  style={{ width: '100%', padding: '0.75rem 1rem', fontSize: '0.9rem', borderRadius: '10px' }}
                />
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 700, color: '#44403c', marginBottom: '0.35rem' }}>
                  <Globe size={14} className="text-accent" /> Enlace de Google Maps
                </label>
                <input
                  type="url"
                  value={settings.googleMapsUrl}
                  onChange={e => handleChange('googleMapsUrl', e.target.value)}
                  placeholder="https://maps.google.com/..."
                  className="input-field"
                  style={{ width: '100%', padding: '0.75rem 1rem', fontSize: '0.9rem', borderRadius: '10px' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#44403c', marginBottom: '0.35rem' }}>
                Referencias para el Cliente
              </label>
              <input
                type="text"
                value={settings.tallerReferences}
                onChange={e => handleChange('tallerReferences', e.target.value)}
                placeholder="Frente a estación Metrobús Chilpancingo, edificio de cristal..."
                className="input-field"
                style={{ width: '100%', padding: '0.75rem 1rem', fontSize: '0.9rem', borderRadius: '10px' }}
              />
            </div>

            {/* Horarios */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', paddingTop: '0.5rem', borderTop: '1px solid #f0ede6' }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 700, color: '#44403c', marginBottom: '0.35rem' }}>
                  <Clock size={14} className="text-accent" /> Horario Entre Semana
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
                  <Clock size={14} className="text-accent" /> Horario Fin de Semana
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

        {/* SECTION 2: DATOS BANCARIOS */}
        {activeSection === 'bank' && (
          <div className="glass animate-on-load" style={{ padding: '2rem', background: '#ffffff', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CreditCard size={20} className="text-accent" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                  Cuentas Bancarias Oficiales para Anticipos (50%) & Transferencias
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
                  💾 Memoria USB 3.0 64GB
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontWeight: 800, color: '#ea580c' }}>$</span>
                  <input
                    type="number"
                    value={settings.priceUsb64gb}
                    onChange={e => handleChange('priceUsb64gb', Number(e.target.value))}
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
                  Canales Oficiales de Contacto & Redes Sociales
                </h3>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#78716c', margin: '0.25rem 0 0 0' }}>
                Configura los números y enlaces donde los clientes te pueden contactar.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 700, color: '#44403c', marginBottom: '0.35rem' }}>
                  <Phone size={14} className="text-accent" /> WhatsApp Oficial de Atención
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

      </form>

    </div>
  );
};
export default AdminBusinessSettings;
