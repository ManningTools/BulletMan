import { useState, useRef } from 'react';

const STORAGE_KEYS = ['bulletman_tasks', 'bulletman_clients', 'bulletman_settings', 'bulletman_theme'];

export default function SettingsPanel({ globalHourlyRate, onSetRate, onPruneOldTasks, onClose }) {
  const [rateInput,    setRateInput]    = useState(globalHourlyRate > 0 ? String(globalHourlyRate) : '');
  const [pruneDays,    setPruneDays]    = useState(90);
  const [pruneConfirm, setPruneConfirm] = useState(false);
  const [importError,  setImportError]  = useState('');
  const importRef = useRef(null);

  function handleApply(e) {
    e.preventDefault();
    onSetRate(rateInput === '' ? '0' : rateInput);
    onClose();
  }

  // ── Backup ──────────────────────────────────────────────────────────────────
  function handleExport() {
    const data = {};
    STORAGE_KEYS.forEach(k => {
      try { data[k] = JSON.parse(localStorage.getItem(k)); } catch { data[k] = null; }
    });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `bulletman-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError('');
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        let restored = 0;
        STORAGE_KEYS.forEach(k => {
          if (data[k] != null) {
            localStorage.setItem(k, JSON.stringify(data[k]));
            restored++;
          }
        });
        if (restored === 0) { setImportError('No recognised data found in file.'); return; }
        window.location.reload();
      } catch {
        setImportError('Invalid backup file.');
      }
    };
    reader.readAsText(file);
    // Reset so same file can be re-selected
    e.target.value = '';
  }

  // ── Prune ───────────────────────────────────────────────────────────────────
  function handlePrune() {
    if (!pruneConfirm) { setPruneConfirm(true); return; }
    onPruneOldTasks(pruneDays);
    setPruneConfirm(false);
  }

  return (
    <div className="theme-panel settings-panel">
      <div className="theme-panel-header">Settings</div>

      {/* ── Hourly rate ── */}
      <form onSubmit={handleApply}>
        <div className="settings-field-label">Global hourly rate</div>
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
            autoFocus
          />
          <span className="settings-per-hr">/hr</span>
        </div>
        <p className="settings-hint">
          Used for all tasks unless a task has its own rate. Set to 0 to hide earnings.
        </p>
        <button className="apply-custom-btn" type="submit">Apply</button>
      </form>

      <div className="settings-divider" />

      {/* ── Backup / Restore ── */}
      <div className="settings-field-label">Data</div>
      <div className="settings-backup-row">
        <button className="settings-action-btn" onClick={handleExport} title="Download all data as JSON">
          ↓ Export backup
        </button>
        <button className="settings-action-btn" onClick={() => importRef.current?.click()} title="Restore from a backup file">
          ↑ Import backup
        </button>
        <input ref={importRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
      </div>
      {importError && <p className="settings-error">{importError}</p>}
      <p className="settings-hint">Import will reload the app and replace all current data.</p>

      <div className="settings-divider" />

      {/* ── Prune old tasks ── */}
      <div className="settings-field-label">Prune old tasks</div>
      <div className="settings-prune-row">
        <span className="settings-prune-label">Delete tasks older than</span>
        <select
          className="settings-prune-select"
          value={pruneDays}
          onChange={e => { setPruneDays(Number(e.target.value)); setPruneConfirm(false); }}
        >
          <option value={30}>30 days</option>
          <option value={60}>60 days</option>
          <option value={90}>90 days</option>
          <option value={180}>180 days</option>
          <option value={365}>1 year</option>
        </select>
      </div>
      <button
        className={`settings-prune-btn${pruneConfirm ? ' confirm' : ''}`}
        onClick={handlePrune}
      >
        {pruneConfirm ? '⚠ Confirm — this cannot be undone' : 'Prune now'}
      </button>
      {pruneConfirm && (
        <button className="settings-hint-btn" onClick={() => setPruneConfirm(false)}>Cancel</button>
      )}
      <p className="settings-hint">Auto-prune is off by default. This runs manually only.</p>
    </div>
  );
}
