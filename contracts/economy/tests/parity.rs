//! The contract computes exactly the numbers the browser game computes (vectors from tools/parity-vectors.mjs).
use lunearcy_economy::rules::*;
use near_sdk::serde_json::{self, Value};

fn vectors() -> Value { serde_json::from_str(include_str!("parity.json")).unwrap() }
fn n(v: &Value) -> u128 { v.as_u64().unwrap() as u128 }

#[test]
fn prices_and_quotes() {
    let v = vectors();
    for p in v["prices"].as_array().unwrap() {
        assert_eq!(price(p["token"].as_str().unwrap(), n(&p["stock"]), p["panic"].as_bool().unwrap()), n(&p["price"]), "{p}");
    }
    for q in v["quotes"].as_array().unwrap() {
        let got = quote(q["token"].as_str().unwrap(), n(&q["stock"]), n(&q["wallet"]), n(&q["have"]), n(&q["have"]), q["panic"].as_bool().unwrap());
        assert_eq!(got, (n(&q["units"]), n(&q["total"])), "{q}");
    }
}

#[test]
fn production_levels_trips_and_the_valley() {
    let v = vectors();
    for o in v["outputs"].as_array().unwrap() {
        let sp = species(o["species"].as_str().unwrap());
        let bonus = valley_pm(o["valley"].as_u64().unwrap() as u32) * n(&o["trait_pm"]) / 1000;
        assert_eq!(output_at(sp, o["level"].as_u64().unwrap() as u8, bonus), n(&o["output"]), "{o}");
    }
    for r in v["rewards"].as_array().unwrap() {
        let team: Vec<(u8, u8)> = r["team"].as_array().unwrap().iter().map(|m| (species_index(m[0].as_str().unwrap()), m[1].as_u64().unwrap() as u8)).collect();
        assert_eq!(expedition_reward(&team, r["valley"].as_u64().unwrap() as u32), (n(&r["coins"]), n(&r["crystals"])), "{r}");
    }
    for c in v["valley"].as_array().unwrap() {
        assert_eq!(valley_cost(c["level"].as_u64().unwrap() as u32), (n(&c["coins"]), n(&c["crystals"])), "{c}");
    }
    for l in v["levels"].as_array().unwrap() {
        assert_eq!(upgrade_cost(l["level"].as_u64().unwrap() as u8), Some((n(&l["coins"]), n(&l["berries"]))), "{l}");
    }
}
