const { app, BrowserWindow, ipcMain, Notification, systemPreferences, Menu } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');
const { initStorage, handleApiRequest, testSmtpConnection, sendEmail, getSanitizedConfig } = require('./embeddedApi.cjs');

let mainWindow = null;
let localServer = null;
let localServerPort = null;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg'
};

function startLocalServer() {
  if (localServerPort) return Promise.resolve(localServerPort);

  return new Promise((resolve, reject) => {
    const distDir = path.resolve(__dirname, '../dist');

    localServer = http.createServer(async (req, res) => {
      try {
        const parsedUrl = new URL(req.url, 'http://127.0.0.1');

        // Handle internal backend API requests (Email, SMTP test, MercadoPago, etc.)
        if (parsedUrl.pathname.startsWith('/api/')) {
          const handled = await handleApiRequest(req, res, parsedUrl, app.getPath('userData'));
          if (handled) return;
        }

        let pathname = decodeURIComponent(parsedUrl.pathname);
        let rel = pathname.replace(/^\/+/, '');
        if (!rel) rel = 'index.html';

        let filePath = path.join(distDir, rel);

        // Fallback for SPA routing if file does not exist
        if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
          filePath = path.join(distDir, 'index.html');
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        fs.readFile(filePath, (err, data) => {
          if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('File Not Found');
            return;
          }
          res.writeHead(200, {
            'Content-Type': contentType,
            'Cache-Control': 'no-cache',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(data);
        });
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(err.message || 'Internal Server Error');
      }
    });

    localServer.listen(0, '127.0.0.1', () => {
      localServerPort = localServer.address().port;
      resolve(localServerPort);
    });


    localServer.on('error', reject);
  });
}

async function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1080,
    minHeight: 700,
    title: 'DigiMemories — Estación de Trabajo macOS',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 18, y: 18 },
    vibrancy: 'under-window',
    visualEffectState: 'active',
    backgroundColor: '#0c0a09',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      devTools: true
    }
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error(`[Electron] Failed to load ${validatedURL}: ${errorCode} (${errorDescription})`);
  });

  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    console.log(`[Renderer Log ${level}] ${message} (${sourceId}:${line})`);
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173/?desktop=true';
  const isDev = !app.isPackaged && !process.env.ELECTRON_PROD;

  if (isDev) {
    try {
      // Check if vite dev server is responding
      await new Promise((resolve, reject) => {
        const req = http.get('http://localhost:5173/?desktop=true', (res) => {
          if (res.statusCode && res.statusCode < 400) resolve(true);
          else reject(new Error('Dev server returned ' + res.statusCode));
        });
        req.on('error', reject);
        req.setTimeout(800, () => {
          req.destroy();
          reject(new Error('Timeout connecting to dev server'));
        });
      });
      await mainWindow.loadURL(devServerUrl);
    } catch {
      const port = await startLocalServer();
      await mainWindow.loadURL(`http://127.0.0.1:${port}/?desktop=true`);
    }
  } else {
    const port = await startLocalServer();
    await mainWindow.loadURL(`http://127.0.0.1:${port}/?desktop=true`);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}


function buildAppMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{
      label: 'DigiMemories Admin',
      submenu: [
        { role: 'about', label: 'Acerca de DigiMemories Admin' },
        { type: 'separator' },
        { 
          label: 'Bloquear Sesión', 
          accelerator: 'CmdOrCtrl+L', 
          click: () => mainWindow?.webContents.send('menu-action', 'lock_screen') 
        },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide', label: 'Ocultar DigiMemories' },
        { role: 'hideOthers', label: 'Ocultar Otros' },
        { role: 'unhide', label: 'Mostrar Todos' },
        { type: 'separator' },
        { role: 'quit', label: 'Salir de DigiMemories' }
      ]
    }] : []),
    {
      label: 'Módulos',
      submenu: [
        { 
          label: 'Chats en Vivo', 
          accelerator: 'CmdOrCtrl+1', 
          click: () => mainWindow?.webContents.send('menu-action', 'nav_chat') 
        },
        { 
          label: 'Cola de Digitalización & Órdenes', 
          accelerator: 'CmdOrCtrl+2', 
          click: () => mainWindow?.webContents.send('menu-action', 'nav_orders') 
        },
        { 
          label: 'Métricas & Facturación', 
          accelerator: 'CmdOrCtrl+3', 
          click: () => mainWindow?.webContents.send('menu-action', 'nav_analytics') 
        },
        { 
          label: 'Bandeja de Correos', 
          accelerator: 'CmdOrCtrl+4', 
          click: () => mainWindow?.webContents.send('menu-action', 'nav_emails') 
        },
        { 
          label: 'Configuración de Laboratorio', 
          accelerator: 'CmdOrCtrl+5', 
          click: () => mainWindow?.webContents.send('menu-action', 'nav_business') 
        },
        { 
          label: 'Bóveda de Seguridad & Touch ID', 
          accelerator: 'CmdOrCtrl+6', 
          click: () => mainWindow?.webContents.send('menu-action', 'nav_security') 
        },
        { type: 'separator' },
        { 
          label: 'Búsqueda Global', 
          accelerator: 'CmdOrCtrl+K', 
          click: () => mainWindow?.webContents.send('menu-action', 'quick_search') 
        }
      ]
    },
    {
      label: 'Edición',
      submenu: [
        { role: 'undo', label: 'Deshacer' },
        { role: 'redo', label: 'Rehacer' },
        { type: 'separator' },
        { role: 'cut', label: 'Cortar' },
        { role: 'copy', label: 'Copiar' },
        { role: 'paste', label: 'Pegar' },
        { role: 'selectAll', label: 'Seleccionar Todo' }
      ]
    },
    {
      label: 'Ver',
      submenu: [
        { role: 'reload', label: 'Recargar' },
        { role: 'forceReload', label: 'Forzar Recarga' },
        { role: 'toggleDevTools', label: 'Herramientas de Desarrollador' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Tamaño Real' },
        { role: 'zoomIn', label: 'Acercar' },
        { role: 'zoomOut', label: 'Alejar' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Pantalla Completa' }
      ]
    },
    {
      label: 'Ventana',
      submenu: [
        { role: 'minimize', label: 'Minimizar' },
        { role: 'zoom', label: 'Zoom' },
        ...(isMac ? [
          { type: 'separator' },
          { role: 'front', label: 'Traer Todo al Frente' }
        ] : [
          { role: 'close', label: 'Cerrar' }
        ])
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC Handlers
ipcMain.on('set-dock-badge', (_event, badge) => {
  if (process.platform === 'darwin' && app.dock) {
    app.dock.setBadge(badge ? String(badge) : '');
  }
});

ipcMain.on('show-notification', (_event, { title, body }) => {
  if (Notification.isSupported()) {
    new Notification({
      title: title || 'DigiMemories Admin',
      body: body || '',
      silent: false
    }).show();
  }
});

ipcMain.handle('prompt-touch-id', async (_event, reason) => {
  if (process.platform !== 'darwin') {
    return { success: false, message: 'Touch ID solo está disponible en macOS.' };
  }

  if (typeof systemPreferences.canPromptTouchID === 'function' && !systemPreferences.canPromptTouchID()) {
    return { success: false, message: 'Touch ID no está disponible o no ha sido configurado en este Mac.' };
  }

  try {
    await systemPreferences.promptTouchID(reason || 'Autenticación biométrica para DigiMemories Admin');
    return { success: true, message: 'Autenticado exitosamente con Touch ID.' };
  } catch (err) {
    return { success: false, message: err?.message || 'Verificación de Touch ID cancelada.' };
  }
});

ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

// Email Service IPC Handlers
ipcMain.handle('email-get-config', () => getSanitizedConfig());
ipcMain.handle('email-test-smtp', (_event, targetEmail) => testSmtpConnection(targetEmail, app.getPath('userData')));
ipcMain.handle('email-send', (_event, payload) => sendEmail(payload, app.getPath('userData')));

// App Lifecycle
app.whenReady().then(() => {
  initStorage(app.getPath('userData'));
  buildAppMenu();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (localServer) {
    try { localServer.close(); } catch {}
  }
});

