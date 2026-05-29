import { useState, useCallback } from 'react';
import { storageSet } from '../utils/storage';
import { adapterRead } from '../utils/storageAdapter';

const STORAGE_KEY = 'bulletman_clients';

const CLIENT_COLORS = [
  '#5B6CF6', // indigo
  '#0D9488', // teal
  '#D97706', // amber
  '#DC2626', // red
  '#7C3AED', // violet
  '#0284C7', // sky
  '#EA580C', // orange
  '#16A34A', // green
];

function load() {
  try {
    return JSON.parse(adapterRead(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function save(data) {
  storageSet(STORAGE_KEY, JSON.stringify(data));
}

export { CLIENT_COLORS };

export function useClients() {
  const [clients, setClients] = useState(load);

  const persist = useCallback((updater) => {
    setClients(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      save(next);
      return next;
    });
  }, []);

  // ── Client CRUD ──────────────────────────────────────────────────────────────
  const addClient = useCallback((name, color) => {
    if (!name.trim()) return;
    persist(prev => {
      const client = {
        id: crypto.randomUUID(),
        name: name.trim(),
        color: color || CLIENT_COLORS[prev.length % CLIENT_COLORS.length],
        projects: [],
      };
      return [...prev, client];
    });
  }, [persist]);

  const editClient = useCallback((id, name, color) => {
    persist(prev => prev.map(c =>
      c.id === id ? { ...c, name: name?.trim() ?? c.name, color: color ?? c.color } : c
    ));
  }, [persist]);

  const deleteClient = useCallback((id) => {
    persist(prev => prev.filter(c => c.id !== id));
  }, [persist]);

  // ── Project CRUD ─────────────────────────────────────────────────────────────
  const addProject = useCallback((clientId, name) => {
    if (!name.trim()) return;
    persist(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      const project = { id: crypto.randomUUID(), name: name.trim() };
      return { ...c, projects: [...c.projects, project] };
    }));
  }, [persist]);

  const editProject = useCallback((clientId, projectId, name) => {
    if (!name.trim()) return;
    persist(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      return {
        ...c,
        projects: c.projects.map(p => p.id === projectId ? { ...p, name: name.trim() } : p),
      };
    }));
  }, [persist]);

  const deleteProject = useCallback((clientId, projectId) => {
    persist(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      return { ...c, projects: c.projects.filter(p => p.id !== projectId) };
    }));
  }, [persist]);

  return {
    clients,
    CLIENT_COLORS,
    addClient,
    editClient,
    deleteClient,
    addProject,
    editProject,
    deleteProject,
  };
}
