import { describe, test, expect, afterEach, vi } from 'vitest';
import {
  formatTime, formatMoney, secondsToHours, parseTimeInput,
  todayKey, yesterdayKey, weekDays,
  weekOffsetFromDate, weekLabel, shortDay,
} from './time.js';

// ── formatTime ────────────────────────────────────────────────────────────────

describe('formatTime', () => {
  test('zero seconds', () => expect(formatTime(0)).toBe('00:00'));
  test('59 seconds', () => expect(formatTime(59)).toBe('00:59'));
  test('1 minute', () => expect(formatTime(60)).toBe('01:00'));
  test('1 hour exactly', () => expect(formatTime(3600)).toBe('1h 00m'));
  test('1 hour 30 minutes', () => expect(formatTime(5400)).toBe('1h 30m'));
  test('padding in sub-hour', () => expect(formatTime(65)).toBe('01:05'));
  test('multi-hour', () => expect(formatTime(7384)).toBe('2h 03m'));
});

// ── secondsToHours ────────────────────────────────────────────────────────────

describe('secondsToHours', () => {
  test('exact hours', () => expect(secondsToHours(3600)).toBe(1));
  test('half hour', () => expect(secondsToHours(1800)).toBe(0.5));
  test('rounds to 2 decimal places', () => expect(secondsToHours(3700)).toBe(1.03));
});

// ── formatMoney ───────────────────────────────────────────────────────────────

describe('formatMoney', () => {
  test('whole dollar', () => expect(formatMoney(100)).toBe('$100.00'));
  test('cents', () => expect(formatMoney(12.5)).toBe('$12.50'));
  test('zero', () => expect(formatMoney(0)).toBe('$0.00'));
});

// ── parseTimeInput ─────────────────────────────────────────────────────────────

describe('parseTimeInput', () => {
  test('1h 30m → 5400', () => expect(parseTimeInput('1h 30m')).toBe(5400));
  test('2h → 7200', () => expect(parseTimeInput('2h')).toBe(7200));
  test('45m → 2700', () => expect(parseTimeInput('45m')).toBe(2700));
  test('90m → 5400', () => expect(parseTimeInput('90m')).toBe(5400));
  test('1:30 (H:MM) → 5400', () => expect(parseTimeInput('1:30')).toBe(5400));
  test('1:30:00 (H:MM:SS) → 5400', () => expect(parseTimeInput('1:30:00')).toBe(5400));
  test('0:05:30 → 330', () => expect(parseTimeInput('0:05:30')).toBe(330));
  test('plain 90 (minutes) → 5400', () => expect(parseTimeInput('90')).toBe(5400));
  test('plain 0 → 0', () => expect(parseTimeInput('0')).toBe(0));
  test('2.5h → 9000', () => expect(parseTimeInput('2.5h')).toBe(9000));
  test('30.5m → 1830', () => expect(parseTimeInput('30.5m')).toBe(1830));
  test('empty string → null', () => expect(parseTimeInput('')).toBeNull());
  test('whitespace only → null', () => expect(parseTimeInput('  ')).toBeNull());
  test('non-numeric → null', () => expect(parseTimeInput('abc')).toBeNull());
  test('null input → null', () => expect(parseTimeInput(null)).toBeNull());
});

// ── Date-key helpers ──────────────────────────────────────────────────────────
// These tests use fake timers to pin "now" to a known local date.

describe('todayKey', () => {
  afterEach(() => vi.useRealTimers());

  test('returns YYYY-MM-DD in local time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 2, 15, 14, 0, 0)); // Mar 15 2024 2pm local
    expect(todayKey()).toBe('2024-03-15');
  });

  test('uses local date fields, not UTC', () => {
    vi.useFakeTimers();
    // Local midnight → getDate() === 5, but toISOString().slice(0,10) may return the 4th
    // depending on UTC offset. Using the JS Date constructor guarantees a local-time Date.
    vi.setSystemTime(new Date(2024, 0, 5, 0, 0, 0)); // Jan 5 local midnight
    expect(todayKey()).toBe('2024-01-05');
  });
});

describe('yesterdayKey', () => {
  afterEach(() => vi.useRealTimers());

  test('returns the day before today', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 2, 15, 12, 0, 0)); // Mar 15
    expect(yesterdayKey()).toBe('2024-03-14');
  });

  test('crosses month boundary', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 2, 1, 12, 0, 0)); // Mar 1
    expect(yesterdayKey()).toBe('2024-02-29'); // 2024 is a leap year
  });

  test('crosses year boundary', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 0, 1, 12, 0, 0)); // Jan 1
    expect(yesterdayKey()).toBe('2023-12-31');
  });
});

// ── weekDays ──────────────────────────────────────────────────────────────────

describe('weekDays', () => {
  afterEach(() => vi.useRealTimers());

  test('returns 7 elements', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 0, 17, 12, 0, 0)); // Wednesday Jan 17
    expect(weekDays(0)).toHaveLength(7);
  });

  test('first element is the Sunday of the current week', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 0, 17, 12, 0, 0)); // Wednesday Jan 17
    const days = weekDays(0);
    expect(days[0]).toBe('2024-01-14'); // Sunday
  });

  test('last element is Saturday', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 0, 17, 12, 0, 0));
    const days = weekDays(0);
    expect(days[6]).toBe('2024-01-20'); // Saturday
  });

  test('Wednesday falls on index 3', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 0, 17, 12, 0, 0));
    const days = weekDays(0);
    expect(days[3]).toBe('2024-01-17');
  });

  test('offset -1 returns previous week', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 0, 17, 12, 0, 0));
    const days = weekDays(-1);
    expect(days[0]).toBe('2024-01-07'); // Previous Sunday
    expect(days[6]).toBe('2024-01-13'); // Previous Saturday
  });
});

// ── weekOffsetFromDate ────────────────────────────────────────────────────────

describe('weekOffsetFromDate', () => {
  afterEach(() => vi.useRealTimers());

  test('current week → 0', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 0, 17, 12, 0, 0)); // Wednesday
    expect(weekOffsetFromDate(new Date(2024, 0, 17))).toBe(0);
  });

  test('sunday of current week → 0', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 0, 17, 12, 0, 0));
    expect(weekOffsetFromDate(new Date(2024, 0, 14))).toBe(0); // Sunday
  });

  test('previous week → -1', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 0, 17, 12, 0, 0));
    expect(weekOffsetFromDate(new Date(2024, 0, 10))).toBe(-1);
  });

  test('two weeks ago → -2', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 0, 17, 12, 0, 0));
    expect(weekOffsetFromDate(new Date(2024, 0, 3))).toBe(-2);
  });

  test('accepts a YYYY-MM-DD string', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 0, 17, 12, 0, 0));
    expect(weekOffsetFromDate('2024-01-10')).toBe(-1);
  });
});

// ── weekLabel ─────────────────────────────────────────────────────────────────

describe('weekLabel', () => {
  afterEach(() => vi.useRealTimers());

  test('offset 0 → "This Week"', () => {
    expect(weekLabel(0)).toBe('This Week');
  });

  test('offset -1 → "Last Week"', () => {
    expect(weekLabel(-1)).toBe('Last Week');
  });

  test('older offset includes year', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 0, 17, 12, 0, 0));
    const label = weekLabel(-3);
    expect(label).toContain('2023');
  });
});

// ── shortDay ──────────────────────────────────────────────────────────────────

describe('shortDay', () => {
  test('returns a non-empty localised string', () => {
    const result = shortDay('2024-01-15');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  test('contains "Mon" for a Monday', () => {
    // 2024-01-15 is a Monday
    expect(shortDay('2024-01-15')).toContain('Mon');
  });
});
