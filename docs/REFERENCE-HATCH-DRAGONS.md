# Hatch Dragons (Runaway) — reference breakdown

Source: the user's 4:42 screen recording (`~/Downloads/ScreenRecording_10-30-2026 22-49-53_1.MP4`), cut every 3 s.
Used only as a reference for flow, pacing and feel; no assets or code are copied.

## Opening (0:00–0:20)
1. **Splash**: full-screen painted key art (dragons on a cliff, logo top), one status line at the bottom: "Downloading Game Data" → "Loading Data Complete!".
2. **Transition**: camera dives through the forest canopy (0:06) and the canopy dissolves into a dark void (0:09).
3. **Darkness**: the whole world is black fog. Only a tiny glowing wisp is visible, with a coin cost above it. HUD: gold + gems top-left, settings top-right.
4. **Narration banner** at the top (teal card, step counter "1/18" + dragon glyph): *"A thick, dark fog has covered the forest for many years…"*.
5. **Bottom card**: "Strange Fog — Clear to uncover a new forest area", with a round action button ("Clear", cost) sitting above the card.
6. Tapping Clear → swirling particles eat the fog → a small round clearing appears with a soft feathered edge.

## First dragon (0:20–1:25), narration 2/18 → 9/18
- The clearing holds the NPC (Liv the summoning elf) on a stump, a summoning circle and spiral stone pads marked "?".
- Bottom card switches to the NPC ("Ready to summon a new egg") with a **Summon** button.
- A light orb flies from a pad to the circle, grows, flashes; the NPC talks in **speech bubbles** ("…something is happening!", "I… I did it!").
- An egg appears on the circle with a **timer bar + 00:05**; then "Tap to Hatch it!" (4/18).
- Hatch: light pillars, the baby appears in its eggshell with a big floating name "Undiscovered Dragon".
- 5/18 "This baby will need space to grow" → the next fog patch costs 2 gold; clearing it reveals a larger area with a **nursery signpost**.
- 6/18 Move the baby to the nursery; 7/18 "Feed your baby" — feeding timers, +1 gold pops above.
- 9/18 "Let's Mature this dragon!" → ornate cyan ring, white flash, adult appears; banner "New Dragon! Common Rocktail" and "+40 dragon score" flying to the collection tab.

## Core loop shown (1:25–3:15), 10/18 → 18/18
- **Collection** (Sets / Decorations / Goals tabs): silhouettes for undiscovered dragons, set bonuses, goal list with gem rewards and "Claim".
- Tap a dragon to collect the gold it produced (coins pop and fly to the counter).
- Gold clears more fog (cost grows 1 → 2 → 5 → 6…); each patch "adds space for 2 additional dragons".
- **Dragon Fruit**: drag the dragon to fruit to level up; fruit trees run "growing shifts" (Tiny 30 s free, Small 10 min, Medium 1 h…).
- "Dragon Level Up! Earns 2 gold every 15 s" banner.
- Summon another egg; sparkles mean an undiscovered species; "Goal Complete — New Arrivals"; "That's it! How many dragons can you discover?" ends the tutorial.

## Later (3:15–4:42)
- Hurry an egg with gems ("Tap again to confirm"), Shop (gem packs), Main Menu (Help, News, Settings, Community, Achievements…), "Unlocks at score 300" gates on features.

## Feel and presentation
- Dark vignette everywhere outside the revealed area; revealed areas are painted, soft-edged islands.
- Selection = four cyan chevrons around the target; timers = thin white bar + mm:ss.
- Everything reacts: coins pop with arcs, swirling particle trails, flashes on hatch/mature, gentle idle motion on every character.
- Text is short, one instruction per step, key verbs bold ("**Tap** to **Hatch** it!").

## What Hatchglen adopts
- Splash with painted art + loading line, dive transition into a fully fogged valley.
- Narrated tutorial banner with a step counter, one verb per step; the guide speaks in bubbles.
- Fog-of-war that clears in stages (central nest → whole grove → quarry → ruins) with swirl particles.
- First egg appears on the central root nest (the valley's summoning circle) with a timer, then hatch / feed / collect / trade.
- Chevron selection, timer bars, coin pops flying to the HUD, flashes on hatch and growth.

## Implemented from the reference (v7)
- **Dragon fruit tree** on the lower-left terrace: one growing shift at a time — Tiny (1 fruit, 30 s, free), Small (6, 3 min, 20 coins), Rich (15, 10 min, 50 coins). Timer bar while growing, fruit-laden art and a one-tap harvest bubble when ripe; tapping the tree opens the shift sheet.
- **Fruit levels**: feeding an adult `level × 2` fruit raises its level (levels 4–5 still need the restored Heart). Coin upgrades remain as the second path.
- **Hurry an egg** for 5 coins.
- **Goals** (10) with progress bars and one-time rewards; claimable count shows as a badge on the Dragons tab.
- **Bestiary** with silhouettes for undiscovered species (two future species teased) and a **flock score**.
- Engine: `TREE_SHIFTS`, `GOALS`, `goalStatus`, `fruitToLevel`, `dragonScore`, actions `plantTree`, `harvestTree`, `feedFruit`, `hurry`, `claimGoal`; old saves migrate with empty fruit/tree/goals. Covered by `tests/mechanics.test.js`.
