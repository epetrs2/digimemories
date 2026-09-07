import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const ts = require('typescript');

// Read botTrainer.ts source code
const tsSource = fs.readFileSync('src/lib/botTrainer.ts', 'utf8');

// Transpile TypeScript to JavaScript via official TypeScript compiler
const transpiled = ts.transpileModule(tsSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
});

const moduleObj = { exports: {} };
const fn = new Function('module', 'exports', 'require', transpiled.outputText);
fn(moduleObj, moduleObj.exports, require);

const { getBotResponse } = moduleObj.exports;

const EXPANDED_TEST_CASES = [
  // 1. Saludos y Variaciones
  { query: "Hola, buenos días", expectContains: "Guillermo" },
  { query: "Buenas tardes", expectContains: "Guillermo" },
  { query: "Que tal, saludos", expectContains: "DigiMemories" },
  { query: "Hola Guillermo", expectContains: "DigiMemories" },
  { query: "HOLA BUEN DIA", expectContains: "Guillermo" },
  { query: "hey que onda", expectContains: "Guillermo" },

  // 2. Cotizaciones y Cálculo Multi-Ítem (con números y palabras)
  { query: "Tengo 4 cintas VHS", expectContains: "$800" },
  { query: "Tengo 1 sola cinta vhs", expectContains: "$200" },
  { query: "Cuanto me saldría por 3 cintas beta y 2 dvds?", expectContains: "$900" },
  { query: "Tengo 5 cintas minidv y 50 fotos", expectContains: "$1,350" },
  { query: "Tengo cinco cintas vhs y diez fotos", expectContains: "$1,070" },
  { query: "Quiero digitalizar 2 cassettes de audio y 3 vhs", expectContains: "$800" },
  { query: "Tengo 10 cintas vhs", expectContains: "$2,000", expectPromo: true },
  { query: "Tengo 8 cintas con mejora de video y color", expectContains: "Mejora Premium" },
  { query: "Cuanto me cuesta cotizar mis recuerdos?", expectContains: "$200 MXN" },
  { query: "tengo 2 VHS y tres fotos", expectContains: "$421" },
  { query: "tengo una cinta de betamax", expectContains: "$200" },
  { query: "tengo 1 album completo y 4 cintas hi8", expectContains: "$2,000", expectPromo: true },

  // 3. Precios y Tarifas
  { query: "¿Cuáles son sus precios y tarifas?", expectContains: "$200 MXN" },
  { query: "cuanto cobran por cinta", expectContains: "$200 MXN" },
  { query: "tienen descuentos por volumen o promociones?", expectContains: "Retorno GRATIS" },
  { query: "cuanto cuesta la hora extra", expectContains: "$50 MXN" },
  { query: "LISTA DE PRECIOS", expectContains: "$200 MXN" },

  // 4. Formatos Soportados y Excepciones
  { query: "¿Qué formatos de cinta aceptan?", expectContains: "VHS Estándar Normal" },
  { query: "¿Digitalizan películas de Super 8 en carrete?", expectContains: "NO procesamos película de cine de carrete" },
  { query: "¿Tienen proyector de cine de 8mm en rollo?", expectContains: "NO procesamos" },
  { query: "¿Aceptan cassettes pequeños VHS-C?", expectContains: "VHS estándar normal (cartucho grande)" },
  { query: "¿Pasan cassettes de audio de música o voz?", expectContains: "$100 MXN" },
  { query: "¿Pueden escanear fotos familiares viejas y álbumes?", expectContains: "600 DPI" },
  { query: "tienen adaptadores para rollos de 16mm?", expectContains: "NO procesamos" },
  { query: "digitalizan minidv y video8?", expectContains: "Digitalizamos los siguientes formatos oficiales" },

  // 5. Medios de Entrega y Compatibilidad
  { query: "¿Cómo entregan los archivos y se puede ver en Smart TV?", expectContains: "MP4 universal" },
  { query: "¿Me regresan mis cintas originales después?", expectContains: "intactas" },
  { query: "se puede ver en mi celular iphone y en smart tv?", expectContains: "Smart TVs" },
  { query: "dan link de descarga en la nube?", expectContains: "nube" },

  // 6. Logística, Ubicación y Envíos (2 Modalidades 100% Sin Contacto)
  { query: "¿Dónde están ubicados para llevar mis cintas?", expectContains: "dos modalidades de recepción 100% sin contacto" },
  { query: "¿Cómo funcionan los Puntos de Encuentro en Parque Delta o WTC?", expectContains: "sin atención presencial ni puntos de encuentro" },
  { query: "¿Puedo mandar un chofer por Uber Flash o Didi?", expectContains: "Uber Flash" },
  { query: "Soy de Guadalajara, ¿hacen envíos por DHL o FedEx?", expectContains: "Paquetería Nacional" },
  { query: "¿Hacen envíos a Monterrey?", expectContains: "Paquetería Nacional" },
  { query: "hacen entregas personales en plaza universidad?", expectContains: "sin atención presencial ni puntos de encuentro" },
  { query: "como le hago para enviar por paqueteria desde puebla", expectContains: "Paquetería Nacional" },

  // 7. Cuidado, Moho y Seguridad
  { query: "¿Qué pasa si mis cintas tienen moho u hongos?", expectContains: "Inspección Física Gratuita" },
  { query: "¿Y si una cinta está rota o no se puede leer?", expectContains: "NO se te cobra" },
  { query: "¿Cuidan la privacidad de los videos familiares?", expectContains: "Garantía Estricta de Privacidad" },
  { query: "tienen garantia si la cinta esta vacia?", expectContains: "NO se te cobra" },
  { query: "es confidencial el contenido de mis videos familiares?", expectContains: "Garantía Estricta de Privacidad" },

  // 8. Tiempos y Urgencias
  { query: "¿Cuánto tiempo tardan en digitalizar?", expectContains: "3 a 5 días hábiles" },
  { query: "Tengo un aniversario urgente para mañana", expectContains: "Servicio Express" },
  { query: "cuanto demora un lote de 20 cintas", expectContains: "7 a 10 días hábiles" },
  { query: "tienen servicio express para entrega rapida", expectContains: "Servicio Express" },

  // 9. Pagos, Facturación y Anticipo
  { query: "¿Cuáles son sus métodos de pago y cuánto es de anticipo?", expectContains: "50% de Anticipo" },
  { query: "¿Cuál es su CLABE interbancaria de BBVA?", expectContains: "012180015492837190" },
  { query: "¿Puedo pagar en OXXO o con tarjeta de crédito?", expectContains: "Mercado Pago" },
  { query: "¿Emiten factura con CFDI y RFC?", expectContains: "facturas fiscales" },
  { query: "dan comprobante fiscal deducible?", expectContains: "facturas fiscales" },
  { query: "se puede pagar por spei o efectivo", expectContains: "BBVA México" },

  // 10. Rastreo en Vivo
  { query: "¿Cómo uso mi PIN de 4 dígitos para rastrear?", expectContains: "Portal de Rastreo" },
  { query: "donde consulto el folio de mi pedido", expectContains: "Portal de Rastreo" },

  // 11. Horarios y Contacto
  { query: "¿Cuál es su horario de atención?", expectContains: "9:00 AM" },
  { query: "¿Cuál es su WhatsApp y correo de contacto?", expectContains: "+52 55 4888 9876" },
  { query: "abren los sabados?", expectContains: "Sábados" },

  // 12. Quiénes somos y Proceso
  { query: "¿Quiénes son y por qué confiar en DigiMemories?", expectContains: "preservación y restauración" },
  { query: "¿Cómo es el proceso paso a paso para digitalizar?", expectContains: "proceso paso a paso" },

  // 13. Escalación a Humano
  { query: "Quiero hablar con una persona real", expectEscalation: true },
  { query: "Pásame con un asesor humano por favor", expectEscalation: true },
  { query: "Tengo una queja y quiero llamar", expectEscalation: true },
  { query: "necesito que un operador me atienda", expectEscalation: true },

  // 14. Cortesía y Despedida
  { query: "Muchas gracias por la información, excelente servicio", expectContains: "placer ayudarte" },
  { query: "Hasta luego, que tengas buen día", expectContains: "Hasta pronto" },
  { query: "Me parece perfecto, sí me interesa", expectContains: "Excelente" },
  { query: "mil gracias por todo", expectContains: "placer ayudarte" }
];

console.log("=======================================================");
console.log(`🚀 EJECUTANDO TEST SUITE EXTENDIDO (${EXPANDED_TEST_CASES.length} CASOS DE PRUEBA)`);
console.log("=======================================================\n");

let passed = 0;
let failed = 0;

EXPANDED_TEST_CASES.forEach((tc, i) => {
  const response = getBotResponse(tc.query);
  let ok = true;
  const errors = [];

  if (tc.expectEscalation && !response.isEscalation) {
    ok = false;
    errors.push("No activó escalación a humano.");
  }

  if (tc.expectContains && !response.text.includes(tc.expectContains)) {
    ok = false;
    errors.push(`No contiene "${tc.expectContains}". Respuesta: ${response.text.slice(0, 80).replace(/\n/g, ' ')}...`);
  }

  if (tc.expectPromo && !response.text.includes('Beneficio Aplicado')) {
    ok = false;
    errors.push("No aplicó mención de retorno gratis.");
  }

  if (!response.quickReplies || response.quickReplies.length === 0) {
    ok = false;
    errors.push("No devolvió botones de respuesta rápida.");
  }

  if (ok) {
    passed++;
    console.log(`✅ [${i+1}/${EXPANDED_TEST_CASES.length}] PASS: "${tc.query}" -> ${response.text.slice(0, 50).replace(/\n/g, ' ')}...`);
  } else {
    failed++;
    console.error(`❌ [${i+1}/${EXPANDED_TEST_CASES.length}] FAIL: "${tc.query}"`);
    errors.forEach(e => console.error(`   ⚠️ ${e}`));
  }
});

console.log(`\n=======================================================`);
console.log(`📊 RESULTADOS: ${passed} APROBADOS / ${failed} FALLIDOS`);
console.log(`=======================================================`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log(`🎉 ¡TODOS LOS ${passed} CASOS DE PRUEBA PASARON EXITOSAMENTE AL 100%!`);
  process.exit(0);
}
