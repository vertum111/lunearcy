# Independent visual / onboarding review — Hatchglen v3

31 October 2026. Reviewer: branding/marketing subagent, independent from main UI and world implementation.

## Current outcome after fixes

The final reviewed 390×844 terrain and Eggs captures have no blocking overlap or readability issue in this review's scope. The coordinator verified that opening Eggs after the first sale ends the guide; the resulting screenshot confirms it is absent. The ruins WebP export defect is resolved: independent decoding produced byte-identical 1024×1536 RGBA buffers for PNG and corrected WebP. The OG was regenerated from the corrected assets and visually inspected. Earlier findings below are an audit trail, not a list of all still-open defects. Optional refinements remain: a denser owned-species row and small-panel hit-area/scroll polish.

## Scope and evidence

The review combines direct visual observation of a separate Chrome session (`?session=brand-qa-v3`), coordinator-captured screenshots, and read-only UI/source inspection. I attempted the start action twice through the browser tooling. Browser calls then timed out, including inventory calls; the coordinator independently confirmed that clicking Play in IAB works. **No game startup defect is established by those tool failures.** I stopped competing for the shared browser and continued with the coordinator's captures, as requested. I did not mutate a save, simulate game actions through hidden APIs, or edit game code.

Direct interaction from cold start through first market is being checked by the coordinator and another reviewer. This report does not claim a completed independent manual playthrough where tooling prevented one.

Initial evidence:

- `01-desktop-cold-start.png`: my separate Chrome session, approximately 2112×1030 viewport. Menu observed directly.
- `02-desktop-first-guide.png`: copy of coordinator's 1280×720 first-guide capture.
- Source inspected: `src/main.js`, `src/game.css`, `src/world.js`, `src/world.css` and `src/audio.js`. Findings from source are distinguished from visual observations below.

## What is working

- The flat illustrated world, expressive narrow-bodied dragons and rounded typography belong together. This direction feels like a coherent creature game and is preferable to introducing a new visual style now.
- The title menu has one dominant start action, an identifiable dragon, readable headline and a clear promise. The background gives a glimpse of the world without overwhelming the invitation.
- The first guide names a concrete action rather than giving a full manual. Highlighting a target and offering a focus action are the right mechanisms.
- Inventory, phase, chapter goal and bottom navigation have stable positions. A local-economy label and a separate NEAR panel prevent an ordinary care action from turning into a wallet instruction.
- Different species have a practical use, and the market shows a finite budget/orders rather than an invisible infinite buyer. This is suitable material for an honest game-first demo.

## Findings sent to the coordinator

| Priority | Finding | Evidence | Recommended change |
|---|---|---|---|
| P1 | Navigation and supporting text are too small at ordinary desktop/mobile sizes. | Screenshot: bottom labels are difficult to read. Source: nav 8 px desktop, 7 px mobile, 6 px below 380; resource labels 8/7/6; tutorial kicker 6/5. | Start with nav 11–12 px, useful secondary labels 10–11 px, primary action copy 12–13 px. Remove unnecessary labels if space is tight instead of shrinking further. |
| P1 — verify mobile | Guide and market inspector can occupy the same screen band. | Source: open inspector can start near y139 at 390×844, tutorial is top194/z8 and inspector z6. Needs screenshot confirmation. | Put a short guide in the panel flow, reserve a dedicated band, or collapse the floating guide while the panel is open. Avoid layering instructional text over the action being taught. |
| P2 | “Показати потрібну дію” looks like a caption, despite being the primary help action. | Screenshot: tiny left-aligned unframed text. Source: 9 px / 26 px height. | Use a visibly actionable button with step-specific text such as “До яйця”, “До ринку” or “Показати”. |
| P2 | “Перше гніздо в центрі долини” is spatially ambiguous. | Screenshot: egg is upper-left of the central screen; camera can pan and mobile cropping differs. | Refer to identity: “Обери гніздо з яйцем”. Keep the focus action. |
| P2 | Decorative foliage overlaps the egg's label edge. | Screenshot: right side of “Таємниче яйце”. | Keep captions above decorative geometry and out of the art silhouette. |
| P2 | The first exposure can be eclipse rather than daylight after time on the menu. | First-guide screenshot shows eclipse with an unhatched egg. Source: initial state's timestamps predate Play. Exact route timing was not independently reproduced. | For a genuinely fresh session, begin the phase clock on Play or preserve a short first daylight window; returning saves may correctly resume their current phase. |
| P2 | Collection feedback always uses leaves, even for ore/embers. | Source: feedback glyph falls back to leaf for all collect actions. | Choose particle icon from the producing dragon's resource. Keep the balance change synchronized with the matching icon. |
| P2 | Foraging feedback may attach to selected dragon instead of berry node. | Source: main passes `a.id ?? selected`; forage action has no id. World accepts string location ids but does not receive one. | Route forage feedback to location id `forage`. Route shrine/expedition effects to their meaningful target as well. |
| P2 | Market action copy is unnecessarily technical/long. | Source: “Запросити нові профінансовані замовлення”; “зарезервовано”. | Button “Оновити замовлення”. Explain budget below; use “У замовленнях” for reserved amount if that distinction is needed. |
| P2 | Resource quantities use dictionary labels rather than Ukrainian numeral forms. | Source: order quantity concatenated with `RESOURCE.toLowerCase()`. | Use “6 ягід”, “2 жарокамені”, “2 руди”. A quantity-format helper avoids repeated mistakes. |
| P2 | Reset dialog exposes previous project history. | Source: “Старий космічний проєкт та інші сесії не зміняться”. | Remove the old project reference. “Поточний прогрес цієї пригоди буде замінено” is sufficient. |

## Emotional / presentation refinements

These are design judgments, not blockers:

- “1/11” guide plus “0/7” chapter simultaneously makes a short cozy introduction look like a long checklist. Consider a simple “Ліра · наступний крок” for the guide, with the chapter retaining completion progress.
- Show the actual first useful outcome before introducing budget/reservation terminology. A berry floating to the balance and a dragon reaction are stronger teaching than another paragraph.
- Eclipse currently warms most terrain to ochre in the first-guide capture. A restrained wine-colored sky/portal cue would communicate the event more directly while keeping the species recognizable. Avoid a blanket wash that removes every object's identity.
- Do not replace the approved dragon silhouettes during polish. Better eye/body reactions and clearer resource feedback will add more personality than extra decorative clutter.

## Verification limits

Later sections cover current first-adult, first-sale and mobile-market captures. They do not establish a separate hands-on mobile cold-start playthrough by this reviewer. UI action verification belongs to the coordinator’s live run; this review independently evaluates the captured results and source behavior.

## Follow-up — first adult capture

Reviewed coordinator capture `root-v3-first-adult.png`; copied to `03-desktop-first-adult.png` for the review record.

- Navigation copy is visibly larger, and the guide now has an outlined action button. Both address the earlier readability/action-affordance findings.
- Guide kicker now says “НАСТУПНА ДІЯ” rather than presenting an 11-step workload. The coordinator is ending the compulsory tutorial after the first sale; I support this because the player has then learned select → hatch → feed → collect → trade.
- The enlarged world dragon, its visible platform and the compact action card have a clear relationship. The first production card states 3 berries / 14 s and shows the wait, so the action has an understandable consequence.
- Newly observed naming inconsistency: the action card says “Сонячний гай” while the world says “Листяний гай”. Use one location name in engine, world and instructions.
- A growth toast and a large phase-change banner appear together above the first adult. This can compete with the emotional reveal. Deferring phase announcements during the initial hatch/growth sequence is a useful polish change, not a progression blocker.

## Follow-up — first sale / mobile market

Reviewed coordinator captures `root-v3-market.png` (1280×720) and `root-v3-mobile-market.png` (390×844), copied as `04-desktop-first-market.png` and `05-mobile-first-market.png`.

**Confirmed improvements:**

- The mobile guide and panel no longer overlap in these frames; the panel begins below the guide. The earlier overlap risk is resolved in the photographed state.
- Bottom navigation text and targets are usable at 390 px. The market uses understandable “6 ягід”, “4 жарокамені”, “4 руди” forms, so the earlier grammar issue is resolved.
- The first sale is legible: coins rise to 108, berries fall to 3, the toast states +18 coins, and the order shows 2/3 remaining. The desktop capture includes the floating +18 and −6 deltas. Cause and result are much clearer than an unexplained balance change.
- A success guide now celebrates the first exchange and points to a new dragon rather than continuing a mandatory 11-step tutorial. This is the right transition into independent play.

**Confirmed mobile issue, sent immediately to the coordinator:** the completion guide has no visible “Покликати нового друга” button on mobile. CSS hides every tutorial button whenever the inspector is open. Source finishes the tutorial only via that button; tapping the highlighted Eggs tab alone does not finish it. Preserve the completion CTA on mobile or finish the tutorial when the player opens Eggs after step7. Otherwise the congratulation remains as a persistent panel and takes 116 px from the already constrained view.

**Remaining polish judgments:**

- Mara is currently a shop icon plus a budget ledger. The action works, but it is the least emotionally game-like part of the first minute. A small original character portrait and one short contextual line would add more character than more panel chrome. This can follow core fixes.
- After the sale, the market's heading/close control are above the current scroll position. Home navigation remains available, so this is not a trap. A compact sticky panel heading would make long market panels easier to leave without depending on knowledge of the Home tab.
- Keep compulsory copy short on phone. Once the success guide is dismissed, avoid replacing it with another persistent checklist; the chapter's next objective is enough.

## Final source follow-up

The coordinator added an `openTab` rule that disables the tutorial when Eggs is opened after tutorial step7. This directly fixes the source path behind the hidden-mobile-completion-button issue. The photographed highlight already directs the player to that tab. A live mobile click should confirm the final dismissal; I did not claim that click through the unavailable independent browser handle.

The current first-minute presentation is suitable for continued demo polish: a recognizable dragon, a useful job, a visible resource transfer and a clear next objective. Prioritize the remaining camera/label artifacts and consistent feedback over adding another system or changing art direction. Optional later emotional work: a small original Mara portrait and a shorter contextual line in the market.

## Small character follow-up

At the coordinator's request, I authored `public/art/mara.svg` as an original three-color woodland traveler portrait. It is independent vector geometry, not a copied icon, character or raster trace. I rendered actual 24/48/72 px previews in `mara-size-check.png`; the face remains readable. Suggested line: “Сусіди чекають на припаси. Принесеш трохи?” The coordinator integrates the asset; this does not establish a screenshot of that integration yet.

## Regional terrain asset QA

Inspected the new grove, quarry and ruins cutouts independently, outside the game composition. Grove/quarry are coherent, with quieter playable pads and denser edge decoration. Ruins WebP has a clear export artifact: large horizontal green steps/bars in the surrounding matte, especially upper-right and bottom. Its PNG source has a smooth glow instead of those bars. I reported this as a P1 export/cleanup defect to the coordinator and saved the pre-fix evidence as `06-ruins-alpha-artifact.webp`. This is not a request to regenerate the illustration; compare/fix the conversion or use an intact export. The marketing OG must be regenerated after the corrected terrain file lands.

## Final mobile / corrected-terrain review

Reviewed coordinator captures `root-v3-mobile-terrain.png` and `root-v3-mobile-eggs.png`, copied as `07-mobile-current-terrain.png` and `08-mobile-post-tutorial-eggs.png`.

- The character has a clear readable silhouette against the newly painted terrain. The map retains enough space above the collector panel to feel like a world rather than a form.
- The selected collector card shows what is produced, the 3 / 14 s rate, the +15 stored amount and the matching primary collection button. This is understandable without a tutorial paragraph.
- The guide is absent in the post-sale Eggs capture, consistent with the coordinator's verified click path. The earlier mobile completion issue is closed.
- The next species and the affordable 50-coin invitation action are visible without additional scrolling. The third species peeks below; optional improvement is to make the already-owned Moss row denser so more of the remaining choice is visible.
- The current world and card both use “Сонячний гай”. The location-name inconsistency is closed in the reviewed frame.
- Corrected ruins WebP was independently compared with its PNG after decoding to RGBA: both 1024×1536×4, exact byte equality. The earlier P1 matte/block artifact is closed. Old evidence remains for audit purposes.
- Regenerated `public/brand/hatchglen-og.svg` / `.png` using the corrected terrain and current logical nest positions; inspected the PNG. The three original graphic creative templates are unchanged.

No game source was edited in this review. The portrait asset was authored separately at the coordinator's request; final UI integration is owned by the coordinator.
