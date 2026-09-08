/**
 * Mercado Pago Service - DigiMemories
 * Maneja la creación dinámica de preferencias de pago (Checkout Pro),
 * links personalizados de pago, y detección de retornos aprobados.
 */

import { getBusinessSettings } from './businessSettings';
import { updateOrder, getOrderById } from './store';
import { updateOrderInCloud } from './supabase';

export interface CheckoutPreferenceParams {
  orderId: string;
  title: string;
  amount: number;
  clientEmail?: string;
  clientName?: string;
}

export interface PreferenceResponse {
  success: boolean;
  initPoint?: string;
  sandboxInitPoint?: string;
  preferenceId?: string;
  error?: string;
}

/**
 * Crea una preferencia de pago en Mercado Pago o devuelve el enlace directo configurado
 */
export async function createMercadoPagoPreference(params: CheckoutPreferenceParams): Promise<PreferenceResponse> {
  const settings = getBusinessSettings();

  // 1. Si hay Access Token configurado, intentar crear preferencia dinámica vía API Checkout Pro
  if (settings.mercadopagoAccessToken && settings.mercadopagoAccessToken.trim() !== '') {
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://digimemories.mx';
      
      const res = await fetch('/api/mercadopago', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'create-preference',
          orderId: params.orderId,
          title: params.title,
          amount: params.amount,
          clientEmail: params.clientEmail || settings.contactEmail || 'cliente@digimemories.mx',
          clientName: params.clientName || 'Cliente DigiMemories',
          accessToken: settings.mercadopagoAccessToken,
          sandbox: !!settings.mercadopagoSandbox,
          backUrlOrigin: origin
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && (data.initPoint || data.sandboxInitPoint)) {
          const targetUrl = settings.mercadopagoSandbox && data.sandboxInitPoint 
            ? data.sandboxInitPoint 
            : data.initPoint;
          return {
            success: true,
            initPoint: targetUrl,
            sandboxInitPoint: data.sandboxInitPoint,
            preferenceId: data.preferenceId
          };
        }
      }
      console.warn('[MercadoPago] Falló la creación vía API, utilizando enlace de fallback configurado.');
    } catch (err) {
      console.error('[MercadoPago] Error de comunicación con API de Mercado Pago:', err);
    }
  }

  // 2. Fallback: Usar Link de Pago Personalizado configurado por el administrador
  let fallbackLink = settings.mercadopagoPaymentLink || 'https://link.mercadopago.com.mx/digimemories';
  
  // Agregar parámetros descriptivos si el link lo permite
  if (fallbackLink.includes('link.mercadopago.com.mx')) {
    const separator = fallbackLink.includes('?') ? '&' : '?';
    fallbackLink = `${fallbackLink}${separator}amount=${Math.round(params.amount)}&description=${encodeURIComponent(params.title)}`;
  }

  return {
    success: true,
    initPoint: fallbackLink
  };
}

/**
 * Valida un Access Token de Mercado Pago conectándose al endpoint /users/me
 */
export async function testMercadoPagoConnection(accessToken: string): Promise<{ success: boolean; message: string; user?: any }> {
  if (!accessToken || accessToken.trim().length < 15) {
    return { success: false, message: 'El Access Token debe tener al menos 15 caracteres (ej. APP_USR-... o TEST-...)' };
  }

  try {
    const res = await fetch('/api/mercadopago', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'test-connection',
        accessToken: accessToken.trim()
      })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { success: false, message: errData.error || `Error del servidor HTTP ${res.status}` };
    }

    const data = await res.json();
    if (data.success) {
      return {
        success: true,
        message: `¡Conexión exitosa! Vinculado a cuenta: ${data.user?.nickname || data.user?.email || 'Comercio Verificado'} (ID: ${data.user?.id || 'OK'})`,
        user: data.user
      };
    } else {
      return { success: false, message: data.error || 'Credencial no autorizada por Mercado Pago' };
    }
  } catch (err: any) {
    return { success: false, message: `Error de red al contactar servidor: ${err?.message || err}` };
  }
}

/**
 * Revisa si los parámetros de la URL indican un pago aprobado de Mercado Pago
 * y actualiza la orden en consecuencia
 */
export async function handleMercadoPagoCallback(searchParams: URLSearchParams): Promise<{ detected: boolean; approved: boolean; orderId?: string }> {
  const collectionStatus = searchParams.get('collection_status') || searchParams.get('status');
  const externalReference = searchParams.get('external_reference') || searchParams.get('id');

  if (!collectionStatus || !externalReference) {
    return { detected: false, approved: false };
  }

  const isApproved = collectionStatus === 'approved';
  
  if (isApproved) {
    try {
      const existingOrder = getOrderById(externalReference);
      if (existingOrder && !existingOrder.depositPaid) {
        // Marcar anticipo pagado
        updateOrder(externalReference, {
          depositPaid: true,
          status: existingOrder.status === 'pendiente' ? 'en_proceso' : existingOrder.status
        });

        // Sincronizar con Supabase Cloud
        await updateOrderInCloud(externalReference, {
          depositPaid: true,
          status: existingOrder.status === 'pendiente' ? 'en_proceso' : existingOrder.status
        }).catch((err: any) => console.warn('[MercadoPago] Error sincronizando Supabase:', err));
      }
    } catch (e) {
      console.error('[MercadoPago] Error procesando retorno de pago:', e);
    }
  }

  return {
    detected: true,
    approved: isApproved,
    orderId: externalReference
  };
}
