export interface BotReplyResult {
  text: string;
  quickReplies?: { label: string; action: string }[];
  isEscalation?: boolean;
}

export interface BotIntent {
  id: string;
  category: 
    | 'quote_calc'
    | 'pricing'
    | 'formats'
    | 'audio_cassette'
    | 'photos_albums'
    | 'reels_unsupported'
    | 'vhsc_unsupported'
    | 'delivery_media'
    | 'location_logistics'
    | 'safe_meeting_points'
    | 'uber_flash'
    | 'national_shipping'
    | 'tape_safety_mold'
    | 'enhancement_hd'
    | 'turnaround_times'
    | 'express_service'
    | 'payment_spei_mp'
    | 'invoicing_cfdi'
    | 'tracking_pin'
    | 'privacy_security'
    | 'business_hours'
    | 'contact_channels'
    | 'greetings'
    | 'gratitude'
    | 'farewell'
    | 'affirmation'
    | 'how_it_works'
    | 'who_we_are'
    | 'storage_policy'
    | 'balance_adjustment'
    | 'general';
  keywords: string[];
  patterns?: RegExp[];
  priority?: number;
  response: (input: string, normalized: string) => BotReplyResult;
}

// ---------------------------------------------------------------------------
// 1. TEXT NORMALIZATION & PREPROCESSING UTILITIES
// ---------------------------------------------------------------------------

/**
 * Remove diacritics / accents and normalize string for robust matching.
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents (á -> a, é -> e, etc.)
    .replace(/[¿?¡!.,:;()_\\/"'-]/g, ' ') // strip punctuation
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Convert Spanish number words to numeric digits within a string.
 */
const WORD_TO_NUMBER_MAP: Record<string, string> = {
  'un': '1',
  'uno': '1',
  'una': '1',
  'dos': '2',
  'tres': '3',
  'cuatro': '4',
  'cinco': '5',
  'seis': '6',
  'siete': '7',
  'ocho': '8',
  'nueve': '9',
  'diez': '10',
  'once': '11',
  'doce': '12',
  'trece': '13',
  'catorce': '14',
  'quince': '15',
  'dieciseis': '16',
  'diecisiete': '17',
  'dieciocho': '18',
  'diecinueve': '19',
  'veinte': '20',
  'veinticinco': '25',
  'treinta': '30',
  'cuarenta': '40',
  'cincuenta': '50',
  'sesenta': '60',
  'setenta': '70',
  'ochenta': '80',
  'noventa': '90',
  'cien': '100',
  'ciento': '100',
  'doscientos': '200',
  'quinientos': '500'
};

export function replaceWordNumbers(text: string): string {
  const words = text.split(' ');
  const replaced = words.map(w => WORD_TO_NUMBER_MAP[w] || w);
  return replaced.join(' ');
}

/**
 * Word boundary matching helper to prevent false substring collisions (e.g. 'id' in 'minidv' or 'rapida')
 */
export function matchesKeyword(text: string, keyword: string): boolean {
  const normKw = normalizeText(keyword);
  if (text === normKw) return true;
  
  // If keyword is short (<= 3 chars, e.g. "id", "pin", "si", "va", "k7"), require exact word boundary
  if (normKw.length <= 3) {
    const regex = new RegExp(`(^|\\s)${normKw}(\\s|$)`, 'i');
    return regex.test(text);
  }
  
  // For multi-word phrases or longer words
  return text.includes(normKw);
}

// ---------------------------------------------------------------------------
// 2. INTELLIGENT MULTI-ITEM QUOTE PARSER
// ---------------------------------------------------------------------------

export function tryParseQuoteInquiry(rawInput: string): BotReplyResult | null {
  const normalized = replaceWordNumbers(normalizeText(rawInput));

  // If user is asking a conditional safety/damage/empty tape question, skip quote parser
  const damageSafetyPhrases = [
    'rota', 'reventada', 'danada', 'danadas', 'moho', 'hongo', 'hongos', 
    'polvo blanco', 'pegada', 'se rompe', 'no se ve', 'no se escucha', 
    'no se puede leer', 'desmagnetizada', 'si se destruye', 'seguridad de mis',
    'vacia', 'esta vacia'
  ];
  if (damageSafetyPhrases.some(phrase => normalized.includes(phrase))) {
    return null;
  }

  // If user is asking about turnaround time / delivery timeframe, let turnaround_times handle it
  const turnaroundPhrases = [
    'cuanto demora', 'cuanto tarda', 'cuantos dias', 'tiempo de entrega', 
    'cuando entregan', 'demora un lote', 'tardan mucho'
  ];
  if (turnaroundPhrases.some(phrase => normalized.includes(phrase))) {
    return null;
  }

  // If user is asking if the total/balance can change or about extra hours, let balance_adjustment handle it
  const balanceAdjustmentPhrases = [
    'cambia el saldo', 'cambia el total', 'puede cambiar', 'ajuste de saldo', 
    'si dura mas', 'mas de 2 horas', 'mas de dos horas', 'horas extras', 'cinta vacia', 'casette vacio'
  ];
  if (balanceAdjustmentPhrases.some(phrase => normalized.includes(phrase))) {
    return null;
  }

  // If user is asking if usb is gifted or provided for free, let storage policy intent handle it
  const usbPolicyPhrases = [
    'regalan usb', 'regalan la usb', 'usb gratis', 'memoria gratis', 'ponen la usb', 'dan la usb', 'memoria usb gratis'
  ];
  if (usbPolicyPhrases.some(phrase => normalized.includes(phrase))) {
    return null;
  }

  // Extract counts for each category
  // 1. Audio Cassettes (explicit audio markers)
  const audioRegex = /(\d+)\s*(?:sola|solo|unica|unico)?\s*(casetes? de audio|cassettes? de audio|casetes? de musica|cassettes? de musica|casetes? de voz|cassettes? de voz|cintas? de audio|audiocassettes?|k7)/g;
  let totalAudio = 0;
  let match: RegExpExecArray | null;
  while ((match = audioRegex.exec(normalized)) !== null) {
    totalAudio += parseInt(match[1], 10);
  }

  // 2. Video Tapes: VHS, Betamax, Hi8, Video8, Digital8, MiniDV, Cintas de video, Cintas (with optional modifiers)
  const tapeRegex = /(\d+)\s*(?:sola|solo|unica|unico|cartucho de|cinta de)?\s*(cintas? de video|vhs|beta|betamax|hi8|video8|digital8|minidv|casetes? de video|cassettes? de video|cartuchos?|videos?|cintas?)/g;
  let totalTapes = 0;
  while ((match = tapeRegex.exec(normalized)) !== null) {
    totalTapes += parseInt(match[1], 10);
  }

  // 3. Fallback generic cassettes if neither tape nor audio explicitly tagged
  if (totalAudio === 0 && totalTapes === 0) {
    const genericCassetteRegex = /(\d+)\s*(?:sola|solo|unica|unico)?\s*(casetes?|cassettes?)/g;
    while ((match = genericCassetteRegex.exec(normalized)) !== null) {
      totalTapes += parseInt(match[1], 10);
    }
  }

  // 4. Optical Discs: DVD, Mini DVD, CD
  const discRegex = /(\d+)\s*(?:sola|solo|unica|unico|disco de)?\s*(dvds?|discos?|mini dvds?|cds?)/g;
  let totalDiscs = 0;
  while ((match = discRegex.exec(normalized)) !== null) {
    totalDiscs += parseInt(match[1], 10);
  }

  // 5. Loose Photos: Fotos sueltas, diapositivas, negativos
  const photoRegex = /(\d+)\s*(?:sola|solo|unica|unico)?\s*(fotos?|fotografias?|imagenes?|diapositivas?|negativos?|retratos?)/g;
  let totalPhotos = 0;
  while ((match = photoRegex.exec(normalized)) !== null) {
    totalPhotos += parseInt(match[1], 10);
  }

  // 6. Full Photo Albums
  const albumRegex = /(\d+)\s*(?:sola|solo|unica|unico)?\s*(albumes?|album|libros? de fotos|librillos?)/g;
  let totalAlbums = 0;
  while ((match = albumRegex.exec(normalized)) !== null) {
    totalAlbums += parseInt(match[1], 10);
  }

  // Check if user has at least one recognized quantity
  if (totalTapes > 0 || totalDiscs > 0 || totalPhotos > 0 || totalAlbums > 0 || totalAudio > 0) {
    // Check if user requested A/V enhancement
    const wantsEnhance = normalized.includes('mejora') || 
                          normalized.includes('remasterizacion') || 
                          normalized.includes('remasterizar') || 
                          normalized.includes('color') || 
                          normalized.includes('filtro') || 
                          normalized.includes('hd') || 
                          normalized.includes('4k');

    const tapeCost = totalTapes * 200;
    const discCost = totalDiscs * 150;
    const audioCost = totalAudio * 100;
    const photoCost = totalPhotos * 7;
    const albumCost = totalAlbums * 1200;
    const enhanceCost = wantsEnhance && totalTapes > 0 ? totalTapes * 150 : 0;

    const subtotal = tapeCost + discCost + audioCost + photoCost + albumCost + enhanceCost;

    if (subtotal > 0) {
      const deposit = Math.round(subtotal * 0.5);
      const details: string[] = [];

      if (totalTapes > 0) {
        details.push(`• **${totalTapes} Cinta(s) de Video** (VHS/Beta/Hi8/MiniDV) x $200 = **$${tapeCost.toLocaleString('es-MX')} MXN**`);
      }
      if (totalDiscs > 0) {
        details.push(`• **${totalDiscs} Disco(s) DVD / CD** x $150 = **$${discCost.toLocaleString('es-MX')} MXN**`);
      }
      if (totalAudio > 0) {
        details.push(`• **${totalAudio} Cassette(s) de Audio** x $100 = **$${audioCost.toLocaleString('es-MX')} MXN**`);
      }
      if (totalPhotos > 0) {
        details.push(`• **${totalPhotos} Foto(s) escaneadas a 600 DPI** x $7 = **$${photoCost.toLocaleString('es-MX')} MXN**`);
      }
      if (totalAlbums > 0) {
        details.push(`• **${totalAlbums} Álbum(es) Familiar(es) Completo(s)** x $1,200 = **$${albumCost.toLocaleString('es-MX')} MXN**`);
      }
      if (enhanceCost > 0) {
        details.push(`• **Mejora Premium de Audio y Video** (${totalTapes} cintas) x $150 = **$${enhanceCost.toLocaleString('es-MX')} MXN**`);
      }

      let freeShippingPromo = '';
      if (subtotal >= 2000) {
        freeShippingPromo = '\n🎁 **¡Beneficio Aplicado!** Tu pedido supera los $2,000 MXN, por lo que calificas para **Retorno 100% GRATIS** por Paquetería Nacional (DHL / FedEx) o Uber Flash (CDMX).';
      } else if (subtotal >= 1500) {
        freeShippingPromo = '\n🎁 **¡Beneficio Aplicado!** Tu pedido supera los $1,500 MXN, por lo que calificas para **Retorno 100% GRATIS** vía Uber Flash en CDMX.';
      }

      return {
        text: `¡Excelente! Con base en tu material, aquí tienes tu **cálculo estimado al instante**:\n\n${details.join('\n')}\n\n💰 **Total Estimado:** **$${subtotal.toLocaleString('es-MX')} MXN**\n💳 **Anticipo para Iniciar (50%):** **$${deposit.toLocaleString('es-MX')} MXN**\n⚖️ **Saldo Restante Estimado (50%):** **$${(subtotal - deposit).toLocaleString('es-MX')} MXN** *(se ajusta según duración real: cintas vacías o ilegibles NO se cobran y se descuentan; horas >2h a $50 MXN/h)*.\n💾 **Almacenamiento:** El cliente proporciona su memoria USB o disco duro (mín. 50GB). DigiMemories no regala ni proporciona el medio físico; la carga en MP4 universal está 100% incluida.\n📼 **Devolución:** El 100% de tus cintas originales se te devuelven intactas.${freeShippingPromo}\n\n¿Deseas generar tu cotización formal en PDF con folio de rastreo o agendar tu entrega?`,
        quickReplies: [
          { label: '📄 Generar Presupuesto en PDF', action: 'NAVIGATE_CONTACT' },
          { label: '🧮 Abrir Calculadora Completa', action: 'NAVIGATE_CALCULATOR' },
          { label: '📍 ¿Dónde entrego mis cintas?', action: 'LOCATION_INFO' },
          { label: '🚚 Recolección a Domicilio', action: 'HOME_PICKUP_INFO' },
          { label: '👤 Hablar con un Asesor', action: 'REQUEST_HUMAN' }
        ]
      };
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// 3. EXHAUSTIVE KNOWLEDGE BASE (30+ SPECIALIZED INTENTS)
// ---------------------------------------------------------------------------

export const BOT_KNOWLEDGE_BASE: BotIntent[] = [
  // 1. Cotizador Inteligente y Preguntas de Precios Generales
  {
    id: 'quote_calculation',
    category: 'quote_calc',
    priority: 95,
    keywords: [
      'cotizar', 'cotizacion', 'presupuesto', 'cuanto me saldria', 'cuanto me cuesta', 
      'cuanto cobran por', 'cuanto vale pasar', 'calculo', 'calcular', 'cuanto me sale'
    ],
    response: (raw, _norm) => {
      const parsed = tryParseQuoteInquiry(raw);
      if (parsed) return parsed;

      return {
        text: `¡Con mucho gusto te ayudamos a cotizar! Nuestras tarifas son:\n\n📹 **Cintas de Video (VHS, Betamax, Hi8, Video8, Digital8, MiniDV):** $200 MXN / cinta (hasta 2 horas completas en MP4).\n💿 **Discos DVD y Mini DVD:** $150 MXN / disco.\n📻 **Cassettes de Audio:** $100 MXN / cassette.\n📸 **Fotografías Sueltas (600 DPI):** $7 MXN / foto.\n📚 **Álbum Familiar Completo:** $1,200 MXN.\n✨ **Mejora Premium de Audio/Video (Opcional):** $150 MXN / cinta.\n\n💾 **Almacenamiento:** Nos proporcionas tu memoria USB o disco duro externo (mín. 50GB recomendados). DigiMemories no regala ni proporciona el dispositivo físico, pero la carga y organización en MP4 no tiene costo adicional.\n⚖️ **Ajuste de Saldo:** El presupuesto es estimado; cintas vacías o ilegibles NO se cobran y se descuentan; horas mayores a 2h se facturan a $50 MXN/hora.\n\n¿Cuántas cintas, discos o fotos tienes aproximadamente? *(Ejemplo: "Tengo 4 cintas VHS y 2 DVDs")*.`,
        quickReplies: [
          { label: '🧮 Abrir Calculadora', action: 'NAVIGATE_CALCULATOR' },
          { label: '📄 Generar Presupuesto PDF', action: 'NAVIGATE_CONTACT' },
          { label: '📦 ¿Qué formatos aceptan?', action: 'FORMATS_INFO' },
          { label: '👤 Hablar con un Asesor', action: 'REQUEST_HUMAN' }
        ]
      };
    }
  },

  // 2. Precios y Tarifas Generales
  {
    id: 'pricing_general',
    category: 'pricing',
    priority: 90,
    keywords: [
      'precio', 'precios', 'costo', 'costos', 'tarifa', 'tarifas', 'cuanto cuesta', 
      'cuanto cobran', 'cuanto vale', 'lista de precios', 'tabla de precios', 'hora extra'
    ],
    response: () => ({
      text: `Nuestras tarifas de digitalización son:\n\n📼 **Cintas de Video (VHS normal, Beta, Hi8, MiniDV, Video8):** **$200 MXN** / cinta (cubre hasta 2h completas de grabación).\n💿 **Discos Ópticos (DVD, Mini DVD, CD):** **$150 MXN** / disco.\n📻 **Cassettes de Audio (Música / Voz):** **$100 MXN** / cassette.\n📸 **Fotografías Sueltas (600 DPI):** **$7 MXN** / foto escaneada en alta resolución.\n📚 **Álbum Familiar Completo:** **$1,200 MXN** (hasta 200 fotos).\n⏳ **Hora adicional de cinta (>2h):** **$50 MXN**.\n✨ **Remasterización y Mejora de Color/Audio:** **$150 MXN** / cinta.\n\n💾 **Dispositivo de Almacenamiento:** El cliente proporciona su propia memoria USB o disco duro (mín. 50GB). DigiMemories no regala ni proporciona el dispositivo físico.\n⚖️ **Ajuste de Saldo:** Cintas vacías o ilegibles NO se cobran y se descuentan de tu saldo final.\n📼 **Devolución:** El 100% de tus recuerdos originales se te devuelven intactas.`,
      quickReplies: [
        { label: '🧮 Calcular mi Presupuesto', action: 'NAVIGATE_CALCULATOR' },
        { label: '⏱️ Tiempos de Entrega', action: 'TURNAROUND_TIME' },
        { label: '🚚 Opciones de Envío', action: 'LOCATION_INFO' },
        { label: '👤 Hablar con un Asesor', action: 'REQUEST_HUMAN' }
      ]
    })
  },

  // 3. Promociones, Descuentos por Volumen y Envío Gratis
  {
    id: 'promotions_and_volume',
    category: 'pricing',
    priority: 85,
    keywords: [
      'descuento', 'descuentos', 'promocion', 'promociones', 'mayoreo', 'muchas cintas', 
      'lote grande', 'volumen', 'rebaja', 'oferta', 'envio gratis'
    ],
    response: () => ({
      text: `🎁 **Promociones y Beneficios por Volumen en DigiMemories:**\n\n1. 🛵 **Retorno GRATIS en CDMX:** En órdenes a partir de **$1,500 MXN**, el envío de retorno por **Uber Flash** es 100% gratuito.\n2. 📦 **Retorno GRATIS Nacional:** En órdenes a partir de **$2,000 MXN**, el retorno asegurado por **Paquetería Nacional (DHL / FedEx)** va por nuestra cuenta a cualquier estado del país.\n3. 📼 **Lotes Grandes (+20 cintas):** Para proyectos grandes o archivos institucionales, te ofrecemos memoria USB de mayor capacidad sin costo adicional y revisión prioritaria.\n\n¿Te gustaría que te coticemos un lote específico?`,
      quickReplies: [
        { label: '💰 Cotizar mis Cintas', action: 'NAVIGATE_CALCULATOR' },
        { label: '📍 Opciones de Entrega', action: 'LOCATION_INFO' },
        { label: '👤 Consultar con Asesor', action: 'REQUEST_HUMAN' }
      ]
    })
  },

  // 4. Cassettes de Audio (prioridad alta para diferenciar de video)
  {
    id: 'audio_cassettes',
    category: 'audio_cassette',
    priority: 93,
    keywords: [
      'cassette de audio', 'casete de audio', 'cintas de audio', 'casetes de musica', 
      'cassettes de musica', 'cinta de musica', 'grabacion de voz', 'k7', 'audiocassette',
      'musica o voz', 'cintas de caset', 'cassettes', 'casetes'
    ],
    response: () => ({
      text: `📻 **Digitalización de Cassettes de Audio:**\n\nDigitalizamos tus cintas de audio magnéticas (grabaciones de voz familiares, entrevistas, música, cartas sonoras o sermones):\n\n• **Precio:** **$100 MXN / cassette**.\n• **Formato de entrega:** Archivos **MP3 de alta resolución (320 kbps)** o **WAV sin compresión** en Memoria USB.\n• **Incluye:** Filtro suave de reducción de siseo estático analógico para mayor nitidez vocal y retorno de tus cassettes originales intactos.\n\n¿Cuántos cassettes de audio te gustaría rescatar?`,
      quickReplies: [
        { label: '💰 Cotizar mis Cassettes', action: 'NAVIGATE_CALCULATOR' },
        { label: '🚚 Opciones de Envío', action: 'LOCATION_INFO' },
        { label: '👤 Hablar con un Asesor', action: 'REQUEST_HUMAN' }
      ]
    })
  },

  // 5. Formatos Soportados (Video, Discos, Fotos)
  {
    id: 'formats_supported',
    category: 'formats',
    priority: 88,
    keywords: [
      'formato', 'formatos', 'que formatos', 'que cintas', 'tipo de cinta', 'tipos de cintas',
      'cintas que aceptan', 'que aceptan', 'que digitalizan', 'materiales', 'minidv y video8',
      'digitalizan minidv', 'digitalizan betamax', 'digitalizan video8', 'digitalizan hi8'
    ],
    response: () => ({
      text: `Digitalizamos los siguientes formatos compatibles:\n\n📼 **Cintas de Video:**\n• VHS Estándar Normal\n• Betamax (Beta I, II, III)\n• Video8, Hi8 y Digital8 (8mm videocámaras)\n• MiniDV\n\n💿 **Discos Ópticos:**\n• DVD, DVD-R, DVD+R y Mini DVD (Handycam)\n\n📻 **Audio:**\n• Cassettes de audio convencionales (música y grabaciones de voz a $100 MXN)\n\n📸 **Fotografías:**\n• Fotos impresas en papel (escaneo plano a 600 DPI a $7 MXN)\n• Álbumes fotográficos completos encuadernados ($1,200 MXN)\n\n⚠️ *Aclaración:* Únicamente procesamos **VHS estándar normal** (no VHS-C ni S-VHS). No procesamos película de carrete de celuloide (8mm cine / Super 8).`,
      quickReplies: [
        { label: '💰 Cotizar mis Formatos', action: 'NAVIGATE_CALCULATOR' },
        { label: '🛡️ ¿Qué pasa si tienen moho?', action: 'MOLD_SAFETY' },
        { label: '📻 Cassettes de Audio', action: 'handle_audio' }
      ]
    })
  },

  // 6. Aclaración Específica: Película de Carrete / Super 8 / 8mm Cine / 16mm
  {
    id: 'reels_unsupported',
    category: 'reels_unsupported',
    priority: 94,
    keywords: [
      'super 8', 'super8', 'carrete', 'carretes', 'rollo', 'rollos', 'cine 8mm', 
      'pelicula de cine', '16mm', 'proyector', 'celuloide', 'filme', 'peliculas de super 8',
      'rollos de 16mm', 'adaptadores para rollos'
    ],
    response: () => ({
      text: `🎞️ **Aclaración sobre Película de Cine en Rollo:**\n\nActualmente **NO procesamos película de cine de carrete/rollo de celuloide para proyector** (como Super 8, 8mm Cine o 16mm).\n\n✅ **Lo que SÍ digitalizamos con gusto:**\nCintas magnéticas de videocámara en cartucho de **8mm (Video8, Hi8 y Digital8)**, así como VHS normal, Betamax y MiniDV.\n\n¿Tienes cintas de videocámara u otros recuerdos que desees digitalizar?`,
      quickReplies: [
        { label: '📼 Ver Formatos Soportados', action: 'FORMATS_INFO' },
        { label: '💰 Cotizar Cintas de Video', action: 'NAVIGATE_CALCULATOR' },
        { label: '👤 Consultar con Asesor', action: 'REQUEST_HUMAN' }
      ]
    })
  },

  // 7. Aclaración Específica: VHS-C y S-VHS
  {
    id: 'vhsc_unsupported',
    category: 'vhsc_unsupported',
    priority: 94,
    keywords: ['vhs-c', 'vhsc', 'vhs c', 'svhs', 's-vhs', 'cassette chiquito vhs', 'cassettes pequenos vhs-c', 'adaptador vhs'],
    response: () => ({
      text: `📼 **Aclaración sobre formato VHS-C:**\n\nPor el momento procesamos únicamente **VHS estándar normal (cartucho grande)**, Betamax, Video8, Hi8, Digital8 y MiniDV.\n\nActualmente no contamos con adaptadores de tracción mecánica para **VHS-C ni S-VHS**. Te sugerimos verificar si tus cintas pequeñas corresponden a **Video8 / Hi8 / MiniDV**, las cuales SÍ procesamos con equipo profesional dedicado.\n\n¿Gustas que revisemos las fotos de tus cintas por WhatsApp?`,
      quickReplies: [
        { label: '💬 Enviar Foto por WhatsApp', action: 'WHATSAPP_CONTACT' },
        { label: '📦 Ver Formatos Disponibles', action: 'FORMATS_INFO' },
        { label: '👤 Hablar con Asesor', action: 'REQUEST_HUMAN' }
      ]
    })
  },

  // 8. Fotos y Álbumes Familiares
  {
    id: 'photos_and_albums',
    category: 'photos_albums',
    priority: 87,
    keywords: [
      'fotos', 'fotografias', 'album', 'albumes', 'escanear fotos', 'escaneo', 
      'fotos viejas', 'papel', 'diapositiva', 'diapositivas', 'negativos', 'fotos familiares'
    ],
    response: () => ({
      text: `📸 **Escaneo Profesional de Fotografías y Álbumes:**\n\nPreservamos tus fotos familiares en formato digital de máxima resolución:\n\n• 📷 **Fotos Sueltas en Papel:** **$7 MXN / foto** (Escaneo plano a 600 DPI, incluye corrección de color y contraste).\n• 📚 **Álbum Familiar Completo:** **$1,200 MXN** (Digitalización íntegra hoja por hoja, hasta 200 fotos por álbum).\n• **Entrega:** Archivos JPG ordenados en tu Memoria USB y devolución de tus originales intactos.\n\n¿Cuántas fotos o álbumes tienes aproximadamente?`,
      quickReplies: [
        { label: '🧮 Cotizar Fotografías', action: 'NAVIGATE_CALCULATOR' },
        { label: '🚚 Opciones de Recepción', action: 'LOCATION_INFO' },
        { label: '👤 Hablar con un Asesor', action: 'REQUEST_HUMAN' }
      ]
    })
  },

  // 9. Medios de Entrega, Retorno de Cintas Originales y Compatibilidad (Smart TV, Celular, USB)
  {
    id: 'delivery_media_devices',
    category: 'delivery_media',
    priority: 89,
    keywords: [
      'usb', 'smart tv', 'computadora', 'celular', 'disco duro', 'memoria', 'mp4', 
      'nube', 'link', 'descarga', 'como entregan', 'formato de archivo', 'reproducir',
      'regresan mis cintas', 'devuelven mis cintas', 'devolucion de cintas', 'conservo mis cintas',
      'me regresan', 'mis cintas originales', 'material original', 'iphone', 'smart tv'
    ],
    response: () => ({
      text: `💻 **Dispositivo de Almacenamiento, Entrega Digital y Devolución:**\n\n1. 📼 **Devolución de tus Cintas:** El **100% de tus cintas y recuerdos originales se te regresan intactas** para que las conserves como reliquia familiar.\n2. 💾 **Memoria USB o Disco Duro:** **El cliente proporciona su propio dispositivo físico** (mínimo 50GB recomendados) al enviar sus cintas. DigiMemories no regala ni proporciona el dispositivo físico, pero la entrega de todos tus archivos en formato **MP4 universal (H.264 / AAC)** de alta definición y su organización por carpetas está 100% incluida sin costo adicional.\n3. 📺 **Compatibilidad Total:**\n   • **Smart TVs:** Samsung, LG, Sony, Roku, Hisense, etc.\n   • **Computadoras:** Mac, Windows y Linux.\n   • **Celulares y Tablets:** iPhone, Android y iPad.\n\nSi lo requieres, también podemos proporcionarte un enlace de respaldo privado en la nube.`,
      quickReplies: [
        { label: '💰 Cotizar mis Cintas', action: 'NAVIGATE_CALCULATOR' },
        { label: '🚚 ¿Cómo entrego mis cintas?', action: 'LOCATION_INFO' },
        { label: '👤 Hablar con un Asesor', action: 'REQUEST_HUMAN' }
      ]
    })
  },

  // 9b. Política Exclusiva de Memoria USB y Dispositivos de Almacenamiento
  {
    id: 'storage_usb_harddrive_policy',
    category: 'storage_policy',
    priority: 96,
    keywords: [
      'regalan la usb', 'regalan usb', 'incluyen la usb', 'dan la usb', 'ustedes ponen la usb',
      'ustedes dan el disco', 'quien pone la usb', 'tengo que llevar usb', 'yo pongo la usb',
      'tengo que comprar usb', 'venden usb', 'precio de la usb', 'costo de la usb', 'traer usb',
      'proporcionan usb', 'medio de almacenamiento', 'ustedes regalan', 'usb gratis', 'memoria usb gratis',
      'memoria gratis', 'ustedes ponen la memoria usb gratis', 'ustedes ponen la memoria', 'dan usb gratis'
    ],
    response: () => ({
      text: `💾 **Política sobre Memoria USB y Disco Duro:**\n\n• **¿DigiMemories regala o incluye gratis la memoria USB?**\n  **No**, DigiMemories **no regala ni proporciona gratis el dispositivo físico** de almacenamiento.\n\n• **¿Cómo recibes tus recuerdos digitalizados?**\n  Tú nos proporcionas tu propia memoria USB o disco duro externo (mínimo 50GB recomendados) al entregarnos tus cintas. (DigiMemories no vende ni regala medios físicos).\n\n• **¿Cobran por pasar los archivos?**\n  ¡No! La transferencia, conversión a MP4 universal de alta calidad y organización ordenada por carpetas está **100% incluida sin costo adicional**.\n\n¿Deseas cotizar tu material y agendar tu entrega?`,
      quickReplies: [
        { label: '💰 Cotizar mis Cintas', action: 'NAVIGATE_CALCULATOR' },
        { label: '📄 Generar Presupuesto PDF', action: 'NAVIGATE_CONTACT' },
        { label: '👤 Hablar con un Asesor', action: 'REQUEST_HUMAN' }
      ]
    })
  },

  // 9c. Política Exclusiva de Ajuste de Saldo Restante y Duración Real
  {
    id: 'balance_adjustment_hours_empty_tape',
    category: 'balance_adjustment',
    priority: 96,
    keywords: [
      'el total restante puede cambiar', 'el total puede cambiar', 'puede cambiar el total',
      'puede cambiar el saldo', 'cambia el saldo restante', 'cambia el saldo', 'cambia el precio', 'ajuste de saldo',
      'cinta vacia', 'casette vacio', 'si la cinta no tiene nada', 'si no se graba', 'si no se digitalizo',
      'si no se digitaliza', 'si tiene mas horas', 'mas de 2 horas', 'mas de dos horas', 'horas extras', 'descuento cinta vacia',
      'que pasa si dura mas', 'cinta no se digitalizo', 'mas horas'
    ],
    response: () => ({
      text: `⚖️ **Ajuste del Total y Saldo Restante:**\n\nEl presupuesto inicial y el anticipo del 50% son **estimaciones iniciales**, y tu saldo final a liquidar **se ajusta con honestidad tras la captura en laboratorio**:\n\n1. 🚫 **Cintas Vacías o Ilegibles:** Si una cinta resulta estar vacía, desmagnetizada o con daño irreparable que impida su lectura, **NO se te cobra y se descuenta íntegramente de tu saldo restante**.\n2. ⏳ **Cintas con Más de 2 Horas:** La tarifa base incluye hasta 2 horas completas por cinta. Si alguna cinta contiene más de 2 horas reales de video, el tiempo extra se factura a **$50 MXN por hora adicional**.\n\n📱 **Auditoría en Vivo:** Podrás ver el estado individual de cada cinta y tu **saldo final exacto en el Portal de Rastreo** con tu PIN asignado antes de liquidar contra-entrega.`,
      quickReplies: [
        { label: '🔍 Rastrear con mi PIN', action: 'NAVIGATE_TRACK' },
        { label: '💰 Calcular Cotización', action: 'NAVIGATE_CALCULATOR' },
        { label: '👤 Hablar con un Asesor', action: 'REQUEST_HUMAN' }
      ]
    })
  },

  // 10. Ubicación, Logística General y Recepción (100% Sin Contacto)
  {
    id: 'location_workshop_overview',
    category: 'location_logistics',
    priority: 90,
    keywords: [
      'donde estan', 'ubicacion', 'direccion', 'sucursal', 'taller', 'donde entrego', 
      'donde los llevo', 'donde puedo llevar', 'local', 'donde se encuentran'
    ],
    response: () => ({
      text: `🚚 **Logística de Entrega y Recepción DigiMemories:**\n\nPor seguridad, cuidado del material y conveniencia de todos nuestros clientes, operamos como laboratorio privado especializado con **dos modalidades de recepción 100% sin contacto:**\n\n1. 🛵 **Uber Flash / Didi (CDMX y Área Metropolitana):** Envías tus recuerdos el mismo día solicitando un chofer desde tu app hacia la dirección privada coordinada por WhatsApp. *(En pedidos a partir de $1,500 MXN el viaje de retorno va por nuestra cuenta)*.\n2. 📦 **Paquetería Nacional (DHL / FedEx / Estafeta):** Para toda la República Mexicana y CDMX, despachas tu caja desde tu sucursal más cercana. *(En pedidos a partir de $2,000 MXN el retorno asegurado es 100% GRATIS)*.\n\n📱 **WhatsApp de Coordinación:** +52 55 4888 9876`,
      quickReplies: [
        { label: '🛵 Enviar por Uber Flash', action: 'UBER_FLASH_INFO' },
        { label: '📦 Envíos por Paquetería', action: 'NATIONAL_SHIPPING' },
        { label: '💬 Coordinar por WhatsApp', action: 'WHATSAPP_CONTACT' },
        { label: '💰 Cotizar mis Cintas', action: 'NAVIGATE_CALCULATOR' }
      ]
    })
  },

  // 11. Aclaración sobre Entregas Personales / Puntos de Encuentro
  {
    id: 'safe_meeting_points',
    category: 'safe_meeting_points',
    priority: 90,
    keywords: [
      'punto de encuentro', 'puntos de encuentro', 'plaza', 'plazas', 'parque delta', 
      'reforma 222', 'wtc', 'oasis coyoacan', 'plaza universidad', 'galerias insurgentes',
      'cita personal', 'entrega personal', 'entregas personales', 'ir al taller', 'ir en persona'
    ],
    response: () => ({
      text: `ℹ️ **Información sobre Recepción y Entrega:**\n\nPara garantizar la máxima seguridad y cuidado del material de todos nuestros clientes, operamos como **laboratorio privado especializado sin atención presencial ni puntos de encuentro**.\n\n📦 **Manejamos 2 modalidades seguras 100% sin contacto:**\n1. 🛵 **Uber Flash / Didi (CDMX y Área Metropolitana):** Pides un chofer desde tu app hacia la dirección coordinada por WhatsApp.\n2. 📦 **Paquetería Nacional (DHL / FedEx / Estafeta):** Despachas desde tu sucursal más cercana en cualquier estado del país o CDMX.\n\n📱 **WhatsApp de Coordinación:** +52 55 4888 9876`,
      quickReplies: [
        { label: '🛵 Enviar por Uber Flash', action: 'UBER_FLASH_INFO' },
        { label: '📦 Enviar por Paquetería', action: 'NATIONAL_SHIPPING' },
        { label: '💬 Escribir por WhatsApp', action: 'WHATSAPP_CONTACT' },
        { label: '💰 Cotizar mis Cintas', action: 'NAVIGATE_CALCULATOR' }
      ]
    })
  },

  // 12. Uber Flash / Didi Envíos (CDMX y Área Metropolitana)
  {
    id: 'uber_flash_service',
    category: 'uber_flash',
    priority: 88,
    keywords: [
      'uber', 'uber flash', 'didi', 'didi envios', 'chofer', 'mensajero', 'manda un uber', 
      'recoleccion cdmx', 'domicilio cdmx', 'envio express cdmx'
    ],
    response: () => ({
      text: `🛵 **Servicio por Uber Flash / Didi en CDMX:**\n\nEs la opción más rápida y cómoda para enviar tus cintas sin salir de casa u oficina:\n\n1. **Empaca tus recuerdos:** Colócalos en una bolsa o caja protegida con plástico burbuja.\n2. **Solicita el viaje:** Pides el servicio de Uber Flash o Didi Envíos en tu propia app hacia la dirección exacta que te proporcionamos por WhatsApp.\n3. **Recepción Inmediata:** Te confirmamos al recibir tu paquete y te asignamos tu Folio de Rastreo y PIN.\n\n🎁 **Promoción:** En pedidos de **$1,500 MXN o más**, el envío de retorno de tus cintas y tu USB va **100% GRATIS** por nuestra cuenta.`,
      quickReplies: [
        { label: '💬 Pedir Dirección por WhatsApp', action: 'WHATSAPP_CONTACT' },
        { label: '💰 Cotizar Servicio', action: 'NAVIGATE_CALCULATOR' },
        { label: '👤 Hablar con un Asesor', action: 'REQUEST_HUMAN' }
      ]
    })
  },

  // 13. Envíos Nacionales e Interior de la República (DHL / FedEx / Estafeta)
  {
    id: 'national_shipping_service',
    category: 'national_shipping',
    priority: 88,
    keywords: [
      'dhl', 'fedex', 'estafeta', 'paqueteria', 'provincia', 'interior', 'republica', 
      'monterrey', 'guadalajara', 'puebla', 'queretaro', 'tijuana', 'merida', 'cancun', 
      'envios nacionales', 'enviar por paqueteria'
    ],
    response: () => ({
      text: `📦 **Envíos a Todo México por Paquetería Nacional:**\n\nAtendemos familias de cualquier estado de la República Mexicana (Guadalajara, Monterrey, Puebla, Querétaro, Mérida, Tijuana, etc.):\n\n1. **Empaque Seguro:** Empaca tus cintas o fotos en una caja firme con relleno protector.\n2. **Despacho:** Llévala a tu sucursal más cercana de DHL, FedEx o Estafeta con los datos de envío que te proporcionamos por WhatsApp.\n3. **Rastreo 24/7:** Al llegar a nuestro laboratorio, te enviamos tu Folio de 6 dígitos y PIN de 4 dígitos para ver el avance en vivo.\n4. **Retorno Asegurado:** Te devolvemos tus cintas originales y tu Memoria USB con guía rastreable.\n\n🎁 **Promoción:** En órdenes a partir de **$2,000 MXN**, el envío de retorno asegurado es **100% GRATIS**.`,
      quickReplies: [
        { label: '💰 Cotizar mis Cintas', action: 'NAVIGATE_CALCULATOR' },
        { label: '💬 Solicitar Datos de Envío', action: 'WHATSAPP_CONTACT' },
        { label: '👤 Hablar con un Asesor', action: 'REQUEST_HUMAN' }
      ]
    })
  },

  // 14. Seguridad, Moho, Hongos y Cintas Dañadas / Vacías
  {
    id: 'tape_safety_mold_damage',
    category: 'tape_safety_mold',
    priority: 95,
    keywords: [
      'moho', 'hongo', 'hongos', 'rota', 'reventada', 'pegada', 'danada', 'danadas', 
      'destruyen', 'se puede romper', 'polvo blanco', 'seguridad de mis cintas', 'riesgo',
      'cinta rota', 'cinta danada', 'desmagnetizada', 'no se puede leer', 'esta rota',
      'vacia', 'cinta vacia', 'garantia si la cinta'
    ],
    response: () => ({
      text: `🛡️ **Protocolo de Cuidado y Preservación de Cintas:**\n\nSabemos que tus cintas contienen memorias irrepetibles. Nuestro protocolo incluye:\n\n1. **Inspección Física Gratuita:** Revisamos la tensión mecánica y el estado del carrete antes de introducirlo a cualquier equipo.\n2. **Moho Leve o Polvo:** Realizamos una limpieza mecánica suave sin costo para que la cinta pueda ser leída por los cabezales.\n3. **Cinta No Reproducible o Vacía:** Si una cinta está completamente desmagnetizada o rota irreparablemente y no se puede rescatar, **NO se te cobra esa cinta y se descuenta de tu saldo restante**.\n4. **Devolución Garantizada:** El 100% de tus cartuchos originales se te regresan intactos junto con tu memoria USB.`,
      quickReplies: [
        { label: '💰 Cotizar mis Cintas', action: 'NAVIGATE_CALCULATOR' },
        { label: '🚚 Opciones de Envío', action: 'LOCATION_INFO' },
        { label: '👤 Consultar Caso Específico', action: 'REQUEST_HUMAN' }
      ]
    })
  },

  // 15. Remasterización, Mejora de Audio y Video (HD / Color)
  {
    id: 'enhancement_hd_color',
    category: 'enhancement_hd',
    priority: 86,
    keywords: [
      'mejora', 'remasterizacion', 'remasterizar', '4k', 'hd', 'color', 
      'restaurar', 'nitidez', 'estabilizacion', 'ruido de video', 'mejora de video',
      'mejora de audio', 'limpieza de audio', 'filtros de audio'
    ],
    response: () => ({
      text: `✨ **Servicio Opcional de Mejora de Audio y Video ($150 MXN / cinta):**\n\nAplicamos procesamiento digital profesional cuadro por cuadro para revivir grabaciones antiguas:\n\n• 🎨 **Corrección de Color y Contraste:** Balance de blancos, corrección de tonos deslavados y ajuste de saturación.\n• 🔇 **Filtro de Ruido de Audio:** Reducción del siseo estático analógico (*tape hiss*) y realce de voces.\n• 📐 **Estabilización de Imagen:** Corrección de oscilaciones verticales y líneas de sincronía (*tracking*).\n\n¿Te gustaría incluir este servicio en tu cotización?`,
      quickReplies: [
        { label: '🧮 Cotizar con Mejora', action: 'NAVIGATE_CALCULATOR' },
        { label: '⏱️ Tiempos de Entrega', action: 'TURNAROUND_TIME' },
        { label: '👤 Hablar con un Asesor', action: 'REQUEST_HUMAN' }
      ]
    })
  },

  // 16. Tiempos de Entrega y Proceso
  {
    id: 'turnaround_times',
    category: 'turnaround_times',
    priority: 91,
    keywords: [
      'tiempo', 'tardan', 'cuanto tarda', 'demora', 'dias', 'plazo', 'fecha de entrega', 
      'cuando me lo entregan', 'tiempo de entrega', 'cuanto demora', 'cuanto tardan', 'demora un lote'
    ],
    response: () => ({
      text: `⏱️ **Tiempos de Digitalización DigiMemories:**\n\n• 📦 **Tiempo Estándar:** De **3 a 5 días hábiles** para lotes de 1 a 10 cintas.\n• 📚 **Lotes Grandes (15 a 30+ cintas):** De **7 a 10 días hábiles**.\n• ⚡ **Servicio Express (24 a 48h):** Disponible con recargo prioritario para aniversarios o eventos urgentes.\n\n💡 **¿Por qué este tiempo?**\nDigitalizamos a **velocidad real 1:1** (una cinta de 2 horas se reproduce durante 2 horas exactas) en cabezales calibrados para no acelerar mecánicamente la cinta ni perder calidad.`,
      quickReplies: [
        { label: '🔍 Rastrear una Orden en Curso', action: 'NAVIGATE_TRACK' },
        { label: '💰 Cotizar mis Cintas', action: 'NAVIGATE_CALCULATOR' },
        { label: '👤 Hablar con un Asesor', action: 'REQUEST_HUMAN' }
      ]
    })
  },

  // 17. Servicio Urgente / Express
  {
    id: 'express_urgent_service',
    category: 'express_service',
    priority: 92,
    keywords: [
      'urgente', 'urgencia', 'express', 'rapido', 'para hoy', 'para manana', 
      'lo antes posible', 'homenaje', 'funeral', 'aniversario urgente', 'cumpleanos manana',
      'servicio express', 'entrega rapida'
    ],
    response: () => ({
      text: `⚡ **Servicio Express / Urgente (24 a 48 Horas):**\n\nSi tienes un evento familiar próximo (aniversario, homenaje, cumpleaños o regalo urgente), contamos con servicio prioritario:\n\n• **Tiempo:** 24 a 48 horas tras recibir tu material.\n• **Disponibilidad:** Sujeto a cupo diario de máquinas de digitalización.\n• **Cargo adicional:** Costo prioritario por agilización.\n\nPor favor contáctanos por WhatsApp de inmediato para apartar tu turno express.`,
      quickReplies: [
        { label: '💬 Solicitar Express por WhatsApp', action: 'WHATSAPP_CONTACT' },
        { label: '💰 Cotizar Servicio Normal', action: 'NAVIGATE_CALCULATOR' },
        { label: '👤 Hablar con un Asesor', action: 'REQUEST_HUMAN' }
      ]
    })
  },

  // 18. Métodos de Pago y Anticipo (SPEI, Mercado Pago, OXXO, Efectivo)
  {
    id: 'payment_methods_and_deposit',
    category: 'payment_spei_mp',
    priority: 90,
    keywords: [
      'pago', 'pagos', 'anticipo', 'como se paga', 'formas de pago', 'metodos de pago', 
      'tarjeta', 'tarjetas', 'transferencia', 'spei', 'clabe', 'bbva', 'oxxo', 'mercadopago', 
      'mercado pago', 'efectivo', 'cuenta bancaria'
    ],
    response: () => ({
      text: `💳 **Esquema de Pago y Métodos Aceptados:**\n\nPara tu total seguridad, nuestro esquema es:\n1. **50% de Anticipo:** Al ingresar tu material a nuestro laboratorio (se te asigna tu PIN de rastreo en vivo).\n2. **50% Restante (Estimado):** Al concluir la digitalización. *Aviso: Tu saldo final se ajusta si una cinta viene vacía/dañada (se descuenta) o si excede las 2 horas ($50 MXN/h extra)*.\n\n💾 **Almacenamiento:** El cliente proporciona su propia memoria USB o disco duro externo (DigiMemories no proporciona el medio físico).\n\n🏦 **Métodos de Pago:**\n• 📲 **Transferencia Bancaria (SPEI):**\n  - Banco: **BBVA México**\n  - CLABE: **012180015492837190**\n  - Titular: **DigiMemories México**\n• 💳 **Mercado Pago:** Tarjetas de Crédito, Débito y pagos en efectivo en tiendas **OXXO / 7-Eleven**.`,
      quickReplies: [
        { label: '📄 Generar Presupuesto', action: 'NAVIGATE_CONTACT' },
        { label: '🔍 Rastrear con mi PIN', action: 'NAVIGATE_TRACK' },
        { label: '👤 Hablar con un Asesor', action: 'REQUEST_HUMAN' }
      ]
    })
  },

  // 19. Facturación Electrónica y CFDI
  {
    id: 'invoicing_cfdi',
    category: 'invoicing_cfdi',
    priority: 88,
    keywords: [
      'factura', 'facturas', 'facturacion', 'facturan', 'cfdi', 'rfc', 'sat', 
      'iva', 'comprobante fiscal', 'deducible'
    ],
    response: () => ({
      text: `🧾 **Facturación Electrónica (CFDI):**\n\n¡Sí, emitimos facturas fiscales válidas ante el SAT!\n\n• **Requisitos:** Al confirmar tu orden, envíanos tu Constancia de Situación Fiscal (CSF), uso de CFDI y correo para el envío del archivo PDF y XML.\n• **IVA:** Nuestras cotizaciones desglosan el IVA correspondiente para que puedas deducirlo al 100%.\n\n¿Deseas que preparemos tu presupuesto con datos fiscales?`,
      quickReplies: [
        { label: '📄 Generar Cotización Formal', action: 'NAVIGATE_CONTACT' },
        { label: '💬 Enviar CSF por WhatsApp', action: 'WHATSAPP_CONTACT' },
        { label: '👤 Hablar con un Asesor', action: 'REQUEST_HUMAN' }
      ]
    })
  },

  // 20. Portal de Rastreo y PIN de Seguridad
  {
    id: 'order_tracking_pin',
    category: 'tracking_pin',
    priority: 91,
    keywords: [
      'rastreo', 'rastrear', 'pin', 'folio', 'como va mi orden', 'estatus', 
      'seguimiento', 'consultar orden', 'mi pedido', 'avance', 'portal de rastreo', 'folio de mi pedido'
    ],
    response: () => ({
      text: `🔍 **Portal de Rastreo en Tiempo Real:**\n\nPuedes consultar el avance cinta por cinta de tu pedido en cualquier momento ingresando a nuestro **Portal de Rastreo** con tus dos claves:\n\n1. **Folio de Orden:** Número de 6 dígitos (ej. \`104820\`).\n2. **PIN de Seguridad:** Código de 4 dígitos asignado a tu orden (ej. \`4829\`).\n\nAllí podrás ver fotos de la inspección, porcentaje de avance, horas digitalizadas y saldo restante.`,
      quickReplies: [
        { label: '🔍 Ir al Portal de Rastreo', action: 'NAVIGATE_TRACK' },
        { label: '👤 Consultar con un Asesor', action: 'REQUEST_HUMAN' }
      ]
    })
  },

  // 21. Privacidad y Confidencialidad (Prioridad Alta)
  {
    id: 'privacy_and_security',
    category: 'privacy_security',
    priority: 96,
    keywords: [
      'privacidad', 'privado', 'confidencial', 'confidencialidad', 'privacidad de los videos',
      'seguridad de los videos', 'videos familiares privados', 'suben a internet', 'publican', 
      'mis videos', 'secreto profesional', 'proteccion de datos', 'contenido de mis videos'
    ],
    response: () => ({
      text: `🔒 **Garantía Estricta de Privacidad y Confidencialidad:**\n\nTus memorias familiares son sagradas:\n\n1. **Cero Publicación:** Jamás subimos, transmitimos ni publicamos ningún video o foto a servidores públicos o redes sociales.\n2. **Estaciones Desconectadas:** El proceso de captura se realiza en terminales locales aisladas.\n3. **Borrado Seguro:** Una vez que confirmas que recibiste tu memoria USB a tu entera satisfacción, los archivos temporales se eliminan permanentemente de nuestros discos de trabajo.`,
      quickReplies: [
        { label: '💰 Cotizar mis Cintas', action: 'NAVIGATE_CALCULATOR' },
        { label: '🚚 Opciones de Envío', action: 'LOCATION_INFO' },
        { label: '👤 Hablar con un Asesor', action: 'REQUEST_HUMAN' }
      ]
    })
  },

  // 22. Horarios de Atención
  {
    id: 'business_hours',
    category: 'business_hours',
    priority: 84,
    keywords: [
      'horario', 'horarios', 'abren', 'cierran', 'atienden', 'que dias', 
      'sabado', 'domingo', 'dias habiles', 'abierto', 'abren los sabados'
    ],
    response: () => ({
      text: `🕒 **Horarios de Atención DigiMemories:**\n\n• 🗓️ **Lunes a Viernes:** 9:00 AM – 7:00 PM\n• 🗓️ **Sábados:** 10:00 AM – 3:00 PM\n• 🗓️ **Domingos:** Cerrado (Atención de cotizaciones en línea 24/7 vía asistente virtual).\n\n📱 **WhatsApp:** +52 55 4888 9876\n\n¿En qué podemos apoyarte hoy?`,
      quickReplies: [
        { label: '💰 Cotizar mis Cintas', action: 'NAVIGATE_CALCULATOR' },
        { label: '💬 Escribir por WhatsApp', action: 'WHATSAPP_CONTACT' },
        { label: '👤 Hablar con Asesor', action: 'REQUEST_HUMAN' }
      ]
    })
  },

  // 23. Canales de Contacto Directo
  {
    id: 'contact_channels',
    category: 'contact_channels',
    priority: 85,
    keywords: [
      'contacto', 'telefono', 'whatsapp', 'correo', 'email', 'redes', 
      'instagram', 'facebook', 'como me comunico', 'llamar'
    ],
    response: () => ({
      text: `📞 **Canales de Contacto Directo DigiMemories:**\n\n• 💬 **WhatsApp:** [+52 55 4888 9876](https://wa.me/525548889876)\n• ✉️ **Correo Electrónico:** contactodigimemories@gmail.com\n• 📸 **Instagram:** @digimemories_mx\n• 🌐 **Sitio Web:** www.digimemories.com.mx\n\n¡Estamos a tus órdenes para resolver cualquier duda!`,
      quickReplies: [
        { label: '💬 Abrir WhatsApp', action: 'WHATSAPP_CONTACT' },
        { label: '📄 Ir a Formulario de Contacto', action: 'NAVIGATE_CONTACT' },
        { label: '👤 Hablar con Operador en Vivo', action: 'REQUEST_HUMAN' }
      ]
    })
  },

  // 24. Proceso Paso a Paso
  {
    id: 'how_it_works_steps',
    category: 'how_it_works',
    priority: 86,
    keywords: [
      'como funciona', 'proceso', 'pasos', 'como es el proceso', 'como le hago', 
      'cual es el procedimiento', 'como inicio', 'proceso paso a paso'
    ],
    response: () => ({
      text: `📋 **¿Cómo es el proceso paso a paso?**\n\n1. **Cotización:** Calculas tu presupuesto en línea o por chat y generas tu Folio.\n2. **Recepción:** Envías tus cintas por Uber Flash (CDMX) o Paquetería Nacional (DHL / FedEx).\n3. **Inspección y PIN:** Revisamos el estado físico de cada cinta y te asignamos tu PIN de rastreo con anticipo del 50%.\n4. **Digitalización 1:1:** Procesamos tus videos a velocidad real en equipos de estudio con corrección de señal.\n5. **Entrega Física:** Te entregamos tu Memoria USB con tus archivos MP4 y te devolvemos tus cintas originales intactas.`,
      quickReplies: [
        { label: '💰 Iniciar Cotización', action: 'NAVIGATE_CALCULATOR' },
        { label: '📍 Ver Opciones de Envío', action: 'LOCATION_INFO' },
        { label: '👤 Hablar con Asesor', action: 'REQUEST_HUMAN' }
      ]
    })
  },

  // 25. Quiénes Somos y Garantía
  {
    id: 'who_we_are_guarantee',
    category: 'who_we_are',
    priority: 83,
    keywords: [
      'quienes son', 'quien es digimemories', 'experiencia', 'confianza', 
      'garantia', 'por que elegirlos', 'son confiables', 'por que confiar'
    ],
    response: () => ({
      text: `⭐ **Sobre DigiMemories México:**\n\nSomos un laboratorio especializado con más de una década de experiencia dedicados exclusivamente a la preservación y restauración analógica de recuerdos familiares e históricos.\n\n• **Equipos profesionales dedicados** (cabezales de estudio con TBC).\n• **Trato 100% individualizado y seguro** con Folio y PIN.\n• **Garantía total de satisfacción:** Si una cinta está en blanco o no es legible, no se te cobra.\n\n¿Cómo podemos ayudarte con tus recuerdos hoy?`,
      quickReplies: [
        { label: '💰 Cotizar mis Recuerdos', action: 'NAVIGATE_CALCULATOR' },
        { label: '🚚 Opciones de Envío', action: 'LOCATION_INFO' },
        { label: '👤 Hablar con un Asesor', action: 'REQUEST_HUMAN' }
      ]
    })
  },

  // 26. Saludos y Bienvenida
  {
    id: 'greetings_welcome',
    category: 'greetings',
    priority: 75,
    keywords: [
      'hola', 'buenas', 'buen dia', 'buenos dias', 'buenas tardes', 'buenas noches', 
      'saludos', 'que tal', 'hey', 'alo', 'inicio', 'empezar', 'hi', 'hola guillermo',
      'que onda'
    ],
    response: () => ({
      text: `¡Hola! 👋 Qué gusto saludarte. Soy **Guillermo**, tu asesor virtual y especialista en preservación analógica de **DigiMemories**.\n\nEstamos listos para rescatar tus cintas **VHS, Betamax, Hi8, MiniDV, discos DVD y fotos familiares** en alta definición.\n\n¿En qué te puedo asesorar hoy?`,
      quickReplies: [
        { label: '💰 Cotizar mis Cintas', action: 'NAVIGATE_CALCULATOR' },
        { label: '🚚 Envíos y Ubicación', action: 'LOCATION_INFO' },
        { label: '⏱️ Tiempos de Entrega', action: 'TURNAROUND_TIME' },
        { label: '👤 Hablar con un Asesor Humano', action: 'REQUEST_HUMAN' }
      ]
    })
  },

  // 27. Agradecimientos y Cortesía
  {
    id: 'gratitude_politeness',
    category: 'gratitude',
    priority: 80,
    keywords: [
      'gracias', 'muchas gracias', 'mil gracias', 'te agradezco', 'excelente gracias', 
      'perfecto gracias', 'muy amable', 'super bien', 'entendido gracias', 'mil gracias por todo'
    ],
    response: () => ({
      text: `¡Ha sido todo un placer ayudarte! 😊 En DigiMemories estamos para cuidar de tus recuerdos familiares más preciados.\n\n¿Deseas cotizar algún material adicional o tienes alguna otra pregunta?`,
      quickReplies: [
        { label: '💰 Cotizar mis Cintas', action: 'NAVIGATE_CALCULATOR' },
        { label: '🚚 Opciones de Entrega', action: 'LOCATION_INFO' },
        { label: '💬 WhatsApp Directo', action: 'WHATSAPP_CONTACT' }
      ]
    })
  },

  // 28. Despedida
  {
    id: 'farewell',
    category: 'farewell',
    priority: 78,
    keywords: [
      'adios', 'bye', 'hasta luego', 'nos vemos', 'que tengas buen dia', 
      'luego te contacto', 'gracias por todo'
    ],
    response: () => ({
      text: `¡Hasta pronto! 👋 Recuerda que tus recuerdos analógicos se degradan con los años; cuando decidas digitalizarlos, estaremos listos para atenderte con la máxima calidad.\n\n¡Que tengas un excelente día!`,
      quickReplies: [
        { label: '💬 Guardar WhatsApp', action: 'WHATSAPP_CONTACT' },
        { label: '🧮 Abrir Calculadora', action: 'NAVIGATE_CALCULATOR' }
      ]
    })
  },

  // 29. Confirmaciones y Afirmaciones
  {
    id: 'affirmations',
    category: 'affirmation',
    priority: 70,
    keywords: [
      'si', 'claro', 'por favor', 'me interesa', 'de acuerdo', 'va', 'ok', 
      'dale', 'perfecto', 'me parece bien', 'quiero hacerlo'
    ],
    response: () => ({
      text: `¡Excelente! Para dar el siguiente paso y reservar la digitalización de tu material:\n\n1. Puedes ingresar a la **Calculadora y Formulario** para generar tu presupuesto en PDF con Folio de rastreo.\n2. O si lo prefieres, escribirnos directamente por WhatsApp para coordinar la recepción de tus cintas hoy mismo.`,
      quickReplies: [
        { label: '📄 Generar Presupuesto PDF', action: 'NAVIGATE_CONTACT' },
        { label: '💬 Escribir por WhatsApp', action: 'WHATSAPP_CONTACT' },
        { label: '👤 Hablar con Asesor en Vivo', action: 'REQUEST_HUMAN' }
      ]
    })
  }
];

// ---------------------------------------------------------------------------
// 4. ADVANCED SCORE-BASED INTENT MATCHER & DISPATCHER
// ---------------------------------------------------------------------------

export function getBotResponse(userMessage: string): BotReplyResult {
  const normalized = normalizeText(userMessage);

  // 1. Check explicit human escalation
  const humanEscalationPatterns = [
    /\b(asesor humano|persona real|operador en vivo|agente humano|atencion humana|un humano)\b/i,
    /\bhablar con (alguien|una persona|un asesor|un humano|un agente)\b/i,
    /\b(quiero|deseo|pasame a|comunicarme con|atender con) (un humano|una persona|un operador|un agente|un asesor)\b/i,
    /\b(tengo una queja|hacer un reclamo|llamar por telefono)\b/i,
    /\b(necesito que un operador|operador me atienda)\b/i
  ];
  if (humanEscalationPatterns.some(pat => pat.test(normalized))) {
    return {
      text: '👨‍💻 He notificado de inmediato a nuestro **Administrador en Vivo**. En un momento un asesor humano tomará el control de este chat para asistirte de forma personalizada.\n\nTambién puedes contactarnos directamente por WhatsApp si deseas una respuesta instantánea:',
      quickReplies: [
        { label: '💬 Abrir WhatsApp Directo', action: 'WHATSAPP_CONTACT' },
        { label: '🧮 Ver Calculadora', action: 'NAVIGATE_CALCULATOR' }
      ],
      isEscalation: true
    };
  }

  // 2. Try quote pattern parser first (high precision for multi-item math)
  const parsedQuote = tryParseQuoteInquiry(userMessage);
  if (parsedQuote) {
    return parsedQuote;
  }

  // 3. Score-based Intent Matching across knowledge base
  let bestIntent: BotIntent | null = null;
  let highestScore = 0;

  for (const intent of BOT_KNOWLEDGE_BASE) {
    let score = 0;
    const priority = intent.priority || 50;

    // Check keyword matches with boundary-safe matcher
    for (const kw of intent.keywords) {
      if (matchesKeyword(normalized, kw)) {
        const normKw = normalizeText(kw);
        if (normalized === normKw) {
          // Exact match
          score += 80;
        } else if (normKw.includes(' ')) {
          // Multi-word phrase match
          score += 45;
        } else {
          // Single word match
          score += 20;
        }
      }
    }

    // Check regex patterns if defined
    if (intent.patterns) {
      for (const pattern of intent.patterns) {
        if (pattern.test(normalized)) {
          score += 50;
        }
      }
    }

    // Weight by priority
    if (score > 0) {
      score += priority * 0.2;
    }

    if (score > highestScore) {
      highestScore = score;
      bestIntent = intent;
    }
  }

  // If a confident intent was matched (score >= 18)
  if (bestIntent && highestScore >= 18) {
    return bestIntent.response(userMessage, normalized);
  }

  // 4. Default helpful, intelligent fallback (Escalation to live admin with options)
  return {
    text: `Entiendo tu consulta sobre **"${userMessage.trim()}"**. Para brindarte la respuesta más precisa e individualizada, he transferido esta conversación a nuestro **Administrador en Vivo**.\n\nTambién puedes seleccionar alguna de estas opciones rápidas frecuentes:`,
    quickReplies: [
      { label: '💰 Cotizar Cintas y Fotos', action: 'NAVIGATE_CALCULATOR' },
      { label: '🚚 Opciones de Envío y Recepción', action: 'LOCATION_INFO' },
      { label: '⏱️ Tiempos de Digitalización', action: 'TURNAROUND_TIME' },
      { label: '🔍 Rastrear mi Orden en Curso', action: 'NAVIGATE_TRACK' },
      { label: '💬 Escribir por WhatsApp', action: 'WHATSAPP_CONTACT' }
    ],
    isEscalation: true
  };
}
