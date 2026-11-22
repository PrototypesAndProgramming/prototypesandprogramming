import test from 'node:test';
import assert from 'node:assert/strict';
import { rootOccursOn, childOccursOn, occurrencesOn, assignLanes, addDays, daysBetween } from './recurrence.js';

test('Tue/Thu until Dec 14', () => {
  // 2026-11-24 is a Tuesday
  const ev = { date: '2026-11-24', repeat: { freq: 'weekly', days: [2, 4], until: '2026-12-14' } };
  assert.equal(rootOccursOn(ev, '2026-11-24'), true);
  assert.equal(rootOccursOn(ev, '2026-11-26'), true); // Thu
  assert.equal(rootOccursOn(ev, '2026-11-25'), false); // Wed
  assert.equal(rootOccursOn(ev, '2026-12-10'), true); // Thu
  assert.equal(rootOccursOn(ev, '2026-12-15'), false); // after until
  assert.equal(rootOccursOn(ev, '2026-11-19'), false); // before start
});

test('skip suppresses one occurrence', () => {
  const ev = { date: '2026-11-24', repeat: { freq: 'weekly', days: [2, 4] }, skip: ['2026-11-26'] };
  assert.equal(rootOccursOn(ev, '2026-11-26'), false);
  assert.equal(rootOccursOn(ev, '2026-12-01'), true);
});

test('every 2 weeks', () => {
  const ev = { date: '2026-11-23', repeat: { freq: 'weekly', interval: 2, days: [1, 3] } };
  assert.equal(rootOccursOn(ev, '2026-11-25'), true);
  assert.equal(rootOccursOn(ev, '2026-11-30'), false);
  assert.equal(rootOccursOn(ev, '2026-12-07'), true);
});

test('daily interval and monthly', () => {
  assert.equal(rootOccursOn({ date: '2026-11-01', repeat: { freq: 'daily', interval: 3 } }, '2026-11-07'), true);
  assert.equal(rootOccursOn({ date: '2026-11-01', repeat: { freq: 'daily', interval: 3 } }, '2026-11-08'), false);
  assert.equal(rootOccursOn({ date: '2026-01-15', repeat: { freq: 'monthly' } }, '2026-03-15'), true);
  assert.equal(rootOccursOn({ date: '2026-01-15', repeat: { freq: 'monthly' } }, '2026-03-16'), false);
});

test('DST-safe day math', () => {
  assert.equal(daysBetween('2026-11-01', '2026-11-02'), 1);
  assert.equal(addDays('2026-03-07', 2), '2026-03-09');
});

test('nested children with weekday filter and skip', () => {
  const school = {
    id: 's', start: '08:00', end: '15:00', date: '2026-11-23',
    repeat: { freq: 'weekly', days: [1, 2, 3, 4, 5] },
    children: [
      { id: 'm', start: '08:00', end: '09:00', days: [1, 3, 5],
        children: [{ id: 'q', start: '08:30', end: '08:45', skip: ['2026-11-25'] }] },
      { id: 'p', start: '09:00', end: '10:00' },
    ],
  };
  const mon = occurrencesOn([school], '2026-11-23');
  assert.equal(mon[0].children.length, 2);
  assert.equal(mon[0].children[0].children.length, 1);
  assert.deepEqual(mon[0].children[0].children[0].path, [{ key: 'events', id: 's' }, { key: 'children', id: 'm' }, { key: 'children', id: 'q' }]);
  const tue = occurrencesOn([school], '2026-11-24');
  assert.equal(tue[0].children.length, 1);
  const wed = occurrencesOn([school], '2026-11-25');
  assert.equal(wed[0].children[0].children.length, 0);
  assert.equal(childOccursOn({ days: [2] }, '2026-11-24'), true);
});

test('lanes', () => {
  const r = assignLanes([{ start: 0, end: 60 }, { start: 30, end: 90 }, { start: 100, end: 120 }]);
  assert.deepEqual(r.map((x) => [x.lane, x.lanes]), [[0, 2], [1, 2], [0, 1]]);
});
