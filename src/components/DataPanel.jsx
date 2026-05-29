import { useState, useRef } from 'react';
import { adapterRead, adapterWrite } from '../utils/storageAdapter';

const STORAGE_KEYS = ['bulletman_tasks', 'bulletman_clients', 'bulletman_settings', 'bulletman_theme'];

export default function DataPanel({ onPruneOldTasks }) {
  const [pruneDays,    setPruneDays]    = useState(90);
  const [pruneConfirm, setPruneConfirm] = useState(false);
  const [importError,  setImportError]  = useState('');
  const importRef = useRef(null);

  // ── Backup ──────────────────────────────────────────────────────────────────
  function handleExport() {
    const data = {};
    STORAGE_KEYS.forEach(k => {
      try { data[k] = JSON.parse(adapterRead(k)); } catch { data[k] = null; }
    });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    const nd = new Date();
    const stamp = `${nd.getFullYear()}-${String(nd.getMonth()+1).padStart(2,'0')}-${String(nd.getDate()).padStart(2,'0')}`;
    a.download = `bulletman-backup-${stamp}.json`;
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
        let failed   = false;
        STORAGE_KEYS.forEach(k => {
          if (data[k] != null) {
            try {
              adapterWrite(k, JSON.stringify(data[k]));
              restored++;
            } catch {
              failed = true;
            }
          }
        });
        if (restored === 0) { setImportError('No recognised data found in file.'); return; }
        if (failed) { setImportError('Storage is full — could not import all data. Prune old tasks first.'); return; }
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
    <div className="theme-panel data-panel">

      <div className="theme-panel-header">Data Backup</div>
      <div className="settings-backup-row">
        <button className="settings-action-btn" onClick={handleExport}>↓ Export</button>
        <button className="settings-action-btn" onClick={() => importRef.current?.click()}>↑ Import</button>
        <input ref={importRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
      </div>
      {importError && <p className="settings-error">{importError}</p>}
      <p className="settings-hint">Import replaces all data and reloads the app.</p>

      <div className="data-panel-divider" />

      <div className="theme-panel-header">Prune Old Tasks</div>
      <div className="settings-prune-row">
        <span className="settings-prune-label">Older than</span>
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
        {pruneConfirm ? '⚠ Confirm — cannot be undone' : 'Prune now'}
      </button>
      {pruneConfirm && (
        <button className="settings-cancel-btn" onClick={() => setPruneConfirm(false)}>Cancel</button>
      )}
      <p className="settings-hint" style={{ marginTop: 8 }}>Auto-prune is off. Runs manually only.</p>

    </div>
  );
}
