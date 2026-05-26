import { useState, useRef } from 'react';
import { formatTime, formatMoney, parseTimeInput } from '../utils/time';
import SubtaskList from './SubtaskList';

export default function TaskItem({
  task,
  globalHourlyRate,
  clients = [],
  onToggleTimer,
  onComplete,
  onDelete,
  onEdit,
  onSetRate,
  onSetTime,
  onSetClient,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
  // Mini timer pin
  isElectron = false,
  isPinned   = false,
  taskColor  = '#7c3aed',
  onPin,
}) {
  const { id, text, completed, timerRunning, displaySeconds, hourlyRate, subtasks = [],
          clientId, projectId } = task;

  const [editing,      setEditing]      = useState(false);
  const [editText,     setEditText]     = useState(text);
  const [editingTime,  setEditingTime]  = useState(false);
  const [timeInput,    setTimeInput]    = useState('');
  const [showRate,     setShowRate]     = useState(false);
  const [rateInput,    setRateInput]    = useState('');
  const [showSubtasks, setShowSubtasks] = useState(false);
  const [showClient,   setShowClient]   = useState(false);

  const nameRef = useRef(null);
  const timeRef = useRef(null);
  const rateRef = useRef(null);

  const effectiveRate = hourlyRate !== null && hourlyRate !== undefined ? hourlyRate : globalHourlyRate;
  const earnings      = effectiveRate > 0 ? (displaySeconds / 3600) * effectiveRate : 0;
  const hasCustomRate = hourlyRate !== null && hourlyRate !== undefined;

  // Resolve display client/project
  const assignedClient  = clients.find(c => c.id === clientId) || null;
  const assignedProject = assignedClient?.projects.find(p => p.id === projectId) || null;

  // ── Name editing ──────────────────────────────────────────────────────────
  function startEdit() {
    setEditText(text);
    setEditing(true);
    setTimeout(() => nameRef.current?.focus(), 0);
  }
  function commitEdit() {
    const t = editText.trim();
    if (t && t !== text) onEdit(id, t);
    setEditing(false);
  }
  function handleEditKey(e) {
    if (e.key === 'Enter') commitEdit();
    if (e.key === 'Escape') setEditing(false);
  }

  // ── Time editing ──────────────────────────────────────────────────────────
  function startTimeEdit() {
    const h = Math.floor(displaySeconds / 3600);
    const m = Math.floor((displaySeconds % 3600) / 60);
    setTimeInput(h > 0 ? `${h}h ${m}m` : `${m}m`);
    setEditingTime(true);
    setTimeout(() => timeRef.current?.select(), 0);
  }
  function commitTimeEdit() {
    const secs = parseTimeInput(timeInput);
    if (secs !== null) onSetTime(id, secs);
    setEditingTime(false);
  }
  function handleTimeKey(e) {
    if (e.key === 'Enter') commitTimeEdit();
    if (e.key === 'Escape') setEditingTime(false);
  }

  // ── Rate editing ──────────────────────────────────────────────────────────
  function startRateEdit() {
    setRateInput(hasCustomRate ? String(hourlyRate) : '');
    setShowRate(true);
    setShowClient(false);
    setTimeout(() => rateRef.current?.select(), 0);
  }
  function commitRateEdit() {
    onSetRate(id, rateInput);
    setShowRate(false);
  }
  function handleRateKey(e) {
    if (e.key === 'Enter') commitRateEdit();
    if (e.key === 'Escape') setShowRate(false);
  }
  function clearRate() {
    onSetRate(id, '');
    setShowRate(false);
  }

  // ── Client selector ───────────────────────────────────────────────────────
  function toggleClientPanel() {
    setShowClient(v => !v);
    setShowRate(false);
  }

  function selectClientProject(cId, pId = null) {
    onSetClient(id, cId, pId);
    setShowClient(false);
  }

  function clearClient() {
    onSetClient(id, null, null);
    setShowClient(false);
  }

  const subCount = subtasks.length;
  const subDone  = subtasks.filter(s => s.completed).length;

  return (
    <div className={`task-item${completed ? ' completed' : ''}${timerRunning ? ' running' : ''}`}>

      {/* ── Main row ── */}
      <div className="task-main-row">
        {/* Completion check */}
        <button
          className="check-btn"
          onClick={() => onComplete(id, !completed)}
          title={completed ? 'Mark incomplete' : 'Mark complete'}
        >
          <span className="checkmark">{completed ? '✓' : ''}</span>
        </button>

        {/* Task name / edit */}
        {editing ? (
          <input
            ref={nameRef}
            className="task-edit-input"
            value={editText}
            onChange={e => setEditText(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleEditKey}
          />
        ) : (
          <div className="task-text-block">
            <span className="task-text">{text}</span>
            {assignedClient && (
              <span className="client-chip" style={{ background: assignedClient.color }}>
                {assignedClient.name}
                {assignedProject && <span className="client-chip-proj"> / {assignedProject.name}</span>}
              </span>
            )}
          </div>
        )}

        {/* Right-side controls */}
        <div className="task-controls">
          {/* Subtask toggle */}
          <button
            className={`subtask-toggle-btn${showSubtasks ? ' open' : ''}`}
            onClick={() => setShowSubtasks(v => !v)}
            title={showSubtasks ? 'Hide subtasks' : 'Show subtasks'}
          >
            {subCount > 0
              ? <span className="subtask-badge">{subDone}/{subCount}</span>
              : <span className="subtask-badge-empty">sub</span>
            }
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <path d={showSubtasks ? 'M1 7l4-4 4 4' : 'M1 3l4 4 4-4'} stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            </svg>
          </button>

          {/* Timer display (click to edit) */}
          {editingTime ? (
            <input
              ref={timeRef}
              className="time-edit-input"
              value={timeInput}
              onChange={e => setTimeInput(e.target.value)}
              onBlur={commitTimeEdit}
              onKeyDown={handleTimeKey}
              placeholder="e.g. 1h 30m"
              title="Enter time: 1h 30m, 90, 1:30"
            />
          ) : (
            <span
              className="timer-display"
              onClick={startTimeEdit}
              title="Click to edit logged time"
              style={{ cursor: 'pointer' }}
            >
              {formatTime(displaySeconds)}
            </span>
          )}

          {/* Earnings badge */}
          {earnings > 0 && !editingTime && (
            <span className="earnings-badge">{formatMoney(earnings)}</span>
          )}

          {/* Client assign button */}
          {!editing && clients.length > 0 && (
            <button
              className={`client-btn${assignedClient ? ' assigned' : ''}${showClient ? ' open' : ''}`}
              onClick={toggleClientPanel}
              title={assignedClient ? `Client: ${assignedClient.name}` : 'Assign to client'}
              style={assignedClient ? { borderColor: assignedClient.color, color: assignedClient.color } : {}}
            >
              ◎
            </button>
          )}

          {/* Rate button */}
          {!editing && !showRate && (
            <button
              className={`rate-btn${hasCustomRate ? ' custom' : ''}`}
              onClick={startRateEdit}
              title={hasCustomRate ? `Custom rate: $${hourlyRate}/hr` : `Rate: $${globalHourlyRate}/hr (global)`}
            >
              $
            </button>
          )}

          {/* Name edit button */}
          {!editing && !editingTime && (
            <button className="edit-btn" onClick={startEdit} title="Edit task name">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
          )}

          {/* Pin mini timer */}
          {isElectron && !completed && !editing && (
            <button
              className={`pin-btn${isPinned ? ' pinned' : ''}`}
              onClick={onPin}
              title={isPinned ? 'Unpin mini timer' : 'Pin mini timer'}
              style={isPinned ? { borderColor: taskColor, color: taskColor, background: taskColor + '18' } : {}}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill={isPinned ? taskColor : 'none'} stroke={isPinned ? taskColor : 'currentColor'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="17" x2="12" y2="22"/>
                <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/>
              </svg>
            </button>
          )}

          {/* Play / pause */}
          {!completed && !editing && (
            <button
              className={`timer-btn ${timerRunning ? 'pause' : 'play'}`}
              onClick={() => onToggleTimer(id)}
              title={timerRunning ? 'Pause' : 'Start timer'}
            >
              {timerRunning ? '⏸' : '▶'}
            </button>
          )}

          {/* Delete */}
          {!editing && (
            <button className="delete-btn" onClick={() => onDelete(id)} title="Delete task">✕</button>
          )}
        </div>
      </div>

      {/* ── Client selector panel ── */}
      {showClient && (
        <div className="client-panel">
          <div className="client-panel-header">
            <span className="client-panel-label">Assign to client</span>
            {assignedClient && (
              <button className="client-clear-btn" onClick={clearClient}>Clear</button>
            )}
          </div>
          <div className="client-panel-list">
            {clients.map(c => (
              <div key={c.id} className={`client-option${c.id === clientId ? ' selected' : ''}`}>
                <button
                  className="client-option-name"
                  onClick={() => selectClientProject(c.id, null)}
                  style={{ borderLeft: `4px solid ${c.color}` }}
                >
                  <span className="co-dot" style={{ background: c.color }} />
                  {c.name}
                </button>
                {c.projects.length > 0 && (
                  <div className="client-option-projects">
                    {c.projects.map(p => (
                      <button
                        key={p.id}
                        className={`client-proj-option${p.id === projectId && c.id === clientId ? ' selected' : ''}`}
                        onClick={() => selectClientProject(c.id, p.id)}
                      >
                        ◦ {p.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Rate panel ── */}
      {showRate && (
        <div className="rate-panel">
          <span className="rate-panel-label">$/hr</span>
          <input
            ref={rateRef}
            className="rate-panel-input"
            type="number"
            min="0"
            step="0.01"
            placeholder={`${globalHourlyRate} (global)`}
            value={rateInput}
            onChange={e => setRateInput(e.target.value)}
            onBlur={commitRateEdit}
            onKeyDown={handleRateKey}
          />
          {hasCustomRate && (
            <button className="rate-clear-btn" onClick={clearRate} title="Use global rate">
              Use global
            </button>
          )}
          <button className="rate-confirm-btn" onClick={commitRateEdit} title="Save rate">✓</button>
          <button className="rate-cancel-btn" onClick={() => setShowRate(false)} title="Cancel">✕</button>
        </div>
      )}

      {/* ── Subtask list ── */}
      {showSubtasks && (
        <SubtaskList
          subtasks={subtasks}
          taskId={id}
          onAdd={onAddSubtask}
          onToggle={onToggleSubtask}
          onDelete={onDeleteSubtask}
        />
      )}
    </div>
  );
}
