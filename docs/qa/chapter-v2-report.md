# Independent chapter v0.2 QA

Date: 2026-10-30, Europe/Kyiv. Reviewer: sanctuary_review subagent.
URL: http://127.0.0.1:5180/?session=qa-chapter-v2

## Method

Real UI-only playthrough in a disposable URL-scoped save. No state injection, storage edits, clock changes, or resource gifts. Browser DOM inspection was read-only. IAB was unavailable, so Chrome extension was used. CSS viewport was measured because Chrome zoom made nominal capability dimensions differ: actual desktop **1279×720**, mobile **375×750**. Temporary viewport override reset and QA tab closed afterward.

## Result

**Functional end-to-end PASS.** First chapter can be completed using the visible game controls and earned resources.

1. Waited for the first egg and hatched Mossleaf/Mokholyst.
2. Fed it three times; each feed deducted two berries and adulthood enabled production.
3. Used the free forest forage node repeatedly, verifying +3 berries and cooldown.
4. Collected dragon-produced berries. First-collection objective advanced.
5. Sold two six-berry NPC orders. Coins and remaining order budget changed consistently.
6. Bought Ember/Zharyk and Stone/Kremin eggs with earned coins, hatched both and fed them to adulthood. Three distinct professions reached.
7. Collected embers and ore, crafted one traveler charm. Recipe consumed two of each ingredient; objective advanced to expedition.
8. Natural eclipse opened the ruins. Deselected Mossleaf and Stone, leaving **only Ember** on the team. Reward preview changed from six to four relics.
9. Started expedition for three berries. Ember was marked away; Stone stayed productive, and four ore were collected while Ember traveled.
10. At the gate chose the deeper vault. Two embers and two ore were deducted, relic preview changed **4→7**, and the next timer was ten seconds.
11. Used the clearly labeled demo phase toggle to return the outside world to green during travel. The expedition continued normally.
12. Claimed **15 coins and seven relics**.
13. Restored the Heart of the Valley. Four embers, four ore and six relics were consumed. Completion modal appeared with three inhabitants, two orders and one expedition. Fourth nest became available.
14. Closed completion modal and reloaded: restored shrine, **7/7 chapter**, fourth nest and final balances persisted.
15. On mobile selected Mossleaf and collected a further 15 berries successfully after reload.

Balances directly after restoration: **31 coins, 0 berries, 0 embers, 0 ore, 1 relic**. After the additional mobile collection: **31 coins, 15 berries, 0 embers, 0 ore, 1 relic**.

## Responsive and visual checks

- Desktop header, main scene and bottom navigation fit together at actual 1279×720.
- Inspector supports its own scroll; changing sections resets it appropriately.
- At mobile 375×750, document scrollWidth equals 375: no horizontal overflow.
- Mobile bottom navigation buttons measured about 69×59 CSS px, within the viewport.
- Selecting a section/creature reveals the mobile inspector; the production collect action remained usable.
- Completion modal fits mobile width and height; return button and close action are reachable.
- Screenshot capture included an unrelated blank margin due Chrome viewport capture behavior. Saved PNGs were cropped to the measured CSS viewport; game content was not altered.

## Findings

### Fixed during the pass

- Shrine control originally overlapped the first dragon's head. Root moved it; final desktop screenshot confirms separation.
- Repeated Vite hot reloads reset the selected dragon between actions. This was development-only interference, not a persisted progression loss. Root paused edits for the final sequence.

### Layout issue resolved in final retest

The initial pass found the lower-left Stone dragon behind the objective card and its harvest bubble behind the forage node. Root moved lower nests upward and the forage node left. Final independent retest at 1279×720 and 375×750 confirms all three creature labels remain above the objective, and forage no longer covers Stone's harvest bubble. Updated `chapter-v2-restored-desktop.png` and added `chapter-v2-restored-mobile.png` show the final layout. Mobile shrine label remains close to Mossleaf's harvest bubble; it is a minor spacing refinement for the art pass, not a blocked action.

### Product limits, not failed tests

- Art and object placement remain temporary; this is a functional slice, not a final visual-quality approval.
- Economy, rewards and marketplace are local simulation. No wallet, real funds or onchain market were tested.
- Expeditions currently guarantee rewards; the meaningful implemented decision is team composition and the material cost of delving, not combat or randomized danger.

## Evidence

- `chapter-v2-complete-desktop.png`: desktop completion modal.
- `chapter-v2-complete-mobile.png`: mobile completion modal.
- `chapter-v2-restored-desktop.png`: shrine restored, fourth nest and chapter 7/7 after reload.
- `chapter-v2-mobile-action.png`: mobile production action after completion.

Automated economy coverage is maintained separately in `tests/engine.test.js`; latest root run reported 25 passing tests. This report describes the independent browser playthrough rather than substituting unit tests for UI verification.

## Final position retest

Reopened the same completed save after root froze edits. Persistence still shows three adult species, fourth nest and chapter7/7. Updated desktop/mobile restored screenshots and completion modal screenshots with the neutral completion copy. Requested objective/forage overlaps are resolved; no additional economic actions were performed. Browser viewport restored and temporary QA tab closed.
