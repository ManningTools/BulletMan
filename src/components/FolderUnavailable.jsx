import { useState } from 'react';
import { retryFolder, switchToLocalMode, getConfig } from '../utils/storageAdapter';

export default function FolderUnavailable() {
  const [busy, setBusy]   = useState(false);
  const [tried, setTried] = useState(false);
  const folder = getConfig().dataDir;

  async function handleRetry() {
    setBusy(true);
    const ok = await retryFolder();
    setBusy(false);
    if (ok) {
      window.location.reload();
    } else {
      setTried(true);
    }
  }

  async function handleUseLocal() {
    setBusy(true);
    await switchToLocalMode();
    window.location.reload();
  }

  return (
    <div className="setup-overlay">
      <div className="setup-modal">
        <h2 className="setup-title">Data folder not available</h2>
        <p className="setup-subtitle">
          BulletMan couldn&apos;t reach your data folder. If it lives on a cloud drive
          (Dropbox, OneDrive) or an external/network disk, it may not be mounted yet.
        </p>

        <div className="storage-info" style={{ marginBottom: 16 }}>
          <span className="storage-mode-badge">Folder</span>
          <span className="storage-folder-path">{folder || '(unknown)'}</span>
        </div>

        {tried && (
          <p className="setup-error">Still can&apos;t reach it. Make sure the drive is connected, then try again.</p>
        )}

        <button className="setup-continue-btn" onClick={handleRetry} disabled={busy}>
          {busy ? 'Checking…' : 'Try again'}
        </button>

        <p className="settings-hint" style={{ textAlign: 'center', marginTop: 14 }}>
          Don&apos;t want to wait?{' '}
          <button className="link-btn" onClick={handleUseLocal} disabled={busy}>
            Switch to local storage
          </button>
        </p>
      </div>
    </div>
  );
}
