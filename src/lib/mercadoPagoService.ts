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

  const mpToken = (settings.mercadopagoAccessToken && settings.mercadopagoAccessToken.trim() !== '')
    ? settings.mercadopagoAccessToken.trim()
    : 'APP_USR-1691694472433668-090816-2dba2cc0bf20589ac9b9d0d2846665f1-256102028';

  const isSandboxMode = mpToken.startsWith('TEST-') || !!settings.mercadopagoSandbox;

  // 1. Intentar crear preferencia dinámica vía API Checkout Pro
  if (mpToken) {
    try {
      const origin = (typeof window !== 'undefined' && window.location.protocol === 'https:') 
        ? window.location.origin 
        : 'https://digimemories.mx';
      
      // Intento 1: A través del endpoint backend del servidor
      try {
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
            accessToken: mpToken,
            sandbox: isSandboxMode,
            backUrlOrigin: origin
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && (data.initPoint || data.sandboxInitPoint)) {
            const targetUrl = isSandboxMode && data.sandboxInitPoint 
              ? data.sandboxInitPoint 
              : (data.initPoint || data.sandboxInitPoint);
            return {
              success: true,
              initPoint: targetUrl,
              sandboxInitPoint: data.sandboxInitPoint,
              preferenceId: data.preferenceId
            };
          }
        }
      } catch (endpointErr) {
        console.warn('[MercadoPago] Backend /api/mercadopago no disponible, intentando llamada directa:', endpointErr);
      }

      // Intento 2: Llamada directa a la API de Mercado Pago con soporte CORS
      const directResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mpToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          items: [
            {
              id: String(params.orderId || 'orden'),
              title: params.title || `Anticipo DigiMemories - #${params.orderId}`,
              description: `Digitalización de memorias analógicas - Orden #${params.orderId}`,
              quantity: 1,
              currency_id: 'MXN',
              unit_price: Math.round(Number(params.amount) * 100) / 100
            }
          ],
          payer: {
            name: params.clientName || 'Cliente DigiMemories',
            email: params.clientEmail || 'contacto@digimemories.mx'
          },
          back_urls: {
            success: `${origin}/track?id=${params.orderId}&collection_status=approved`,
            failure: `${origin}/track?id=${params.orderId}&collection_status=failure`,
            pending: `${origin}/track?id=${params.orderId}&collection_status=pending`
          },
          auto_return: 'approved',
          external_reference: String(params.orderId),
          statement_descriptor: 'DIGIMEMORIES'
        })
      });

      if (directResponse.ok) {
        const directData = await directResponse.json();
        const targetUrl = isSandboxMode && directData.sandbox_init_point
          ? directData.sandbox_init_point
          : (directData.init_point || directData.sandbox_init_point);
        return {
          success: true,
          initPoint: targetUrl,
          sandboxInitPoint: directData.sandbox_init_point,
          preferenceId: directData.id
        };
      } else {
        const errJson = await directResponse.json().catch(() => ({}));
        console.warn('[MercadoPago] Error en respuesta directa de Mercado Pago:', errJson);
      }
    } catch (err) {
      console.error('[MercadoPago] Error general al conectar con Mercado Pago:', err);
    }
  }

  // 2. Fallback: Usar Link de Pago Personalizado SOLO si fue explícitamente configurado y no es el dummy
  const customLink = (settings.mercadopagoPaymentLink || '').trim();
  if (customLink && !customLink.includes('link.mercadopago.com.mx/digimemories')) {
    const separator = customLink.includes('?') ? '&' : '?';
    const finalLink = `${customLink}${separator}amount=${Math.round(params.amount)}&description=${encodeURIComponent(params.title)}`;
    return {
      success: true,
      initPoint: finalLink
    };
  }

  return {
    success: false,
    error: 'No se pudo generar la sesión de pago con Mercado Pago. Por favor intenta por transferencia SPEI o contáctanos por WhatsApp.'
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
    let res: Response | null = null;
    try {
      res = await fetch('/api/mercadopago', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test-connection',
          accessToken: accessToken.trim()
        })
      });
    } catch {
      // Backend no disponible, se intentará llamada directa
    }

    if (res && res.ok) {
      const data = await res.json();
      if (data.success) {
        return {
          success: true,
          message: `¡Conexión exitosa! Vinculado a cuenta: ${data.user?.nickname || data.user?.email || 'Comercio Verificado'} (ID: ${data.user?.id || 'OK'})`,
          user: data.user
        };
      }
    }

    // Intento directo a Mercado Pago con CORS
    const directRes = await fetch('https://api.mercadopago.com/users/me', {
      headers: { 'Authorization': `Bearer ${accessToken.trim()}` }
    });

    if (directRes.ok) {
      const userData = await directRes.json();
      return {
        success: true,
        message: `¡Conexión exitosa! Vinculado a cuenta: ${userData.nickname || userData.email || 'Comercio Verificado'} (ID: ${userData.id || 'OK'})`,
        user: userData
      };
    } else {
      const errData = await directRes.json().catch(() => ({}));
      return { success: false, message: errData.message || `Credencial no autorizada por Mercado Pago (HTTP ${directRes.status})` };
    }
  } catch (err: any) {
    return { success: false, message: `Error de conexión: ${err?.message || err}` };
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
