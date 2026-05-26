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
  // Strip ephemeral _liveElapsed before persisting
  const clean = {};
  for (const [key, tasks] of Object.entries(data)) {
    clean[key] = tasks.map(({ _liveElapsed, ...t }) => t); // eslint-disable-line no-unused-vars
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
}

export function useTasks() {
  const [allTasks, setAllTasks] = useState(load);

  // Ref so the 1-second tick can check running state without a stale closure
  const allTasksRef = useRef(allTasks);
  useEffect(() => { allTasksRef.current = allTasks; }, [allTasks]);

  const persist = useCallback((updated) => {
    setAllTasks(updated);
    save(updated);
  }, []);

  // ── Midnight detection ──────────────────────────────────────────────────────
  useEffect(() => {
    let lastKey = todayKey();
    const ticker = setInterval(() => {
      const current = todayKey();
      if (current === lastKey) return;
      const oldKey = lastKey;
      lastKey = current;

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

  // ── Live tick — forces re-render every second while a timer is running ──────
  // Uses a separate counter state; does NOT write _liveElapsed into allTasks.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      const key = todayKey();
      if ((allTasksRef.current[key] || []).some(t => t.timerRunning)) {
        setTick(n => n + 1);
      }
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function mapToday(fn) {
    const key = todayKey();
    const tasks = (allTasks[key] || []).map(fn);
    persist({ ...allTasks, [key]: tasks });
  }

  function updateTask(id, changes) {
    mapToday(t => t.id === id ? { ...t, ...changes } : t);
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
      hourlyRate: null,
      subtasks: [],
      clientId: clientId || null,
      projectId: projectId || null,
    };
    persist({ ...allTasks, [key]: [...(allTasks[key] || []), task] });
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

  // ── Reorder (drag-and-drop) ──────────────────────────────────────────────────
  function reorderTasks(draggedId, targetId) {
    const key = todayKey();
    const list = [...(allTasks[key] || [])];
    const fromIdx = list.findIndex(t => t.id === draggedId);
    const toIdx   = list.findIndex(t => t.id === targetId);
    if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return;
    const [removed] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, removed);
    persist({ ...allTasks, [key]: list });
  }

  // ── Prune old tasks ──────────────────────────────────────────────────────────
  function pruneOldTasks(days) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffKey = cutoff.toISOString().slice(0, 10);
    const pruned = {};
    for (const [key, tasks] of Object.entries(allTasks)) {
      if (key >= cutoffKey) pruned[key] = tasks;
    }
    persist(pruned);
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

  // ── Compute live displaySeconds ───────────────────────────────────────────────
  const now = Date.now();
  const liveTasks = (allTasks[todayKey()] || []).map(t => ({
    ...t,
    displaySeconds: t.timerRunning && t.timerStartedAt
      ? t.elapsedSeconds + Math.floor((now - t.timerStartedAt) / 1000)
      : t.elapsedSeconds,
  }));

  return {
    tasks: liveTasks,
    allTasks,
    addTask,
    editTask,
    setTaskRate,
    setTaskTime,
    setTaskClient,
    carryOverTask,
    deleteTask,
    toggleTimer,
    completeTask,
    reorderTasks,
    pruneOldTasks,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
  };
}
