import { useRef, useEffect, useState } from 'react';
import { PRESETS } from '../hooks/useTheme';

export default function ThemePanel({ themeId, customBg, customAccent, onSetPreset, onActivateCustom, onClose }) {
  const panelRef = useRef(null);
  const [localBg, setLocalBg] = useState(customBg);
  const [localAccent, setLocalAccent] = useState(customAccent);

  // Close on outside click
  useEffect(() => {
    function handler(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  function handleCustomApply() {
    onActivateCustom(localBg, localAccent);
  }

  return (
    <div className="theme-panel" ref={panelRef}>
      <div className="theme-panel-header">Color Theme</div>

      <div className="preset-grid">
        {Object.entries(PRESETS).map(([id, preset]) => (
          <button
            key={id}
            className={`preset-btn ${themeId === id ? 'active' : ''}`}
            onClick={() => onSetPreset(id)}
            title={preset.name}
          >
            <span
              className="preset-swatch"
              style={{
                background: `linear-gradient(135deg, ${preset.swatch[1]} 50%, ${preset.swatch[0]} 50%)`,
              }}
            />
            <span className="preset-label">{preset.name}</span>
          </button>
        ))}

        <button
          className={`preset-btn ${themeId === 'custom' ? 'active' : ''}`}
          onClick={handleCustomApply}
          title="Custom"
        >
          <span
            className="preset-swatch"
            style={{
              background: `linear-gradient(135deg, ${localBg} 50%, ${localAccent} 50%)`,
            }}
          />
          <span className="preset-label">Custom</span>
        </button>
      </div>

      <div className="custom-section">
        <div className="custom-row">
          <label className="custom-label">Background</label>
          <div className="color-pick-wrap">
            <input
              type="color"
              className="color-input"
              value={localBg}
              onChange={e => {
                setLocalBg(e.target.value);
                if (themeId === 'custom') onActivateCustom(e.target.value, localAccent);
              }}
            />
            <span className="color-hex">{localBg}</span>
          </div>
        </div>
        <div className="custom-row">
          <label className="custom-label">Accent</label>
          <div className="color-pick-wrap">
            <input
              type="color"
              className="color-input"
              value={localAccent}
              onChange={e => {
                setLocalAccent(e.target.value);
                if (themeId === 'custom') onActivateCustom(localBg, e.target.value);
              }}
            />
            <span className="color-hex">{localAccent}</span>
          </div>
        </div>
        {themeId !== 'custom' && (
          <button className="apply-custom-btn" onClick={handleCustomApply}>
            Apply Custom
          </button>
        )}
      </div>
    </div>
  );
}
