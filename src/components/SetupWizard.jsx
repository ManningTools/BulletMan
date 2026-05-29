import { useState } from 'react';
import { saveConfig, switchToFileMode, folderHasData } from '../utils/storageAdapter';

const DATA_KEYS = ['bulletman_tasks', 'bulletman_clients', 'bulletman_settings', 'bulletman_theme'];

function hasLocalData() {
  return DATA_KEYS.some(k => {
    try { return !!localStorage.getItem(k); } catch { return false; }
  });
}

export default function SetupWizard({ onComplete }) {
  const [name,    setName]    = useState('');
  const [mode,    setMode]    = useState('local');
  const [folder,  setFolder]  = useState('');
  const [copyExisting, setCopyExisting] = useState(true);   // local data → empty folder
  const [folderHasExisting, setFolderHasExisting] = useState(false);
  const [folderChoice, setFolderChoice] = useState('use');  // 'use' | 'replace'
  const [busy,    setBusy]    = useState(false);
  const [error,   setError]   = useState('');

  const hasData = hasLocalData();

  async function handlePickFolder() {
    if (!window.electronAPI?.pickFolder) return;
    setBusy(true);
    const picked = await window.electronAPI.pickFolder();
    if (picked) {
      setFolder(picked);
      const existing = await folderHasData(picked);
      setFolderHasExisting(existing);
      setFolderChoice('use');
    }
    setBusy(false);
  }

  async function handleContinue() {
    if (mode === 'file' && !folder) { setError('Please choose a folder first.'); return; }
    setBusy(true);
    setError('');
    try {
      const displayName = name.trim() || 'User';
      if (mode === 'file') {
        // Decide whether to write this machine's data into the folder.
        const migrate = folderHasExisting
          ? folderChoice === 'replace'   // folder already has data: only if user chose replace
          : copyExisting && hasData;     // empty folder: copy local data over if requested
        await switchToFileMode(folder, migrate);
        await saveConfig({ displayName });
      } else {
        await saveConfig({ mode: 'local', displayName, dataDir: '' });
      }
      onComplete({ displayName, mode, dataDir: folder });
    } catch (e) {
      setError('Setup failed: ' + e.message);
      setBusy(false);
    }
  }

  return (
    <div className="setup-overlay">
      <div className="setup-modal">
        <h2 className="setup-title">Welcome to BulletMan</h2>
        <p className="setup-subtitle">Just a few quick choices to get you started.</p>

        <div className="setup-field">
          <label className="setup-label">Your name</label>
          <input
            className="setup-input"
            value={name}
            maxLength={40}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Manning"
            autoFocus
            onKeyDown={e => e.key === 'Enter' && handleContinue()}
          />
        </div>

        <div className="setup-field">
          <label className="setup-label">Where should BulletMan store your data?</label>

          <label className="setup-radio">
            <input
              type="radio" name="mode" value="local"
              checked={mode === 'local'} onChange={() => setMode('local')}
            />
            <span>
              <strong>Keep it simple</strong>
              <span className="setup-radio-hint">Stored locally on this machine. Nothing to configure.</span>
            </span>
          </label>

          <label className="setup-radio">
            <input
              type="radio" name="mode" value="file"
              checked={mode === 'file'} onChange={() => setMode('file')}
            />
            <span>
              <strong>Choose a folder</strong>
              <span className="setup-radio-hint">JSON files you control — great for Dropbox, OneDrive, or a shared drive.</span>
            </span>
          </label>
        </div>

        {mode === 'file' && (
          <div className="setup-field">
            <div className="setup-folder-row">
              <span className="setup-folder-path">{folder || 'No folder chosen'}</span>
              <button className="setup-browse-btn" onClick={handlePickFolder} disabled={busy}>
                Browse…
              </button>
            </div>

            {/* Folder already has BulletMan data → make the user choose explicitly */}
            {folder && folderHasExisting && (
              <div className="setup-subchoice">
                <p className="setup-subchoice-note">This folder already contains BulletMan data.</p>
                <label className="setup-radio setup-radio-sm">
                  <input
                    type="radio" name="folderChoice" value="use"
                    checked={folderChoice === 'use'} onChange={() => setFolderChoice('use')}
                  />
                  <span><strong>Use the data already here</strong></span>
                </label>
                <label className="setup-radio setup-radio-sm">
                  <input
                    type="radio" name="folderChoice" value="replace"
                    checked={folderChoice === 'replace'} onChange={() => setFolderChoice('replace')}
                  />
                  <span><strong>Replace it with this computer&apos;s data</strong></span>
                </label>
              </div>
            )}

            {/* Empty folder + we have local data → offer to copy it over */}
            {folder && !folderHasExisting && hasData && (
              <label className="setup-checkbox">
                <input
                  type="checkbox"
                  checked={copyExisting}
                  onChange={e => setCopyExisting(e.target.checked)}
                />
                Copy my existing data to this folder
              </label>
            )}
          </div>
        )}

        {error && <p className="setup-error">{error}</p>}

        <button className="setup-continue-btn" onClick={handleContinue} disabled={busy}>
          {busy ? 'Setting up…' : 'Get started →'}
        </button>
      </div>
    </div>
  );
}
