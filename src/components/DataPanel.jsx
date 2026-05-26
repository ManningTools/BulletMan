import { useState, useRef, useEffect } from 'react';

const STORAGE_KEYS = ['bulletman_tasks', 'bulletman_clients', 'bulletman_settings', 'bulletman_theme'];

export default function DataPanel({ onPruneOldTasks, onClose }) {
  const [pruneDays,    setPruneDays]    = useState(90);
  const [pruneConfirm, setPruneConfirm] = useState(false);
  const [importError,  setImportError]  = useState('');
  const panelRef  = useRef(null);
  const importRef = useRef(null);

  useEffect(() => {
    function handler(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

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
    <div className="theme-panel data-panel" ref={panelRef}>

      {/* ── Backup / Restore ── */}
      <div className="theme-panel-header">Data Backup</div>
      <div className="settings-backup-row">
        <button className="settings-action-btn" onClick={handleExport}>↓ Export</button>
        <button className="settings-action-btn" onClick={() => importRef.current?.click()}>↑ Import</button>
        <input ref={importRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
      </div>
      {importError && <p className="settings-error">{importError}</p>}
      <p className="settings-hint">Import replaces all data and reloads the app.</p>

      <div className="data-panel-divider" />

      {/* ── Prune ── */}
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
