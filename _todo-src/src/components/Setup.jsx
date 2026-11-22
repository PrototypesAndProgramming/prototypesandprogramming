import { useState } from 'react';
import { pull } from '../sync.js';

export const DEFAULT_REPO = 'PrototypesAndProgramming/todo-data';

export default function Setup({ onDone, initial }) {
  const [repo, setRepo] = useState(initial?.repo || DEFAULT_REPO);
  const [token, setToken] = useState('');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const connect = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const cfg = { repo: repo.trim(), token: token.trim() };
    try {
      await pull(cfg);
      onDone(cfg);
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="setup">
      <form onSubmit={connect}>
        <h1>Unlock</h1>
        <p className="soft">Your data lives in a private GitHub repo. Paste a token that can read and write it.</p>
        <label className="field">
          <span>Data repo</span>
          <input value={repo} onChange={(e) => setRepo(e.target.value)} autoCapitalize="off" autoCorrect="off" />
        </label>
        <label className="field">
          <span>Access token</span>
          <input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="github_pat_…" autoComplete="current-password" />
        </label>
        {msg && <div className="warn">{msg}</div>}
        <button className="btn primary" disabled={busy || !token}>{busy ? 'Checking…' : 'Connect'}</button>
        <button type="button" className="btn ghost" onClick={() => onDone({ local: true })}>
          Use on this device only (no sync)
        </button>
      </form>
    </div>
  );
}
