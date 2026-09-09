import DOMPurify from 'dompurify';
import { supabase } from './supabase';

export interface SecurityLogEntry {
  id: string;
  timestamp: string;
  eventType: 
    | 'LOGIN_SUCCESS' 
    | 'LOGIN_FAILED' 
    | 'ACCOUNT_LOCKED' 
    | 'PASSWORD_CHANGED' 
    | 'PASSKEY_REGISTERED' 
    | 'PASSKEY_AUTH_SUCCESS' 
    | 'PASSKEY_REMOVED' 
    | 'RECOVERY_CODE_USED'
    | 'UNAUTHORIZED_ACCESS' 
    | 'RATE_LIMIT_EXCEEDED' 
    | 'PIN_VERIFIED' 
    | 'PIN_FAILED';
  severity: 'info' | 'warning' | 'critical';
  details: string;
  userAgent?: string;
}

export interface LockoutStatus {
  locked: boolean;
  minutesRemaining: number;
  remainingAttempts: number;
}

export interface StoredPasskey {
  id: string; // Base64URL credential ID
  name: string;
  createdAt: string;
  lastUsedAt?: string;
  transports?: string[];
}

export interface RecoveryCodeEntry {
  codeHash: string;
  preview: string; // e.g. "DM-A1••-••••"
  used: boolean;
  usedAt?: string;
}

export interface AdminSecurityVault {
  passwordHash: string;
  passwordSalt: string;
  isDefaultPassword: boolean;
  updatedAt: string;
  passkeys: StoredPasskey[];
  recoveryCodes: RecoveryCodeEntry[];
}

const SECURITY_LOGS_KEY = 'digimemories_sec_logs';
const FAILED_ATTEMPTS_KEY = 'digimemories_sec_attempts';
const ADMIN_SESSION_KEY = 'digimemories_sec_session';
const VAULT_LOCAL_KEY = 'digimemories_sec_vault_v2';
const VAULT_CLOUD_ROW_ID = 'admin_security_vault_v1';

// Initial default configuration for first run (admin123)
const DEFAULT_SALT = 'e7b8f9a0c1d2e3f4';
const DEFAULT_ADMIN_HASH = '50b458beb1d23e97fea9b4d2cd02af394c9d07a3a2e1410282ad5aa21bb7bb8d'; // SHA-256 for admin123 + salt

/**
 * Generate a cryptographically secure random salt in hex format
 */
export function generateCryptographicSalt(): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Native cryptographic hashing using Web Crypto API (SHA-256 + Salt)
 */
export async function hashPassword(password: string, salt: string = DEFAULT_SALT): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt + '_digimemories_sec_vault_v2');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generates an array of secure emergency recovery backup codes
 */
export async function generateEmergencyRecoveryCodes(salt: string, count: number = 5): Promise<{
  plainCodes: string[];
  vaultEntries: RecoveryCodeEntry[];
}> {
  const plainCodes: string[] = [];
  const vaultEntries: RecoveryCodeEntry[] = [];

  for (let i = 0; i < count; i++) {
    const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(4)))
      .map(b => b.toString(16).padStart(2, '0').toUpperCase())
      .join('');
    const code = `DM-${randomHex.substring(0, 4)}-${randomHex.substring(4, 8)}`;
    plainCodes.push(code);

    const codeHash = await hashPassword(code.replace(/[-\s]/g, '').toUpperCase(), salt);
    vaultEntries.push({
      codeHash,
      preview: `${code.substring(0, 5)}••••-••••`,
      used: false
    });
  }

  return { plainCodes, vaultEntries };
}

/**
 * Fetches the Security Vault from Supabase Cloud with fallback to LocalStorage
 */
export async function fetchSecurityVault(): Promise<AdminSecurityVault> {
  let localVault: AdminSecurityVault | null = null;
  try {
    const raw = localStorage.getItem(VAULT_LOCAL_KEY);
    if (raw) localVault = JSON.parse(raw);
  } catch {}

  try {
    const { data, error } = await supabase
      .from('email_logs')
      .select('body_html')
      .eq('id', VAULT_CLOUD_ROW_ID)
      .maybeSingle();

    if (!error && data && data.body_html) {
      const cloudVault: AdminSecurityVault = JSON.parse(data.body_html);
      localStorage.setItem(VAULT_LOCAL_KEY, JSON.stringify(cloudVault));
      return cloudVault;
    }
  } catch (err) {
    console.warn('[Security Vault] Cloud sync fallback:', err);
  }

  if (localVault) {
    return localVault;
  }

  // Initial pristine state
  const initialVault: AdminSecurityVault = {
    passwordHash: DEFAULT_ADMIN_HASH,
    passwordSalt: DEFAULT_SALT,
    isDefaultPassword: true,
    updatedAt: new Date().toISOString(),
    passkeys: [],
    recoveryCodes: []
  };

  localStorage.setItem(VAULT_LOCAL_KEY, JSON.stringify(initialVault));
  return initialVault;
}

/**
 * Saves the Security Vault to Supabase Cloud and LocalStorage
 */
export async function saveSecurityVault(vault: AdminSecurityVault): Promise<boolean> {
  vault.updatedAt = new Date().toISOString();
  
  // 1. Local Cache
  try {
    localStorage.setItem(VAULT_LOCAL_KEY, JSON.stringify(vault));
    window.dispatchEvent(new CustomEvent('digimemories_vault_updated', { detail: vault }));
  } catch (e) {
    console.warn('[Security Vault] Local storage write notice:', e);
  }

  // 2. Supabase Cloud Vault
  try {
    const { error } = await supabase
      .from('email_logs')
      .upsert({
        id: VAULT_CLOUD_ROW_ID,
        order_id: null,
        to_email: 'security-vault@digimemories.local',
        to_name: 'Bóveda Criptográfica DigiMemories',
        subject: 'ADMIN_SECURITY_VAULT_PAYLOAD',
        snippet: `Vault actualizado: ${vault.passkeys.length} Passkeys • Personalizado: ${!vault.isDefaultPassword}`,
        type: 'security_vault',
        sent_at: vault.updatedAt,
        body_html: JSON.stringify(vault)
      }, { onConflict: 'id' });

    return !error;
  } catch (err) {
    console.warn('[Security Vault] Cloud write exception:', err);
    return false;
  }
}

/**
 * Verifies admin credentials against the stored cryptographic vault.
 * Default 'admin123' is ONLY valid when isDefaultPassword is true.
 * Once a custom password is set, 'admin123' is completely rejected.
 * Also supports emergency recovery codes.
 */
export async function verifyAdminPassword(password: string): Promise<{
  isValid: boolean;
  isRecoveryCode?: boolean;
}> {
  const clean = (password || '').trim();
  if (!clean) return { isValid: false };

  const vault = await fetchSecurityVault();

  // 1. If vault is still in pristine/default state
  if (vault.isDefaultPassword) {
    if (clean === 'admin123') {
      resetFailedAttempts('admin');
      return { isValid: true };
    }
  }

  // 2. If vault has been personalized, 'admin123' MUST be rejected
  if (!vault.isDefaultPassword && clean === 'admin123') {
    return { isValid: false };
  }

  // 3. Cryptographic hash check with the unique vault salt
  const computedHash = await hashPassword(clean, vault.passwordSalt);
  if (computedHash === vault.passwordHash) {
    resetFailedAttempts('admin');
    return { isValid: true };
  }

  // 4. Emergency recovery code check
  const cleanRecoveryInput = clean.replace(/[-\s]/g, '').toUpperCase();
  const recoveryHash = await hashPassword(cleanRecoveryInput, vault.passwordSalt);
  const matchedIndex = vault.recoveryCodes.findIndex(rc => !rc.used && rc.codeHash === recoveryHash);

  if (matchedIndex !== -1) {
    vault.recoveryCodes[matchedIndex].used = true;
    vault.recoveryCodes[matchedIndex].usedAt = new Date().toISOString();
    await saveSecurityVault(vault);
    resetFailedAttempts('admin');
    logSecurityEvent(
      'RECOVERY_CODE_USED',
      'critical',
      `Se utilizó con éxito el Código de Recuperación de Emergencia (${vault.recoveryCodes[matchedIndex].preview}) para acceder al panel.`
    );
    return { isValid: true, isRecoveryCode: true };
  }

  return { isValid: false };
}

/**
 * Securely changes the admin password.
 * Requires verification of current password or recovery code.
 * Syncs across all devices via Supabase Cloud Vault.
 */
export async function changeAdminPassword(
  currentPassword: string,
  newPassword: string
): Promise<{
  success: boolean;
  message: string;
  plainRecoveryCodes?: string[];
}> {
  const cleanCurrent = (currentPassword || '').trim();
  const cleanNew = (newPassword || '').trim();

  if (!cleanNew || cleanNew.length < 8) {
    return {
      success: false,
      message: 'La nueva contraseña debe contener al menos 8 caracteres para garantizar alta seguridad.'
    };
  }

  // Verify current password first
  const verification = await verifyAdminPassword(cleanCurrent);
  if (!verification.isValid) {
    return {
      success: false,
      message: 'La contraseña actual ingresada es incorrecta. Por favor verifica tus datos.'
    };
  }

  const vault = await fetchSecurityVault();

  // Generate fresh unique cryptographic salt
  const newSalt = generateCryptographicSalt();
  const newHash = await hashPassword(cleanNew, newSalt);

  // Generate 5 emergency backup codes
  const { plainCodes, vaultEntries } = await generateEmergencyRecoveryCodes(newSalt, 5);

  vault.passwordHash = newHash;
  vault.passwordSalt = newSalt;
  vault.isDefaultPassword = false;
  vault.recoveryCodes = vaultEntries;

  const saved = await saveSecurityVault(vault);

  logSecurityEvent(
    'PASSWORD_CHANGED',
    'info',
    'Contraseña de administrador actualizada con éxito mediante hash SHA-256 con Salt aleatorio y sincronizada en la nube.'
  );

  return {
    success: true,
    message: saved 
      ? 'Contraseña actualizada y sincronizada en la nube con éxito.'
      : 'Contraseña actualizada localmente.',
    plainRecoveryCodes: plainCodes
  };
}

/**
 * =========================================================================
 * WEBAUTHN / PASSKEYS (Biometric & Hardware Key Authentication)
 * =========================================================================
 */

export function bufferToBase64URL(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64URLToBuffer(base64url: string): ArrayBuffer {
  let str = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const binary = window.atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Checks if the current browser and platform support WebAuthn / Passkeys
 */
export async function isPasskeySupported(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!window.PublicKeyCredential) return false;
  if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
    try {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
      return true;
    }
  }
  return true;
}

/**
 * Registers a new biometric Passkey (Touch ID, Face ID, Windows Hello, YubiKey)
 */
export async function registerPasskey(customName?: string): Promise<{
  success: boolean;
  message: string;
  passkey?: StoredPasskey;
}> {
  const supported = await isPasskeySupported();
  if (!supported) {
    return {
      success: false,
      message: 'Tu navegador o dispositivo actual no cuenta con soporte para Passkeys o autenticación biométrica.'
    };
  }

  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userId = crypto.getRandomValues(new Uint8Array(16));

    const defaultDeviceName = customName || (
      /iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'Apple Face ID / Touch ID (iOS)' :
      /Mac/i.test(navigator.userAgent) ? 'Touch ID / Apple Keychain (macOS)' :
      /Windows/i.test(navigator.userAgent) ? 'Windows Hello / PIN' :
      /Android/i.test(navigator.userAgent) ? 'Biometría Android' :
      'Llave de Seguridad / Passkey'
    );

    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: 'DigiMemories México — Panel Seguro',
          id: window.location.hostname
        },
        user: {
          id: userId,
          name: 'admin@digimemories.com.mx',
          displayName: 'Administrador DigiMemories'
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },   // ES256 (ECDSA w/ SHA-256)
          { alg: -257, type: 'public-key' }  // RS256 (RSA w/ SHA-256)
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'preferred',
          residentKey: 'preferred'
        },
        timeout: 60000,
        attestation: 'none'
      }
    }) as PublicKeyCredential | null;

    if (!credential) {
      return { success: false, message: 'No se completó el registro de la Passkey en el dispositivo.' };
    }

    const base64Id = bufferToBase64URL(credential.rawId);
    const vault = await fetchSecurityVault();

    // Check if already registered
    const existingIndex = vault.passkeys.findIndex(p => p.id === base64Id);
    const newPasskey: StoredPasskey = {
      id: base64Id,
      name: defaultDeviceName,
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      vault.passkeys[existingIndex] = newPasskey;
    } else {
      vault.passkeys.push(newPasskey);
    }

    await saveSecurityVault(vault);

    logSecurityEvent(
      'PASSKEY_REGISTERED',
      'info',
      `Nueva Passkey biométrica registrada con éxito: "${defaultDeviceName}".`
    );

    return {
      success: true,
      message: `¡Passkey registrada exitosamente! Ahora puedes iniciar sesión con tu biometría (${defaultDeviceName}).`,
      passkey: newPasskey
    };
  } catch (err: any) {
    if (err?.name === 'NotAllowedError') {
      return { success: false, message: 'Operación cancelada por el usuario o tiempo de espera agotado.' };
    }
    return { success: false, message: `Error al registrar Passkey: ${err?.message || err}` };
  }
}

/**
 * Authenticates the admin using a registered Passkey (Touch ID / Face ID)
 */
export async function authenticateWithPasskey(): Promise<{
  success: boolean;
  message: string;
}> {
  const supported = await isPasskeySupported();
  if (!supported) {
    return {
      success: false,
      message: 'Este dispositivo o navegador no soporta autenticación por Passkey.'
    };
  }

  const vault = await fetchSecurityVault();
  if (!vault.passkeys || vault.passkeys.length === 0) {
    return {
      success: false,
      message: 'Aún no tienes ninguna Passkey registrada. Inicia sesión con tu contraseña y regístrala en el Centro de Seguridad.'
    };
  }

  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const allowCredentials = vault.passkeys.map(pk => ({
      id: base64URLToBuffer(pk.id),
      type: 'public-key' as const
    }));

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        rpId: window.location.hostname,
        allowCredentials,
        userVerification: 'required',
        timeout: 60000
      }
    }) as PublicKeyCredential | null;

    if (!assertion) {
      return { success: false, message: 'Autenticación biométrica no completada.' };
    }

    const matchedIndex = vault.passkeys.findIndex(pk => pk.id === bufferToBase64URL(assertion.rawId));
    if (matchedIndex === -1) {
      return { success: false, message: 'La credencial biométrica no corresponde a ninguna Passkey autorizada.' };
    }

    // Update last used timestamp
    vault.passkeys[matchedIndex].lastUsedAt = new Date().toISOString();
    await saveSecurityVault(vault);

    // Create session and reset attempts
    resetFailedAttempts('admin');
    createAdminSession();

    logSecurityEvent(
      'PASSKEY_AUTH_SUCCESS',
      'info',
      `Inicio de sesión exitoso mediante Passkey biométrica (${vault.passkeys[matchedIndex].name}).`
    );

    return {
      success: true,
      message: `¡Bienvenido! Autenticado exitosamente con ${vault.passkeys[matchedIndex].name}.`
    };
  } catch (err: any) {
    if (err?.name === 'NotAllowedError') {
      return { success: false, message: 'Verificación biométrica cancelada o denegada.' };
    }
    return { success: false, message: `Error al autenticar con Passkey: ${err?.message || err}` };
  }
}

/**
 * Revokes / removes a registered passkey from the vault
 */
export async function removePasskey(passkeyId: string): Promise<{ success: boolean; message: string }> {
  const vault = await fetchSecurityVault();
  const initialCount = vault.passkeys.length;
  vault.passkeys = vault.passkeys.filter(pk => pk.id !== passkeyId);

  if (vault.passkeys.length === initialCount) {
    return { success: false, message: 'No se encontró la Passkey especificada.' };
  }

  await saveSecurityVault(vault);
  logSecurityEvent('PASSKEY_REMOVED', 'warning', `Passkey revocada por el administrador.`);
  return { success: true, message: 'Passkey eliminada y revocada exitosamente.' };
}

/**
 * =========================================================================
 * AUDIT LOGGING, RATE LIMITING & BRUTE FORCE DEFENSE
 * =========================================================================
 */

export function logSecurityEvent(
  eventType: SecurityLogEntry['eventType'],
  severity: SecurityLogEntry['severity'],
  details: string
): void {
  try {
    const raw = localStorage.getItem(SECURITY_LOGS_KEY);
    const logs: SecurityLogEntry[] = raw ? JSON.parse(raw) : [];
    
    const newEntry: SecurityLogEntry = {
      id: `sec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      eventType,
      severity,
      details,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Server/Node'
    };

    logs.unshift(newEntry);
    localStorage.setItem(SECURITY_LOGS_KEY, JSON.stringify(logs.slice(0, 100)));
    window.dispatchEvent(new CustomEvent('digimemories_security_event', { detail: newEntry }));
  } catch (e) {
    console.warn('[Security] Failed to write security log:', e);
  }
}

export function getSecurityAuditLogs(): SecurityLogEntry[] {
  try {
    const raw = localStorage.getItem(SECURITY_LOGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearSecurityAuditLogs(): void {
  localStorage.removeItem(SECURITY_LOGS_KEY);
}

/**
 * Brute-Force Defense: Evaluates and registers failed login attempts
 */
export function recordFailedLoginAttempt(identifier: string = 'admin'): LockoutStatus {
  try {
    const raw = localStorage.getItem(FAILED_ATTEMPTS_KEY);
    const attemptsData = raw ? JSON.parse(raw) : {};
    const current = attemptsData[identifier] || { count: 0, lockedUntil: null };

    current.count += 1;

    // Hard Lockout: 5 failed attempts locks the account for 15 minutes
    if (current.count >= 5) {
      current.lockedUntil = Date.now() + 15 * 60 * 1000;
      logSecurityEvent(
        'ACCOUNT_LOCKED',
        'critical',
        `Alerta de Fuerza Bruta: Se han alcanzado 5 intentos fallidos en '${identifier}'. Bloqueo de seguridad activado por 15 minutos.`
      );
    } else {
      logSecurityEvent(
        'LOGIN_FAILED',
        'warning',
        `Intento de acceso fallido para '${identifier}'. Intento ${current.count} de 5 antes de bloqueo temporal.`
      );
    }

    attemptsData[identifier] = current;
    localStorage.setItem(FAILED_ATTEMPTS_KEY, JSON.stringify(attemptsData));

    const minutesRemaining = current.lockedUntil ? Math.max(1, Math.ceil((current.lockedUntil - Date.now()) / (60 * 1000))) : 0;
    return {
      locked: !!(current.lockedUntil && current.lockedUntil > Date.now()),
      minutesRemaining,
      remainingAttempts: Math.max(0, 5 - current.count)
    };
  } catch {
    return { locked: false, minutesRemaining: 0, remainingAttempts: 5 };
  }
}

/**
 * Checks if an identifier is currently locked out
 */
export function checkLockoutStatus(identifier: string = 'admin'): LockoutStatus {
  try {
    const raw = localStorage.getItem(FAILED_ATTEMPTS_KEY);
    if (!raw) return { locked: false, minutesRemaining: 0, remainingAttempts: 5 };
    const attemptsData = JSON.parse(raw);
    const current = attemptsData[identifier];
    if (!current) return { locked: false, minutesRemaining: 0, remainingAttempts: 5 };

    if (current.lockedUntil && current.lockedUntil > Date.now()) {
      const minutesRemaining = Math.max(1, Math.ceil((current.lockedUntil - Date.now()) / (60 * 1000)));
      return { locked: true, minutesRemaining, remainingAttempts: 0 };
    }

    if (current.lockedUntil && current.lockedUntil <= Date.now()) {
      delete attemptsData[identifier];
      localStorage.setItem(FAILED_ATTEMPTS_KEY, JSON.stringify(attemptsData));
      return { locked: false, minutesRemaining: 0, remainingAttempts: 5 };
    }

    return { locked: false, minutesRemaining: 0, remainingAttempts: Math.max(0, 5 - current.count) };
  } catch {
    return { locked: false, minutesRemaining: 0, remainingAttempts: 5 };
  }
}

export function resetFailedAttempts(identifier: string = 'admin'): void {
  try {
    const raw = localStorage.getItem(FAILED_ATTEMPTS_KEY);
    if (raw) {
      const attemptsData = JSON.parse(raw);
      delete attemptsData[identifier];
      localStorage.setItem(FAILED_ATTEMPTS_KEY, JSON.stringify(attemptsData));
    }
  } catch (e) {
    console.warn('[Security] Failed to reset attempts:', e);
  }
}

/**
 * Creates a cryptographically random session token with automatic expiration (8 hours)
 */
export function createAdminSession(): string {
  const token = 'token_' + Array.from(crypto.getRandomValues(new Uint8Array(24)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  const session = {
    token,
    createdAt: Date.now(),
    expiresAt: Date.now() + 8 * 60 * 60 * 1000, // 8 hours absolute
    lastActivity: Date.now()
  };

  sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
  resetFailedAttempts('admin');
  logSecurityEvent('LOGIN_SUCCESS', 'info', 'Inicio de sesión de administrador autenticado exitosamente.');
  return token;
}

/**
 * Validates the current admin session and auto-expires if inactive (30m) or expired
 */
export function validateAdminSession(): boolean {
  try {
    const raw = sessionStorage.getItem(ADMIN_SESSION_KEY);
    if (!raw) return false;
    const session = JSON.parse(raw);

    const now = Date.now();
    if (now > session.expiresAt || (now - session.lastActivity) > 30 * 60 * 1000) {
      destroyAdminSession();
      logSecurityEvent('UNAUTHORIZED_ACCESS', 'warning', 'Sesión administrativa expirada por inactividad o límite temporal.');
      return false;
    }

    session.lastActivity = now;
    sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
    return true;
  } catch {
    return false;
  }
}

export function destroyAdminSession(): void {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
}

/**
 * XSS Sanitizer using DOMPurify
 */
export function sanitizeHtml(dirtyHtml: string): string {
  if (!dirtyHtml) return '';
  return DOMPurify.sanitize(dirtyHtml, {
    ALLOWED_TAGS: [
      'b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'thead', 'tbody', 
      'tr', 'th', 'td', 'div', 'span', 'code', 'pre', 'hr', 'blockquote'
    ],
    ALLOWED_ATTR: ['href', 'target', 'style', 'class', 'rel', 'title', 'width', 'height', 'cellpadding', 'cellspacing', 'role'],
    FORCE_BODY: false
  });
}

/**
 * Prevents CRLF (Carriage Return / Line Feed) Email Header Injections
 */
export function sanitizeHeaderValue(value: string): string {
  if (!value) return '';
  return value.replace(/[\r\n%0A%0D]/gi, '').trim();
}
