# Lunearcy custom testnet registry

The contract package/account keeps its technical `sanctuary` identifier. The game is **Lunearcy** (first developed as Hatchglen).

Real deployment: `sanctuary-market-mvvmipf5.testnet`.
Evidence and actual transaction links: [deployment.testnet.json](./deployment.testnet.json).
This is a custom ownership/trade registry, **not NEP-171 NFT**. It registers caller-supplied metadata/snapshot hashes; it does not attest browser-game progression. No mainnet support and no production audit claim.

## Verified

17 Rust unit tests and four bridge tests pass. Rust tests cover ownership, atomic sale, exact prices/deposits, callback authorization/replay, withdrawal recovery including concurrent new credits, bounded ownership and worst-case storage. Release WASM built. Actual testnet register → list → buy → withdraw verified with owner views and zero pending seller credit.

## Build

Rust 1.86.0, target `wasm32-unknown-unknown`, pinned Cargo.lock.

```sh
RUSTUP_HOME="$PWD/.local/rustup" cargo +1.86.0 test --manifest-path contracts/market/Cargo.toml --locked
RUSTUP_HOME="$PWD/.local/rustup" cargo +1.86.0 build --manifest-path contracts/market/Cargo.toml --target wasm32-unknown-unknown --release --locked
node tools/near/deploy-testnet.mjs
```

Fresh throwaway keys live only in ignored `.local/near-testnet.json` (mode 600). Deployment script resumes that isolated session; it never reads personal credentials. Native test NEAR comes from the public free testnet faucet and has no monetary value.

## State and methods

`register_account`: exact 0.01 test NEAR permanent storage deposit. `register_dragon(species,name,snapshot_hash)`: exact 0.02 test NEAR permanent storage deposit, max 8 owned/account and 256 dragons total; 512 registered accounts. Deposits are deliberately not refundable; this is not NEP-145.

`list_dragon(id,price)` and `cancel_listing(id)`: owner only, exactly 1 yocto. Price positive and ≤10 test NEAR. `buy_dragon(id,expected_price)`: registered different buyer, exact price; atomic owner update and seller credit. Buyer capacity checked. `withdraw()`: exactly 1 yocto, zeroes credit before asynchronous transfer, one pending withdrawal. Private unique-ID callback either settles or restores failed transfer without losing subsequent sale credits. Views: `get_config`, `get_account`, `get_dragon`, paginated `get_dragons` (max50).

## Local bridge

`tools/near/bridge.mjs` exports `middleware(req,res,next)` for Vite's configureServer. Optional standalone loopback server: `node tools/near/serve-bridge.mjs` on port5181.

- GET `/api/near/status`: verified deployment/config/proof, `walletConnected:false`.
- POST `/api/near/register`: JSON `{species:"moss"|"ember"|"stone",name,localId}` (the registry knows the first three species only). Returns actual dragon and registration receipts; idempotent snapshot namespace.
- POST `/api/near/demo-trade`: JSON `{creatureId:"2"}` from local registration. Seller lists → separate buyer purchases for 0.001 test NEAR → seller withdraws; returns actual transaction IDs and owner view.

Bridge is development-only: strict loopback address/Host/Origin, JSON body4096bytes, mutex, 15second cooldown, six registrations/trades maximum per local session. Keys never reach browser. Only fixed contract methods/deposits; no arbitrary calls, keys, accounts or mainnet. UI must label these separate demo accounts; connecting a player wallet is not implemented. Browser progress remains local, not authoritative chain state.

Primary implementation references: [NEAR storage security](https://docs.near.org/smart-contracts/security/storage), [private callbacks](https://docs.near.org/smart-contracts/security/cross-contract-calls/callbacks), [near-api-js](https://github.com/near/near-api-js).
