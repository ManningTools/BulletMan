import { useState, useCallback } from 'react';

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
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function save(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export { CLIENT_COLORS };

export function useClients() {
  const [clients, setClients] = useState(load);

  const persist = useCallback((updated) => {
    setClients(updated);
    save(updated);
  }, []);

  // ── Client CRUD ──────────────────────────────────────────────────────────────
  function addClient(name, color) {
    if (!name.trim()) return;
    const client = {
      id: crypto.randomUUID(),
      name: name.trim(),
      color: color || CLIENT_COLORS[clients.length % CLIENT_COLORS.length],
      projects: [],
    };
    persist([...clients, client]);
  }

  function editClient(id, name, color) {
    persist(clients.map(c =>
      c.id === id ? { ...c, name: name?.trim() ?? c.name, color: color ?? c.color } : c
    ));
  }

  function deleteClient(id) {
    persist(clients.filter(c => c.id !== id));
  }

  // ── Project CRUD ─────────────────────────────────────────────────────────────
  function addProject(clientId, name) {
    if (!name.trim()) return;
    persist(clients.map(c => {
      if (c.id !== clientId) return c;
      const project = { id: crypto.randomUUID(), name: name.trim() };
      return { ...c, projects: [...c.projects, project] };
    }));
  }

  function editProject(clientId, projectId, name) {
    if (!name.trim()) return;
    persist(clients.map(c => {
      if (c.id !== clientId) return c;
      return {
        ...c,
        projects: c.projects.map(p => p.id === projectId ? { ...p, name: name.trim() } : p),
      };
    }));
  }

  function deleteProject(clientId, projectId) {
    persist(clients.map(c => {
      if (c.id !== clientId) return c;
      return { ...c, projects: c.projects.filter(p => p.id !== projectId) };
    }));
  }

  // ── Lookup helpers ───────────────────────────────────────────────────────────
  function getClient(clientId) {
    return clients.find(c => c.id === clientId) || null;
  }

  function getProject(clientId, projectId) {
    const client = getClient(clientId);
    return client ? (client.projects.find(p => p.id === projectId) || null) : null;
  }

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
