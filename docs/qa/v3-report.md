# Hatchglen v0.3 — verification record

31October2026. This report separates actual UI checks, automated simulated progression and source/screenshot reviews. It does not claim measured retention or that every person will find the game fun.

## Verified gameplay and usability

Root used the actual running game at127.0.0.1:5180 with isolated profile `author-full-v3`:

- Title menu → first egg selection → hatch → three feeds → adult. The small-phone pass also exercised free-forage recovery from insufficient berries.
- Actual production collection → finite Mara order → exact resource debit and coin credit → basic tutorial completion → egg chooser.
- Invited Ember and Stone with earned/starter game resources; hatched and grew both. No resource gifts, browser-state injection or debug inventory used.
- Collected all three professions, crafted a charm and inspected team/reward preview.
- Verified the real daylight gate disables departure. For the manual expedition check, deliberately used the clearly labeled temporary demo phase control; this changes the sky, not inventory. Automated scenario tests separately complete both chapters using natural phases.
- UI testnet registration of registry #3 → list/buy/withdraw → confirmed buyer owner, then reload preserved the confirmation. See root-v3-near-ui-proof.json and screenshot.
- Sound/reduced-motion settings accessible. Toggling reduced motion gave body class and computed dragon animationName='none'. Camera home/zoom buttons work.

Both chapters were then completed through the UI:6adults,11funded trades,3expeditions,3charms, a level3Stone dragon and all3locations. Root tested berry barter, free-food recovery, rename, relocation into the quarry, exact profession bonus, the paid sixth-nest gate, opening ruins and buying into a specific ruins nest. The final chapter button consumed12ore/12embers/12relics and showed completion; reloading retained5/5progress. Screenshots: root-v3-chapter-one-complete.png, root-v3-chapter-two-complete.png and hatchglen-v03-final-desktop.png.

During this extended pass a level3reward-preview mismatch was found. Preview now uses the engine's canonical expeditionReward export; Lv3/Lv4/Lv5and cap boundaries have a regression test. The next displayed7relic preview matched the actual7relic departure snapshot.

## Responsive and visual evidence

- 1280×720desktop: menu, first adult, sale, three dragons, map placement, camera zoom, NEAR proof.
- 390×844phone: sale/completion CTA, egg chooser and selected dragon with terrain.
- 375×667phone: fresh onboarding → hatch → feed → adult. Tutorial moved below HUD and redundant chapter card hidden during guidance, preserving the egg view and reachable action.
- Regional artwork is separate from interactive nodes. Independent world/brand agents inspected root-captured screenshots: feet touch terrain; Mara/workshop/shrine now stand on clearings, without critical overlaps.
- The lossy ruins export had visible RGB bands around soft alpha. Replaced with lossless WebP; decoded RGBA equals original source exactly.
- No claim of a physical iPhone/Android touch-device test or measured FPS. Pinch/drag handlers received source review; desktop camera and responsive viewports were exercised.

## Independent reviews and fixes

Reports: brand-v3/REVIEW.md and review-v3-independent.md. Browser interaction was serialized after concurrent browser control caused tool timeouts; those timeouts were not labeled game defects. Agents independently inspected saved screenshots/source.

Fixed: hidden mobile tutorial completion button; excessive12step intro (now ends after first sale); wrong third-dragon focus; incorrect grove name; tiny labels and awkward plurals; overlapping mobile guidance/panels; missing chapter2checklist and next-zone gate; inaccurate reward/output previews; resource particles that ignored profession; floating props; pointerdown camera movement before click; manual reduced-motion handling; timer/progress-bar updates between state changes.

## Automated checks

- 42/42 engine tests. Two-chapter progression uses only legal earned resources, funded orders and natural phases. Another scenario deliberately wastes starter coins on food and recovers by barter/forage.
- 17/17 Rust contract tests and4/4 bridge tests. Real testnet proof files are in contracts/market/.
- Production build passes; current client JS about102KB (~37KB gzip), CSS about49KB (~12KB gzip), plus bundled font/art. This is bundle measurement, not FPS measurement.
- Brand contrast checks pass (5.16:1–10.54:1 for tested pairs);14dates/28drafts have no280character overflow.
- HTTP request to private `.local/near-testnet.json` returns403. Keys stay outside public/dist and are not printed in reports. Optional testnet tools can be absent without preventing the normal game from starting.

## Known limits

Local saves/economy are client-authoritative. No user wallet login, NEP-171 NFT, public player market, AI, live NEAR-price trigger, mainnet, public hosting or submission. The NEAR panel is a separate verified custom-registry demonstration using disposable testnet accounts. Baby geometry is a scaled version of its species. The whole-map desktop framing was lowered so all six wings sit below the HUD. Neither language localization beyond Ukrainian nor assistive-technology behavior on a real mobile device has been exhaustively verified.

## Production artifact smoke

The actual dist build was served separately on5182. All terrain/logo images loaded; menu→guided egg→hatch worked, no browser errors were captured. Without the local bridge, NEAR correctly reports unavailable. The static archive is releases/hatchglen-v0.3-web.zip (~6.6MB); releases/manifest.json records its checksum and content count. It contains only dist files, not credentials or server tooling.

## Cleanup

IAB responsive override was reset and a fresh start was left as the deliverable tab. The temporary5182server was stopped;5180remains for the game/testnet bridge. Chrome QA cleanup was attempted by the owning agents; their debugger was detached on the locked computer, so closure/reset of those temporary Chrome tabs could not be confirmed. No unrelated user tabs or browser zoom settings were changed.

Fresh-start regression check: the first Play click initializes a new profile at daylight2:00with an8second egg countdown, even if the title menu has been left open. Existing saves continue unchanged. Timer reaches a stable hatch action.
