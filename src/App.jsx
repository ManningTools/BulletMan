import { useState, useRef } from 'react';
import { useTasks } from './hooks/useTasks';
import { useTheme } from './hooks/useTheme';
import { useSettings } from './hooks/useSettings';
import { useClients } from './hooks/useClients';
import { yesterdayKey, todayKey } from './utils/time';
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
  const [showTheme,    setShowTheme]    = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [weekOffset, setWeekOffset]     = useState(0);
  const inputRef = useRef(null);

  const {
    tasks, allTasks,
    addTask, editTask, carryOverTask, deleteTask,
    toggleTimer, completeTask,
    setTaskRate, setTaskTime, setTaskClient,
    addSubtask, toggleSubtask, deleteSubtask,
  } = useTasks();

  const { themeId, customBg, customAccent, setPreset, activateCustom } = useTheme();
  const { globalHourlyRate, setGlobalHourlyRate } = useSettings();
  const {
    clients, CLIENT_COLORS,
    addClient, editClient, deleteClient,
    addProject, editProject, deleteProject,
  } = useClients();

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
  function toggleTheme()    { setShowTheme(v => !v); setShowSettings(false); }
  function toggleSettings() { setShowSettings(v => !v); setShowTheme(false); }

  // When client selection changes, reset project
  function handleAddClientChange(cId) {
    setAddClientId(cId);
    setAddProjectId('');
  }

  const incomplete     = tasks.filter(t => !t.completed);
  const completed      = tasks.filter(t => t.completed);
  const todayTexts     = new Set(tasks.map(t => t.text));
  const yesterdayTasks = (allTasks[yesterdayKey()] || []).filter(t => !todayTexts.has(t.text));

  const selectedClient = clients.find(c => c.id === addClientId) || null;

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <h1>BulletMan</h1>
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
            </nav>

            {/* Settings (hourly rate) */}
            <button
              className={`theme-toggle ${showSettings ? 'active' : ''}`}
              onClick={toggleSettings}
              title="Settings / hourly rate"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23"/>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
            </button>

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

        {(showTheme || showSettings) && (
          <div className="theme-panel-anchor">
            {showSettings && (
              <SettingsPanel
                globalHourlyRate={globalHourlyRate}
                onSetRate={setGlobalHourlyRate}
                onClose={() => setShowSettings(false)}
              />
            )}
            {showTheme && (
              <ThemePanel
                themeId={themeId}
                customBg={customBg}
                customAccent={customAccent}
                onSetPreset={setPreset}
                onActivateCustom={activateCustom}
                onClose={() => setShowTheme(false)}
              />
            )}
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

              {incomplete.map(task => (
                <TaskItem
                  key={task.id} task={task} globalHourlyRate={globalHourlyRate}
                  clients={clients}
                  onToggleTimer={toggleTimer} onComplete={completeTask}
                  onDelete={deleteTask} onEdit={editTask}
                  onSetRate={setTaskRate} onSetTime={setTaskTime} onSetClient={setTaskClient}
                  onAddSubtask={addSubtask} onToggleSubtask={toggleSubtask} onDeleteSubtask={deleteSubtask}
                />
              ))}

              {completed.length > 0 && (
                <>
                  <div className="section-divider">Completed</div>
                  {completed.map(task => (
                    <TaskItem
                      key={task.id} task={task} globalHourlyRate={globalHourlyRate}
                      clients={clients}
                      onToggleTimer={toggleTimer} onComplete={completeTask}
                      onDelete={deleteTask} onEdit={editTask}
                      onSetRate={setTaskRate} onSetTime={setTaskTime} onSetClient={setTaskClient}
                      onAddSubtask={addSubtask} onToggleSubtask={toggleSubtask} onDeleteSubtask={deleteSubtask}
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
      </main>
    </div>
  );
}
