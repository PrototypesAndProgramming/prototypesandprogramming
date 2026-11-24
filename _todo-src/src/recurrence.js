// Date helpers + repeat-pattern logic. Pure functions, no React.
// Dates are local "YYYY-MM-DD" strings; times are "HH:MM" strings.

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function pad(n) {
  return String(n).padStart(2, '0');
}

export function toKey(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey() {
  return toKey(new Date());
}

export function addDays(key, n) {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
}

// Whole days from a to b (b - a), DST-safe.
export function daysBetween(a, b) {
  const da = fromKey(a);
  const db = fromKey(b);
  return Math.round(
    (Date.UTC(db.getFullYear(), db.getMonth(), db.getDate()) -
      Date.UTC(da.getFullYear(), da.getMonth(), da.getDate())) /
      86400000
  );
}

export function weekday(key) {
  return fromKey(key).getDay();
}

export function toMinutes(hhmm) {
  if (!hhmm) return 0;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function fromMinutes(min) {
  min = Math.max(0, Math.min(24 * 60 - 1, Math.round(min)));
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
}

// 24-hour clock everywhere
export function fmtTime(hhmm) {
  return fromMinutes(toMinutes(hhmm));
}

export function fmtDate(key, opts = { weekday: 'short', month: 'short', day: 'numeric' }) {
  return fromKey(key).toLocaleDateString(undefined, opts);
}

/**
 * Does a top-level event occur on dateKey?
 * event.date  = first date
 * event.repeat = { freq: 'none'|'daily'|'weekly'|'monthly', interval, days:[0-6], until }
 * event.skip  = [dateKey, ...] suppressed occurrences
 */
export function rootOccursOn(ev, dateKey) {
  if (!ev.date || dateKey < ev.date) return false;
  if (ev.skip && ev.skip.includes(dateKey)) return false;
  const r = ev.repeat || { freq: 'none' };
  if (r.until && dateKey > r.until) return false;
  const interval = Math.max(1, Number(r.interval) || 1);
  switch (r.freq) {
    case 'daily':
      return daysBetween(ev.date, dateKey) % interval === 0;
    case 'weekly': {
      const days = r.days && r.days.length ? r.days : [weekday(ev.date)];
      if (!days.includes(weekday(dateKey))) return false;
      // Compare weeks starting Sunday
      const ws = addDays(ev.date, -weekday(ev.date));
      const wd = addDays(dateKey, -weekday(dateKey));
      return (daysBetween(ws, wd) / 7) % interval === 0;
    }
    case 'monthly': {
      const a = fromKey(ev.date);
      const b = fromKey(dateKey);
      if (a.getDate() !== b.getDate()) return false;
      const months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
      return months % interval === 0;
    }
    default:
      return dateKey === ev.date;
  }
}

/**
 * Sub-events inherit their parent's days. Optionally limited to certain
 * weekdays (child.days) and individually skippable (child.skip).
 */
export function childOccursOn(child, dateKey) {
  if (child.skip && child.skip.includes(dateKey)) return false;
  if (child.days && child.days.length && !child.days.includes(weekday(dateKey))) return false;
  return true;
}

export function isRepeating(ev) {
  return ev.repeat && ev.repeat.freq && ev.repeat.freq !== 'none';
}

export function describeRepeat(ev) {
  const r = ev.repeat || {};
  if (!isRepeating(ev)) return null;
  const n = Math.max(1, Number(r.interval) || 1);
  let s;
  if (r.freq === 'daily') s = n === 1 ? 'Every day' : `Every ${n} days`;
  else if (r.freq === 'weekly') {
    const days = (r.days && r.days.length ? r.days : [weekday(ev.date)])
      .slice()
      .sort()
      .map((d) => WEEKDAYS[d])
      .join(', ');
    s = (n === 1 ? 'Every ' : `Every ${n} weeks on `) + days;
  } else if (r.freq === 'monthly') s = n === 1 ? 'Monthly' : `Every ${n} months`;
  if (r.until) s += ` until ${fmtDate(r.until, { month: 'short', day: 'numeric', year: 'numeric' })}`;
  return s;
}

/**
 * Build the tree of occurrences for a given day.
 * Returns [{ ev, path:[ids], start, end (minutes), children:[...] }]
 */
export function occurrencesOn(events, dateKey) {
  // path = steps from the top, e.g. [{key:'events',id}, {key:'children',id}]
  const build = (ev, parentPath) => {
    const path = [...parentPath, { key: parentPath.length ? 'children' : 'events', id: ev.id }];
    return {
    ev,
    path,
    start: toMinutes(ev.start),
    end: Math.max(toMinutes(ev.end), toMinutes(ev.start) + 5),
    children: (ev.children || [])
      .filter((c) => !c.deleted && childOccursOn(c, dateKey))
      .map((c) => build(c, path)),
    };
  };
  return events
    .filter((e) => !e.deleted && rootOccursOn(e, dateKey))
    .map((e) => build(e, []));
}

// Count every descendant in an occurrence tree.
export function countDescendants(occ) {
  return occ.children.reduce((n, c) => n + 1 + countDescendants(c), 0);
}

/**
 * Side-by-side lanes for overlapping items.
 * Returns items with { lane, lanes } added.
 */
export function assignLanes(items) {
  const sorted = items.slice().sort((a, b) => a.start - b.start || b.end - a.end);
  const out = [];
  let cluster = [];
  let clusterEnd = -1;
  const flush = () => {
    const laneEnds = [];
    for (const it of cluster) {
      let lane = laneEnds.findIndex((end) => end <= it.start);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(it.end);
      } else laneEnds[lane] = it.end;
      it.lane = lane;
    }
    for (const it of cluster) it.lanes = laneEnds.length;
    out.push(...cluster);
    cluster = [];
  };
  for (const it of sorted) {
    if (cluster.length && it.start >= clusterEnd) {
      flush();
      clusterEnd = -1;
    }
    cluster.push({ ...it });
    clusterEnd = Math.max(clusterEnd, it.end);
  }
  if (cluster.length) flush();
  return out;
}
