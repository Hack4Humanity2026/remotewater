# How water monitoring works in Nunavik today, and where RemoteWater plugs in

Researched 2026-09-26. Every fact carries its source. Items marked *unconfirmed* could not be verified.

## 1. Who does what

| Actor | Role | Source |
|---|---|---|
| Northern Village (NV), the municipality | Runs the plant and the trucks with its own employees. Inukjuak "operates three water and sewage trucks staffed by municipal employees". | [Nunatsiaq 2024-05-27](https://nunatsiaq.com/stories/article/nunavik-villages-lack-reliable-access-to-water-causing-health-centre-and-school-closures/) |
| Kativik Regional Government (KRG), Municipal Public Works, Technical Assistance Program (TAP) | Does not deliver water. Gives day-to-day phone assistance to NV operators, training, parts, and "follow-up on sampling/tests"; compiles the weekly sampling reports region-wide; issues news releases on advisories. Coordinator: Alfred Nikiema. | [KRG MPW report Feb 2026](https://www.krg.ca/en-CA/assets/Council/2026/feb/MPW_Activity_Report.pdf), [Nunatsiaq 2026-06-11](https://nunatsiaq.com/stories/article/inukjuak-under-boil-water-advisory-after-e-coli-detected-at-water-plant/) |
| Accredited laboratory (Bureau Veritas, Montreal, since July 2025) | Analyses the compliance samples flown south; reports results electronically to the Quebec Ministry; must phone the village on an E. coli hit. | KRG MPW report Feb 2026; RQEP art. 33, 35 |
| Ministère de l'Environnement (MELCCFP) and the regional public health director (DSP) | Receive lab results and advisory notices. | RQEP art. 33, 35, 36 |

## 2. What is measured and written down today

Three parallel streams, plus a paper logbook.

### a. Daily plant logbook (the "registre"), regulated

Quebec's RQEP art. 22.1 has a Nunavik adaptation: for tanker-truck systems north of the 55th parallel no continuous meters are required. Instead the operator takes a grab sample **at least 5 days a week** for free chlorine residual, turbidity, pH and temperature, and writes each entry in a logbook with the date and the name of the person who took it. The responsable signs it and keeps it **at least five years**, available to the Minister. (Source: MELCCFP interpretation guide, June 2026, art. 22 and 22.1, [PDF](https://cdn-contenu.quebec.ca/cdn-contenu/environnement/eau-potable/qualite-eau-potable/guide-interpretation-reglement-qualite-eau-potable.pdf).)

**This is the hook.** The operator already writes a chlorine number in a book every working day. RemoteWater's "batch reading" is that number. No new task.

### b. Weekly Colilert, local, operational

Since the early 2000s each village's operator runs a weekly Colilert presence/absence test (result in about 24 h) and sends a weekly report to KRG MPW. If a village's report does not arrive, KRG automatically issues a boil-water advisory. Regional target 85%; 2025 actual 80%; Inukjuak 90%. Shortfalls are attributed to operator absence and frozen pipes, not shipping, which is consistent with on-site incubation, but no source says "incubator at the plant" verbatim (*unconfirmed*). (Sources: [Nunatsiaq 1999](https://nunatsiaq.com/stories/article/the_land_of_boiled_water_nunavik_water_management_system_failing/), [Nunatsiaq 2013](https://nunatsiaq.com/stories/article/65674nunaviks_regional_government_wants_to_see_more_local_water_testing/), [The Regional 2024](https://www.theregional.com/too-few-nunavik-municipalities-regularly-test-their-water-krg/), KRG MPW report Feb 2026.)

### c. Monthly compliance microbiology, shipped south

For 1,001 to 8,000 people (Inukjuak), 8 samples a month for E. coli and total coliforms (RQEP art. 11), analysed only by an accredited lab. Samples fly to Bureau Veritas in Montreal. KRG reports "inconsistent sampling and shipment logistics (missed carrier schedules, delayed sample delivery)" and is exploring an accredited lab in the region. The lab must send results to the Ministry electronically within 10 days (art. 33). (Sources: interpretation guide; KRG MPW report Feb 2026.)

### d. Quarterly physical and chemical campaigns, shipped south

(Source: KRG MPW report Feb 2026.)

## 3. What happens on an E. coli detection (RQEP art. 35 to 37)

1. The lab informs the village **without delay**, and also the Minister, MAPAQ and the regional public health director.
2. The village, **as soon as it is informed**, notifies users "by the media, by individual written notices, or by any other appropriate means", and notifies schools and health institutions individually. The notice must say boil at least 1 minute (art. 36.1). Inukjuak's June 2026 notice said 2 minutes.
3. A plant that fills tanker trucks must notify the truck operator without delay (art. 37).
4. The advisory is repeated every 14 days until samples are clean; lifting requires two clean sample rounds less than 72 h apart. (Sources: interpretation guide; [INSPQ](https://www.inspq.qc.ca/eau-potable/avis-ebullition); [Quebec.ca non-compliance page](https://www.quebec.ca/agriculture-environnement-et-ressources-naturelles/eau-potable/obligations-qualite-eau-potable/normes-qualite/non-conformite-normes).)

No time limit in hours exists in the text; "without delay" is the standard. In practice notice reaches residents through a KRG news release, community FM radio (confirmed for Aupaluk and Kuujjuaq, *not confirmed for Inukjuak*), and Facebook. (Sources: Nunatsiaq 2026-06-11; [CBC Jan 2025](https://www.cbc.ca/news/canada/north/aupaluk-boil-water-9-months-new-water-tank-1.7413158); [Kuujjuamiut radio](https://www.kuujjuamiut.ca/radio).)

## 4. Digital systems that already exist

**Kiujik** (Code for Canada with KRG MPW, three-plus years in development, piloting in Kuujjuaq since 2025): residents request water or sewage service through an online form or a phone number; the app dispatches requests to available drivers, tracks completion, and gives administrators real-time data; English, French and Inuktitut. KRG's February 2026 report describes the same system with "a centralized and automated phone system" and planned truck route planning, and says a demo version is in pilot in Kuujjuaq. (Sources: [Nunatsiaq 2025-09-16](https://nunatsiaq.com/stories/article/new-app-for-water-sewage-service-being-tested-in-kuujjuaq/); KRG MPW report Feb 2026.)

**This is the second hook.** Kiujik already produces a per-household, per-driver delivery record. RemoteWater is a layer on top of it, not a replacement.

GPS on trucks: no source found. Household tanks: about 1,200 L, varying by house type (*unconfirmed*, from a search snippet of the Kangiqsualujjuaq study, [doi](https://doi.org/10.2166/wh.2024.246)); a sewage-full red light and a water interlock exist in newer homes ([Nunatsiaq 2020](https://nunatsiaq.com/stories/article/during-covid-19-pandemic-nunavik-community-suffers-from-water-woes/)). Residents request water by phone; calls "sometimes go unanswered", which is what Kiujik is fixing.

## 5. Integration plan: no new tasks, nothing to maintain at the house

| RemoteWater needs | Where it comes from today | New work for the end user |
|---|---|---|
| Chlorine reading per batch | The daily logbook entry the operator already makes (RQEP 22.1). Loads filled that day inherit it. One extra dip at the loading arm is optional. | None. Digitizing the logbook is one photo or one form a day, by the same person, replacing nothing. |
| Delivery log (house, truck, time) | Kiujik's dispatch and completion record where it is deployed. Elsewhere, a phone in the truck cab with GPS: a stop of more than a few minutes within 30 m of a known building is a delivery. Building positions come from OpenStreetMap (already in this repo). | None for the driver where Kiujik runs. One tap, or zero taps with GPS, elsewhere. |
| Lab result | The lab already phones the village and files electronically to the Ministry on an E. coli hit. The operator, or KRG TAP who already compiles the weekly reports, records it once. | One click by the operator or by KRG. |
| Phone numbers per home | The number a household calls Kiujik or the garage from is its registration. Health centre and schools are registered once. | None. |
| Sending the notice | SMS from the plant computer or KRG; the same text feeds the FM radio script. | None. Residents receive a text; no app, no data plan. |
| Hardware at the house | Nothing. | None. Nothing to calibrate or repair. |

**Why this fits the regulation rather than adding to it**: art. 36 already requires "individual written notices or any other appropriate means" and art. 37 already requires the truck operator to be told. RemoteWater is the mechanism for both, and the five-year logbook becomes searchable.

**Who would run it**: KRG's Technical Assistance Program already receives the weekly Colilert reports from all 14 villages and issues the advisories. One instance at KRG, one buildings file per village, is the natural home. If RemoteWater is down, nothing in the existing process breaks; it is additive.

## 6. Open questions for Amenda or KRG

- Is the weekly Colilert incubated at the Inukjuak plant, and who writes the result down?
- Does the loading arm get its own daily chlorine reading, or only the plant outlet?
- Is Kiujik coming to Inukjuak, and does its delivery record include the time and the driver?
- How did residents hear about the June 2026 advisory, and how long did it take?
- What does the daily logbook look like: paper, spreadsheet, or a KRG form?
