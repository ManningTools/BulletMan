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
    '--green': dark ? '#a6e3a1' : '#2a7a2a',
    '--red': dark ? '#f38ba8' : '#c0192e',
    '--yellow': dark ? '#f9e2af' : '#b36200',
    '--radius': '10px',
  };
}

// ── Presets ───────────────────────────────────────────────────────────────────
export const PRESETS = {
  light: {
    name: 'Default Light',
    swatch: ['#121212', '#F8F8F8'],
    vars: {
      '--bg': '#F8F8F8', '--surface': '#FFFFFF', '--surface2': '#EBEBEB',
      '--border': '#121212', '--text': '#121212', '--subtext': '#4A4A4A',
      '--accent': '#121212', '--accent-hover': '#2A2A2A',
      '--green': '#1F6F3A', '--red': '#B42318', '--yellow': '#92580A',
      '--radius': '12px',
    },
  },
  dark: {
    name: 'Default Dark',
    swatch: ['#F8F8F8', '#121212'],
    vars: {
      '--bg': '#121212', '--surface': '#1C1C1C', '--surface2': '#282828',
      '--border': '#F0F0F0', '--text': '#F8F8F8', '--subtext': '#9A9A9A',
      '--accent': '#F8F8F8', '--accent-hover': '#E5E5E5',
      '--green': '#4ADE80', '--red': '#F87171', '--yellow': '#FCD34D',
      '--radius': '12px',
    },
  },
  mocha: {
    name: 'Mocha',
    swatch: ['#6366f1', '#1e1e2e'],
    vars: {
      '--bg': '#11111b', '--surface': '#1e1e2e', '--surface2': '#181825',
      '--border': '#313244', '--text': '#cdd6f4', '--subtext': '#9399b2',
      '--accent': '#6366f1', '--accent-hover': '#818cf8',
      '--green': '#a6e3a1', '--red': '#f38ba8', '--yellow': '#f9e2af',
      '--radius': '10px',
    },
  },
  ocean: {
    name: 'Ocean',
    swatch: ['#58a6ff', '#0d1117'],
    vars: {
      '--bg': '#0d1117', '--surface': '#161b22', '--surface2': '#0d1117',
      '--border': '#30363d', '--text': '#e6edf3', '--subtext': '#8b949e',
      '--accent': '#58a6ff', '--accent-hover': '#79b8ff',
      '--green': '#3fb950', '--red': '#f85149', '--yellow': '#d29922',
      '--radius': '10px',
    },
  },
  forest: {
    name: 'Forest',
    swatch: ['#4ade80', '#0d1f12'],
    vars: {
      '--bg': '#0d1f12', '--surface': '#132519', '--surface2': '#0a1a0f',
      '--border': '#1e3a26', '--text': '#d4e6d5', '--subtext': '#7a9e7e',
      '--accent': '#4ade80', '--accent-hover': '#86efac',
      '--green': '#4ade80', '--red': '#f87171', '--yellow': '#fbbf24',
      '--radius': '10px',
    },
  },
  sunset: {
    name: 'Sunset',
    swatch: ['#f472b6', '#1a0e1f'],
    vars: {
      '--bg': '#1a0e1f', '--surface': '#2a1533', '--surface2': '#150b19',
      '--border': '#3d1f4a', '--text': '#f0d9f5', '--subtext': '#9e7aac',
      '--accent': '#f472b6', '--accent-hover': '#f9a8d4',
      '--green': '#a6e3a1', '--red': '#f38ba8', '--yellow': '#f9e2af',
      '--radius': '10px',
    },
  },
  latte: {
    name: 'Latte',
    swatch: ['#7287fd', '#eff1f5'],
    vars: {
      '--bg': '#eff1f5', '--surface': '#ffffff', '--surface2': '#e6e9ef',
      '--border': '#ccd0da', '--text': '#4c4f69', '--subtext': '#6c6f85',
      '--accent': '#7287fd', '--accent-hover': '#5469f0',
      '--green': '#40a02b', '--red': '#d20f39', '--yellow': '#df8e1d',
      '--radius': '10px',
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
  // Migrate old 'manning' key → 'light'
  const savedId = saved?.id === 'manning' ? 'light' : (saved?.id ?? 'light');
  const [themeId, setThemeId] = useState(PRESETS[savedId] ? savedId : 'light');
  const [customBg, setCustomBg] = useState(saved?.customBg ?? '#F8F8F8');
  const [customAccent, setCustomAccent] = useState(saved?.customAccent ?? '#121212');

  function apply(id, bg, accent) {
    const vars = id === 'custom'
      ? buildCustomTheme(bg, accent)
      : PRESETS[id].vars;
    applyVars(vars);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ id, customBg: bg, customAccent: accent }));
  }

  // Apply on mount
  useEffect(() => {
    apply(themeId, customBg, customAccent);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function setPreset(id) {
    setThemeId(id);
    apply(id, customBg, customAccent);
  }

  function setCustomColors(bg, accent) {
    setCustomBg(bg);
    setCustomAccent(accent);
    if (themeId === 'custom') apply('custom', bg, accent);
  }

  function activateCustom(bg, accent) {
    setThemeId('custom');
    setCustomBg(bg);
    setCustomAccent(accent);
    apply('custom', bg, accent);
  }

  return { themeId, customBg, customAccent, setPreset, setCustomColors, activateCustom };
}
