const { app, BrowserWindow, Tray, Menu, shell, nativeImage } = require('electron');
const path = require('path');

const isDev = process.env.NODE_ENV === 'development';

let win  = null;
let tray = null;

// ── Window creation ──────────────────────────────────────────────────────────
function createWindow() {
  win = new BrowserWindow({
    width: 860,
    height: 720,
    minWidth: 540,
    minHeight: 500,
    backgroundColor: '#F8F8F8',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Open external links in the system browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Hide to tray instead of quitting
  win.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      win.hide();
    }
  });
}

// ── Tray creation ────────────────────────────────────────────────────────────
function createTray() {
  const iconPath = isDev
    ? path.join(__dirname, '../public/tray-icon.png')
    : path.join(__dirname, '../dist/tray-icon.png');

  let icon;
  try {
    icon = nativeImage.createFromPath(iconPath);
    // Resize to system-appropriate tray size
    if (process.platform === 'win32') {
      icon = icon.resize({ width: 16, height: 16 });
    } else {
      icon = icon.resize({ width: 22, height: 22 });
    }
  } catch {
    // Fallback: empty icon (still creates the tray entry)
    icon = nativeImage.createEmpty();
  }

  tray = new Tray(icon);
  tray.setToolTip('BulletMan');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show BulletMan',
      click: () => {
        if (win) { win.show(); win.focus(); }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  // Single click (or double-click on Windows) toggles window
  tray.on('click', () => {
    if (!win) return;
    if (win.isVisible()) {
      win.hide();
    } else {
      win.show();
      win.focus();
    }
  });
}

// ── App lifecycle ─────────────────────────────────────────────────────────────
app.isQuitting = false;

app.whenReady().then(() => {
  createWindow();
  createTray();

  app.on('activate', () => {
    // macOS: re-open window if dock icon is clicked and no windows open
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else if (win) { win.show(); win.focus(); }
  });
});

// Keep the app alive even when all windows are hidden
app.on('window-all-closed', () => {
  // Do NOT quit — the app lives in the tray.
  // On macOS the dock handles this; on Linux/Windows we stay in tray.
  // Only quit() when the user explicitly chooses Quit from the tray menu.
});

app.on('before-quit', () => {
  app.isQuitting = true;
});
