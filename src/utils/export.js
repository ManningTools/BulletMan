import { formatTime, weekDays, weekSunday } from './time';

// ── Helpers ──────────────────────────────────────────────────────────────────

function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function escapeField(val) {
  const s = val == null ? '' : String(val);
  return (s.includes(',') || s.includes('"') || s.includes('\n'))
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

const HEADERS = [
  'Date', 'Task', 'Client', 'Project',
  'Hours', 'Time', 'Rate ($/hr)', 'Earnings ($)',
  'Completed', 'Subtasks Done', 'Subtasks Total',
];

function taskToRow(task, dateKey, globalRate, clients = []) {
  // Prefer displaySeconds (live) if present, fall back to stored elapsedSeconds
  const secs = task.displaySeconds !== undefined ? task.displaySeconds : (task.elapsedSeconds || 0);
  const rate = (task.hourlyRate !== null && task.hourlyRate !== undefined)
    ? task.hourlyRate
    : (globalRate || 0);
  const hours = secs / 3600;
  const earnings = rate > 0 ? hours * rate : 0;
  const subtasksTotal = (task.subtasks || []).length;
  const subtasksDone  = (task.subtasks || []).filter(s => s.completed).length;

  // Resolve client / project names
  let clientName = '';
  let projectName = '';
  if (task.clientId) {
    const client = clients.find(c => c.id === task.clientId);
    if (client) {
      clientName = client.name;
      if (task.projectId) {
        const project = client.projects.find(p => p.id === task.projectId);
        if (project) projectName = project.name;
      }
    }
  }

  return [
    escapeField(dateKey),
    escapeField(task.text),
    escapeField(clientName),
    escapeField(projectName),
    hours.toFixed(2),
    escapeField(formatTime(secs)),
    rate > 0 ? rate.toFixed(2) : '',
    earnings > 0 ? earnings.toFixed(2) : '',
    task.completed ? 'Yes' : 'No',
    subtasksDone,
    subtasksTotal,
  ].join(',');
}

function buildCSV(rows) {
  return [HEADERS.join(','), ...rows].join('\n');
}

function triggerDownload(filename, csv) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Public export functions ───────────────────────────────────────────────────

/**
 * Export a single day's tasks.
 * Pass `tasks` as the live task array (has displaySeconds).
 */
export function exportDay(tasks, globalRate, dateKey, clients = []) {
  const rows = tasks.map(t => taskToRow(t, dateKey, globalRate, clients));
  triggerDownload(`bulletman-${dateKey}.csv`, buildCSV(rows));
}

/**
 * Export all tasks in the viewed week (offset from today's week).
 */
export function exportWeek(allTasks, globalRate, offset, clients = []) {
  const days = weekDays(offset);
  const rows = [];
  days.forEach(date => {
    (allTasks[date] || []).forEach(t => rows.push(taskToRow(t, date, globalRate, clients)));
  });
  const sun = weekSunday(offset);
  triggerDownload(`bulletman-week-${toDateKey(sun)}.csv`, buildCSV(rows));
}

/**
 * Export all tasks in the calendar month that contains the viewed week.
 */
export function exportMonth(allTasks, globalRate, offset, clients = []) {
  const sun   = weekSunday(offset);
  const year  = sun.getFullYear();
  const month = sun.getMonth();
  const rows  = [];

  Object.keys(allTasks).sort().forEach(date => {
    const d = new Date(date + 'T00:00:00');
    if (d.getFullYear() === year && d.getMonth() === month) {
      (allTasks[date] || []).forEach(t => rows.push(taskToRow(t, date, globalRate, clients)));
    }
  });

  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
  triggerDownload(`bulletman-${monthStr}.csv`, buildCSV(rows));
}
