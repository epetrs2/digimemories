export interface BotReplyResult {
  text: string;
  quickReplies?: { label: string; action: string }[];
  isEscalation?: boolean;
}

export interface BotIntent {
  id: string;
  category: 'pricing' | 'formats' | 'delivery' | 'location' | 'safety' | 'quote_calc' | 'tracking' | 'payment' | 'general';
  keywords: string[];
  patterns?: RegExp[];
  response: (input: string, lower: string) => BotReplyResult;
}

/**
 * Intelligent tape quantity parser
 */
function tryParseQuoteInquiry(input: string): BotReplyResult | null {
  const lower = input.toLowerCase();
  
  // Match patterns like "5 cintas", "3 vhs", "10 casetes", "4 rollos"
  const tapeMatch = lower.match(/(\d+)\s*(cintas?|vhs|beta|betamax|hi8|minidv|casetes?|cassettes?|videos?)/);
  const photoMatch = lower.match(/(\d+)\s*(fotos?|fotografias?|imagenes?|diapositivas?)/);
  const dvdMatch = lower.match(/(\d+)\s*(dvds?|discos?)/);

  if (tapeMatch || photoMatch || dvdMatch) {
    const tapes = tapeMatch ? parseInt(tapeMatch[1], 10) : 0;
    const photos = photoMatch ? parseInt(photoMatch[1], 10) : 0;
    const dvds = dvdMatch ? parseInt(dvdMatch[1], 10) : 0;

    let subtotal = (tapes * 200) + (dvds * 150) + (photos * 7);
    if (subtotal > 0) {
      const deposit = Math.round(subtotal * 0.5);
      let details = [];
      if (tapes > 0) details.push(`• **${tapes} cinta(s)** x $200 = $${tapes * 200} MXN`);
      if (dvds > 0) details.push(`• **${dvds} disco(s)** x $150 = $${dvds * 150} MXN`);
      if (photos > 0) details.push(`• **${photos} foto(s)** x $7 = $${photos * 7} MXN`);

      return {
        text: `¡Claro! Con base en tu material, aquí tienes un **cálculo estimado al instante**:\n\n${details.join('\n')}\n\n💰 **Total Estimado:** $${subtotal.toLocaleString('es-MX')} MXN\n💳 **Anticipo para Iniciar (50%):** $${deposit.toLocaleString('es-MX')} MXN\n📦 **Incluye:** Archivos MP4 en Memoria USB + Devolución de tu material intacto.\n\n¿Deseas que te generemos tu presupuesto formal en PDF con folio de rastreo?`,
        quickReplies: [
          { label: '📄 Ir a la Calculadora Oficial', action: 'NAVIGATE_CALCULATOR' },
          { label: '📍 ¿Dónde entrego mis cintas?', action: 'LOCATION_INFO' },
          { label: '🚚 Pedir Recolección a Domicilio', action: 'HOME_PICKUP_INFO' },
          { label: '👤 Hablar con un Asesor', action: 'REQUEST_HUMAN' }
        ]
      };
    }
  }

  return null;
}

export const BOT_KNOWLEDGE_BASE: BotIntent[] = [
  // 1. Cotizador Inteligente
  {
    id: 'quote_calculation',
    category: 'quote_calc',
    keywords: ['cintas', 'vhs', 'tengo', 'cotizar', 'presupuesto', 'cuanto me saldria', 'cuanto cuesta para'],
    response: (input, _lower) => {
      const parsed = tryParseQuoteInquiry(input);
      if (parsed) return parsed;

      return {
        text: `¡Con mucho gusto te cotizo! Nuestra tarifa base es de **$200 MXN por cinta** (VHS, Betamax, Hi8, MiniDV, Video8) que incluye digitalización 1:1 en MP4 y entrega en memoria USB.\n\n¿Cuántas cintas o fotografías tienes aproximadamente? (Ej. *"Tengo 4 cintas VHS"*).`,
        quickReplies: [
          { label: '🧮 Abrir Calculadora de Precios', action: 'NAVIGATE_CALCULATOR' },
          { label: '📦 ¿Qué formatos aceptan?', action: 'FORMATS_INFO' },
          { label: '👤 Hablar con un Asesor Humano', action: 'REQUEST_HUMAN' }
        ]
      };
    }
  },

  // 2. Precios y Tarifas Generales
  {
    id: 'pricing_general',
    category: 'pricing',
    keywords: ['precio', 'precios', 'costo', 'costos', 'cuanto cobran', 'tarifa', 'tarifas', 'vale'],
    response: () => ({
      text: `Nuestras tarifas transparentes de digitalización son:\n\n📹 **Cintas de Video (VHS, Beta, Hi8, MiniDV):** $200 MXN / cinta (hasta 2h de contenido)\n💿 **Discos DVD:** $150 MXN / disco\n📸 **Fotografías y Diapositivas:** $7 MXN / foto escaneada a 600 DPI\n📚 **Álbum Familiar Completo:** $1,200 MXN\n✨ **Mejora Premium de Audio/Video (Opcional):** $150 MXN / cinta\n\nTodos los paquetes incluyen entrega en **Memoria USB en formato MP4 de alta calidad** y retorno de tus cintas originales.`,
      quickReplies: [
        { label: '💰 Calcular mi Presupuesto', action: 'NAVIGATE_CALCULATOR' },
        { label: '⏱️ ¿Cuánto tiempo tarda?', action: 'TURNAROUND_TIME' },
        { label: '📍 Ver Ubicación del Taller', action: 'LOCATION_INFO' }
      ]
    })
  },

  // 3. Formatos Soportados
  {
    id: 'formats_supported',
    category: 'formats',
    keywords: ['formato', 'formatos', 'vhs-c', 'vhsc', '8mm', 'super 8', 'super8', 'cassette', 'audio', 'rollo', 'tipo de cinta'],
    response: () => ({
      text: `Trabajamos con prácticamente **todos los formatos analógicos familiares**:\n\n• **Video Doméstico:** VHS, VHS-C, Betamax, Video8, Hi8, Digital8, MiniDV y MicroMV.\n• **Cine y Carretes:** Super 8 y 8mm (escaneo cuadro por cuadro).\n• **Audio:** Casetes de audio (Cassette Tape), Microcasetes y Carretes de cinta abierta.\n• **Fotografía:** Fotos impresas, Negativos 35mm y Diapositivas en marco.\n\nTodo el material es tratado con guantes de conservación y equipo profesional calibrado.`,
      quickReplies: [
        { label: '🔍 Cotizar mis Formatos', action: 'NAVIGATE_CALCULATOR' },
        { label: '🛡️ ¿Qué pasa si tienen moho?', action: 'MOLD_SAFETY' }
      ]
    })
  },

  // 4. Formato de Entrega & Dispositivos
  {
    id: 'delivery_format',
    category: 'delivery',
    keywords: ['entrega', 'entregas', 'usb', 'disco duro', 'descarga', 'nube', 'smart tv', 'computadora', 'celular', 'como entregan'],
    response: () => ({
      text: `Entregamos tus videos en **archivos digitales MP4 (H.264 / AAC)** listos para conectar y reproducir en:\n\n📺 **Smart TVs** (Samsung, LG, Sony, Roku, etc.)\n💻 **Computadoras** (Mac, Windows, Linux)\n📱 **Celulares y Tablets** (iPhone, Android, iPad)\n\nTe entregamos todo en una **Memoria USB física** y además te regresamos tus cintas originales intactas. ¡También ofrecemos enlace de respaldo privado en la nube si lo requieres!`,
      quickReplies: [
        { label: '🚚 Recolección a Domicilio', action: 'HOME_PICKUP_INFO' },
        { label: '📍 Entrega en Taller CDMX', action: 'LOCATION_INFO' }
      ]
    })
  },

  // 5. Cuidado de Cintas, Moho y Seguridad
  {
    id: 'tape_safety_mold',
    category: 'safety',
    keywords: ['moho', 'hongo', 'hongos', 'rota', 'reventada', 'pegada', 'danada', 'danadas', 'seguridad', 'cuidan', 'destruyen'],
    response: () => ({
      text: `Entendemos el valor invaluable de tus recuerdos familiares:\n\n1. **Inspección Física Gratuita:** Revisamos cada cinta antes de reproducirla.\n2. **Si tiene moho leve:** Se realiza una limpieza mecánica suave sin costo para permitir la lectura.\n3. **Cinta dañada o no legible:** Si una cinta está completamente desmagnetizada o rota y no se puede rescatar, **no se te cobra esa cinta**.\n4. **100% Devolución:** Todas tus cintas físicas originales se te regresan intactas.`,
      quickReplies: [
        { label: '📍 ¿Dónde están ubicados?', action: 'LOCATION_INFO' },
        { label: '👤 Quiero que un Asesor me llame', action: 'REQUEST_HUMAN' }
      ]
    })
  },

  // 6. Tiempo de Entrega y Urgencias
  {
    id: 'turnaround_time',
    category: 'delivery',
    keywords: ['tiempo', 'tardan', 'cuanto tarda', 'demora', 'dias', 'plazo', 'urgente', 'express', 'fecha'],
    response: () => ({
      text: `Nuestros tiempos de digitalización son:\n\n⏱️ **Tiempo Estándar:** De **3 a 5 días hábiles** para lotes de 1 a 10 cintas.\n⚡ **Servicio Express 24-48h:** Disponible con cargo prioritario para aniversarios o eventos familiares.\n\nComo digitalizamos a velocidad real 1:1 para preservar el 100% de la calidad del audio y video, no aceleramos las cintas mecánicamente.`,
      quickReplies: [
        { label: '🔍 Rastrear una Orden en Curso', action: 'NAVIGATE_TRACK' },
        { label: '💰 Cotizar mis Cintas', action: 'NAVIGATE_CALCULATOR' }
      ]
    })
  },

  // 7. Ubicación, Taller y Horarios
  {
    id: 'location_workshop',
    category: 'location',
    keywords: ['donde estan', 'ubicacion', 'direccion', 'sucursal', 'taller', 'horario', 'cdmx', 'donde entrego', 'local'],
    response: () => ({
      text: `📍 **Taller Principal DigiMemories:**\n**Av. Insurgentes Sur #450, Col. Roma Sur, Alcaldía Cuauhtémoc, CDMX (C.P. 06760).**\n\n⏰ **Horario de Atención:**\n• Lunes a Viernes: 10:00 AM a 6:30 PM\n• Sábados: 10:30 AM a 3:00 PM\n\n📱 **WhatsApp Directo:** +52 55 4888 9876\n\n¿Prefieres traerlas al taller o solicitar que un chofer las recoja en tu domicilio?`,
      quickReplies: [
        { label: '🚚 Solicitar Recolección a Domicilio', action: 'HOME_PICKUP_INFO' },
        { label: '📍 Ver Mapa en Contacto', action: 'NAVIGATE_CONTACT' }
      ]
    })
  },

  // 8. Recolección y Envíos a Domicilio
  {
    id: 'pickup_delivery_service',
    category: 'delivery',
    keywords: ['domicilio', 'recoleccion', 'recolectan', 'recoger', 'uber', 'mensajeria', 'paqueteria', 'provincia', 'interior de la republica', 'envios'],
    response: () => ({
      text: `¡Sí, contamos con servicio de recolección y entrega!\n\n🛵 **En CDMX y Zona Metropolitana:**\nPodemos coordinar la recolección en tu casa u oficina mediante nuestro mensajero o servicio de paquetería local (Uber Flash / 99 Minutos).\n\n📦 **Resto de la República Mexicana:**\nPuedes enviarnos tu lote por paquetería segura (DHL / Estafeta / FedEx). Al terminar, te enviamos tu USB y tus cintas de regreso con guía asegurada.`,
      quickReplies: [
        { label: '💰 Cotizar Servicio Completo', action: 'NAVIGATE_CALCULATOR' },
        { label: '👤 Coordinar Recolección con Asesor', action: 'REQUEST_HUMAN' }
      ]
    })
  },

  // 9. Pagos y Anticipo
  {
    id: 'payments_and_deposit',
    category: 'payment',
    keywords: ['pago', 'pagos', 'anticipo', 'tarjeta', 'transferencia', 'efectivo', 'factura', 'como se paga'],
    response: () => ({
      text: `Para tu total tranquilidad, el esquema de pago es:\n\n1. **50% de Anticipo:** Al momento de ingresar tu material a digitalización (se te genera tu PIN de rastreo en vivo).\n2. **50% Restante:** Al entregarte tus videos en tu memoria USB y devolverte tus cintas.\n\n💳 **Aceptamos:** Transferencia bancaria (SPEI), Tarjetas de Crédito/Débito, Efectivo y facturación con CFDI.`,
      quickReplies: [
        { label: '📄 Generar Presupuesto Oficial', action: 'NAVIGATE_CALCULATOR' },
        { label: '🔍 Rastrear mi PIN', action: 'NAVIGATE_TRACK' }
      ]
    })
  },

  // 10. Rastreo y PIN
  {
    id: 'tracking_orders',
    category: 'tracking',
    keywords: ['rastreo', 'rastrear', 'id', 'pin', 'folio', 'como va mi orden', 'estatus', 'seguimiento'],
    response: () => ({
      text: `Puedes consultar el avance de tus cintas cinta por cinta en cualquier momento ingresando a nuestro **Portal de Rastreo** con tu **Folio de 6 dígitos** y tu **PIN de 4 dígitos** asignado.\n\nAllí verás el porcentaje de avance, fotos del proceso y saldo restante.`,
      quickReplies: [
        { label: '🔍 Ir al Portal de Rastreo', action: 'NAVIGATE_TRACK' },
        { label: '👤 Consultar con Asesor', action: 'REQUEST_HUMAN' }
      ]
    })
  },

  // 11. Saludos
  {
    id: 'greetings',
    category: 'general',
    keywords: ['hola', 'buenas', 'buen dia', 'buenas tardes', 'buenas noches', 'saludos', 'que tal', 'inicio'],
    response: () => ({
      text: `¡Hola! 👋 Qué gusto saludarte. Soy **Guillermo**, tu asesor virtual de **DigiMemories**.\n\nEstamos listos para rescatar y digitalizar tus cintas VHS, Betamax, Hi8, MiniDV y fotografías familiares en alta definición.\n\n¿En qué te puedo ayudar hoy?`,
      quickReplies: [
        { label: '💰 Cotizar mis Cintas', action: 'NAVIGATE_CALCULATOR' },
        { label: '📍 Ubicación y Horarios', action: 'LOCATION_INFO' },
        { label: '⏱️ Tiempos de Entrega', action: 'TURNAROUND_TIME' },
        { label: '👤 Hablar con un Asesor Humano', action: 'REQUEST_HUMAN' }
      ]
    })
  }
];

export function getBotResponse(userMessage: string): BotReplyResult {
  const lower = userMessage.toLowerCase().trim();

  // 1. Check explicit human escalation keywords
  const humanKeywords = ['humano', 'persona', 'agente', 'hablar con alguien', 'administrador', 'asesor humano', 'queja', 'llamada'];
  if (humanKeywords.some(k => lower.includes(k))) {
    return {
      text: '🤖 He notificado de inmediato a nuestro **Administrador en Vivo**. En un momento un asesor humano tomará el control de este chat para asistirte de forma personalizada.',
      isEscalation: true
    };
  }

  // 2. Try quote pattern parser first
  const parsedQuote = tryParseQuoteInquiry(userMessage);
  if (parsedQuote) return parsedQuote;

  // 3. Search in knowledge base
  for (const intent of BOT_KNOWLEDGE_BASE) {
    if (intent.keywords.some(k => lower.includes(k))) {
      return intent.response(userMessage, lower);
    }
  }

  // 4. Default helpful fallback
  return {
    text: `Entiendo tu consulta sobre **"${userMessage}"**. Para darte una respuesta 100% precisa, he transferido esta conversación a nuestro **Administrador en Vivo**.\n\nTambién puedes seleccionar una de estas opciones rápidas:`,
    quickReplies: [
      { label: '💰 Cotizar Cintas de Video', action: 'NAVIGATE_CALCULATOR' },
      { label: '📍 Dirección del Taller CDMX', action: 'LOCATION_INFO' },
      { label: '🚚 Recolección a Domicilio', action: 'HOME_PICKUP_INFO' },
      { label: '🔍 Rastrear mi Orden', action: 'NAVIGATE_TRACK' }
    ],
    isEscalation: true
  };
}
