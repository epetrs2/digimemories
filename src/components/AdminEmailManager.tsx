import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Eye, 
  EyeOff,
  Key, 
  Server, 
  Paperclip, 
  HelpCircle, 
  Check, 
  Trash2, 
  ExternalLink,
  X,
  BookOpen,
  Copy,
  Sparkles,
  Search as SearchIcon
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
import { EMAIL_TEMPLATES, renderEmailTemplate, type EmailTemplate } from '../lib/emailTemplates';
import type { Order } from '../lib/store';
import { sanitizeHtml } from '../lib/security';

interface Props {
  orders: Order[];
}

export const AdminEmailManager: React.FC<Props> = ({ orders }) => {
  // Server Config State
  const [config, setConfig] = useState<EmailServerConfig | null>(null);
  const hasInitializedForm = React.useRef(false);

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
  const [showPass, setShowPass] = useState(false);

  // Compose Message State
  const [composeTo, setComposeTo] = useState('');
  const [composeName, setComposeName] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeMessage, setComposeMessage] = useState('');
  const [composeTrackingId, setComposeTrackingId] = useState('');
  const [isSendingCustom, setIsSendingCustom] = useState(false);
  const [composeFeedback, setComposeFeedback] = useState<{ success: boolean; text: string } | null>(null);

  // Email Tabs & Template Library State
  const [activeEmailTab, setActiveEmailTab] = useState<'compose' | 'templates' | 'config'>('compose');
  const [templateCategory, setTemplateCategory] = useState<string>('all');
  const [templateSearch, setTemplateSearch] = useState<string>('');
  const [templateSelectedOrderId, setTemplateSelectedOrderId] = useState<string>('');
  const [templateCopiedId, setTemplateCopiedId] = useState<string | null>(null);
  const composeFormContainerRef = React.useRef<HTMLDivElement>(null);

  const handleApplyTemplate = (template: EmailTemplate) => {
    const ord = orders.find(o => o.id === templateSelectedOrderId) || (orders.length > 0 ? orders[0] : undefined);
    const rendered = renderEmailTemplate(template, {
      nombre: ord ? ord.clientName : composeName || 'Cliente',
      ordenId: ord ? ord.id : composeTrackingId || '0000',
      formato: ord?.items?.[0]?.format || 'VHS',
      cantidadCintas: ord?.items?.length || 5,
      downloadUrl: ord ? `${window.location.origin}/track?orderId=${ord.id}` : undefined,
      trackingUrl: ord ? `${window.location.origin}/track?orderId=${ord.id}` : undefined,
      saldoPendiente: ord ? (ord.depositPaid ? Math.round(ord.estimatedTotal * 0.5) : ord.estimatedTotal) : 450
    });

    setComposeSubject(rendered.subject);
    setComposeMessage(rendered.body);
    if (ord) {
      setComposeTo(ord.clientEmail);
      setComposeName(ord.clientName);
      setComposeTrackingId(ord.id);
    }
    setActiveEmailTab('compose');
    setComposeFeedback({ success: true, text: `✓ Plantilla "${template.name}" cargada en el redactor.` });
    setTimeout(() => setComposeFeedback(null), 4000);
    setTimeout(() => {
      composeFormContainerRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleCopyTemplate = (template: EmailTemplate) => {
    const ord = orders.find(o => o.id === templateSelectedOrderId);
    const rendered = renderEmailTemplate(template, {
      nombre: ord ? ord.clientName : 'Cliente',
      ordenId: ord ? ord.id : '0000',
      formato: ord?.items?.[0]?.format || 'VHS',
      cantidadCintas: ord?.items?.length || 5
    });
    navigator.clipboard.writeText(`${rendered.subject}\n\n${rendered.body}`);
    setTemplateCopiedId(template.id);
    setTimeout(() => setTemplateCopiedId(null), 2500);
  };

  const loadData = async (isManual = false) => {
    try {
      const configRes = await fetchServerEmailConfig();
      if (configRes.success && configRes.config) {
        setConfig(configRes.config);
        
        // Only initialize form fields once on initial load or manual save
        if (!hasInitializedForm.current || isManual) {
          hasInitializedForm.current = true;
          setSmtpForm(prev => ({
            ...prev,
            user: configRes.config.user || prev.user || '',
            fromName: configRes.config.fromName || prev.fromName || 'DigiMemories Preservación',
            fromEmail: configRes.config.fromEmail || prev.fromEmail || '',
            host: configRes.config.host || prev.host || 'smtp.gmail.com',
            port: configRes.config.port || prev.port || 465,
            secure: configRes.config.secure !== false
          }));
        }
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
    loadData(true);
    const interval = setInterval(() => loadData(false), 8000);
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
            onClick={() => loadData(true)}
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

      {/* NAVIGATION SUB-TABS */}
      <div style={{
        display: 'flex',
        gap: '0.65rem',
        padding: '0.35rem',
        background: '#f5f5f4',
        borderRadius: '14px',
        border: '1px solid rgba(214, 204, 194, 0.7)',
        width: 'fit-content',
        flexWrap: 'wrap'
      }}>
        <button
          type="button"
          onClick={() => setActiveEmailTab('compose')}
          style={{
            padding: '0.55rem 1.15rem',
            borderRadius: '10px',
            border: activeEmailTab === 'compose' ? '1px solid var(--accent-color)' : '1px solid transparent',
            background: activeEmailTab === 'compose' ? '#ffffff' : 'transparent',
            color: activeEmailTab === 'compose' ? 'var(--accent-color)' : 'var(--text-secondary)',
            fontWeight: activeEmailTab === 'compose' ? 800 : 600,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            boxShadow: activeEmailTab === 'compose' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none'
          }}
        >
          <Mail size={16} /> Redactor & Bandeja de Salida
        </button>

        <button
          type="button"
          onClick={() => setActiveEmailTab('templates')}
          style={{
            padding: '0.55rem 1.15rem',
            borderRadius: '10px',
            border: activeEmailTab === 'templates' ? '1px solid var(--accent-color)' : '1px solid transparent',
            background: activeEmailTab === 'templates' ? '#ffffff' : 'transparent',
            color: activeEmailTab === 'templates' ? 'var(--accent-color)' : 'var(--text-secondary)',
            fontWeight: activeEmailTab === 'templates' ? 800 : 600,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            boxShadow: activeEmailTab === 'templates' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none'
          }}
        >
          <BookOpen size={16} /> Biblioteca de Plantillas ({EMAIL_TEMPLATES.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveEmailTab('config')}
          style={{
            padding: '0.55rem 1.15rem',
            borderRadius: '10px',
            border: activeEmailTab === 'config' ? '1px solid var(--accent-color)' : '1px solid transparent',
            background: activeEmailTab === 'config' ? '#ffffff' : 'transparent',
            color: activeEmailTab === 'config' ? 'var(--accent-color)' : 'var(--text-secondary)',
            fontWeight: activeEmailTab === 'config' ? 800 : 600,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            boxShadow: activeEmailTab === 'config' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none'
          }}
        >
          <Key size={16} /> Configuración SMTP
        </button>
      </div>

      {/* VIEW 1: TEMPLATES LIBRARY */}
      {activeEmailTab === 'templates' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Templates Filter & Personalization Bar */}
          <div className="glass" style={{ padding: '1.5rem', background: '#ffffff', borderRadius: '18px', border: '1px solid rgba(214, 204, 194, 0.7)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                  Catálogo de Plantillas de Laboratorio ({EMAIL_TEMPLATES.length} Redacciones)
                </h4>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                  Selecciona una orden para previsualizar variables personalizadas (nombre, ID, saldo, links de seguimiento).
                </p>
              </div>

              {orders.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    Personalizar con:
                  </span>
                  <select
                    className="input-field"
                    style={{ fontSize: '0.82rem', padding: '0.4rem 0.65rem' }}
                    value={templateSelectedOrderId}
                    onChange={e => setTemplateSelectedOrderId(e.target.value)}
                  >
                    <option value="">(Datos de muestra genéricos)</option>
                    {orders.map(o => (
                      <option key={o.id} value={o.id}>
                        #{o.id} — {o.clientName} ({o.items?.length || 0} cintas)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Search & Category Pills */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {[
                  { id: 'all', label: 'Todas (11)' },
                  { id: 'Recepción & Diagnóstico', label: 'Recepción & Diagnóstico' },
                  { id: 'Incidencias Técnicas', label: 'Incidencias Técnicas' },
                  { id: 'Entrega de Archivos', label: 'Entrega de Archivos' },
                  { id: 'Facturación & Pagos', label: 'Facturación & Pagos' },
                  { id: 'Fidelización & Fidelidad', label: 'Fidelización' },
                  { id: 'Comercial', label: 'Comercial' }
                ].map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setTemplateCategory(cat.id)}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '8px',
                      border: templateCategory === cat.id ? '1px solid var(--accent-color)' : '1px solid rgba(0,0,0,0.1)',
                      background: templateCategory === cat.id ? 'rgba(234, 88, 12, 0.12)' : '#ffffff',
                      color: templateCategory === cat.id ? 'var(--accent-color)' : 'var(--text-secondary)',
                      fontWeight: templateCategory === cat.id ? 800 : 500,
                      fontSize: '0.78rem',
                      cursor: 'pointer'
                    }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <div style={{ position: 'relative', minWidth: '240px' }}>
                <SearchIcon size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                <input
                  type="text"
                  placeholder="Buscar plantilla por motivo..."
                  className="input-field"
                  value={templateSearch}
                  onChange={e => setTemplateSearch(e.target.value)}
                  style={{ paddingLeft: '2rem', fontSize: '0.82rem', width: '100%', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          </div>

          {/* Grid of Templates */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
            {EMAIL_TEMPLATES
              .filter(t => {
                if (templateCategory !== 'all' && t.category !== templateCategory) return false;
                if (templateSearch.trim()) {
                  const q = templateSearch.toLowerCase();
                  return t.name.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q) || t.body.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
                }
                return true;
              })
              .map(template => {
                const sampleOrd = orders.find(o => o.id === templateSelectedOrderId) || (orders.length > 0 ? orders[0] : undefined);
                const rendered = renderEmailTemplate(template, {
                  nombre: sampleOrd ? sampleOrd.clientName : 'Carlos Mendoza',
                  ordenId: sampleOrd ? sampleOrd.id : '1084',
                  formato: sampleOrd?.items?.[0]?.format || 'VHS',
                  cantidadCintas: sampleOrd?.items?.length || 6,
                  downloadUrl: sampleOrd ? `${window.location.origin}/track?orderId=${sampleOrd.id}` : undefined,
                  trackingUrl: sampleOrd ? `${window.location.origin}/track?orderId=${sampleOrd.id}` : undefined,
                  saldoPendiente: sampleOrd ? (sampleOrd.depositPaid ? Math.round(sampleOrd.estimatedTotal * 0.5) : sampleOrd.estimatedTotal) : 520
                });

                const isCopied = templateCopiedId === template.id;

                return (
                  <div 
                    key={template.id} 
                    className="glass" 
                    style={{
                      padding: '1.5rem',
                      background: '#ffffff',
                      borderRadius: '16px',
                      border: '1px solid rgba(214, 204, 194, 0.7)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      {/* Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '1.4rem' }}>{template.icon}</span>
                          <h4 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 800 }}>
                            {template.name}
                          </h4>
                        </div>
                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '6px',
                          background: 'rgba(234, 88, 12, 0.1)',
                          color: 'var(--accent-color)',
                          whiteSpace: 'nowrap'
                        }}>
                          {template.category}
                        </span>
                      </div>

                      <p style={{ margin: '0 0 0.85rem 0', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.35 }}>
                        {template.description}
                      </p>

                      {/* Subject Preview */}
                      <div style={{ marginBottom: '0.75rem' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', display: 'block', marginBottom: '0.2rem' }}>
                          Asunto:
                        </span>
                        <div style={{
                          padding: '0.5rem 0.75rem',
                          borderRadius: '8px',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          color: '#1e293b'
                        }}>
                          {rendered.subject}
                        </div>
                      </div>

                      {/* Body Preview */}
                      <div style={{ marginBottom: '1.25rem' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', display: 'block', marginBottom: '0.2rem' }}>
                          Cuerpo del Mensaje:
                        </span>
                        <div style={{
                          padding: '0.75rem',
                          borderRadius: '8px',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          fontSize: '0.78rem',
                          color: '#334155',
                          whiteSpace: 'pre-wrap',
                          maxHeight: '140px',
                          overflowY: 'auto',
                          lineHeight: 1.45,
                          fontFamily: 'system-ui, sans-serif'
                        }}>
                          {rendered.body}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '0.65rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
                      <button
                        type="button"
                        onClick={() => handleCopyTemplate(template)}
                        className="btn btn-secondary"
                        style={{ flex: 1, padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}
                      >
                        {isCopied ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                        {isCopied ? '¡Copiado!' : 'Copiar Texto'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApplyTemplate(template)}
                        className="btn btn-primary"
                        style={{ flex: 1, padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}
                      >
                        <Sparkles size={14} /> Cargar en Redactor
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* VIEW 2: SMTP CONFIGURATION */}
      {activeEmailTab === 'config' && (
        <div className="glass" style={{ padding: '2rem', background: '#ffffff', borderRadius: '20px', border: '1px solid rgba(214, 204, 194, 0.7)', maxWidth: '720px' }}>
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
                <li>Google te mostrará un código de <strong>16 letras</strong> (ej: <code>abcd efgh ijkl mnop</code>).</li>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                  Contraseña de Aplicación de Google (16 caracteres)
                </label>
                <button 
                  type="button" 
                  onClick={() => setShowPass(!showPass)}
                  style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                >
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />} {showPass ? 'Ocultar' : 'Ver'}
                </button>
              </div>
              <input 
                type={showPass ? 'text' : 'password'}
                className="input-field"
                placeholder="ej. abcd efgh ijkl mnop"
                value={smtpForm.pass}
                onChange={e => setSmtpForm({ ...smtpForm, pass: e.target.value })}
                required
              />
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
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
                  Puerto SMTP
                </label>
                <input 
                  type="number"
                  className="input-field"
                  value={smtpForm.port}
                  onChange={e => setSmtpForm({ ...smtpForm, port: parseInt(e.target.value) || 465 })}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
              {saveSuccessMsg && (
                <span style={{ color: '#16a34a', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <CheckCircle2 size={16} /> {saveSuccessMsg}
                </span>
              )}
              {!saveSuccessMsg && <span></span>}

              <button 
                type="submit" 
                disabled={isSavingConfig}
                className="btn btn-primary"
                style={{ padding: '0.65rem 1.75rem', fontSize: '0.9rem' }}
              >
                {isSavingConfig ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />}
                Guardar Configuración
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VIEW 3: COMPOSE DIRECT MESSAGE & OUTBOX TABLE */}
      {activeEmailTab === 'compose' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Direct Message Compose Panel */}
          <div ref={composeFormContainerRef} className="glass" style={{ padding: '2rem', background: '#ffffff', borderRadius: '20px', border: '1px solid rgba(214, 204, 194, 0.7)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Send size={20} className="text-accent" />
                <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Compositor de Correos a Clientes</h4>
              </div>

              <button
                type="button"
                onClick={() => setActiveEmailTab('templates')}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: '8px',
                  background: 'rgba(234, 88, 12, 0.1)',
                  border: '1px solid rgba(234, 88, 12, 0.3)',
                  color: 'var(--accent-color)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <BookOpen size={14} /> Abrir Biblioteca de Plantillas ({EMAIL_TEMPLATES.length})
              </button>
            </div>

            <form onSubmit={handleSendCompose} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {orders.length > 0 && (
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem', color: 'var(--text-secondary)' }}>
                    Seleccionar Orden Existente para Autocompletar:
                  </label>
                  <select 
                    className="input-field"
                    style={{ fontSize: '0.85rem', padding: '0.5rem 0.75rem' }}
                    onChange={e => handleSelectOrderForCompose(e.target.value)}
                    value={composeTrackingId || ''}
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
                    Correo Destinatario *
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
                  Asunto del Correo *
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                    Mensaje *
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <select
                      className="input-field"
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.76rem', background: '#f8fafc' }}
                      onChange={(e) => {
                        const t = EMAIL_TEMPLATES.find(x => x.id === e.target.value);
                        if (t) handleApplyTemplate(t);
                      }}
                      defaultValue=""
                    >
                      <option value="" disabled>⚡ Cargar plantilla rápida...</option>
                      {EMAIL_TEMPLATES.map(t => (
                        <option key={t.id} value={t.id}>{t.icon} {t.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <textarea 
                  className="input-field"
                  rows={5}
                  placeholder="Escribe el mensaje que deseas enviar al cliente o selecciona una plantilla arriba..."
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

          {/* FULL OUTBOX LOGS & PREVIEW TABLE */}
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
              onClick={() => loadData(true)}
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
    </div>
  )}

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
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(selectedPreview.html) }} 
            />
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminEmailManager;
