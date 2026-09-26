# RemoteWater

**Which water is in my tank, and is it safe?**

Batch traceability and per-home boil-water alerts for trucked drinking water in Nunavik.
Built at Hack for Humanity Ottawa, 2026-09-26, for the "Designing for the North" challenge
presented by Amenda Amidlak-Soucy of Inukjuak.

Live prototype: open `index.html` over HTTP (see *Run it*). No build step, no account, and no real messages are sent.

## The problem, in one paragraph

Inukjuak has no water pipes. One plant treats the water, three trucks carry it to a tank in each
home, and sewage goes the other way by truck. The water is tested at the plant and then nobody
sees it again until it leaves the tap. On 2026-06-06 the Kativik Regional Government put the whole
community on a boil-water advisory after E. coli was found at the plant's truck loading arm. The
lab was in Montreal. There was "no timeline for lifting the advisory". Nobody could say whether the
water in *their own* tank was delivered before or after the problem.

## What RemoteWater does

Treat trucked water the way food is treated: every truck fill is a **batch**, every delivery is
**logged**, and every home can be told **which batch is in its tank**.

| Screen | Who | What it does |
|---|---|---|
| **Overview** | everyone | Public zone map/list with recorded water-quality status and active notices. Select a zone to see delivered batches and evidence. |
| **Plant** | treatment plant persona | Register a batch, choose a truck and zone, and send a simulated sample to the lab. |
| **Lab** | water lab persona | Receive a simulated sample, record pass/fail, and open the external report placeholder. The lab result sets the batch status. |
| **Truck** | truck driver persona | Choose an assigned batch, optionally upload a simulated test strip, start the route, deliver to the route, and queue events for a simulated sync. |
| **Home** | resident | One large status card: safe / boil, with icon, colour and words in Inuktitut, English or French. When the water arrived, from which truck and batch, and an estimated safe-until date. Optional strip reading. |
| **Notice channels** | communications persona | Simulate the same approved notice through Facebook, radio, SMS and household contact. The demo never contacts a real service. |
| **Replay June 2026** | judges | The real incident, step by step, on the real map of Inukjuak: sample, failed result, trace, SMS, clean result, homes clearing one by one. |

### Why this is different

- **Recall, without sensors.** Nothing is installed or maintained at the house. The only
  devices are phones the drivers and residents already have.
- **The truck is the network.** Deliveries are logged offline on the driver's phone and synced
  when the truck returns to the plant, which it does many times a day.
- **SMS first.** The demo previews alerts as text messages in each home's language. No data plan,
  smartphone, or Facebook account is needed to understand the workflow.
- **Homes clear individually.** Once a clean sample closes the window, each home turns green the
  moment post-clean water reaches its tank, instead of waiting for a community-wide lifting date.
- **A lab-owned status.** Plant and truck screens keep the handoff simple; pass/fail status is
  recorded by the water lab and then shown on the public map.
- **One demo, five personas.** The Persona dropdown moves judges between public, plant, lab, truck,
  resident and communications views without sign-in. Complex logic and communications are simulated.

### Honest limits

With samples twice a week and deliveries every day or two, the affected window covers almost every
home. The value is not a small recall list. It is speed, reach, language, per-home clearing, and a
record that makes the next investigation faster. The replay shows the real numbers.

## Real data, and what is simulated

| Data | Status | Source | Link |
|---|---|---|---|
| 467 buildings and 60 road segments in Inukjuak | real | OpenStreetMap via Overpass API, fetched 2026-09-26 (ODbL). The water treatment plant, health centre, schools and daycare are tagged. | [openstreetmap.org, Inukjuak](https://www.openstreetmap.org/#map=14/58.4550/-78.1030) · [Overpass API](https://overpass-api.de/) |
| Population 1,821; 588 dwellings, 481 occupied; 96.4% Inuktitut mother tongue | real | Statistics Canada, 2021 Census Profile | [Census Profile, Inukjuak](https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/details/page.cfm?Lang=E&DGUIDlist=2021A00052499085) |
| E. coli at the loading arm; advisory 2026-06-06; Montreal lab; "no timeline" | real | Nunatsiaq News, 2026-06-11 | [Inukjuak under boil-water advisory after E. coli detected at water plant](https://nunatsiaq.com/stories/article/inukjuak-under-boil-water-advisory-after-e-coli-detected-at-water-plant/) |
| Three water trucks in Inukjuak | real | Nunatsiaq News, 2024-05-27 | [Nunavik villages lack reliable access to water, causing health centre and school closures](https://nunatsiaq.com/stories/article/nunavik-villages-lack-reliable-access-to-water-causing-health-centre-and-school-closures/) |
| Sampling frequency, 0.3 mg/L chlorine minimum, immediate notification duty | real | RQEP (Q-2, r. 40) art. 8, 11, 35, 36 | [Règlement sur la qualité de l'eau potable](https://www.legisquebec.gouv.qc.ca/fr/document/rc/Q-2,%20r.%2040) |
| Inukjuak weekly sampling compliance 86 to 90% (2021 to 2025) | real | KRG Municipal Public Works report, Feb 2026 | [MPW Activity Report (PDF)](https://www.krg.ca/en-CA/assets/Council/2026/feb/MPW_Activity_Report.pdf) |
| Household tanks are plastic, water stagnates for days, cleaned every two years | real | Institut nordique du Québec, 2024-06-26 | [Monitoring water reservoirs](https://inq.ulaval.ca/en/Monitoring-water-reservoirs) |
| A 13,600 L truck is filled 9 to 10 times a day (Puvirnituq) | real | APTN Investigates, 2025-11-10 | [Pipe Dreams: The Water Crisis in Nunavik](https://www.aptnnews.ca/investigates/pipe-dreams-the-water-crisis-in-nunavik/) |
| Which buildings are homes | inferred | OSM tags nearly everything `building=yes`; unnamed buildings are treated as homes (422). | [data/houses.geojson](data/houses.geojson) (see `meta`) |
| Sample and result dates for the June 2026 incident | assumed | Not published. | [data/incident-2026-06.json](data/incident-2026-06.json) (`assumptions`) |
| The clean sample on 2026-06-09 | hypothetical | No lifting date was found. | [data/incident-2026-06.json](data/incident-2026-06.json) (`samples`) |
| Delivery log, truck capacity (13,600 L), tank size (1,500 L), two-day cycle | simulated | Parameters in `data/config.json`. The driver app is what would produce the real log. | [data/config.json](data/config.json) · [js/sim.js](js/sim.js) |
| Phone numbers, language preference per home | fictional | 555-01xx numbers. Languages randomised to match the census share. | [data/houses.geojson](data/houses.geojson) |

Every fact in the app carries a badge: **sourced**, **assumed** or **hypothetical**.

## Run it

```bash
python -m http.server 8080
```

Then open <http://localhost:8080/#overview>. The public Overview starts blank; choose a Demo date/time in the header to load the fictional snapshot. The June incident replay is under Demo (`#replay`). Any static host works (GitHub Pages, Cloudflare Pages).
Opening `index.html` directly from disk will not work because the page loads JSON with `fetch`.

Tests:

```bash
node --test
```

## Layout

```
index.html                 the app shell (Overview is the default route)
css/app.css                styles: large text, large targets, colour never alone
js/trace.js                the core: bad window -> loads -> deliveries -> homes -> status (pure functions, tested)
js/decay.js                free-chlorine decay estimate for the safe-until date
js/sim.js                  deterministic delivery simulation over the real buildings
js/sms.js                  message templates and a simulated outbox
js/i18n.js                 English, French, Inuktitut strings (Inuktitut mostly pending, see below)
js/map.js                  SVG village map from OSM data, no tiles, no library
js/store.js                data loading and the driver's offline queue (localStorage)
docs/usability-plan.md     operational UX plan and acceptance checks
docs/screen-flows.md       proposed role flows and public Overview
docs/outage-notifications.md  Facebook, radio and household outage workflow
js/app.js                  the public Overview plus Plant, Lab, Truck, Home, Notice and Demo screens
data/config.json           thresholds, trucks, tank size, delivery cycle
data/houses.geojson        real building centroids with derived kind / priority / language
data/roads.geojson         real roads
data/incident-2026-06.json the sourced facts, the assumptions, the sample timeline
tests/trace.test.js        node --test
sw.js, manifest.webmanifest  offline cache; the whole app is a few hundred KB, mostly the map data
docs/design.md             architecture, offline and SMS design, accessibility evidence, open questions
```

## Accessibility and low bandwidth

- Status is never colour alone: icon + words + colour, and a `role="status"` live region.
- Text is 17px base, buttons are 48px tall, focus rings are 4px, the map is keyboard reachable
  and every building has an accessible name with its status.
- Language toggle: English, French, Inuktitut syllabics. Untranslated Inuktitut strings fall back
  to English **with a visible "translation pending" mark**, so nobody mistakes a fallback for a
  translation. Do not machine-translate; have them checked by a Nunavik Inuktitut speaker.
- No web fonts, no map tiles, no CDN, no framework. A service worker caches everything for offline.
- SMS is the primary channel for alerts; the app is secondary.

## Next steps for the team

1. Confirm with Amenda: how many trucks run today, how often a home is served, tank size, how
   people were told about the June advisory, and what an Inuktitut boil notice should say.
2. Replace the simulated delivery log with the driver screen's real output (already the same shape).
3. QR sticker per tank: scanning it opens `#home/<id>` and can double as the driver's "Delivered" tap.
4. Replace simulated SMS/Facebook/radio actions with approved integrations after the workflow is validated.
5. Strip-reading by phone camera to calibrate the chlorine decay constants.

## Licence

MIT. Map data © OpenStreetMap contributors, ODbL.
