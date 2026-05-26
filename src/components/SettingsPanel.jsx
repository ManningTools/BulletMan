import { useState, useRef } from 'react';

const STORAGE_KEYS = ['bulletman_tasks', 'bulletman_clients', 'bulletman_settings', 'bulletman_theme'];

export default function SettingsPanel({ globalHourlyRate, onSetRate, onPruneOldTasks }) {
  const [rateInput,    setRateInput]    = useState(globalHourlyRate > 0 ? String(globalHourlyRate) : '');
  const [rateSaved,    setRateSaved]    = useState(false);
  const [pruneDays,    setPruneDays]    = useState(90);
  const [pruneConfirm, setPruneConfirm] = useState(false);
  const [importError,  setImportError]  = useState('');
  const importRef = useRef(null);

  function handleApply(e) {
    e.preventDefault();
    onSetRate(rateInput === '' ? '0' : rateInput);
    setRateSaved(true);
    setTimeout(() => setRateSaved(false), 1800);
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
          if (data[k] != null) { localStorage.setItem(k, JSON.stringify(data[k])); restored++; }
        });
        if (restored === 0) { setImportError('No recognised data found in file.'); return; }
        window.location.reload();
      } catch {
        setImportError('Invalid backup file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  // ── Prune ───────────────────────────────────────────────────────────────────
  function handlePrune() {
    if (!pruneConfirm) { setPruneConfirm(true); return; }
    onPruneOldTasks(pruneDays);
    setPruneConfirm(false);
  }

  return (
    <div className="settings-page">

      {/* ── Hourly rate ── */}
      <section className="settings-card">
        <div className="settings-card-title">Hourly Rate</div>
        <form className="settings-rate-form" onSubmit={handleApply}>
          <div className="settings-rate-row">
            <span className="settings-currency">$</span>
            <input
              className="settings-rate-input"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={rateInput}
              onChange={e => { setRateInput(e.target.value); setRateSaved(false); }}
            />
            <span className="settings-per-hr">/hr</span>
            <button className="settings-apply-btn" type="submit">
              {rateSaved ? '✓ Saved' : 'Apply'}
            </button>
          </div>
          <p className="settings-hint">
            Applied to all tasks unless a task has its own rate. Set to 0 to hide earnings.
          </p>
        </form>
      </section>

      {/* ── Data backup / restore ── */}
      <section className="settings-card">
        <div className="settings-card-title">Data Backup</div>
        <div className="settings-backup-row">
          <button className="settings-action-btn" onClick={handleExport}>
            ↓ Export backup
          </button>
          <button className="settings-action-btn" onClick={() => importRef.current?.click()}>
            ↑ Import backup
          </button>
          <input ref={importRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
        </div>
        {importError && <p className="settings-error">{importError}</p>}
        <p className="settings-hint">
          Export saves all tasks, clients, settings, and theme as a single JSON file.
          Importing will replace all current data and reload the app.
        </p>
      </section>

      {/* ── Prune old tasks ── */}
      <section className="settings-card">
        <div className="settings-card-title">Prune Old Tasks</div>
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
        <div className="settings-prune-actions">
          <button
            className={`settings-prune-btn${pruneConfirm ? ' confirm' : ''}`}
            onClick={handlePrune}
          >
            {pruneConfirm ? '⚠ Confirm — cannot be undone' : 'Prune now'}
          </button>
          {pruneConfirm && (
            <button className="settings-cancel-btn" onClick={() => setPruneConfirm(false)}>Cancel</button>
          )}
        </div>
        <p className="settings-hint">Auto-prune is off by default. This only runs when you click the button.</p>
      </section>

    </div>
  );
}
