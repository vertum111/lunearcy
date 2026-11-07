# Hatchglen overnight build status

Updated31October2026, Europe/Kyiv. The v0.3 internal pre-final is ready for review. Do not restart from scratch.

## Authorized scope

Autonomous overnight build toward a near-final game, resolving routine disputes with subagents. Approved: illustrated isometric woodland diorama; recognizable slender leaf/fire/stone dragons; zoom/pan, locked regions, daylight/eclipse, raising/production/trading/expeditions/expansion. Prior `../lunearcy` is frozen. Marketing deliverables are drafts only, no external posting.

## Implemented

- Enginev3:8unique nests,3locations,2chapters,3species, levels1–5, habitat upgrades/relocation, finite funded NPC orders, barter/forage recovery, expedition team/deeper-route choice, permanent chapter completion, v1/v2save migration.
- Desktop/mobile game shell: real asset loading, title menu, readable resource HUD, context panels, basic guided tutorial through first sale, chapter navigation, settings/reduced motion/audio, confirmed reset, local persistence.
- World:3separate generated terrain layers, articulated SVG characters, original interactive props, pan/zoom/pinch/keyboard, camera focus, fog, culling and reduced-motion handling.
- Feedback: feeding/hatching/production/collect/upgrade effects, resource-specific particles, exact balance deltas, phase transitions, completion dialogs.
- Hatchglen brand/logo, avatar/header/OG, original Mara portrait,14daily main/fallback Xdrafts,3designed creative masters, demo-video script. No posting.
- Custom registry/trade contract deployed at sanctuary-market-mvvmipf5.testnet. Real register→list→buy→withdraw verified, loopback dev bridge integrated and in-game status/actions show honest limits/receipts.

## Verified so far

- 42/42 engine tests pass. Earned-resource full progression and starter-money mistake recovery pass without gifts or forced phases.
- 17/17 Rust tests and4/4 bridge tests pass. Deployment and bridge smoke public receipts are in contracts/market/*.testnet.json.
- Root manually completed first egg→adult→harvest→market sale→tutorial completion. Checked390×844phone UI and desktop, replay/reload persistence. Actual in-game testnet registration and ownership transfer succeeded; UI proof and final screenshots are saved.
- Independent agents reviewed source and desktop/mobile screenshots. Fixed hidden mobile tutorial completion CTA, wrong third-egg guidance, tiny labels, plural forms, chapter2requirements, next-nest zone gate, output/reward previews, terrain duplication and asset alpha artifact.
- Ruins WebP now lossless, exact RGBA match to source; earlier lossy RGB artifacts were removed. Masters moved to art-source/, outside production assets.
- Final production build and standalone artifact smoke pass. A portable static archive and checksum are in releases/.

## Final verified result

Root manually completed BOTH chapters in the actual browser UI, ending with6adult dragons,11funded trades,3expeditions,3charms, level3Stone specialist and all3regions. No gifted resources or save injection. Some UI phase tests deliberately used the labeled demo override; automated earned-resource tests use natural phases. Rename, move/bonus, berry barter, free-food recovery, expansion, ruin requirements and permanent completion were exercised. Independent world/brand agents reviewed desktop/mobile artwork and placement. Small-phone onboarding375×667 and390×844panels were checked.

A late reward preview drift was fixed by exporting canonical engine expeditionReward;42tests pass. Full trace and remaining limits: docs/qa/v3-report.md. Branding/content claims use real UI testnet receipts in docs/marketing/CURRENT-BUILD-CLAIMS.md.

This is an internal pre-final, not a published or judge-ready production service. Before submission, perform a controlled English localization pass and recheck official entry rules. Wallet/server-authoritative progression and full player trading remain separate work. Do not silently claim them implemented.

## Material boundaries

Local economy and saves remain client-side. NEAR is a separate demonstrative custom registry, not NEP-171 NFT or player-wallet ownership. No AI, live market-triggered phase, mainnet, public multiplayer, anti-cheat/server authority, hosting or public submission. These are unimplemented capabilities, not hidden working features.

## Automation

Overnight heartbeat id `automation` was deleted because this verified internal pre-final is ready for review. Resume only for a new authorized work pass. Codex and this computer must remain running for local execution.
