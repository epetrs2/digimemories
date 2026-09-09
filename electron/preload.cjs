const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('macOSAdminApi', {
  isElectron: true,
  platform: process.platform,
  
  // Dock and System notifications
  setDockBadge: (badge) => ipcRenderer.send('set-dock-badge', badge),
  showNotification: (payload) => ipcRenderer.send('show-notification', payload),
  
  // Native Touch ID biometric authentication
  promptTouchID: (reason) => ipcRenderer.invoke('prompt-touch-id', reason),
  
  // Window controls
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  
  // Menu bar shortcut events
  onMenuAction: (callback) => {
    const listener = (_event, action) => callback(action);
    ipcRenderer.on('menu-action', listener);
    return () => ipcRenderer.removeListener('menu-action', listener);
  }
});
