import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  addDays, fromKey, assignLanes, countDescendants, fmtDate, fmtTime, fromMinutes, occurrencesOn, todayKey, toMinutes,
} from '../recurrence.js';
import { allDeadlines, deadlinesForDay } from '../tree.js';
import { rgba } from '../colors.js';

const GUTTER = 40;
const STRIP = 14; // left strip that labels a parent whose sub-events are shown

export default function DayView({ data, prefs, setPrefs, start, setStart, onOpenEvent, onOpenGoal, onCreate, status, onSync }) {
  const bodyRef = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [now, setNow] = useState(() => new Date());

  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const days = prefs.days;
  const rs = 0;
  const re = 24 * 60;
  const ppm = size.h > 0 ? size.h / (re - rs) : 0;
  const colW = size.w > 0 ? (size.w - GUTTER) / days : 0;
  const dates = Array.from({ length: days }, (_, i) => addDays(start, i));
  const today = todayKey();
  const deadlines = useMemo(() => allDeadlines(data), [data]);

  const hours = [];
  for (let h = 0; h <= 24; h++) hours.push(h);
  const hourStep = ppm * 60 < 22 ? 2 : 1;

  const monthLabel = start.slice(0, 7); // YYYY-MM

  return (
    <div className="dayview">
      <div className="toolbar">
        <button className="icon" onClick={() => setStart(addDays(start, -days))} aria-label="Back">‹</button>
        <button className="pill" onClick={() => setStart(today)}>Today</button>
        <button className="icon" onClick={() => setStart(addDays(start, days))} aria-label="Forward">›</button>
        <div className="month">{monthLabel}</div>
        <label className="forecast" title="Forecast days">
          <input
            type="range" min="1" max="7" value={days}
            onChange={(e) => setPrefs({ days: Number(e.target.value) })}
          />
          <span>{days}d</span>
        </label>
        <button className="sync-btn" onClick={onSync} title={`Sync: ${status} (tap to sync now)`}>
          <span className={`sync-dot ${status}`} />
        </button>
      </div>

      <div className="colheads" style={{ paddingLeft: GUTTER }}>
        {dates.map((d) => {
          const dl = deadlinesForDay(deadlines, d).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
          const maxChips = days > 3 ? 2 : 4;
          return (
            <div key={d} className={`colhead ${d === today ? 'today' : ''}`} style={{ width: colW }}>
              <button
                className="colhead-date"
                onClick={() => {
                  if (days > 1) {
                    setStart(d);
                    setPrefs({ days: 1 });
                  }
                }}
              >
                {colW >= 110
                  ? fmtDate(d, { weekday: true })
                  : colW >= 56
                    ? `${fmtDate(d, { weekday: true }).slice(0, 3)} ${d.slice(5)}`
                    : `${fmtDate(d, { weekday: 'narrow' })} ${fromKey(d).getDate()}`}
              </button>
              {dl.length > 0 && (
                <div className="chips">
                  {dl.slice(0, maxChips).map((x) => (
                    <button
                      key={x.path.map((p) => p.id).join('/')}
                      className={`chip ${x.done ? 'done' : ''} ${!x.done && x.date < today ? 'overdue' : ''}`}
                      style={{ borderColor: x.color || 'var(--navy)' }}
                      onClick={() => onOpenGoal(x.path)}
                    >
                      {x.time && x.date === d && colW >= 90 && <span className="chip-time">{x.time}</span>}⚑ {x.node.title}
                    </button>
                  ))}
                  {dl.length > maxChips && <span className="chip more">+{dl.length - maxChips}</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid" ref={bodyRef}>
        <div className="gutter" style={{ width: GUTTER }}>
          {hours.map((h) =>
            h % hourStep === 0 && h < 24 ? (
              <div key={h} className="hourlabel" style={{ top: (h * 60 - rs) * ppm }}>
                {fmtTime(fromMinutes(h * 60))}
              </div>
            ) : null
          )}
        </div>
        {hours.map((h) => (
          <div key={h} className="hourline" style={{ top: (h * 60 - rs) * ppm, left: GUTTER }} />
        ))}
        {ppm > 0 &&
          dates.map((d, i) => (
            <DayColumn
              key={d}
              dateKey={d}
              data={data}
              deadlines={deadlines}
              left={GUTTER + i * colW}
              width={colW}
              ppm={ppm}
              rs={rs}
              re={re}
              isToday={d === today}
              now={now}
              onOpenEvent={onOpenEvent}
              onOpenGoal={onOpenGoal}
              onCreate={onCreate}
            />
          ))}
      </div>
    </div>
  );
}

function DayColumn({ dateKey, data, deadlines, left, width, ppm, rs, re, isToday, now, onOpenEvent, onOpenGoal, onCreate }) {
  const occs = useMemo(() => occurrencesOn(data.events || [], dateKey), [data, dateKey]);
  const visible = occs.filter((o) => o.end > rs && o.start < re);
  const hiddenBefore = occs.filter((o) => o.end <= rs).length;
  const hiddenAfter = occs.filter((o) => o.start >= re).length;
  const laned = assignLanes(visible.map((o) => ({ ...o, start: Math.max(o.start, rs), end: Math.min(o.end, re) })));
  const timed = deadlines.filter((x) => x.date === dateKey && x.time);
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const min = rs + (e.clientY - rect.top) / ppm;
    const snapped = Math.floor(min / 15) * 15;
    onCreate(dateKey, fromMinutes(snapped));
  };

  return (
    <div className={`daycol ${isToday ? 'today' : ''}`} style={{ left, width }} onClick={handleClick}>
      {laned.map((o) => {
        const w = width / o.lanes;
        return (
          <EventBox
            key={o.ev.id}
            occ={o}
            clipStart={o.start}
            clipEnd={o.end}
            top={(o.start - rs) * ppm}
            left={o.lane * w + 1}
            width={w - 2}
            ppm={ppm}
            dateKey={dateKey}
            color={o.ev.color}
            onOpen={onOpenEvent}
          />
        );
      })}
      {timed.map((x) => {
        const m = toMinutes(x.time);
        if (m < rs || m > re) return null;
        return (
          <button
            key={x.path.map((p) => p.id).join('/')}
            title={`⚑ ${x.node.title} ${x.time}`}
            aria-label={`Deadline: ${x.node.title}`}
            className={`deadline-line ${x.done ? 'done' : ''}`}
            style={{ top: (m - rs) * ppm, borderColor: x.color || 'var(--red)' }}
            onClick={(e) => {
              e.stopPropagation();
              onOpenGoal(x.path);
            }}
          />
        );
      })}
      {isToday && nowMin >= rs && nowMin <= re && <div className="nowline" style={{ top: (nowMin - rs) * ppm }} />}
      {hiddenBefore > 0 && <div className="offrange top">↑{hiddenBefore}</div>}
      {hiddenAfter > 0 && <div className="offrange bottom">↓{hiddenAfter}</div>}
    </div>
  );
}

/**
 * One event (and, recursively, its sub-events). Shows as much as fits:
 *  - room for sub-events  → label strip on the left + nested boxes
 *  - otherwise            → title / time / "+N" depending on size
 */
function EventBox({ occ, clipStart, clipEnd, top, left, width, ppm, dateKey, color, onOpen }) {
  const c = occ.ev.color || color || '#4d7fd9';
  const height = Math.max(2, (clipEnd - clipStart) * ppm);
  const kids = occ.children
    .map((k) => ({ ...k, start: Math.max(k.start, clipStart), end: Math.min(k.end, clipEnd) }))
    .filter((k) => k.end > k.start);
  const innerW = width - STRIP - 2;
  const showKids = kids.length > 0 && innerW >= 34 && height >= 18;
  const hasGoals = (occ.ev.goals || []).some((g) => !g.deleted);

  const open = (e) => {
    e.stopPropagation();
    onOpen(occ.path, dateKey);
  };

  const style = {
    top, left, width: Math.max(2, width), height,
    background: rgba(c, 0.22),
    borderColor: c,
  };

  if (showKids) {
    const laned = assignLanes(kids);
    return (
      <div className="evbox parent" style={style} onClick={open}>
        <div className="strip" style={{ width: STRIP, background: rgba(c, 0.45) }}>
          {height >= 36 && <span className="vtitle">{occ.ev.title}</span>}
        </div>
        {laned.map((k) => {
          const w = innerW / k.lanes;
          return (
            <EventBox
              key={k.ev.id}
              occ={k}
              clipStart={k.start}
              clipEnd={k.end}
              top={(k.start - clipStart) * ppm}
              left={STRIP + 1 + k.lane * w}
              width={w - 1}
              ppm={ppm}
              dateKey={dateKey}
              color={c}
              onOpen={onOpen}
            />
          );
        })}
      </div>
    );
  }

  const hidden = countDescendants(occ);
  const showTitle = height >= 13 && width >= 16;
  const showTime = height >= 30 && width >= 44;
  const showLoc = height >= 44 && width >= 50 && occ.ev.location;
  const showNotes = height >= 72 && width >= 60 && occ.ev.notes;
  return (
    <div className="evbox" style={style} onClick={open} title={occ.ev.title}>
      {showTitle && (
        <div className="evtitle">
          {hasGoals && width >= 40 && <span className="flag">⚑</span>}
          {occ.ev.title}
          {hidden > 0 && width >= 40 && <span className="more">+{hidden}</span>}
        </div>
      )}
      {showTime && (
        <div className="evtime">
          {fmtTime(occ.ev.start)}–{fmtTime(occ.ev.end)}
        </div>
      )}
      {showLoc && <div className="evtime">📍 {occ.ev.location}</div>}
      {showNotes && <div className="evnotes">{occ.ev.notes}</div>}
    </div>
  );
}
