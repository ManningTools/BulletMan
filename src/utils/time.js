export function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatMoney(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export function secondsToHours(seconds) {
  return +(seconds / 3600).toFixed(2);
}

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function yesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

// Get the Sunday of the week at `offset` (0 = this week, -1 = last week, …)
export function weekSunday(offset = 0) {
  const today = new Date();
  const d = new Date(today);
  d.setDate(today.getDate() - today.getDay() + offset * 7);
  d.setHours(0, 0, 0, 0);
  return d;
}

// 7-element array of date strings (Sun–Sat) for the week at `offset`
export function weekDays(offset = 0) {
  const sunday = weekSunday(offset);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

export function shortDay(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

/**
 * Given any Date (or YYYY-MM-DD string), return the week offset
 * of that date's week relative to the current week (0 = this week).
 */
export function weekOffsetFromDate(date) {
  const d = date instanceof Date ? new Date(date) : new Date(date + 'T00:00:00');
  d.setHours(0, 0, 0, 0);
  const sun = new Date(d);
  sun.setDate(d.getDate() - d.getDay());
  sun.setHours(0, 0, 0, 0);
  const thisSun = weekSunday(0);
  const msPerWeek = 7 * 24 * 3600 * 1000;
  return Math.round((sun - thisSun) / msPerWeek);
}

export function weekLabel(offset) {
  if (offset === 0) return 'This Week';
  if (offset === -1) return 'Last Week';
  const sunday = weekSunday(offset);
  const sat = new Date(sunday);
  sat.setDate(sunday.getDate() + 6);
  const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const year = sat.getFullYear();
  return `${fmt(sunday)} – ${fmt(sat)}, ${year}`;
}

/**
 * Parse a human time string into seconds.
 * Accepts: "1h 30m", "90m", "90" (= minutes), "1:30", "1:30:00"
 * Returns null if unparseable.
 */
export function parseTimeInput(str) {
  str = (str || '').trim();
  if (!str) return null;

  // "Xh Ym" or "Xh" or "Ym"
  const hm = str.match(/^(?:(\d+(?:\.\d+)?)h)?\s*(?:(\d+(?:\.\d+)?)m)?$/i);
  if (hm && (hm[1] || hm[2])) {
    return Math.round((parseFloat(hm[1] || 0) * 3600) + (parseFloat(hm[2] || 0) * 60));
  }

  // "H:MM:SS" or "H:MM"
  const colons = str.split(':').map(Number);
  if (colons.length >= 2 && colons.every(n => !isNaN(n))) {
    if (colons.length === 3) return colons[0] * 3600 + colons[1] * 60 + colons[2];
    return colons[0] * 3600 + colons[1] * 60;
  }

  // Plain number → minutes
  const n = parseFloat(str);
  if (!isNaN(n) && n >= 0) return Math.round(n * 60);

  return null;
}
