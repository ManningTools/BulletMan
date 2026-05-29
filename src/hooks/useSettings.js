import { useState, useCallback } from 'react';
import { storageSet } from '../utils/storage';

const SETTINGS_KEY = 'bulletman_settings';

function load() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
  } catch {
    return {};
  }
}

const DEFAULT_HOTKEY = 'CommandOrControl+Shift+Space';

export function useSettings() {
  const [settings, setSettings] = useState(load);

  const globalHourlyRate = settings.globalHourlyRate ?? 0;
  const hotkeyShortcut   = settings.hotkeyShortcut ?? DEFAULT_HOTKEY;

  const setGlobalHourlyRate = useCallback((raw) => {
    const n = parseFloat(raw);
    const value = isNaN(n) || n < 0 ? 0 : +n.toFixed(2);
    setSettings(prev => {
      const updated = { ...prev, globalHourlyRate: value };
      storageSet(SETTINGS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const setHotkeyShortcut = useCallback((shortcut) => {
    setSettings(prev => {
      const updated = { ...prev, hotkeyShortcut: shortcut };
      storageSet(SETTINGS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  return { globalHourlyRate, setGlobalHourlyRate, hotkeyShortcut, setHotkeyShortcut };
}
