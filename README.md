# 📼 DigiMemories — Plataforma de Preservación Digital & Suite de Ciberseguridad

Plataforma integral y moderna para la digitalización y preservación de memorias familiares (VHS, Betamax, Hi8, MiniDV, discos DVD y fotografías analógicas), con cotizador interactivo, generador de presupuestos en PDF vectorial, sistema de seguimiento con PIN de 4 dígitos, motor de correo SMTP y centro de control administrativo con defensas de ciberseguridad OWASP.

---

## 🚀 Características Principales

### 1. 🧮 Cotizador y Generador de Presupuestos PDF
* Cálculo en tiempo real según formato y cantidad.
* Generación instantánea de presupuestos oficiales en PDF vectorial con código de barras y desglose fiscal.
* Despacho automático de copia en PDF al correo del cliente.

### 2. 🔍 Portal de Seguimiento para Clientes (`/track`)
* Consulta del avance cinta por cinta con folio único de 6 dígitos.
* Autenticación reforzada con PIN de 4 dígitos y protección anti-fuerza bruta.
* Descarga de comprobantes y órdenes de servicio.

### 3. 💬 Chat en Vivo & Asistente Inteligente
* Asistente automático con respuestas inmediatas para preguntas frecuentes sobre precios, formatos y tiempos.
* Escalamiento transparente a operador humano con alertas sonoras y visuales en el panel de control.

### 4. 🛡️ Suite Integral de Ciberseguridad (OWASP & Web Crypto)
* **Autenticación Hasheada (SHA-256 + Salt):** Cero contraseñas en texto plano.
* **Defensa Anti-Fuerza Bruta:** Bloqueo de 15 minutos tras 5 intentos erróneos.
* **Filtro Anti-XSS (DOMPurify):** Sanitización exhaustiva en formularios, chats y vistas previas.
* **Anti-CRLF Injection:** Prevención de inyección de encabezados de correo.
* **Rate Limiting por IP:** Limitador de tasa (10 req/min) en endpoints críticos.
* **Cabeceras HTTP Seguras:** HSTS (2 años), CSP, X-Frame-Options (Clickjacking defense) y X-Content-Type-Options en Vercel.

### 5. ✉️ Motor de Correo Electrónico Interno
* Soporte nativo para Gmail SMTP en vivo con Contraseña de Aplicación de 16 dígitos.
* Modo Sandbox automático para pruebas seguras.
* Registro de bandeja de salida (Outbox) con visor HTML interactivo.

---

## 🛠️ Tecnologías Utilizadas

* **Frontend:** React 19, TypeScript, Vite, React Router 7, Lucide Icons, jsPDF, DOMPurify.
* **Backend:** Node.js, Nodemailer, Vite Middleware Plugin, Standalone HTTP Server.
* **Despliegue:** Vercel (CI/CD automático desde GitHub).

---

## 📦 Scripts Disponibles

* `npm run dev`: Inicia el servidor de desarrollo local de Vite en `http://localhost:5173`.
* `npm run build`: Compila el proyecto con TypeScript y optimiza el bundle para producción.
* `npm run preview`: Previsualiza la compilación de producción localmente.
