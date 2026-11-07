# Hatchglen branding and marketing handoff

Prepared 31 October 2026. All content is a draft; nothing was posted, scheduled or applied to an external account. Game naming integration is handled by the coordinator.

## Deliverables

- `BRAND-BRIEF.md`: product positioning, name shortlist, concepts and selection rationale.
- `BRAND-GUIDELINES.md`: usage, colors, file map, typography and test limits.
- `CURRENT-BUILD-CLAIMS.md`: exact local/testnet boundaries and copied explorer proof links.
- `PROFILES-AND-MESSAGING.md`: X/Telegram bio/pin drafts and evidence gates.
- `CONTENT-CALENDAR.md`: 14 daily themes, main posts, fallbacks, media briefs and publish conditions for 1–14 November 2026.
- `DEMO-VIDEO-SCRIPT.md`: 75–100 second capture script with truthful network variants.
- `calendar-2026-11-01-to-14.json`: structured drafts with char counts and DRAFT status.
- `public/brand/`: vector logo kit, avatar, header, OG image, favicon sizes and first 3 designed creatives (SVG+PNG), plus illustrated and typographic OG variants.

The name recommendation **Hatchglen** was discussed with the coordinator and selected internally. Do not interpret a search with no obvious match as trademark, domain or social-handle clearance.

## Sources and name screening

Exact-name/game/NEAR searches were run 31 October 2026. Hatchglen did not surface an obvious existing product in those limited searches. Glimbriar and Wyrmstead remain reserve names with known adjacent uses. The following candidates were rejected because existing uses make them less distinctive:

- Mosswake: [existing Steam game](https://store.steampowered.com/app/5299990/) and [developer listing](https://apzilon.com/).
- Rootwake: [existing browser game](https://jason-ct8.itch.io/the-hollow-garden).
- Drakindle: [existing dragon character](https://www.projectmiato.forestofstars.com/index.php/Drakindle).
- Gloamwing: [existing browser game](https://jakehal.itch.io/gloamwing).
- Wyrmora: [existing dragon-themed App Store app](https://apps.apple.com/us/app/wyrmora-atlas/id6807731302) and [Google Play game](https://play.google.com/store/apps/details?id=com.bite.WyrmoraBite).
- NearNest: [existing software platform](https://www.nearnest.dev/) and [student-housing product](https://play.google.com/store/apps/details?hl=en&id=com.nearnest.example).
- Glimroot: [existing product name](https://satyammedicare.com/products/rx-glimepiride-tablets/79).
- Nestshade: [existing retail brand](https://nestshade.com/).
- Wyrmstead reserve conflict: [FFXIV Free Company](https://na.finalfantasyxiv.com/lodestone/freecompany/9237305048202090339/).

Primary official hackathon page checked 31 October 2026: [nearhackathon.com](https://nearhackathon.com/). It currently requires a public repository and public X demo post, with @NEARProtocol and #NEARHackathon. It lists final submission 14 November 2026, 23:59 UTC. Recheck before the actual publication/submission. The direct Markdown endpoint returned an unsupported content-type in the browsing tool, so the HTML site was used for these statements.

The game art reference is the user-supplied Hatch Dragons recording and the user's approved generated isometric concept. No source game's code/art or official NEAR mark was used in this logo kit. Marketing does not imply endorsement by NEAR Foundation.

## Production notes

Logo masters contain vector paths only. The wordmark is custom geometry; no font file is embedded or required. Editable campaign SVGs keep live Arial/Helvetica text intentionally; PNG exports are ready for preview/publication after the owner verifies the copy/media state. The first 3 creatives are graphic explanations, not fake running-game screenshots. The illustrated OG embeds the current project-owned regional terrain cutouts at the `src/world.js` logical positions and uses the original `src/creatures.js` vector dragons. Those modules are read without being changed. The terrain is raster artwork inside the editable SVG composition; logo masters remain vector-only. It is explicitly labeled as a valley illustration. The previous gouache dragon sprite sheet is not used in the campaign kit.

`build-brand.mjs`, `build-creatives.mjs` and `build-scene-og.mjs` regenerate assets using the desktop bundle's local Sharp package. They are authoring utilities, not game runtime dependencies. `write-calendar.py` regenerates the calendar and asserts all 28 main/fallback posts are under 280 characters before adding links. Logo/creative exports were rendered through Sharp and inspected. The logo skill's shell render helper was stopped when its fallback renderer stalled; no correctness claim relies on that attempt.

## Owner release checklist

- Confirm current build/network/feature status against the claim matrix.
- Check name, domain and handles before external renaming; no availability is promised.
- Replace missing public links only after deployment/repository publication.
- Preview actual avatar/header crops and media text in X/Telegram.
- Publish manually or authorize a separate exact posting policy. This handoff is not posting authorization.

## Regenerate and check

Run from the game directory, in this order:

```sh
node docs/marketing/build-brand.mjs
node docs/marketing/build-creatives.mjs
node docs/marketing/build-scene-og.mjs
python3 docs/marketing/write-calendar.py
node docs/marketing/test-brand.mjs
```

`QA.md` records the final checks and limitations. Authoring helpers reference the installed desktop Sharp path; they are not portable runtime dependencies.

## Mara portrait

`public/art/mara.svg` is an original code-native three-color portrait of the woodland trader, authored for small game UI use. Actual 24/48/72 px previews are saved in `docs/qa/brand-v3/mara-size-check.png`. Suggested Ukrainian line: “Сусіди чекають на припаси. Принесеш трохи?” No external character image, source-game asset or generative bitmap is used in the portrait.
