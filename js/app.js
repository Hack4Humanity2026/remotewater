// app.js — screens. Hash router, no framework.
//   #replay  the June 2026 incident, step by step (the demo)
//   #plant   operator: samples, loads, trace, notifications
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
  now: '2026-06-05T16:05:00-04:00',
  view: 'replay',
  houseId: null,
  truckId: 'W1',
  currentLoadId: null,
  step: 0,
  sent: new Set(),
  showAll: false
};

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
  state.houseId = state.data.houses.find((x) => x.kind === 'clinic')?.id || state.data.houses[0].id;
  $('#clock').addEventListener('change', (e) => { if (e.target.value) { state.now = new Date(e.target.value).toISOString(); render(); } });
  window.addEventListener('hashchange', route);
  route();
})();

function route() {
  const [view, arg] = (location.hash.replace('#', '') || 'replay').split('/');
  state.view = ['replay', 'plant', 'truck', 'home'].includes(view) ? view : 'replay';
  if (view === 'home' && arg && houseById(state.data, arg)) state.houseId = arg;
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
  $('#tabs').innerHTML = [['replay', 'tabReplay'], ['plant', 'tabPlant'], ['truck', 'tabTruck'], ['home', 'tabHome']]
    .map(([v, k]) => `<a href="#${v}" ${state.view === v ? 'aria-current="page"' : ''}>${esc(t(k))}</a>`).join('');
  $('#langs').innerHTML = Object.entries(LANGS).map(([k, v]) => `<button type="button" data-lang="${k}" aria-pressed="${getLang() === k}">${v}</button>`).join('');
  $('#langs').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { setLang(b.dataset.lang); localStorage.setItem('rw.lang', b.dataset.lang); render(); }));
  const main = $('#main');
  main.innerHTML = '';
  main.appendChild({ replay: viewReplay, plant: viewPlant, truck: viewTruck, home: viewHome }[state.view]());
  $('#clock').value = toLocalInput(state.now); // the replay may have moved the clock
  document.querySelectorAll('svg.map').forEach((svg) => {
    const st = statuses();
    renderMap(svg, { places: state.data.places, roads: state.data.roads }, placeStatus(st), (p) => { state.houseId = p.id; location.hash = '#home/' + p.id; }, state.houseId);
  });
}

function label(key) {
  const { text, fallback } = tr(key);
  return esc(text) + (fallback && getLang() === 'iu' ? `<span class="pending" lang="en">${esc(t('pendingIu'))}</span>` : '');
}

function legend() {
  return `<div class="legend" aria-hidden="true"><span class="lg-green">${esc(t('statusGreen'))}</span><span class="lg-red">${esc(t('statusRed'))}</span><span class="lg-prio">School / clinic / daycare</span><span class="lg-plant">Water plant</span><span class="lg-grey">Not served</span></div>`;
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
  const frag = h(`
    <div class="grid">
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
    </div>`);
  frag.querySelector('#send').addEventListener('click', () => { pending.forEach((n) => state.sent.add(n.at + n.house.id + n.kind)); render(); });
  return frag;
}

// ---------- TRUCK ----------
function viewTruck() {
  const d = state.data;
  const queue = driverQueue.list();
  const online = $('#online').checked;
  const myLoads = [...d.loads, ...queue.filter((q) => q.type === 'load').map((q) => q.load)].filter((l) => l.truckId === state.truckId && ms(l.filledAt) <= ms(state.now));
  const cur = myLoads.find((l) => l.id === state.currentLoadId) || null;
  const routeIds = d.routes[state.truckId] || [];
  const delivered = new Set([...d.deliveries, ...queue.filter((q) => q.type === 'delivery').map((q) => q.delivery)].filter((x) => x.loadId === cur?.id).map((x) => x.houseId));
  const next = routeIds.map((id) => houseById(d, id)).filter(Boolean).filter((x) => !delivered.has(x.id)).slice(0, 10);
  const min = d.config.thresholds.freeChlorineMinMgL;
  const frag = h(`
    <div class="grid">
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
        <p class="muted small">Uncheck “Signal” in the header to work offline. Everything keeps working; only the sync waits.</p>
      </div>
    </div>`);
  frag.querySelector('#truck').addEventListener('change', (e) => { state.truckId = e.target.value; state.currentLoadId = null; render(); });
  const clInput = frag.querySelector('#cl'), gate = frag.querySelector('#gate');
  const checkGate = () => { const v = +clInput.value; gate.textContent = v < min ? `⚠ ${v} mg/L is below the ${min} mg/L minimum at the plant outlet (RQEP art. 8). Do not leave the plant. Call the operator.` : `Free chlorine ${v} mg/L: OK to deliver.`; gate.style.color = v < min ? 'var(--red)' : 'var(--green)'; };
  clInput.addEventListener('input', checkGate); checkGate();
  frag.querySelector('#fill').addEventListener('click', () => {
    const load = { id: 'L-' + Date.now().toString(36).toUpperCase(), truckId: state.truckId, filledAt: state.now, freeCl: +clInput.value, turbidity: +frag.querySelector('#tu').value, emptiedBefore: frag.querySelector('#empty').checked };
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
  frag.querySelector('#stripbtn').addEventListener('click', () => {
    const v = +frag.querySelector('#strip').value, out = frag.querySelector('#stripout');
    if (!v && v !== 0) { out.textContent = ''; return; }
    out.textContent = v < tank.freeChlorineMinMgL ? `⚠ ${v} mg/L is below ${tank.freeChlorineMinMgL}. Ask for a fresh delivery and boil until then.` : `✓ ${v} mg/L: chlorine residual is present. Reading logged for calibration (est. was ${est?.toFixed(2) ?? '–'}).`;
  });
  return frag;
}

function toLocalInput(iso) {
  const dt = new Date(iso);
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(dt).reduce((a, p) => (a[p.type] = p.value, a), {});
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour === '24' ? '00' : parts.hour}:${parts.minute}`;
}
