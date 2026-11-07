# Current build claims — 31 October 2026

Use this snapshot when drafting posts, profiles and the demo description. Recheck the running build before publishing. Nothing in this kit has been posted or scheduled.

| Area | Accurate statement for this build |
|---|---|
| Playable game | An illustrated dragon sanctuary prototype with local hatching, care, production, finite NPC orders, crafting, expeditions and restoration. |
| NEAR | A separate, real **NEAR testnet custom-registry demonstration** exists. A registered dragon entry can be listed, bought and transferred between two demonstration accounts, with testnet settlement/withdrawal receipts. |
| Ownership boundary | The verified ownership change concerns the registry entry. It does not move or attest the player's local save; the local dragon remains in the game. |
| Accounts / funds | The demonstration uses separate demo accounts and testnet funds. **The player's wallet is not connected.** |
| Token / NFT | In-game coins and resources are local game values. This registry is **not a NEP-171 NFT collection**, a token launch or a public player marketplace. |
| NPC / AI | Mara is a deterministic NPC trader with a finite local budget. No AI inference or AI-controlled wallet is connected. |
| World phase | Daylight/eclipse is an in-game timer. No live NEAR-price feed or price-triggered event is connected. |

## Recorded proof

Source: [coordinator's UI proof capture](../qa/root-v3-near-ui-proof.json), session `author-full-v3`. It records registry entry **3** and confirmed owner **buyer.sanctuary-market-mvvmipf5.testnet**. These links are copied exactly from that artifact:

- [Custom registry contract](https://testnet.nearblocks.io/address/sanctuary-market-mvvmipf5.testnet)
- [Confirmed buyer account](https://testnet.nearblocks.io/address/buyer.sanctuary-market-mvvmipf5.testnet)
- [list_dragon transaction](https://testnet.nearblocks.io/txns/12QGzMqV15BTaguQCxkUnPPudBfusynLNGGETu8fU2pN)
- [buy_dragon transaction](https://testnet.nearblocks.io/txns/9LCrCKRrTxhB6V21v723Aq9rBLZomeM71NzycsYX42ZR)
- [withdraw transaction](https://testnet.nearblocks.io/txns/3Wt1e5citUxdZqVbtah3upiuVubDDw6Vb2A87UC7Ex43)

The proof capture supplies no separate registration-transaction link; do not invent one. “Withdraw” here describes settlement using testnet funds, not a player earning or cashing out real money. The recorded owner describes this test, not a promise that an account's state will never change.

## Ready wording

> Hatchglen is a playable local dragon sanctuary with a separate, verifiable NEAR testnet registry demo. The exchange uses two demo accounts; care and the NPC economy stay local.

Avoid “fully onchain game”, “player-wallet trading”, “NFT collection”, “AI economy”, “live-price world” and earnings/return claims for this build. The fourteen-day calendar includes implementation gates and fallbacks; dates describe a public devlog, not an assertion that each feature was first built on that day.
