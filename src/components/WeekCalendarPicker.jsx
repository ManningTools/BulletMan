import { useState, useRef, useEffect } from 'react';
import { weekSunday, weekOffsetFromDate } from '../utils/time';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAY_HDRS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

/** Local date key without UTC shift */
function toKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Build a 2-D array: weeks × 7 days for the given month */
function buildMonth(year, month) {
  const first    = new Date(year, month, 1);
  const startSun = new Date(first);
  startSun.setDate(first.getDate() - first.getDay());

  const last   = new Date(year, month + 1, 0);
  const endSat = new Date(last);
  endSat.setDate(last.getDate() + (6 - last.getDay()));

  const weeks = [];
  const cur   = new Date(startSun);
  while (cur <= endSat) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      week.push({ date: new Date(cur), inMonth: cur.getMonth() === month });
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

export default function WeekCalendarPicker({ currentOffset, allTasks, onSelect, onClose }) {
  // Initialise view on the month of the currently selected week
  const initSun  = weekSunday(currentOffset);
  const [year, setYear]   = useState(initSun.getFullYear());
  const [month, setMonth] = useState(initSun.getMonth());
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  const today       = new Date(); today.setHours(0,0,0,0);
  const todayKey    = toKey(today);
  const thisSun     = weekSunday(0);
  const weeks       = buildMonth(year, month);

  function weekData(week) {
    // true if any day in this week has logged time
    return week.some(({ date }) => (allTasks[toKey(date)] || []).some(t => t.elapsedSeconds > 0));
  }

  function weekSelected(week) {
    return weekOffsetFromDate(week[0].date) === currentOffset;
  }

  function weekIsFuture(week) {
    // Week's Sunday is after current week's Sunday
    const sun = new Date(week[0].date);
    sun.setHours(0,0,0,0);
    return sun > thisSun;
  }

  function handleWeekClick(week) {
    const off = weekOffsetFromDate(week[0].date);
    if (off > 0) return;
    onSelect(off);
    onClose();
  }

  return (
    <div className="cal-picker" ref={ref}>
      {/* Month nav */}
      <div className="cal-header">
        <button className="cal-nav-btn" onClick={prevMonth} title="Previous month">‹</button>
        <span className="cal-month-label">{MONTH_NAMES[month]} {year}</span>
        <button className="cal-nav-btn" onClick={nextMonth} title="Next month">›</button>
      </div>

      {/* Day-of-week headers */}
      <div className="cal-dow-row">
        {DAY_HDRS.map(d => <span key={d} className="cal-dow">{d}</span>)}
        <span className="cal-dow cal-dow-data" title="Week has data">●</span>
      </div>

      {/* Week rows */}
      {weeks.map((week, wi) => {
        const selected = weekSelected(week);
        const future   = weekIsFuture(week);
        const hasData  = weekData(week);

        return (
          <div
            key={wi}
            className={`cal-week${selected ? ' sel' : ''}${future ? ' future' : ''}`}
            onClick={() => handleWeekClick(week)}
            title={future ? 'Future week — unavailable' : 'Jump to this week'}
          >
            {week.map(({ date, inMonth }, di) => {
              const key     = toKey(date);
              const isToday = key === todayKey;
              return (
                <span
                  key={di}
                  className={`cal-day${inMonth ? '' : ' dim'}${isToday ? ' today' : ''}`}
                >
                  {date.getDate()}
                </span>
              );
            })}
            {/* Data indicator column */}
            <span className={`cal-has-data${hasData ? ' on' : ''}`}>
              {hasData ? '●' : ''}
            </span>
          </div>
        );
      })}
    </div>
  );
}
