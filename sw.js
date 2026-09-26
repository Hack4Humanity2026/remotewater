// Offline cache. Everything the app needs is static and small (a few hundred KB, mostly map data),
// so we cache it all on install. Network-first with cache fallback: a fresh deploy is picked up
// when there is signal, and the last good copy is served when there is none.
const CACHE = 'remotewater-v4';
const ASSETS = [
  './', './index.html', './css/app.css',
  './js/app.js', './js/trace.js', './js/decay.js', './js/i18n.js', './js/sim.js', './js/sms.js', './js/map.js', './js/store.js',
  './data/config.json', './data/houses.geojson', './data/roads.geojson', './data/incident-2026-06.json', './manifest.webmanifest'
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS).catch(() => {})));
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match(e.request))
  );
});
