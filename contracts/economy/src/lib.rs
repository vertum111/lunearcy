//! Lunearcy economy: the whole resource economy of the game on NEAR.
//!
//! - Every item is a NEP-245 multi token in this one contract: `coins`, `berries`, `crystals`, and each dragon as
//!   `dragon:<id>` (a supply of one).
//! - Lucy, the forest spirit who keeps the valley's only shop, is this contract's own account. Her wallet is her
//!   `coins` balance and her shelves are her `berries` / `crystals` balances. Every player sells to the same Lucy,
//!   so one player's flood of crystals lowers the price for everyone, and her wallet only refills when someone spends
//!   coins in the valley or the neighbours buy from her shelves.
//! - Dragons produce on chain, from block time: nothing a browser says can mint goods.
//! - The sky is shared: the eclipse comes every other two minutes after genesis, and crystals sell dearer then.
//!
//! The numbers live in `rules.rs`, which mirrors the game's `src/market-rules.js` and `src/engine.js`.
pub mod rules;
mod mt;

use near_sdk::{
    borsh::{BorshDeserialize, BorshSerialize}, collections::LookupMap, env, json_types::{U128, U64}, near_bindgen,
    require, serde::{Deserialize, Serialize}, AccountId, BorshStorageKey, PanicOnDefault,
};
use rules::*;

pub const MAX_PLAYERS: u32 = 5000;

#[derive(BorshSerialize, BorshStorageKey)]
#[borsh(crate = "near_sdk::borsh")]
enum Key { Balances, Supply, Players, Dragons }

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone, PartialEq, Debug)]
#[borsh(crate = "near_sdk::borsh")]
#[serde(crate = "near_sdk::serde")]
pub enum Stage { Egg, Baby, Adult }

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone, Debug)]
#[borsh(crate = "near_sdk::borsh")]
#[serde(crate = "near_sdk::serde")]
pub struct Dragon {
    pub id: u64,
    pub owner: AccountId,
    pub species: String,
    pub name: Option<String>,
    pub slot: u8,
    pub stage: Stage,
    pub hatch_at: u64,
    pub feeds: u8,
    pub level: u8,
    /// Finished harvests waiting in the nest (0…cap) and the goods they hold (can grow past cap while away).
    pub ready: u8,
    pub ready_amount: u64,
    /// When the next harvest finishes (ms).
    pub next: u64,
}

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone, Debug)]
#[borsh(crate = "near_sdk::borsh")]
#[serde(crate = "near_sdk::serde")]
pub struct Expedition { pub team: Vec<u64>, pub ends: u64, pub coins: u64, pub crystals: u64 }

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone, Debug)]
#[borsh(crate = "near_sdk::borsh")]
#[serde(crate = "near_sdk::serde")]
pub struct Player {
    pub joined: u64,
    pub last: u64,
    pub slots: u8,
    pub restored: bool,
    pub quarry: bool,
    pub ruins: bool,
    pub valley_level: u32,
    pub forage_at: u64,
    pub dragons: Vec<u64>,
    pub expedition: Option<Expedition>,
    pub trades: u32,
    pub sold: u32,
    pub collected: u32,
    pub expeditions: u32,
    pub hurried: u32,
    pub goals_claimed: Vec<String>,
}

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone, Debug)]
#[borsh(crate = "near_sdk::borsh")]
#[serde(crate = "near_sdk::serde")]
pub struct MarketMemory { pub resell_at: u64, pub history_berries: Vec<u32>, pub history_crystals: Vec<u32> }

#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
#[borsh(crate = "near_sdk::borsh")]
pub struct Economy {
    pub(crate) balances: LookupMap<(AccountId, String), u128>,
    pub(crate) supply: LookupMap<String, u128>,
    players: LookupMap<AccountId, Player>,
    dragons: LookupMap<u64, Dragon>,
    player_count: u32,
    next_dragon: u64,
    genesis: u64,
    market: MarketMemory,
}

// ---- Views -------------------------------------------------------------------------------------------------------
#[derive(Serialize)]
#[serde(crate = "near_sdk::serde")]
pub struct MarketView {
    pub wallet: U128, pub stock_berries: U128, pub stock_crystals: U128, pub eclipse: bool, pub genesis: U64,
    pub price_berries: U128, pub price_crystals: U128, pub resell_at: U64, pub history_berries: Vec<u32>,
    pub history_crystals: Vec<u32>, pub now: U64,
}
#[derive(Serialize)]
#[serde(crate = "near_sdk::serde")]
pub struct PlayerView { pub player: Player, pub dragons: Vec<Dragon>, pub coins: U128, pub berries: U128, pub crystals: U128 }

pub(crate) fn mt_event(kind: &str, data: near_sdk::serde_json::Value) {
    env::log_str(&format!("EVENT_JSON:{}", near_sdk::serde_json::json!({"standard":"nep245","version":"1.0.0","event":kind,"data":[data]})));
}
fn game_event(kind: &str, data: near_sdk::serde_json::Value) {
    env::log_str(&format!("EVENT_JSON:{}", near_sdk::serde_json::json!({"standard":"lunearcy","version":"1.0.0","event":kind,"data":[data]})));
}
fn now_ms() -> u64 { env::block_timestamp_ms() }
fn slots_for(p: &Player) -> u8 { if p.ruins { 8 } else if p.quarry { 6 } else if p.restored { 4 } else { 3 } }
fn valid_name(name: &str) {
    require!(name.chars().count() <= 20, "Name: up to 20 characters");
    require!(name.chars().all(|c| c.is_alphanumeric() || " .’'-".contains(c)), "Name contains unsupported characters");
}

#[near_bindgen]
impl Economy {
    #[init]
    pub fn new() -> Self {
        let mut s = Self {
            balances: LookupMap::new(Key::Balances), supply: LookupMap::new(Key::Supply), players: LookupMap::new(Key::Players),
            dragons: LookupMap::new(Key::Dragons), player_count: 0, next_dragon: 1, genesis: now_ms(),
            market: MarketMemory { resell_at: now_ms() + RESELL_MS, history_berries: vec![3], history_crystals: vec![8] },
        };
        let lucy = env::current_account_id();
        s.mint(&lucy, COINS, START_WALLET);
        s
    }

    // ---- Views -------------------------------------------------------------------------------------------------
    pub fn get_market(&self) -> MarketView {
        let lucy = env::current_account_id();
        let (now, eclipse) = (now_ms(), is_eclipse(self.genesis, now_ms()));
        let (sb, sc) = (self.balance(&lucy, BERRIES), self.balance(&lucy, CRYSTALS));
        MarketView {
            wallet: U128(self.balance(&lucy, COINS)), stock_berries: U128(sb), stock_crystals: U128(sc), eclipse,
            genesis: U64(self.genesis), price_berries: U128(price(BERRIES, sb, eclipse)), price_crystals: U128(price(CRYSTALS, sc, eclipse)),
            resell_at: U64(self.market.resell_at), history_berries: self.market.history_berries.clone(),
            history_crystals: self.market.history_crystals.clone(), now: U64(now),
        }
    }
    pub fn get_player(&self, account_id: AccountId) -> Option<PlayerView> {
        let p = self.players.get(&account_id)?;
        let dragons = p.dragons.iter().filter_map(|id| self.dragons.get(id)).collect();
        Some(PlayerView { coins: U128(self.balance(&account_id, COINS)), berries: U128(self.balance(&account_id, BERRIES)),
            crystals: U128(self.balance(&account_id, CRYSTALS)), player: p, dragons })
    }
    pub fn get_config(&self) -> near_sdk::serde_json::Value {
        near_sdk::serde_json::json!({"standard":"nep245","game":"lunearcy","network_guard":"testnet","players":self.player_count,
            "max_players":MAX_PLAYERS,"genesis":U64(self.genesis),"phase_ms":U64(PHASE_MS),"lucy":env::current_account_id()})
    }

    // ---- Joining -----------------------------------------------------------------------------------------------
    /// A new valley: 40 coins, 6 berries and the first egg in the root nest.
    pub fn join(&mut self) -> PlayerView {
        let who = env::predecessor_account_id();
        require!(self.players.get(&who).is_none(), "Already in the valley");
        require!(who != env::current_account_id(), "Lucy does not play");
        require!(self.player_count < MAX_PLAYERS, "The valley is full");
        let now = now_ms();
        let mut p = Player { joined: now, last: now, slots: 3, restored: false, quarry: false, ruins: false, valley_level: 1,
            forage_at: 0, dragons: vec![], expedition: None, trades: 0, sold: 0, collected: 0, expeditions: 0, hurried: 0, goals_claimed: vec![] };
        self.mint(&who, COINS, START_COINS);
        self.mint(&who, BERRIES, START_BERRIES);
        self.new_dragon(&who, &mut p, "moss", 0, now);
        self.players.insert(&who, &p);
        self.player_count += 1;
        game_event("joined", near_sdk::serde_json::json!({"account_id":who}));
        self.get_player(who).unwrap()
    }

    // ---- Actions (each one ticks the market and the caller's valley first) ------------------------------------
    pub fn hatch(&mut self, id: u64) { self.act(|e, who, p, now| {
        let mut d = e.own_dragon(who, id);
        require!(d.stage == Stage::Egg, "Already hatched");
        require!(now >= d.hatch_at, "The egg is still warming");
        d.stage = Stage::Baby; e.dragons.insert(&id, &d); let _ = p;
    }) }
    pub fn hurry(&mut self, id: u64) { self.act(|e, who, p, now| {
        let mut d = e.own_dragon(who, id);
        require!(d.stage == Stage::Egg, "Only an egg can be hurried");
        require!(now < d.hatch_at, "The egg is already ready");
        e.spend_coins(who, HURRY_COINS); d.hatch_at = now; p.hurried += 1; e.dragons.insert(&id, &d);
    }) }
    pub fn feed(&mut self, id: u64) { self.act(|e, who, _p, now| {
        let mut d = e.own_dragon(who, id);
        require!(d.stage == Stage::Baby, "This dragon does not need feeding");
        e.burn(who, BERRIES, FEED_COST);
        d.feeds += 1;
        if d.feeds >= 3 { d.stage = Stage::Adult; d.next = now + species(&d.species).cycle_s * 1000; }
        e.dragons.insert(&id, &d);
    }) }
    pub fn collect(&mut self, id: u64) { self.act(|e, who, p, now| {
        let mut d = e.own_dragon(who, id);
        require!(d.stage == Stage::Adult && d.ready > 0, "The harvest is not ready");
        require!(!e.away(p, id), "Wait for the dragon to come back");
        let sp = species(&d.species);
        let was_full = d.ready >= cap_of(sp);
        e.mint(who, sp.resource, d.ready_amount as u128);
        d.ready = 0; d.ready_amount = 0; p.collected += 1;
        if was_full || d.next <= now { d.next = now + sp.cycle_s * 1000; }
        e.dragons.insert(&id, &d);
    }) }
    pub fn buy_egg(&mut self, species_id: String, slot: Option<u8>) { self.act(|e, who, p, now| {
        let sp = species(&species_id);
        require!(match sp.unlock { Unlock::Always => true, Unlock::Restored => p.restored, Unlock::Quarry => p.quarry }, "This species is still locked");
        let owned: Vec<String> = p.dragons.iter().filter_map(|id| e.dragons.get(id)).map(|d| d.species).collect();
        let kinds = { let mut k = owned.clone(); k.sort(); k.dedup(); k.len() };
        require!(!(kinds < 3 && owned.contains(&species_id)), "Invite three different species first");
        let taken: Vec<u8> = p.dragons.iter().filter_map(|id| e.dragons.get(id)).map(|d| d.slot).collect();
        let slot = match slot { Some(s) => s, None => (0..p.slots).find(|s| !taken.contains(s)).expect("No free open nest") };
        require!(slot < p.slots && !taken.contains(&slot), "No free open nest");
        e.spend_coins(who, sp.egg_cost);
        e.new_dragon(who, p, &species_id, slot, now);
    }) }
    pub fn upgrade(&mut self, id: u64) { self.act(|e, who, p, _now| {
        let mut d = e.own_dragon(who, id);
        require!(d.stage == Stage::Adult, "Raise the dragon first");
        require!(!e.away(p, id), "Wait for the dragon to come back");
        let (coins, berries) = upgrade_cost(d.level).expect("Highest level reached");
        e.burn(who, BERRIES, berries);
        e.spend_coins(who, coins);
        d.level += 1; e.dragons.insert(&id, &d);
    }) }
    pub fn rename(&mut self, id: u64, name: String) { self.act(|e, who, _p, _now| {
        let mut d = e.own_dragon(who, id);
        let name = name.split_whitespace().collect::<Vec<_>>().join(" ");
        valid_name(&name);
        d.name = if name.is_empty() { None } else { Some(name) };
        e.dragons.insert(&id, &d);
    }) }
    pub fn move_dragon(&mut self, id: u64, slot: u8) { self.act(|e, who, p, now| {
        let mut d = e.own_dragon(who, id);
        require!(!e.away(p, id), "Wait for the dragon to come back");
        let taken = p.dragons.iter().filter_map(|i| e.dragons.get(i)).any(|o| o.slot == slot);
        require!(slot < p.slots && !taken, "Pick a free open nest");
        if d.ready > 0 { e.mint(who, species(&d.species).resource, d.ready_amount as u128); d.ready = 0; d.ready_amount = 0; }
        d.slot = slot;
        if d.stage == Stage::Adult { d.next = now + species(&d.species).cycle_s * 1000; }
        e.dragons.insert(&id, &d);
    }) }
    pub fn forage(&mut self) { self.act(|e, who, p, now| {
        require!(now >= p.forage_at, "The berries are still ripening");
        e.mint(who, BERRIES, FORAGE_BERRIES); p.forage_at = now + FORAGE_MS;
    }) }
    /// Sell goods to Lucy: they go onto her shelf, coins come from her wallet. `min_total` protects against a price
    /// that moved (someone else sold first) between the player's tap and the block.
    pub fn sell(&mut self, token_id: String, qty: U128, min_total: Option<U128>) -> U128 {
        let mut paid = 0;
        self.act(|e, who, p, _now| {
            require!(good(&token_id).is_some(), "Lucy does not buy this");
            let lucy = env::current_account_id();
            let eclipse = is_eclipse(e.genesis, now_ms());
            let (units, total) = quote(&token_id, e.balance(&lucy, &token_id), e.balance(&lucy, COINS), e.balance(who, &token_id), qty.0, eclipse);
            require!(units > 0, "Lucy is out of coins: buy something from her or wait until she resells her stock");
            require!(total >= min_total.map_or(0, |m| m.0), "The price moved: check Lucy's new price");
            e.move_tokens(who, &lucy, &token_id, units);
            e.move_tokens(&lucy, who, COINS, total);
            e.note_price(&token_id);
            p.trades += 1; p.sold += units as u32; paid = total;
        });
        U128(paid)
    }
    pub fn restore(&mut self) { self.act(|e, who, p, _now| {
        require!(!p.restored, "The Heart of the Valley is already restored");
        require!(e.adult_kinds(p) >= 3, "Three different adult dragons are needed");
        e.burn(who, CRYSTALS, RESTORE_CRYSTALS); e.spend_coins(who, RESTORE_COINS);
        p.restored = true; p.slots = p.slots.max(slots_for(p));
    }) }
    pub fn unlock_location(&mut self, location: String) { self.act(|e, who, p, _now| {
        let (coins, crystals) = match location.as_str() {
            "quarry" => { require!(p.restored, "Restore the Heart of the Valley"); require!(!p.quarry, "Already open"); (80, 20) }
            "ruins" => { require!(p.quarry, "Open the Moon Quarry"); require!(!p.ruins, "Already open"); (120, 40) }
            _ => env::panic_str("Unknown land"),
        };
        e.burn(who, CRYSTALS, crystals); e.spend_coins(who, coins);
        if location == "quarry" { p.quarry = true } else { p.ruins = true }
        p.slots = p.slots.max(slots_for(p));
    }) }
    pub fn expedition(&mut self, team: Vec<u64>) { self.act(|e, who, p, now| {
        require!(p.expedition.is_none(), "The team is already away");
        require!(!team.is_empty() && team.len() <= 3, "Pick one to three dragons");
        let mut unique = team.clone(); unique.sort(); unique.dedup();
        require!(unique.len() == team.len(), "Pick different dragons");
        let members: Vec<(u8, u8)> = team.iter().map(|id| { let d = e.own_dragon(who, *id); require!(d.stage == Stage::Adult, "Only adults travel"); (species_index(&d.species), d.level) }).collect();
        e.burn(who, BERRIES, EXPEDITION_BERRIES_PER_DRAGON * team.len() as u128);
        let (coins, crystals) = expedition_reward(&members, p.valley_level);
        p.expedition = Some(Expedition { team, ends: now + EXPEDITION_MS, coins: coins as u64, crystals: crystals as u64 });
    }) }
    /// Trips bring coins from outside the valley: the only new money besides goal rewards and Lucy's resale.
    pub fn claim(&mut self) { self.act(|e, who, p, now| {
        let x = p.expedition.clone().expect("No team is away");
        require!(now >= x.ends, "The trip is still going");
        e.mint(who, COINS, x.coins as u128); e.mint(who, CRYSTALS, x.crystals as u128);
        for id in &x.team { if let Some(mut d) = e.dragons.get(id) { d.next = now + species(&d.species).cycle_s * 1000; e.dragons.insert(id, &d); } }
        p.expedition = None; p.expeditions += 1;
    }) }
    pub fn grow_valley(&mut self) { self.act(|e, who, p, _now| {
        require!(p.ruins, "Open every land first");
        let (coins, crystals) = valley_cost(p.valley_level);
        e.burn(who, CRYSTALS, crystals); e.spend_coins(who, coins);
        p.valley_level += 1;
    }) }
    pub fn claim_goal(&mut self, goal: String) { self.act(|e, who, p, _now| {
        require!(!p.goals_claimed.contains(&goal), "Reward already claimed");
        let ds: Vec<Dragon> = p.dragons.iter().filter_map(|id| e.dragons.get(id)).collect();
        let adults = ds.iter().filter(|d| d.stage == Stage::Adult).count();
        let max_level = ds.iter().map(|d| d.level).max().unwrap_or(1);
        let (done, token, amount) = match goal.as_str() {
            "arrivals" => (ds.iter().filter(|d| d.stage != Stage::Egg).count() >= 2, COINS, 15),
            "seller" => (p.sold >= 10, COINS, 20),
            "impatient" => (p.hurried >= 1, COINS, 10),
            "trio" => (e.adult_kinds(p) >= 3, CRYSTALS, 5),
            "traveller" => (p.expeditions >= 1, BERRIES, 10),
            "pack" => (adults >= 4, CRYSTALS, 10),
            "master" => (max_level >= 3, COINS, 40),
            "legend" => (max_level >= 5, CRYSTALS, 25),
            _ => env::panic_str("Unknown goal"),
        };
        require!(done, "The goal is not done yet");
        e.mint(who, token, amount); p.goals_claimed.push(goal.clone());
    }) }
}

// ---- Internals -----------------------------------------------------------------------------------------------------
impl Economy {
    fn act<F: FnOnce(&mut Self, &AccountId, &mut Player, u64)>(&mut self, f: F) {
        let who = env::predecessor_account_id();
        let mut p = self.players.get(&who).expect("Join the valley first");
        let now = now_ms();
        self.tick_market(now);
        self.tick_player(&mut p, now);
        f(self, &who, &mut p, now);
        p.last = now;
        self.players.insert(&who, &p);
    }
    fn own_dragon(&self, who: &AccountId, id: u64) -> Dragon {
        let d = self.dragons.get(&id).expect("No such dragon");
        require!(&d.owner == who, "Not your dragon");
        d
    }
    fn away(&self, p: &Player, id: u64) -> bool { p.expedition.as_ref().is_some_and(|x| x.team.contains(&id)) }
    fn adult_kinds(&self, p: &Player) -> usize {
        let mut k: Vec<String> = p.dragons.iter().filter_map(|id| self.dragons.get(id)).filter(|d| d.stage == Stage::Adult).map(|d| d.species).collect();
        k.sort(); k.dedup(); k.len()
    }
    fn new_dragon(&mut self, who: &AccountId, p: &mut Player, species_id: &str, slot: u8, now: u64) {
        let id = self.next_dragon; self.next_dragon += 1;
        let d = Dragon { id, owner: who.clone(), species: species_id.to_string(), name: None, slot, stage: Stage::Egg,
            hatch_at: now + HATCH_MS, feeds: 0, level: 1, ready: 0, ready_amount: 0, next: 0 };
        self.dragons.insert(&id, &d);
        p.dragons.push(id);
        self.mint(who, &format!("dragon:{id}"), 1);
    }
    /// Production up to `now`, harvest by harvest (each sized by the phase it finished in). If the player was away for
    /// more than a minute, a full nest keeps filling at half speed for up to 45 minutes, as in the game.
    fn tick_player(&mut self, p: &mut Player, now: u64) {
        let gap = now.saturating_sub(p.last);
        let away = gap > AWAY_GAP_MS;
        let vpm = valley_pm(p.valley_level);
        for id in p.dragons.clone() {
            if self.away(p, id) { continue; }
            let mut d = match self.dragons.get(&id) { Some(d) => d, None => continue };
            if d.stage != Stage::Adult { continue; }
            let sp = species(&d.species);
            let (cap, cyc) = (cap_of(sp), sp.cycle_s * 1000);
            let mut filled = 0u64;
            if d.ready < cap && now >= d.next {
                let cycles = (now - d.next) / cyc + 1;
                let added = (cap - d.ready) as u64;
                let added = added.min(cycles);
                for i in 0..added {
                    let at = d.next + i * cyc;
                    let bonus = vpm * trait_pm(sp, is_eclipse(self.genesis, at)) / 1000;
                    d.ready_amount += output_at(sp, d.level, bonus) as u64;
                }
                d.ready += added as u8; d.next += cycles * cyc; filled = added;
            }
            if away && d.ready >= cap {
                let left = gap.min(OFFLINE_MS).saturating_sub(filled * cyc);
                let extra = left / (cyc * 2);
                if extra > 0 {
                    let avg = (sp.day_pm + sp.eclipse_pm) / 2;
                    d.ready_amount += extra * output_at(sp, d.level, vpm * avg / 1000) as u64;
                }
            }
            self.dragons.insert(&id, &d);
        }
    }
    /// Neighbours buy from Lucy's shelves every 20 s at the base price: stock drains, her wallet refills.
    fn tick_market(&mut self, now: u64) {
        if now < self.market.resell_at { return; }
        let rounds = ((now - self.market.resell_at) / RESELL_MS + 1) as u128;
        let lucy = env::current_account_id();
        for token in [BERRIES, CRYSTALS] {
            let g = good(token).unwrap();
            let n = self.balance(&lucy, token).min(rounds * g.resell_units);
            if n == 0 { continue; }
            self.burn(&lucy, token, n);
            self.mint(&lucy, COINS, n * g.base as u128);
            self.note_price(token);
        }
        self.market.resell_at += rounds as u64 * RESELL_MS;
    }
    fn note_price(&mut self, token: &str) {
        let lucy = env::current_account_id();
        let p = price(token, self.balance(&lucy, token), is_eclipse(self.genesis, now_ms())) as u32;
        let h = if token == BERRIES { &mut self.market.history_berries } else { &mut self.market.history_crystals };
        h.push(p);
        if h.len() > HISTORY_LEN { let cut = h.len() - HISTORY_LEN; h.drain(0..cut); }
    }
    /// Every coin a player spends in the valley lands in Lucy's wallet.
    fn spend_coins(&mut self, who: &AccountId, amount: u128) { let lucy = env::current_account_id(); self.move_tokens(who, &lucy, COINS, amount); }
}

#[cfg(test)]
mod tests;
