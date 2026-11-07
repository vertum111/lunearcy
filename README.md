# Lunearcy — Raise dragons. Wake the valley.

An illustrated browser game about a dragon sanctuary, built at NEAR Hackathon (track 09, Games With Real Economies). You hatch and raise dragons, sell what they make to Lucy, the forest spirit who keeps the valley's shop, and wake the valley chapter by chapter.

**The economy runs on NEAR testnet.** Every coin, berry, crystal and dragon is an NEP-245 multi token in one contract, and Lucy *is* that contract: her wallet and shelves are shared by every player, so one player's flood of crystals lowers the price for everyone. Players never see a wallet or a gas prompt: the browser creates a player key and a small sponsor service pays the gas. Ukrainian and English UI. An independent hackathon project, not an official NEAR product.

## Run

Node 24+. `npm install`, then `npm run dev` → http://127.0.0.1:5180/.

The game talks to the deployed testnet contract out of the box. To get gas sponsored locally, run the sponsor next to it (`npm --prefix server install`, then `node tools/near/relayer-local.mjs`, which reads its disposable testnet key from the git-ignored `.local/`). Without a sponsor, or with `?offline`, the same game runs locally in the browser.

- `npm test`: 25 tests for the economy, Lucy's market, the week simulation, the English translation and contract parity.
- Contract tests: `cargo test --manifest-path contracts/economy/Cargo.toml` (19 tests, including parity with the browser rules).
- `npm run build`: the static production game in `dist/`.
- `?session=your-test-name`: a separate browser save for QA; without it the game uses the default save.
- `?cutscene`: replays the first-eclipse cutscene right after "Play", for reviewing it.

## How it plays

Three resources, one loop: dragons make **berries** (food) or **crystals** (goods) → Lucy buys them for **coins** → coins hatch new dragons, raise levels and open new lands.

1. **Hatch and raise.** An egg hatches after 8 seconds. Feed the baby three times, 2 berries each; the starting berries are exactly enough for the first dragon. A free forest clearing gives 3 berries every 20 seconds, so food never runs out. An egg can be hurried for 5 coins.
2. **Collect.** Adults fill their nest every cycle; a nest holds five harvests. While the player is away, the nest keeps filling past that at half speed, for up to 45 minutes.
3. **Sell to Lucy.** She pays from her own wallet (150 coins to start), and every coin the player spends in the valley goes back into it. The fuller her shelf, the less she pays, never below a floor price. Neighbours buy from her shelf every 20 seconds (three berries or one crystal at a time), so prices recover and her wallet refills. If her wallet is empty, the shop is closed until someone spends coins. The "?" next to a price shows the whole calculation.
4. **Day and eclipse** alternate every 2 minutes. In the eclipse the neighbours panic about the NEAR chart and hoard crystals: Lucy pays 25% more for them. Some dragons also work harder in the eclipse (see the table), so the choice is to sell now or to hold crystals for the red sky.
5. **Expeditions.** Send up to three adults for 30 seconds. Each dragon eats 3 berries on the road; the team brings 6 coins per dragon level and 2 crystals per dragon, and this is the main source of new coins from outside the valley (goal rewards add a few). Dragons on a trip do not work at home.
6. **Levels.** Each level adds +50% output, up to level 5. Costs grow: 20, 34, 58 and 98 coins, plus 5 berries per current level.
7. **Chapters.** Chapter 1: raise three different species, then restore the Heart of the Valley for 60 coins and 20 crystals (opens the fourth nest and Mistling, the mist dragon). Chapter 2: open the Moon Quarry (80 coins, 20 crystals; two nests and Crystalwing, the crystal dragon), then the Ancient Ruins (120 coins, 40 crystals; two more nests, eight in all). After that the valley levels up without end: each level costs 1.4× more and adds +10% to everything.
8. **Goals** give one-off rewards, from hatching two dragons to "Legend of the valley": raise a dragon to level 5, a legend worth recording in the NEAR registry.

| Dragon | Makes | Egg | Trait |
|---|---|---|---|
| Mossleaf (Мохолист) | 3 berries / 12 s | 30 | Sun lover: +20% by day |
| Cinder (Жарик) | 2 crystals / 15 s | 45 | Eclipse fire: +50% in the eclipse |
| Flint (Кремінь) | 4 crystals / 25 s | 70 | Treasure hunter: on a trip 1.5× coins and 2× crystals |
| Mistling (Туманник) | 6 berries / 18 s | 90, after the Heart | Night gatherer: +50% in the eclipse |
| Crystalwing (Кришталик) | 7 crystals / 24 s | 120, after the Quarry | Tireless: its nest holds 10 harvests |

The first three eggs must be three different species. A seven-step tutorial with Lucy teaches the loop; a goal card then always points to the next useful step. **A week of the market in a minute** replays seven days of a simulated village trading with Lucy, through the same rules file as the game (`src/market-rules.js`), including the eclipse.

Pan by dragging; mouse wheel or pinch to zoom; keyboard arrows, +/− and Home. The map adapts to phones. Settings: sound, reduced motion, language, tutorial replay and a confirmed reset. Progress is saved in this browser only.

## On NEAR

- **Contract** `contracts/economy` (Rust, near-sdk 5.7), deployed at [`lunearcy-mw6wrkww.testnet`](https://testnet.nearblocks.io/address/lunearcy-mw6wrkww.testnet) ([deployment record](contracts/economy/deployment.testnet.json)).
- **NEP-245 multi token:** `coins`, `berries`, `crystals` and `dragon:<id>` (supply of one) in one contract, with `mt_balance_of`, `mt_batch_balance_of`, `mt_supply`, `mt_token`, `mt_transfer`, `mt_batch_transfer`, `mt_transfer_call` and standard `mt_mint` / `mt_burn` / `mt_transfer` events. Goods and coins move freely between players; dragons carry game state and move only through the game.
- **Lucy, an NPC with a wallet:** her wallet is the contract's own `coins` balance and her shelves are its `berries` / `crystals` balances. She pays from that wallet, her price falls with every unit on her shelf, neighbours buy from her every 20 seconds, and when she is broke her shop is closed for everyone until someone spends coins in the valley. The eclipse is one shared clock: crystals pay 25% more while the sky is red.
- **The whole economy is on chain:** eggs, feeding, levels, harvests (computed from block time, so a browser cannot mint goods), trips, lands, goals. The browser runs the same rules to answer instantly, sends each action as a transaction and then adopts the contract's state. `contracts/economy/src/rules.rs` mirrors `src/market-rules.js` and `src/engine.js` in exact integer arithmetic; `tools/parity-vectors.mjs` and `contracts/economy/tests/parity.rs` prove they agree.
- **No wallet, no gas prompt:** the browser keeps a player key (implicit testnet account); `server/relayer.mjs` (deployed on Render, see `render.yaml`) tops that account up with test NEAR after the browser proves it holds the key, with per-IP, per-account and daily limits.

This is testnet: tokens have no money value and nothing here is a financial product. The earlier dragon registry (`contracts/market`, a custom ownership/trade demo) is kept for reference.

## Verification

- 25 game tests, including parity vectors for the contract: production and caps, away-time filling, species traits, the eclipse price, expedition costs and rewards, level costs, save migration and damaged-save recovery, Lucy's wallet and shelf, the week simulation, and a scripted player who finishes chapter 1 in about 3½ simulated minutes and chapter 2 in about 10½ (a simulation, not a human completion-time claim).
- Contract: 17 Rust unit tests and 4 bridge tests; real testnet register → list → buy → withdraw receipts ([details](contracts/market/README.md)).
- Accessibility pass (WCAG 2.1 AA targets): text contrast, 44 px touch targets, keyboard focus that survives re-renders, focus-trapped dialogs and cutscene, screen-reader names and live regions.

## Art

Art made for this project (illustrated and AI-generated layers); no code or assets from other games are shipped. The Nunito font is bundled with its OFL license. Notes on earlier art directions: [docs/ART.md](docs/ART.md) (partly historical).

## Portable build

`python3 tools/package-release.py` packages an existing `dist` build into a zip in `releases/`, excluding local, server and private files, with a SHA-256 checksum in its manifest. Serve the extracted files from a web root; the optional local testnet bridge is not part of this static archive.
