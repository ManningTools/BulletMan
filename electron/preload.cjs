const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Open a mini timer for a specific task
  openMiniTimer: ({ taskId }) =>
    ipcRenderer.send('mini-timer:open', { taskId }),

  // Close a mini timer (user unpinned from task card)
  closeMiniTimer: ({ taskId }) =>
    ipcRenderer.send('mini-timer:close-by-main', { taskId }),

  // Push live task state to a specific mini window
  updateMiniTimer: (taskId, state) =>
    ipcRenderer.send('state:update', { taskId, ...state }),

  // Mini window ✕ was clicked — tells us which task to unpin
  onMiniClosed: (cb) => {
    const handler = (_, taskId) => cb(taskId);
    ipcRenderer.on('mini-timer:closed', handler);
    return () => ipcRenderer.removeListener('mini-timer:closed', handler);
  },

  // Mini window ▶/⏸ was clicked — relay the toggle to our toggleTimer()
  onTimerToggle: (cb) => {
    const handler = (_, id) => cb(id);
    ipcRenderer.on('timer:toggle', handler);
    return () => ipcRenderer.removeListener('timer:toggle', handler);
  },

  // Mini window ✓ was clicked — relay to completeTask()
  onTaskComplete: (cb) => {
    const handler = (_, id) => cb(id);
    ipcRenderer.on('task:complete', handler);
    return () => ipcRenderer.removeListener('task:complete', handler);
  },
});

window.addEventListener('DOMContentLoaded', () => {});
