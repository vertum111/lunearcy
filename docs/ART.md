# Lunearcy art provenance and implementation

The game was first developed as "Hatchglen"; the brand files in `public/brand/hatchglen-*` and some notes below keep that
name. The merchant first called Mara and the guide Lira are now one character, **Lucy**, the forest spirit.

## What ships now

- **Valley:** one painted isometric valley in two pixel-aligned plates, day and eclipse (`public/art/valley-*.webp`, HiDPI
  `valley-*-hd.webp`), cross-faded on the phase change, plus the realm map (`realm.webp`), market stall and shrine cut-outs.
- **Dragons:** five species (`moss, ember, stone, mist, crystal`) as stills and babies in `public/art/dragons/`, looping
  hand-animated idles in `dragons/anim2/`, and sleep / wake / fly clips in `dragons/sleep|wake|fly/`.
- **Living patches:** waterfall and brazier loops for day and eclipse (`public/art/ambient/`).
- **Props and icons:** nests, eggs, signposts (`public/art/props/`), illustrated action and tab icons (`public/art/icons/`),
  parchment and wood textures (`public/art/ui/`), SVG line icons in `src/art.js`.
- **Splash and cutscene:** `splash*.webp` key art; the first-eclipse film `cutscene/eclipse.mp4` with its poster.
- **Brand:** the Lunearcy mark and icons in `public/brand/lunearcy-*`; the older Hatchglen logo set is still in the same folder.
- **Fonts:** Nunito and Caveat, bundled in `public/fonts/` with their SIL Open Font Licenses; no font CDN.

How each layer was made is described version by version below (v4 onward). Tools named there: Magnific (Nano Banana 2.1,
upscaling), Kling 2.5 image-to-video for the idles, and the keying/packing scripts in `tools/art/`. No code, screenshots or
extracted assets of another game ship in the build.

## v3 runtime assets (history)

The v3 vector dragons and terrain layers below are replaced. `src/creatures.js` now only maps the sprites, `src/art.js`
still draws the line icons, and `public/art/mara.svg` is unused (it is still copied into `dist/`).

- `src/creatures.js`: original code-native articulated vector dragons. Separate wing, head, tail, legs and eyes support idle/action motion. Three species share a consistent identity. Baby stage currently uses smaller presentation of the same character geometry; it is not a separate fully animated character model.
- `src/art.js`: original SVG icons and egg.
- `public/art/mara.svg`: original three-color merchant portrait by the brand agent.
- `public/art/forest-layer.webp`: generated original quiet teal forest border, no characters/UI. Source imagegen output `exec-cac56677-5e4b-4fce-b2d6-11bb8ff2d66b.png`.
- `public/art/grove-terrain.webp`: four spacious original grassy terraces supported by roots, generated from the approved concept direction. Output `exec-b95fc2b6-bad0-4e96-ae2d-b2bfe48186c0.png`.
- `public/art/quarry-terrain.webp`: two original mineral terraces. Output `exec-38ab7295-1656-4bb4-9878-3987263702a8.png`.
- `public/art/ruins-terrain.webp`: two original ruined sanctuary terraces. Output `exec-708b3a13-7165-4459-b7cd-69d7259d4f4e.png`.

Built-in imagegen generated these layers on31October2026. Prompts required the approved flat illustrated fantasy language, transparent terrain cutouts, broad empty clearings and no dragons, text, UI, labels or glowing pad outlines. They are terrain layers, not a fake static screenshot of gameplay. The camera transforms a logical world containing these layers plus live creatures, targets, interactive props and resource feedback.

PNG masters are preserved in `art-source/`. Runtime WebP exports reduce grove/quarry to roughly370KB each and forest to60KB. Ruins retains lossless RGBA (~1.6MB), because a lossy export created visible RGB bands in its soft transparent glow. Lossless decoded RGBA is identical to the source. No artwork was manually painted using image-processing scripts; conversion only changes file format/compression.

Original generated files remain under `/Users/maksimbojcuk/.codex/generated_images/01a0f1cc-910b-7e61-962b-b0a9499d9231/`.

## Brand and font

Original vector logo/wordmark, icons and campaign compositions are in `public/brand/`. Logo geometry is font-independent. Nunito variable font is bundled in `public/fonts/` with its SIL Open Font License, obtained from the official Google Fonts repository. No runtime font CDN is required.

## Archived provisional art

The earlier gouache forest and three-dragon sheet are preserved only as `art-source/legacy-sanctuary-forest.png` and `legacy-dragon-trio.png`. Their source outputs were `exec-18a45146-091b-476b-a583-698ac09299f9.png` and `exec-d3ccbfb8-372d-4b8c-85c7-ed2882478a97.png`. They are not used in the current game or campaign.

Purchased Cute Fantasy packs and old space-game assets are not used in this separate build.

## v4 painted valley (31 October 2026)

The in-game world now matches the approved isometric concepts (`concepts/`, plus the daylight original on the Desktop).

- `public/art/valley-day.webp` / `valley-eclipse.webp` (4096×1738, logical world 3168×1344): one continuous painted valley — central grove, moonlit quarry (left), overgrown ruins (right). Made with Magnific (Nano Banana 2.1): the daylight concept was cleaned of UI, dragons and egg, then outpainted left/right for the quarry and ruins, then relit into the red-eclipse state using the red concept as reference. Day and eclipse plates are pixel-aligned (verified by edge cross-correlation, offset 0,0), so the phase change is a 2.2 s cross-fade.
- `public/art/market.webp`, `shrine.webp`: illustrated cut-out props in the same style.
- Masters: `art-source/v4/`. The previous separate terrain cutouts are archived in `art-source/legacy-v3-runtime/` and no longer shipped.
- Dragons: illustrated sprites `public/art/dragons/{moss,ember,stone}.webp` + `baby-*.webp`, extracted from the concept with Magnific (Nano Banana 2.1, concept as reference) and background-removed; masters in `art-source/v4/dragons/`. `src/creatures.js` maps each sprite's paw line so paws land on the nest point; idle/feed/collect motion is CSS on the whole sprite. Right-side nests mirror the sprite to face the valley centre. The earlier articulated SVG dragons are archived in `art-source/legacy-v3-runtime/creatures-svg.js`. Garden (forage), brazier (workshop), grove/quarry/ruins are painted into the plate and get floating markers.
- HUD skin: `src/skin.css` + filled glyphs in `src/art.js` (`gem`, `navIcon`, `phaseGlyph`).

## v4 UI ("world first, one action = one tap")

- Action bubbles over dragons (collect / feed / hatch) act directly on tap; bubbles, labels and map markers keep a constant on-screen size at any zoom.
- Full panels are centred modals on desktop and bottom sheets on phones, with card grids (eggs, market orders, dragons, expedition team, regions). Disabled buttons state what is missing ("Ще потрібно: …").
- HUD: resource capsules, phase pill with timer, quest card with progress bar, labelled bottom tabs with badges for available actions (hidden during the tutorial).
- Type scale: body ≥14–16px, primary buttons 48–56px. Styles live in `src/skin.css` (loaded after the legacy `game.css`).

## v5 final art pass (hand-animated)

- Dragons are the exact Codex concept designs: cut from the concept art, redrawn clean at high resolution on magenta (Nano Banana 2.1), keyed with `tools/art/key.py`. Stills in `public/art/dragons/`, used in panels.
- On the map every dragon (adult and baby) plays a looping hand-animated idle: Kling 2.5 image-to-video with identical start/end frames (seamless loop), keyed and packed into transparent animated WebP by `tools/art/animate.py` (`public/art/dragons/anim/`, 12 fps). Sources and posters in `art-source/v4/anim/`.
- Valley plates were upscaled 2× with Magnific and downsampled: `valley-*.webp` (4096 px) for 1× screens, `valley-*-hd.webp` (6336 px) for HiDPI via `srcset`; max zoom is capped so the plate is never magnified past its pixels.
- Living plate patches: the central waterfalls and the brazier are looping videos cut from the plate (`public/art/ambient/`, day + eclipse), feathered into the painting.
- Grounded props (`public/art/props/`): woven nest (empty/egg/baby slots), vine-choked nest (locked), egg, wooden signposts for painted stations. Selection uses Hatch-Dragons-style corner chevrons; a small timer bar sits under working dragons and eggs.

## v6 onboarding and hand-made feel

- Splash: painted key art (`public/art/splash*.webp`, Magnific) with logo, loading line and "tap anywhere"; tapping dives into the canopy and the valley rises from black (see `docs/REFERENCE-HATCH-DRAGONS.md`).
- Fog of war (`world.js`): a painted darkness canvas with soft cloud puffs; areas clear in stages (central nest → whole grove → quarry/ruins when unlocked) with swirling wisps. A lone light wisp marks the nest before the first clearing. New games start fogged; older saves keep the valley open.
- Narrated 7-step intro (Lira banner with step counter, one bold verb per step): clear fog → hatch → feed ×3 → clear the grove → first harvest → sell to Mara → done. The first egg now sits on the central root nest.
- Hand-made effects: SVG "line boil" (three noise seeds stepped at 8 fps) on chevrons, signs, timers and panel edges; animated paper grain; falling leaves by day / rising embers in the eclipse; soft god rays; painted light burst on hatch/growth; squash & stretch on taps and buttons; rewards fly in arcs from the tap point to their HUD capsule.

## v8 location rebuild and hand-drawn pass

- New valley plate (`art-source/v5/`): generated from the v4 plate as reference, but with every station painted *into* the ground — Mara's stall on a mossy terrace with a stone path, the shrine plinth with its crystal and the workshop (anvil + brazier) on the upper-right terrace, the fenced garden. Nothing floats anymore; stations are invisible hit areas with a bobbing hand-inked chip, slots sit on flat mossy clearings (checked on a coordinate grid). Eclipse plate relit from it and aligned by phase correlation (16 px shift), both upscaled 2× with Magnific.
- Dragon idles regenerated with locked faces/eyes (the previous loops morphed the head and blinked mid-frame); `tools/art/animate.py` now builds a true crossfade loop (tail blended into head, tail dropped) so there is no seam jump. Files in `public/art/dragons/anim2/`.
- Waterfall and brazier loops re-cut from the new plate (`public/art/ambient/`).
- Hand-drawn look: SVG ink filters (dilate → dark ink outline → turbulence displacement) cycle three seeds at 8 fps on dragons, eggs, nests and the tree — a visible boiling ink line; watercolour-paper multiply layer over the painting; Caveat (OFL, Cyrillic) for headings, names and labels; double off-register sketch strokes around panels and nav tiles.
- Selection is no longer a frame: the selected creature gets a soft glowing silhouette (`sel` SVG filter), a pool of light on the grass with a slowly turning dashed rune ellipse, and rising motes.
- Lira (tutorial guide) plays the baby leaf-dragon idle loop with the ink line, types each line letter by letter while she bobs as if talking, and hops with sparks when a step is completed; the banner only rebuilds when the step changes.

## v9 new species and localization

> The v9 economy values (dragon fruit, relics, berry prices of eggs) were replaced by the three-resource v4 economy; see `docs/GAME-LOOP.md` for current numbers.

- **Mistling (mist dragon)** — unlocks after the Heart of the Valley is restored, 80 coins / 40 berries, produces 1 dragon fruit every 30 s. **Crystalwing (crystal dragon)** — unlocks with the Moon Quarry, 110 coins / 55 berries, produces 1 relic every 40 s. Designed in the same flat language as the Codex trio (Nano Banana 2.1 with the three dragons as references), adults + babies, keyed and animated with the same locked-face Kling loops (`art-source/v5/species/`). Locked species show as glowing silhouettes in the egg list and the bestiary with their unlock condition. Engine: `SPECIES.mist/crystal`, `speciesLocked()`, covered by `tests/mechanics.test.js`.
- **Localization** (`src/i18n.js`): Ukrainian is the source; English is applied at runtime to every text node and label (patterns for dynamic phrases, then fragments longest-first, short words whole-word only), including engine toasts. Language is chosen from the browser (uk → Ukrainian, otherwise English) and can be switched on the splash (UK/EN) or in Settings; switching reloads.

## v10 audit pass (two game-design subagents)

- World UI (captions, bubbles, timers, chips, away chips) lives in `.sw-ui-layer` above every sprite; layer order is sprites (4) < fog (5) < fog fx (7) < wisp (8) < UI (9). Adults get an invisible body hit area.
- Selection only while the dragon card is open; tapping it again or empty ground deselects. Dragons are 20% smaller and slots were re-placed clear of the painted buildings (checked by compositing every slot on the plate).
- Expeditions: the dragon leaps and flies off toward the ruins, is hidden while away (a ✈ countdown chip marks its spot) and lands on return.
- Tutorial: spotlight + hand-drawn pointing hand on the exact target, camera follows each step, skip hidden for the first three steps, fog steps close an open card, skipping clears the fog.
- Realm map (`public/art/realm.webp`): zooming out past the valley cross-fades to the whole world with five locked lands under mist; tapping the valley or zooming in returns.
- "While you were away" summary with Collect all; hatch anticipation (shake + crack); Nunito everywhere at larger sizes; legacy mobile tutorial/panel CSS removed; i18n no longer fights with live updates (`data-src` comparison), custom dragon names are never translated.

## v11 design pass (5 November 2026)

No new art. Interface only: softer eclipse tint (the red plate at 78% over the day plate, lighter vignette), sentence-case
labels instead of all caps, species traits shown on egg and dragon cards, one tab badge at a time, a glass backing behind
the resource counter, and a lighter loader (the first dragon's animation, the plates and icons first; the other species'
animations and the ambient clips load in the background after the splash).
