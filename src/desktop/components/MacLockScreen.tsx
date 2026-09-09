import React, { useState } from 'react';
import { 
  KeyRound, 
  Fingerprint, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertTriangle, 
  RefreshCw, 
  ShieldCheck 
} from 'lucide-react';
import { 
  verifyAdminPassword, 
  createAdminSession, 
  checkLockoutStatus, 
  recordFailedLoginAttempt 
} from '../../lib/security';

interface MacLockScreenProps {
  onUnlock: () => void;
}

export const MacLockScreen: React.FC<MacLockScreenProps> = ({ onUnlock }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isTouchIDPrompting, setIsTouchIDPrompting] = useState(false);

  const hasElectronTouchID = typeof window !== 'undefined' && Boolean((window as any).macOSAdminApi?.promptTouchID);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanPass = password.trim();
    if (!cleanPass) return;

    const lockout = checkLockoutStatus('admin');
    if (lockout.locked) {
      setErrorMsg(`Acceso bloqueado por seguridad ante múltiples intentos fallidos. Reintenta en ${lockout.minutesRemaining} minuto(s).`);
      return;
    }

    setIsVerifying(true);
    try {
      const verification = await verifyAdminPassword(cleanPass);
      if (verification.isValid) {
        createAdminSession();
        setPassword('');
        setErrorMsg(null);
        onUnlock();
      } else {
        const result = recordFailedLoginAttempt('admin');
        if (result.locked) {
          setErrorMsg('Límite de 5 intentos fallidos alcanzado. Sesión bloqueada temporalmente por 15 minutos.');
        } else {
          setErrorMsg(`Credencial incorrecta. Quedan ${result.remainingAttempts} intento(s) antes del bloqueo.`);
        }
      }
    } catch (err: any) {
      setErrorMsg(`Error de verificación: ${err?.message || 'Error del sistema'}`);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleTouchIDClick = async () => {
    setErrorMsg(null);
    const lockout = checkLockoutStatus('admin');
    if (lockout.locked) {
      setErrorMsg(`Acceso bloqueado por seguridad. Reintenta en ${lockout.minutesRemaining} minuto(s).`);
      return;
    }

    if (hasElectronTouchID) {
      setIsTouchIDPrompting(true);
      try {
        const res = await (window as any).macOSAdminApi.promptTouchID('Desbloquear DigiMemories Estación de Trabajo');
        if (res.success) {
          createAdminSession();
          setErrorMsg(null);
          onUnlock();
        } else {
          setErrorMsg(res.message);
        }
      } catch (err: any) {
        setErrorMsg(`Error Touch ID: ${err?.message || err}`);
      } finally {
        setIsTouchIDPrompting(false);
      }
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(10, 8, 7, 0.88)',
        backdropFilter: 'blur(36px)',
        WebkitBackdropFilter: 'blur(36px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem'
      }}
    >
      <div 
        className="mac-glass-panel"
        style={{
          maxWidth: '440px',
          width: '100%',
          borderRadius: '24px',
          padding: '2.75rem 2.25rem',
          textAlign: 'center',
          boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
          border: '1px solid rgba(255, 255, 255, 0.12)'
        }}
      >
        {/* App Icon Glow */}
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '20px',
          background: 'linear-gradient(135deg, rgba(234, 88, 12, 0.25) 0%, rgba(249, 115, 22, 0.1) 100%)',
          border: '1px solid rgba(234, 88, 12, 0.4)',
          color: 'var(--mac-accent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.25rem auto',
          boxShadow: '0 8px 24px rgba(234, 88, 12, 0.2)'
        }}>
          <KeyRound size={30} />
        </div>

        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 0.4rem 0', color: '#f5f5f4', letterSpacing: '-0.02em' }}>
          Estación de Trabajo Bloqueada
        </h2>
        <p style={{ margin: '0 0 1.75rem 0', fontSize: '0.85rem', color: 'var(--mac-text-muted)', lineHeight: 1.4 }}>
          Ingresa tu contraseña de administrador, Touch ID o un código de recuperación de emergencia.
        </p>

        {errorMsg && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            color: '#fca5a5',
            padding: '0.8rem 1rem',
            borderRadius: '12px',
            fontSize: '0.82rem',
            marginBottom: '1.25rem',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.5rem'
          }}>
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px', color: '#ef4444' }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Native Touch ID button if supported */}
        {hasElectronTouchID && (
          <div style={{ marginBottom: '1.5rem' }}>
            <button
              type="button"
              onClick={handleTouchIDClick}
              disabled={isTouchIDPrompting}
              style={{
                width: '100%',
                padding: '0.85rem 1.25rem',
                borderRadius: '14px',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.15) 100%)',
                color: '#6ee7b7',
                fontWeight: 700,
                fontSize: '0.92rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.65rem',
                cursor: isTouchIDPrompting ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 16px rgba(16, 185, 129, 0.15)',
                transition: 'all 0.15s ease'
              }}
            >
              {isTouchIDPrompting ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  <span>Esperando Touch ID...</span>
                </>
              ) : (
                <>
                  <Fingerprint size={20} style={{ color: '#10b981' }} />
                  <span>Desbloquear con Touch ID</span>
                </>
              )}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', margin: '1.25rem 0', gap: '0.75rem' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--mac-border)' }}></div>
              <span style={{ fontSize: '0.7rem', color: 'var(--mac-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>O con contraseña</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--mac-border)' }}></div>
            </div>
          </div>
        )}

        {/* Password or Emergency Code form */}
        <form onSubmit={handlePasswordSubmit} style={{ textAlign: 'left' }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--mac-text-secondary)', marginBottom: '0.4rem' }}>
              Contraseña o Código de Emergencia
            </label>

            <div style={{ position: 'relative' }}>
              <input 
                type={showPassword ? 'text' : 'password'}
                placeholder="Contraseña o DM-XXXX-XXXX"
                className="mac-input"
                style={{ width: '100%', paddingRight: '2.5rem', boxSizing: 'border-box' }}
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--mac-text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title={showPassword ? 'Ocultar' : 'Mostrar'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isVerifying}
            className="mac-btn-primary"
            style={{ width: '100%', padding: '0.75rem', justifyContent: 'center', borderRadius: '12px' }}
          >
            {isVerifying ? (
              <>
                <RefreshCw size={16} className="animate-spin" /> Verificando...
              </>
            ) : (
              <>
                <Lock size={15} /> Desbloquear Estación
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', color: 'var(--mac-text-muted)', fontSize: '0.72rem' }}>
          <ShieldCheck size={14} style={{ color: '#10b981' }} />
          <span>Bóveda criptográfica protegida en Supabase Cloud.</span>
        </div>
      </div>
    </div>
  );
};

export default MacLockScreen;
