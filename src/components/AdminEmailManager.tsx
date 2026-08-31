import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Eye, 
  Key, 
  Server, 
  Paperclip, 
  HelpCircle, 
  Check, 
  Trash2, 
  ExternalLink,
  X
} from 'lucide-react';
import { 
  fetchServerEmailConfig, 
  updateServerEmailConfig, 
  testServerSmtp, 
  fetchServerOutbox, 
  clearServerOutbox,
  sendCustomClientMessage,
  type EmailServerConfig, 
  type ServerOutboxRecord 
} from '../lib/emailService';
import type { Order } from '../lib/store';

interface Props {
  orders: Order[];
}

export const AdminEmailManager: React.FC<Props> = ({ orders }) => {
  // Server Config State
  const [config, setConfig] = useState<EmailServerConfig | null>(null);
  const [smtpForm, setSmtpForm] = useState({
    user: '',
    pass: '',
    fromName: 'DigiMemories Preservación',
    fromEmail: '',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true
  });

  // Outbox State
  const [outbox, setOutbox] = useState<ServerOutboxRecord[]>([]);
  const [isLoadingOutbox, setIsLoadingOutbox] = useState(true);
  const [selectedPreview, setSelectedPreview] = useState<ServerOutboxRecord | null>(null);

  // Test & Compose State
  const [testEmailTarget, setTestEmailTarget] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; previewUrl?: string | null } | null>(null);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [showHelpGuide, setShowHelpGuide] = useState(false);

  // Compose Message State
  const [composeTo, setComposeTo] = useState('');
  const [composeName, setComposeName] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeMessage, setComposeMessage] = useState('');
  const [composeTrackingId, setComposeTrackingId] = useState('');
  const [isSendingCustom, setIsSendingCustom] = useState(false);
  const [composeFeedback, setComposeFeedback] = useState<{ success: boolean; text: string } | null>(null);

  const loadData = async () => {
    try {
      const configRes = await fetchServerEmailConfig();
      if (configRes.success && configRes.config) {
        setConfig(configRes.config);
        setSmtpForm(prev => ({
          ...prev,
          user: configRes.config.user || '',
          fromName: configRes.config.fromName || 'DigiMemories Preservación',
          fromEmail: configRes.config.fromEmail || '',
          host: configRes.config.host || 'smtp.gmail.com',
          port: configRes.config.port || 465,
          secure: configRes.config.secure !== false
        }));
      }

      const outboxList = await fetchServerOutbox();
      setOutbox(outboxList);
    } catch (err) {
      console.warn('Error loading email manager data:', err);
    } finally {
      setIsLoadingOutbox(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);
    setSaveSuccessMsg('');
    setTestResult(null);

    const payload: any = {
      user: smtpForm.user.trim(),
      fromName: smtpForm.fromName.trim(),
      fromEmail: smtpForm.fromEmail.trim() || smtpForm.user.trim(),
      host: smtpForm.host.trim(),
      port: Number(smtpForm.port),
      secure: smtpForm.secure
    };

    if (smtpForm.pass.trim()) {
      payload.pass = smtpForm.pass.trim();
    }

    const res = await updateServerEmailConfig(payload);
    setIsSavingConfig(false);

    if (res.success) {
      setConfig(res.config);
      setSaveSuccessMsg('✓ Configuración del servidor guardada con éxito.');
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } else {
      alert(`Error al guardar: ${res.message}`);
    }
  };

  const handleTestSmtp = async () => {
    setIsTesting(true);
    setTestResult(null);

    const target = testEmailTarget.trim() || smtpForm.user.trim() || 'cliente.prueba@ejemplo.com';
    const result = await testServerSmtp(target);
    setIsTesting(false);
    setTestResult(result);

    // Refresh outbox
    const updatedOutbox = await fetchServerOutbox();
    setOutbox(updatedOutbox);
  };

  const handleClearOutbox = async () => {
    if (window.confirm('¿Seguro que deseas vaciar el registro de la bandeja de salida?')) {
      await clearServerOutbox();
      setOutbox([]);
    }
  };

  const handleSelectOrderForCompose = (orderId: string) => {
    setComposeTrackingId(orderId);
    const order = orders.find(o => o.id === orderId);
    if (order) {
      setComposeTo(order.clientEmail);
      setComposeName(order.clientName);
      setComposeSubject(`Actualización sobre tu orden #${order.id} - DigiMemories`);
      setComposeMessage(`Hola ${order.clientName},\n\nTe contactamos desde el laboratorio de DigiMemories para darte novedades sobre tu orden de digitalización.`);
    }
  };

  const handleSendCompose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeTo || !composeSubject || !composeMessage) {
      alert('Por favor completa destinatario, asunto y mensaje.');
      return;
    }

    setIsSendingCustom(true);
    setComposeFeedback(null);

    const result = await sendCustomClientMessage(composeTo, composeName || composeTo, {
      clientName: composeName || 'Cliente',
      subject: composeSubject,
      message: composeMessage,
      trackingId: composeTrackingId || undefined,
      actionUrl: composeTrackingId ? `${window.location.origin}/track` : undefined,
      actionText: composeTrackingId ? 'Consultar Orden en Vivo' : undefined
    });

    setIsSendingCustom(false);
    if (result.success) {
      setComposeFeedback({ success: true, text: '✓ Mensaje despachado exitosamente al cliente.' });
      setComposeSubject('');
      setComposeMessage('');
      // Reload outbox
      const updatedOutbox = await fetchServerOutbox();
      setOutbox(updatedOutbox);
      setTimeout(() => setComposeFeedback(null), 5000);
    } else {
      setComposeFeedback({ success: false, text: `Error: ${result.message}` });
    }
  };

  const isGmailLive = config?.mode === 'gmail_live' && config?.isConfigured;

  return (
    <div className="animate-on-load" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* 1. TOP SERVER STATUS BANNER */}
      <div className="glass" style={{ 
        padding: '1.75rem', 
        background: '#ffffff', 
        borderRadius: '20px',
        border: '1px solid rgba(214, 204, 194, 0.7)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: isGmailLive ? '#ecfdf5' : '#fffbeb',
            color: isGmailLive ? '#059669' : '#d97706',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            border: `1px solid ${isGmailLive ? '#a7f3d0' : '#fde68a'}`
          }}>
            <Server size={28} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800 }}>
                Servidor de Correo Interno Node.js
              </h3>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '0.25rem 0.75rem',
                borderRadius: '999px',
                background: isGmailLive ? '#dcfce7' : '#fef3c7',
                color: isGmailLive ? '#15803d' : '#b45309',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: isGmailLive ? '#16a34a' : '#d97706' }}></span>
                {isGmailLive ? 'Gmail SMTP Conectado (En Vivo)' : 'Modo Sandbox / Pruebas'}
              </span>
            </div>

            <p style={{ margin: '0.3rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {isGmailLive 
                ? `Los correos salen directamente desde ${config?.user} usando TLS seguro en puerto ${config?.port}.`
                : 'El servidor está activo simulando envíos y generando enlaces de vista previa. Configura tus credenciales abajo para habilitar entregas reales.'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input 
            type="email"
            placeholder="Enviar prueba a (opcional)..."
            value={testEmailTarget}
            onChange={e => setTestEmailTarget(e.target.value)}
            className="input-field"
            style={{ width: '220px', padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
          />

          <button 
            onClick={loadData}
            className="btn btn-secondary"
            style={{ padding: '0.55rem 0.9rem', fontSize: '0.85rem' }}
            title="Actualizar estado"
          >
            <RefreshCw size={16} /> Refrescar
          </button>

          <button 
            onClick={handleTestSmtp}
            disabled={isTesting}
            className="btn btn-primary"
            style={{ padding: '0.55rem 1.15rem', fontSize: '0.85rem' }}
          >
            {isTesting ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
            Probar Conexión SMTP
          </button>
        </div>
      </div>

      {/* Diagnostic Message Toast */}
      {testResult && (
        <div style={{
          padding: '1.25rem 1.5rem',
          borderRadius: '14px',
          background: testResult.success ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${testResult.success ? '#86efac' : '#fca5a5'}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {testResult.success ? <CheckCircle2 size={22} color="#16a34a" /> : <AlertCircle size={22} color="#dc2626" />}
            <div>
              <strong style={{ color: testResult.success ? '#15803d' : '#b91c1c', fontSize: '0.95rem', display: 'block' }}>
                {testResult.success ? 'Diagnóstico Exitoso' : 'Error en la Prueba SMTP'}
              </strong>
              <span style={{ color: '#374151', fontSize: '0.85rem' }}>{testResult.message}</span>
            </div>
          </div>

          {testResult.previewUrl && (
            <a 
              href={testResult.previewUrl} 
              target="_blank" 
              rel="noreferrer"
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', background: '#ffffff' }}
            >
              <ExternalLink size={14} /> Ver Correo en Ethereal
            </a>
          )}
        </div>
      )}

      {/* 2-COLUMN GRID: CONFIGURATION & COMPOSE */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
        
        {/* COLUMN 1: GMAIL & SMTP CONFIGURATION */}
        <div className="glass" style={{ padding: '2rem', background: '#ffffff', borderRadius: '20px', border: '1px solid rgba(214, 204, 194, 0.7)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Key size={20} className="text-accent" />
              <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Configuración de Gmail / SMTP</h4>
            </div>

            <button 
              type="button"
              onClick={() => setShowHelpGuide(!showHelpGuide)}
              style={{ background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600 }}
            >
              <HelpCircle size={15} /> {showHelpGuide ? 'Ocultar Guía' : '¿Cómo obtener clave?'}
            </button>
          </div>

          {/* Collapsible Step-by-Step Google App Password Guide */}
          {showHelpGuide && (
            <div style={{
              background: '#fff7ed',
              border: '1px solid #fed7aa',
              padding: '1.25rem',
              borderRadius: '12px',
              marginBottom: '1.5rem',
              fontSize: '0.85rem',
              color: '#7c2d12'
            }}>
              <strong style={{ display: 'block', marginBottom: '0.5rem', color: '#9a3412', fontSize: '0.9rem' }}>
                📋 Pasos para conectar tu cuenta de Gmail en 2 minutos:
              </strong>
              <ol style={{ margin: 0, paddingLeft: '1.2rem', lineHeight: '1.6' }}>
                <li>Entra a tu cuenta Google y activa la <strong>Verificación en 2 pasos</strong> si no la tienes activa.</li>
                <li>Ve a: <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" style={{ color: '#c2410c', textDecoration: 'underline', fontWeight: 700 }}>myaccount.google.com/apppasswords</a></li>
                <li>Escribe un nombre (ej. <em>"DigiMemories Web"</em>) y dale a <strong>Crear</strong>.</li>
                <li>Google te mostrará un código amarillo de <strong>16 letras</strong> (ej: <code>abcd efgh ijkl mnop</code>).</li>
                <li>Pégalo aquí en el campo <strong>Contraseña de Aplicación</strong> y guarda.</li>
              </ol>
            </div>
          )}

          <form onSubmit={handleSaveConfig} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
                Tu Cuenta de Gmail o Correo Emisor
              </label>
              <input 
                type="email"
                className="input-field"
                placeholder="ej. hola.volveraver@gmail.com"
                value={smtpForm.user}
                onChange={e => setSmtpForm({ ...smtpForm, user: e.target.value })}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
                Contraseña de Aplicación de Google (16 caracteres)
              </label>
              <input 
                type="password"
                className="input-field"
                placeholder={config?.hasPassword ? '•••••••••••••••• (Guardada y activa)' : 'Pega aquí tu clave de 16 letras'}
                value={smtpForm.pass}
                onChange={e => setSmtpForm({ ...smtpForm, pass: e.target.value })}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                No uses tu contraseña habitual de Gmail. Usa la Contraseña de Aplicación generada por Google.
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
                  Nombre del Remitente
                </label>
                <input 
                  type="text"
                  className="input-field"
                  value={smtpForm.fromName}
                  onChange={e => setSmtpForm({ ...smtpForm, fromName: e.target.value })}
                  placeholder="DigiMemories Preservación"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
                  Correo de Respuesta (Reply-To)
                </label>
                <input 
                  type="email"
                  className="input-field"
                  value={smtpForm.fromEmail}
                  onChange={e => setSmtpForm({ ...smtpForm, fromEmail: e.target.value })}
                  placeholder="contacto@digimemories.mx"
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
              {saveSuccessMsg && (
                <span style={{ color: '#16a34a', fontSize: '0.85rem', fontWeight: 600 }}>{saveSuccessMsg}</span>
              )}
              {!saveSuccessMsg && <span></span>}

              <button 
                type="submit" 
                disabled={isSavingConfig}
                className="btn btn-primary"
                style={{ padding: '0.7rem 1.5rem', fontSize: '0.9rem' }}
              >
                {isSavingConfig ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />}
                Guardar Configuración
              </button>
            </div>
          </form>
        </div>

        {/* COLUMN 2: CUSTOM CLIENT EMAIL COMPOSER */}
        <div className="glass" style={{ padding: '2rem', background: '#ffffff', borderRadius: '20px', border: '1px solid rgba(214, 204, 194, 0.7)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <Send size={20} className="text-accent" />
            <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Compositor de Correos a Clientes</h4>
          </div>

          <form onSubmit={handleSendCompose} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {orders.length > 0 && (
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem', color: 'var(--text-secondary)' }}>
                  Seleccionar Orden Existente (Opcional):
                </label>
                <select 
                  className="input-field"
                  style={{ fontSize: '0.85rem', padding: '0.5rem 0.75rem' }}
                  onChange={e => handleSelectOrderForCompose(e.target.value)}
                  defaultValue=""
                >
                  <option value="">Seleccionar una orden para autocompletar...</option>
                  {orders.map(o => (
                    <option key={o.id} value={o.id}>
                      #{o.id} - {o.clientName} ({o.clientEmail})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                  Correo Destinatario
                </label>
                <input 
                  type="email"
                  className="input-field"
                  placeholder="cliente@ejemplo.com"
                  value={composeTo}
                  onChange={e => setComposeTo(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                  Nombre del Cliente
                </label>
                <input 
                  type="text"
                  className="input-field"
                  placeholder="Nombre y Apellido"
                  value={composeName}
                  onChange={e => setComposeName(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                Asunto del Correo
              </label>
              <input 
                type="text"
                className="input-field"
                placeholder="ej. Notificación sobre tus cintas VHS"
                value={composeSubject}
                onChange={e => setComposeSubject(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                Mensaje (Plantilla de Marca Automática)
              </label>
              <textarea 
                className="input-field"
                rows={4}
                placeholder="Escribe el mensaje que deseas enviar al cliente..."
                value={composeMessage}
                onChange={e => setComposeMessage(e.target.value)}
                required
              ></textarea>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
              {composeFeedback && (
                <span style={{ color: composeFeedback.success ? '#16a34a' : '#dc2626', fontSize: '0.85rem', fontWeight: 600 }}>
                  {composeFeedback.text}
                </span>
              )}
              {!composeFeedback && <span></span>}

              <button 
                type="submit" 
                disabled={isSendingCustom}
                className="btn btn-primary"
                style={{ padding: '0.65rem 1.5rem', fontSize: '0.9rem' }}
              >
                {isSendingCustom ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                Despachar Correo
              </button>
            </div>
          </form>
        </div>

      </div>

      {/* 3. FULL OUTBOX LOGS & PREVIEW TABLE */}
      <div className="glass" style={{ padding: '2rem', background: '#ffffff', borderRadius: '20px', border: '1px solid rgba(214, 204, 194, 0.7)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Mail size={22} className="text-accent" />
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
                Bandeja de Salida en Tiempo Real (Outbox)
              </h3>
              <span className="badge">{outbox.length} despachados</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.3rem 0 0 0' }}>
              Historial de correos enviados por el servidor, estado de entrega, enlaces de previsualización y adjuntos.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              onClick={loadData}
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
            >
              <RefreshCw size={14} /> Refrescar
            </button>
            {outbox.length > 0 && (
              <button 
                onClick={handleClearOutbox}
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', color: '#dc2626' }}
              >
                <Trash2 size={14} /> Limpiar
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {outbox.map(item => (
            <div 
              key={item.id}
              style={{
                padding: '1.25rem',
                background: 'var(--bg-secondary)',
                borderRadius: '14px',
                border: '1px solid rgba(214, 204, 194, 0.6)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.6rem',
                    borderRadius: '999px',
                    background: item.status === 'delivered' ? '#dcfce7' : item.status === 'failed' ? '#fee2e2' : '#fef3c7',
                    color: item.status === 'delivered' ? '#15803d' : item.status === 'failed' ? '#b91c1c' : '#b45309'
                  }}>
                    {item.status === 'delivered' ? '✓ Entregado (Live)' : item.status === 'failed' ? '✗ Error SMTP' : '🟡 Sandbox Simulado'}
                  </span>

                  {item.attachmentsCount > 0 && (
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.5rem',
                      borderRadius: '999px',
                      background: '#e0f2fe',
                      color: '#0369a1',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}>
                      <Paperclip size={12} /> {item.attachmentsCount} PDF Adjunto
                    </span>
                  )}

                  <strong style={{ fontSize: '0.95rem' }}>{item.subject}</strong>
                </div>

                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Destinatario: <strong>{item.toName || item.to}</strong> &lt;{item.to}&gt;
                  {item.metadata?.trackingId ? ` • Folio #${item.metadata.trackingId}` : ''}
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Enviado: {new Date(item.sentAt).toLocaleString('es-MX')} • ID: <code>{item.id}</code>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {item.previewUrl && (
                  <a 
                    href={item.previewUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="btn btn-secondary"
                    style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}
                  >
                    <ExternalLink size={14} /> Ethereal
                  </a>
                )}

                <button 
                  onClick={() => setSelectedPreview(item)}
                  className="btn btn-secondary"
                  style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem' }}
                >
                  <Eye size={14} /> Ver HTML Renderizado
                </button>
              </div>
            </div>
          ))}

          {outbox.length === 0 && !isLoadingOutbox && (
            <div style={{ padding: '3.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Mail size={36} style={{ margin: '0 auto 0.75rem auto', opacity: 0.4 }} />
              <p style={{ margin: 0, fontSize: '0.95rem' }}>Aún no hay correos en la bandeja de salida.</p>
              <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.85rem' }}>Genera una cotización en /contact o envía un correo de prueba.</p>
            </div>
          )}
        </div>
      </div>

      {/* 4. MODAL: RENDERED HTML EMAIL PREVIEW */}
      {selectedPreview && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div className="glass animate-on-load" style={{
            maxWidth: '700px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            background: '#ffffff',
            padding: '2rem',
            borderRadius: '20px',
            position: 'relative'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.25rem',
              borderBottom: '1px solid var(--glass-border)',
              paddingBottom: '0.75rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '1.1rem' }}>
                <Mail size={20} className="text-accent" />
                <span>Vista Previa del Correo Despachado</span>
              </div>
              <button 
                onClick={() => setSelectedPreview(null)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#57534e' }}
              >
                <X size={22} />
              </button>
            </div>

            <div style={{
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              marginBottom: '1.25rem',
              background: 'var(--bg-secondary)',
              padding: '1rem',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem'
            }}>
              <div><strong>Para:</strong> {selectedPreview.toName} &lt;{selectedPreview.to}&gt;</div>
              <div><strong>Asunto:</strong> {selectedPreview.subject}</div>
              <div><strong>Fecha:</strong> {new Date(selectedPreview.sentAt).toLocaleString('es-MX')}</div>
              <div>
                <strong>Modo:</strong> {selectedPreview.mode === 'gmail_live' ? 'Gmail SMTP en Vivo 🟢' : 'Sandbox de Pruebas 🟡'}
                {selectedPreview.attachmentsCount > 0 ? ` • ${selectedPreview.attachmentsCount} Archivo PDF Adjunto 📎` : ''}
              </div>
            </div>

            {/* Rendered HTML inside container */}
            <div 
              style={{ border: '1px solid #e7e2d9', borderRadius: '12px', overflow: 'hidden' }}
              dangerouslySetInnerHTML={{ __html: selectedPreview.html }} 
            />
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminEmailManager;
