import { useState, useRef } from 'react';

export default function SubtaskList({ subtasks = [], taskId, onAdd, onToggle, onDelete }) {
  const [input, setInput] = useState('');
  const inputRef = useRef(null);

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = input.trim();
      if (trimmed) {
        onAdd(taskId, trimmed);
        setInput('');
      }
    }
    if (e.key === 'Escape') {
      setInput('');
      inputRef.current?.blur();
    }
  }

  const doneCount = subtasks.filter(s => s.completed).length;

  return (
    <div className="subtask-list">
      {subtasks.map(sub => (
        <div key={sub.id} className={`subtask-item${sub.completed ? ' done' : ''}`}>
          <button
            className="sub-check"
            onClick={() => onToggle(taskId, sub.id)}
            title={sub.completed ? 'Mark incomplete' : 'Mark complete'}
          >
            {sub.completed ? '✓' : ''}
          </button>
          <span className="sub-text">{sub.text}</span>
          <button
            className="sub-delete"
            onClick={() => onDelete(taskId, sub.id)}
            title="Remove subtask"
          >
            ✕
          </button>
        </div>
      ))}

      <div className="subtask-add-row">
        <span className="sub-bullet">◦</span>
        <input
          ref={inputRef}
          className="subtask-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add subtask… (Enter to save)"
        />
      </div>

      {subtasks.length > 0 && (
        <div className="subtask-progress-bar-wrap">
          <div
            className="subtask-progress-bar-fill"
            style={{ width: `${(doneCount / subtasks.length) * 100}%` }}
          />
          <span className="subtask-progress-label">{doneCount}/{subtasks.length}</span>
        </div>
      )}
    </div>
  );
}
