const { app, BrowserWindow, Tray, Menu, shell, nativeImage, ipcMain, screen, powerMonitor, net } = require('electron');
const path = require('path');

const isDev = process.env.NODE_ENV === 'development';

let win  = null;
let tray = null;

// taskId → BrowserWindow  (one mini window per pinned task)
const miniWins = new Map();

// ── Main window ───────────────────────────────────────────────────────────────
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

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  win.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      win.hide();
    }
  });
}

// ── Mini timer windows ────────────────────────────────────────────────────────
function getNextMiniPosition() {
  const { width: sw } = screen.getPrimaryDisplay().workAreaSize;
  const winW = 300;
  const winH = 58;
  const gap  = 8;
  const count = miniWins.size;
  return { x: sw - winW - 20, y: 20 + count * (winH + gap) };
}

function createMiniTimerWindow(taskId, x, y) {
  const mw = new BrowserWindow({
    width: 300,
    height: 58,
    x,
    y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'mini-preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Pass taskId as a query param so the renderer knows its identity
  mw.loadFile(path.join(__dirname, 'mini-timer.html'), { query: { taskId } });
  mw.once('ready-to-show', () => mw.show());
  mw.on('closed', () => miniWins.delete(taskId));

  miniWins.set(taskId, mw);
  return mw;
}

// ── IPC: open / close mini timers ─────────────────────────────────────────────
ipcMain.on('mini-timer:open', (_, { taskId }) => {
  if (miniWins.has(taskId)) {
    // Already open — just bring it forward
    miniWins.get(taskId).focus();
    return;
  }
  const { x, y } = getNextMiniPosition();
  createMiniTimerWindow(taskId, x, y);
});

// Called from the main window when the user unpins a task
ipcMain.on('mini-timer:close-by-main', (_, { taskId }) => {
  const mw = miniWins.get(taskId);
  if (mw) { mw.destroy(); }
  // Map entry is cleaned up in the 'closed' handler above
});

// Called from the mini window ✕ button
ipcMain.on('mini-timer:close', (_, { taskId }) => {
  const mw = miniWins.get(taskId);
  if (mw) { mw.destroy(); }
  // Tell the main window so it can un-highlight the pin button
  if (win) win.webContents.send('mini-timer:closed', taskId);
});

// ── IPC: state sync ───────────────────────────────────────────────────────────
// Main window pushes { taskId, ...taskState } → relay to the right mini window
ipcMain.on('state:update', (_, { taskId, ...state }) => {
  const mw = miniWins.get(taskId);
  if (mw) mw.webContents.send('state:update', state);
});

// Mini window requests a timer toggle → relay to main window
ipcMain.on('timer:toggle', (_, taskId) => {
  if (win) win.webContents.send('timer:toggle', taskId);
});

// Mini window marks a task complete → relay to main window
ipcMain.on('task:complete', (_, taskId) => {
  if (win) win.webContents.send('task:complete', taskId);
});

// ── Version check ────────────────────────────────────────────────────────────
const RELEASES_API = 'https://api.github.com/repos/ManningTools/BulletMan/releases/latest';
const RELEASES_PAGE = 'https://github.com/ManningTools/BulletMan/releases/latest';

function isNewer(current, latest) {
  const parse = v => v.replace(/^v/, '').split('.').map(Number);
  const [c, l] = [parse(current), parse(latest)];
  for (let i = 0; i < 3; i++) {
    if ((l[i] || 0) > (c[i] || 0)) return true;
    if ((l[i] || 0) < (c[i] || 0)) return false;
  }
  return false;
}

async function checkForUpdates() {
  try {
    const res = await net.fetch(RELEASES_API, {
      headers: { 'User-Agent': `BulletMan/${app.getVersion()}` },
    });
    if (!res.ok) return;
    const data = await res.json();
    const latest = (data.tag_name || data.name || '').trim();
    if (latest && isNewer(app.getVersion(), latest)) {
      const url = data.html_url || RELEASES_PAGE;
      if (win) win.webContents.send('update:available', { version: latest.replace(/^v/, ''), url });
    }
  } catch { /* silently ignore network failures */ }
}

// ── Idle detection ────────────────────────────────────────────────────────────
const IDLE_THRESHOLD = 10 * 60; // 10 minutes in seconds
let idleThresholdCrossed = false;

function setupIdleDetection() {
  powerMonitor.on('suspend',      () => { if (win) win.webContents.send('idle:pause', 'suspend'); });
  powerMonitor.on('lock-screen',  () => { if (win) win.webContents.send('idle:pause', 'lock'); });
  powerMonitor.on('resume',       () => { idleThresholdCrossed = false; });
  powerMonitor.on('unlock-screen',() => { idleThresholdCrossed = false; });

  setInterval(() => {
    const idleTime = powerMonitor.getSystemIdleTime();
    if (idleTime >= IDLE_THRESHOLD) {
      if (!idleThresholdCrossed) {
        idleThresholdCrossed = true;
        if (win) win.webContents.send('idle:pause', 'idle');
      }
    } else {
      idleThresholdCrossed = false;
    }
  }, 30_000);
}

// ── Tray ──────────────────────────────────────────────────────────────────────
function createTray() {
  const iconPath = isDev
    ? path.join(__dirname, '../public/tray-icon.png')
    : path.join(__dirname, '../dist/tray-icon.png');

  let icon;
  try {
    icon = nativeImage.createFromPath(iconPath);
    icon = icon.resize({ width: process.platform === 'win32' ? 16 : 22, height: process.platform === 'win32' ? 16 : 22 });
  } catch {
    icon = nativeImage.createEmpty();
  }

  tray = new Tray(icon);
  tray.setToolTip('BulletMan');

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show BulletMan', click: () => { if (win) { win.show(); win.focus(); } } },
    { type: 'separator' },
    { label: 'Quit', click: () => { app.isQuitting = true; app.quit(); } },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('click', () => {
    if (!win) return;
    if (win.isVisible()) win.hide(); else { win.show(); win.focus(); }
  });
}

// ── App lifecycle ─────────────────────────────────────────────────────────────
app.isQuitting = false;

app.whenReady().then(() => {
  createWindow();
  createTray();
  setupIdleDetection();

  win.webContents.once('did-finish-load', () => {
    setTimeout(checkForUpdates, 2000);
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else if (win) { win.show(); win.focus(); }
  });
});

app.on('window-all-closed', () => { /* stay in tray */ });
app.on('before-quit', () => { app.isQuitting = true; });
