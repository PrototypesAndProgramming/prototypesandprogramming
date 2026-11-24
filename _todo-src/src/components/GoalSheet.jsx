import { useState } from 'react';
import { daysBetween, fmtDate, fmtTime, todayKey } from '../recurrence.js';
import {
  activeIndex, addNode, getChain, getNode, isDone, moveNode, nextUp, orderWarnings, patchNode, progress, removeNode,
} from '../tree.js';
import { Breadcrumb, ColorPicker, Field, ProgressBar, Sheet, TimeInput } from './ui.jsx';

export function dueLabel(date) {
  if (!date) return '';
  const n = daysBetween(todayKey(), date);
  if (n < 0) return `${-n}d overdue`;
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  return `${n}d`;
}

/**
 * sheet = { type:'goal', path }                       view
 *       | { type:'goal', path, edit:true }            edit
 *       | { type:'goal', parentPath|null, key, draft } new ('projects' at top, 'children' = step, 'goals' = on an event)
 */
export default function GoalSheet({ sheet, data, update, open, onClose }) {
  const node = sheet.path ? getNode(data, sheet.path) : null;
  if (sheet.path && !node) return null;
  if (!sheet.path || sheet.edit) return <GoalEditor sheet={sheet} data={data} node={node} update={update} open={open} onClose={onClose} />;
  return <GoalDetail sheet={sheet} data={data} node={node} update={update} open={open} onClose={onClose} />;
}

function openerFor(data, path) {
  // Opening an ancestor: events open as events, goals/projects as goals.
  const last = path[path.length - 1];
  return last.key === 'events' || (last.key === 'children' && path.slice(0, -1).every((s) => s.key !== 'goals' && s.key !== 'projects'))
    ? { type: 'event', path }
    : { type: 'goal', path };
}

function GoalDetail({ sheet, data, node, update, open, onClose }) {
  const { path } = sheet;
  const chain = getChain(data, path);
  const steps = (node.children || []).filter((c) => !c.deleted);
  const active = activeIndex(steps);
  const p = progress(node);
  const done = isDone(node);
  const color = [...chain].reverse().find((n) => n.color)?.color;
  const next = nextUp(node).slice(1);
  const warnings = orderWarnings(node);
  const today = todayKey();

  const toggle = (stepPath, val) => update((d) => patchNode(d, stepPath, { done: val }));
  const del = () => {
    if (!confirm(`Delete "${node.title}"${steps.length ? ' and all its steps' : ''}?`)) return;
    update((d) => removeNode(d, path));
    onClose();
  };

  return (
    <Sheet
      title={node.title || 'Untitled'}
      onClose={onClose}
      actions={
        <>
          <button className="btn" onClick={() => open({ ...sheet, edit: true })}>Edit</button>
          <button className={`btn ${done ? '' : 'primary'}`} onClick={() => toggle(path, !node.done)}>
            {node.done ? 'Mark not done' : 'Mark done'}
          </button>
          <button className="btn danger" onClick={del}>Delete</button>
        </>
      }
    >
      <Breadcrumb chain={chain} onPick={(i) => open(openerFor(data, path.slice(0, i + 1)))} />
      <div className="meta">
        {node.deadline ? (
          <>
            ⚑ Due {fmtDate(node.deadline)}
            {node.time && ` ${fmtTime(node.time)}`}
            {!done && <span className={node.deadline < today ? 'overdue-text' : ''}> · {dueLabel(node.deadline)}</span>}
          </>
        ) : (
          'No deadline'
        )}
        {done && ' · ✓ done'}
      </div>
      {p.total > 1 && (
        <div className="meta">
          <ProgressBar {...p} color={color} /> {p.done}/{p.total} steps
        </div>
      )}
      {next.length > 0 && <div className="nextup">Next: {next.map((n) => n.title).join(' › ')}</div>}
      {node.notes && <p className="notes">{node.notes}</p>}
      {warnings.map((w) => (
        <div key={w} className="warn">Order check: {w}</div>
      ))}

      <div className="section-head">
        <span>Steps (in order)</span>
        <button className="link" onClick={() => open({ type: 'goal', parentPath: path, key: 'children', draft: {} })}>+ Add step</button>
      </div>
      {steps.length === 0 && <div className="empty">No steps — add some to break this into smaller goals.</div>}
      {steps.map((s, i) => {
        const sp = [...path, { key: 'children', id: s.id }];
        const sd = isDone(s);
        const sprog = progress(s);
        const locked = i > active;
        return (
          <div key={s.id} className={`step ${locked ? 'locked' : ''} ${i === active ? 'active' : ''}`}>
            <input type="checkbox" checked={sd} onChange={() => toggle(sp, !s.done)} />
            <button className="step-main" onClick={() => open({ type: 'goal', path: sp })}>
              <span className="step-num">{i + 1}.</span> {s.title}
              {sprog.total > 1 && <span className="row-side"> {sprog.done}/{sprog.total}</span>}
              {s.deadline && <span className={`row-side ${!sd && s.deadline < today ? 'overdue-text' : ''}`}> · {fmtDate(s.deadline, { month: 'short', day: 'numeric' })}</span>}
            </button>
            <button className="icon sm" disabled={i === 0} onClick={() => update((d) => moveNode(d, sp, -1))}>▲</button>
            <button className="icon sm" disabled={i === steps.length - 1} onClick={() => update((d) => moveNode(d, sp, 1))}>▼</button>
          </div>
        );
      })}
    </Sheet>
  );
}

function GoalEditor({ sheet, data, node, update, open, onClose }) {
  const isNew = !node;
  const isTop = isNew ? sheet.key === 'projects' : sheet.path.length === 1;
  const [f, setF] = useState(() =>
    node ? { ...node } : { title: '', deadline: '', time: '', notes: '', color: isTop ? '#4d7fd9' : null, done: false }
  );
  const set = (p) => setF((cur) => ({ ...cur, ...p }));

  const back = () => {
    if (!isNew) return open({ type: 'goal', path: sheet.path });
    if (sheet.parentPath) return open(openerFor(data, sheet.parentPath));
    onClose();
  };

  const save = () => {
    const fields = {
      title: f.title.trim() || 'Untitled', deadline: f.deadline || null, time: f.time || null, notes: f.notes, color: f.color,
    };
    if (isNew) {
      update((d) => addNode(d, sheet.parentPath, sheet.key, { ...fields, done: false, children: [] }));
      back();
    } else {
      update((d) => patchNode(d, sheet.path, fields));
      open({ type: 'goal', path: sheet.path });
    }
  };

  const label = isNew ? (sheet.key === 'projects' ? 'New project' : sheet.key === 'goals' ? 'New deadline' : 'New step') : 'Edit';

  return (
    <Sheet
      title={label}
      onClose={onClose}
      actions={
        <>
          <button className="btn" onClick={back}>Cancel</button>
          <button className="btn primary" onClick={save}>Save</button>
        </>
      }
    >
      <Field label="Title">
        <input autoFocus value={f.title} onChange={(e) => set({ title: e.target.value })} placeholder={isTop ? 'e.g. Finish robot' : 'e.g. CAD the chain bar'} />
      </Field>
      <div className="row2">
        <Field label="Deadline">
          <input type="date" value={f.deadline || ''} onChange={(e) => set({ deadline: e.target.value })} />
        </Field>
        <Field label="Time (optional)">
          <TimeInput allowEmpty value={f.time || ''} onChange={(time) => set({ time })} />
        </Field>
      </div>
      <Field label={isTop ? 'Color' : 'Color (∅ = same as parent)'}>
        <ColorPicker value={f.color} onChange={(color) => set({ color })} allowNone={!isTop} />
      </Field>
      <Field label="Notes">
        <textarea rows="3" value={f.notes || ''} onChange={(e) => set({ notes: e.target.value })} />
      </Field>
    </Sheet>
  );
}
