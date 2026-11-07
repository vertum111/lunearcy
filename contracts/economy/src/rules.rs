//! The game's numbers, on chain. This file mirrors `src/market-rules.js` (Lucy's prices) and the formulas in
//! `src/engine.js` (production, levels, trips, the valley) in exact integer arithmetic, so the browser's prediction
//! and the contract always agree. `tests/parity.rs` checks that against vectors generated from the JavaScript.

/// Goods Lucy trades in, and the coin she pays with. Token IDs of the NEP-245 multi token.
pub const BERRIES: &str = "berries";
pub const CRYSTALS: &str = "crystals";
pub const COINS: &str = "coins";

pub const PHASE_MS: u64 = 120_000;
pub const HATCH_MS: u64 = 8_000;
pub const MAX_SLOTS: u8 = 8;
pub const MAX_LEVEL: u8 = 5;
pub const PRODUCTION_CAP: u8 = 5;
pub const FEED_COST: u128 = 2;
pub const FORAGE_MS: u64 = 20_000;
pub const FORAGE_BERRIES: u128 = 3;
pub const HURRY_COINS: u128 = 5;
pub const RESTORE_COINS: u128 = 60;
pub const RESTORE_CRYSTALS: u128 = 20;
pub const EXPEDITION_MS: u64 = 30_000;
pub const EXPEDITION_BERRIES_PER_DRAGON: u128 = 3;
pub const OFFLINE_MS: u64 = 45 * 60_000;
pub const AWAY_GAP_MS: u64 = 60_000;
pub const START_COINS: u128 = 40;
pub const START_BERRIES: u128 = 6;

// ---- Lucy's market (mirrors src/market-rules.js) ---------------------------------------------------------------
pub const START_WALLET: u128 = 150;
pub const RESELL_MS: u64 = 20_000;
pub const EMPTY_SHELF_PM: i128 = 250;
pub const HISTORY_LEN: usize = 24;

pub struct Good { pub base: i128, pub floor: u128, pub drop_pm: i128, pub resell_units: u128, pub panic_pm: i128 }
pub fn good(token: &str) -> Option<Good> {
    match token {
        BERRIES => Some(Good { base: 2, floor: 1, drop_pm: 80, resell_units: 3, panic_pm: 0 }),
        CRYSTALS => Some(Good { base: 6, floor: 2, drop_pm: 70, resell_units: 1, panic_pm: 250 }),
        _ => None,
    }
}

/// What Lucy pays for one unit: base × (1000 + 250 − drop × stock) × panic, in millionths, rounded half up,
/// never below the floor. `stock` already includes the units earlier in the same sale.
pub fn price(token: &str, stock: u128, panic: bool) -> u128 {
    let g = good(token).expect("Lucy does not trade this");
    let stock = stock.min(1_000_000) as i128;
    let panic_pm = 1000 + if panic { g.panic_pm } else { 0 };
    let raw = g.base * (1000 + EMPTY_SHELF_PM - g.drop_pm * stock) * panic_pm;
    let rounded = if raw > 0 { ((raw + 500_000) / 1_000_000) as u128 } else { 0 };
    rounded.max(g.floor)
}

/// How many units Lucy takes right now and the total she pays, limited by her wallet.
pub fn quote(token: &str, stock: u128, wallet: u128, have: u128, qty: u128, panic: bool) -> (u128, u128) {
    let (mut units, mut total) = (0u128, 0u128);
    while units < qty && units < have {
        let p = price(token, stock + units, panic);
        if total + p > wallet { break; }
        total += p;
        units += 1;
    }
    (units, total)
}

// ---- Day and eclipse --------------------------------------------------------------------------------------------
/// The sky is shared by every player: it turns red every other two minutes after the contract's genesis.
pub fn is_eclipse(genesis_ms: u64, now_ms: u64) -> bool { (now_ms.saturating_sub(genesis_ms) / PHASE_MS) % 2 == 1 }

// ---- Dragons (mirrors SPECIES in src/engine.js) -----------------------------------------------------------------
pub struct Species {
    pub id: &'static str, pub resource: &'static str, pub output: u128, pub cycle_s: u64, pub egg_cost: u128,
    pub unlock: Unlock, pub day_pm: u128, pub eclipse_pm: u128, pub trip: bool, pub cap_mult: u8,
}
#[derive(PartialEq)]
pub enum Unlock { Always, Restored, Quarry }
pub const SPECIES: [Species; 5] = [
    Species { id: "moss", resource: BERRIES, output: 3, cycle_s: 12, egg_cost: 30, unlock: Unlock::Always, day_pm: 1200, eclipse_pm: 1000, trip: false, cap_mult: 1 },
    Species { id: "ember", resource: CRYSTALS, output: 2, cycle_s: 15, egg_cost: 45, unlock: Unlock::Always, day_pm: 1000, eclipse_pm: 1500, trip: false, cap_mult: 1 },
    Species { id: "stone", resource: CRYSTALS, output: 4, cycle_s: 25, egg_cost: 70, unlock: Unlock::Always, day_pm: 1000, eclipse_pm: 1000, trip: true, cap_mult: 1 },
    Species { id: "mist", resource: BERRIES, output: 6, cycle_s: 18, egg_cost: 90, unlock: Unlock::Restored, day_pm: 1000, eclipse_pm: 1500, trip: false, cap_mult: 1 },
    Species { id: "crystal", resource: CRYSTALS, output: 7, cycle_s: 24, egg_cost: 120, unlock: Unlock::Quarry, day_pm: 1000, eclipse_pm: 1000, trip: false, cap_mult: 2 },
];
pub fn species(id: &str) -> &'static Species { SPECIES.iter().find(|s| s.id == id).expect("Unknown species") }
pub fn species_index(id: &str) -> u8 { SPECIES.iter().position(|s| s.id == id).expect("Unknown species") as u8 }

pub fn round_div(num: u128, den: u128) -> u128 { (num + den / 2) / den }
/// +10% per valley level, in per-mille.
pub fn valley_pm(level: u32) -> u128 { 1000 + 100 * (level.max(1) as u128 - 1) }
/// One harvest: output × (1 + 0.5 per level above 1) × bonus, rounded half up. `bonus_pm` = valley × trait.
pub fn output_at(sp: &Species, level: u8, bonus_pm: u128) -> u128 { round_div(sp.output * (level as u128 + 1) * bonus_pm, 2000) }
pub fn trait_pm(sp: &Species, eclipse: bool) -> u128 { if eclipse { sp.eclipse_pm } else { sp.day_pm } }
pub fn cap_of(sp: &Species) -> u8 { PRODUCTION_CAP * sp.cap_mult }

/// Levels cost about 1.7× the last: 20, 34, 58, 98 coins, plus 5 berries per current level.
pub fn upgrade_cost(level: u8) -> Option<(u128, u128)> {
    const COINS: [u128; 4] = [20, 34, 58, 98];
    if level >= MAX_LEVEL || level == 0 { None } else { Some((COINS[level as usize - 1], 5 * level as u128)) }
}
/// Trip loot: 6 coins per level and 2 crystals per dragon; a treasure hunter brings 1.5× coins and 2× crystals.
pub fn expedition_reward(team: &[(u8, u8)], valley_level: u32) -> (u128, u128) {
    let v = valley_pm(valley_level);
    let coins_tenths: u128 = team.iter().map(|&(sp, lvl)| 6 * lvl as u128 * if SPECIES[sp as usize].trip { 15 } else { 10 }).sum();
    let crystals: u128 = team.iter().map(|&(sp, _)| if SPECIES[sp as usize].trip { 4 } else { 2 }).sum();
    (round_div(coins_tenths * v, 10_000), round_div(crystals * v, 1000))
}
/// Each valley level costs 1.4× the last: round(10·1.4^k)·10 coins and round(8·1.4^k)·5 crystals.
pub fn valley_cost(level: u32) -> (u128, u128) {
    let k = (level.max(1) - 1).min(30);
    let (num, den) = (14u128.pow(k), 10u128.pow(k));
    (round_div(10 * num, den) * 10, round_div(8 * num, den) * 5)
}

pub const LOCATION_SLOTS: [&str; 8] = ["grove", "grove", "grove", "grove", "quarry", "quarry", "ruins", "ruins"];

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn prices_match_the_rules_file() {
        assert_eq!(price(BERRIES, 0, false), 3);
        assert_eq!(price(CRYSTALS, 0, false), 8);
        assert_eq!(price(CRYSTALS, 0, true), 9);
        assert_eq!(price(BERRIES, 0, true), 3, "the eclipse panic is about crystals only");
        assert_eq!(price(BERRIES, 40, false), 1, "never below the floor");
        assert_eq!(quote(CRYSTALS, 0, 10, 5, 5, false), (1, 8), "a sale stops at the wallet");
    }
    #[test]
    fn costs_and_rewards() {
        assert_eq!(upgrade_cost(1), Some((20, 5)));
        assert_eq!(upgrade_cost(4), Some((98, 20)));
        assert_eq!(upgrade_cost(5), None);
        assert_eq!(valley_cost(1), (100, 40));
        assert_eq!(valley_cost(2), (140, 55));
        assert_eq!(expedition_reward(&[(0, 1)], 1), (6, 2));
        assert_eq!(expedition_reward(&[(2, 1)], 1), (9, 4));
        assert_eq!(output_at(species("moss"), 1, 1200), 4);
        assert_eq!(output_at(species("moss"), 2, 1000), 5);
    }
}
