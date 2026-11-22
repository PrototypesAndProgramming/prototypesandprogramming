// Stores data.json in a PRIVATE GitHub repo using the contents API.
// The token never leaves this browser except to talk to api.github.com.

const FILE = 'data.json';

export const EMPTY = { version: 1, events: [], projects: [] };

function b64encode(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

function b64decode(b64) {
  const bin = atob(b64.replace(/\n/g, ''));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function headers(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

export class SyncError extends Error {
  constructor(msg, status) {
    super(msg);
    this.status = status;
  }
}

/** Returns { data, sha } — data is null if the file doesn't exist yet. */
export async function pull({ repo, token }) {
  const res = await fetch(`https://api.github.com/repos/${repo}/contents/${FILE}`, {
    headers: headers(token),
    cache: 'no-store',
  });
  if (res.status === 404) {
    // Either the file doesn't exist yet, or the repo/token is wrong. Check the repo.
    const r = await fetch(`https://api.github.com/repos/${repo}`, { headers: headers(token), cache: 'no-store' });
    if (!r.ok) throw new SyncError('Repo not found, or the token cannot access it.', r.status);
    return { data: null, sha: null };
  }
  if (res.status === 401) throw new SyncError('Token rejected (expired or wrong).', 401);
  if (!res.ok) throw new SyncError(`GitHub error ${res.status}`, res.status);
  const json = await res.json();
  return { data: JSON.parse(b64decode(json.content)), sha: json.sha };
}

/** Writes data; returns new sha. Throws SyncError with status 409/422 on conflict. */
export async function push({ repo, token }, data, sha) {
  const body = {
    message: `todo: update ${new Date().toISOString()}`,
    content: b64encode(JSON.stringify(data, null, 1)),
  };
  if (sha) body.sha = sha;
  const res = await fetch(`https://api.github.com/repos/${repo}/contents/${FILE}`, {
    method: 'PUT',
    headers: { ...headers(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new SyncError(`GitHub save failed (${res.status})`, res.status);
  const json = await res.json();
  return json.content.sha;
}

// ---- merging (phone and computer editing at the same time) ----
// Every top-level event/project has updatedAt; deletes are kept as tombstones.
function mergeList(a = [], b = []) {
  const map = new Map();
  for (const it of a) map.set(it.id, it);
  for (const it of b) {
    const cur = map.get(it.id);
    if (!cur || (it.updatedAt || 0) > (cur.updatedAt || 0)) map.set(it.id, it);
  }
  return [...map.values()];
}

export function merge(local, remote) {
  if (!remote) return local;
  if (!local) return remote;
  return {
    version: 1,
    events: mergeList(local.events, remote.events),
    projects: mergeList(local.projects, remote.projects),
  };
}

export function sameData(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}
