import type { IncomingMessage, ServerResponse } from 'http';

function getSafeCorsOrigin(req: IncomingMessage): string {
  const origin = (req.headers.origin as string) || '';
  if (!origin) return '*';
  return origin;
}

function sendJson(res: ServerResponse, statusCode: number, data: any, req?: IncomingMessage) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  if (req) {
    res.setHeader('Access-Control-Allow-Origin', getSafeCorsOrigin(req));
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.end(JSON.stringify(data));
}

function readJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        if (!body || body.trim() === '') {
          resolve({});
        } else {
          resolve(JSON.parse(body));
        }
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', err => reject(err));
  });
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', getSafeCorsOrigin(req));
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method Not Allowed' }, req);
  }

  try {
    const body = await readJsonBody(req);
    const { action } = body;

    // Acción 1: Probar conexión con Access Token
    if (action === 'test-connection') {
      const accessToken = body.accessToken || process.env.MERCADOPAGO_ACCESS_TOKEN;
      if (!accessToken || accessToken.trim().length < 10) {
        return sendJson(res, 400, { success: false, error: 'Access Token no proporcionado' }, req);
      }

      const mpResponse = await fetch('https://api.mercadopago.com/users/me', {
        headers: {
          'Authorization': `Bearer ${accessToken.trim()}`
        }
      });

      if (!mpResponse.ok) {
        const errorDetail = await mpResponse.json().catch(() => ({}));
        return sendJson(res, 400, {
          success: false,
          error: errorDetail.message || `Error de autorización en Mercado Pago (HTTP ${mpResponse.status})`
        }, req);
      }

      const userData = await mpResponse.json();
      return sendJson(res, 200, {
        success: true,
        user: {
          id: userData.id,
          nickname: userData.nickname,
          email: userData.email,
          country_id: userData.country_id
        }
      }, req);
    }

    // Acción 2: Crear preferencia de pago Checkout Pro
    if (action === 'create-preference') {
      const accessToken = body.accessToken || process.env.MERCADOPAGO_ACCESS_TOKEN;
      if (!accessToken || accessToken.trim().length < 10) {
        return sendJson(res, 400, { success: false, error: 'Access Token de Mercado Pago no configurado' }, req);
      }

      const { orderId, title, amount, clientEmail, clientName, backUrlOrigin } = body;
      const numAmount = Number(amount);

      if (!numAmount || numAmount <= 0) {
        return sendJson(res, 400, { success: false, error: 'El monto de pago debe ser mayor a 0' }, req);
      }

      const isHttps = backUrlOrigin && typeof backUrlOrigin === 'string' && backUrlOrigin.startsWith('https://');
      const baseUrl = isHttps ? backUrlOrigin : 'https://digimemories.mx';

      const preferencePayload = {
        items: [
          {
            id: String(orderId || 'orden'),
            title: title || `Anticipo DigiMemories - #${orderId}`,
            description: `Digitalización de memorias analógicas - Orden #${orderId}`,
            quantity: 1,
            currency_id: 'MXN',
            unit_price: Math.round(numAmount * 100) / 100
          }
        ],
        payer: {
          name: clientName || 'Cliente DigiMemories',
          email: clientEmail || 'contacto@digimemories.mx'
        },
        back_urls: {
          success: `${baseUrl}/track?id=${orderId}&collection_status=approved`,
          failure: `${baseUrl}/track?id=${orderId}&collection_status=failure`,
          pending: `${baseUrl}/track?id=${orderId}&collection_status=pending`
        },
        auto_return: 'approved',
        external_reference: String(orderId),
        statement_descriptor: 'DIGIMEMORIES',
        expires: false
      };

      const prefResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken.trim()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(preferencePayload)
      });

      if (!prefResponse.ok) {
        const errorDetail = await prefResponse.json().catch(() => ({}));
        return sendJson(res, 400, {
          success: false,
          error: errorDetail.message || `Error al crear preferencia en Mercado Pago (HTTP ${prefResponse.status})`
        }, req);
      }

      const prefData = await prefResponse.json();
      return sendJson(res, 200, {
        success: true,
        preferenceId: prefData.id,
        initPoint: prefData.init_point,
        sandboxInitPoint: prefData.sandbox_init_point
      }, req);
    }

    return sendJson(res, 400, { success: false, error: `Acción desconocida: ${action}` }, req);
  } catch (error: any) {
    return sendJson(res, 500, { success: false, error: error.message || 'Error interno del servidor' }, req);
  }
}
