import { useState, memo } from 'react';
import ClientProjectVisualizer from './ClientProjectVisualizer';

const RANGES = [
  { id: 'week',     label: 'This Week' },
  { id: 'month',    label: 'This Month' },
  { id: 'all',      label: 'All Time' },
];

// ── Small form helpers ────────────────────────────────────────────────────────

function ColorSwatch({ colors, selected, onSelect }) {
  return (
    <div className="color-swatches">
      {colors.map(c => (
        <button
          key={c}
          className={`swatch${selected === c ? ' selected' : ''}`}
          style={{ background: c }}
          onClick={() => onSelect(c)}
          title={c}
        />
      ))}
    </div>
  );
}

// ── Inline editable project row ───────────────────────────────────────────────

function ProjectRow({ project, clientId, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [name, setName]       = useState(project.name);

  function commit() {
    const t = name.trim();
    if (t && t !== project.name) onEdit(clientId, project.id, t);
    setEditing(false);
  }

  return (
    <div className="cp-project-row">
      <span className="cp-proj-bullet">◦</span>
      {editing ? (
        <input
          className="cp-inline-input"
          value={name}
          autoFocus
          onChange={e => setName(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
        />
      ) : (
        <span className="cp-proj-name">{project.name}</span>
      )}
      <div className="cp-proj-actions">
        {!editing && (
          <button className="cp-icon-btn" onClick={() => { setName(project.name); setEditing(true); }} title="Rename project">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
        )}
        <button className="cp-icon-btn danger" onClick={() => onDelete(clientId, project.id)} title="Delete project">✕</button>
      </div>
    </div>
  );
}

// ── Expandable client card ────────────────────────────────────────────────────

function ClientCard({
  client,
  CLIENT_COLORS,
  onEditClient,
  onDeleteClient,
  onAddProject,
  onEditProject,
  onDeleteProject,
}) {
  const [expanded,    setExpanded]    = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [nameInput,   setNameInput]   = useState(client.name);
  const [editingColor,setEditingColor]= useState(false);
  const [newProject,  setNewProject]  = useState('');

  function commitName() {
    const t = nameInput.trim();
    if (t && t !== client.name) onEditClient(client.id, t, null);
    setEditingName(false);
  }

  function handleAddProject(e) {
    e.preventDefault();
    if (!newProject.trim()) return;
    onAddProject(client.id, newProject);
    setNewProject('');
  }

  return (
    <div className="cp-client-card">
      {/* Client header bar */}
      <div className="cp-client-header">
        <button
          className="cp-color-dot"
          style={{ background: client.color }}
          onClick={() => setEditingColor(v => !v)}
          title="Change colour"
        />

        {editingName ? (
          <input
            className="cp-inline-input cp-name-input"
            value={nameInput}
            autoFocus
            onChange={e => setNameInput(e.target.value)}
            onBlur={commitName}
            onKeyDown={e => { if (e.key === 'Enter') commitName(); if (e.key === 'Escape') setEditingName(false); }}
          />
        ) : (
          <span className="cp-client-name">{client.name}</span>
        )}

        <div className="cp-client-actions">
          <button className="cp-icon-btn" onClick={() => { setNameInput(client.name); setEditingName(true); }} title="Rename client">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button className="cp-icon-btn danger" onClick={() => onDeleteClient(client.id)} title="Delete client">✕</button>
          <button
            className={`cp-expand-btn${expanded ? ' open' : ''}`}
            onClick={() => setExpanded(v => !v)}
            title={expanded ? 'Collapse' : 'Expand'}
          >
            <svg width="12" height="12" viewBox="0 0 10 10" fill="currentColor">
              <path d={expanded ? 'M1 7l4-4 4 4' : 'M1 3l4 4 4-4'} stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Color picker */}
      {editingColor && (
        <div className="cp-color-panel">
          <ColorSwatch
            colors={CLIENT_COLORS}
            selected={client.color}
            onSelect={color => { onEditClient(client.id, null, color); setEditingColor(false); }}
          />
        </div>
      )}

      {/* Projects list */}
      {expanded && (
        <div className="cp-projects">
          {client.projects.length === 0 && (
            <p className="cp-no-projects">No projects yet. Add one below.</p>
          )}
          {client.projects.map(p => (
            <ProjectRow
              key={p.id}
              project={p}
              clientId={client.id}
              onEdit={onEditProject}
              onDelete={onDeleteProject}
            />
          ))}

          {/* Add project */}
          <form className="cp-add-project-form" onSubmit={handleAddProject}>
            <span className="cp-proj-bullet dim">◦</span>
            <input
              className="cp-add-proj-input"
              value={newProject}
              onChange={e => setNewProject(e.target.value)}
              placeholder="Add project…"
            />
            <button className="cp-add-proj-btn" type="submit" disabled={!newProject.trim()}>+</button>
          </form>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

function ClientsPage({
  clients,
  CLIENT_COLORS,
  allTasks,
  globalHourlyRate,
  onAddClient,
  onEditClient,
  onDeleteClient,
  onAddProject,
  onEditProject,
  onDeleteProject,
}) {
  const [newClientName,  setNewClientName]  = useState('');
  const [newClientColor, setNewClientColor] = useState(CLIENT_COLORS[0]);
  const [showColorPick,  setShowColorPick]  = useState(false);
  const [vizRange,       setVizRange]       = useState('week');

  function handleAddClient(e) {
    e.preventDefault();
    if (!newClientName.trim()) return;
    onAddClient(newClientName, newClientColor);
    setNewClientName('');
    setNewClientColor(CLIENT_COLORS[(clients.length + 1) % CLIENT_COLORS.length]);
    setShowColorPick(false);
  }

  return (
    <div className="clients-page">

      {/* ── Visualizer ── */}
      <section className="cp-section">
        <div className="cp-section-header">
          <h2 className="cp-section-title">Time by Client</h2>
          <div className="cp-range-tabs">
            {RANGES.map(r => (
              <button
                key={r.id}
                className={`cp-range-btn${vizRange === r.id ? ' active' : ''}`}
                onClick={() => setVizRange(r.id)}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <ClientProjectVisualizer
          allTasks={allTasks}
          clients={clients}
          globalHourlyRate={globalHourlyRate}
          range={vizRange}
        />
      </section>

      {/* ── Client list ── */}
      <section className="cp-section">
        <h2 className="cp-section-title">Clients &amp; Projects</h2>

        {clients.length === 0 && (
          <p className="cp-empty-hint">No clients yet. Add your first client below.</p>
        )}

        {clients.map(client => (
          <ClientCard
            key={client.id}
            client={client}
            CLIENT_COLORS={CLIENT_COLORS}
            onEditClient={onEditClient}
            onDeleteClient={onDeleteClient}
            onAddProject={onAddProject}
            onEditProject={onEditProject}
            onDeleteProject={onDeleteProject}
          />
        ))}

        {/* ── Add client form ── */}
        <form className="cp-add-client-form" onSubmit={handleAddClient}>
          <button
            type="button"
            className="cp-new-color-dot"
            style={{ background: newClientColor }}
            onClick={() => setShowColorPick(v => !v)}
            title="Pick colour"
          />
          <input
            className="cp-add-client-input"
            value={newClientName}
            onChange={e => setNewClientName(e.target.value)}
            placeholder="New client name…"
          />
          <button className="cp-add-client-btn" type="submit" disabled={!newClientName.trim()}>
            Add Client
          </button>
        </form>

        {showColorPick && (
          <div className="cp-new-color-panel">
            <ColorSwatch
              colors={CLIENT_COLORS}
              selected={newClientColor}
              onSelect={c => { setNewClientColor(c); setShowColorPick(false); }}
            />
          </div>
        )}
      </section>
    </div>
  );
}

export default memo(ClientsPage);
