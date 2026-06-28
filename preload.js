const { contextBridge, ipcRenderer } = require('electron');

// Expose safe APIs to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  // Navigation
  goHome: () => ipcRenderer.send('go-home'),
  goTimetable: () => ipcRenderer.send('go-timetable'),
  navigate: (url) => ipcRenderer.send('navigate', url),

  // Cookies
  saveCookies: () => ipcRenderer.send('save-cookies'),

  // Debugging
  saveDebugHTML: (html) => ipcRenderer.send('save-debug-html', html),

  // Get URLs
  getPortalUrl: () => ipcRenderer.invoke('get-portal-url'),

  // Listen for navigation events
  onNavigate: (callback) => {
    ipcRenderer.on('navigate-webview', (_event, url) => callback(url));
  },
});
