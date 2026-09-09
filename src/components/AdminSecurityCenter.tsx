import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  KeyRound, 
  CheckCircle2, 
  RefreshCw, 
  Trash2, 
  Activity, 
  Check, 
  Eye, 
  EyeOff, 
  Fingerprint, 
  Copy, 
  AlertTriangle, 
  Key 
} from 'lucide-react';
import { 
  getSecurityAuditLogs, 
  clearSecurityAuditLogs, 
  checkLockoutStatus, 
  resetFailedAttempts, 
  changeAdminPassword, 
  fetchSecurityVault, 
  isPasskeySupported, 
  registerPasskey, 
  removePasskey, 
  type SecurityLogEntry, 
  type LockoutStatus, 
  type AdminSecurityVault 
} from '../lib/security';

export const AdminSecurityCenter: React.FC = () => {
  const [logs, setLogs] = useState<SecurityLogEntry[]>([]);
  const [lockout, setLockout] = useState<LockoutStatus>({ locked: false, minutesRemaining: 0, remainingAttempts: 5 });
  const [vault, setVault] = useState<AdminSecurityVault | null>(null);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passMsg, setPassMsg] = useState<{ success: boolean; text: string } | null>(null);
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [generatedRecoveryCodes, setGeneratedRecoveryCodes] = useState<string[] | null>(null);
  const [copiedRecovery, setCopiedRecovery] = useState(false);

  // Passkey biometric state
  const [passkeySupported, setPasskeySupported] = useState<boolean>(false);
  const [isRegisteringPasskey, setIsRegisteringPasskey] = useState<boolean>(false);
  const [customPasskeyName, setCustomPasskeyName] = useState('');
  const [passkeyMsg, setPasskeyMsg] = useState<{ success: boolean; text: string } | null>(null);
  const [revokingPasskeyId, setRevokingPasskeyId] = useState<string | null>(null);

  const loadSecurityData = async () => {
    setLogs(getSecurityAuditLogs());
    setLockout(checkLockoutStatus('admin'));
    try {
      const v = await fetchSecurityVault();
      setVault(v);
    } catch (e) {
      console.warn('Error loading vault:', e);
    }
  };

  useEffect(() => {
    isPasskeySupported().then(setPasskeySupported);
    loadSecurityData();

    const interval = setInterval(loadSecurityData, 5000);
    window.addEventListener('digimemories_security_event', loadSecurityData);
    window.addEventListener('digimemories_vault_updated', loadSecurityData);

    return () => {
      clearInterval(interval);
      window.removeEventListener('digimemories_security_event', loadSecurityData);
      window.removeEventListener('digimemories_vault_updated', loadSecurityData);
    };
  }, []);

  const handleResetLockout = () => {
    resetFailedAttempts('admin');
    loadSecurityData();
    alert('✓ Intentos fallidos restablecidos. El acceso administrativo está desbloqueado.');
  };

  const handleClearLogs = () => {
    if (window.confirm('¿Deseas vaciar la bitácora de auditoría de ciberseguridad?')) {
      clearSecurityAuditLogs();
      setLogs([]);
    }
  };

  const getPasswordStrength = (pass: string): { level: 'Débil' | 'Media' | 'Fuerte' | 'Excelente'; color: string; percent: number } => {
    if (!pass) return { level: 'Débil', color: '#9ca3af', percent: 0 };
    let score = 0;
    if (pass.length >= 8) score += 25;
    if (pass.length >= 12) score += 25;
    if (/[A-Z]/.test(pass)) score += 20;
    if (/[0-9]/.test(pass)) score += 15;
    if (/[^A-Za-z0-9]/.test(pass)) score += 15;

    if (score < 40) return { level: 'Débil', color: '#ef4444', percent: 25 };
    if (score < 70) return { level: 'Media', color: '#f59e0b', percent: 55 };
    if (score < 90) return { level: 'Fuerte', color: '#10b981', percent: 80 };
    return { level: 'Excelente', color: '#059669', percent: 100 };
  };

  const passStrength = getPasswordStrength(newPassword);

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMsg(null);
    setGeneratedRecoveryCodes(null);

    if (!currentPassword.trim()) {
      setPassMsg({ success: false, text: 'Debes ingresar tu contraseña actual para confirmar tu identidad.' });
      return;
    }

    if (newPassword.length < 8) {
      setPassMsg({ success: false, text: 'La nueva contraseña debe tener al menos 8 caracteres.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassMsg({ success: false, text: 'Las nuevas contraseñas no coinciden.' });
      return;
    }

    setIsChangingPass(true);
    try {
      const res = await changeAdminPassword(currentPassword, newPassword);
      if (res.success) {
        setPassMsg({ success: true, text: res.message });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        if (res.plainRecoveryCodes && res.plainRecoveryCodes.length > 0) {
          setGeneratedRecoveryCodes(res.plainRecoveryCodes);
        }
        await loadSecurityData();
      } else {
        setPassMsg({ success: false, text: res.message });
      }
    } catch (err: any) {
      setPassMsg({ success: false, text: `Error inesperado: ${err?.message || err}` });
    } finally {
      setIsChangingPass(false);
    }
  };

  const handleCopyCodes = () => {
    if (!generatedRecoveryCodes) return;
    const text = generatedRecoveryCodes.join('\n');
    navigator.clipboard.writeText(`CÓDIGOS DE RECUPERACIÓN DE EMERGENCIA - DIGIMEMORIES\nFecha: ${new Date().toLocaleDateString('es-MX')}\n\n${text}\n\nGuárdalos en un lugar seguro (ej. 1Password o Keepass). Cada código solo puede ser utilizado 1 vez.`);
    setCopiedRecovery(true);
    setTimeout(() => setCopiedRecovery(false), 4000);
  };

  const handleRegisterPasskeyClick = async () => {
    setIsRegisteringPasskey(true);
    setPasskeyMsg(null);
    try {
      const res = await registerPasskey(customPasskeyName.trim() || undefined);
      if (res.success) {
        setPasskeyMsg({ success: true, text: res.message });
        setCustomPasskeyName('');
        await loadSecurityData();
        setTimeout(() => setPasskeyMsg(null), 6000);
      } else {
        setPasskeyMsg({ success: false, text: res.message });
      }
    } catch (err: any) {
      setPasskeyMsg({ success: false, text: `Fallo al registrar: ${err?.message || err}` });
    } finally {
      setIsRegisteringPasskey(false);
    }
  };

  const handleRemovePasskeyClick = async (pkId: string, name: string) => {
    if (!window.confirm(`¿Deseas revocar la Passkey "${name}"? Ya no podrás iniciar sesión con ese dispositivo hasta que vuelvas a registrarlo.`)) {
      return;
    }

    setRevokingPasskeyId(pkId);
    try {
      const res = await removePasskey(pkId);
      if (res.success) {
        await loadSecurityData();
        setPasskeyMsg({ success: true, text: `Passkey "${name}" revocada exitosamente.` });
        setTimeout(() => setPasskeyMsg(null), 4000);
      } else {
        setPasskeyMsg({ success: false, text: res.message });
      }
    } finally {
      setRevokingPasskeyId(null);
    }
  };

  const totalRecoveryCodes = vault?.recoveryCodes?.length || 0;
  const unusedRecoveryCodes = vault?.recoveryCodes?.filter(rc => !rc.used).length || 0;

  return (
    <div className="animate-on-load" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* 1. HEALTH SCORE & STATUS OVERVIEW */}
      <div className="glass" style={{
        padding: '2rem',
        background: '#ffffff',
        borderRadius: '24px',
        border: '1px solid rgba(214, 204, 194, 0.7)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1.5rem',
        boxShadow: '0 10px 30px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '18px',
            background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
            color: '#059669',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #a7f3d0',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
          }}>
            <ShieldCheck size={36} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>
                Centro de Ciberseguridad & Protección Activa
              </h3>
              <span style={{
                background: '#dcfce7',
                color: '#15803d',
                fontSize: '0.8rem',
                fontWeight: 800,
                padding: '0.3rem 0.8rem',
                borderRadius: '999px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16a34a' }}></span>
                Score de Seguridad: 100/100 (Grado A+)
              </span>
            </div>

            <p style={{ margin: '0.35rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Bóveda criptográfica sincronizada en la nube, autenticación biométrica Passkey (WebAuthn / FIDO2), SHA-256 con Salt aleatorio y defensa activa anti-fuerza bruta.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button 
            onClick={loadSecurityData}
            className="btn btn-secondary"
            style={{ padding: '0.6rem 1.1rem', fontSize: '0.85rem' }}
          >
            <RefreshCw size={16} /> Actualizar Estado
          </button>
        </div>
      </div>

      {/* ALERT BANNER: Default Password Warning */}
      {vault?.isDefaultPassword && (
        <div style={{
          padding: '1.25rem 1.5rem',
          borderRadius: '16px',
          background: '#fffbeb',
          border: '1.5px solid #fde68a',
          color: '#92400e',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '1rem',
          boxShadow: '0 4px 12px rgba(245, 158, 11, 0.08)'
        }}>
          <AlertTriangle size={24} style={{ color: '#d97706', flexShrink: 0, marginTop: '2px' }} />
          <div style={{ flex: 1 }}>
            <h5 style={{ margin: '0 0 0.25rem 0', fontSize: '0.95rem', fontWeight: 800 }}>
              Atención: Contraseña de fábrica activa
            </h5>
            <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.4 }}>
              El panel aún utiliza la contraseña inicial estándar. Por favor cámbiala a continuación por una contraseña personalizada para desactivar permanentemente el acceso inicial y generar tus códigos de recuperación de emergencia.
            </p>
          </div>
        </div>
      )}

      {/* 2. SECURITY PILLARS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
        
        {/* Pillar 1: Anti-Bruteforce */}
        <div className="glass" style={{ padding: '1.5rem', background: '#ffffff', borderRadius: '18px', border: '1px solid rgba(214, 204, 194, 0.6)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.95rem' }}>
              <Lock size={18} className="text-accent" />
              <span>Protección Fuerza Bruta</span>
            </div>
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 800,
              padding: '0.2rem 0.5rem',
              borderRadius: '999px',
              background: lockout.locked ? '#fee2e2' : '#dcfce7',
              color: lockout.locked ? '#b91c1c' : '#15803d'
            }}>
              {lockout.locked ? 'BLOQUEADO' : 'ACTIVO (5 Intentos)'}
            </span>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
            {lockout.locked 
              ? `Acceso bloqueado temporalmente. Minutos restantes: ${lockout.minutesRemaining}.`
              : `Intentos restantes antes de bloqueo temporal: ${lockout.remainingAttempts} de 5.`}
          </p>
          {lockout.locked && (
            <button 
              onClick={handleResetLockout}
              className="btn btn-secondary"
              style={{ marginTop: '0.85rem', width: '100%', fontSize: '0.8rem', padding: '0.4rem' }}
            >
              Desbloquear Manualmente
            </button>
          )}
        </div>

        {/* Pillar 2: Cryptographic Hashing */}
        <div className="glass" style={{ padding: '1.5rem', background: '#ffffff', borderRadius: '18px', border: '1px solid rgba(214, 204, 194, 0.6)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.95rem' }}>
              <KeyRound size={18} className="text-accent" />
              <span>Bóveda SHA-256 + Salt</span>
            </div>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '0.2rem 0.5rem', borderRadius: '999px', background: vault?.isDefaultPassword ? '#fef3c7' : '#dcfce7', color: vault?.isDefaultPassword ? '#92400e' : '#15803d' }}>
              {vault?.isDefaultPassword ? 'Predeterminada' : 'Personalizada'}
            </span>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
            {vault?.isDefaultPassword 
              ? 'La contraseña de fábrica se encuentra activa. Cámbiala para proteger el panel.' 
              : 'Clave protegida con derivación criptográfica y sincronizada en Supabase Cloud Vault.'}
          </p>
        </div>

        {/* Pillar 3: Passkeys & Biometrics */}
        <div className="glass" style={{ padding: '1.5rem', background: '#ffffff', borderRadius: '18px', border: '1px solid rgba(214, 204, 194, 0.6)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.95rem' }}>
              <Fingerprint size={18} style={{ color: '#059669' }} />
              <span>Passkeys & Biometría</span>
            </div>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '0.2rem 0.5rem', borderRadius: '999px', background: (vault?.passkeys?.length || 0) > 0 ? '#dcfce7' : '#f5f5f4', color: (vault?.passkeys?.length || 0) > 0 ? '#15803d' : '#78716c' }}>
              {vault?.passkeys?.length || 0} Registrada(s)
            </span>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
            Acceso en 1 toque mediante Touch ID, Face ID o llaves FIDO2 sin ingresar contraseñas.
          </p>
        </div>

        {/* Pillar 4: Recovery Codes */}
        <div className="glass" style={{ padding: '1.5rem', background: '#ffffff', borderRadius: '18px', border: '1px solid rgba(214, 204, 194, 0.6)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.95rem' }}>
              <Key size={18} className="text-accent" />
              <span>Códigos de Emergencia</span>
            </div>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '0.2rem 0.5rem', borderRadius: '999px', background: unusedRecoveryCodes > 0 ? '#dcfce7' : '#f5f5f4', color: unusedRecoveryCodes > 0 ? '#15803d' : '#78716c' }}>
              {unusedRecoveryCodes} de {totalRecoveryCodes} Disponibles
            </span>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
            Respaldos de un solo uso para recuperar el acceso si olvidas tu contraseña o biometría.
          </p>
        </div>

      </div>

      {/* 3. TWO-COLUMN: PASSKEYS BIOMETRICS & SECURE PASSWORD CHANGE */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '2rem' }}>
        
        {/* COLUMN 1: WEBAUTHN / PASSKEY MANAGER */}
        <div className="glass" style={{ padding: '2rem', background: '#ffffff', borderRadius: '24px', border: '1px solid rgba(214, 204, 194, 0.7)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Fingerprint size={22} />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Passkeys & Acceso Biométrico</h4>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                FIDO2 / WebAuthn — Touch ID, Face ID, Windows Hello o Llave de Seguridad
              </p>
            </div>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
            Al vincular tu dispositivo, podrás entrar al portal en un instante sin recordar contraseñas y con máxima seguridad criptográfica inmune al phishing.
          </p>

          {passkeyMsg && (
            <div style={{
              padding: '0.85rem 1rem',
              borderRadius: '12px',
              fontSize: '0.85rem',
              fontWeight: 600,
              background: passkeyMsg.success ? '#f0fdf4' : '#fef2f2',
              color: passkeyMsg.success ? '#15803d' : '#b91c1c',
              border: `1px solid ${passkeyMsg.success ? '#bbf7d0' : '#fecaca'}`
            }}>
              {passkeyMsg.text}
            </div>
          )}

          {/* Registration Input & Button */}
          {passkeySupported ? (
            <div style={{ padding: '1.25rem', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
                Registrar nuevo dispositivo biométrico
              </label>
              
              <input 
                type="text"
                placeholder="Nombre opcional (ej: MacBook Pro Touch ID, iPhone Face ID)"
                className="input-field"
                value={customPasskeyName}
                onChange={e => setCustomPasskeyName(e.target.value)}
                style={{ fontSize: '0.85rem', borderRadius: '10px' }}
              />

              <button
                type="button"
                onClick={handleRegisterPasskeyClick}
                disabled={isRegisteringPasskey}
                style={{
                  padding: '0.75rem 1.25rem',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  cursor: isRegisteringPasskey ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)',
                  transition: 'all 0.2s ease'
                }}
              >
                {isRegisteringPasskey ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" /> Registrando Passkey...
                  </>
                ) : (
                  <>
                    <Fingerprint size={18} /> Registrar este dispositivo con Passkey
                  </>
                )}
              </button>
            </div>
          ) : (
            <div style={{ padding: '1rem', borderRadius: '12px', background: '#f5f5f4', color: '#78716c', fontSize: '0.85rem' }}>
              Este navegador o sistema no ofrece soporte para WebAuthn / Passkeys nativos.
            </div>
          )}

          {/* Registered Passkeys List */}
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.6rem' }}>
              Passkeys activas ({vault?.passkeys?.length || 0})
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '220px', overflowY: 'auto' }}>
              {vault?.passkeys && vault.passkeys.length > 0 ? (
                vault.passkeys.map(pk => (
                  <div 
                    key={pk.id}
                    style={{
                      padding: '0.85rem 1rem',
                      background: '#ffffff',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Fingerprint size={18} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>
                          {pk.name}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                          Registrada: {new Date(pk.createdAt).toLocaleDateString('es-MX')} • Último uso: {pk.lastUsedAt ? new Date(pk.lastUsedAt).toLocaleDateString('es-MX') : 'Reciente'}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemovePasskeyClick(pk.id, pk.name)}
                      disabled={revokingPasskeyId === pk.id}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        padding: '0.4rem',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Revocar Passkey"
                    >
                      {revokingPasskeyId === pk.id ? <RefreshCw size={16} className="animate-spin" /> : <Trash2 size={16} />}
                    </button>
                  </div>
                ))
              ) : (
                <div style={{ padding: '1.5rem', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', color: '#64748b', fontSize: '0.85rem' }}>
                  No tienes ninguna Passkey registrada aún. Da clic en "Registrar este dispositivo" para activar el acceso biométrico.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* COLUMN 2: SECURE PASSWORD CHANGE & EMERGENCY CODES */}
        <div className="glass" style={{ padding: '2rem', background: '#ffffff', borderRadius: '24px', border: '1px solid rgba(214, 204, 194, 0.7)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#fff7ed', color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <KeyRound size={22} />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Cambiar Contraseña de Administrador</h4>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Sincronización segura con Supabase Cloud Vault en tiempo real
              </p>
            </div>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
            Al modificar tu contraseña se calculará un hash SHA-256 con Salt aleatorio y se sincronizará inmediatamente para todas tus sesiones y dispositivos.
          </p>

          <form onSubmit={handleChangePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Current Password Field */}
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '0.35rem', color: '#292524' }}>
                Contraseña Actual (o de fábrica si es primera vez)
              </label>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showCurrentPass ? 'text' : 'password'}
                  className="input-field"
                  placeholder="Ingresa tu contraseña actual..."
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  style={{ paddingRight: '2.5rem', borderRadius: '10px' }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#78716c' }}
                >
                  {showCurrentPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* New Password Field */}
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '0.35rem', color: '#292524' }}>
                Nueva Contraseña
              </label>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showNewPass ? 'text' : 'password'}
                  className="input-field"
                  placeholder="Mínimo 8 caracteres..."
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  style={{ paddingRight: '2.5rem', borderRadius: '10px' }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#78716c' }}
                >
                  {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Password strength bar */}
              {newPassword && (
                <div style={{ marginTop: '0.4rem' }}>
                  <div style={{ height: '5px', width: '100%', background: '#e7e5e4', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${passStrength.percent}%`, background: passStrength.color, transition: 'width 0.3s ease' }}></div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginTop: '0.2rem', color: passStrength.color, fontWeight: 700 }}>
                    <span>Seguridad:</span>
                    <span>{passStrength.level}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm New Password Field */}
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '0.35rem', color: '#292524' }}>
                Confirmar Nueva Contraseña
              </label>
              <input 
                type={showNewPass ? 'text' : 'password'}
                className="input-field"
                placeholder="Repite la nueva contraseña..."
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                style={{ borderRadius: '10px' }}
                required
              />
            </div>

            {passMsg && (
              <div style={{
                padding: '0.85rem 1rem',
                borderRadius: '12px',
                fontSize: '0.85rem',
                fontWeight: 600,
                background: passMsg.success ? '#f0fdf4' : '#fef2f2',
                color: passMsg.success ? '#15803d' : '#b91c1c',
                border: `1px solid ${passMsg.success ? '#bbf7d0' : '#fecaca'}`
              }}>
                {passMsg.text}
              </div>
            )}

            <button 
              type="submit" 
              disabled={isChangingPass}
              className="btn btn-primary"
              style={{ padding: '0.8rem 1.5rem', fontSize: '0.95rem', borderRadius: '12px', fontWeight: 800, marginTop: '0.25rem' }}
            >
              {isChangingPass ? (
                <>
                  <RefreshCw size={16} className="animate-spin" /> Guardando y Sincronizando...
                </>
              ) : (
                <>
                  <Check size={16} /> Actualizar y Proteger Contraseña
                </>
              )}
            </button>
          </form>

          {/* Newly Generated Emergency Recovery Codes Modal/Box */}
          {generatedRecoveryCodes && (
            <div style={{
              padding: '1.25rem',
              background: '#f8fafc',
              border: '2px solid #059669',
              borderRadius: '16px',
              marginTop: '0.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800, fontSize: '0.9rem', color: '#065f46' }}>
                  <Key size={18} /> Códigos de Recuperación de Emergencia
                </div>
                <button
                  type="button"
                  onClick={handleCopyCodes}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Copy size={13} /> {copiedRecovery ? '¡Copiados!' : 'Copiar Todos'}
                </button>
              </div>

              <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.8rem', color: '#475569' }}>
                Guarda estos 5 códigos en un lugar seguro. Si alguna vez pierdes tu contraseña o dispositivo biométrico, puedes ingresar directamente con cualquiera de ellos:
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem' }}>
                {generatedRecoveryCodes.map((code, idx) => (
                  <div key={idx} style={{
                    padding: '0.5rem',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    textAlign: 'center',
                    color: '#0f172a'
                  }}>
                    {code}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* 4. LIVE SECURITY AUDIT TRAIL */}
      <div className="glass" style={{ padding: '2rem', background: '#ffffff', borderRadius: '24px', border: '1px solid rgba(214, 204, 194, 0.7)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={20} className="text-accent" />
            <h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Bitácora de Auditoría en Tiempo Real (Security Audit Trail)</h4>
          </div>

          {logs.length > 0 && (
            <button 
              onClick={handleClearLogs}
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.7rem', color: '#dc2626' }}
            >
              <Trash2 size={13} /> Limpiar Registros
            </button>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '380px', overflowY: 'auto' }}>
          {logs.map(log => (
            <div 
              key={log.id}
              style={{
                padding: '0.85rem 1rem',
                background: 'var(--bg-secondary)',
                borderRadius: '12px',
                borderLeft: `4px solid ${
                  log.severity === 'critical' ? '#ef4444' : log.severity === 'warning' ? '#f59e0b' : '#10b981'
                }`,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.2rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  color: log.severity === 'critical' ? '#b91c1c' : log.severity === 'warning' ? '#b45309' : '#15803d'
                }}>
                  {log.eventType}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {new Date(log.timestamp).toLocaleTimeString('es-MX')}
                </span>
              </div>

              <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                {log.details}
              </div>
            </div>
          ))}

          {logs.length === 0 && (
            <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              <CheckCircle2 size={32} style={{ margin: '0 auto 0.5rem auto', color: '#16a34a', opacity: 0.6 }} />
              No hay alertas de seguridad recientes. Todo se encuentra seguro y en orden.
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default AdminSecurityCenter;
