# Resident notices: Facebook, radio and outage fallback

**Recommendation:** add an outage notification workflow using local FM radio plus tracked household visits/printed notices. Keep SMS as an additional channel when cellular messaging still works. Investigated 2026-09-26; this is a design recommendation, not a verified inventory of Inukjuak's operational equipment.

**Facebook accommodation:** include the town/village's designated Facebook Page as a normal notice channel alongside SMS, radio and direct contact. The user reports evidence of local Facebook notice use; specific Page URLs and administrators have not yet been supplied or verified. Use one approved notice across channels. Facebook adds reach when connectivity is available; it does not replace the outage fallback.

## 1. What “offline” permits

| Outage | Available option, if verified locally | Dependency / limit |
|---|---|---|
| Internet available to the publisher and residents | Publish to the designated town/village Facebook Page | Requires a connected, authorized publisher and connected residents; publication is not proof residents saw the notice. |
| Internet unavailable; cellular messaging still operating | SMS or voice, including an authorized local handset workflow | SMS still needs carrier service. A cloud SMS gateway also needs a working path from the sender. A tower signal alone does not prove the carrier's upstream network works. |
| Satellite/backhaul and cellular service unavailable; local broadcasting works | Locally originated FM announcement; existing operational radios to coordinate staff | Requires functioning transmitter, local input, power and household receivers. An internet radio stream is not a fallback. |
| Broadcast unavailable, or a household cannot receive/hear it | Assigned staff visits, printed notices and agreed public notice points; vehicle loudspeaker where locally appropriate | Requires safe travel, staff and accessible communication. A notice left at the door is not proof it was read. |
| A separately installed local radio network survives | Dedicated radio receivers or a LoRa mesh pilot | Extra hardware, maintained power, coverage and tested delivery behavior. It does not send directly to every ordinary phone. |

Offline caching preserves previously received data. Web push delivers a new server message when the device has connectivity; it does not bypass an outage. That distinction follows from the documented [PWA push delivery sequence](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation). The current `sw.js` caches app/data resources; it is not an emergency communications system.

Carrier documentation distinguishes SMS from data-dependent iMessage/RCS and includes outage checks when messaging fails: [Rogers messaging troubleshooting](https://www.rogers.com/support/mobility/cannot-receive-text-messages). Do not assume the local cellular network survives loss of the community's satellite or other upstream connection; confirm its actual dependencies with its provider.

## 2. Recommended local fallback

1. **FM announcement:** an authorized operator delivers approved wording to the station in person or over a tested surviving staff channel. Broadcast zone names residents recognize, issue time, required action and next update time. Repeat according to the local emergency plan. Have reviewed Inuktitut, English and French versions available.
2. **Targeted household contact:** assign staff to affected zones, starting with priority facilities and residents needing assistance under locally held arrangements. Trucks can carry notices and lists, but urgent warnings must not wait for the next routine water delivery. Use other designated municipal responders if drivers are unavailable.
3. **Coverage tracking:** distinguish Unassigned, Attempted, Notice left, Resident informed and Follow-up needed. Track who still needs contact. A broadcast log records that an announcement aired, not that every resident heard it.
4. **Accessible alternatives:** pair audio with large-print, plain-language notices and direct assistance. Agree beforehand how to reach people who cannot hear radio/loudspeakers, read the notice, travel to a notice point or use a smartphone. Avoid posting household contact/support details publicly.

There is a concrete local starting point: the [KRG map of Inukjuak](https://krg.ca/iu/assets/maps/Inukjuak-map.pdf) labels an FM station. This establishes a mapped facility, not current staffing, frequency, coverage, emergency access or backup-power capability. Canada's [power-outage preparedness guidance](https://www.canada.ca/en/services/policing/emergencies/preparedness/get-prepared/hazards-emergencies/power-outages/how-prepare.html) recommends battery/crank radios and knowing official local information points. The layered workflow above is our design proposal based on those capabilities.

**Upstream limit:** if the remote lab cannot communicate its new result to the community, RemoteWater cannot know that result. Establish an independent, tested lab-to-authority contact procedure. A different satellite service is only useful if that path survives the specific outage. Record verbal reports with source, time and read-back confirmation; reconcile with the lab report later. Any precautionary decision uses the authority's existing procedure, not an invented result.

## 3. Product accommodation

Add **“Share notice”** inside the plant's authorized advisory workflow. Offer Facebook, SMS, Radio and Household contact as compact channel choices; show the selected channel's next action. Include **“Notify without internet”** for radio scripts and household routes. Do not add a new panel to the public home page.

```text
Notice A-014 · Revision 2 · North zone
Approved by [authority] · Issued [local date/time]

1. Read radio script
2. Open household contact route
3. Record contact outcome

Radio: announced [time] / not yet confirmed
Households: informed / notice left / still need contact
Saved on this device · Sync pending
```

These are actions in sequence, with one primary action at a time. Show exact approved text and a readable zone map/list. Cache scripts, authorized templates, contact routes and language assets before an outage. Print/export preparation packs while equipment works; keep blank paper forms as backup. A new notice requires a locally authorized issuer and device access that does not depend on fresh cloud login.

Use one notice ID and revision across Facebook posts, radio scripts, paper copies, visits and later SMS. Include issue time, scope, instruction, authority and next update location/time. Schedule updates; do not make an advisory expire automatically just because no update arrives.

If phones cannot exchange records, allocate non-overlapping routes through one local coordinator and paper/radio handoff. Do not claim cross-device synchronization while disconnected. A local server/Wi-Fi deployment could enable local sharing but is additional infrastructure, not something GitHub Pages or the present service worker supplies.

On reconnect, merge contact events by stable event IDs, retain times/source, and flag conflicting advisory revisions for authorized review. Reconcile queued messages and Facebook drafts against the current notice before sending: do not release an obsolete all-clear after a newer warning. “Facebook published,” “SMS accepted,” “broadcast aired,” “notice left,” and “resident informed” remain distinct states.

Public offline wording: **“Offline — last update [time]. New notices may not be shown. For current information: [verified local station / agreed contact point].”** Retain the last known official advisory; never show an offline green map as assurance of current conditions.

## 4. Facebook workflow

**MVP: prepare in RemoteWater; publish manually through the designated Page's existing administrator.** This accommodates the channel without making API integration a prerequisite. Automatic posting is deferred pending a separate review of platform capabilities, permissions and community ownership.

1. **Prepare:** the authorized issuer selects an approved notice and Facebook. Prefill the designated Page, reviewed language versions, recognizable affected zones, instruction, issue time, notice ID/revision, issuing authority and next update time. Include a public RemoteWater notice link for detail, but keep the full essential instruction in the post so no click is required.
2. **Publish:** show a preview and **Copy post** as the primary action. Offer **Open village Page** as a secondary action. Copying or opening the Page does not mark publication complete. If no authorized Page administrator is available, leave a pending task and continue the other channels.
3. **Record:** after the administrator publishes, record the post URL, publication time, publisher and notice revision. Label this **Published — resident reach unknown**. Likes, shares, comments or estimated reach do not count as household acknowledgment and must not close household follow-up tasks.
4. **Update:** a correction or authorized lifting creates a new notice revision and a task for every channel used. For Facebook, require the administrator to publish the current update and clearly mark the earlier post as superseded where they can edit it; record both links. Do not rely on a comment under an old post to communicate a correction. Shared copies may persist, so each post needs its own issue time and revision.

Use plain text as the required format. An optional notice image must repeat, rather than replace, the essential text; include alternative text when publishing images. Put reviewed Inuktitut/English/French content in the agreed community order. Do not generate unreviewed advisory translations or publish private household details.

Offline, save **Draft — waiting for connectivity** with the source notice revision. On reconnect, require a current-revision check before the administrator copies/publishes it. If an authorized administrator outside the outage area has independently received the approved notice through a surviving channel, they can publish it, but local residents without connectivity still need radio/direct contact.

**Configuration and records:** store the community's designated Page URL and responsible/backup publisher. Add a channel-publication record: `noticeId, revision, channel, destination, state, preparedAt, publishedAt?, publisher?, postUrl?, supersedesPublicationId?`. Store contact outcomes separately. Use publication states Draft, Ready, Published, Needs update and Superseded; a failed publishing attempt remains Ready with an error, never Published.

**Public homepage:** add a small “Village notices on Facebook” link inside advisory details or the footer after the Page is verified. Keep the official instruction and update time directly on RemoteWater. Do not embed a social feed, require Facebook login to read the app's notice, or turn comments into advisory evidence. Questions/corrections received socially go to authorized staff for review.

**Acceptance checks:** copying does not mark Published; Page/notice/revision are visible before copying; partial channel publication leaves outstanding tasks; publication does not change household contact counts; offline drafts survive restart; superseded drafts are stopped on reconnect; public exports contain no private records. Exercise one warning and one correction across Facebook, radio and paper in the same tabletop drill.

**Additional estimate:** 4–8 developer hours for manual Facebook preparation, publication tracking and the public Page link, assuming the shared notice model and offline store exist. API automation and account administration are excluded. No social-media post is sent as part of this planning work.

## 5. Options that need separate validation

**Alert Ready:** useful through authorized emergency-management partners when applicable, but not an independent outage fallback. CRTC says wireless alerts require a compatible phone connected to LTE or newer, and describes radio/TV distribution. Do not assume an ordinary app can originate these alerts or that every water notice qualifies. See [CRTC emergency alerts](https://crtc.gc.ca/eng/television/services/alert.htm) and [authorized alerting organizations](https://crtc.gc.ca/eng/archive/2025/2025-225.htm).

**LoRa / Meshtastic:** technically supports messages without cellular or internet using separate radios connected to a phone/computer or a standalone device. See [official Meshtastic getting-started documentation](https://github.com/meshtastic/meshtastic/blob/master/docs/getting-started/index.mdx). Recommendation: consider a small staff-coordination pilot after the FM/visit workflow, not a replacement for household outreach. Validate terrain/building coverage, winter power, maintenance ownership, authentication and duplicate/replay handling. Network acknowledgments do not establish that a resident understood an instruction. No equipment purchase or range guarantee is implied here.

## 6. Validation before relying on it

1. **30-minute infrastructure interview:** ask municipal emergency staff and the FM operator which station/transmitter, staff radios, backup power and local-input paths survive an internet outage; ask the carrier separately about SMS/backhaul dependencies.
2. **30-minute workflow review:** agree who can issue/correct a notice offline, how the lab reaches that person, who dispatches visits and how priority/accessibility needs are maintained. Verify the village Facebook Page URL and primary/backup publisher; distinguish authority to issue an advisory from permission to publish an already-approved notice.
3. **60-minute tabletop drill:** use a clearly labeled exercise, with no public alert transmission. Simulate lost internet, then lost cellular and FM. Trace one new warning and one correction through radio scripts and household routes; measure unreached households and message discrepancies.
4. **Controlled field drill:** set duration and route with the community; obtain local coordination before broadcasting or visiting. Test actual equipment and coverage without turning off essential infrastructure. Success requires understanding at intended recipients, not merely clicking Send.

Planning estimate for software only: **12–20 additional developer hours** for cached notice packs, scripts, route outcomes and reconciliation UI, assuming the planned durable offline store and authorization exist. Radio integration, local servers, receiver hardware and field deployment are separate work. The first infrastructure interview determines whether FM is a dependable starting point.
