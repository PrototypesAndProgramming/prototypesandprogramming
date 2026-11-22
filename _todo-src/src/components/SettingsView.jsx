import { useRef } from 'react';
import { Field } from './ui.jsx';

export default function SettingsView({ store, prefs, setPrefs }) {
  const { config, setConfig, status, error, sync, data, replaceAll } = store;
  const fileRef = useRef(null);
  const hours = Array.from({ length: 25 }, (_, i) => i);

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `todo-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importData = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const d = JSON.parse(await file.text());
      if (!Array.isArray(d.events) || !Array.isArray(d.projects)) throw new Error('Not a todo backup file');
      if (confirm('Import this backup? It will be merged with what is here now.')) replaceAll(d);
    } catch (err) {
      alert(err.message);
    }
    e.target.value = '';
  };

  return (
    <div className="scrollpage">
      <h2>Sync</h2>
      {config?.repo ? (
        <>
          <div className="meta">Repo: {config.repo}</div>
          <div className="meta">Status: {status}{error ? ` — ${error}` : ''}</div>
          <div className="btnrow">
            <button className="btn" onClick={sync}>Sync now</button>
            <button className="btn danger" onClick={() => confirm('Remove the token and cached data from this device? Everything stays safe in GitHub.') && store.lock()}>
              Lock / sign out
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="meta">Not syncing — data is only on this device.</div>
          <button className="btn" onClick={() => setConfig(null)}>Set up GitHub sync</button>
        </>
      )}

      <h2>Day view</h2>
      <div className="row2">
        <Field label="Day starts">
          <select value={prefs.dayStart} onChange={(e) => setPrefs({ dayStart: Math.min(Number(e.target.value), prefs.dayEnd - 1) })}>
            {hours.slice(0, 24).map((h) => <option key={h} value={h}>{h}:00</option>)}
          </select>
        </Field>
        <Field label="Day ends">
          <select value={prefs.dayEnd} onChange={(e) => setPrefs({ dayEnd: Math.max(Number(e.target.value), prefs.dayStart + 1) })}>
            {hours.slice(1).map((h) => <option key={h} value={h}>{h}:00</option>)}
          </select>
        </Field>
      </div>

      <h2>Backup</h2>
      <div className="btnrow">
        <button className="btn" onClick={exportData}>Export JSON</button>
        <button className="btn" onClick={() => fileRef.current.click()}>Import JSON</button>
        <input ref={fileRef} type="file" accept="application/json" hidden onChange={importData} />
      </div>
    </div>
  );
}
