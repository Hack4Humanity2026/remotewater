# RemoteWater: operational UX plan

Start with the public overview in [screen flows](screen-flows.md). Review time: 5 minutes for the proposal; 15 minutes for this full plan.

**Decision:** make the default page a water-quality map by delivery zone. Put data entry in a separate, role-specific work area. A resident should not have to understand the water system to find a zone's recorded results.

The first implementation slice now covers the public Overview, local Plant/Lab batch workflow, and notice-channel workspace. The remaining production items in this document are still planning work. Reviewed 2026-09-26 against the [live site](https://hack4humanity2026.github.io/remotewater/).

**Notice-channel accommodations:** see [Facebook, radio and outage fallback](outage-notifications.md). Add manual Facebook post preparation/publication tracking, local radio scripts and tracked household contact to the advisory workflow. Use the town/village's designated Page based on user-reported evidence of existing use; verify its URL and publisher before setup. Offline caching, social posts and queued SMS do not deliver new warnings through a failed network. The addendum includes dependencies, screens, validation and additional software estimates.

## 1. What the review found

Read `README.md`, both existing docs, the app shell, all functional modules, configuration, styles, service worker, and existing tests. Inspected the live default, Plant, Truck, and Home screens through Chrome; inspected the default page visually. Did not submit records or send messages.

| Current behavior | Consequence | Proposed change |
|---|---|---|
| Default route is Replay: seven step buttons, narrative, six counters, simulated clock and Signal checkbox. | The first screen asks visitors to learn the demo before finding water information. | Default to Overview; keep replay under About → Demo, with its own clock and dataset. |
| Plant now shows sample tables, trace, notifications, loads and a local registration form; Lab has a result-entry route. | The demo can complete one batch → sample → result loop, but records remain device-local. | Add shared repository/API, assignments and durable evidence before operational use. |
| Truck creates a load, chooses a truck, and gets a house list. No assignment or zone model. | Drivers must organize work themselves; no batch-to-zone overview exists. | Plant assigns truck + batch + zone; driver opens their next assignment. |
| Home selects one building from a long list; strip “Check” changes text only. | Home is not a public overview; strip uploads and durable readings do not exist. | Preserve dwelling detail as a drill-down; add strip evidence to truck delivery records. |
| `store.js` generates deliveries; Sync merges the local queue into memory and clears it. | This is a demo, not shared storage. Refresh loses applied changes; another role/device cannot see them. | Separate fixtures from operational data; durable local drafts plus acknowledged server synchronization. |

**Keep:** the small static frontend, offline map approach, large controls, visible focus, status words alongside color, translation structure, and pure trace functions as a starting point. Seven existing Node tests pass. They validate the existing model, not the proposed workflows or operational readiness.

**Correct before operational use:** `trace.js` defaults to green without evidence and clears homes after a later delivery; `decay.js` uses placeholder constants for “safe until.” These cannot define public safety claims in the new design. The replay's quoted instructions and `i18n.js`/SMS text also contain different boil durations. Use authority-approved advisory content, not hard-coded advice or inferred clearance. This plan does not certify regulatory compliance or specify a sampling standard.

## 2. The proposed product

### Shared public Overview

Available without sign-in and accessible from every work screen. Header: RemoteWater, Overview, Work, language. Production Work opens the user's permitted role; a labeled role switcher is acceptable only in the demo.

1. Show an active official advisory first, when one exists, with source and update time.
2. Show “Water quality by zone,” a zone search, last successful update, and the map. No KPI row.
3. Select a zone to reveal its status, evidence freshness, delivered batches, and results. Keep other zones visually quiet.
4. Select a batch inside that detail to see Plant → Sample/Lab → Truck → Zone and recorded evidence. Highlight only that batch's delivered zones.
5. Offer an equivalent zone list for keyboard, screen-reader, small-screen and low-bandwidth use. Keep demo history and source methodology under About. Link the verified village Facebook Page within advisory details or the footer; do not embed a feed or require Facebook to read essential instructions.

On mobile: search, map/list switch, selected-zone detail in document flow. Avoid a map overlay that covers the selection. No login wall, forced tutorial, auto-playing replay, or modal on arrival.

### Role workspaces

| Role | Landing screen | Primary action | Completion proof |
|---|---|---|---|
| Treatment plant | Batches needing a next step; newest unfinished batch first | Register batch | Batch ID saved; next action is Prepare sample |
| Water lab | Samples awaiting results; overdue/flagged first | Enter results | Published result revision linked to sample and batch |
| Truck | Current assignment: batch, destination zone, task state | Record delivery | Delivery saved, strip evidence state visible, next assignment shown |

Plant also assigns batches to trucks and zones. This is a planning assumption because no dispatcher persona was specified. Truck users cannot change lab results or silently substitute batches. Lab users cannot assign deliveries. UI hiding is not access control: enforce roles on writes at the server.

### Low cognitive load rules

1. One primary action per task state; show the next incomplete step rather than all forms at once.
2. Keep batch, sample and zone identity visible during entry; prefill identity and time, never test results.
3. Use explicit verbs: Register batch, Record dispatch, Publish results, Save delivery. Pair errors with a specific correction.
4. Save drafts, preserve input on errors, support Back, and announce durable success. “Saved on this device” differs from “Synced.”
5. Show technical evidence and history on demand. Keep essential uncertainty, units, advisory instructions and errors visible.

Retain at least 48px touch targets and 17px body text. Test keyboard focus, 200% zoom, 360px width, long translated labels and non-color status recognition. Have community speakers review Inuktitut; preserve an honest fallback marker until reviewed.

## 3. Three end-to-end workflows

### Plant: register → sample → assign

1. **Register batch:** plant/loading point, batch time or bounded interval, volume if known. Generate immutable batch ID; show it immediately after save.
2. **Prepare sample:** generate sample ID/label linked to batch; use the configured, versioned sampling checklist. Record collector, collection time/location, requested tests and destination lab. Save incomplete preparation as a draft.
3. **Record dispatch:** record physical handoff time, recipient/courier or tracking reference and checklist completion. “Sample sent” requires actual dispatch evidence; clicking a button does not ship it. Lab later records receipt or rejection.
4. **Assign delivery:** pick truck and destination zone(s), with any required approved dispatch eligibility visible. Pending/failed tests follow an explicit operator-approved policy; the plan does not assume all deliveries must wait for lab results.

Show separate preparation, lab, and delivery states. A batch can be delivered while a lab result is pending if the configured operating procedure allows it; one linear “batch status” cannot capture that.

### Lab: receive → enter → publish

1. **Receive sample:** scan/search sample ID; verify plant, batch, collection time and requested tests. Record receipt time and accepted/rejected condition. Unknown IDs need reconciliation, not an invented batch.
2. **Enter results:** parameter, measured value or qualitative result, unit, method, tested-at time and report attachment/reference. Support partial panels and invalid samples. The system validates against configured units and rules; no preselected Pass value.
3. **Review and publish:** show the batch/sample identity and every result; record author, reported time and revision. Save draft is secondary. An adverse result creates a prominent plant task and updates recorded test status; official advisory text follows the authorized process.
4. **Correct a result:** create a superseding revision with reason; keep the prior report and recompute affected public summaries. Never silently overwrite history.

### Truck: assignment → delivery → strip evidence

1. **Open current assignment:** batch, truck, zone and any hold/advisory instructions are visible. Confirm collected batch identity; changing assignments is a plant task.
2. **Record actual delivery:** destination prefilled, actual completion time and quantity if known, partial/full zone coverage. Where dwelling records exist, select completed stops from the assigned zone; one delivery must not imply all dwellings were served.
3. **Add strip evidence:** capture/upload a photo, preview/retake it, record sample time and point, strip type and the operator-read value with units (or unreadable). Bind evidence to this batch and delivery/zone. Photo interpretation is not automated in the MVP.
4. **Save and continue:** show Saved on this device / Upload pending / Synced / Needs attention. Resume interrupted photo uploads without duplicate deliveries. Report an unreadable strip as requiring a retest; never convert it into a pass.

Photo proof and measured lab results remain separate evidence types. A field strip observation must not overwrite a lab report or lift an advisory.

## 4. Map and status contract

Use locally agreed delivery zones with stable IDs and dwelling membership. A postal code may be a search alias; use it as a zone only if operators confirm it distinguishes delivery areas. The repository has building centroids and roads, but no verified zone boundaries. Prototype zones must be visibly illustrative.

**Relationships:** a batch can serve multiple zones; a zone can receive multiple batches. The map uses completed deliveries, not assignments alone. Keep scheduled destinations available inside operational detail. Existing dwelling histories remain useful for coverage and investigation.

| Public test status | Meaning | Map treatment |
|---|---|---|
| Needs attention | At least one relevant unresolved failed/flagged result | Red + exclamation + explicit reason |
| Awaiting results | Required evidence is pending, partial or invalid | Amber + clock/word label |
| Results within limits | All required evidence for relevant delivered batches meets the configured rule and freshness policy | Green + check + “Recorded tests,” never “Safe to drink” |
| No current data | No qualifying delivery/evidence, or data is outside the agreed freshness window | Gray + question mark + last-known time |

An official advisory is a separate banner/zone flag and always remains visible, including when recorded tests are within limits. Display its authorized instruction verbatim. Only an authorized advisory update changes it; new water, a strip photo, or a clean result alone does not.

**Aggregation:** first collect relevant deliveries/batches under an agreed retention/exposure rule. Surface any unresolved failure first; otherwise incomplete/missing/stale coverage prevents a fully green zone. Pending evidence takes Awaiting results; other absent or stale evidence takes No current data. Only complete current evidence permits Results within limits. Include text such as “1 flagged batch; 2 awaiting results” in zone detail so aggregation does not hide mixed states. Do not average pass/fail or use the latest clean batch to erase unresolved older exposure.

The batch relevance window, sampling coverage, freshness period, carry-over and clearance rules are configuration decisions requiring operator/authority review. Until established, display insufficient evidence. The existing last-delivery and three-delivery carry-over assumptions are not production policy.

Zone detail shows: zone name; status + reason + timestamp; relevant delivered batch list; lab/field evidence and partial coverage; official advisory if applicable. Public data omits household phone numbers, exact stop histories, staff identities and raw attachments. Staff get authorized evidence detail. Published sample/result identifiers must be appropriate for public use.

## 5. Data and engineering changes

### Records

| Record | Minimum shape / relationship |
|---|---|
| Batch + truck load | `batch(id, plantId, loadingPointId, startedAt, endedAt?, volumeL?, createdBy)`; `load(id, batchId, truckId, filledAt, emptiedBefore?)`. One truck fill per batch is the initial demo convention; separate IDs allow one batch to feed multiple loads later. |
| Sample + result revision | `sample(id, batchId, collectedAt, collectedBy, samplingPoint, requestedTests, sopVersion, dispatchedAt?, receivedAt?, condition)`; `result(id, sampleId, parameter, value, unit, method, testedAt, publishedAt, revision, supersedes?, author, reportRef)` |
| Zone + assignment | `zone(id, name, geometry?, dwellingIds, aliases, version)`; `assignment(id, batchId, loadId, truckId, zoneIds, state, version)` |
| Delivery + strip evidence | `delivery(id, assignmentId, batchId, loadId, zoneId, zoneVersion, dwellingIds?, deliveredAt, litres?, coverage)`; `strip(id, deliveryId, capturedAt, samplingPoint, stripType, reading?, unit?, readability, attachmentId, uploadState)` |
| Advisory + audit | `advisory(id, scope, authority, approvedText, issuedAt, updatedAt, liftedAt?, source)`; append-only changes with actor, timestamp, reason, record version, device event ID. |

Time is stored as ISO timestamps and rendered in community time. Distinguish collection, testing, publication, delivery and sync times. Do not use replay time for operational entries. Snapshot zone membership/version on deliveries so boundary edits do not rewrite historical attribution.

### File-level implementation map

| Existing area | Planned work |
|---|---|
| `index.html`, `js/app.js`, `css/app.css`, `js/i18n.js` | Overview default and Work navigation; move screen rendering into `js/views/`; add Plant/Lab/Truck forms, focused steps, language keys. Preserve legacy `#home/<id>` links as dwelling drill-downs. Put replay clock and simulated Signal inside Demo only. |
| `js/map.js`, new `js/quality.js`, new `data/zones.geojson` | Selectable labeled zones; list equivalent; selected-batch footprint; pure aggregation with explicit unknown/pending states. Demo boundaries clearly labeled until verified. |
| `js/store.js`, `js/sim.js`, new `js/repository.js` | Separate demo fixtures from live records behind an adapter. Retain deterministic simulation only for Demo. Durable IndexedDB drafts/outbox and blobs, stable IDs and retry states. |
| New authenticated API + database + attachment storage | Authorize role/object writes, validate links/units/timestamps, transactionally publish results, audit revisions, return canonical records. Read-only sanitized public projection for Overview. GitHub Pages can host the client but cannot supply shared writes by itself. |
| `js/trace.js`, `js/decay.js`, `js/sms.js`, `sw.js`, tests/docs | Retain trace as candidate investigation logic pending policy review; remove operational “safe until” and automatic all-clear. Keep SMS/replay outside MVP daily navigation. Update cache assets/version, handle stale app/data and test the new flows. |

**Sync contract:** persist locally before acknowledging Save; retry by immutable event ID; server deduplicates and acknowledges before removing outbox events. Attachments have independent resumable state. A result revision or stale assignment conflict needs review, not last-write-wins. Offline status uses real connectivity/sync results. Cached Overview explicitly states “Offline — last updated [time].” A full local store/upload failure is visible; never claim success after a caught write error.

### Scope boundaries

MVP includes the public map/list, all three role workflows, assignment, explicit statuses, photo capture/upload, durable records and traceable evidence. A local demo may demonstrate these with fixtures but must state that data is not shared.

The notice accommodation adds a shared, versioned notice with manual Facebook publishing, radio scripts and household-contact tracking. Channel publication is separate from confirmed resident contact. See the addendum for incremental estimates beyond the base build sequence.

Defer OCR/AI strip reading, route optimization, predictive “safe until,” live truck tracking and automated channel publishing (SMS/Facebook). Retain the June replay as optional demo material. No frontend framework migration is needed for this scope.

## 6. Build sequence and completion gates

Estimates are hands-on time for one developer familiar with this repository, excluding lab turnaround, stakeholder response, translation and hosting procurement. A day here is 8 working hours.

| Order | Bounded deliverable | Estimate | Exit criterion |
|---|---|---|---|
| 1 | Confirm batch meaning, zone membership, sample procedure and advisory ownership; approve screen flows | 4 hours | Written defaults and unresolved operational blockers; representative zone data |
| 2 | Build Overview/map/list and explicit status model using labeled demo fixtures | 12 hours | Zone → batches → results is usable on phone and keyboard; no data never appears green |
| 3 | Build Plant/Lab/Truck workflows through a local repository adapter | 24 hours | One registered batch travels through sample dispatch, lab publication, assignment, delivery and strip capture without retyping IDs |
| 4 | Add shared API, authorization, persistent uploads, offline outbox and reconciliation | 32–48 hours | Separate devices share records; refresh/retry does not lose or duplicate data; role violations rejected |
| 5 | Run task-based usability checks, accessibility/offline checks, and policy/content review | 12–20 hours | Critical tasks completed unassisted; adverse/pending/stale states correctly understood; agreed production gates met |

**Demo target:** steps 1–3, about 40 developer hours (5 days). **Connected pilot candidate:** all steps, about 84–108 hours (10.5–13.5 days), plus external review. These are planning estimates, not a production safety approval.

### Verification

1. **Public understanding:** give five participants 30 seconds each to find a named zone and identify its recorded result status; target four unassisted successes. Ask what pending and within-limits mean; revise copy if either is mistaken for an official all-clear.
2. **Role tasks:** observe at least one plant operator, lab worker and driver. Targets after orientation: batch registration under 2 minutes, result entry under 2 minutes for a prepared report, delivery/strip record under 60 seconds excluding sampling. Record errors, backtracks and prompts, not just speed.
3. **Data correctness:** test multi-batch zones, multi-zone batches, partial coverage, failed result followed by clean result, result correction, missing/stale/invalid tests, active advisory with passing tests, and changed zone boundaries.
4. **Reliability:** test reload after local save, cross-device sync, duplicate retries, offline camera evidence, interrupted upload, rejected write, storage full and stale assignment conflict. Verify public status uses only acknowledged/published data.
5. **Accessibility and permissions:** verify the map/list convey the same data; keyboard and screen-reader tasks; 360px/200% zoom; text+icon statuses; reviewed language copy; server rejection of cross-role edits and public exclusion of private records.

## 7. Decisions to validate

Planning defaults let prototype work start; these do not establish compliance.

| Decision | Planning default | Confirm with |
|---|---|---|
| What defines a batch? | One registered truck fill initially; separate batch/load IDs retained | Plant operator |
| What defines a zone? | Named delivery areas with approved dwelling membership; postal code only an alias unless suitable | Local operators/community |
| Who assigns deliveries? | Treatment plant assigns batch + truck + zone | Plant and drivers |
| What does “sample in accordance” require? | Versioned local sampling SOP, requested tests, handoff/receipt evidence; no invented cadence or threshold | Plant, receiving lab and responsible authority |
| Who controls release/advisories? | Configured dispatch policy; official advisories maintained by authorized staff; no automatic lifting | Responsible water/public-health authority |

Next review action: open [the Overview wireframe](screen-flows.md#1-public-overview) and check that the first screen contains only what all users need.
