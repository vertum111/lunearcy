# Lunearcy: the game loop and its economy

Track: **Games With Real Economies**. The economy is the gameplay: the player raises dragons, the dragons make goods,
and a merchant with her own wallet decides what those goods are worth.

## The loop on paper

### Every 30 seconds: tend the flock
- Dragons work on their own: Mossleaf grows 3 berries every 12 s, Cinder makes 2 crystals every 15 s, Flint 4 every 25 s,
  Mistling 6 berries every 18 s, Crystalwing 7 crystals every 24 s. A nest holds five harvests (Crystalwing ten); while the
  player is away a full nest keeps filling at half speed for up to 45 minutes, so an absence is never wasted.
- Each species has one trait: Mossleaf +20% by day, Cinder and Mistling +50% in the eclipse, Flint brings 1.5× coins and
  2× crystals from a trip, Crystalwing holds twice as many harvests.
- Tap a nest to collect. Feed a baby (2 berries, three times) and it grows up. A new egg hatches in 8 seconds.
- Forage the clearing for 3 free berries every 20 s, so running out of food or money is always recoverable.

### Every 5 minutes: trade and decide
- Sell to **Lucy**, the forest spirit who runs the valley's only shop. She pays from her own wallet, and her price falls with
  every unit already on her shelf. Sell everything at once and the last units go cheap; wait, and she resells to the neighbours and pays more again.
- Spend the coins: a new egg (30–120 coins) or a level for a dragon (+50% output; 20, 34, 58, 98 coins plus berries, so a
  level competes with a new egg). Every coin spent lands back in Lucy's wallet.
- Send a team of up to three on a 30-second trip (3 berries per dragon); it comes back with 6 coins per level and 2 crystals
  per dragon from outside the valley.
- Every 2 minutes the sky turns red: the **eclipse**, the valley's running joke about the NEAR price dropping. The neighbours
  panic and hoard crystals, so Lucy pays 25% more for them, and the eclipse traits kick in. The decision: sell crystals now,
  or hold them for the red sky. Trips survive it and every dragon keeps working.

### Every session: grow the valley
- Clear the fog, unlock new places (the quarry, the ruins) and new species, restore the Heart of the valley.
- Claim goals, send expeditions that bring new coins and crystals in from outside, then raise the valley's level
  (+10% to everything per level, no cap).
- Raise a dragon to level 5 (goal "Legend of the valley") and register it on NEAR testnet (see the NEAR panel in the market).

## The merchant: Lucy

| What the track asks for | In Lunearcy |
|---|---|
| An NPC merchant with her own wallet and inventory | Lucy has a wallet (starts at 150 coins) and a shelf per good |
| Prices set from stock and recent demand | Each unit on the shelf takes 7–8% off her price, down to a floor; an empty shelf pays 25% over base; in the eclipse crystals pay 25% more |
| Flooding the market makes the good cheap | Sell 20 berries at once and berries hit the floor price |
| A broke merchant closes until someone invests | With an empty wallet she cannot buy anything; any coin spent in the valley reopens the shop |
| Pricing rules in one readable file | [`src/market-rules.js`](../src/market-rules.js): the constants, the price, the quote, the resale, Lucy's one-line mood |
| Show the merchant's reasoning | The `?` next to each price opens the calculation step by step: base, empty-shelf bonus, stock discount, eclipse panic, floor, wallet |
| A fast-forward mode | **Market → "A week of the market in a minute"** |

Every 20 seconds neighbours buy from Lucy at the base price: three berries and one crystal. That is the outside demand: it
drains flooded shelves, brings prices back and refills her wallet. Berries go faster because dragons make many more of them.

## A week in a minute

`src/market-sim.js` runs six simulated players for seven days, minute by minute, through the same functions the game uses.
Each player plays a morning, lunch and evening session and will not sell below their own lowest price. Nests fill while
they are away and the eclipse comes every two minutes, as in the game. Scripted village
events change what players do or whether neighbours come, never the rules:

1. **Day 3, 18:00:** the quarry opens and everyone gets Crystal dragons.
2. **Day 5, 06:00:** a storm washes out the road, so no neighbours come for a day.
3. **Day 5, 10:00:** a caravan dumps piles of goods on Lucy at any price. Her wallet empties and the shop closes.
   It reopens when players spend coins on eggs and levels.
4. **Day 6, 06:00:** the road is fixed. The flooded crystal shelf takes about two days to drain before the price recovers.

The chart shows both prices, Lucy's wallet and the hours the shop was closed. It is deterministic (same seed, same week)
and never touches the player's save. `tests/market.test.js` checks that the flood, the closure and the reopening really happen.

## What is on chain, honestly

- The game state and Lucy's market run in the browser. Coins, berries and crystals are not tokens yet.
- Dragons can be registered and traded on NEAR testnet through a custom registry contract (`contracts/market`), via a
  development bridge with demo accounts. It is not NEP-171 or NEP-245, and players do not connect a wallet.
- Next steps for the track: items as NEP-245 multi tokens in one contract, a social/email sign-in with sponsored
  transactions so the player never sees a wallet, and Lucy's wallet as an on-chain account.
