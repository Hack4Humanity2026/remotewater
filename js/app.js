// app.js — screens. Hash router, no framework.
//   #overview public zone quality overview (default)
//   #notice  simulated notice channels (Facebook, radio, SMS, household contact)
//   #replay  the June 2026 incident, step by step (the demo)
//   #plant   operator: samples, loads, trace, notifications
//   #lab     water lab: receive and record sample results
//   #truck   driver: new load, deliveries, offline queue
//   #home    household: one big status card
import { loadAll, houseById, driverQueue } from './store.js';
import { recall, allStatuses, currentLoadForHouse } from './trace.js';
import { safeUntil, chlorineAfter } from './decay.js';
import { LANGS, setLang, getLang, tr, t, fmtDate, fmtDay } from './i18n.js';
import { compose } from './sms.js';
import { renderMap } from './map.js';

const state = {
  data: null,
  now: '',
  demoActive: false,
  view: 'overview',
  persona: 'overview',
  houseId: null,
  selectedZone: null,
  ops: null,
  truckId: 'W1',
  currentLoadId: null,
  step: 0,
  sent: new Set(),
  showAll: false
};

const NOTICE_KEY = 'remotewater.notice.v1';
const OPS_KEY = 'remotewater.ops.v1';

const $ = (sel, root = document) => root.querySelector(sel);
const h = (html) => { const tpl = document.createElement('template'); tpl.innerHTML = html.trim(); return tpl.content; };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ms = (iso) => new Date(iso).getTime();

// ---------- boot ----------
(async function boot() {
  try {
    state.data = await loadAll();
  } catch (e) {
    $('#main').innerHTML = `<div class="card"><h2>Could not load data</h2><p>${esc(e.message)}</p><p>Serve the folder over HTTP (for example <code>python -m http.server 8080</code>) rather than opening index.html directly.</p></div>`;
    return;
  }
  setLang(localStorage.getItem('rw.lang') || 'en');
  state.notice = readNotice(state.data);
  state.ops = readOps(state.data);
  state.houseId = state.data.houses.find((x) => x.kind === 'clinic')?.id || state.data.houses[0].id;
  $('#clock').addEventListener('change', (e) => {
    if (!e.target.value) { state.now = ''; state.demoActive = false; render(); return; }
    state.now = new Date(e.target.value).toISOString(); state.demoActive = true; render();
  });
  $('#persona').addEventListener('change', (e) => { location.hash = '#' + e.target.value; });
  window.addEventListener('hashchange', route);
  route();
})();

function route() {
  const [view, arg] = (location.hash.replace('#', '') || 'overview').split('/');
  state.view = ['overview', 'notice', 'replay', 'plant', 'lab', 'truck', 'home'].includes(view) ? view : 'overview';
  state.persona = state.view;
  if (view === 'home' && arg && houseById(state.data, arg)) state.houseId = arg;
  if (view === 'overview' && arg) state.selectedZone = arg;
  render();
}

function setNow(iso) { state.now = new Date(iso).toISOString(); }

// ---------- derived ----------
function statuses() { return allStatuses(state.data, state.now, { carryover: state.data.config.carryoverDeliveries }); }

/** Every SMS the system would have sent up to `now`, derived from the data. */
function notificationsUpTo(now) {
  const d = state.data, out = [];
  const known = d.samples.filter((s) => s.resultAt && ms(s.resultAt) <= ms(now));
  for (const f of known.filter((s) => s.result === 'fail')) {
    const at = new Date(ms(f.resultAt) + 5 * 60e3).toISOString();
    const r = recall({ ...d, samples: known.filter((s) => ms(s.resultAt) <= ms(f.resultAt)), deliveries: d.deliveries.filter((x) => ms(x.at) <= ms(f.resultAt)) }, f.id, { now: f.resultAt, carryover: d.config.carryoverDeliveries });
    for (const hh of r.houses) out.push({ at, house: hh, kind: 'boil', date: r.lastDelivery[hh.id]?.at });
    for (const hh of r.notAffected) out.push({ at, house: hh, kind: 'notAffected' });
    // Homes that receive affected water AFTER the alert (the window is still open) are told at delivery time.
    const rNow = recall({ ...d, samples: known, deliveries: d.deliveries.filter((x) => ms(x.at) <= ms(now)) }, f.id, { now, carryover: d.config.carryoverDeliveries });
    const already = new Set(r.houses.map((x) => x.id));
    for (const hh of rNow.houses) {
      if (already.has(hh.id)) continue;
      const first = rNow.deliveries.filter((x) => x.houseId === hh.id).sort((a, b) => ms(a.at) - ms(b.at))[0];
      if (first) out.push({ at: new Date(ms(first.at) + 5 * 60e3).toISOString(), house: hh, kind: 'boil', date: first.at });
    }
    const nextPass = d.samples.find((s) => s.result === 'pass' && ms(s.takenAt) > ms(f.takenAt) && s.resultAt && ms(s.resultAt) <= ms(now));
    if (nextPass) {
      const st = allStatuses(d, now, { carryover: d.config.carryoverDeliveries }).byHouse;
      for (const hh of rNow.houses) {
        const s = st[hh.id];
        if (s && s.reason === 'cleared') out.push({ at: new Date(Math.max(ms(s.clearedAt), ms(nextPass.resultAt)) + 5 * 60e3).toISOString(), house: hh, kind: 'clear', date: s.clearedAt });
      }
    }
  }
  return out.filter((n) => ms(n.at) <= ms(now)).sort((a, b) => ms(a.at) - ms(b.at));
}

function placeStatus(st) {
  return (p) => {
    if (p.kind === 'plant') return { level: 'plant', label: 'Water treatment plant' };
    if (!p.served) return { level: 'none', label: 'not served' };
    const s = st.byHouse[p.id];
    if (!s) return { level: 'none', label: '' };
    return { level: s.level, label: s.level === 'red' ? t('statusRed') : t('statusGreen') };
  };
}

// ---------- render ----------
function render() {
  document.documentElement.lang = getLang();
  $('#clock').value = toLocalInput(state.now);
  $('#clock').closest('.clock').hidden = state.view === 'notice' && state.demoActive;
  $('#tabs').innerHTML = [['overview', 'tabOverview'], ['replay', 'tabReplay']]
    .map(([v, k]) => `<a href="#${v}" ${state.view === v ? 'aria-current="page"' : ''}>${esc(t(k))}</a>`).join('');
  $('#persona').value = state.persona === 'notice' ? 'notice' : state.persona;
  $('#langs').innerHTML = Object.entries(LANGS).map(([k, v]) => `<button type="button" data-lang="${k}" aria-pressed="${getLang() === k}">${v}</button>`).join('');
  $('#langs').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { setLang(b.dataset.lang); localStorage.setItem('rw.lang', b.dataset.lang); render(); }));
  const main = $('#main');
  main.innerHTML = '';
  main.appendChild(state.demoActive ? { overview: viewOverview, notice: viewNotice, replay: viewReplay, plant: viewPlant, lab: viewLab, truck: viewTruck, home: viewHome }[state.view]() : viewBlankSlate());
  $('#clock').value = toLocalInput(state.now); // the replay may have moved the clock
  if (!state.demoActive) return;
  document.querySelectorAll('svg.map').forEach((svg) => {
    const st = statuses();
    renderMap(svg, { places: state.data.places, roads: state.data.roads }, placeStatus(st), (p) => { state.houseId = p.id; location.hash = '#home/' + p.id; }, state.houseId);
  });
}

function viewBlankSlate() {
  const frag = h(`
    <div class="blank-slate card" role="status" aria-live="polite">
      <span class="badge assumed">Demo data hidden</span>
      <h2>Start with a demo date</h2>
      <p>Choose a date and time in the <b>Demo date/time</b> control above to load the fictional Inukjuak snapshot.</p>
      <p class="muted small">Until you choose a date, the map, notices, samples, batches, households and replay stay empty. This keeps the demo separate from real community data.</p>
    </div>`);
  return frag;
}

function label(key) {
  const { text, fallback } = tr(key);
  return esc(text) + (fallback && getLang() === 'iu' ? `<span class="pending" lang="en">${esc(t('pendingIu'))}</span>` : '');
}

function legend() {
  return `<div class="legend" aria-hidden="true"><span class="lg-green">${esc(t('statusGreen'))}</span><span class="lg-red">${esc(t('statusRed'))}</span><span class="lg-prio">School / clinic / daycare</span><span class="lg-plant">Water plant</span><span class="lg-grey">Not served</span></div>`;
}

// ---------- PUBLIC OVERVIEW ----------
function readNotice(data) {
  const fallback = {
    active: true,
    demo: true,
    id: 'A-014',
    revision: 1,
    scope: 'Inukjuak · demo notice',
    authority: 'Water treatment plant',
    issuedAt: '2026-06-05T16:05:00-04:00',
    instruction: 'Boil water for 1 minute before drinking, cooking, brushing teeth or making baby formula.',
    channels: {
      facebook: { state: 'ready', publishedAt: '' },
      radio: { state: 'ready', airedAt: '' },
      sms: { state: 'ready', acceptedAt: '' },
      households: { state: 'open', attempted: 0, informed: 0, total: data?.houses?.length || 0 }
    }
  };
  try {
    const saved = JSON.parse(localStorage.getItem(NOTICE_KEY) || 'null');
    if (!saved) return fallback;
    return {
      ...fallback, ...saved, demo: saved.demo ?? fallback.demo,
      channels: { ...fallback.channels, ...(saved.channels || {}), households: { ...fallback.channels.households, ...(saved.channels?.households || {}) } }
    };
  } catch { return fallback; }
}

function saveNotice() {
  try { localStorage.setItem(NOTICE_KEY, JSON.stringify(state.notice)); } catch { /* private mode: keep the screen usable */ }
}

function readOps(data) {
  const fallback = { batches: [], samples: [], strips: [] };
  try {
    const saved = JSON.parse(localStorage.getItem(OPS_KEY) || 'null');
    if (!saved) return fallback;
    return { ...fallback, ...saved, batches: saved.batches || [], samples: saved.samples || [], strips: saved.strips || [] };
  } catch { return fallback; }
}

function saveOps() {
  try { localStorage.setItem(OPS_KEY, JSON.stringify(state.ops)); } catch { /* private mode: keep the screen usable */ }
}

function newRecordId(prefix) { return `${prefix}-${Date.now().toString(36).toUpperCase()}`; }

function zoneSummaries() {
  const houses = state.data.houses;
  const lats = houses.map((h) => +h.lat), lons = houses.map((h) => +h.lon);
  const midLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const midLon = (Math.min(...lons) + Math.max(...lons)) / 2;
  const groups = { North: [], Central: [], South: [], East: [] };
  const st = statuses().byHouse;
  for (const h of houses) {
    const north = +h.lat >= midLat, east = +h.lon >= midLon;
    const name = north ? (east ? 'Central' : 'North') : (east ? 'East' : 'South');
    groups[name].push(h);
  }
  return Object.entries(groups).map(([name, items]) => {
    const opBatches = (state.ops?.batches || []).filter((b) => b.zone === name);
    const opBatchIds = new Set(opBatches.map((b) => b.id));
    const opSamples = (state.ops?.samples || []).filter((s) => opBatchIds.has(s.batchId));
    const red = items.filter((h) => st[h.id]?.level === 'red').length + opSamples.filter((s) => s.result === 'fail').length;
    const pendingSamples = state.data.samples.filter((s) => !s.resultAt || ms(s.resultAt) > ms(state.now)).length;
    const pendingOps = opSamples.filter((s) => s.status === 'pending').length;
    const level = red ? 'red' : (pendingSamples || pendingOps) ? 'amber' : items.length ? 'green' : 'none';
    const labels = { red: 'Needs attention', amber: 'Awaiting results', green: 'Results within limits', none: 'No current data' };
    const loads = new Set([...items.map((h) => currentLoadForHouse(state.data, h.id, state.now)?.load?.id).filter(Boolean), ...opBatches.map((b) => b.id)]);
    return { name, houses: items, red, level, label: labels[level], loads: [...loads] };
  });
}

function viewOverview() {
  const zones = zoneSummaries();
  const selected = zones.find((z) => z.name === state.selectedZone) || null;
  const notice = state.notice;
  const selectedOps = selected ? (state.ops?.batches || []).filter((b) => b.zone === selected.name).slice().reverse() : [];
  const frag = h(`
    <div class="grid overview">
      ${notice.active ? `<div class="card span2 advisory" role="status" aria-live="polite">
        <div><span class="badge assumed">${notice.demo ? 'Demo notice' : 'Official notice'} · revision ${esc(notice.revision)}</span><h2>${esc(notice.scope)}</h2>
        <p><b>${esc(notice.instruction)}</b></p><p class="muted small">Issued ${esc(fmtDate(notice.issuedAt))} by ${esc(notice.authority)}. This hackathon demo simulates local Facebook, radio, SMS and household contact.</p></div>
        <a class="button-link secondary" href="#notice">Share / update notice</a>
      </div>` : ''}
      <div class="card span2 overview-intro"><h2>Water quality by zone</h2><p class="muted">Select a zone to see delivered batches and recorded test evidence.</p><div class="row"><span class="muted small">Demo snapshot ${esc(fmtDate(state.now))}</span><a class="button-link ghost" href="#replay">Open demo</a></div></div>
      <div class="card span2"><div class="zone-grid" role="list" aria-label="Water quality by delivery zone">
        ${zones.map((z) => `<button type="button" class="zone-card ${z.level} ${selected?.name === z.name ? 'selected' : ''}" data-zone="${esc(z.name)}" aria-pressed="${selected?.name === z.name}"><span class="zone-name">${esc(z.name)}</span><span class="zone-status">${z.level === 'red' ? '!' : z.level === 'amber' ? '◷' : z.level === 'green' ? '✓' : '?'} ${esc(z.label)}</span><span class="zone-meta">${z.houses.length} buildings · ${z.loads.length} recent batches</span></button>`).join('')}
      </div></div>
      <div class="card span2"><h2>Village map</h2><svg class="map" role="img" aria-label="Map of Inukjuak buildings coloured by recorded water status"></svg>${legend()}</div>
      ${selected ? `<div class="card span2 zone-detail" id="zone-detail"><div class="row"><h2 class="grow">${esc(selected.name)} zone</h2><button type="button" class="ghost" id="close-zone">Close</button></div><p class="status-line ${selected.level}">${selected.level === 'red' ? '!' : selected.level === 'amber' ? '◷' : selected.level === 'green' ? '✓' : '?'} ${esc(selected.label)}</p><p>${selected.red ? `${selected.red} building${selected.red === 1 ? '' : 's'} linked to a flagged result. ` : ''}${selected.loads.length ? `${selected.loads.length} delivered batch${selected.loads.length === 1 ? '' : 'es'} in the current record.` : 'No current delivery is recorded.'}</p>${selectedOps.length ? `<h3>Registered batches</h3><ul class="list compact">${selectedOps.map((batch) => { const sample = (state.ops?.samples || []).find((s) => s.id === batch.sampleId); const label = sample?.result === 'fail' ? 'Needs attention' : sample?.result === 'pass' ? 'Results recorded' : 'Awaiting lab'; return `<li><span class="grow"><b>${esc(batch.id)}</b> · ${esc(batch.truckId)} · ${esc(batch.volumeL)} L <span class="muted small">${esc(fmtDate(batch.registeredAt))}</span></span><span class="badge ${sample?.result === 'fail' ? 'assumed' : sample?.result === 'pass' ? 'fact' : 'hyp'}">${esc(label)}</span></li>`; }).join('')}</ul>` : ''}<ul class="list compact">${selected.houses.slice(0, 8).map((house) => { const s = statuses().byHouse[house.id]; const cur = currentLoadForHouse(state.data, house.id, state.now); return `<li><span class="grow">${esc(house.name || house.id)} <span class="muted small">${esc(cur?.load?.id || 'no batch')}</span></span><span class="badge ${s?.level === 'red' ? 'assumed' : 'fact'}">${s?.level === 'red' ? 'Needs attention' : 'Recorded'}</span></li>`; }).join('')}</ul>${selected.houses.length > 8 ? `<p class="muted small">Showing 8 of ${selected.houses.length} buildings. Open a building from the map for its detail.</p>` : ''}</div>` : ''}
    </div>`);
  frag.querySelectorAll('[data-zone]').forEach((button) => button.addEventListener('click', () => { state.selectedZone = button.dataset.zone; location.hash = '#overview/' + encodeURIComponent(state.selectedZone); }));
  frag.querySelector('#close-zone')?.addEventListener('click', () => { state.selectedZone = null; location.hash = '#overview'; });
  return frag;
}

function noticeChannelState(channel) {
  const names = { ready: 'Ready to simulate', published: 'Simulated post published', aired: 'Simulated broadcast aired', accepted: 'Simulated SMS accepted', open: 'Open route' };
  return names[channel?.state] || 'Needs action';
}

function noticePostText() {
  const n = state.notice;
  return `RemoteWater notice ${n.id} · revision ${n.revision}\n${n.scope}\n\n${n.instruction}\n\nIssued ${fmtDate(n.issuedAt)} by ${n.authority}. Next update: check the village notice channels.`;
}

function copyText(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const input = document.createElement('textarea'); input.value = text; input.setAttribute('readonly', ''); input.style.position = 'fixed'; input.style.opacity = '0'; document.body.appendChild(input); input.select(); document.execCommand('copy'); input.remove(); return Promise.resolve();
}

function viewNotice() {
  const n = state.notice;
  const hCount = n.channels.households;
  const postText = noticePostText();
  const frag = h(`
    <div class="grid notice-center">
      <div class="card span2"><span class="badge assumed">Demo workspace</span><h2>Simulate notice ${esc(n.id)} · revision ${esc(n.revision)}</h2><p class="muted">Choose a channel to show what a community notification would look like. Nothing is sent, posted, or delivered outside this demo.</p><div class="notice-meta"><b>${esc(n.scope)}</b><span>Issued ${esc(fmtDate(n.issuedAt))}</span><span>Authority: ${esc(n.authority)}</span></div></div>
      <div class="card"><h2>Facebook</h2><p class="muted small">This simulates posting to the village Facebook Page.</p><label for="facebook-post">Post preview</label><textarea id="facebook-post" rows="7" readonly>${esc(postText)}</textarea><div class="row"><button type="button" id="copy-post" class="secondary">Copy preview</button><button type="button" id="simulate-facebook">${n.channels.facebook.state === 'published' ? 'Simulate again' : 'Simulate post'}</button><span id="copy-status" class="muted small" aria-live="polite"></span></div><p class="small"><span class="badge ${n.channels.facebook.state === 'published' ? 'fact' : 'assumed'}">${esc(noticeChannelState(n.channels.facebook))}</span>${n.channels.facebook.publishedAt ? ` ${esc(fmtDate(n.channels.facebook.publishedAt))}` : ''}</p></div>
      <div class="card"><h2>Radio and SMS</h2><p class="muted small">Both channels are simulated; no carrier, radio station, or device is contacted.</p><div class="channel-row"><span><b>Local radio</b><small>${esc(noticeChannelState(n.channels.radio))}</small></span><button type="button" id="mark-radio" class="secondary">${n.channels.radio.state === 'aired' ? 'Simulate again' : 'Simulate broadcast'}</button></div><div class="channel-row"><span><b>SMS</b><small>${esc(noticeChannelState(n.channels.sms))}</small></span><button type="button" id="mark-sms" class="secondary">${n.channels.sms.state === 'accepted' ? 'Simulate again' : 'Simulate SMS send'}</button></div></div>
      <div class="card span2"><h2>Household contact route</h2><p>Use this for a simulated door-to-door or community liaison follow-up when other channels may not reach everyone.</p><div class="tiles"><div class="tile"><b>${hCount.total}</b>households in route</div><div class="tile green"><b>${hCount.informed}</b>resident informed</div><div class="tile amber"><b>${hCount.attempted - hCount.informed}</b>follow-up needed</div></div><div class="row"><button type="button" id="mark-house">Simulate resident informed</button><button type="button" id="mark-attempt" class="secondary">Simulate attempt</button><span class="muted small" aria-live="polite">${hCount.informed} of ${hCount.total} informed · ${hCount.attempted} attempts</span></div></div>
      <div class="card span2"><h2>Demo state</h2><p class="muted">Channel actions are saved in this browser so the workflow can be replayed without a backend or network.</p><p class="offline-note">Simulation mode — no real communication will be sent.</p><button type="button" id="reset-demo" class="ghost">Reset demo records</button></div>
    </div>`);
  const copyStatus = frag.querySelector('#copy-status');
  frag.querySelector('#copy-post').addEventListener('click', () => copyText(postText).then(() => { copyStatus.textContent = 'Copied. Use Simulate post to advance the demo.'; }).catch(() => { copyStatus.textContent = 'Copy failed. Select the text and copy it manually.'; }));
  frag.querySelector('#simulate-facebook').addEventListener('click', () => { state.notice.channels.facebook = { state: 'published', publishedAt: new Date().toISOString() }; saveNotice(); render(); });
  frag.querySelector('#mark-radio').addEventListener('click', () => { state.notice.channels.radio = { state: 'aired', airedAt: new Date().toISOString() }; saveNotice(); render(); });
  frag.querySelector('#mark-sms').addEventListener('click', () => { state.notice.channels.sms = { state: 'accepted', acceptedAt: new Date().toISOString() }; saveNotice(); render(); });
  frag.querySelector('#mark-house').addEventListener('click', () => { hCount.attempted = Math.min(hCount.total, hCount.attempted + 1); hCount.informed = Math.min(hCount.total, hCount.informed + 1); hCount.state = hCount.informed >= hCount.total ? 'complete' : 'open'; saveNotice(); render(); });
  frag.querySelector('#mark-attempt').addEventListener('click', () => { hCount.attempted = Math.min(hCount.total, hCount.attempted + 1); saveNotice(); render(); });
  frag.querySelector('#reset-demo').addEventListener('click', () => { localStorage.removeItem(NOTICE_KEY); localStorage.removeItem(OPS_KEY); driverQueue.clear(); state.notice = readNotice(state.data); state.ops = readOps(state.data); state.currentLoadId = null; render(); });
  return frag;
}

// ---------- REPLAY ----------
function replaySteps() {
  const inc = state.data.incident;
  return [
    { at: '2026-05-31T12:00:00-04:00', title: 'Before', body: `Inukjuak has no pipes. Three trucks fill at the plant and deliver to household tanks. Every fill is a batch; every delivery is logged by the driver's phone, offline, and synced when the truck returns to the plant. ${state.data.houses.length} served buildings are drawn from OpenStreetMap; the delivery log is simulated.` },
    { at: '2026-06-02T10:30:00-04:00', title: 'Sample taken', body: `A routine bacteriological sample is taken at the loading arm (RQEP: about two per week). Nothing changes for residents yet. <b>Hypothetical early warning:</b> the app also logs free chlorine at every fill. Loads below the 0.3 mg/L regulatory minimum are flagged before they leave the plant.` },
    { at: '2026-06-05T16:05:00-04:00', title: 'Lab result: FAIL', body: `The Montreal lab reports E. coli at the loading arm. RemoteWater immediately traces every load filled since the last clean sample and every home those loads reached. The window stays open until a clean sample exists, so new deliveries are also flagged.` },
    { at: '2026-06-05T16:10:00-04:00', title: 'SMS in minutes', body: `Each affected home gets a boil-water text in its own language, naming the date of the delivery in its tank. Homes that did not receive affected water are told so. No radio, no Facebook, no data plan needed.` },
    { at: '2026-06-09T12:00:00-04:00', title: 'Advisory continues', body: `Deliveries must continue; people need water. Every home stays red because the window is open. The plant disinfects, raises chlorine, and takes a new sample on June 9 (hypothetical).` },
    { at: '2026-06-12T14:05:00-04:00', title: 'Clean result lands', body: `The clean result closes the window at June 9. Trucks never stopped, so by the time the result lands most tanks already hold water from loads filled after June 9. Those homes clear the same minute and get an all-clear text; the rest clear at their next delivery. Compare: in reality there was "no timeline for lifting the advisory".` },
    { at: '2026-06-14T18:00:00-04:00', title: 'Two days later', body: `Every home is clear, and the record shows exactly which delivery cleared it. Each family knew the status of its own tank, not just the town's. The same log is the starting point for the investigation into the cause.` }
  ];
}

function viewReplay() {
  const steps = replaySteps();
  const step = steps[state.step];
  setNow(step.at);
  const st = statuses();
  const d = state.data;
  const notes = notificationsUpTo(state.now);
  const boil = notes.filter((n) => n.kind === 'boil').length, clear = notes.filter((n) => n.kind === 'clear').length, na = notes.filter((n) => n.kind === 'notAffected').length;
  const lowLoads = d.loads.filter((l) => ms(l.filledAt) <= ms(state.now) && l.freeCl < d.config.thresholds.freeChlorineMinMgL);
  const frag = h(`
    <div class="grid">
      <div class="card span2">
        <div class="steps" role="group" aria-label="Replay steps">${steps.map((s, i) => `<button type="button" data-step="${i}" ${i === state.step ? 'aria-current="step"' : ''} class="${i === state.step ? '' : 'ghost'}">${i + 1}. ${esc(s.title)}</button>`).join('')}</div>
        <h2>${esc(step.title)} <span class="badge">${esc(fmtDate(state.now))}</span></h2>
        <p>${step.body}</p>
        <div class="row"><button type="button" class="secondary" id="prev" ${state.step === 0 ? 'disabled' : ''}>◀ Back</button><button type="button" id="next" ${state.step === steps.length - 1 ? 'disabled' : ''}>Next ▶</button></div>
      </div>
      <div class="card span2">
        <div class="tiles">
          <div class="tile"><b>${d.houses.length}</b>served buildings</div>
          <div class="tile red"><b>${st.counts.red}</b>${esc(t('statusRed'))}</div>
          <div class="tile green"><b>${st.counts.cleared}</b>cleared since advisory</div>
          <div class="tile"><b>${boil}</b>boil SMS sent</div>
          <div class="tile"><b>${clear}</b>all-clear SMS sent</div>
          <div class="tile amber"><b>${lowLoads.length}</b>loads under 0.3 mg/L Cl (hypothetical)</div>
        </div>
        <svg class="map" role="img" aria-label="Map of Inukjuak buildings coloured by water status"></svg>
        ${legend()}
      </div>
      <div class="compare span2">
        <div class="card then"><h2>What happened (sourced)</h2>
          <ul>${d.incident.facts.slice(0, 3).map((f) => `<li>${esc(f.text)} <a href="${esc(f.url)}" target="_blank" rel="noopener" class="small">${esc(f.source)}</a></li>`).join('')}</ul>
          <p class="muted small">Everyone boils. Nobody knows whether the water in their own tank came before or after the problem. The advisory has no end date.</p>
        </div>
        <div class="card now"><h2>With RemoteWater</h2>
          <ul>
            <li>Each fill is a batch with a chlorine reading; a low reading stops the truck at the plant.</li>
            <li>The lab result triggers a trace: which loads, which homes, which delivery date.</li>
            <li>Every home gets a text in Inuktitut, English or French within minutes.</li>
            <li>Homes clear individually as post-clean water reaches their tank.</li>
          </ul>
          <p class="muted small">${d.incident.assumptions[0]}</p>
        </div>
      </div>
      <div class="card span2"><h2>${label('outbox')}</h2>${smsList(notes.slice(-6).reverse())}${notes.length ? `<p class="muted small">${notes.length} messages so far${na ? `, including ${na} “not affected” notices` : ''}.</p>` : '<p class="muted">No messages yet.</p>'}</div>
    </div>`);
  frag.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => { state.step = +b.dataset.step; render(); }));
  frag.querySelector('#prev').addEventListener('click', () => { state.step--; render(); });
  frag.querySelector('#next').addEventListener('click', () => { state.step++; render(); });
  return frag;
}

function smsList(notes) {
  if (!notes.length) return '';
  return notes.map((n) => {
    const m = compose(n.kind, n.house, { date: n.date });
    return `<div class="sms"><div class="meta">${esc(fmtDate(n.at))} · ${esc(n.house.name || n.house.id)} · ${esc(n.house.phones[0] || '')} · ${esc(LANGS[m.lang])}${m.fallback ? ` <span class="pending">${esc(t('pendingIu'))}</span>` : ''}</div>${esc(m.text)}</div>`;
  }).join('');
}

// ---------- PLANT ----------
function viewPlant() {
  const d = state.data, st = statuses();
  const known = d.samples.filter((s) => s.resultAt && ms(s.resultAt) <= ms(state.now));
  const failed = known.filter((s) => s.result === 'fail');
  const r = failed.length ? recall(d, failed[failed.length - 1].id, { now: state.now, carryover: d.config.carryoverDeliveries }) : null;
  const todayLoads = d.loads.filter((l) => ms(l.filledAt) <= ms(state.now)).slice(-12).reverse();
  const notes = notificationsUpTo(state.now);
  const pending = notes.filter((n) => !state.sent.has(n.at + n.house.id + n.kind));
  const opBatches = state.ops?.batches || [];
  const opSamples = state.ops?.samples || [];
  const zones = zoneSummaries().map((z) => z.name);
  const frag = h(`
    <div class="grid">
      <div class="card span2 action-banner"><div><span class="badge assumed">Simulated channels</span><h2>Simulate an approved notice</h2><p class="muted small">Preview Facebook, radio, SMS and household contact actions from one revisioned notice.</p></div><a class="button-link" href="#notice">Open communications</a></div>
      <div class="card span2"><span class="badge fact">Plant operator</span><h2>Register a water batch</h2><p class="muted small">Record the fill once, check the gate, then send one sample to the lab. The truck can work offline after this step.</p>
        <div class="form-grid">
          <div><label for="batch-truck">Truck</label><select id="batch-truck">${d.config.trucks.map((tr) => `<option value="${esc(tr.id)}">${esc(tr.id)}</option>`).join('')}</select></div>
          <div><label for="batch-zone">Drop-off zone</label><select id="batch-zone">${zones.map((z) => `<option value="${esc(z)}">${esc(z)}</option>`).join('')}</select></div>
          <div><label for="batch-volume">Volume (L)</label><input id="batch-volume" type="number" min="1" step="100" value="13600" inputmode="numeric"></div>
          <div><label for="batch-cl">Free chlorine (mg/L)</label><input id="batch-cl" type="number" min="0" max="5" step="0.05" value="0.8" inputmode="decimal"></div>
          <div><label for="batch-turbidity">Turbidity (NTU)</label><input id="batch-turbidity" type="number" min="0" max="50" step="0.1" value="0.4" inputmode="decimal"></div>
        </div>
        <p id="batch-gate" class="small" aria-live="polite"></p>
        <div class="row"><button type="button" id="register-batch">Register batch and send sample</button><span id="batch-status" class="muted small" aria-live="polite"></span></div>
      </div>
      <div class="card"><h2>Lab samples (loading arm)</h2>
        <table><thead><tr><th>${label('sampleTaken')}</th><th>${label('resultBack')}</th><th>Result</th></tr></thead><tbody>
        ${d.samples.map((s) => { const k = ms(s.resultAt) <= ms(state.now); return `<tr class="${k && s.result === 'fail' ? 'fail' : ''}"><td>${esc(fmtDate(s.takenAt))}${s.assumed ? ' <span class="badge assumed">assumed</span>' : ''}${s.hypothetical ? ' <span class="badge hyp">hypothetical</span>' : ''}</td><td>${k ? esc(fmtDate(s.resultAt)) : '<span class="muted">pending</span>'}</td><td>${k ? (s.result === 'fail' ? `<b>${esc(t('fail'))}</b> ${esc(s.value || '')}` : esc(t('pass'))) : ''}</td></tr>`; }).join('')}
        </tbody></table>
        <p class="muted small">RQEP art. 11: at least 8 samples a month for 1,001 to 8,000 people. Art. 35: labs report E. coli detection without delay.</p>
      </div>
      <div class="card"><h2>Trace</h2>
        ${r ? `<div class="tiles">
          <div class="tile red"><b>${r.stats.housesAffected}</b>of ${r.stats.housesTotal} ${esc(t('housesAffected'))}</div>
          <div class="tile"><b>${r.stats.loadsAffected}</b>loads in window</div>
          <div class="tile"><b>${r.stats.deliveriesAffected}</b>deliveries</div>
          <div class="tile green"><b>${st.counts.cleared}</b>cleared</div></div>
          <p>Window: <b>${esc(fmtDate(r.window.start))}</b> → <b>${r.window.open ? 'open (no clean sample yet)' : esc(fmtDate(r.window.end))}</b><br><span class="muted small">From the last clean sample to the next clean sample, plus ${d.config.carryoverDeliveries} carry-over deliveries per truck.</span></p>
          <h3>Priority buildings</h3><ul class="list">${r.houses.filter((x) => x.priority).map((x) => `<li><span class="grow">${esc(x.name || x.id)}</span><span class="badge ${st.byHouse[x.id].level === 'red' ? 'assumed' : 'fact'}">${st.byHouse[x.id].level === 'red' ? esc(t('statusRed')) : esc(t('statusGreen'))}</span></li>`).join('') || '<li>none</li>'}</ul>`
        : `<p class="muted">No failed sample known at ${esc(fmtDate(state.now))}. Move the simulated time forward to 2026-06-05 16:05 to see the trace.</p>`}
      </div>
      <div class="card span2"><h2>Notifications</h2>
        <div class="row"><button type="button" id="send" ${pending.length ? '' : 'disabled'}>Send ${pending.length} pending SMS</button><span class="muted small">${notes.length - pending.length} sent · derived from the trace, one per home, in each home's language</span></div>
        ${smsList(notes.filter((n) => state.sent.has(n.at + n.house.id + n.kind)).slice(-5).reverse())}
      </div>
      <div class="card"><h2>Recent loads at the plant</h2>
        <table><thead><tr><th>Load</th><th>${label('fromTruck')}</th><th>Filled</th><th>${label('freeCl')}</th></tr></thead><tbody>
        ${todayLoads.map((l) => `<tr class="${l.freeCl < d.config.thresholds.freeChlorineMinMgL ? 'low' : ''}"><td>${l.id}</td><td>${l.truckId}</td><td>${esc(fmtDate(l.filledAt))}</td><td>${l.freeCl}${l.freeCl < d.config.thresholds.freeChlorineMinMgL ? ' ⚠ below 0.3' : ''}${l.hypotheticalReading ? ' <span class="badge hyp">hyp.</span>' : ''}</td></tr>`).join('')}
        </tbody></table>
      </div>
      <div class="card"><h2>Village</h2><svg class="map" role="img" aria-label="Map of Inukjuak buildings coloured by water status"></svg>${legend()}</div>
      <div class="card span2"><h2>Registered batches</h2>${opBatches.length ? `<table><thead><tr><th>Batch</th><th>Truck</th><th>Zone</th><th>Registered</th><th>Lab</th></tr></thead><tbody>${opBatches.slice().reverse().map((b) => { const s = opSamples.find((x) => x.id === b.sampleId); return `<tr><td><b>${esc(b.id)}</b></td><td>${esc(b.truckId)}</td><td>${esc(b.zone)}</td><td>${esc(fmtDate(b.registeredAt))}</td><td><span class="badge ${s?.result === 'fail' ? 'assumed' : s?.result === 'pass' ? 'fact' : 'hyp'}">${s?.result === 'fail' ? 'FAIL' : s?.result === 'pass' ? 'PASS' : 'Pending'}</span></td></tr>`; }).join('')}</tbody></table>` : '<p class="muted">No locally registered batches yet.</p>'}</div>
    </div>`);
  const batchTruck = frag.querySelector('#batch-truck'), batchZone = frag.querySelector('#batch-zone'), batchVolume = frag.querySelector('#batch-volume');
  const batchCl = frag.querySelector('#batch-cl'), batchTurbidity = frag.querySelector('#batch-turbidity'), batchGate = frag.querySelector('#batch-gate'), batchStatus = frag.querySelector('#batch-status');
  const checkBatchGate = () => {
    const cl = +batchCl.value, turbidity = +batchTurbidity.value;
    const ok = cl >= d.config.thresholds.freeChlorineMinMgL && turbidity <= d.config.thresholds.turbidityMaxNTU;
    batchGate.textContent = ok ? `Gate clear: ${cl} mg/L chlorine and ${turbidity} NTU turbidity.` : `Hold at plant: chlorine must be ≥ ${d.config.thresholds.freeChlorineMinMgL} mg/L and turbidity ≤ ${d.config.thresholds.turbidityMaxNTU} NTU.`;
    batchGate.style.color = ok ? 'var(--green)' : 'var(--red)';
    return ok;
  };
  batchCl.addEventListener('input', checkBatchGate); batchTurbidity.addEventListener('input', checkBatchGate); checkBatchGate();
  frag.querySelector('#register-batch').addEventListener('click', () => {
    if (!checkBatchGate()) { batchStatus.textContent = 'Correct the readings before registering this batch.'; return; }
    try {
      const batch = { id: newRecordId('B'), truckId: batchTruck.value, zone: batchZone.value, volumeL: +batchVolume.value, freeCl: +batchCl.value, turbidity: +batchTurbidity.value, registeredAt: state.now, status: 'awaiting_lab' };
      const sample = { id: newRecordId('S'), batchId: batch.id, takenAt: state.now, sentAt: state.now, dueAt: new Date(ms(state.now) + d.config.labTurnaroundHours * 3600e3).toISOString(), status: 'pending', result: null, resultAt: null, value: '' };
      batch.sampleId = sample.id; state.ops.batches.push(batch); state.ops.samples.push(sample); saveOps(); render();
    } catch (e) { batchStatus.textContent = `Could not save batch: ${e.message}`; }
  });
  frag.querySelector('#send').addEventListener('click', () => { pending.forEach((n) => state.sent.add(n.at + n.house.id + n.kind)); render(); });
  return frag;
}

// ---------- LAB ----------
function viewLab() {
  const d = state.data;
  const samples = state.ops?.samples || [];
  const batches = state.ops?.batches || [];
  const pending = samples.filter((s) => s.status === 'pending');
  const selectedId = state.labSampleId && samples.some((s) => s.id === state.labSampleId) ? state.labSampleId : pending[0]?.id;
  const selected = samples.find((s) => s.id === selectedId) || null;
  const batch = selected ? batches.find((b) => b.id === selected.batchId) : null;
  const frag = h(`
    <div class="grid">
      <div class="card span2"><span class="badge fact">Water lab</span><h2>Record a sample result</h2><p class="muted small">Choose a sample sent by the plant, record the result once, and the batch status updates for the village overview.</p>
        ${pending.length ? `<label for="lab-sample">Pending sample</label><select id="lab-sample">${pending.map((s) => { const b = batches.find((x) => x.id === s.batchId); return `<option value="${esc(s.id)}" ${s.id === selectedId ? 'selected' : ''}>${esc(s.id)} · ${esc(b?.id || s.batchId)} · ${esc(b?.zone || 'zone unknown')}</option>`; }).join('')}</select>
        <div class="notice-meta"><span>Batch: <b>${esc(batch?.id || '—')}</b></span><span>Zone: <b>${esc(batch?.zone || '—')}</b></span><span>Sent: ${selected ? esc(fmtDate(selected.sentAt)) : '—'}</span></div>
        <div class="form-grid"><div><label for="lab-result">Result</label><select id="lab-result"><option value="pass">Pass — within limits</option><option value="fail">Fail — notify plant</option></select></div><div><label for="lab-value">Reported value</label><input id="lab-value" type="text" placeholder="e.g. E. coli not detected"></div><div class="span2"><label for="lab-note">Lab note (optional)</label><textarea id="lab-note" rows="3" placeholder="Method, reviewer or follow-up"></textarea></div></div>
        <div class="row"><button type="button" id="record-lab">Record result</button><span id="lab-status" class="muted small" aria-live="polite"></span></div>` : '<p class="empty-state">No pending samples. The plant can register a batch and send a sample here.</p>'}
      </div>
      <div class="card span2"><h2>Recent lab results</h2>${samples.length ? `<table><thead><tr><th>Sample</th><th>Batch</th><th>Zone</th><th>Result</th><th>Recorded</th></tr></thead><tbody>${samples.slice().reverse().map((s) => { const b = batches.find((x) => x.id === s.batchId); return `<tr class="${s.result === 'fail' ? 'fail' : ''}"><td>${esc(s.id)}</td><td>${esc(s.batchId)}</td><td>${esc(b?.zone || '—')}</td><td>${s.result ? `<b>${s.result === 'fail' ? 'FAIL' : 'PASS'}</b> ${esc(s.value || '')}` : '<span class="muted">Pending</span>'}</td><td>${s.resultAt ? esc(fmtDate(s.resultAt)) : '—'}</td></tr>`; }).join('')}</tbody></table>` : '<p class="muted">No local lab records yet.</p>'}</div>
      <div class="card span2"><h2>What happens next</h2><p class="muted">A failed result should trigger the plant’s trace and notice workflow. A pass closes this batch’s waiting state; confirm the public notice before residents are told the advisory has ended.</p></div>
    </div>`);
  const labResult = frag.querySelector('#lab-result'), labValue = frag.querySelector('#lab-value'), labNote = frag.querySelector('#lab-note');
  frag.querySelector('#lab-sample')?.addEventListener('change', (e) => { state.labSampleId = e.target.value; render(); });
  frag.querySelector('#record-lab')?.addEventListener('click', () => {
    const sample = samples.find((s) => s.id === selectedId); if (!sample) return;
    const result = labResult.value;
    sample.result = result; sample.status = 'recorded'; sample.resultAt = state.now; sample.value = labValue.value.trim() || (result === 'pass' ? 'Within limits' : 'Detected — review required'); sample.note = labNote.value.trim();
    const b = batches.find((x) => x.id === sample.batchId); if (b) b.status = result === 'fail' ? 'flagged' : 'cleared';
    saveOps(); render();
  });
  return frag;
}

// ---------- TRUCK ----------
function viewTruck() {
  const d = state.data;
  const queue = driverQueue.list();
  const online = $('#online').checked;
  const assignedBatch = (state.ops?.batches || []).slice().reverse().find((b) => b.truckId === state.truckId);
  const myLoads = [...d.loads, ...queue.filter((q) => q.type === 'load').map((q) => q.load)].filter((l) => l.truckId === state.truckId && ms(l.filledAt) <= ms(state.now));
  const cur = myLoads.find((l) => l.id === state.currentLoadId || l.id === assignedBatch?.loadId) || null;
  const routeIds = d.routes[state.truckId] || [];
  const delivered = new Set([...d.deliveries, ...queue.filter((q) => q.type === 'delivery').map((q) => q.delivery)].filter((x) => x.loadId === cur?.id).map((x) => x.houseId));
  const next = routeIds.map((id) => houseById(d, id)).filter(Boolean).filter((x) => !delivered.has(x.id)).slice(0, 10);
  const min = d.config.thresholds.freeChlorineMinMgL;
  const frag = h(`
    <div class="grid">
      ${assignedBatch ? `<div class="card span2 assignment-card"><div><span class="badge fact">Simulated assignment</span><h2>${esc(assignedBatch.id)} → ${esc(assignedBatch.zone)} zone</h2><p class="muted small">Truck ${esc(assignedBatch.truckId)} · ${esc(assignedBatch.volumeL)} L · Plant result: ${assignedBatch.status === 'flagged' ? 'flagged — hold' : assignedBatch.status === 'cleared' ? 'pass recorded' : 'lab pending'}</p></div>${assignedBatch.status === 'flagged' ? '<span class="badge assumed">Hold — failed result</span>' : cur ? '<span class="badge fact">Assignment started</span>' : '<button type="button" id="start-assignment">Start assignment</button>'}</div>` : '<div class="card span2 assignment-card"><span class="badge assumed">No plant assignment yet</span><h2>Start with the Plant persona</h2><p class="muted small">Register a batch, choose this truck, then return here to simulate the delivery route.</p></div>'}
      <div class="card"><h2>${label('newLoad')}</h2>
        <label for="truck">${label('fromTruck')}</label><select id="truck">${d.config.trucks.map((tr) => `<option ${tr.id === state.truckId ? 'selected' : ''}>${tr.id}</option>`).join('')}</select>
        <label for="cl">${label('freeCl')}</label><input id="cl" type="number" step="0.05" min="0" max="5" value="0.8" inputmode="decimal">
        <label for="tu">${label('turbidity')}</label><input id="tu" type="number" step="0.1" min="0" max="50" value="0.4" inputmode="decimal">
        <label><input type="checkbox" id="empty"> ${label('truckEmptied')}</label>
        <p id="gate" class="small" aria-live="polite"></p>
        <div class="row"><button type="button" id="fill">${label('newLoad')}</button></div>
        ${cur ? `<p class="small">Current load <b>${cur.id}</b>, filled ${esc(fmtDate(cur.filledAt))}, Cl ${cur.freeCl} mg/L${cur.freeCl < min ? ' <b>⚠ below minimum, do not deliver</b>' : ''}</p>` : '<p class="muted small">No open load. Fill at the plant first.</p>'}
      </div>
      <div class="card"><h2>Route · ${label('delivered')}</h2>
        ${cur ? `<ul class="list">${next.map((x) => `<li><span class="grow">${esc(x.name || x.id)}${x.priority ? ' <span class="badge fact">priority</span>' : ''}</span><button type="button" data-deliver="${x.id}" ${cur.freeCl < min ? 'disabled' : ''}>${label('delivered')}</button></li>`).join('')}</ul>` : '<p class="muted">Open a load to see the route.</p>'}
        <p class="muted small">Each tap stamps house, load, truck and time. A QR sticker on the tank does the same with one scan.</p>
      </div>
      <div class="card span2"><h2>${online ? label('synced') : label('offlineQueue')}</h2>
        <p><b>${queue.length}</b> events on this phone ${online ? '' : '(no signal; they will sync at the plant)'}</p>
        <div class="row"><button type="button" id="sync" ${queue.length && online ? '' : 'disabled'}>Sync at plant</button><button type="button" class="ghost" id="clearq" ${queue.length ? '' : 'disabled'}>Discard queue</button></div>
        <p class="muted small">Uncheck “Demo signal” in the header to replay an outage. Everything keeps working; only the simulated sync waits.</p>
      </div>
    </div>`);
  frag.querySelector('#truck').addEventListener('change', (e) => { state.truckId = e.target.value; state.currentLoadId = null; render(); });
  frag.querySelector('#start-assignment')?.addEventListener('click', () => {
    if (!assignedBatch || assignedBatch.status === 'flagged') return;
    const load = { id: assignedBatch.loadId || newRecordId('L'), truckId: assignedBatch.truckId, filledAt: assignedBatch.registeredAt || state.now, freeCl: assignedBatch.freeCl, turbidity: assignedBatch.turbidity, emptiedBefore: false, batchId: assignedBatch.id };
    assignedBatch.loadId = load.id; assignedBatch.assignmentStartedAt = state.now; saveOps(); driverQueue.push({ type: 'load', load }); state.currentLoadId = load.id; render();
  });
  const clInput = frag.querySelector('#cl'), gate = frag.querySelector('#gate');
  const checkGate = () => { const v = +clInput.value; gate.textContent = v < min ? `⚠ ${v} mg/L is below the ${min} mg/L minimum at the plant outlet (RQEP art. 8). Do not leave the plant. Call the operator.` : `Free chlorine ${v} mg/L: OK to deliver.`; gate.style.color = v < min ? 'var(--red)' : 'var(--green)'; };
  clInput.addEventListener('input', checkGate); checkGate();
  const turbidityInput = frag.querySelector('#tu'), emptyInput = frag.querySelector('#empty');
  frag.querySelector('#fill').addEventListener('click', () => {
    const load = { id: 'L-' + Date.now().toString(36).toUpperCase(), truckId: state.truckId, filledAt: state.now, freeCl: +clInput.value, turbidity: +turbidityInput.value, emptiedBefore: emptyInput.checked };
    driverQueue.push({ type: 'load', load });
    state.currentLoadId = load.id;
    render();
  });
  frag.querySelectorAll('[data-deliver]').forEach((b) => b.addEventListener('click', () => {
    const seq = delivered.size + 1;
    driverQueue.push({ type: 'delivery', delivery: { id: 'D-' + Date.now().toString(36).toUpperCase(), loadId: cur.id, truckId: state.truckId, houseId: b.dataset.deliver, at: new Date(ms(state.now) + seq * 6 * 60e3).toISOString(), litres: d.config.householdTankL, seq } });
    render();
  }));
  frag.querySelector('#sync').addEventListener('click', () => { driverQueue.apply(d); render(); });
  frag.querySelector('#clearq').addEventListener('click', () => { driverQueue.clear(); state.currentLoadId = null; render(); });
  return frag;
}

// ---------- HOME ----------
function viewHome() {
  const d = state.data, house = houseById(d, state.houseId) || d.houses[0];
  const st = statuses().byHouse[house.id];
  const cur = currentLoadForHouse(d, house.id, state.now);
  const cfg = d.config;
  const level = st.level;
  const key = level === 'red' ? 'statusRed' : 'statusGreen';
  const icon = level === 'red' ? '⚠' : '✓';
  const tank = { freeChlorineMinMgL: cfg.thresholds.freeChlorineMinInTankMgL };
  const su = cur?.load ? safeUntil(cur.delivery.at, cur.load.freeCl, cfg.decay, tank) : null;
  const est = cur?.load ? chlorineAfter(cur.load.freeCl, (ms(state.now) - ms(cur.delivery.at)) / 86400e3, cfg.decay.tankTempC, cfg.decay) : null;
  const yellow = level === 'green' && su && ms(su) < ms(state.now);
  const notes = notificationsUpTo(state.now).filter((n) => n.house.id === house.id).reverse();
  const frag = h(`
    <div class="grid">
      <div class="card span2 advisory" role="status" aria-live="polite"><div><span class="badge assumed">Simulated community notice</span><h2>${esc(state.notice.scope)}</h2><p><b>${esc(state.notice.instruction)}</b></p><p class="muted small">This resident view is part of the demo. Communications are simulated.</p></div><a class="button-link secondary" href="#notice">View channels</a></div>
      <div class="card span2">
        <label for="house">${esc(house.name || house.id)}</label>
        <select id="house">${d.houses.map((x) => `<option value="${x.id}" ${x.id === house.id ? 'selected' : ''}>${esc(x.name ? `${x.name} (${x.id})` : x.id)}</option>`).join('')}</select>
        <p class="muted small">Language for this home: ${esc(LANGS[house.lang])}. The status below is shown in the language you picked in the header.</p>
        <div class="status ${yellow ? 'yellow' : level}" role="status" aria-live="polite">
          <div class="icon" aria-hidden="true">${yellow ? '?' : icon}</div>
          <div><div class="text">${yellow ? label('statusYellow') : label(key)}</div>
          ${level === 'red' ? `<div>${label('boilHow')}</div>` : ''}
          ${st.reason === 'cleared' ? `<div>${label('allClear')}</div>` : ''}</div>
        </div>
      </div>
      <div class="card"><h2>${label('water')}</h2>
        ${cur ? `<p><b>${label('deliveredOn')}:</b> ${esc(fmtDate(cur.delivery.at))}<br><b>${label('fromTruck')}:</b> ${cur.load?.truckId} · <b>${label('batch')}:</b> ${cur.load?.id}<br><b>${label('freeCl')}:</b> ${cur.load?.freeCl} at the plant, about ${est.toFixed(2)} now (estimate)<br><b>${label('safeUntil')}:</b> ${su ? esc(fmtDate(su)) : '–'}</p>` : `<p>${label('noDelivery')}</p>`}
        <p class="muted small">The estimate uses first-order chlorine decay with placeholder constants. A strip reading replaces the estimate.</p>
        <label for="strip">Strip reading, free chlorine (mg/L)</label>
        <div class="row"><input id="strip" type="number" step="0.05" min="0" max="5" inputmode="decimal" placeholder="e.g. 0.35"><button type="button" class="secondary" id="stripbtn">Check</button></div>
        <p id="stripout" class="small" aria-live="polite"></p>
      </div>
      <div class="card"><h2>Messages to this home</h2>${smsList(notes) || '<p class="muted">None yet.</p>'}</div>
      <div class="card span2"><svg class="map" role="img" aria-label="Map with this home highlighted"></svg>${legend()}</div>
    </div>`);
  frag.querySelector('#house').addEventListener('change', (e) => { state.houseId = e.target.value; location.hash = '#home/' + state.houseId; });
  const stripInput = frag.querySelector('#strip'), stripOutput = frag.querySelector('#stripout');
  frag.querySelector('#stripbtn').addEventListener('click', () => {
    const v = +stripInput.value, out = stripOutput;
    if (!v && v !== 0) { out.textContent = ''; return; }
    out.textContent = v < tank.freeChlorineMinMgL ? `⚠ ${v} mg/L is below ${tank.freeChlorineMinMgL}. Ask for a fresh delivery and boil until then.` : `✓ ${v} mg/L: chlorine residual is present. Reading logged for calibration (est. was ${est?.toFixed(2) ?? '–'}).`;
  });
  return frag;
}

function toLocalInput(iso) {
  if (!iso) return '';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(dt).reduce((a, p) => (a[p.type] = p.value, a), {});
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour === '24' ? '00' : parts.hour}:${parts.minute}`;
}
