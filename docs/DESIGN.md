# First playable specification

Goal: make egg→care→useful dragon→trade feel satisfying before adding an RPG.
Reference: Hatch Dragons' creature care, collection, spatial sanctuary, gradual discovery. All implementation/art is new.

## Art direction
Storybook forest in moss, jade, pale gold and natural mineral colors. Luminous meadow and painterly creatures. Dark evergreen translucent controls let the world dominate. Readable Ukrainian copy, large primary action, functional inline resource icons. No inherited cyan/pink space console. Working LuNEARcy identity is provisional, not a finalized logo.

## Screen model
- Sanctuary: world nests; contextual detail inspector; next-action guidance.
- Eggs: three species and food purchase, explicit price/capacity states.
- Dragons: collection and single multi-resource craft recipe.
- Market: finite NPC contracts and visible remaining budget.
- Expeditions: phase gate, team/cost/duration/reward, departure/return states, labeled demo phase control.
- Help and world-phase dialogs; expansion dialog; native focus/Escape behavior.

Desktop: world +340px detail panel, compact HUD, persistent nav within viewport.
Mobile: world first, contextual panel below, fixed five-item navigation, selection scrolls to detail. Reduced motion supported.

## Economy
Moss produces berries; Ember produces embers; Stone produces ore. Food consumed by growing and expeditions. Embers+ore craft travel charms; ore+coins unlock nests. Coins fund eggs and upgrades. NPC contracts have finite demand/budget. No fungible game token required for this stage.

## NEAR architecture target — not yet implemented
Gameplay offchain. Authoritative server validates inventories/timers, never trusts localStorage. Ownership/escrow/settlement for selected trades on NEAR, with gas sponsorship and login designed after SDK validation. Price signals may trigger fixed-duration world events with cooldowns. Scheduled phases still guarantee access. AI/NPC adoption only if it improves economic decisions; no AI label for static behavior.

## Hackathon scope gate
First prove local loop, then real testnet settlement and a market transaction that another participant can fulfil. Add species/areas only after onboarding clarity and production purpose pass independent review. No staking yield, guaranteed cashouts, MMO, skeletal animation suite or full action RPG in first milestone.

## QA
Economic tests: exact timer boundaries, atomic spending, storage cap, finite merchant stock, duplicate payouts, phase override expiry, expedition phase independence, JSON reload.
Manual browser checks: hatch/feed/collect/buy/trade/craft/expedition, desktop720/900, narrow phone375, console errors, overflow and reduced motion.

## Revision 0.2 — mechanics-first gate

The user rejected the current art direction; it is explicitly provisional, as is the title. Do not iterate this illustration or branding without selecting a new direction. Current focus: a complete, testable short chapter.

Implemented after independent review:
- Free renewable berry foraging + barter eggs prevents food/currency softlocks.
- First three species are distinct to prevent occupying every nest without an ore producer.
- Contextual chapter objective navigates directly to the relevant action.
- Select expedition participants; others keep working. Default non-woodland team encourages a time/resource choice.
- Sealed gate encounter: return with existing loot OR pay2embers+2ore, spend10seconds, receive3extra relics. No hidden odds.
- Restore shrine for4embers+4ore+6relics after milestones. Permanent fourth nest, visible marker and completion screen.
- Optional fifth nest after completion. Confirmed reset for the current local save only.
- Core version2 migration, independent25-test suite and full UI completion QA.

Post-completion is deliberately a sandbox, not a promised second chapter. Fixed NPC starter contracts do not reset. NEAR ownership/settlement, live market triggers and AI economic agents are still architecture targets, not delivered features.
