import { useMemo } from 'react';
import { addDays, fmtDate, todayKey } from '../recurrence.js';
import { allDeadlines, isDone, nextUp, progress } from '../tree.js';
import { ProgressBar } from './ui.jsx';
import { dueLabel } from './GoalSheet.jsx';

export default function ProjectsView({ data, open }) {
  const today = todayKey();
  const horizon = addDays(today, 14);
  const deadlines = useMemo(() => allDeadlines(data), [data]);
  const focus = deadlines
    .filter((d) => !d.done && d.date <= horizon)
    .sort((a, b) => (a.date + (a.time || '99')).localeCompare(b.date + (b.time || '99')));
  const projects = (data.projects || []).filter((p) => !p.deleted);
  const active = projects.filter((p) => !isDone(p));
  const finished = projects.filter((p) => isDone(p));
  const eventGoals = deadlines.filter((d) => d.source === 'event' && d.path[d.path.length - 1].key === 'goals');

  return (
    <div className="scrollpage">
      <h2>Focus — next 2 weeks</h2>
      {focus.length === 0 && <div className="empty">Nothing due. Nice.</div>}
      {focus.map((d) => (
        <button key={d.path.map((p) => p.id).join('/')} className="row" onClick={() => open({ type: 'goal', path: d.path })}>
          <span className="dot" style={{ background: d.color || 'var(--navy)' }} />
          <span className="row-main">
            {d.node.title}
            <span className="row-ctx">{d.labels.slice(0, -1).join(' › ')}</span>
          </span>
          <span className={`row-side ${d.date < today ? 'overdue-text' : ''}`}>{dueLabel(d.date)}</span>
        </button>
      ))}

      <div className="section-head">
        <h2>Projects</h2>
        <button className="link" onClick={() => open({ type: 'goal', parentPath: null, key: 'projects', draft: {} })}>+ New project</button>
      </div>
      {active.length === 0 && <div className="empty">No projects yet.</div>}
      {active.map((p) => <ProjectCard key={p.id} p={p} open={open} today={today} />)}

      {eventGoals.length > 0 && (
        <>
          <h2>Event deadlines</h2>
          {eventGoals.map((d) => {
            const p = progress(d.node);
            return (
              <button key={d.path.map((x) => x.id).join('/')} className={`row ${d.done ? 'faded' : ''}`} onClick={() => open({ type: 'goal', path: d.path })}>
                <span className="dot" style={{ background: d.color || 'var(--navy)' }} />
                <span className="row-main">
                  {d.node.title}
                  <span className="row-ctx">{d.labels.slice(0, -1).join(' › ')}</span>
                </span>
                <span className="row-side">{d.done ? '✓' : `${fmtDate(d.date)}${p.total > 1 ? ` · ${p.done}/${p.total}` : ''}`}</span>
              </button>
            );
          })}
        </>
      )}

      {finished.length > 0 && (
        <>
          <h2>Finished</h2>
          {finished.map((p) => <ProjectCard key={p.id} p={p} open={open} today={today} />)}
        </>
      )}
    </div>
  );
}

function ProjectCard({ p, open, today }) {
  const prog = progress(p);
  const next = nextUp(p).slice(1);
  const done = isDone(p);
  return (
    <button className={`card ${done ? 'faded' : ''}`} style={{ borderLeftColor: p.color || 'var(--navy)' }} onClick={() => open({ type: 'goal', path: [{ key: 'projects', id: p.id }] })}>
      <div className="card-top">
        <span className="card-title">{p.title}</span>
        {p.deadline && (
          <span className={`row-side ${!done && p.deadline < today ? 'overdue-text' : ''}`}>
            {fmtDate(p.deadline)}{!done && ` · ${dueLabel(p.deadline)}`}
          </span>
        )}
      </div>
      {prog.total > 1 && (
        <div className="card-prog">
          <ProgressBar {...prog} color={p.color} /> <span>{prog.done}/{prog.total}</span>
        </div>
      )}
      {next.length > 0 && <div className="nextup">Next: {next.map((n) => n.title).join(' › ')}</div>}
    </button>
  );
}
