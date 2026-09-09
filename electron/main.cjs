const { app, BrowserWindow, ipcMain, Notification, systemPreferences, Menu } = require('electron');
const path = require('path');

let mainWindow = null;

function createMainWindow() {
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

  const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173/?desktop=true';
  const isDev = !app.isPackaged && !process.env.ELECTRON_PROD;

  if (isDev) {
    mainWindow.loadURL(devServerUrl).catch(() => {
      mainWindow.loadFile(path.join(__dirname, '../dist/index.html'), { query: { desktop: 'true' } });
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'), { query: { desktop: 'true' } });
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

// App Lifecycle
app.whenReady().then(() => {
  buildAppMenu();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
