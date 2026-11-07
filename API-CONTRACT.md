# Engine v4 API — implementation contract

`src/engine.js` is the whole local game simulation: pure state in, state out, no DOM, no network. Lucy's pricing lives in
`src/market-rules.js` and is re-exported by the engine. `src/market-sim.js` reuses both for "A week of the market in a
minute". No chain, AI or real-money behaviour is represented here; the NEAR demo is a separate bridge (`tools/near`).

All player-facing strings are Ukrainian; `src/i18n.js` translates them at render time.

## State (`version:4`)

`createState(now)` returns:

- `start`, `last`: game clock (ms). `phase()` derives day/eclipse from `start`; `last` is the last tick.
- `resources:{coins:40,berries:6,crystals:0}`: exactly three resources.
- `dragons[]`: `{id,species,slot,location,name,stage:'egg'|'baby'|'adult',hatchAt,feeds,level,ready,readyAmount,next}`.
  `ready` counts finished harvests (0…`capOf(dragon)`), `readyAmount` is the stored resource amount (it can grow past
  `ready × output` while the player is away). `slot` is the nest identity (0–7), never the array index.
- `slots` (3 → 4 after the Heart → 6 with the quarry → 8 with the ruins), `nextId`, `location`, `locations.{grove,quarry,ruins}.unlocked`.
- `market:{wallet,stock:{berries,crystals},resellAt,history:{berries[],crystals[]},panic}`: Lucy's wallet and shelves.
  `panic` is set by `tick` (true during the eclipse).
- `restored`, `valleyLevel`, `expedition:{team,duration,ends,reward}|null`, counters `trades,sold,collected,expeditions,hurried`,
  `goalsClaimed[]`, `journal[]`, `forageAt`, `phaseOverride`.

## Constants and data

- `RESOURCE`, `RESOURCE_ROLE`: names and one-line roles of coins, berries, crystals.
- `SPECIES`: `moss, ember, stone, mist, crystal` with `{name,kind,job,resource,output,cycle,eggCost,desc,unlock?,trait}`.
  `trait:{name,text}` plus one effect: `day` or `eclipse` (output multiplier), `trip:true` (expedition bonus) or `cap` (nest size multiplier).
- `PHASE_MS=120000`, `HATCH_MS=8000`, `MAX_SLOTS=8`, `MAX_LEVEL=5`, `PRODUCTION_CAP=5`, `FEED_COST=2`, `FORAGE_MS=20000`,
  `HURRY_COST={coins:5}`, `RESTORE_COST={coins:60,crystals:20}`, `EXPEDITION_MS=30000`, `EXPEDITION_COST={berries:3}` (per dragon),
  `OFFLINE_MS=45 min`, `OFFLINE_RATE=0.5`, `AWAY_GAP_MS=60000`, `VALLEY_STEP=0.1`, `HISTORY_LEN=24`.
- `LOCATIONS`: grove (free), quarry (`80 coins, 20 crystals`), ruins (`120 coins, 40 crystals`). `SLOTS`: eight `{id,location,x,y}`.
- `GOALS`: one-off rewards (`arrivals, seller, impatient, trio, traveller, pack, master, legend`); `goalStatus(state)` adds `value, done, claimed`.
- `MARKET` (from `market-rules.js`): `base`, `floor`, `drop` per good, `resellSeconds:20`, `resellUnits:{berries:3,crystals:1}`,
  `panic:{crystals:0.25}`, `startWallet:150`.

## Derived values

- `phase(state,now)` → `{red,left}`; `phaseOverride` (demo) wins while it lasts.
- `production(state,dragon,now?)` → `{resource,output,boost,cycle,cap,away,bonus,stored}`. `output` includes level, valley
  bonus and the trait for the phase at `now`. Use it for every displayed yield.
- `outputAt(species,level,bonus)`, `traitBoost(state,dragon,now)`, `capOf(dragon)` (10 for Crystalwing, else 5).
- `upgradeCost(state,dragon)` → `{coins:round(20·1.7^(level−1)), berries:5·level}` or `null` at level 5.
- `expeditionCost(team)` → `{berries:3·team.length}`; `expeditionReward(state,teamIds)` → `{coins,crystals}`:
  6 coins per level and 2 crystals per dragon, Flint ×1.5 coins and ×2 crystals, times the valley bonus. `act(expedition)` uses both.
- `valleyBonus(state)` = `1 + 0.1·(valleyLevel−1)`; `valleyCost(state)` = 100 coins / 40 crystals × 1.4^(level−1), rounded.
- `price`, `quote`, `explainPrice`, `marketMood`, `shopOpen` (market-rules), `marketStatus(state)` → `{wallet,stock,prices}`.
- `speciesLocked(state,id)`, `availableSlots(state,location?)`, `locationRequirements(state,location)` → `{met,reasons}`,
  `objective(state)` → `{step,title,text,tab,id,chapter,total}` (chapter 1 has 6 steps, chapter 2 has 2, chapter 3 is endless with `total:null`),
  `dragonName(dragon)`, `dragonScore(state)`, `count(n,resource)` (Ukrainian plural).

## `tick(state,now)`

Advances production and Lucy's resale up to `now` (never backwards), then sets `last=now`.

- Each finished cycle adds one harvest, sized by the phase it finished in, until the nest holds `capOf(dragon)`.
- If more than `AWAY_GAP_MS` passed since the last tick, the player was away: a full nest keeps filling at `OFFLINE_RATE`
  for at most `OFFLINE_MS`, at the average of the day and eclipse trait.
- Every `resellSeconds` neighbours buy `resellUnits` of each good at base price: stock drains, the wallet refills.
- `market.panic = phase(state,now).red`.

## `act(state,action,now)`

Ticks first, then performs one action atomically and returns a Ukrainian feedback line; a rejected action throws `Error`
with a player-readable message and changes nothing beyond the tick.

`hatch`, `hurry`, `feed`, `collect`, `buyEgg {species,slot?}` (the first three eggs must be different species),
`upgrade`, `rename {name}` (≤ 20 letters, digits, spaces, dots, apostrophes or hyphens; empty resets), `travel {location}`,
`moveDragon {slot}` (settles stored harvest first), `sell {resource,qty?}` (Lucy pays per unit, limited by her wallet),
`forage` (3 berries every 20 s), `restore` (three adult species + `RESTORE_COST`), `unlockLocation {location}`,
`expedition {team?}` (1–3 different adults), `claim`, `growValley` (after the ruins), `claimGoal {goal}`,
`demoPhase` (flips day/eclipse for 60 s; for demos, grants nothing).

Every coin the player spends lands in Lucy's wallet; a sale only moves coins between the player and Lucy. Expeditions
and goal rewards are the only sources of new coins.

## Saves

`validate(state)` returns `true` or throws (no mutation). `hydrate(raw,now)` accepts v4 and migrates v3 saves (six
resources folded into three), then ticks to `now`. If only Lucy's market is damaged it is reopened fresh and the valley
is kept; any other damage is refused rather than silently creating wealth. The game stores saves under
`lunearcy-sanctuary-v1`, or `dragon-demo-<name>` with `?session=<name>`.

## Tests

`tests/economy.test.js`, `tests/market.test.js` and `tests/i18n.test.js` (`npm test`) cover this contract, including a
scripted player who finishes both chapters well inside the time limits.
