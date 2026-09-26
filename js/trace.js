// trace.js — the core of RemoteWater.
// Pure functions, no DOM, no I/O. Given plant samples, truck loads, deliveries and houses,
// answer: "this lab sample failed; which houses got water from the affected window?"
//
// Data model (all times are ISO 8601 strings):
//   sample   { id, takenAt, resultAt, param: 'ecoli'|'coliform'|'freeCl'|'turbidity', result: 'pass'|'fail', value?, note? }
//   load     { id, truckId, filledAt, freeCl?, turbidity?, emptiedBefore?: boolean }
//   delivery { id, loadId, truckId, houseId, at, litres?, seq }   // seq = position within the load, 1-based
//   house    { id, lot?, lat, lon, kind, phones: [], lang: 'iu'|'en'|'fr', priority?: boolean }

const ms = (iso) => new Date(iso).getTime();

function bacterial(param) {
  return param === 'ecoli' || param === 'coliform';
}

/**
 * The window of plant output that a failed bacteriological sample calls into question.
 * Start: the last sample of the same family that passed BEFORE the failed one was taken.
 *        Water leaving the plant after that clean sample cannot be vouched for.
 * End:   the first sample taken AFTER the failed one that passed. Until such a sample exists,
 *        the window is open (ends at `now`).
 * Conservative on purpose: a lab result arrives days after the sample, so the window always
 * covers water that has already been delivered.
 */
export function badWindow(samples, failedSampleId, { now = new Date().toISOString(), fallbackHours = 24 * 7 } = {}) {
  const failed = samples.find((s) => s.id === failedSampleId);
  if (!failed) throw new Error('unknown sample ' + failedSampleId);
  const sameFamily = (s) => bacterial(s.param) === bacterial(failed.param);
  const sorted = samples.filter(sameFamily).slice().sort((a, b) => ms(a.takenAt) - ms(b.takenAt));
  const before = sorted.filter((s) => s.result === 'pass' && ms(s.takenAt) < ms(failed.takenAt));
  const after = sorted.filter((s) => s.result === 'pass' && ms(s.takenAt) > ms(failed.takenAt));
  const prevPass = before[before.length - 1] || null;
  const nextPass = after[0] || null;
  const start = prevPass ? prevPass.takenAt : new Date(ms(failed.takenAt) - fallbackHours * 3600e3).toISOString();
  const end = nextPass ? nextPass.takenAt : now;
  return { start, end, failed, prevPass, nextPass, open: !nextPass };
}

/** Loads filled at the plant inside the window. */
export function affectedLoads(loads, window) {
  const s = ms(window.start), e = ms(window.end);
  return loads.filter((l) => ms(l.filledAt) >= s && ms(l.filledAt) <= e);
}

/**
 * Deliveries made from affected loads, plus carry-over: a truck is rarely empty when it refills,
 * so the first `carryover` deliveries of the NEXT load on the same truck are included unless the
 * driver marked the tank as emptied before the refill.
 */
export function affectedDeliveries(deliveries, loads, affected, { carryover = 3 } = {}) {
  const affectedIds = new Set(affected.map((l) => l.id));
  const byTruck = groupBy(loads.slice().sort((a, b) => ms(a.filledAt) - ms(b.filledAt)), (l) => l.truckId);
  const carryIds = new Set();
  for (const [, truckLoads] of byTruck) {
    for (let i = 0; i < truckLoads.length - 1; i++) {
      const cur = truckLoads[i], next = truckLoads[i + 1];
      if (affectedIds.has(cur.id) && !next.emptiedBefore && !affectedIds.has(next.id)) carryIds.add(next.id);
    }
  }
  return deliveries
    .filter((d) => affectedIds.has(d.loadId) || (carryIds.has(d.loadId) && d.seq <= carryover))
    .map((d) => ({ ...d, carryover: !affectedIds.has(d.loadId) }));
}

/**
 * Full trace for one failed sample. Returns everything the operator screen needs and the
 * per-house list (priority houses such as the school and clinic first).
 */
export function recall(data, failedSampleId, opts = {}) {
  const window = badWindow(data.samples, failedSampleId, opts);
  const loads = affectedLoads(data.loads, window);
  const deliveries = affectedDeliveries(data.deliveries, data.loads, loads, opts);
  const houseIds = new Set(deliveries.map((d) => d.houseId));
  const houses = data.houses
    .filter((h) => houseIds.has(h.id))
    .sort((a, b) => Number(!!b.priority) - Number(!!a.priority) || String(a.id).localeCompare(String(b.id)));
  const lastDelivery = {};
  for (const d of deliveries) {
    if (!lastDelivery[d.houseId] || ms(d.at) > ms(lastDelivery[d.houseId].at)) lastDelivery[d.houseId] = d;
  }
  return {
    window, loads, deliveries, houses, lastDelivery,
    notAffected: data.houses.filter((h) => !houseIds.has(h.id)),
    stats: {
      housesTotal: data.houses.length,
      housesAffected: houses.length,
      loadsAffected: loads.length,
      deliveriesAffected: deliveries.length,
      share: data.houses.length ? houses.length / data.houses.length : 0
    }
  };
}

/** Which load is in a house's tank at time `at` (most recent delivery at or before `at`). */
export function currentLoadForHouse(data, houseId, at = new Date().toISOString()) {
  const t = ms(at);
  const mine = data.deliveries.filter((d) => d.houseId === houseId && ms(d.at) <= t).sort((a, b) => ms(b.at) - ms(a.at));
  if (!mine.length) return null;
  const load = data.loads.find((l) => l.id === mine[0].loadId) || null;
  return { delivery: mine[0], load };
}

/**
 * Status of one house at time `at`, using only lab results known by then.
 *   red    — the water in the tank came from the affected window (or the window is still open)
 *   green  — never affected, OR a delivery from a load filled after the window closed has arrived
 * A house therefore clears itself the moment it receives post-clean water, instead of waiting for
 * a community-wide lifting date.
 */
export function houseStatus(data, houseId, at = new Date().toISOString(), opts = {}) {
  return allStatuses(data, at, opts).byHouse[houseId] || { level: 'green', reason: 'ok' };
}

/** Status of every house at time `at`, computed with one trace per failed sample. */
export function allStatuses(data, at = new Date().toISOString(), opts = {}) {
  const t = ms(at);
  const known = data.samples.filter((s) => s.resultAt && ms(s.resultAt) <= t);
  const failed = known.filter((s) => s.result === 'fail' && bacterial(s.param));
  const deliveriesSoFar = data.deliveries.filter((d) => ms(d.at) <= t);
  const scoped = { ...data, samples: known, deliveries: deliveriesSoFar };
  const byHouse = {};
  for (const h of data.houses) byHouse[h.id] = { level: 'green', reason: 'ok' };
  const recalls = [];
  for (const f of failed) {
    const r = recall(scoped, f.id, { ...opts, now: at });
    recalls.push(r);
    const affectedDeliveryIds = new Set(r.deliveries.map((d) => d.id));
    for (const h of r.houses) {
      if (byHouse[h.id].level === 'red') continue;
      const cur = currentLoadForHouse(scoped, h.id, at);
      const clean = cur && cur.load && !r.window.open && ms(cur.load.filledAt) > ms(r.window.end) && !affectedDeliveryIds.has(cur.delivery.id);
      byHouse[h.id] = clean
        ? { level: 'green', reason: 'cleared', sample: f, window: r.window, clearedAt: cur.delivery.at }
        : { level: 'red', reason: 'recall', sample: f, window: r.window, affectedDelivery: r.lastDelivery[h.id] };
    }
  }
  const counts = { red: 0, cleared: 0, ok: 0 };
  for (const s of Object.values(byHouse)) counts[s.level === 'red' ? 'red' : s.reason === 'cleared' ? 'cleared' : 'ok']++;
  return { byHouse, recalls, counts, at };
}

function groupBy(arr, keyFn) {
  const m = new Map();
  for (const x of arr) {
    const k = keyFn(x);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(x);
  }
  return m;
}
