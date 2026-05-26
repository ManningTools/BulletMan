import { useState, useRef, useEffect, useCallback } from 'react';
import { useTasks } from './hooks/useTasks';
import { useTheme } from './hooks/useTheme';

// Fixed palette used when a task has no client colour
const MINI_COLORS = ['#7c3aed','#db2777','#d97706','#059669','#2563eb','#dc2626','#0891b2','#65a30d'];
import { useSettings } from './hooks/useSettings';
import { useClients } from './hooks/useClients';
import { yesterdayKey, todayKey } from './utils/time';

function formatTodayTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
import { exportDay, exportWeek, exportMonth } from './utils/export';
import TaskItem from './components/TaskItem';
import DayVisualizer from './components/DayVisualizer';
import WeekView from './components/WeekView';
import ClientsPage from './components/ClientsPage';
import ThemePanel from './components/ThemePanel';
import SettingsPanel from './components/SettingsPanel';
import './App.css';

export default function App() {
  const [tab, setTab]             = useState('today');
  const [input, setInput]         = useState('');
  const [addClientId,  setAddClientId]  = useState('');
  const [addProjectId, setAddProjectId] = useState('');
  const [showTheme, setShowTheme] = useState(false);
  const [weekOffset,   setWeekOffset]   = useState(0);
  const [pinnedIds,  setPinnedIds]  = useState([]);
  const [dragOverId, setDragOverId] = useState(null);
  const draggedId = useRef(null);
  const inputRef  = useRef(null);

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

  // ── Mini timer: colour for each task (stable across renders) ─────────────────
  const getTaskColor = useCallback((task, index) => {
    if (task.clientId) {
      const client = clients.find(c => c.id === task.clientId);
      if (client?.color) return client.color;
    }
    return MINI_COLORS[index % MINI_COLORS.length];
  }, [clients]);

  // ── Mini timer: push live state to every pinned window when tasks change ─────
  useEffect(() => {
    if (!window.electronAPI?.updateMiniTimer) return;
    pinnedIds.forEach(taskId => {
      const idx  = tasks.findIndex(t => t.id === taskId);
      if (idx < 0) return; // deleted tasks handled by the cleanup effect below
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

  // ── Mini timer: auto-close windows when tasks are deleted ─────────────────
  useEffect(() => {
    if (!window.electronAPI?.closeMiniTimer) return;
    pinnedIds.forEach(taskId => {
      if (!tasks.find(t => t.id === taskId)) {
        window.electronAPI.closeMiniTimer({ taskId });
        setPinnedIds(prev => prev.filter(id => id !== taskId));
      }
    });
  }, [tasks, pinnedIds]);

  // ── Mini timer: wire up IPC listeners (toggle + close notifications) ──────
  useEffect(() => {
    if (!window.electronAPI) return;

    const removeToggle   = window.electronAPI.onTimerToggle(id => toggleTimer(id));
    const removeClosed   = window.electronAPI.onMiniClosed(taskId =>
      setPinnedIds(prev => prev.filter(id => id !== taskId))
    );
    const removeComplete = window.electronAPI.onTaskComplete(id => completeTask(id, true));

    return () => { removeToggle?.(); removeClosed?.(); removeComplete?.(); };
  }, [toggleTimer, completeTask]);

  // ── Export handlers ──────────────────────────────────────────────────────────
  function handleExportDay()   { exportDay(tasks, globalHourlyRate, todayKey(), clients); }
  function handleExportWeek()  { exportWeek(allTasks, globalHourlyRate, weekOffset, clients); }
  function handleExportMonth() { exportMonth(allTasks, globalHourlyRate, weekOffset, clients); }

  // ── UI helpers ───────────────────────────────────────────────────────────────
  function handleAdd(e) {
    e.preventDefault();
    addTask(input, addClientId || null, addProjectId || null);
    setInput('');
    inputRef.current?.focus();
  }
  function toggleTheme() { setShowTheme(v => !v); }

  // Called by TaskItem pin button
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

  // When client selection changes, reset project
  function handleAddClientChange(cId) {
    setAddClientId(cId);
    setAddProjectId('');
  }

  const incomplete     = tasks.filter(t => !t.completed);
  const completed      = tasks.filter(t => t.completed);
  const todayTexts     = new Set(tasks.map(t => t.text));
  const yesterdayTasks = (allTasks[yesterdayKey()] || []).filter(t => !todayTexts.has(t.text));
  const totalSeconds   = tasks.reduce((sum, t) => sum + t.displaySeconds, 0);

  const selectedClient = clients.find(c => c.id === addClientId) || null;

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <div className="header-left">
            <h1>BulletMan</h1>
            {totalSeconds >= 60 && (
              <span className="header-total-time">{formatTodayTime(totalSeconds)}</span>
            )}
          </div>
          <div className="header-right">
            <nav className="tab-nav">
              <button className={`tab-btn ${tab === 'today' ? 'active' : ''}`} onClick={() => setTab('today')}>
                Today
              </button>
              <button className={`tab-btn ${tab === 'week' ? 'active' : ''}`} onClick={() => setTab('week')}>
                Week
              </button>
              <button className={`tab-btn ${tab === 'clients' ? 'active' : ''}`} onClick={() => setTab('clients')}>
                Clients
              </button>
              <button className={`tab-btn ${tab === 'settings' ? 'active' : ''}`} onClick={() => setTab('settings')}>
                Settings
              </button>
            </nav>

            {/* Theme */}
            <button
              className={`theme-toggle ${showTheme ? 'active' : ''}`}
              onClick={toggleTheme}
              title="Color theme"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/>
                <circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/>
                <circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/>
                <circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/>
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
              </svg>
            </button>
          </div>
        </div>

        {showTheme && (
          <div className="theme-panel-anchor">
            <ThemePanel
              themeId={themeId}
              isDark={isDark}
              customBg={customBg}
              customAccent={customAccent}
              onSetPreset={setPreset}
              onToggleDark={toggleDark}
              onActivateCustom={activateCustom}
              onClose={() => setShowTheme(false)}
            />
          </div>
        )}
      </header>

      <main className="app-main">
        {tab === 'today' && (
          <div className="today-view">
            {/* ── Add task form ── */}
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

              {/* Client / project selectors (only when clients exist) */}
              {clients.length > 0 && (
                <div className="add-client-selectors">
                  <select
                    className="add-client-select"
                    value={addClientId}
                    onChange={e => handleAddClientChange(e.target.value)}
                  >
                    <option value="">No client</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>

                  {selectedClient && selectedClient.projects.length > 0 && (
                    <select
                      className="add-client-select"
                      value={addProjectId}
                      onChange={e => setAddProjectId(e.target.value)}
                    >
                      <option value="">No project</option>
                      {selectedClient.projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
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

            <DayVisualizer
              tasks={tasks}
              globalHourlyRate={globalHourlyRate}
              onExportDay={handleExportDay}
            />
          </div>
        )}

        {tab === 'week' && (
          <WeekView
            allTasks={allTasks}
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
            allTasks={allTasks}
            globalHourlyRate={globalHourlyRate}
            onAddClient={addClient}
            onEditClient={editClient}
            onDeleteClient={deleteClient}
            onAddProject={addProject}
            onEditProject={editProject}
            onDeleteProject={deleteProject}
          />
        )}

        {tab === 'settings' && (
          <SettingsPanel
            globalHourlyRate={globalHourlyRate}
            onSetRate={setGlobalHourlyRate}
            onPruneOldTasks={pruneOldTasks}
          />
        )}
      </main>
    </div>
  );
}
