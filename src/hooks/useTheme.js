import { useState, useEffect } from 'react';

// ── Helpers ──────────────────────────────────────────────────────────────────
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b]
    .map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'))
    .join('');
}

function nudge(hex, amount) {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r + amount, g + amount, b + amount);
}

function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map(v => v / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function buildCustomTheme(bg, accent) {
  const dark = luminance(bg) < 0.4;
  const s = dark ? 14 : -14;
  return {
    '--bg': bg,
    '--surface': nudge(bg, s),
    '--surface2': nudge(bg, Math.round(s * 0.5)),
    '--border': nudge(bg, Math.round(s * 2)),
    '--text': dark ? '#e4e4f0' : '#1e1e30',
    '--subtext': dark ? '#888899' : '#5a5a72',
    '--accent': accent,
    '--accent-hover': nudge(accent, dark ? 22 : -22),
    '--green': dark ? '#4ADE80' : '#1F6F3A',
    '--red': dark ? '#F87171' : '#B42318',
    '--yellow': dark ? '#FCD34D' : '#92580A',
    '--radius': '10px',
  };
}

// ── Presets ───────────────────────────────────────────────────────────────────
export const PRESETS = {
  light: {
    name: 'Default',
    lightSwatch: ['#121212', '#F8F8F8'],
    darkSwatch:  ['#F0F0F0', '#121212'],
    lightVars: {
      '--bg': '#F8F8F8', '--surface': '#FFFFFF', '--surface2': '#EBEBEB',
      '--border': '#121212', '--text': '#121212', '--subtext': '#4A4A4A',
      '--accent': '#121212', '--accent-hover': '#2A2A2A',
      '--green': '#1F6F3A', '--red': '#B42318', '--yellow': '#92580A',
      '--radius': '12px',
    },
    darkVars: {
      '--bg': '#121212', '--surface': '#1C1C1C', '--surface2': '#282828',
      '--border': '#F0F0F0', '--text': '#F8F8F8', '--subtext': '#9A9A9A',
      '--accent': '#F8F8F8', '--accent-hover': '#E5E5E5',
      '--green': '#4ADE80', '--red': '#F87171', '--yellow': '#FCD34D',
      '--radius': '12px',
    },
  },
  cream: {
    name: 'Cream',
    lightSwatch: ['#1C140A', '#F5F0E8'],
    darkSwatch:  ['#E8DCCB', '#1C1008'],
    lightVars: {
      '--bg': '#F5F0E8', '--surface': '#FDF9F2', '--surface2': '#EDE7DB',
      '--border': '#1C140A', '--text': '#1C140A', '--subtext': '#5A4E40',
      '--accent': '#1C140A', '--accent-hover': '#3A2C1C',
      '--green': '#1F6F3A', '--red': '#B42318', '--yellow': '#92580A',
      '--radius': '12px',
    },
    darkVars: {
      '--bg': '#1C1008', '--surface': '#2A1C10', '--surface2': '#221408',
      '--border': '#E8DCCB', '--text': '#EDE5D5', '--subtext': '#A89878',
      '--accent': '#C8A060', '--accent-hover': '#A88040',
      '--green': '#4ADE80', '--red': '#F87171', '--yellow': '#FCD34D',
      '--radius': '12px',
    },
  },
  mocha: {
    name: 'Mocha',
    lightSwatch: ['#6B3FA8', '#F3EEFA'],
    darkSwatch:  ['#A880E0', '#110A1E'],
    lightVars: {
      '--bg': '#F3EEFA', '--surface': '#FBF8FF', '--surface2': '#E8DEFF',
      '--border': '#1A0E30', '--text': '#1A0E30', '--subtext': '#5C4878',
      '--accent': '#6B3FA8', '--accent-hover': '#4C2A80',
      '--green': '#2A7A3A', '--red': '#B42318', '--yellow': '#92580A',
      '--radius': '12px',
    },
    darkVars: {
      '--bg': '#110A1E', '--surface': '#1C1430', '--surface2': '#160E26',
      '--border': '#CDB8F0', '--text': '#E4D8FF', '--subtext': '#9080B8',
      '--accent': '#A880E0', '--accent-hover': '#8060C8',
      '--green': '#4ADE80', '--red': '#F87171', '--yellow': '#FCD34D',
      '--radius': '12px',
    },
  },
  ocean: {
    name: 'Ocean',
    lightSwatch: ['#1068C8', '#EBF4FF'],
    darkSwatch:  ['#5090D8', '#080E1A'],
    lightVars: {
      '--bg': '#EBF4FF', '--surface': '#F5FAFF', '--surface2': '#D6E8FA',
      '--border': '#08213A', '--text': '#08213A', '--subtext': '#3A5A7A',
      '--accent': '#1068C8', '--accent-hover': '#084A96',
      '--green': '#1A7A3A', '--red': '#B42318', '--yellow': '#92580A',
      '--radius': '12px',
    },
    darkVars: {
      '--bg': '#080E1A', '--surface': '#101828', '--surface2': '#0C1420',
      '--border': '#A8C8E8', '--text': '#D0E8FF', '--subtext': '#6090B0',
      '--accent': '#5090D8', '--accent-hover': '#3870B8',
      '--green': '#4ADE80', '--red': '#F87171', '--yellow': '#FCD34D',
      '--radius': '12px',
    },
  },
  forest: {
    name: 'Forest',
    lightSwatch: ['#1A7A35', '#EAFAF0'],
    darkSwatch:  ['#40A860', '#081410'],
    lightVars: {
      '--bg': '#EAFAF0', '--surface': '#F5FDF8', '--surface2': '#D4F0DD',
      '--border': '#0A2414', '--text': '#0A2414', '--subtext': '#38603E',
      '--accent': '#1A7A35', '--accent-hover': '#0E5224',
      '--green': '#1A7A35', '--red': '#B42318', '--yellow': '#92580A',
      '--radius': '12px',
    },
    darkVars: {
      '--bg': '#081410', '--surface': '#101E14', '--surface2': '#0C1810',
      '--border': '#A0C8A8', '--text': '#C8E8CC', '--subtext': '#508060',
      '--accent': '#40A860', '--accent-hover': '#288040',
      '--green': '#4ADE80', '--red': '#F87171', '--yellow': '#FCD34D',
      '--radius': '12px',
    },
  },
  sunset: {
    name: 'Sunset',
    lightSwatch: ['#C0184A', '#FFF0F3'],
    darkSwatch:  ['#E04878', '#180810'],
    lightVars: {
      '--bg': '#FFF0F3', '--surface': '#FFF8FA', '--surface2': '#FFDDE5',
      '--border': '#2A0812', '--text': '#2A0812', '--subtext': '#7A2A40',
      '--accent': '#C0184A', '--accent-hover': '#8A0E34',
      '--green': '#1F6F3A', '--red': '#B42318', '--yellow': '#92580A',
      '--radius': '12px',
    },
    darkVars: {
      '--bg': '#180810', '--surface': '#241018', '--surface2': '#1C0C14',
      '--border': '#F0A8B8', '--text': '#FFD8E4', '--subtext': '#A85870',
      '--accent': '#E04878', '--accent-hover': '#C02858',
      '--green': '#4ADE80', '--red': '#F87171', '--yellow': '#FCD34D',
      '--radius': '12px',
    },
  },
  latte: {
    name: 'Latte',
    lightSwatch: ['#5443C0', '#F0ECFF'],
    darkSwatch:  ['#8070D8', '#0E0C20'],
    lightVars: {
      '--bg': '#F0ECFF', '--surface': '#F9F7FF', '--surface2': '#E2DAFF',
      '--border': '#1C1440', '--text': '#1C1440', '--subtext': '#524878',
      '--accent': '#5443C0', '--accent-hover': '#3A2EA0',
      '--green': '#1F6F3A', '--red': '#B42318', '--yellow': '#92580A',
      '--radius': '12px',
    },
    darkVars: {
      '--bg': '#0E0C20', '--surface': '#181430', '--surface2': '#120E28',
      '--border': '#C0B0F0', '--text': '#E0D8FF', '--subtext': '#806898',
      '--accent': '#8070D8', '--accent-hover': '#6050C0',
      '--green': '#4ADE80', '--red': '#F87171', '--yellow': '#FCD34D',
      '--radius': '12px',
    },
  },
};

const STORAGE_KEY = 'bulletman_theme';

function loadSaved() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return null; }
}

function applyVars(vars) {
  Object.entries(vars).forEach(([k, v]) =>
    document.documentElement.style.setProperty(k, v)
  );
}

export function useTheme() {
  const saved = loadSaved();
  // Migrate old 'manning' / 'dark' (standalone) keys → 'light'
  const rawId = saved?.id === 'manning' || saved?.id === 'dark' ? 'light' : (saved?.id ?? 'light');
  const savedId = PRESETS[rawId] ? rawId : 'light';

  const [themeId,   setThemeId]   = useState(savedId);
  const [isDark,    setIsDark]    = useState(
    // if migrating from old 'dark' preset, start in dark mode
    saved?.id === 'dark' ? true : (saved?.isDark ?? false)
  );
  const [customBg,     setCustomBg]     = useState(saved?.customBg     ?? '#F8F8F8');
  const [customAccent, setCustomAccent] = useState(saved?.customAccent ?? '#121212');

  function apply(id, dark, bg, accent) {
    const vars = id === 'custom'
      ? buildCustomTheme(bg, accent)
      : dark ? PRESETS[id].darkVars : PRESETS[id].lightVars;
    applyVars(vars);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ id, isDark: dark, customBg: bg, customAccent: accent }));
  }

  // Apply on mount
  useEffect(() => {
    apply(themeId, isDark, customBg, customAccent);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function setPreset(id) {
    setThemeId(id);
    apply(id, isDark, customBg, customAccent);
  }

  function toggleDark() {
    const next = !isDark;
    setIsDark(next);
    apply(themeId, next, customBg, customAccent);
  }

  function setCustomColors(bg, accent) {
    setCustomBg(bg);
    setCustomAccent(accent);
    if (themeId === 'custom') apply('custom', isDark, bg, accent);
  }

  function activateCustom(bg, accent) {
    setThemeId('custom');
    setCustomBg(bg);
    setCustomAccent(accent);
    apply('custom', isDark, bg, accent);
  }

  return { themeId, isDark, customBg, customAccent, setPreset, toggleDark, setCustomColors, activateCustom };
}
