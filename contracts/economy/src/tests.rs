use super::*;
use near_sdk::test_utils::{accounts, VMContextBuilder};
use near_sdk::testing_env;
use near_sdk::NearToken;

const T0: u64 = 1_000_000_000; // ms

fn ctx(who: usize, ms: u64) {
    let mut b = VMContextBuilder::new();
    b.current_account_id("lucy.testnet".parse().unwrap()).predecessor_account_id(accounts(who)).block_timestamp(ms * 1_000_000);
    testnet_env(b);
}
fn testnet_env(b: VMContextBuilder) { testing_env!(b.build()); }
fn lucy() -> AccountId { "lucy.testnet".parse().unwrap() }
fn setup() -> Economy { ctx(0, T0); Economy::new() }
fn bal(e: &Economy, who: usize, t: &str) -> u128 { e.balance(&accounts(who), t) }

/// Hatch the first egg, feed the baby three times; returns the time it grew up.
fn raise_first(e: &mut Economy, who: usize, t: u64) -> u64 {
    ctx(who, t); e.join();
    let id = e.get_player(accounts(who)).unwrap().player.dragons[0];
    let t = t + HATCH_MS; ctx(who, t); e.hatch(id);
    for _ in 0..3 { e.feed(id); }
    t
}

#[test]
fn a_new_valley_has_three_goods_one_egg_and_lucy_has_her_wallet() {
    let mut e = setup();
    ctx(1, T0); let v = e.join();
    assert_eq!((v.coins.0, v.berries.0, v.crystals.0), (40, 6, 0));
    assert_eq!(v.dragons.len(), 1);
    assert_eq!(v.dragons[0].stage, Stage::Egg);
    assert_eq!(e.balance(&lucy(), COINS), START_WALLET);
    assert_eq!(e.mt_balance_of(accounts(1), format!("dragon:{}", v.dragons[0].id)).0, 1, "the egg is a NEP-245 token");
}

#[test]
fn starting_berries_raise_the_first_dragon_and_it_produces_from_block_time() {
    let mut e = setup();
    let t = raise_first(&mut e, 1, T0);
    assert_eq!(bal(&e, 1, BERRIES), 0);
    let d = &e.get_player(accounts(1)).unwrap().dragons[0];
    assert_eq!(d.stage, Stage::Adult);
    // one cycle later (day): Mossleaf's sun-lover trait makes 3 × 1.2 = 3.6 → 4 berries
    ctx(1, t + 12_000); e.collect(d.id);
    assert_eq!(bal(&e, 1, BERRIES), 4);
}

#[test]
#[should_panic(expected = "The harvest is not ready")]
fn nothing_can_be_collected_before_a_cycle_ends() {
    let mut e = setup();
    let t = raise_first(&mut e, 1, T0);
    let id = e.get_player(accounts(1)).unwrap().dragons[0].id;
    ctx(1, t + 5_000); e.collect(id);
}

#[test]
fn a_nest_holds_five_harvests_while_playing_and_fills_slowly_while_away() {
    let mut e = setup();
    let t = raise_first(&mut e, 1, T0);
    let id = e.get_player(accounts(1)).unwrap().dragons[0].id;
    // ticking every 30 s keeps the player "present": the nest stops at five
    let mut now = t;
    for _ in 0..10 { now += 30_000; ctx(1, now); e.forage(); }
    let present = e.dragons.get(&id).unwrap();
    assert_eq!(present.ready, PRODUCTION_CAP);
    let full = present.ready_amount;
    // then away for ten minutes: half speed past the cap
    ctx(1, now + 600_000); e.forage();
    assert!(e.dragons.get(&id).unwrap().ready_amount > full);
}

#[test]
fn every_player_sells_to_the_same_lucy() {
    let mut e = setup();
    ctx(1, T0); e.join(); ctx(2, T0); e.join();
    e.mint(&accounts(1), CRYSTALS, 10); e.mint(&accounts(2), CRYSTALS, 10);
    ctx(1, T0 + 1000); let first = e.get_market().price_crystals.0;
    let paid1 = e.sell(CRYSTALS.into(), U128(10), None).0;
    ctx(2, T0 + 1000); let after = e.get_market().price_crystals.0;
    assert!(after < first, "player 1's sale lowers the price for player 2");
    let paid2 = e.sell(CRYSTALS.into(), U128(10), None).0;
    assert!(paid2 < paid1);
    assert_eq!(e.balance(&lucy(), CRYSTALS), 20, "the goods are on Lucy's shelf");
    assert_eq!(e.balance(&lucy(), COINS), START_WALLET - paid1 - paid2);
}

#[test]
fn a_broke_lucy_closes_until_someone_spends() {
    let mut e = setup();
    ctx(1, T0); e.join();
    e.mint(&accounts(1), CRYSTALS, 200);
    e.sell(CRYSTALS.into(), U128(200), None);
    assert!(e.balance(&lucy(), COINS) < price(CRYSTALS, 999, false));
    let coins = bal(&e, 1, COINS);
    // spending coins on an egg pays Lucy back
    ctx(1, T0 + 100); e.buy_egg("ember".into(), None);
    assert_eq!(bal(&e, 1, COINS), coins - 45);
    assert!(e.balance(&lucy(), COINS) >= 45);
}

#[test]
fn in_the_eclipse_lucy_pays_more_for_crystals_only() {
    let e = setup();
    ctx(1, T0 + 1000); let day = e.get_market();
    ctx(1, T0 + PHASE_MS + 1000); let red = e.get_market();
    assert!(red.eclipse && !day.eclipse);
    assert!(red.price_crystals.0 > day.price_crystals.0);
    assert_eq!(red.price_berries.0, day.price_berries.0);
}

#[test]
fn neighbours_drain_the_shelf_and_refill_the_wallet() {
    let mut e = setup();
    ctx(1, T0); e.join(); e.mint(&accounts(1), BERRIES, 30);
    e.sell(BERRIES.into(), U128(30), None);
    let (stock, wallet) = (e.balance(&lucy(), BERRIES), e.balance(&lucy(), COINS));
    ctx(1, T0 + RESELL_MS); e.forage();
    assert_eq!(e.balance(&lucy(), BERRIES), stock - 3);
    assert_eq!(e.balance(&lucy(), COINS), wallet + 3 * 2);
}

#[test]
fn trips_bring_new_coins_and_the_team_rests_at_home() {
    let mut e = setup();
    let t = raise_first(&mut e, 1, T0);
    let id = e.get_player(accounts(1)).unwrap().dragons[0].id;
    e.mint(&accounts(1), BERRIES, 3);
    ctx(1, t); e.expedition(vec![id]);
    assert_eq!(bal(&e, 1, BERRIES), 0, "3 berries per dragon");
    let coins = bal(&e, 1, COINS);
    ctx(1, t + EXPEDITION_MS); e.claim();
    assert_eq!(bal(&e, 1, COINS), coins + 6);
    assert_eq!(bal(&e, 1, CRYSTALS), 2);
}

#[test]
fn the_heart_needs_three_adult_species_and_its_price() {
    let mut e = setup();
    let t = raise_first(&mut e, 1, T0);
    e.mint(&accounts(1), COINS, 500); e.mint(&accounts(1), BERRIES, 60); e.mint(&accounts(1), CRYSTALS, 20);
    for sp in ["ember", "stone"] { ctx(1, t); e.buy_egg(sp.into(), None); }
    let ids = e.get_player(accounts(1)).unwrap().player.dragons.clone();
    ctx(1, t + HATCH_MS);
    for id in &ids[1..] { e.hatch(*id); for _ in 0..3 { e.feed(*id); } }
    e.restore();
    let v = e.get_player(accounts(1)).unwrap();
    assert!(v.player.restored);
    assert_eq!(v.player.slots, 4);
    assert_eq!(v.crystals.0, 0);
}

#[test]
#[should_panic(expected = "Invite three different species first")]
fn the_first_three_eggs_differ() {
    let mut e = setup();
    ctx(1, T0); e.join(); e.mint(&accounts(1), COINS, 100);
    e.buy_egg("moss".into(), None);
}

#[test]
#[should_panic(expected = "Dragons move only through the game")]
fn dragons_are_not_plain_transfers() {
    let mut e = setup();
    ctx(1, T0); let v = e.join();
    let mut b = VMContextBuilder::new();
    b.current_account_id(lucy()).predecessor_account_id(accounts(1)).attached_deposit(NearToken::from_yoctonear(1)).block_timestamp(T0 * 1_000_000);
    testing_env!(b.build());
    e.mt_transfer(accounts(2), format!("dragon:{}", v.dragons[0].id), U128(1), None, None);
}

#[test]
fn goods_move_between_players() {
    let mut e = setup();
    ctx(1, T0); e.join();
    let mut b = VMContextBuilder::new();
    b.current_account_id(lucy()).predecessor_account_id(accounts(1)).attached_deposit(NearToken::from_yoctonear(1)).block_timestamp(T0 * 1_000_000);
    testing_env!(b.build());
    e.mt_transfer(accounts(2), BERRIES.into(), U128(4), None, None);
    assert_eq!(bal(&e, 2, BERRIES), 4);
    assert_eq!(e.mt_supply(BERRIES.into()).unwrap().0, 6, "a transfer mints nothing");
}

#[test]
fn levels_get_dearer_and_pay_lucy() {
    let mut e = setup();
    let t = raise_first(&mut e, 1, T0);
    let id = e.get_player(accounts(1)).unwrap().dragons[0].id;
    e.mint(&accounts(1), COINS, 200); e.mint(&accounts(1), BERRIES, 50);
    let wallet = e.balance(&lucy(), COINS);
    ctx(1, t); e.upgrade(id); e.upgrade(id);
    assert_eq!(e.dragons.get(&id).unwrap().level, 3);
    assert_eq!(e.balance(&lucy(), COINS), wallet + 20 + 34);
}

#[test]
#[should_panic(expected = "The goal is not done yet")]
fn goals_are_checked_on_chain() {
    let mut e = setup();
    ctx(1, T0); e.join(); e.claim_goal("seller".into());
}
