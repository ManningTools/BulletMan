const DATA_KEYS = ['bulletman_tasks', 'bulletman_clients', 'bulletman_settings', 'bulletman_theme'];

let _config            = { mode: 'local', displayName: '', dataDir: '' };
let _cache             = {};
let _firstLaunch       = false;
let _folderUnavailable = false;

// ── Error emitter (subscribed to by useStorageError in storage.js) ────────────
const errorListeners = new Set();

function notifyError(msg) {
  errorListeners.forEach(fn => fn(msg));
}

export function onStorageError(fn) {
  errorListeners.add(fn);
  return () => errorListeners.delete(fn);
}

// Normalize raw JSON text for value comparison (ignores key ordering/whitespace)
function normalize(raw) {
  if (raw == null) return null;
  try { return JSON.stringify(JSON.parse(raw)); } catch { return raw; }
}

// ── Init (call once before rendering) ────────────────────────────────────────

export async function initAdapter() {
  if (!window.electronAPI?.getConfig) return; // dev / browser — localStorage as-is

  const saved = await window.electronAPI.getConfig();
  if (!saved) {
    _firstLaunch = true;
    return;
  }
  _config = saved;

  if (_config.mode === 'file' && _config.dataDir) {
    const res = await window.electronAPI.readAllData(_config.dataDir);
    if (!res || !res.available) {
      // Folder missing / disconnected — do NOT start in a writable empty state,
      // or the next save would clobber the real data once it reconnects.
      _folderUnavailable = true;
      _cache = {};
      return;
    }
    _cache = res.data || {};

    // Corruption guard: validate each file before we ever overwrite it.
    for (const key of DATA_KEYS) {
      const raw = _cache[key];
      if (raw == null) continue;
      try {
        JSON.parse(raw);
      } catch {
        // Back the bad file up so it isn't lost on the next write, then reset to empty.
        await window.electronAPI.backupCorrupt?.(_config.dataDir, key);
        _cache[key] = null;
        notifyError('A data file was corrupted and has been backed up alongside your data.');
      }
    }
  }
}

// ── Read-only accessors ───────────────────────────────────────────────────────

export const isFirstLaunch       = () => _firstLaunch;
export const isFolderUnavailable = () => _folderUnavailable;
export const getConfig           = () => ({ ..._config });
export const getMode             = () => _config.mode;
export const getDisplayName      = () => _config.displayName || '';

// ── Per-key read / write ──────────────────────────────────────────────────────

export function adapterRead(key) {
  if (_config.mode === 'file') return _cache[key] ?? null;
  return localStorage.getItem(key);
}

export function adapterWrite(key, value) {
  if (_config.mode === 'file') {
    _cache[key] = value;
    if (window.electronAPI?.writeData) {
      window.electronAPI.writeData(_config.dataDir, key, value)
        .then(res => {
          if (!res?.ok) notifyError("Couldn't save to your data folder — check that it's connected.");
        })
        .catch(() => notifyError("Couldn't save to your data folder — check that it's connected."));
    }
    return;
  }
  try {
    localStorage.setItem(key, value);
  } catch {
    notifyError('Storage is full. Export a backup and use Prune to free space.');
  }
}

// ── Folder helpers ────────────────────────────────────────────────────────────

// Re-check a previously unavailable folder; returns true if it's now reachable.
export async function retryFolder() {
  if (!_config.dataDir || !window.electronAPI?.readAllData) return false;
  const res = await window.electronAPI.readAllData(_config.dataDir);
  return !!(res && res.available);
}

// Does the given folder already contain BulletMan data files?
export async function folderHasData(dir) {
  if (!window.electronAPI?.readAllData) return false;
  const res = await window.electronAPI.readAllData(dir);
  if (!res || !res.available) return false;
  return DATA_KEYS.some(k => res.data?.[k] != null);
}

// Has the on-disk data diverged from our in-memory cache (e.g. synced from another machine)?
export async function checkForExternalChanges() {
  if (_config.mode !== 'file' || !window.electronAPI?.readAllData) return false;
  const res = await window.electronAPI.readAllData(_config.dataDir);
  if (!res || !res.available) return false;
  return DATA_KEYS.some(k => normalize(res.data?.[k]) !== normalize(_cache[k]));
}

// ── Config persistence ────────────────────────────────────────────────────────

export async function saveConfig(patch) {
  if (patch.displayName != null) patch.displayName = String(patch.displayName).trim().slice(0, 40);
  _config = { ..._config, ...patch };
  _firstLaunch = false;
  if (window.electronAPI?.setConfig) {
    await window.electronAPI.setConfig(_config);
  }
}

// ── Migration helpers ─────────────────────────────────────────────────────────

// Copy the CURRENT data source (localStorage in local mode, file cache in file mode)
// into the target folder. Reading via adapterRead respects the mode in effect now,
// before saveConfig() flips it.
async function migrateCurrentToFiles(dataDir) {
  for (const key of DATA_KEYS) {
    const value = adapterRead(key);
    if (value && window.electronAPI?.writeData) {
      await window.electronAPI.writeData(dataDir, key, value);
    }
  }
}

// ── Mode switching ────────────────────────────────────────────────────────────

export async function switchToFileMode(dataDir, migrate = true) {
  if (migrate) await migrateCurrentToFiles(dataDir);
  await saveConfig({ mode: 'file', dataDir });
  if (window.electronAPI?.readAllData) {
    const res = await window.electronAPI.readAllData(dataDir);
    _cache = (res && res.available) ? (res.data || {}) : {};
    _folderUnavailable = !(res && res.available);
  }
}

export async function switchToLocalMode() {
  if (_config.mode === 'file') {
    for (const key of DATA_KEYS) {
      if (_cache[key]) {
        try { localStorage.setItem(key, _cache[key]); } catch { /* ignore */ }
      }
    }
  }
  _cache = {};
  _folderUnavailable = false;
  await saveConfig({ mode: 'local', dataDir: '' });
}
