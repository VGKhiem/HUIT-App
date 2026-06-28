const { app, BrowserWindow, session, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// Disable hardware acceleration to prevent black screen issues
app.disableHardwareAcceleration();

// Paths for persisting session data
const userDataPath = app.getPath('userData');
const cookiesPath = path.join(userDataPath, 'cookies.json');

let mainWindow;

// Portal URL
const PORTAL_URL = 'https://sinhvien.huit.edu.vn/dashboard.html';
const TIMETABLE_URL = 'https://sinhvien.huit.edu.vn/lich-theo-tuan.html';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 600,
    minWidth: 900,
    minHeight: 600,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    title: 'Thời Khóa Biểu HUIT',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    frame: false, // Custom titlebar
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true,
    },
    backgroundColor: '#1a1a2e',
    show: false,
  });

  mainWindow.loadFile('index.html');

  // Suppress ERR_ABORTED errors from webview (normal during navigation)
  mainWindow.webContents.on('did-create-window', (_event, webContents) => {
    webContents.on('did-fail-load', (_e, errorCode) => {
      if (errorCode === -3) return; // ERR_ABORTED is normal
    });
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Suppress noisy ERR_ABORTED/ERR_FAILED errors from GUEST_VIEW_MANAGER_CALL
  // These are harmless and expected during rapid tab switching / webview.stop()
  mainWindow.webContents.on('console-message', () => {});
  
  process.on('unhandledRejection', (reason) => {
    if (reason && (reason.code === 'ERR_ABORTED' || reason.code === 'ERR_FAILED' || reason.code === '' || reason.errno === -3 || reason.errno === -2)) return;
    console.error('Unhandled rejection:', reason);
  });

  // Override console.error to catch Electron's internal GUEST_VIEW_MANAGER_CALL logs
  const originalConsoleError = console.error;
  console.error = (...args) => {
    if (args.length > 0 && typeof args[0] === 'string' && args[0].includes('GUEST_VIEW_MANAGER_CALL')) {
      // It's the harmless webview abort error, skip logging
      return;
    }
    originalConsoleError(...args);
  };
}

// Save cookies to file
async function saveCookies() {
  try {
    const cookies = await session.defaultSession.cookies.get({});
    fs.writeFileSync(cookiesPath, JSON.stringify(cookies, null, 2));
    console.log('Cookies saved:', cookies.length);
  } catch (err) {
    console.error('Failed to save cookies:', err);
  }
}

// Restore cookies from file
async function restoreCookies() {
  try {
    if (!fs.existsSync(cookiesPath)) return;
    const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf-8'));
    for (const cookie of cookies) {
      const url = `https://${cookie.domain.replace(/^\./, '')}`;
      try {
        await session.defaultSession.cookies.set({
          url,
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain,
          path: cookie.path,
          secure: cookie.secure,
          httpOnly: cookie.httpOnly,
          expirationDate: cookie.expirationDate,
        });
      } catch (e) {
        // Skip invalid cookies
      }
    }
    console.log('Cookies restored:', cookies.length);
  } catch (err) {
    console.error('Failed to restore cookies:', err);
  }
}

// IPC handlers for window controls
ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.on('window-close', () => mainWindow?.close());

// IPC handlers for navigation
ipcMain.on('navigate', async (_event, url) => {
  mainWindow?.webContents.send('navigate-webview', url);
});

ipcMain.on('go-home', () => {
  mainWindow?.webContents.send('navigate-webview', PORTAL_URL);
});

ipcMain.on('go-timetable', () => {
  mainWindow?.webContents.send('navigate-webview', TIMETABLE_URL);
});

// Save cookies periodically and on navigation
ipcMain.on('save-cookies', async () => {
  await saveCookies();
});

// Get portal URL
ipcMain.handle('get-portal-url', () => PORTAL_URL);

app.whenReady().then(async () => {
  await restoreCookies();
  createWindow();
});

app.on('window-all-closed', async () => {
  await saveCookies();
  app.quit();
});

app.on('before-quit', () => {
  saveCookies(mainWindow);
});

// Debug tool
ipcMain.on('save-debug-html', (event, html) => {
  try {
    const fs = require('fs');
    const path = require('path');
    fs.writeFileSync(path.join(__dirname, 'debug.txt'), html);
   console.log('Saved debug.txt successfully for analysis.');
  } catch (e) {
    console.error('Failed to save debug.txt', e);
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
