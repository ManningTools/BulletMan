import { useState } from 'react';

export default function SettingsPanel({ globalHourlyRate, onSetRate, onClose }) {
  const [input, setInput] = useState(globalHourlyRate > 0 ? String(globalHourlyRate) : '');

  function handleApply(e) {
    e.preventDefault();
    onSetRate(input === '' ? '0' : input);
    onClose();
  }

  return (
    <div className="theme-panel settings-panel">
      <div className="theme-panel-header">Hourly Rate</div>

      <form onSubmit={handleApply}>
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
    </div>
  );
}
