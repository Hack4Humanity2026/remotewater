// sim.js — deterministic simulation of truck loads and household deliveries.
// The houses are real (OpenStreetMap building centroids). The delivery log is simulated, because the
// Northern Village does not publish one. In production this log is what the driver app produces.
//
// Assumptions (all parameters, all in config.json):
//   - each truck fills at the plant several times a day (Puvirnituq drivers report 9-10 fills/day, APTN 2025)
//   - a load serves floor(capacityL / householdTankL) homes
//   - each home is served roughly every `deliveryIntervalDays`
//   - routes follow the angle around the village centre, so a truck's homes are spatially close

export function simulate(houses, config, { from, to, seed = 1, chlorineDip = null } = {}) {
  const rnd = mulberry32(seed);
  const trucks = config.trucks;
  const tankL = config.householdTankL;
  const interval = config.deliveryIntervalDays;
  const perLoad = Math.max(3, Math.floor(trucks[0].capacityL / tankL));

  // Route order: sweep by angle around the centroid, then hand contiguous arcs to each truck.
  const cx = avg(houses.map((h) => h.lon)), cy = avg(houses.map((h) => h.lat));
  const ordered = houses.slice().sort((a, b) => Math.atan2(a.lat - cy, a.lon - cx) - Math.atan2(b.lat - cy, b.lon - cx));
  const arcs = trucks.map(() => []);
  ordered.forEach((h, i) => arcs[Math.floor((i * trucks.length) / ordered.length)].push(h));

  const lastServed = new Map(); // houseId -> day index
  houses.forEach((h) => lastServed.set(h.id, -Math.floor(rnd() * interval) - 1)); // stagger the first cycle

  const loads = [], deliveries = [];
  const start = dayStart(from), end = dayStart(to);
  let day = 0;
  for (let t = start; t <= end; t += 86400e3, day++) {
    trucks.forEach((truck, ti) => {
      const due = arcs[ti].filter((h) => day - lastServed.get(h.id) >= interval);
      let clock = t + (7.5 + rnd() * 0.5) * 3600e3; // first fill ~07:30 local
      for (let i = 0; i < due.length; i += perLoad) {
        const batch = due.slice(i, i + perLoad);
        const filledAt = new Date(clock).toISOString();
        const dip = chlorineDip && clock >= Date.parse(chlorineDip.from) && clock <= Date.parse(chlorineDip.to);
        const load = {
          id: `L${String(loads.length + 1).padStart(4, '0')}`,
          truckId: truck.id,
          filledAt,
          freeCl: round2(dip ? chlorineDip.level + rnd() * 0.1 : 0.6 + rnd() * 0.5),
          turbidity: round2(0.2 + rnd() * 0.4),
          emptiedBefore: rnd() < 0.2,
          hypotheticalReading: !!dip
        };
        loads.push(load);
        clock += 12 * 60e3; // fill time
        batch.forEach((h, seq) => {
          clock += (5 + rnd() * 4) * 60e3; // drive + pump
          deliveries.push({
            id: `D${String(deliveries.length + 1).padStart(5, '0')}`,
            loadId: load.id, truckId: truck.id, houseId: h.id,
            at: new Date(clock).toISOString(),
            litres: Math.round(tankL * (0.5 + rnd() * 0.45)),
            seq: seq + 1
          });
          lastServed.set(h.id, day);
        });
        clock += 10 * 60e3; // return to plant
      }
    });
  }
  const routes = Object.fromEntries(trucks.map((tr, i) => [tr.id, arcs[i].map((h) => h.id)]));
  return { loads, deliveries, perLoad, routes };
}

function dayStart(isoDate) {
  // Local day start in Inukjuak (Eastern time). Good enough for a simulation.
  return Date.parse(isoDate + 'T00:00:00-04:00');
}
function avg(a) { return a.reduce((s, x) => s + x, 0) / a.length; }
function round2(x) { return Math.round(x * 100) / 100; }
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
