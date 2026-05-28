import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useTasks }    from './hooks/useTasks';
import { useTheme }    from './hooks/useTheme';
import { useSettings } from './hooks/useSettings';
import { useClients }  from './hooks/useClients';
import { yesterdayKey, todayKey } from './utils/time';
import { exportDay, exportWeek, exportMonth } from './utils/export';
import { useStorageError } from './utils/storage';
import TaskItem        from './components/TaskItem';
import DayVisualizer   from './components/DayVisualizer';
import WeekView        from './components/WeekView';
import ClientsPage     from './components/ClientsPage';
import ThemePanel      from './components/ThemePanel';
import SettingsPanel   from './components/SettingsPanel';
import DataPanel       from './components/DataPanel';
import './App.css';

// Fixed palette used when a task has no client colour
const MINI_COLORS = ['#7c3aed','#db2777','#d97706','#059669','#2563eb','#dc2626','#0891b2','#65a30d'];

function formatTodayTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function App() {
  const [tab,          setTab]          = useState('today');
  const [input,        setInput]        = useState('');
  const [addClientId,  setAddClientId]  = useState('');
  const [addProjectId, setAddProjectId] = useState('');
  const [showTheme,    setShowTheme]    = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showData,     setShowData]     = useState(false);
  const [weekOffset,   setWeekOffset]   = useState(0);
  const [pinnedIds,    setPinnedIds]    = useState([]);
  const [dragOverId,   setDragOverId]   = useState(null);
  const draggedId  = useRef(null);
  const inputRef   = useRef(null);
  const headerRef  = useRef(null);

  const {
    tasks, allTasks,
    addTask, editTask, carryOverTask, deleteTask,
    toggleTimer, completeTask,
    setTaskRate, setTaskTime, setTaskClient,
    reorderTasks, pruneOldTasks,
    addSubtask, toggleSubtask, deleteSubtask,
  } = useTasks();

  const { themeId, isDark, customBg, customAccent, setPreset, toggleDark, activateCustom } = useTheme();
  const { globalHourlyRate, setGlobalHourlyRate } = useSettings();
  const {
    clients, CLIENT_COLORS,
    addClient, editClient, deleteClient,
    addProject, editProject, deleteProject,
  } = useClients();
  const [storageError, clearStorageError] = useStorageError();

  // ── Mini timer: colour for each task ─────────────────────────────────────────
  const getTaskColor = useCallback((task, index) => {
    if (task.clientId) {
      const client = clients.find(c => c.id === task.clientId);
      if (client?.color) return client.color;
    }
    return MINI_COLORS[index % MINI_COLORS.length];
  }, [clients]);

  // ── Mini timer: push live state to pinned windows ─────────────────────────────
  useEffect(() => {
    if (!window.electronAPI?.updateMiniTimer) return;
    pinnedIds.forEach(taskId => {
      const idx  = tasks.findIndex(t => t.id === taskId);
      if (idx < 0) return;
      const task = tasks[idx];
      window.electronAPI.updateMiniTimer(taskId, {
        id:             task.id,
        text:           task.text,
        completed:      task.completed,
        timerRunning:   task.timerRunning,
        timerStartedAt: task.timerStartedAt,
        elapsedSeconds: task.elapsedSeconds,
        color:          getTaskColor(task, idx),
      });
    });
  }, [tasks, pinnedIds, getTaskColor]);

  // ── Mini timer: auto-close deleted tasks ──────────────────────────────────────
  useEffect(() => {
    if (!window.electronAPI?.closeMiniTimer) return;
    pinnedIds.forEach(taskId => {
      if (!tasks.find(t => t.id === taskId)) {
        window.electronAPI.closeMiniTimer({ taskId });
        setPinnedIds(prev => prev.filter(id => id !== taskId));
      }
    });
  }, [tasks, pinnedIds]);

  // ── Mini timer: IPC listeners ─────────────────────────────────────────────────
  useEffect(() => {
    if (!window.electronAPI) return;
    const removeToggle   = window.electronAPI.onTimerToggle(id => toggleTimer(id));
    const removeClosed   = window.electronAPI.onMiniClosed(taskId =>
      setPinnedIds(prev => prev.filter(id => id !== taskId))
    );
    const removeComplete = window.electronAPI.onTaskComplete(id => completeTask(id, true));
    return () => { removeToggle?.(); removeClosed?.(); removeComplete?.(); };
  }, [toggleTimer, completeTask]);

  // ── Close all panels when clicking outside the header ─────────────────────────
  useEffect(() => {
    function handler(e) {
      if (headerRef.current && !headerRef.current.contains(e.target)) {
        setShowSettings(false);
        setShowData(false);
        setShowTheme(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Live allTasks — today's entries carry live displaySeconds from running timer ─
  const liveAllTasks = useMemo(() => ({ ...allTasks, [todayKey()]: tasks }), [allTasks, tasks]);

  // ── Export handlers ───────────────────────────────────────────────────────────
  const handleExportDay   = useCallback(() => exportDay(tasks, globalHourlyRate, todayKey(), clients), [tasks, globalHourlyRate, clients]);
  const handleExportWeek  = useCallback(() => exportWeek(liveAllTasks, globalHourlyRate, weekOffset, clients), [liveAllTasks, globalHourlyRate, weekOffset, clients]);
  const handleExportMonth = useCallback(() => exportMonth(liveAllTasks, globalHourlyRate, weekOffset, clients), [liveAllTasks, globalHourlyRate, weekOffset, clients]);

  // ── UI helpers ────────────────────────────────────────────────────────────────
  function handleAdd(e) {
    e.preventDefault();
    addTask(input, addClientId || null, addProjectId || null);
    setInput('');
    inputRef.current?.focus();
  }

  function handleAddClientChange(cId) {
    setAddClientId(cId);
    setAddProjectId('');
  }

  function handlePin(task) {
    if (!window.electronAPI) return;
    if (pinnedIds.includes(task.id)) {
      window.electronAPI.closeMiniTimer({ taskId: task.id });
      setPinnedIds(prev => prev.filter(id => id !== task.id));
    } else {
      window.electronAPI.openMiniTimer({ taskId: task.id });
      setPinnedIds(prev => [...prev, task.id]);
    }
  }

  // Each panel closes the others when opened
  function toggleTheme()    { setShowTheme(v => !v);    setShowSettings(false); setShowData(false); }
  function toggleSettings() { setShowSettings(v => !v); setShowTheme(false);    setShowData(false); }
  function toggleData()     { setShowData(v => !v);     setShowTheme(false);    setShowSettings(false); }

  // ── Derived values ────────────────────────────────────────────────────────────
  const incomplete = useMemo(() => tasks.filter(t => !t.completed), [tasks]);
  const completed  = useMemo(() => tasks.filter(t =>  t.completed), [tasks]);
  const totalSeconds = useMemo(() => tasks.reduce((sum, t) => sum + t.displaySeconds, 0), [tasks]);

  // These depend on allTasks (stable between ticks) rather than the live tasks array
  const rawTodayTasks  = useMemo(() => allTasks[todayKey()] || [], [allTasks]);
  const todayTexts     = useMemo(() => new Set(rawTodayTasks.map(t => t.text)), [rawTodayTasks]);
  const yesterdayTasks = useMemo(
    () => (allTasks[yesterdayKey()] || []).filter(t => !todayTexts.has(t.text)),
    [allTasks, todayTexts]
  );
  const selectedClient = useMemo(
    () => clients.find(c => c.id === addClientId) || null,
    [clients, addClientId]
  );

  return (
    <div className="app">
      <header className="app-header" ref={headerRef}>
        <div className="header-inner">

          <div className="header-left">
            <h1>BulletMan</h1>
            {totalSeconds >= 60 && (
              <span className="header-total-time">{formatTodayTime(totalSeconds)}</span>
            )}
          </div>

          <div className="header-right">
            <nav className="tab-nav">
              <button className={`tab-btn ${tab === 'today'   ? 'active' : ''}`} onClick={() => setTab('today')}>Today</button>
              <button className={`tab-btn ${tab === 'week'    ? 'active' : ''}`} onClick={() => setTab('week')}>Week</button>
              <button className={`tab-btn ${tab === 'clients' ? 'active' : ''}`} onClick={() => setTab('clients')}>Clients</button>
            </nav>

            {/* Hourly rate */}
            <button
              className={`theme-toggle ${showSettings ? 'active' : ''}`}
              onClick={toggleSettings}
              title="Hourly rate"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23"/>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
            </button>

            {/* Data & settings */}
            <button
              className={`theme-toggle ${showData ? 'active' : ''}`}
              onClick={toggleData}
              title="Data &amp; settings"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </button>

            {/* Colour theme */}
            <button
              className={`theme-toggle ${showTheme ? 'active' : ''}`}
              onClick={toggleTheme}
              title="Color theme"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/>
                <circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/>
                <circle cx="8.5"  cy="7.5"  r=".5" fill="currentColor"/>
                <circle cx="6.5"  cy="12.5" r=".5" fill="currentColor"/>
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Popovers */}
        {(showSettings || showData || showTheme) && (
          <div className="theme-panel-anchor">
            {showSettings && (
              <SettingsPanel
                globalHourlyRate={globalHourlyRate}
                onSetRate={setGlobalHourlyRate}
                onClose={() => setShowSettings(false)}
              />
            )}
            {showData && (
              <DataPanel
                onPruneOldTasks={pruneOldTasks}
                onClose={() => setShowData(false)}
              />
            )}
            {showTheme && (
              <ThemePanel
                themeId={themeId}
                isDark={isDark}
                customBg={customBg}
                customAccent={customAccent}
                onSetPreset={setPreset}
                onToggleDark={toggleDark}
                onActivateCustom={activateCustom}
              />
            )}
          </div>
        )}
      </header>

      {storageError && (
        <div className="storage-error-banner" role="alert">
          <span>⚠ {storageError}</span>
          <button className="storage-error-dismiss" onClick={clearStorageError} title="Dismiss">✕</button>
        </div>
      )}

      <main className="app-main">
        {tab === 'today' && (
          <div className="today-view">
            <form className="add-form" onSubmit={handleAdd}>
              <span className="bullet">•</span>
              <input
                ref={inputRef}
                className="add-input"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Add a task…"
                autoFocus
              />
              {clients.length > 0 && (
                <div className="add-client-selectors">
                  <select className="add-client-select" value={addClientId} onChange={e => handleAddClientChange(e.target.value)}>
                    <option value="">No client</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  {selectedClient && selectedClient.projects.length > 0 && (
                    <select className="add-client-select" value={addProjectId} onChange={e => setAddProjectId(e.target.value)}>
                      <option value="">No project</option>
                      {selectedClient.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  )}
                </div>
              )}
              <button className="add-btn" type="submit" disabled={!input.trim()}>Add</button>
            </form>

            <div className="task-list">
              {incomplete.length === 0 && completed.length === 0 && (
                <p className="empty-hint">No tasks yet. Add one above to get started.</p>
              )}

              {incomplete.map((task, i) => (
                <TaskItem
                  key={task.id} task={task} globalHourlyRate={globalHourlyRate}
                  clients={clients}
                  onToggleTimer={toggleTimer} onComplete={completeTask}
                  onDelete={deleteTask} onEdit={editTask}
                  onSetRate={setTaskRate} onSetTime={setTaskTime} onSetClient={setTaskClient}
                  onAddSubtask={addSubtask} onToggleSubtask={toggleSubtask} onDeleteSubtask={deleteSubtask}
                  isElectron={!!window.electronAPI}
                  isPinned={pinnedIds.includes(task.id)}
                  taskColor={getTaskColor(task, i)}
                  onPin={() => handlePin(task)}
                  isDraggable
                  isDragOver={dragOverId === task.id}
                  onDragStart={() => { draggedId.current = task.id; }}
                  onDragOver={() => setDragOverId(task.id)}
                  onDrop={() => {
                    if (draggedId.current && draggedId.current !== task.id)
                      reorderTasks(draggedId.current, task.id);
                    draggedId.current = null;
                    setDragOverId(null);
                  }}
                  onDragEnd={() => { draggedId.current = null; setDragOverId(null); }}
                />
              ))}

              {completed.length > 0 && (
                <>
                  <div className="section-divider">Completed</div>
                  {completed.map((task, i) => (
                    <TaskItem
                      key={task.id} task={task} globalHourlyRate={globalHourlyRate}
                      clients={clients}
                      onToggleTimer={toggleTimer} onComplete={completeTask}
                      onDelete={deleteTask} onEdit={editTask}
                      onSetRate={setTaskRate} onSetTime={setTaskTime} onSetClient={setTaskClient}
                      onAddSubtask={addSubtask} onToggleSubtask={toggleSubtask} onDeleteSubtask={deleteSubtask}
                      isElectron={!!window.electronAPI}
                      isPinned={pinnedIds.includes(task.id)}
                      taskColor={getTaskColor(task, incomplete.length + i)}
                      onPin={() => handlePin(task, incomplete.length + i)}
                    />
                  ))}
                </>
              )}

              {yesterdayTasks.length > 0 && (
                <>
                  <div className="section-divider">From Yesterday</div>
                  {yesterdayTasks.map(task => (
                    <div key={task.id} className="yesterday-item">
                      <span className={`yesterday-text${task.completed ? ' done' : ''}`}>{task.text}</span>
                      <button className="carry-btn" onClick={() => carryOverTask(task)} title="Add to today">+ Add</button>
                    </div>
                  ))}
                </>
              )}
            </div>

            <DayVisualizer tasks={tasks} globalHourlyRate={globalHourlyRate} onExportDay={handleExportDay} />
          </div>
        )}

        {tab === 'week' && (
          <WeekView
            allTasks={liveAllTasks}
            globalHourlyRate={globalHourlyRate}
            offset={weekOffset}
            onOffsetChange={setWeekOffset}
            onExportWeek={handleExportWeek}
            onExportMonth={handleExportMonth}
          />
        )}

        {tab === 'clients' && (
          <ClientsPage
            clients={clients}
            CLIENT_COLORS={CLIENT_COLORS}
            allTasks={liveAllTasks}
            globalHourlyRate={globalHourlyRate}
            onAddClient={addClient}
            onEditClient={editClient}
            onDeleteClient={deleteClient}
            onAddProject={addProject}
            onEditProject={editProject}
            onDeleteProject={deleteProject}
          />
        )}
      </main>
    </div>
  );
}
