import test from 'node:test';
import assert from 'node:assert/strict';
import { merge, pull, push } from './sync.js';

test('merge keeps newer edits from each side, tombstones win when newer', () => {
  const local = { events: [{ id: 'a', title: 'A2', updatedAt: 5 }, { id: 'b', title: 'B', updatedAt: 1 }], projects: [] };
  const remote = { events: [{ id: 'a', title: 'A1', updatedAt: 3 }, { id: 'b', deleted: true, updatedAt: 4 }, { id: 'c', title: 'C', updatedAt: 2 }], projects: [] };
  const m = merge(local, remote);
  assert.deepEqual(m.events.map((e) => e.title || 'DEL'), ['A2', 'DEL', 'C']);
});

test('push/pull round-trip with unicode through a fake GitHub', async () => {
  let stored = null;
  globalThis.fetch = async (url, opts = {}) => {
    if (opts.method === 'PUT') {
      const body = JSON.parse(opts.body);
      stored = body.content;
      return { ok: true, status: 200, json: async () => ({ content: { sha: 'abc' } }) };
    }
    if (!stored) return { ok: false, status: 404 };
    return { ok: true, status: 200, json: async () => ({ content: stored, sha: 'abc' }) };
  };
  const cfg = { repo: 'x/y', token: 't' };
  const data = { version: 1, events: [{ id: '1', title: 'Calc — “Project” ✓ ⚑' }], projects: [] };
  assert.equal(await push(cfg, data, null), 'abc');
  const r = await pull(cfg);
  assert.deepEqual(r.data, data);
});
