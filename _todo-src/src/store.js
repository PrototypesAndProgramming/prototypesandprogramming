import { useCallback, useEffect, useRef, useState } from 'react';
import { EMPTY, merge, pull, push, sameData } from './sync.js';

const LS_DATA = 'todo.data';
const LS_CONFIG = 'todo.config';
const LS_PREFS = 'todo.prefs';

function load(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}
function save(key, v) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* storage full or blocked — sync still works */
  }
}

export const DEFAULT_PREFS = { dayStart: 6, dayEnd: 23, days: 1 };

export function usePrefs() {
  const [prefs, setPrefs] = useState(() => ({ ...DEFAULT_PREFS, ...load(LS_PREFS, {}) }));
  const update = useCallback((p) => {
    setPrefs((cur) => {
      const n = { ...cur, ...p };
      save(LS_PREFS, n);
      return n;
    });
  }, []);
  return [prefs, update];
}

/**
 * config: { repo: 'owner/name', token } | { local: true } | null
 * status: 'idle' | 'syncing' | 'saved' | 'offline' | 'error'
 */
export function useStore() {
  const [config, setConfigState] = useState(() => load(LS_CONFIG, null));
  const [data, setData] = useState(() => load(LS_DATA, EMPTY));
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  const dataRef = useRef(data);
  const shaRef = useRef(null);
  const timer = useRef(null);
  const busy = useRef(false);
  const dirty = useRef(false);

  const remote = config && config.repo && config.token ? config : null;

  const setConfig = useCallback((c) => {
    save(LS_CONFIG, c);
    shaRef.current = null;
    setConfigState(c);
  }, []);

  const apply = useCallback((d) => {
    dataRef.current = d;
    save(LS_DATA, d);
    setData(d);
  }, []);

  // Pull remote, merge with local, push back if local had newer things.
  const sync = useCallback(async () => {
    if (!remote) return;
    if (busy.current) {
      dirty.current = true;
      return;
    }
    busy.current = true;
    setStatus('syncing');
    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        dirty.current = false;
        const { data: rd, sha } = await pull(remote);
        shaRef.current = sha;
        const merged = merge(dataRef.current, rd);
        if (!sameData(merged, dataRef.current)) apply(merged);
        if (rd && sameData(merged, rd)) break;
        try {
          shaRef.current = await push(remote, merged, sha);
          break;
        } catch (e) {
          if (e.status === 409 || e.status === 422) continue; // someone else saved; retry merge
          throw e;
        }
      }
      setError(null);
      setStatus('saved');
    } catch (e) {
      setError(e.message);
      setStatus(navigator.onLine ? 'error' : 'offline');
    } finally {
      busy.current = false;
      if (dirty.current) {
        clearTimeout(timer.current);
        timer.current = setTimeout(sync, 800);
      }
    }
  }, [remote, apply]);

  // Change data: save locally now, push to GitHub shortly after.
  const update = useCallback(
    (fn) => {
      const next = fn(dataRef.current);
      if (next === dataRef.current) return;
      apply(next);
      if (remote) {
        setStatus('syncing');
        clearTimeout(timer.current);
        timer.current = setTimeout(sync, 1200);
      }
    },
    [apply, remote, sync]
  );

  // Sync on open, when coming back to the app, and when back online.
  useEffect(() => {
    if (!remote) return;
    sync();
    const onVis = () => document.visibilityState === 'visible' && sync();
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('online', sync);
    window.addEventListener('focus', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('online', sync);
      window.removeEventListener('focus', onVis);
    };
  }, [remote, sync]);

  const replaceAll = useCallback(
    (d) => {
      const stamped = {
        version: 1,
        events: (d.events || []).map((e) => ({ ...e, updatedAt: Date.now() })),
        projects: (d.projects || []).map((p) => ({ ...p, updatedAt: Date.now() })),
      };
      update(() => stamped);
    },
    [update]
  );

  // Sign out: forget the token AND the cached copy on this device (it stays in GitHub).
  const lock = useCallback(() => {
    clearTimeout(timer.current);
    try {
      localStorage.removeItem(LS_DATA);
    } catch {
      /* ignore */
    }
    dataRef.current = EMPTY;
    setData(EMPTY);
    setConfig(null);
    setStatus('idle');
  }, [setConfig]);

  return { config, setConfig, data, update, status, error, sync, replaceAll, lock };
}
