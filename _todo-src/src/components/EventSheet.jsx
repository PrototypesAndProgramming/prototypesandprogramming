import { useState } from 'react';
import { describeRepeat, fmtDate, fmtTime, isRepeating, toMinutes, weekday, WEEKDAYS } from '../recurrence.js';
import { addNode, getChain, getNode, patchNode, progress, removeNode } from '../tree.js';
import { Breadcrumb, ColorPicker, DayToggles, Field, ProgressBar, Sheet, TimeInput } from './ui.jsx';

/**
 * sheet = { type:'event', path, dateKey }                       view existing
 *       | { type:'event', path, dateKey, edit:true }            edit existing
 *       | { type:'event', parentPath|null, dateKey, draft }     create new (root or sub-event)
 */
export default function EventSheet({ sheet, data, update, open, onClose }) {
  const isNew = !sheet.path;
  const node = isNew ? null : getNode(data, sheet.path);
  if (!isNew && !node) return null;
  if (isNew || sheet.edit) return <EventEditor sheet={sheet} data={data} node={node} update={update} open={open} onClose={onClose} />;
  return <EventDetail sheet={sheet} data={data} node={node} update={update} open={open} onClose={onClose} />;
}

function EventDetail({ sheet, data, node, update, open, onClose }) {
  const { path, dateKey } = sheet;
  const chain = getChain(data, path);
  const root = chain[0];
  const isRoot = path.length === 1;
  const partOfSeries = isRepeating(root);
  const repeatText = isRoot ? describeRepeat(node) : null;
  const subs = (node.children || []).filter((c) => !c.deleted);
  const goals = (node.goals || []).filter((g) => !g.deleted);

  const skipDay = () => {
    update((d) => patchNode(d, path, { skip: [...(node.skip || []), dateKey] }));
    onClose();
  };
  const del = () => {
    const what = isRoot && partOfSeries ? 'this whole repeating event (every day it happens)' : `"${node.title}"`;
    if (!confirm(`Delete ${what}${subs.length ? ' and its sub-events' : ''}?`)) return;
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
          {partOfSeries && dateKey && <button className="btn" onClick={skipDay}>Skip {fmtDate(dateKey, { month: 'short', day: 'numeric' })}</button>}
          <button className="btn danger" onClick={del}>Delete</button>
        </>
      }
    >
      <Breadcrumb chain={chain} onPick={(i) => open({ type: 'event', path: path.slice(0, i + 1), dateKey })} />
      <div className="meta">
        {fmtTime(node.start)}–{fmtTime(node.end)}
        {dateKey && <> · {fmtDate(dateKey)}</>}
      </div>
      {node.location && <div className="meta">📍 {node.location}</div>}
      {repeatText && <div className="meta">↻ {repeatText}</div>}
      {!isRoot && node.days && node.days.length > 0 && (
        <div className="meta">Only on {node.days.map((d) => WEEKDAYS[d]).join(', ')}</div>
      )}
      {node.notes && <p className="notes">{node.notes}</p>}

      <div className="section-head">
        <span>Sub-events</span>
        <button className="link" onClick={() => open({ type: 'event', parentPath: path, dateKey, draft: { start: node.start, end: node.end } })}>
          + Add
        </button>
      </div>
      {subs.length === 0 && <div className="empty">None</div>}
      <SubList list={subs} path={path} dateKey={dateKey} open={open} depth={0} />

      <div className="section-head">
        <span>Deadlines</span>
        <button className="link" onClick={() => open({ type: 'goal', parentPath: path, key: 'goals', draft: {} })}>+ Add</button>
      </div>
      {goals.length === 0 && <div className="empty">None</div>}
      {goals.map((g) => {
        const p = progress(g);
        return (
          <button key={g.id} className="row" onClick={() => open({ type: 'goal', path: [...path, { key: 'goals', id: g.id }] })}>
            <span className="row-main">⚑ {g.title}</span>
            <span className="row-side">{g.deadline ? fmtDate(g.deadline, { month: 'short', day: 'numeric' }) : ''}</span>
            {p.total > 1 && <ProgressBar {...p} color={node.color} />}
          </button>
        );
      })}
    </Sheet>
  );
}

function SubList({ list, path, dateKey, open, depth }) {
  return list.map((c) => {
    const p = [...path, { key: 'children', id: c.id }];
    const kids = (c.children || []).filter((k) => !k.deleted);
    return (
      <div key={c.id}>
        <button className="row" style={{ paddingLeft: 10 + depth * 14 }} onClick={() => open({ type: 'event', path: p, dateKey })}>
          <span className="dot" style={{ background: c.color || 'var(--ink-soft)' }} />
          <span className="row-main">{c.title}</span>
          <span className="row-side">
            {fmtTime(c.start)}–{fmtTime(c.end)}
            {c.days && c.days.length ? ` · ${c.days.map((d) => WEEKDAYS[d][0]).join('')}` : ''}
          </span>
        </button>
        {kids.length > 0 && <SubList list={kids} path={p} dateKey={dateKey} open={open} depth={depth + 1} />}
      </div>
    );
  });
}

function EventEditor({ sheet, data, node, update, open, onClose }) {
  const isNew = !node;
  const isRoot = isNew ? !sheet.parentPath : sheet.path.length === 1;
  const parent = isNew ? (sheet.parentPath ? getNode(data, sheet.parentPath) : null) : sheet.path.length > 1 ? getNode(data, sheet.path.slice(0, -1)) : null;

  const [f, setF] = useState(() => {
    if (node) return { ...node, repeat: { freq: 'none', interval: 1, days: [], until: '', ...(node.repeat || {}) } };
    const d = sheet.draft || {};
    return {
      title: '', notes: '', location: '', color: isRoot ? '#4d7fd9' : null,
      start: d.start || '09:00', end: d.end || '10:00',
      date: sheet.dateKey, days: [], skip: [],
      repeat: { freq: 'none', interval: 1, days: [], until: '' },
    };
  });
  const set = (p) => setF((cur) => ({ ...cur, ...p }));
  const setRepeat = (p) => setF((cur) => ({ ...cur, repeat: { ...cur.repeat, ...p } }));

  const badTime = toMinutes(f.end) <= toMinutes(f.start);
  const outside = parent && (toMinutes(f.start) < toMinutes(parent.start) || toMinutes(f.end) > toMinutes(parent.end));

  const save = () => {
    if (badTime) return;
    const fields = {
      title: f.title.trim() || 'Untitled', notes: f.notes, location: (f.location || '').trim(), color: f.color, start: f.start, end: f.end, skip: f.skip || [],
    };
    if (isRoot) {
      fields.date = f.date;
      fields.repeat = f.repeat.freq === 'none' ? { freq: 'none' } : { ...f.repeat, until: f.repeat.until || null };
    } else fields.days = f.days || [];

    if (isNew) {
      update((d) => addNode(d, sheet.parentPath, sheet.parentPath ? 'children' : 'events', { ...fields, children: [], goals: [] }));
      if (sheet.parentPath) open({ type: 'event', path: sheet.parentPath, dateKey: sheet.dateKey });
      else onClose();
    } else {
      update((d) => patchNode(d, sheet.path, fields));
      open({ type: 'event', path: sheet.path, dateKey: sheet.dateKey });
    }
  };

  const back = () => (isNew ? (sheet.parentPath ? open({ type: 'event', path: sheet.parentPath, dateKey: sheet.dateKey }) : onClose()) : open({ type: 'event', path: sheet.path, dateKey: sheet.dateKey }));

  return (
    <Sheet
      title={isNew ? (isRoot ? 'New event' : `New sub-event of ${parent?.title}`) : 'Edit event'}
      onClose={onClose}
      actions={
        <>
          <button className="btn" onClick={back}>Cancel</button>
          <button className="btn primary" onClick={save} disabled={badTime}>Save</button>
        </>
      }
    >
      <Field label="Title">
        <input autoFocus value={f.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. School" />
      </Field>
      <div className="row2">
        <Field label="Start"><TimeInput value={f.start} onChange={(start) => set({ start })} /></Field>
        <Field label="End"><TimeInput value={f.end} onChange={(end) => set({ end })} /></Field>
      </div>
      {badTime && <div className="warn">End has to be after start.</div>}
      <Field label="Location">
        <input value={f.location || ''} onChange={(e) => set({ location: e.target.value })} placeholder="e.g. Room 214" />
      </Field>
      {outside && <div className="warn">Outside {parent.title} ({fmtTime(parent.start)}–{fmtTime(parent.end)}); the part outside won't show.</div>}

      {isRoot ? (
        <>
          <Field label={f.repeat.freq === 'none' ? 'Date' : 'Starts'}>
            <input type="date" value={f.date} onChange={(e) => set({ date: e.target.value })} />
          </Field>
          <Field label="Repeats">
            <select
              value={f.repeat.freq}
              onChange={(e) =>
setRepeat({ freq: e.target.value })
              }
            >
              <option value="none">Doesn't repeat</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly (same date)</option>
            </select>
          </Field>
          {f.repeat.freq !== 'none' && (
            <>
              {f.repeat.freq === 'weekly' && (
                <Field label={`On${(f.repeat.days || []).length ? '' : ` (none picked = ${f.date ? WEEKDAYS[weekday(f.date)] : 'start day'})`}`}>
                  <DayToggles value={f.repeat.days} onChange={(days) => setRepeat({ days })} />
                </Field>
              )}
              <div className="row2">
                <Field label={`Every N ${f.repeat.freq === 'daily' ? 'days' : f.repeat.freq === 'weekly' ? 'weeks' : 'months'}`}>
                  <input type="number" min="1" value={f.repeat.interval} onChange={(e) => setRepeat({ interval: Number(e.target.value) || 1 })} />
                </Field>
                <Field label="Until (optional)">
                  <input type="date" value={f.repeat.until || ''} onChange={(e) => setRepeat({ until: e.target.value })} />
                </Field>
              </div>
            </>
          )}
        </>
      ) : (
        <Field label="Only on these days (blank = every time the parent happens)">
          <DayToggles value={f.days || []} onChange={(days) => set({ days })} />
        </Field>
      )}

      <Field label={isRoot ? 'Color' : 'Color (∅ = same as parent)'}>
        <ColorPicker value={f.color} onChange={(color) => set({ color })} allowNone={!isRoot} />
      </Field>
      <Field label="Notes">
        <textarea rows="2" value={f.notes || ''} onChange={(e) => set({ notes: e.target.value })} />
      </Field>

      {f.skip && f.skip.length > 0 && (
        <Field label="Skipped days (tap to restore)">
          <div className="chips wrap">
            {f.skip.slice().sort().map((s) => (
              <button type="button" key={s} className="chip" onClick={() => set({ skip: f.skip.filter((x) => x !== s) })}>
                {fmtDate(s, { month: 'short', day: 'numeric' })} ✕
              </button>
            ))}
          </div>
        </Field>
      )}
    </Sheet>
  );
}
