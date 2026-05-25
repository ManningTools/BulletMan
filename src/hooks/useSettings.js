import { useState, useCallback } from 'react';

const SETTINGS_KEY = 'bulletman_settings';

function load() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
  } catch {
    return {};
  }
}

export function useSettings() {
  const [settings, setSettings] = useState(load);

  const globalHourlyRate = settings.globalHourlyRate ?? 0;

  const setGlobalHourlyRate = useCallback((raw) => {
    const n = parseFloat(raw);
    const value = isNaN(n) || n < 0 ? 0 : +n.toFixed(2);
    setSettings(prev => {
      const updated = { ...prev, globalHourlyRate: value };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  return { globalHourlyRate, setGlobalHourlyRate };
}
