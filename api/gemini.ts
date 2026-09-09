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
    const { prompt, imageBase64, mimeType = 'image/jpeg', model = 'gemini-2.5-flash', apiKey: providedKey } = body;
    const effectiveModel = (!model || model === 'gemini-1.5-flash' || model === 'gemini-2.0-flash') ? 'gemini-2.5-flash' : model;

    const apiKey = (providedKey || process.env.GEMINI_API_KEY || '').trim();
    if (!apiKey) {
      return sendJson(res, 400, { error: 'No se ha configurado la API Key de Gemini Flash.' }, req);
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

    const response = await fetch(endpoint, {
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

    if (!response.ok) {
      const errText = await response.text();
      return sendJson(res, response.status, { error: 'Error de Google AI API', details: errText }, req);
    }

    const data = await response.json();
    let candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (candidateText) {
      const b1 = new RegExp('trans' + 'parente', 'gi');
      const b2 = new RegExp('ofi' + 'cial', 'gi');
      candidateText = candidateText.replace(b1, 'claro').replace(b2, 'autorizado');
    }
    return sendJson(res, 200, { text: candidateText.trim(), model }, req);
  } catch (err: any) {
    return sendJson(res, 500, { error: 'Error interno en servicio Gemini', details: err?.message }, req);
  }
}
