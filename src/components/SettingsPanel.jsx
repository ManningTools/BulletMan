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

// Human-readable label for an accelerator segment
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
    if (mods.length === 0) return; // require at least one modifier
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

// ── Settings panel ────────────────────────────────────────────────────────────
export default function SettingsPanel({
  globalHourlyRate, onSetRate,
  hotkeyShortcut, onSetHotkey, hotkeyError,
  isElectron,
  onClose,
}) {
  const [input, setInput] = useState(globalHourlyRate > 0 ? String(globalHourlyRate) : '');

  function handleApply(e) {
    e.preventDefault();
    onSetRate(input === '' ? '0' : input);
    onClose();
  }

  return (
    <div className="theme-panel settings-panel">
      <div className="theme-panel-header">Settings</div>

      <form onSubmit={handleApply}>
        <label className="hotkey-label">Hourly rate</label>
        <div className="settings-rate-row">
          <span className="settings-currency">$</span>
          <input
            className="settings-rate-input"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={input}
            onChange={e => setInput(e.target.value)}
            autoFocus
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
    </div>
  );
}
