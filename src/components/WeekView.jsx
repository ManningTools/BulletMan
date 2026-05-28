import { useState, memo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';
import { weekDays, weekLabel, shortDay, formatTime, formatMoney } from '../utils/time';
import WeekCalendarPicker from './WeekCalendarPicker';

const COLORS = [
  '#5B6CF6', '#0D9488', '#D97706', '#DC2626', '#7C3AED',
  '#0284C7', '#EA580C', '#16A34A', '#9333EA', '#E11D48',
];

// ── Download icon ──────────────────────────────────────────────────────────
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

function WeekView({
  allTasks,
  globalHourlyRate,
  offset,
  onOffsetChange,
  onExportWeek,
  onExportMonth,
}) {
  const [showCal, setShowCal] = useState(false);

  // Earliest week with data → lower bound for navigation
  const allDates = Object.keys(allTasks).filter(k => (allTasks[k] || []).length > 0).sort();
  const minOffset = allDates.length === 0 ? 0 : (() => {
    const oldest  = new Date(allDates[0] + 'T00:00:00');
    const thisSun = new Date();
    thisSun.setDate(thisSun.getDate() - thisSun.getDay());
    thisSun.setHours(0, 0, 0, 0);
    const msPerWeek = 7 * 24 * 3600 * 1000;
    return -Math.ceil((thisSun - oldest) / msPerWeek);
  })();

  const days = weekDays(offset);

  // All task names with time this week
  const allNames = [...new Set(
    days.flatMap(day => (allTasks[day] || []).filter(t => (t.displaySeconds ?? t.elapsedSeconds) > 0).map(t => t.text))
  )];

  // Per-task totals: { name → { seconds, earnings } }
  const weeklyTotals = {};
  days.forEach(day => {
    (allTasks[day] || []).forEach(t => {
      const secs = t.displaySeconds ?? t.elapsedSeconds;
      if (secs <= 0) return;
      if (!weeklyTotals[t.text]) weeklyTotals[t.text] = { seconds: 0, earnings: 0 };
      const r = (t.hourlyRate !== null && t.hourlyRate !== undefined) ? t.hourlyRate : globalHourlyRate;
      weeklyTotals[t.text].seconds  += secs;
      weeklyTotals[t.text].earnings += (secs / 3600) * (r || 0);
    });
  });

  const totalWeekSeconds  = Object.values(weeklyTotals).reduce((a, b) => a + b.seconds,  0);
  const totalWeekEarnings = Object.values(weeklyTotals).reduce((a, b) => a + b.earnings, 0);
  const showEarnings      = totalWeekEarnings > 0;

  // Chart data: one group per day
  const chartData = days.map(day => {
    const entry = { day: shortDay(day), _total: 0 };
    (allTasks[day] || []).filter(t => t.completed || (t.displaySeconds ?? t.elapsedSeconds) > 0).forEach(t => {
      const secs = t.displaySeconds ?? t.elapsedSeconds;
      entry[t.text] = (entry[t.text] || 0) + secs;
      entry._total  += secs;
    });
    return entry;
  });

  const sorted = Object.entries(weeklyTotals).sort((a, b) => b[1].seconds - a[1].seconds);

  return (
    <div className="week-view">

      {/* ── Header: navigation + calendar toggle + totals + export ── */}
      <div className="week-header">

        <div className="week-nav-group">
          {/* Arrow navigation */}
          <div className="week-nav">
            <button
              className="week-nav-btn"
              onClick={() => onOffsetChange(o => o - 1)}
              disabled={offset <= minOffset}
              title="Previous week"
            >‹</button>

            <span className="week-nav-label">{weekLabel(offset)}</span>

            <button
              className="week-nav-btn"
              onClick={() => onOffsetChange(o => o + 1)}
              disabled={offset >= 0}
              title="Next week"
            >›</button>
          </div>

          {/* Calendar toggle */}
          <div className="cal-anchor">
            <button
              className={`cal-toggle-btn${showCal ? ' open' : ''}`}
              onClick={() => setShowCal(v => !v)}
              title="Pick week from calendar"
            >
              {/* Calendar icon */}
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </button>

            {showCal && (
              <WeekCalendarPicker
                currentOffset={offset}
                allTasks={allTasks}
                onSelect={onOffsetChange}
                onClose={() => setShowCal(false)}
              />
            )}
          </div>
        </div>

        {/* Right side: totals + export */}
        <div className="week-header-right">
          {totalWeekSeconds > 0 && (
            <span className="total-time">{formatTime(totalWeekSeconds)}</span>
          )}
          {showEarnings && (
            <span className="total-earnings">{formatMoney(totalWeekEarnings)}</span>
          )}
          <button className="export-btn" onClick={onExportWeek} title="Export this week as CSV">
            <DownloadIcon /> Week
          </button>
          <button className="export-btn" onClick={onExportMonth} title="Export this month as CSV">
            <DownloadIcon /> Month
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      {totalWeekSeconds === 0 ? (
        <div className="week-empty">
          <p>No time logged {offset === 0 ? 'this week' : 'that week'} yet.
            {offset === 0 && ' Start a timer on a task to track your progress.'}
          </p>
        </div>
      ) : (
        <>
          {/* Bar chart */}
          <div className="week-chart">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.2)" />
                <XAxis
                  dataKey="day"
                  tick={{ fill: 'var(--subtext)', fontSize: 11, fontFamily: 'Montserrat, sans-serif', fontWeight: 600 }}
                />
                <YAxis
                  tickFormatter={v => `${(v / 3600).toFixed(1)}h`}
                  tick={{ fill: 'var(--subtext)', fontSize: 11, fontFamily: 'Montserrat, sans-serif', fontWeight: 600 }}
                />
                <Tooltip
                  formatter={(val, name) => [formatTime(val), name]}
                  contentStyle={{ background: 'var(--surface)', border: '2px solid var(--border)', borderRadius: 10, boxShadow: 'var(--sh)' }}
                  labelStyle={{ color: 'var(--text)', fontWeight: 700, fontFamily: 'Montserrat, sans-serif' }}
                  itemStyle={{ color: 'var(--subtext)', fontWeight: 600, fontFamily: 'Montserrat, sans-serif' }}
                />
                <Legend
                  formatter={v => (
                    <span style={{ color: 'var(--text)', fontSize: 12, fontWeight: 600, fontFamily: 'Montserrat, sans-serif' }}>
                      {v}
                    </span>
                  )}
                />
                {allNames.map((name, i) => (
                  <Bar
                    key={name}
                    dataKey={name}
                    stackId="a"
                    fill={COLORS[i % COLORS.length]}
                    radius={i === allNames.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Summary cards */}
          <div className="week-summary">
            <h3>Weekly Breakdown</h3>
            <div className="summary-grid">
              {sorted.map(([name, { seconds, earnings }], i) => (
                <div key={name} className="summary-card">
                  <div className="card-dot" style={{ background: COLORS[i % COLORS.length] }} />
                  <div className="card-info">
                    <span className="card-name" title={name}>{name}</span>
                    <span className="card-time">{formatTime(seconds)}</span>
                  </div>
                  <div className="card-bar-track">
                    <div
                      className="card-bar-fill"
                      style={{ width: `${(seconds / totalWeekSeconds) * 100}%`, background: COLORS[i % COLORS.length] }}
                    />
                  </div>
                  {showEarnings && (
                    <span className="card-earnings">
                      {earnings > 0 ? formatMoney(earnings) : '—'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Earnings section */}
          {showEarnings && (
            <div className="week-earnings-section">
              <div className="week-earnings-header">
                <h3>Week Earnings</h3>
                <span className="week-earnings-total">{formatMoney(totalWeekEarnings)}</span>
              </div>
              <div className="week-earnings-grid">
                {sorted.filter(([, d]) => d.earnings > 0).map(([name, { seconds, earnings }], i) => (
                  <div key={name} className="week-earnings-row">
                    <div className="we-dot" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="we-name" title={name}>{name}</span>
                    <span className="we-time">{formatTime(seconds)}</span>
                    <div className="we-bar-track">
                      <div
                        className="we-bar-fill"
                        style={{ width: `${(earnings / totalWeekEarnings) * 100}%`, background: COLORS[i % COLORS.length] }}
                      />
                    </div>
                    <span className="we-amount">{formatMoney(earnings)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default memo(WeekView);
