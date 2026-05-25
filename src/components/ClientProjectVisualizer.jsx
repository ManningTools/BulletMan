import { formatTime, formatMoney } from '../utils/time';

// ── Time range helpers ────────────────────────────────────────────────────────

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function weekStart() {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function monthStart() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dateFromKey(key) {
  return new Date(key + 'T00:00:00');
}

// ── Aggregate allTasks by client/project for a given date range ───────────────

function aggregate(allTasks, clients, globalHourlyRate, range) {
  const now = new Date();
  const ws  = weekStart();
  const ms  = monthStart();

  // clientId → { client, projects: { projectId → { seconds, earnings } }, totalSeconds, totalEarnings }
  const result = {};

  Object.entries(allTasks).forEach(([dateKey, tasks]) => {
    const d = dateFromKey(dateKey);
    if (range === 'week'  && d < ws)  return;
    if (range === 'month' && d < ms)  return;

    (tasks || []).forEach(t => {
      if (!t.clientId) return;
      const secs = t.elapsedSeconds || 0;
      if (secs === 0) return;

      const rate = (t.hourlyRate !== null && t.hourlyRate !== undefined)
        ? t.hourlyRate
        : (globalHourlyRate || 0);
      const earnings = (secs / 3600) * rate;

      if (!result[t.clientId]) {
        result[t.clientId] = { projects: {}, totalSeconds: 0, totalEarnings: 0 };
      }
      result[t.clientId].totalSeconds  += secs;
      result[t.clientId].totalEarnings += earnings;

      const pid = t.projectId || '__none__';
      if (!result[t.clientId].projects[pid]) {
        result[t.clientId].projects[pid] = { seconds: 0, earnings: 0 };
      }
      result[t.clientId].projects[pid].seconds  += secs;
      result[t.clientId].projects[pid].earnings += earnings;
    });
  });

  return result;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ClientProjectVisualizer({ allTasks, clients, globalHourlyRate, range }) {
  const data = aggregate(allTasks, clients, globalHourlyRate, range);
  const clientIds = Object.keys(data).filter(id => data[id].totalSeconds > 0);

  if (clientIds.length === 0) {
    return (
      <div className="cpv-empty">
        <p>No client time logged {range === 'week' ? 'this week' : range === 'month' ? 'this month' : 'yet'}.</p>
        <p className="cpv-hint">Assign tasks to clients via the client chip (◎) on each task.</p>
      </div>
    );
  }

  const grandTotal = clientIds.reduce((s, id) => s + data[id].totalSeconds, 0);
  const showEarnings = clientIds.some(id => data[id].totalEarnings > 0);

  return (
    <div className="cpv">
      {clientIds.map(clientId => {
        const client = clients.find(c => c.id === clientId);
        if (!client) return null;
        const { totalSeconds, totalEarnings, projects } = data[clientId];
        const pct = grandTotal > 0 ? (totalSeconds / grandTotal) * 100 : 0;

        return (
          <div key={clientId} className="cpv-client-card">
            {/* Client header */}
            <div className="cpv-client-header">
              <div className="cpv-client-dot" style={{ background: client.color }} />
              <span className="cpv-client-name">{client.name}</span>
              <div className="cpv-client-meta">
                <span className="cpv-client-time">{formatTime(totalSeconds)}</span>
                {showEarnings && totalEarnings > 0 && (
                  <span className="cpv-client-earnings">{formatMoney(totalEarnings)}</span>
                )}
              </div>
            </div>

            {/* Client total bar */}
            <div className="cpv-bar-track">
              <div
                className="cpv-bar-fill"
                style={{ width: `${pct}%`, background: client.color }}
              />
            </div>

            {/* Per-project breakdown */}
            <div className="cpv-projects">
              {Object.entries(projects).map(([pid, { seconds, earnings }]) => {
                const project = pid === '__none__' ? null : client.projects.find(p => p.id === pid);
                const projPct = totalSeconds > 0 ? (seconds / totalSeconds) * 100 : 0;

                return (
                  <div key={pid} className="cpv-project-row">
                    <span className="cpv-project-name">
                      {project ? project.name : <em>No project</em>}
                    </span>
                    <div className="cpv-proj-bar-track">
                      <div
                        className="cpv-proj-bar-fill"
                        style={{ width: `${projPct}%`, background: client.color, opacity: 0.6 }}
                      />
                    </div>
                    <span className="cpv-project-time">{formatTime(seconds)}</span>
                    {showEarnings && (
                      <span className="cpv-project-earnings">
                        {earnings > 0 ? formatMoney(earnings) : '—'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
