# Independent v3 review

## Verified directly

- NEAR custom registry: 17 Rust tests pass; release wasm build passes.
- Local bridge: four Node tests pass including lock held before asynchronous request parsing.
- Standalone loopback HTTP status verified actual deployed contract configuration.
- HTTP registration id2 and atomic list/buy/withdraw completed on real free testnet; buyer ownership and seller credit0/pending0 queried afterward. Public evidence: contracts/market/bridge-smoke.testnet.json.
- Tutorial source: hatch/feed/collect/sale/craft/expedition advancement derives from actual engine state, rather than clicking Next.

## UI limitations of this review

Fresh Chrome session qa-review-v3 displayed main menu. Multiple button dispatches and semantic locator timed out before execution; alternate IAB tab creation also timed out. Therefore this review does not claim a completed independent UI playthrough. Root is conducting live UI testing with a functioning handle.

Read-only visual inspection of docs/qa/root-v3-desktop.png shows clear resource hierarchy and visible world destinations. Tutorial overlay occupies lower-left forage area. Initial tutorial says center nest while the egg sits in upper-left grove; wording should name the grove/egg.

## Actionable issues sent to root

1. Tutorial step9 guideFocus opens eggs even after stone egg exists. Focus existing stone dragon when present; otherwise open eggs.
2. Initial center-nest instruction mismatches actual grove placement.
3. POST register → immediate trade can hit bridge15second cooldown; show wait or readable retry.
4. Chain bridge localId must include profile namespace so unrelated local game sessions do not share same registered dragon.
5. At inspection, Vite5180 /api/near/status returned HTML fallback; hook/restart still pending. Standalone5181 returned verified JSON and real receipts correctly.

No main/UI/CSS changes made by reviewer.

## Progression and purpose audit (independent source/scenario)

New meaningful recovery regression: tests/recovery-scenario.test.js. Four public buyFood actions spend90→10starting coins; then no sales, no free resource fixture, two berry-barter eggs, natural phase/default-all expedition, JSON hydrate every30seconds. First chapter restores at305seconds with5expeditions. Thus a novice's poor starting expenditure remains recoverable without merchant grants. Existing earned-resource two-chapter scenario completes at516seconds. These are simulated action-time bounds, not measured human-play durations.

All core actions have a purpose: forage recovery; food purchase faster feeding/merchant funding; species supply distinct resources; upgrades accelerate production; habitat placement rewards matching species; trade pays coin costs; charms improve repeated expedition returns; delve trades domestic production resources/time for relics; new zones unlock nest capacity; restoration/chapter completion consume earned resources. No additional system needed for the slice.

Remaining UX risks sent to root:

- Chapter2 objective skips the required sixth nest before ruins; location requirements reveal it only inside the map panel.
- Next-nest button can be enabled by affordability while its target zone is locked, causing an avoidable error. Show the exact target zone and unmet prerequisite.
- Chapter2 collection card has a paragraph listing five conditions but no current counters/checkmarks. Disabled completion is harder to diagnose than necessary.
- Expedition reward preview omits high-level and unlocked-ruins bonuses that engine awards. Preview should match actual expected reward.
- Upgrade choices omit before→after output, and location upgrades omit their exact specialist +1/cycle. These numbers would make existing choices more understandable.

Fun/pacing assessment: clear short hatch/feed/first-harvest loop, then a meaningful choice between working at home or joining an expedition. Long-term novelty in chapter2 is limited; it mainly recombines production/placement/expedition rather than introducing another activity. That is acceptable for this vertical slice; prioritize readable consequences and completion over new systems.

Tutorial recommendation to root: finish compulsory guidance after first sale with a short celebration and optional button to eggs. Chapter objective already supports the rest. Twelve persistent steps would occupy nearly all of chapter1 and reduce the feeling of independent discovery. Use existing tab descriptions and requirement text for contextual help.

## Final scope audit

Working game name: Hatchglen. Technical deployed account/crate identifiers remain unchanged. Objective text for ruins now explicitly mentions the quarry second nest / sixth valley nest; no balance or API changes. All41 engine tests pass including the novice recovery scenario. Contract17 and bridge4 tests pass. Testnet custom ownership and trade are real; user-wallet connection, NEP-171, authoritative game progression and AI are not implemented. Earlier Vite-hook finding is a timestamped observation, not proof of final integration failure. Root is responsible for final hooked-server/UI verification and updating top-level README/build-status that still describe v0.2.
