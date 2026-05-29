import { useState, useEffect, useRef } from 'react';

// ── Convert a browser KeyboardEvent.key to an Electron accelerator segment ──
const KEY_LABEL_MAP = {
  ' ': 'Space', 'ArrowUp': 'Up', 'ArrowDown': 'Down',
  'ArrowLeft': 'Left', 'ArrowRight': 'Right',
  'Enter': 'Return', 'Escape': 'Escape', 'Tab': 'Tab',
  'Backspace': 'Backspace', 'Delete': 'Delete',
  'Home': 'Home', 'End': 'End', 'PageUp': 'PageUp', 'PageDown': 'PageDown',
  'Insert': 'Insert', '+': 'Plus',
};

function toElectronKey(jsKey) {
  if (KEY_LABEL_MAP[jsKey]) return KEY_LABEL_MAP[jsKey];
  if (/^F\d+$/.test(jsKey)) return jsKey;
  if (/^[a-z]$/.test(jsKey)) return jsKey.toUpperCase();
  if (/^[0-9]$/.test(jsKey)) return jsKey;
  return null;
}

function segLabel(seg) {
  if (seg === 'CommandOrControl') return 'Ctrl';
  return seg;
}

// ── Hotkey capture component ──────────────────────────────────────────────────
function HotkeyCapture({ value, onCommit, error }) {
  const [recording, setRecording] = useState(false);
  const captureRef = useRef(null);

  useEffect(() => {
    if (recording) captureRef.current?.focus();
  }, [recording]);

  function handleKeyDown(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.key === 'Escape') { setRecording(false); return; }

    const mods = [];
    if (e.ctrlKey || e.metaKey) mods.push('CommandOrControl');
    if (e.altKey) mods.push('Alt');
    if (e.shiftKey) mods.push('Shift');

    if (['Control', 'Meta', 'Alt', 'Shift'].includes(e.key)) return;
    if (mods.length === 0) return;
    const keyName = toElectronKey(e.key);
    if (!keyName) return;

    onCommit([...mods, keyName].join('+'));
    setRecording(false);
  }

  const segs = value ? value.split('+') : [];

  return (
    <div className="hotkey-section">
      <label className="hotkey-label">Global hotkey</label>

      {recording ? (
        <div
          ref={captureRef}
          className="hotkey-capture"
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onBlur={() => setRecording(false)}
        >
          Press keys… <span className="hotkey-esc-hint">(Esc to cancel)</span>
        </div>
      ) : (
        <div className="hotkey-row">
          <div className="hotkey-display">
            {segs.length > 0
              ? segs.map((seg, i) => (
                  <span key={i} className="hotkey-key">{segLabel(seg)}</span>
                ))
              : <span className="hotkey-none">None</span>}
          </div>
          <div className="hotkey-actions">
            <button className="hotkey-btn" type="button" onClick={() => setRecording(true)}>
              Change
            </button>
            {value && (
              <button className="hotkey-btn hotkey-btn-clear" type="button" onClick={() => onCommit('')}>
                Disable
              </button>
            )}
          </div>
        </div>
      )}

      {error && <p className="hotkey-error">{error}</p>}
      <p className="settings-hint">Pause / resume the running timer from anywhere on your system.</p>
    </div>
  );
}

// ── Storage section ───────────────────────────────────────────────────────────
function StorageSection({ storageMode, storageFolder, onChangeFolder, onSwitchToFile, onSwitchToLocal }) {
  const [switchConfirm, setSwitchConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSwitch() {
    if (!switchConfirm) { setSwitchConfirm(true); return; }
    setBusy(true);
    setSwitchConfirm(false);
    if (storageMode === 'file') {
      await onSwitchToLocal();
    } else {
      await onSwitchToFile();
    }
    setBusy(false);
  }

  return (
    <div className="hotkey-section">
      <label className="hotkey-label">Storage</label>

      <div className="storage-info">
        <span className="storage-mode-badge">
          {storageMode === 'file' ? 'Folder mode' : 'Local storage'}
        </span>
        {storageMode === 'file' && storageFolder && (
          <span className="storage-folder-path">{storageFolder}</span>
        )}
      </div>

      <div className="storage-btn-row">
        {storageMode === 'file' && (
          <button className="storage-btn" onClick={onChangeFolder} disabled={busy}>
            Change folder…
          </button>
        )}
        <button
          className={`storage-btn${switchConfirm ? ' confirm' : ''}`}
          onClick={handleSwitch}
          disabled={busy}
        >
          {busy
            ? 'Switching…'
            : switchConfirm
              ? `⚠ Confirm switch`
              : storageMode === 'file' ? 'Switch to local' : 'Switch to folder…'}
        </button>
        {switchConfirm && (
          <button className="storage-btn" onClick={() => setSwitchConfirm(false)}>Cancel</button>
        )}
      </div>

      {storageMode === 'file' && (
        <p className="settings-hint">
          Point both OS installs at the same folder (or a cloud sync folder) to keep data in sync.
        </p>
      )}
      {storageMode === 'local' && (
        <p className="settings-hint">
          Switch to folder mode to sync across machines via Dropbox, OneDrive, or a shared drive.
        </p>
      )}
    </div>
  );
}

// ── Settings panel ────────────────────────────────────────────────────────────
export default function SettingsPanel({
  globalHourlyRate, onSetRate,
  hotkeyShortcut, onSetHotkey, hotkeyError,
  isElectron,
  displayName, onSetDisplayName,
  storageMode, storageFolder, onChangeFolder, onSwitchToFile, onSwitchToLocal,
  onClose,
}) {
  const [rateInput, setRateInput]   = useState(globalHourlyRate > 0 ? String(globalHourlyRate) : '');
  const [nameInput, setNameInput]   = useState(displayName || '');

  function handleApply(e) {
    e.preventDefault();
    onSetRate(rateInput === '' ? '0' : rateInput);
    if (nameInput.trim() && nameInput.trim() !== displayName) {
      onSetDisplayName(nameInput.trim());
    }
    onClose();
  }

  return (
    <div className="theme-panel settings-panel">
      <div className="theme-panel-header">Settings</div>

      <form onSubmit={handleApply}>
        {isElectron && (
          <>
            <label className="hotkey-label">Your name</label>
            <div className="settings-rate-row" style={{ marginBottom: 12 }}>
              <input
                className="settings-rate-input"
                style={{ flex: 1, textAlign: 'left', paddingLeft: 10 }}
                type="text"
                maxLength={40}
                placeholder="e.g. Manning"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
              />
            </div>
          </>
        )}

        <label className="hotkey-label">Hourly rate</label>
        <div className="settings-rate-row">
          <span className="settings-currency">$</span>
          <input
            className="settings-rate-input"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={rateInput}
            onChange={e => setRateInput(e.target.value)}
            autoFocus={!isElectron}
          />
          <span className="settings-per-hr">/hr</span>
        </div>
        <p className="settings-hint">
          Used for all tasks unless a task has its own rate. Set to 0 to hide earnings.
        </p>
        <button className="apply-custom-btn" type="submit">Apply</button>
      </form>

      {isElectron && (
        <HotkeyCapture
          value={hotkeyShortcut}
          onCommit={onSetHotkey}
          error={hotkeyError}
        />
      )}

      {isElectron && (
        <StorageSection
          storageMode={storageMode}
          storageFolder={storageFolder}
          onChangeFolder={onChangeFolder}
          onSwitchToFile={onSwitchToFile}
          onSwitchToLocal={onSwitchToLocal}
        />
      )}
    </div>
  );
}
