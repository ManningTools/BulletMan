const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('miniAPI', {
  // Toggle the timer for a task (relayed to main window)
  toggleTimer: (id) => ipcRenderer.send('timer:toggle', id),

  // Mark a task complete (relayed to main window)
  completeTask: (id) => ipcRenderer.send('task:complete', id),

  // ✕ close this mini window; must include taskId so main process routes correctly
  close: (taskId) => ipcRenderer.send('mini-timer:close', { taskId }),

  // Receive state pushes from the main window
  onStateUpdate: (cb) => {
    const handler = (_, state) => cb(state);
    ipcRenderer.on('state:update', handler);
    return () => ipcRenderer.removeListener('state:update', handler);
  },
});
