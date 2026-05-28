import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { todayKey } from '../utils/time';
import { storageSet } from '../utils/storage';

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
  storageSet(STORAGE_KEY, JSON.stringify(clean));
}

export function useTasks() {
  const [allTasks, setAllTasks] = useState(load);

  // Keep ref in sync so the async 1-second interval always reads latest state
  const allTasksRef = useRef(allTasks);
  useEffect(() => { allTasksRef.current = allTasks; }, [allTasks]);

  // Functional updater: accepts (prev => next) or a plain next value.
  // Using functional setState means no mutation ever closes over stale allTasks.
  const persist = useCallback((updater) => {
    setAllTasks(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      save(next);
      return next;
    });
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

  // ── Live tick — drives re-render every second while a timer is running ──────
  const [tick, setTick] = useState(0);
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
  const mapToday = useCallback((fn) => {
    const key = todayKey();
    persist(prev => ({ ...prev, [key]: (prev[key] || []).map(fn) }));
  }, [persist]);

  const updateTask = useCallback((id, changes) => {
    mapToday(t => t.id === id ? { ...t, ...changes } : t);
  }, [mapToday]);

  // ── Task CRUD ────────────────────────────────────────────────────────────────
  const addTask = useCallback((text, clientId = null, projectId = null) => {
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
    persist(prev => ({ ...prev, [key]: [...(prev[key] || []), task] }));
  }, [persist]);

  const editTask = useCallback((id, text) => {
    if (!text.trim()) return;
    updateTask(id, { text: text.trim() });
  }, [updateTask]);

  const deleteTask = useCallback((id) => {
    const key = todayKey();
    persist(prev => ({ ...prev, [key]: (prev[key] || []).filter(t => t.id !== id) }));
  }, [persist]);

  const setTaskRate = useCallback((id, raw) => {
    const n = parseFloat(raw);
    const value = (raw === '' || isNaN(n)) ? null : Math.max(0, +n.toFixed(2));
    updateTask(id, { hourlyRate: value });
  }, [updateTask]);

  const setTaskTime = useCallback((id, seconds) => {
    mapToday(t => t.id !== id ? t : {
      ...t,
      elapsedSeconds: Math.max(0, Math.round(seconds)),
      timerRunning: false,
      timerStartedAt: null,
    });
  }, [mapToday]);

  const toggleTimer = useCallback((id) => {
    const key = todayKey();
    const now = Date.now();
    persist(prev => {
      const tasks = (prev[key] || []).map(t => {
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
      return { ...prev, [key]: tasks };
    });
  }, [persist]);

  const completeTask = useCallback((id, completed) => {
    const key = todayKey();
    const now = Date.now();
    persist(prev => {
      const tasks = (prev[key] || []).map(t => {
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
      return { ...prev, [key]: tasks };
    });
  }, [persist]);

  const carryOverTask = useCallback((task) => {
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
    persist(prev => ({ ...prev, [key]: [...(prev[key] || []), newTask] }));
  }, [persist]);

  const setTaskClient = useCallback((id, clientId, projectId) => {
    mapToday(t => t.id !== id ? t : {
      ...t,
      clientId: clientId || null,
      projectId: projectId || null,
    });
  }, [mapToday]);

  // ── Reorder (drag-and-drop) ──────────────────────────────────────────────────
  const reorderTasks = useCallback((draggedId, targetId) => {
    const key = todayKey();
    persist(prev => {
      const list = [...(prev[key] || [])];
      const fromIdx = list.findIndex(t => t.id === draggedId);
      const toIdx   = list.findIndex(t => t.id === targetId);
      if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return prev;
      const [removed] = list.splice(fromIdx, 1);
      list.splice(toIdx, 0, removed);
      return { ...prev, [key]: list };
    });
  }, [persist]);

  // ── Prune old tasks ──────────────────────────────────────────────────────────
  const pruneOldTasks = useCallback((days) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const y = cutoff.getFullYear(), mo = cutoff.getMonth() + 1, d = cutoff.getDate();
    const cutoffKey = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    persist(prev => {
      const pruned = {};
      for (const [key, tasks] of Object.entries(prev)) {
        if (key >= cutoffKey) pruned[key] = tasks;
      }
      return pruned;
    });
  }, [persist]);

  // ── Subtasks ─────────────────────────────────────────────────────────────────
  const addSubtask = useCallback((taskId, text) => {
    if (!text.trim()) return;
    mapToday(t => {
      if (t.id !== taskId) return t;
      const sub = { id: crypto.randomUUID(), text: text.trim(), completed: false };
      return { ...t, subtasks: [...(t.subtasks || []), sub] };
    });
  }, [mapToday]);

  const toggleSubtask = useCallback((taskId, subId) => {
    mapToday(t => {
      if (t.id !== taskId) return t;
      return {
        ...t,
        subtasks: (t.subtasks || []).map(s => s.id === subId ? { ...s, completed: !s.completed } : s),
      };
    });
  }, [mapToday]);

  const deleteSubtask = useCallback((taskId, subId) => {
    mapToday(t => {
      if (t.id !== taskId) return t;
      return { ...t, subtasks: (t.subtasks || []).filter(s => s.id !== subId) };
    });
  }, [mapToday]);

  // ── Compute live displaySeconds ───────────────────────────────────────────────
  // tick is listed as a dependency so this recomputes each second while a timer runs.
  // Date.now() is inside the memo callback to satisfy the purity lint rule.
  const liveTasks = useMemo(() => {
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now();
    return (allTasks[todayKey()] || []).map(t => ({
      ...t,
      displaySeconds: t.timerRunning && t.timerStartedAt
        ? t.elapsedSeconds + Math.floor((now - t.timerStartedAt) / 1000)
        : t.elapsedSeconds,
    }));
  }, [allTasks, tick]); // eslint-disable-line react-hooks/exhaustive-deps

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
