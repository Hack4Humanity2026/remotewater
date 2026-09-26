// store.js — loads the static data files and holds the driver's offline queue.
// Everything is a small JSON file; no server, no database. The driver queue lives in localStorage so a
// phone with no signal keeps recording loads and deliveries, then syncs when it reaches the plant.

import { simulate } from './sim.js';

export async function loadAll() {
  const [config, housesFc, roadsFc, incident] = await Promise.all([
    getJson('./data/config.json'),
    getJson('./data/houses.geojson'),
    getJson('./data/roads.geojson').catch(() => ({ features: [] })),
    getJson('./data/incident-2026-06.json')
  ]);
  const places = housesFc.features.map((f) => ({
    ...f.properties,
    lon: f.geometry.coordinates[0],
    lat: f.geometry.coordinates[1]
  }));
  const houses = places.filter((p) => p.served);
  const roads = roadsFc.features.map((f) => f.geometry.coordinates);
  const sim = simulate(houses, config, { ...incident.sim, chlorineDip: incident.hypotheticalChlorineDip || null });
  return {
    config, places, houses, roads, incident,
    meta: housesFc.meta || {},
    samples: incident.samples.slice(),
    loads: sim.loads,
    deliveries: sim.deliveries,
    perLoad: sim.perLoad,
    routes: sim.routes
  };
}

async function getJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.json();
}

export function houseById(data, id) {
  return data.houses.find((h) => h.id === id) || null;
}

const KEY = 'remotewater.driverQueue.v1';
export const driverQueue = {
  list() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
  },
  push(evt) {
    const q = this.list();
    q.push({ ...evt, queuedAt: new Date().toISOString() });
    try { localStorage.setItem(KEY, JSON.stringify(q)); } catch { /* private mode: keep going */ }
    return q.length;
  },
  clear() {
    try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  },
  /** Merge queued driver events into the in-memory dataset (what the plant computer does on sync). */
  apply(data) {
    const q = this.list();
    for (const e of q) {
      if (e.type === 'load') data.loads.push(e.load);
      if (e.type === 'delivery') data.deliveries.push(e.delivery);
    }
    this.clear();
    return q.length;
  }
};
