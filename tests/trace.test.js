import test from 'node:test';
import assert from 'node:assert/strict';
import { badWindow, affectedLoads, affectedDeliveries, recall, houseStatus } from '../js/trace.js';
import { daysUntilBelow, chlorineAfter } from '../js/decay.js';

const houses = [
  { id: 'H1', lat: 0, lon: 0, kind: 'house', phones: ['+1'], lang: 'iu' },
  { id: 'H2', lat: 0, lon: 0, kind: 'house', phones: ['+2'], lang: 'en' },
  { id: 'H3', lat: 0, lon: 0, kind: 'school', phones: ['+3'], lang: 'fr', priority: true },
  { id: 'H4', lat: 0, lon: 0, kind: 'house', phones: ['+4'], lang: 'iu' },
  { id: 'H5', lat: 0, lon: 0, kind: 'house', phones: ['+5'], lang: 'iu' }
];
const samples = [
  { id: 'S1', takenAt: '2026-06-02T09:00:00Z', resultAt: '2026-06-04T09:00:00Z', param: 'ecoli', result: 'pass' },
  { id: 'S2', takenAt: '2026-06-09T09:00:00Z', resultAt: '2026-06-11T09:00:00Z', param: 'ecoli', result: 'fail' },
  { id: 'S3', takenAt: '2026-06-13T09:00:00Z', resultAt: '2026-06-15T09:00:00Z', param: 'ecoli', result: 'pass' }
];
const loads = [
  { id: 'L1', truckId: 'W1', filledAt: '2026-06-01T08:00:00Z' }, // before window
  { id: 'L2', truckId: 'W1', filledAt: '2026-06-05T08:00:00Z' }, // in window
  { id: 'L3', truckId: 'W1', filledAt: '2026-06-14T08:00:00Z' }, // after window: carry-over only
  { id: 'L4', truckId: 'W2', filledAt: '2026-06-10T08:00:00Z' }, // in window
  { id: 'L5', truckId: 'W2', filledAt: '2026-06-14T08:00:00Z', emptiedBefore: true } // after, truck emptied: no carry-over
];
const deliveries = [
  { id: 'D1', loadId: 'L1', truckId: 'W1', houseId: 'H1', at: '2026-06-01T09:00:00Z', seq: 1 },
  { id: 'D2', loadId: 'L2', truckId: 'W1', houseId: 'H2', at: '2026-06-05T09:00:00Z', seq: 1 },
  { id: 'D3', loadId: 'L3', truckId: 'W1', houseId: 'H3', at: '2026-06-14T09:00:00Z', seq: 1 },
  { id: 'D4', loadId: 'L3', truckId: 'W1', houseId: 'H4', at: '2026-06-14T10:00:00Z', seq: 5 },
  { id: 'D5', loadId: 'L4', truckId: 'W2', houseId: 'H4', at: '2026-06-10T09:00:00Z', seq: 1 },
  { id: 'D6', loadId: 'L5', truckId: 'W2', houseId: 'H5', at: '2026-06-14T09:00:00Z', seq: 1 }
];
const data = { houses, samples, loads, deliveries };

test('bad window runs from last clean sample to next clean sample', () => {
  const w = badWindow(samples, 'S2');
  assert.equal(w.start, '2026-06-02T09:00:00Z');
  assert.equal(w.end, '2026-06-13T09:00:00Z');
  assert.equal(w.open, false);
});

test('window stays open until a clean sample exists', () => {
  const w = badWindow(samples.slice(0, 2), 'S2', { now: '2026-06-11T12:00:00Z' });
  assert.equal(w.end, '2026-06-11T12:00:00Z');
  assert.equal(w.open, true);
});

test('loads inside the window are affected', () => {
  const w = badWindow(samples, 'S2');
  assert.deepEqual(affectedLoads(loads, w).map((l) => l.id), ['L2', 'L4']);
});

test('carry-over includes the first deliveries of the next load unless the truck was emptied', () => {
  const w = badWindow(samples, 'S2');
  const d = affectedDeliveries(deliveries, loads, affectedLoads(loads, w), { carryover: 3 });
  assert.deepEqual(d.map((x) => x.id).sort(), ['D2', 'D3', 'D5']);
  assert.equal(d.find((x) => x.id === 'D3').carryover, true);
});

test('recall lists affected houses, priority first, and the rest as not affected', () => {
  const r = recall(data, 'S2', { carryover: 3 });
  assert.deepEqual(r.houses.map((h) => h.id), ['H3', 'H2', 'H4']);
  assert.deepEqual(r.notAffected.map((h) => h.id), ['H1', 'H5']);
  assert.equal(r.stats.housesAffected, 3);
});

test('house status is red only once the failed result is known', () => {
  assert.equal(houseStatus(data, 'H2', '2026-06-10T00:00:00Z').level, 'green');
  assert.equal(houseStatus(data, 'H2', '2026-06-11T10:00:00Z').level, 'red');
  assert.equal(houseStatus(data, 'H1', '2026-06-11T10:00:00Z').level, 'green');
});

test('chlorine decay is monotone and safe-until is finite', () => {
  assert.ok(chlorineAfter(1.0, 2) < chlorineAfter(1.0, 1));
  assert.ok(daysUntilBelow(1.0, 0.2) > 0 && Number.isFinite(daysUntilBelow(1.0, 0.2)));
  assert.equal(daysUntilBelow(0.1, 0.2), 0);
});
