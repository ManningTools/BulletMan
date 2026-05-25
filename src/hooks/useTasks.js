import { useState, useEffect, useCallback, useRef } from 'react';
import { todayKey } from '../utils/time';

const STORAGE_KEY = 'bulletman_tasks';

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function save(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function useTasks() {
  const [allTasks, setAllTasks] = useState(load);
  const lastDayKey = useRef(todayKey());

  const persist = useCallback((updated) => {
    setAllTasks(updated);
    save(updated);
  }, []);

  // ── Midnight detection ──────────────────────────────────────────────────────
  // Poll every 10 s; when the date flips stop any timers that were running on
  // the old day so they don't bleed into the new one.
  useEffect(() => {
    const ticker = setInterval(() => {
      const current = todayKey();
      if (current === lastDayKey.current) return;
      const oldKey = lastDayKey.current;
      lastDayKey.current = current;

      setAllTasks(prev => {
        const oldDay = prev[oldKey] || [];
        if (!oldDay.some(t => t.timerRunning)) return prev;
        const now = Date.now();
        const stopped = oldDay.map(t => {
          if (!t.timerRunning || !t.timerStartedAt) return t;
          const extra = Math.floor((now - t.timerStartedAt) / 1000);
          return { ...t, timerRunning: false, timerStartedAt: null, elapsedSeconds: t.elapsedSeconds + extra };
        });
        const next = { ...prev, [oldKey]: stopped };
        save(next);
        return next;
      });
    }, 10_000);

    return () => clearInterval(ticker);
  }, []);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function todayList() {
    return allTasks[todayKey()] || [];
  }

  function mapToday(fn) {
    const key = todayKey();
    const tasks = (allTasks[key] || []).map(fn);
    persist({ ...allTasks, [key]: tasks });
  }

  // ── Task CRUD ────────────────────────────────────────────────────────────────
  function addTask(text, clientId = null, projectId = null) {
    if (!text.trim()) return;
    const key = todayKey();
    const task = {
      id: crypto.randomUUID(),
      text: text.trim(),
      completed: false,
      date: key,
      elapsedSeconds: 0,
      timerRunning: false,
      timerStartedAt: null,
      hourlyRate: null,   // null = inherit global rate
      subtasks: [],
      clientId: clientId || null,
      projectId: projectId || null,
    };
    persist({ ...allTasks, [key]: [...(allTasks[key] || []), task] });
  }

  function updateTask(id, changes) {
    mapToday(t => t.id === id ? { ...t, ...changes } : t);
  }

  function editTask(id, text) {
    if (!text.trim()) return;
    updateTask(id, { text: text.trim() });
  }

  function deleteTask(id) {
    const key = todayKey();
    persist({ ...allTasks, [key]: (allTasks[key] || []).filter(t => t.id !== id) });
  }

  function setTaskRate(id, raw) {
    const n = parseFloat(raw);
    const value = (raw === '' || isNaN(n)) ? null : Math.max(0, +n.toFixed(2));
    updateTask(id, { hourlyRate: value });
  }

  function setTaskTime(id, seconds) {
    mapToday(t => t.id !== id ? t : {
      ...t,
      elapsedSeconds: Math.max(0, Math.round(seconds)),
      timerRunning: false,
      timerStartedAt: null,
    });
  }

  function toggleTimer(id) {
    const key = todayKey();
    const now = Date.now();
    const tasks = (allTasks[key] || []).map(t => {
      if (t.id !== id) {
        // Pause any other running timer
        if (t.timerRunning && t.timerStartedAt) {
          const extra = Math.floor((now - t.timerStartedAt) / 1000);
          return { ...t, timerRunning: false, timerStartedAt: null, elapsedSeconds: t.elapsedSeconds + extra };
        }
        return t;
      }
      if (t.timerRunning) {
        const extra = Math.floor((now - t.timerStartedAt) / 1000);
        return { ...t, timerRunning: false, timerStartedAt: null, elapsedSeconds: t.elapsedSeconds + extra };
      }
      return { ...t, timerRunning: true, timerStartedAt: now };
    });
    persist({ ...allTasks, [key]: tasks });
  }

  function completeTask(id, completed) {
    const key = todayKey();
    const now = Date.now();
    const tasks = (allTasks[key] || []).map(t => {
      if (t.id !== id) return t;
      let extra = 0;
      if (completed && t.timerRunning && t.timerStartedAt) {
        extra = Math.floor((now - t.timerStartedAt) / 1000);
      }
      return {
        ...t,
        completed,
        timerRunning: completed ? false : t.timerRunning,
        timerStartedAt: completed ? null : t.timerStartedAt,
        elapsedSeconds: t.elapsedSeconds + extra,
      };
    });
    persist({ ...allTasks, [key]: tasks });
  }

  function carryOverTask(task) {
    const key = todayKey();
    const newTask = {
      id: crypto.randomUUID(),
      text: task.text,
      completed: false,
      date: key,
      elapsedSeconds: 0,
      timerRunning: false,
      timerStartedAt: null,
      hourlyRate: task.hourlyRate ?? null,
      subtasks: [],
      clientId: task.clientId ?? null,
      projectId: task.projectId ?? null,
    };
    persist({ ...allTasks, [key]: [...(allTasks[key] || []), newTask] });
  }

  function setTaskClient(id, clientId, projectId) {
    mapToday(t => t.id !== id ? t : {
      ...t,
      clientId: clientId || null,
      projectId: projectId || null,
    });
  }

  // ── Subtasks ─────────────────────────────────────────────────────────────────
  function addSubtask(taskId, text) {
    if (!text.trim()) return;
    mapToday(t => {
      if (t.id !== taskId) return t;
      const sub = { id: crypto.randomUUID(), text: text.trim(), completed: false };
      return { ...t, subtasks: [...(t.subtasks || []), sub] };
    });
  }

  function toggleSubtask(taskId, subId) {
    mapToday(t => {
      if (t.id !== taskId) return t;
      return {
        ...t,
        subtasks: (t.subtasks || []).map(s => s.id === subId ? { ...s, completed: !s.completed } : s),
      };
    });
  }

  function deleteSubtask(taskId, subId) {
    mapToday(t => {
      if (t.id !== taskId) return t;
      return { ...t, subtasks: (t.subtasks || []).filter(s => s.id !== subId) };
    });
  }

  // ── Live tick (updates _liveElapsed for running timers) ──────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setAllTasks(prev => {
        const key = todayKey();
        const tasks = prev[key] || [];
        if (!tasks.some(t => t.timerRunning)) return prev;
        const now = Date.now();
        const updated = tasks.map(t => {
          if (!t.timerRunning || !t.timerStartedAt) return t;
          return { ...t, _liveElapsed: t.elapsedSeconds + Math.floor((now - t.timerStartedAt) / 1000) };
        });
        return { ...prev, [key]: updated };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Compute live display seconds for every today-task
  const liveTasks = (allTasks[todayKey()] || []).map(t => ({
    ...t,
    displaySeconds: t.timerRunning && t.timerStartedAt
      ? t.elapsedSeconds + Math.floor((Date.now() - t.timerStartedAt) / 1000)
      : t.elapsedSeconds,
  }));

  return {
    tasks: liveTasks,
    allTasks,
    addTask,
    updateTask,
    editTask,
    setTaskRate,
    setTaskTime,
    setTaskClient,
    carryOverTask,
    deleteTask,
    toggleTimer,
    completeTask,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
  };
}
