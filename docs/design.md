# RemoteWater design notes

## 1. How water moves, and where the record breaks

```
Source -> Treatment plant -> [loading arm] -> Truck tank -> Household tank -> Tap
              ^ tested here                    ^ nothing recorded today ^
```

Quebec's regulation (RQEP, Q-2 r. 40) requires roughly two bacteriological samples a week for a
system of Inukjuak's size, a 0.3 mg/L free chlorine residual at the plant outlet, and immediate
notification of users when E. coli is found. Samples go to a private lab in Montreal. Between the
sample and the result, trucks keep delivering. When the result fails, the operator has no record of
which homes received which water, so the only possible notice is "everyone, boil, until further
notice".

## 2. Data model

Four records. All small. All producible from a phone.

| Record | Written by | Fields |
|---|---|---|
| `sample` | operator | id, takenAt, resultAt, param (ecoli, coliform, freeCl, turbidity), result (pass / fail), value |
| `load` | driver, at the plant | id, truckId, filledAt, freeCl, turbidity, emptiedBefore |
| `delivery` | driver, at the house | id, loadId, truckId, houseId, at, litres, seq |
| `house` | registered once | id, lat, lon, kind, phones[], lang, priority |

A delivery belongs to whichever load is open on that truck. When the truck refills, the old load
closes and a new one opens.

## 3. The trace (`js/trace.js`)

1. **Bad window.** For a failed bacteriological sample: start = the last *passing* sample taken
   before it; end = the first passing sample taken after it, or "now" if none exists yet (the window
   is *open*).
2. **Affected loads.** Loads filled inside the window.
3. **Carry-over.** Trucks are rarely empty at refill, so the first N deliveries of the next load on
   the same truck are included unless the driver ticked "tank was empty before refill". N = 3 by
   default (`carryoverDeliveries` in config).
4. **Affected homes.** Homes with at least one affected delivery, priority buildings first.
5. **Status per home at time t.** Red if the water in the tank is from the window or the window is
   open. Green once a delivery from a load filled *after* the window closed has arrived. Only lab
   results known at time t count, so the replay is honest about what was knowable when.

All of this is pure functions with tests (`node --test`).

## 4. Offline and low bandwidth

- The driver's phone queues `load` and `delivery` events in localStorage. No signal is needed to
  record. The plant has connectivity (it is where the operator's computer is); the truck returns
  there many times a day, so the queue syncs on a schedule the truck already keeps.
- The household page is static HTML plus a few JSON files. The whole app, including the map, is a
  few hundred kilobytes and is cached by a service worker after the first visit.
- No map tiles: the village is drawn as SVG from OpenStreetMap building centroids and roads.
- No web fonts, no CDN, no framework, no analytics.
- Alerts are SMS. The message is under two segments in English and French. SMS works on any phone
  and needs no data plan. If the plant's link is down, the driver's phone can send the same
  messages directly.

## 5. SMS content

One message per home, in the home's registered language, naming the delivery date so the family
can relate it to what is in their tank:

> RemoteWater: water delivered to your home on June 5 may be unsafe. BOIL 1 minute before
> drinking. Reply 1 for details.

Homes outside the window get a short "not affected" notice, which matters as much as the alert:
it stops a whole community from boiling when only part of it needs to.

When the window closes, each home gets its own all-clear as soon as its tank holds post-clean water.

## 6. Accessibility evidence

- Colour is never the only signal. Red and green status both carry an icon (⚠ / ✓) and words.
  Priority buildings are squares, homes are circles, the plant is a diamond.
- `role="status"` and `aria-live` on the household card; every map building has an accessible
  name including its status and is keyboard focusable.
- 17px base text, 48px controls, 4px focus rings, system font, high-contrast palette
  (checked against WCAG AA for the status colours on their backgrounds).
- Three languages in the UI; Inuktitut strings that are not yet translated fall back to English
  with a visible "translation pending" mark, so an untranslated string is never silently shown as
  if it were Inuktitut.
- Works at phone width with no horizontal scrolling.

## 7. What the fill-time chlorine gate adds

The driver already stands at the loading arm while the truck fills. A strip or a hand-held
colorimeter gives a free chlorine reading in seconds. Logging that reading per load does two things:

1. If residual is below 0.3 mg/L the app says so before the truck leaves. E. coli does not survive
   adequate chlorine residual, so a low reading is an early warning that does not wait for Montreal.
2. Every load then has a chlorine value, which narrows a later trace and calibrates the safe-until
   estimate for household tanks.

Whether low residual was the cause in June 2026 was not published. The replay marks the low readings
as hypothetical.

## 8. Open questions for Inukjuak (ask Amenda)

- How many trucks run on a normal day, and how many homes does one load serve?
- What is the household tank size, and how often is a home served in summer versus winter?
- How were residents told about the June 2026 advisory, and how long did it take to reach everyone?
- Is there a house numbering scheme that a QR sticker could use?
- What should the Inuktitut boil-water message say, and who signs it?
- Who owns the phone list, and how do people opt in and update numbers?
