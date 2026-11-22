import test from 'node:test';
import assert from 'node:assert/strict';
import { addNode, patchNode, removeNode, moveNode, getNode, progress, nextUp, allDeadlines, isDone } from './tree.js';

const P = (id, extra = {}) => ({ id, title: id, children: [], ...extra });

test('robot project: ordered steps, nested progress, next up', () => {
  let d = { events: [], projects: [] };
  d = addNode(d, null, 'projects', P('robot', { deadline: '2027-01-10' }));
  const robot = [{ key: 'projects', id: 'robot' }];
  for (const s of ['chassis', 'intake', 'chainbar']) d = addNode(d, robot, 'children', P(s));
  const cb = [...robot, { key: 'children', id: 'chainbar' }];
  for (const s of ['cad', 'print', 'assemble', 'test']) d = addNode(d, cb, 'children', P(s, { deadline: '2027-01-05' }));

  assert.deepEqual(progress(getNode(d, robot)), { done: 0, total: 6 });
  assert.deepEqual(nextUp(getNode(d, robot)).map((n) => n.id), ['robot', 'chassis']);

  d = patchNode(d, [...robot, { key: 'children', id: 'chassis' }], { done: true });
  d = patchNode(d, [...robot, { key: 'children', id: 'intake' }], { done: true });
  d = patchNode(d, [...cb, { key: 'children', id: 'cad' }], { done: true });
  assert.deepEqual(nextUp(getNode(d, robot)).map((n) => n.id), ['robot', 'chainbar', 'print']);
  assert.deepEqual(progress(getNode(d, robot)), { done: 3, total: 6 });

  d = moveNode(d, [...cb, { key: 'children', id: 'test' }], -1);
  assert.deepEqual(getNode(d, cb).children.map((c) => c.id), ['cad', 'print', 'test', 'assemble']);

  for (const s of ['print', 'test', 'assemble']) d = patchNode(d, [...cb, { key: 'children', id: s }], { done: true });
  assert.equal(isDone(getNode(d, robot)), true);
  assert.equal(allDeadlines(d).length, 5);
});

test('goals on sub-events and tombstone delete', () => {
  let d = { events: [P('school')], projects: [] };
  const school = [{ key: 'events', id: 'school' }];
  d = addNode(d, school, 'children', P('math'));
  d = addNode(d, [...school, { key: 'children', id: 'math' }], 'goals', P('proj2', { deadline: '2026-12-05' }));
  const dl = allDeadlines(d);
  assert.equal(dl.length, 1);
  assert.deepEqual(dl[0].labels, ['school', 'math', 'proj2']);
  d = removeNode(d, school);
  assert.equal(d.events[0].deleted, true);
  assert.equal(allDeadlines(d).length, 0);
});
