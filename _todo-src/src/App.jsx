import { useState } from 'react';
import { todayKey, fromMinutes, toMinutes } from './recurrence.js';
import { useStore, usePrefs } from './store.js';
import DayView from './components/DayView.jsx';
import ProjectsView from './components/ProjectsView.jsx';
import Setup from './components/Setup.jsx';
import EventSheet from './components/EventSheet.jsx';
import GoalSheet from './components/GoalSheet.jsx';

export default function App() {
  const store = useStore();
  const [prefs, setPrefs] = usePrefs();
  const [tab, setTab] = useState('day');
  const [start, setStart] = useState(todayKey());
  const [sheet, setSheet] = useState(null);

  if (!store.config) return <Setup onDone={store.setConfig} />;

  const close = () => setSheet(null);
  const sheetProps = { sheet, data: store.data, update: store.update, open: setSheet, onClose: close };

  return (
    <div className="app">
      <main>
        {tab === 'day' && (
          <DayView
            data={store.data}
            prefs={prefs}
            setPrefs={setPrefs}
            start={start}
            setStart={setStart}
            status={store.status}
            onSync={store.sync}
            onOpenEvent={(path, dateKey) => setSheet({ type: 'event', path, dateKey })}
            onOpenGoal={(path) => setSheet({ type: 'goal', path })}
            onCreate={(dateKey, s) =>
              setSheet({ type: 'event', parentPath: null, dateKey, draft: { start: s, end: fromMinutes(toMinutes(s) + 60) } })
            }
          />
        )}
        {tab === 'projects' && <ProjectsView data={store.data} open={setSheet} />}
      </main>

      {tab === 'day' && (
        <button
          className="fab"
          aria-label="New event"
          onClick={() => setSheet({ type: 'event', parentPath: null, dateKey: start, draft: {} })}
        >
          +
        </button>
      )}

      <nav className="tabbar">
        <button className={tab === 'day' ? 'on' : ''} onClick={() => setTab('day')}>Calendar</button>
        <button className={tab === 'projects' ? 'on' : ''} onClick={() => setTab('projects')}>Projects</button>
      </nav>

      {sheet?.type === 'event' && <EventSheet key={JSON.stringify(sheet)} {...sheetProps} />}
      {sheet?.type === 'goal' && <GoalSheet key={JSON.stringify(sheet)} {...sheetProps} />}
    </div>
  );
}
