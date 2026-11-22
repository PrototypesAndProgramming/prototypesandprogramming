// Tree editing for events (with sub-events) and projects/goals (with ordered steps).
//
// A path is a list of steps from the top of the data:
//   [{ key: 'events', id }, { key: 'children', id }, { key: 'goals', id }, { key: 'children', id }]
// Root keys: 'events' | 'projects'. Event nodes hold 'children' (sub-events) and
// 'goals' (deadline trees). Goal/project nodes hold 'children' (ordered steps).

import { todayKey } from './recurrence.js';

export function uid() {
  if (globalThis.crypto && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function getNode(data, path) {
  let list = data[path[0].key];
  let node = null;
  for (const step of path) {
    if (node) list = node[step.key] || [];
    node = list.find((n) => n.id === step.id);
    if (!node) return null;
  }
  return node;
}

/** Ancestors (inclusive) along a path, top first. */
export function getChain(data, path) {
  const out = [];
  for (let i = 1; i <= path.length; i++) {
    const n = getNode(data, path.slice(0, i));
    if (!n) break;
    out.push(n);
  }
  return out;
}

// Clone the affected top-level item, walk to the target's parent list, run fn(list, index).
function mutate(data, path, fn) {
  const rootKey = path[0].key;
  const next = { ...data, [rootKey]: data[rootKey].slice() };
  const rootIdx = next[rootKey].findIndex((n) => n.id === path[0].id);
  if (rootIdx < 0) return data;
  const root = structuredClone(next[rootKey][rootIdx]);
  root.updatedAt = Date.now();
  next[rootKey][rootIdx] = root;
  if (path.length === 1) {
    fn(next[rootKey], rootIdx, true);
    return next;
  }
  let node = root;
  for (let i = 1; i < path.length - 1; i++) {
    node = (node[path[i].key] || []).find((n) => n.id === path[i].id);
    if (!node) return data;
  }
  const last = path[path.length - 1];
  node[last.key] = node[last.key] || [];
  const list = node[last.key];
  fn(list, list.findIndex((n) => n.id === last.id), false);
  return next;
}

export function patchNode(data, path, patch) {
  return mutate(data, path, (list, i) => {
    if (i >= 0) list[i] = { ...list[i], ...patch, updatedAt: Date.now() };
  });
}

/** Add node under parentPath's [key] list, or at top level when parentPath is null. */
export function addNode(data, parentPath, key, node) {
  const n = { ...node, id: node.id || uid(), updatedAt: Date.now() };
  if (!parentPath) return { ...data, [key]: [...(data[key] || []), n] };
  const fake = [...parentPath, { key, id: '__new__' }];
  return mutate(data, fake, (list) => list.push(n));
}

export function removeNode(data, path) {
  return mutate(data, path, (list, i, isRoot) => {
    if (i < 0) return;
    if (isRoot) list[i] = { id: list[i].id, deleted: true, updatedAt: Date.now() }; // tombstone for sync
    else list.splice(i, 1);
  });
}

export function moveNode(data, path, dir) {
  return mutate(data, path, (list, i) => {
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
  });
}

// ---------- goals / projects ----------

export function isDone(node) {
  const kids = (node.children || []).filter((c) => !c.deleted);
  if (node.done) return true;
  return kids.length > 0 && kids.every(isDone);
}

/** { done, total } counted over leaf steps. */
export function progress(node) {
  const kids = (node.children || []).filter((c) => !c.deleted);
  if (!kids.length) return { done: isDone(node) ? 1 : 0, total: 1 };
  if (node.done) {
    const p = kids.reduce((a, c) => a + progress(c).total, 0);
    return { done: p, total: p };
  }
  return kids.reduce(
    (a, c) => {
      const p = progress(c);
      return { done: a.done + p.done, total: a.total + p.total };
    },
    { done: 0, total: 0 }
  );
}

/** The deepest first-unfinished step: what to work on now. Returns [node...] chain or []. */
export function nextUp(node) {
  if (isDone(node)) return [];
  const kids = (node.children || []).filter((c) => !c.deleted);
  const first = kids.find((c) => !isDone(c));
  if (!first) return [node];
  return [node, ...nextUp(first)];
}

/** Index of the active (first unfinished) step in a list; later ones are "locked". */
export function activeIndex(list) {
  const i = list.findIndex((c) => !isDone(c));
  return i < 0 ? list.length : i;
}

/**
 * Every deadline in the data: projects and their steps, plus goals on events/sub-events.
 * -> [{ node, path, labels:[...], color, done, date, time, source: 'project'|'event' }]
 */
export function allDeadlines(data) {
  const out = [];
  const walkGoal = (node, path, labels, color, source) => {
    if (node.deleted) return;
    const c = node.color || color;
    if (node.deadline) {
      out.push({ node, path, labels: [...labels, node.title], color: c, done: isDone(node), date: node.deadline, time: node.time || null, source });
    }
    for (const ch of node.children || []) walkGoal(ch, [...path, { key: 'children', id: ch.id }], [...labels, node.title], c, source);
  };
  for (const p of data.projects || []) walkGoal(p, [{ key: 'projects', id: p.id }], [], p.color, 'project');
  const walkEvent = (ev, path, labels, color) => {
    if (ev.deleted) return;
    const c = ev.color || color;
    for (const g of ev.goals || []) walkGoal(g, [...path, { key: 'goals', id: g.id }], [...labels, ev.title], c, 'event');
    for (const ch of ev.children || []) walkEvent(ch, [...path, { key: 'children', id: ch.id }], [...labels, ev.title], c);
  };
  for (const e of data.events || []) walkEvent(e, [{ key: 'events', id: e.id }], [], e.color);
  return out;
}

export function deadlinesForDay(all, dateKey) {
  const today = todayKey();
  return all.filter((d) => {
    if (d.date === dateKey) return true;
    // overdue & unfinished items stick to today's column
    return dateKey === today && !d.done && d.date < today;
  });
}

/** Deadlines whose order is wrong: a step due after the step that follows it, or after its parent. */
export function orderWarnings(node) {
  const warn = [];
  const kids = (node.children || []).filter((c) => !c.deleted);
  for (let i = 0; i < kids.length; i++) {
    const k = kids[i];
    if (k.deadline && node.deadline && k.deadline > node.deadline) warn.push(`"${k.title}" is due after "${node.title}"`);
    const nxt = kids.slice(i + 1).find((x) => x.deadline);
    if (k.deadline && nxt && k.deadline > nxt.deadline) warn.push(`"${k.title}" is due after the next step "${nxt.title}"`);
  }
  return warn;
}
