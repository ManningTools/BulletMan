import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatTime, formatMoney, secondsToHours } from '../utils/time';

const COLORS = [
  '#5B6CF6', '#0D9488', '#D97706', '#DC2626', '#7C3AED',
  '#0284C7', '#EA580C', '#16A34A', '#9333EA', '#E11D48',
];

const RADIAN = Math.PI / 180;
function PctLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
  if (percent < 0.05) return null;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

function DownloadIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  );
}

export default function DayVisualizer({ tasks, globalHourlyRate, onExportDay }) {
  const withTime = tasks.filter(t => t.displaySeconds > 0);
  const totalSeconds = withTime.reduce((sum, t) => sum + t.displaySeconds, 0);

  const showEarnings = withTime.some(t => {
    const r = t.hourlyRate !== null && t.hourlyRate !== undefined ? t.hourlyRate : globalHourlyRate;
    return r > 0;
  });
  const totalEarnings = withTime.reduce((sum, t) => {
    const r = t.hourlyRate !== null && t.hourlyRate !== undefined ? t.hourlyRate : globalHourlyRate;
    return sum + (t.displaySeconds / 3600) * (r || 0);
  }, 0);

  if (withTime.length === 0) {
    return (
      <div className="day-visualizer empty">
        <p>Start a timer to see your day visualized.</p>
      </div>
    );
  }

  const data = withTime.map((t, i) => {
    const r = t.hourlyRate !== null && t.hourlyRate !== undefined ? t.hourlyRate : globalHourlyRate;
    return {
      name: t.text,
      value: t.displaySeconds,
      hours: secondsToHours(t.displaySeconds),
      completed: t.completed,
      earnings: (t.displaySeconds / 3600) * (r || 0),
      color: COLORS[i % COLORS.length],
    };
  });

  return (
    <div className="day-visualizer">
      {/* ── Time chart header ── */}
      <div className="viz-header">
        <h3>Today's Hours</h3>
        <div className="viz-header-right">
          <span className="total-time">Total: {formatTime(totalSeconds)}</span>
          {showEarnings && (
            <span className="total-earnings">{formatMoney(totalEarnings)} earned</span>
          )}
          {onExportDay && (
            <button className="export-btn" onClick={onExportDay} title="Export today as CSV">
              <DownloadIcon /> CSV
            </button>
          )}
        </div>
      </div>

      {/* ── Pie chart ── */}
      <div className="viz-body">
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              labelLine={false}
              label={<PctLabel />}
            >
              {data.map((d, i) => (
                <Cell key={i} fill={d.color} opacity={d.completed ? 1 : 0.65} />
              ))}
            </Pie>
            <Tooltip
              formatter={(val, name) => [formatTime(val), name]}
              contentStyle={{ background: 'var(--surface)', border: '2px solid var(--border)', borderRadius: 10, boxShadow: 'var(--sh)' }}
              labelStyle={{ color: 'var(--text)', fontWeight: 700, fontFamily: 'Montserrat, sans-serif' }}
              itemStyle={{ color: 'var(--subtext)', fontWeight: 600, fontFamily: 'Montserrat, sans-serif' }}
            />
            <Legend
              formatter={(value, entry) => (
                <span style={{ color: 'var(--text)', fontSize: 13, fontWeight: 600, fontFamily: 'Montserrat, sans-serif' }}>
                  {value}{' '}
                  <span style={{ color: 'var(--subtext)', fontWeight: 500 }}>({formatTime(entry.payload.value)})</span>
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* ── Per-task bars ── */}
      <div className="task-bars">
        {data.map((d, i) => (
          <div key={i} className="bar-row">
            <span className="bar-label" title={d.name}>{d.name}</span>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{
                  width: `${(d.value / totalSeconds) * 100}%`,
                  background: d.color,
                  opacity: d.completed ? 1 : 0.65,
                }}
              />
            </div>
            <span className="bar-time">{formatTime(d.value)}</span>
            {showEarnings && (
              <span className="bar-earnings">{d.earnings > 0 ? formatMoney(d.earnings) : '—'}</span>
            )}
          </div>
        ))}
      </div>

      {/* ── Earnings breakdown (only when rates configured) ── */}
      {showEarnings && (
        <div className="earnings-section">
          <div className="earnings-section-header">
            <h4>Earnings Breakdown</h4>
            <span className="earnings-total">{formatMoney(totalEarnings)}</span>
          </div>
          <div className="earnings-grid">
            {data.map((d, i) => (
              <div key={i} className="earnings-card">
                <div className="earnings-card-dot" style={{ background: d.color }} />
                <div className="earnings-card-info">
                  <span className="earnings-card-name" title={d.name}>{d.name}</span>
                  <span className="earnings-card-time">{formatTime(d.value)}</span>
                </div>
                <span className="earnings-card-amount">
                  {d.earnings > 0 ? formatMoney(d.earnings) : <span style={{ color: 'var(--subtext)' }}>—</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
