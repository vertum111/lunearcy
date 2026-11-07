# Hatchglen — 14-day X plan

Drafts only. Nothing has been scheduled or published. Dates use Europe/Kyiv (tool identifier Europe/Kiev). One main post per day; 18:00 local is a starting cadence to test, not a claim of an optimal posting time. Capture real progress daily and swap the theme order when the build changes. Never publish a planned feature as completed.

Public devlog starts 1 November; acknowledge preparation/prototyping before that date. Do not pretend development began that morning.

Primary language: English. Ukrainian notes explain the intent to the owner. All main and fallback drafts are under 280 characters before adding links. Keep optional links/media credits in the first reply and re-check the final count in X.

## Daily workflow

1. Verify the publish gate against the current build and QA evidence.
2. Capture 8–15 seconds of actual gameplay, or use the prepared static creative with an honest label. Do not turn a concept render into fake gameplay.
3. Replace speculative wording with the verified state/network. If the feature is not ready, use the fallback and show the actual issue.
4. Owner reviews the media and final copy, then publishes manually. This kit grants no posting automation.
5. Record URL, reach, relevant replies and the next action. Do not buy engagement or invent player metrics.

## Calendar

### 2026-11-01 — Day 01: Introduce the valley

**Post EN (252 characters)**

We’ve been prototyping a tiny dragon sanctuary. Today the public devlog begins.

Meet Hatchglen: hatch dragons, give them useful work, and wake a valley that changes with the light.

Which would you hatch first: woodland, fire, or stone? #NEARHackathon

**UA intent:** Прямо сказати: прототипували раніше, публічний щоденник починається сьогодні.

**Media:** Egg → hatch → first feed; one uncut 8–12s loop. Use a playable capture, not a concept render.

**Publish gate:** Working hatching and feeding from a clean save. Static creative is ready.

**Fallback EN:** Public devlog begins today. We’re making a dragon sanctuary called Hatchglen. Here’s the direction: small expressive creatures, useful jobs, and a valley worth waking. What would you want to discover in it?

### 2026-11-02 — Day 02: Give creatures a purpose

**Post EN (219 characters)**

Small dragons. Useful jobs.

Woodland dragons grow food. Fire dragons refine materials. Stone dragons find ore.

Raising a new dragon should change what you can do in the valley. That’s the loop we’re building. #gamedev

**UA intent:** Показати користь трьох видів, не тільки різні скіни.

**Media:** Three 3-second shots: collect berries, embers, ore. Keep icons/counter increments visible.

**Publish gate:** Three professions produce and collect correctly in the release candidate.

**Fallback EN:** Today’s design question: how do we make three dragons feel different without making three separate games? Our answer starts with useful jobs and resources that have somewhere to go.

### 2026-11-03 — Day 03: Make eclipse desirable

**Post EN (219 characters)**

Daylight is for growing and preparing. Eclipse opens a route to the old gate.

We want the red sky to mean “there’s something to discover”, not “your sanctuary is ruined”.

Same valley. Different opportunities. #gamedev

**UA intent:** Затемнення — можливість, не покарання за падіння ринку.

**Media:** Same camera, same location: daylight → eclipse. Show a closed passage become available.

**Publish gate:** Both phases and access gate visibly work. Do not claim live-price triggering.

**Fallback EN:** We’re testing two states for one valley: daylight and eclipse. The goal is to change what you can do, not simply put a red filter over the screen. What should only wake during eclipse?

### 2026-11-04 — Day 04: Show the world beyond the screen

**Post EN (229 characters)**

Scroll out. There’s more valley beyond your first nest.

We’re building Hatchglen as a movable isometric habitat: open places close by, fog-covered possibilities farther out.

What would make you want to unlock the next clearing?

**UA intent:** Сенс камери — бачити розвиток і мету, а не просто гарний зум.

**Media:** Zoom from one dragon to the whole habitat; finish on a locked location with its purpose and requirement.

**Publish gate:** Camera zoom/pan/home works on desktop and touch.

**Fallback EN:** The camera is part of the game design. Close up: care for one dragon. Far out: see where the sanctuary can grow. Today we’re testing whether those two scales feel like one place.

### 2026-11-05 — Day 05: The first emotional reward

**Post EN (216 characters)**

That first hatch has to feel good.

Not a new row in an inventory. A little creature, a soft sound, bright eyes, and something you want to look after.

Today’s loop: egg → hatch → feed → a dragon with a job. #gamedev

**UA intent:** Емоційна цінність до ринку, гаманця й токена.

**Media:** Hatch animation in full, no speed-up; follow with one feed reaction and a clear growth change.

**Publish gate:** Hatch/growth/feedback are implemented; do not write “new sound” unless audio exists. Remove phrase if absent.

**Fallback EN:** The first hatch is our emotional test. Before any market or upgrade, would you care about this little creature? We’re working on the moment an egg becomes a companion.

### 2026-11-06 — Day 06: Explain a finite trader

**Post EN (243 characters)**

A trader shouldn’t buy everything forever.

In Hatchglen, orders have quantities and a budget. You can see what’s wanted, what you can supply, and when an order is filled.

We’re testing an economy that creates decisions, not endless counters.

**UA intent:** Показати обмежений попит. Жодних обіцянок викупу за справжні гроші.

**Media:** Open order → deliver → remaining quantity and trader budget change together.

**Publish gate:** NPC order limits and budget pass regression tests. Label local/testnet state accurately.

**Fallback EN:** Today we’re testing the least glamorous part of a game economy: what stops a trader from buying forever? Visible demand and a finite budget make the decisions easier to understand.

### 2026-11-07 — Day 07: One expedition decision

**Post EN (218 characters)**

Your dragons found a sealed gate.

Return with what they’ve found, or spend materials and stay longer for the vault?

No mystery button. We show the cost and the extra reward before you decide. Which way are you going?

**UA intent:** Показати зрозумілу ціну рішення замість незрозумілої рулетки.

**Media:** Team selection, arrival decision with both choices, one chosen outcome. 12–18s edited clip.

**Publish gate:** Return/delve costs, extra delay and single claim are verified.

**Fallback EN:** We don’t need a hundred expedition buttons. One clear decision can do more: keep the loot you found, or spend some supplies to open the next door. That’s the choice we’re testing today.

### 2026-11-08 — Day 08: Mobile is a design constraint

**Post EN (219 characters)**

A dragon you can’t tap is a design bug.

Today we’re checking Hatchglen on a small screen: readable creatures, reachable actions, pinch to explore, and a quick way home.

What phone do you usually play browser games on?

**UA intent:** Справжній запис з телефона/емуляції; не обіцяти стабільні FPS без вимірів.

**Media:** Actual narrow viewport: pinch/pan → select → feed/collect → home. Include measured viewport in reply.

**Publish gate:** Touch and small-screen QA performed. No device/performance claims without data.

**Fallback EN:** The mobile pass is teaching us which controls were only “obvious” on a big monitor. We’re simplifying the path from spotting a dragon to doing something useful.

### 2026-11-09 — Day 09: Give fog a purpose

**Post EN (214 characters)**

The fog is hiding a purpose, not just more scenery.

Before you unlock a place, you should know what it offers and what it needs.

A new nest, a working quarry, or a route into the ruins—which would you open first?

**UA intent:** Закрита зона повинна пояснювати майбутню користь.

**Media:** Tap locked grove/quarry/ruins → show requirement → unlock one legal earned-resource location.

**Publish gate:** Locations, requirements, unlock persistence and camera focus work.

**Fallback EN:** We’re giving each fog-covered place a clear promise. “Spend resources to remove fog” isn’t enough. The player should know what becomes possible on the other side.

### 2026-11-10 — Day 10: Close the resource loop

**Post EN (242 characters)**

The best resource is one you have a plan for.

Raise dragons → gather different materials → craft something useful → bring a better-prepared team to the ruins.

We’re checking every counter in Hatchglen against one question: what is this for?

**UA intent:** Пояснити споживання ресурсів і синергію видів.

**Media:** Two resources consumed by charm recipe; show changed expedition reward preview.

**Publish gate:** Craft consumption and future departure effect are verified.

**Fallback EN:** We’re auditing the inventory today. If a resource has no use, it’s noise. If every upgrade asks for the same resource, the dragons stop feeling different.

### 2026-11-11 — Day 11: Show the NEAR testnet boundary

**Post EN (228 characters)**

A playable valley, plus a verifiable NEAR testnet exchange.

Our custom registry transfers a dragon between two demo accounts. Care and NPC trading stay local.

No player-wallet connection, AI or live-price events in this build.

**UA intent:** Показати реальний custom registry у testnet між демо-акаунтами. Не називати це NFT-ринком гравців; локальний дракон лишається у грі.

**Media:** Show the actual testnet registry flow: registered entry → list → buy → withdraw. Display the confirmed registry owner and explorer receipts. State that demo accounts are used and local care/NPC trading remain separate.

**Publish gate:** Replay the current testnet flow and check docs/qa/root-v3-near-ui-proof.json. The proof concerns custom registry entry ownership, not the local save or a player-connected wallet. Never relabel these receipts as mainnet.

**Fallback EN:** Here’s what our NEAR demo proves: a registered dragon’s ownership can move between two testnet demo accounts. It doesn’t put the local economy onchain, and it doesn’t connect a player wallet.

### 2026-11-12 — Day 12: Show an honest fix

**Post EN (242 characters)**

Build-in-public means showing the awkward parts too.

Today: one confusing interaction, the change we made, and the same action afterward.

If you try Hatchglen, tell us the first moment you don’t know what to do next. That’s useful feedback.

**UA intent:** Заповнити конкретний баг і показати його до/після. Не вигадувати фідбек.

**Media:** Before/after 6s each, same viewport/action; describe issue in one short caption.

**Publish gate:** A real reproducible issue and verified fix exist. Link public demo only when deployed.

**Fallback EN:** A polished screenshot can hide a confusing game. We’re spending today on the moments between actions: what can I touch, what will it cost, and what changed?

### 2026-11-13 — Day 13: Invite a short complete playthrough

**Post EN (247 characters)**

One egg. Three useful dragons. A valley to wake.

We’re checking the complete Hatchglen journey from a fresh save—not just the prettiest screen.

Can a new player reach the first ending without someone explaining the controls? That’s today’s test.

**UA intent:** Повне проходження, а не монтаж окремих непов’язаних фіч.

**Media:** 60–90s walkthrough: hatch, care, work, trade, craft, eclipse, expedition, restore; keep full uncut proof locally.

**Publish gate:** Fresh-save end-to-end QA and reproducible instructions passed.

**Fallback EN:** Today is the full-loop test. We’re starting with one egg and checking every step to the first chapter ending. Anything that needs a developer standing behind the player is a problem to fix.

### 2026-11-14 — Day 14: Final public demo

**Post EN (265 characters)**

Hatchglen: raise dragons, give them useful work, trade supplies, and explore a valley that changes during eclipse.

A playable local chapter + a separate NEAR testnet registry demo. Build and limits documented.

Watch the journey below. @NEARProtocol #NEARHackathon

**UA intent:** Фінальний допис тільки з фінальним відео та публічним репо. Не писати submitted, доки форму не відправлено.

**Media:** 60–120s coherent video. Show actual NEAR transaction only if implemented. Put repo/demo links and implementation limits in first reply.

**Publish gate:** Public repository, accessible demo/video, accurate README, owner authorization for publication and submission.

**Fallback EN:** Hatchglen devlog / 14. Today we’re packaging the playable build, the walkthrough and the implementation limits. The demo should tell the truth about what works and what still needs work.

## What to measure

Useful measures: qualified replies about the game, complete demo sessions, where newcomers stall, and clicks into an accessible build. Raw impressions are context; wallet connects, token price and follower counts are not substitutes for retention. Keep no intrusive user-level tracking by default.

## Final-day timing

Aim to finish the release package on 13 November. Official current site lists final submission 14 November 2026, 23:59 UTC (15 November, 01:59 Kyiv). Recheck the site before posting/submitting. The public demo post must include @NEARProtocol and #NEARHackathon. A repository plus public X demo post are required; the owner still approves the actual submission. Source: https://nearhackathon.com/.
