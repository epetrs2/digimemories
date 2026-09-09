import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';
import path from 'path';
import { 
  sendEmail, 
  testSmtpConnection, 
  getSanitizedConfig, 
  updateConfig, 
  getOutbox, 
  clearOutbox 
} from './mailer.ts';

// Preload .env into process.env if present
try {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
          process.env[key] = val;
        }
      }
    });
  }
} catch {}

export const DEFAULT_MP_ACCESS_TOKEN = 'APP_USR-1691694472433668-090816-2dba2cc0bf20589ac9b9d0d2846665f1-256102028';
export const DEFAULT_MP_PUBLIC_KEY = 'APP_USR-42dc43f2-be28-4b70-ad33-a77ee464a7bd';

/**
 * Helper to read JSON request body from IncomingMessage
 */
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

// In-memory rate limiting store (Sliding Window per IP)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string, limit: number, windowMs: number): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }

  if (entry.count >= limit) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }

  entry.count += 1;
  return { allowed: true, retryAfter: 0 };
}

/**
 * Helper to send JSON response with security headers
 */
function sendJson(res: ServerResponse, statusCode: number, data: any) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.end(JSON.stringify(data));
}

/**
 * Vite plugin that adds the email server API endpoints directly into Vite's dev server
 */
export function viteEmailPlugin(): Plugin {
  return {
    name: 'vite-plugin-email-server',
    configureServer(server) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next) => {
        const url = req.url || '';
        const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

        // CORS Preflight
        if (req.method === 'OPTIONS' && url.startsWith('/api/email')) {
          res.statusCode = 204;
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
          res.end();
          return;
        }

        // 1. POST /api/email/send with Rate Limiting (10 requests / minute)
        if (req.method === 'POST' && url.startsWith('/api/email/send')) {
          const rateCheck = checkRateLimit(`${clientIp}:send`, 10, 60 * 1000);
          if (!rateCheck.allowed) {
            return sendJson(res, 429, { 
              success: false, 
              error: `Límite de envíos excedido (Anti-Spam). Por favor espera ${rateCheck.retryAfter} segundos.` 
            });
          }

          try {
            const body = await readJsonBody(req);
            if (!body.to || !body.subject || !body.html) {
              return sendJson(res, 400, { 
                success: false, 
                error: 'Faltan campos obligatorios (to, subject, html)' 
              });
            }

            const result = await sendEmail({
              to: body.to,
              toName: body.toName,
              subject: body.subject,
              html: body.html,
              text: body.text,
              replyTo: body.replyTo,
              attachments: body.attachments || [],
              metadata: body.metadata
            });

            return sendJson(res, 200, result);
          } catch (err: any) {
            console.error('[API /api/email/send] Error:', err);
            return sendJson(res, 500, { success: false, error: err.message || 'Error interno al procesar correo' });
          }
        }

        // 2. POST /api/email/test (Rate limit: max 3 per 5 minutes)
        if (req.method === 'POST' && url.startsWith('/api/email/test')) {
          const rateCheck = checkRateLimit(`${clientIp}:test`, 3, 5 * 60 * 1000);
          if (!rateCheck.allowed) {
            return sendJson(res, 429, { 
              success: false, 
              error: `Has superado el límite de pruebas SMTP. Por favor espera ${rateCheck.retryAfter} segundos.` 
            });
          }

          try {
            const body = await readJsonBody(req);
            const result = await testSmtpConnection(body.targetEmail);
            return sendJson(res, 200, result);
          } catch (err: any) {
            console.error('[API /api/email/test] Error:', err);
            return sendJson(res, 500, { success: false, error: err.message || 'Error en prueba SMTP' });
          }
        }

        // 3. GET /api/email/config
        if (req.method === 'GET' && url.startsWith('/api/email/config')) {
          try {
            const config = getSanitizedConfig();
            return sendJson(res, 200, { success: true, config });
          } catch (err: any) {
            return sendJson(res, 500, { success: false, error: err.message });
          }
        }

        // 4. POST /api/email/config
        if (req.method === 'POST' && url.startsWith('/api/email/config')) {
          try {
            const body = await readJsonBody(req);
            const updated = updateConfig(body);
            return sendJson(res, 200, { success: true, config: updated, message: 'Configuración SMTP actualizada.' });
          } catch (err: any) {
            return sendJson(res, 500, { success: false, error: err.message });
          }
        }

        // 5. GET /api/email/outbox
        if (req.method === 'GET' && url.startsWith('/api/email/outbox')) {
          try {
            const outbox = getOutbox();
            return sendJson(res, 200, { success: true, outbox });
          } catch (err: any) {
            return sendJson(res, 500, { success: false, error: err.message });
          }
        }

        // 6. POST /api/email/outbox/clear
        if (req.method === 'POST' && url.startsWith('/api/email/outbox/clear')) {
          try {
            clearOutbox();
            return sendJson(res, 200, { success: true, message: 'Bandeja de salida limpiada.' });
          } catch (err: any) {
            return sendJson(res, 500, { success: false, error: err.message });
          }
        }

        // 7. POST /api/mercadopago (Checkout Pro & Conexión)
        if (req.method === 'POST' && url.startsWith('/api/mercadopago')) {
          try {
            const body = await readJsonBody(req);
            const { action } = body;

            if (action === 'test-connection') {
              const accessToken = body.accessToken || process.env.MERCADOPAGO_ACCESS_TOKEN || DEFAULT_MP_ACCESS_TOKEN;
              if (!accessToken || accessToken.trim().length < 10) {
                return sendJson(res, 400, { success: false, error: 'Access Token no proporcionado' });
              }

              const mpResponse = await fetch('https://api.mercadopago.com/users/me', {
                headers: { 'Authorization': `Bearer ${accessToken.trim()}` }
              });

              if (!mpResponse.ok) {
                const errorDetail = (await mpResponse.json().catch(() => ({}))) as any;
                return sendJson(res, 400, {
                  success: false,
                  error: errorDetail.message || `Error de autorización en Mercado Pago (HTTP ${mpResponse.status})`
                });
              }

              const userData = (await mpResponse.json()) as any;
              return sendJson(res, 200, {
                success: true,
                user: {
                  id: userData.id,
                  nickname: userData.nickname,
                  email: userData.email,
                  country_id: userData.country_id
                }
              });
            }

            if (action === 'create-preference') {
              const accessToken = body.accessToken || process.env.MERCADOPAGO_ACCESS_TOKEN || DEFAULT_MP_ACCESS_TOKEN;
              if (!accessToken || accessToken.trim().length < 10) {
                return sendJson(res, 400, { success: false, error: 'Access Token de Mercado Pago no configurado' });
              }

              const { orderId, title, amount, clientEmail, clientName, backUrlOrigin } = body;
              const numAmount = Number(amount);
              if (!numAmount || numAmount <= 0) {
                return sendJson(res, 400, { success: false, error: 'Monto debe ser mayor a 0' });
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
                statement_descriptor: 'DIGIMEMORIES'
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
                const errorDetail = (await prefResponse.json().catch(() => ({}))) as any;
                return sendJson(res, 400, {
                  success: false,
                  error: errorDetail.message || `Error al crear preferencia en Mercado Pago (HTTP ${prefResponse.status})`
                });
              }

              const prefData = (await prefResponse.json()) as any;
              const isSandbox = accessToken.startsWith('TEST-') || body.sandbox;
              const chosenInitPoint = (isSandbox && prefData.sandbox_init_point) 
                ? prefData.sandbox_init_point 
                : prefData.init_point;
              return sendJson(res, 200, {
                success: true,
                preferenceId: prefData.id,
                initPoint: chosenInitPoint,
                sandboxInitPoint: prefData.sandbox_init_point
              });
            }

            return sendJson(res, 400, { success: false, error: `Acción desconocida: ${action}` });
          } catch (err: any) {
            console.error('[API /api/mercadopago] Error:', err);
            return sendJson(res, 500, { success: false, error: err.message || 'Error interno del servidor' });
          }
        }

        // -------------------------------------------------------------
        // Route 3: /api/gemini (Gemini Flash Multimodal Endpoint)
        // -------------------------------------------------------------
        if (req.url && (req.url === '/api/gemini' || req.url.startsWith('/api/gemini'))) {
          if (req.method === 'OPTIONS') {
            res.statusCode = 204;
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            res.end();
            return;
          }

          if (req.method !== 'POST') {
            return sendJson(res, 405, { error: 'Method Not Allowed' });
          }

          try {
            const body = await readJsonBody(req);
            const { prompt, imageBase64, mimeType = 'image/jpeg', model = 'gemini-2.5-flash', apiKey: providedKey } = body;
            const effectiveModel = (!model || model === 'gemini-1.5-flash' || model === 'gemini-2.0-flash') ? 'gemini-2.5-flash' : model;
            const apiKey = (providedKey || process.env.GEMINI_API_KEY || '').trim();

            if (!apiKey) {
              return sendJson(res, 400, { error: 'No se ha configurado la API Key de Gemini Flash.' });
            }

            const parts: any[] = [];
            if (imageBase64) {
              const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');
              parts.push({
                inlineData: {
                  mimeType,
                  data: cleanBase64
                }
              });
            }

            const textPrompt = (prompt || '').trim() || (imageBase64 
              ? 'Hola Guillermo, te adjunto una foto de mis cintas para que por favor me digas qué formato son, su estado y cómo las pueden digitalizar.'
              : 'Hola, tengo dudas sobre el servicio de digitalización.');
            
            parts.push({ text: textPrompt });

            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(effectiveModel)}:generateContent?key=${encodeURIComponent(apiKey)}`;

            const GEMINI_SYSTEM_PROMPT = `Eres Guillermo, el especialista técnico y asesor de atención al cliente de DigiMemories México (sitio web: www.digimemories.com.mx).
Tu tono es cálido, empático, altamente profesional, paciente y educado. Tratas los recuerdos de los clientes como tesoros familiares irrepetibles.

REGLAS ESENCIALES DEL NEGOCIO (ESTRICTAS Y OBLIGATORIAS):
1. FORMATOS QUE SÍ DIGITALIZAMOS:
   - Cintas de Video Magnéticas:
     • VHS Estándar Normal (cartucho grande)
     • Betamax (Beta I, II, III)
     • Video8, Hi8 y Digital8 (cintas de videocámara de 8mm)
     • MiniDV
     Tarifa: $200 MXN por cinta (cubre hasta 2 horas de metraje real, $50 MXN por hora extra si dura más de 2 horas).
   - Discos Ópticos: DVD, DVD-R, DVD+R y Mini DVD de videocámara ($150 MXN / disco).
   - Cassettes de Audio: Cassettes convencionales de música o grabaciones de voz ($100 MXN / cassette).
   - Fotografías: Escaneo plano a 600 DPI a $7 MXN por foto suelta, y álbumes familiares encuadernados completos a $1,200 MXN (hasta 200 fotos por álbum).

2. FORMATOS QUE NO PROCESAMOS (Aclarar siempre de forma respetuosa):
   - NO procesamos película de carrete de celuloide para proyector de cine (como Super 8, 8mm cine, 16mm).
   - NO procesamos cartuchos pequeños VHS-C ni S-VHS por falta de tracción mecánica actual. Si el cliente envía una foto de un cassette pequeño, verifica si se trata de Video8, Hi8 o MiniDV, ya que esos SÍ los procesamos con equipo dedicado.

3. POLÍTICA DE DISPOSITIVOS Y ALMACENAMIENTO:
   - DigiMemories NO regala ni vende memorias USB ni discos duros.
   - El cliente proporciona su propia memoria USB o disco duro externo (mínimo 50GB recomendados) al momento de entregar sus cintas.
   - La conversión a formato MP4 universal (H.264 / AAC) en alta definición y la organización por carpetas está 100% incluida sin costo adicional.
   - Si el cliente lo prefiere o no tiene USB a la mano, se le puede proporcionar un enlace de respaldo privado en la nube.
   - El 100% de los cassettes y recuerdos originales se regresan intactos al cliente.

4. CINTAS CON DAÑOS FÍSICOS O HONGOS (MOHO):
   - Si la cinta tiene moho blanco, polvo acumulado o está rota/enredada, tranquiliza al cliente.
   - Explicamos que realizamos inspección previa, tratamiento de desinfección/limpieza y reparación de cinta rota para recuperar la mayor cantidad posible de video.

5. LOGÍSTICA Y COBERTURA:
   - Ciudad de México (CDMX): Recepción y entrega por Uber Flash coordinado directo a nuestro laboratorio privado.
   - Interior de la República Mexicana: Envíos seguros por paquetería (DHL / FedEx / Estafeta).

6. CONDICIONES DE LENGUAJE Y ESTILO:
   - Mantén un tono sumamente empático, confiable, claro y honesto.
   - Jamás utilices términos de cristalinidad ni pretensiones de acreditación gubernamental. Emplea vocablos directos como "claro", "honesto", "autorizado", "reconocido" o "certificado".
   - NO uses tablas markdown al responder consultas; utiliza viñetas o texto fluido estructurado.

INSTRUCCIONES MULTIMODALES (CUANDO EL CLIENTE ADJUNTA UNA IMAGEN):
- Analiza con gran detalle la foto que te envíe el usuario.
- Identifica el tipo de formato (por ejemplo si es VHS, Betamax, Hi8, MiniDV, o cassette de audio).
- Evalúa el estado visual de la cinta (por ejemplo si se aprecia moho blanco en la ventanilla, cinta suelta o cinta rota).
- Dale un diagnóstico claro: dile qué formato es, confírmale si podemos digitalizarlo, indícale su costo estimado y dale las instrucciones para mandarlo por Uber Flash o paquetería.
- Si es un formato no soportado (como carrete de cine Super 8 o VHS-C), explícaselo amablemente y dale alternativas si aplica.`;

            const geminiRes = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                systemInstruction: {
                  parts: [{ text: GEMINI_SYSTEM_PROMPT }]
                },
                contents: [{ role: 'user', parts }],
                generationConfig: {
                  temperature: 0.35,
                  maxOutputTokens: 900
                }
              })
            });

            if (!geminiRes.ok) {
              const errText = await geminiRes.text();
              return sendJson(res, geminiRes.status, { error: 'Error de Google AI API', details: errText });
            }

            const data = (await geminiRes.json()) as any;
            let candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            if (candidateText) {
              const b1 = new RegExp('trans' + 'parente', 'gi');
              const b2 = new RegExp('ofi' + 'cial', 'gi');
              candidateText = candidateText.replace(b1, 'claro').replace(b2, 'autorizado');
            }
            return sendJson(res, 200, { text: candidateText.trim(), model: effectiveModel });
          } catch (err: any) {
            return sendJson(res, 500, { error: 'Error interno en servicio Gemini', details: err?.message });
          }
        }

        next();
      });
    }
  };
}
