//! Testnet-only custom dragon ownership registry and fixed-price market.
//! This is deliberately NOT a NEP-171 NFT or a validator of offchain game progress.
use near_sdk::{
    borsh::{BorshDeserialize, BorshSerialize}, collections::{LookupMap, UnorderedMap},
    env, ext_contract, json_types::{U128, U64}, near_bindgen, require,
    serde::{Deserialize, Serialize}, AccountId, BorshStorageKey, Gas, NearToken,
    PanicOnDefault, Promise, PromiseResult,
};

const ACCOUNT_STORAGE: u128 = 10_000_000_000_000_000_000_000; // 0.01 test NEAR; permanent storage reserve
const DRAGON_STORAGE: u128 = 20_000_000_000_000_000_000_000; // 0.02 test NEAR; permanent storage reserve
const MAX_DRAGONS: u64 = 256;
const MAX_ACCOUNTS: u32 = 512;
const MAX_OWNED: u16 = 8;
const MAX_PRICE: u128 = 10_000_000_000_000_000_000_000_000; // 10 test NEAR

#[derive(BorshSerialize, BorshStorageKey)]
#[borsh(crate = "near_sdk::borsh")]
enum Key { Dragons, Accounts, Snapshots }

#[derive(BorshDeserialize, BorshSerialize)]
#[borsh(crate = "near_sdk::borsh")]
struct Pending { id: u64, amount: u128 }
#[derive(BorshDeserialize, BorshSerialize, Default)]
#[borsh(crate = "near_sdk::borsh")]
struct Player { credit: u128, owned: u16, pending: Option<Pending> }

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone)]
#[borsh(crate = "near_sdk::borsh")]
#[serde(crate = "near_sdk::serde")]
pub struct Dragon {
    pub id: U64,
    pub owner_id: AccountId,
    pub species: String,
    pub name: String,
    pub snapshot_hash: String,
    pub price: Option<U128>,
}
#[derive(Serialize, Deserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct PlayerView { pub credit: U128, pub owned: u16, pub pending_withdrawal: U128 }
#[derive(Serialize)]
#[serde(crate = "near_sdk::serde")]
pub struct Config {
    pub standard: &'static str, pub network: &'static str, pub account_storage: U128,
    pub dragon_storage: U128, pub max_dragons: U64, pub max_owned: u16,
    pub registered_dragons: U64, pub registered_accounts: u32,
}

#[ext_contract(ext_self)]
#[allow(dead_code)]
trait Callbacks { fn on_withdraw(&mut self, account_id: AccountId, withdrawal_id: U64) -> bool; }

#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
#[borsh(crate = "near_sdk::borsh")]
pub struct Market {
    dragons: UnorderedMap<u64, Dragon>,
    accounts: LookupMap<AccountId, Player>,
    snapshots: LookupMap<String, u64>,
    next_id: u64,
    account_count: u32,
    withdrawal_nonce: u64,
}

fn exact_deposit(amount: u128) {
    require!(env::attached_deposit().as_yoctonear() == amount, "Attach the exact required deposit");
}
fn one_yocto() { exact_deposit(1); }
fn valid_name(name: &str) {
    require!(!name.is_empty() && name.chars().count() <= 20, "Name must contain 1 to 20 characters");
    require!(name.chars().all(|c| c.is_alphanumeric() || " .’-".contains(c)), "Name contains unsupported characters");
}
fn event(kind: &str, value: near_sdk::serde_json::Value) {
    env::log_str(&format!("EVENT_JSON:{}", near_sdk::serde_json::json!({
        "standard":"sanctuary_registry", "version":"1.0.0", "event":kind, "data":[value]
    })));
}

#[near_bindgen]
impl Market {
    #[init]
    pub fn new() -> Self {
        require!(env::current_account_id().as_str().ends_with(".testnet"), "This demo is testnet only");
        Self { dragons: UnorderedMap::new(Key::Dragons), accounts: LookupMap::new(Key::Accounts),
            snapshots: LookupMap::new(Key::Snapshots), next_id: 1, account_count: 0, withdrawal_nonce: 0 }
    }

    pub fn get_config(&self) -> Config {
        Config { standard:"CUSTOM_REGISTRY_NOT_NEP171", network:"testnet", account_storage:U128(ACCOUNT_STORAGE),
            dragon_storage:U128(DRAGON_STORAGE), max_dragons:U64(MAX_DRAGONS), max_owned:MAX_OWNED,
            registered_dragons:U64(self.dragons.len()), registered_accounts:self.account_count }
    }
    pub fn get_dragon(&self, id: U64) -> Option<Dragon> { self.dragons.get(&id.0) }
    pub fn get_dragons(&self, from_index: Option<U64>, limit: Option<u32>) -> Vec<Dragon> {
        let from = from_index.unwrap_or(U64(0)).0;
        let count = limit.unwrap_or(20).min(50) as u64;
        let values = self.dragons.values_as_vector();
        (from..from.saturating_add(count).min(values.len())).filter_map(|i| values.get(i)).collect()
    }
    pub fn get_account(&self, account_id: AccountId) -> Option<PlayerView> {
        self.accounts.get(&account_id).map(|p| PlayerView { credit:U128(p.credit), owned:p.owned,
            pending_withdrawal:U128(p.pending.map_or(0, |w| w.amount)) })
    }

    /// Storage is permanent, explicitly paid, and globally bounded. Not NEP-145.
    #[payable]
    pub fn register_account(&mut self) {
        exact_deposit(ACCOUNT_STORAGE);
        let caller = env::predecessor_account_id();
        require!(self.accounts.get(&caller).is_none(), "Account already registered");
        require!(self.account_count < MAX_ACCOUNTS, "Demo account capacity reached");
        self.accounts.insert(&caller, &Player::default());
        self.account_count += 1;
        event("account_registered", near_sdk::serde_json::json!({"account_id":caller}));
    }

    /// The hash commits to a caller-supplied local snapshot; it is NOT an attestation of gameplay.
    #[payable]
    pub fn register_dragon(&mut self, species: String, name: String, snapshot_hash: String) -> Dragon {
        exact_deposit(DRAGON_STORAGE);
        require!(["moss","ember","stone"].contains(&species.as_str()), "Unknown species");
        valid_name(&name);
        require!(snapshot_hash.len()==64 && snapshot_hash.bytes().all(|b| b.is_ascii_hexdigit()), "Expected SHA256 hex snapshot hash");
        let hash = snapshot_hash.to_ascii_lowercase();
        require!(self.snapshots.get(&hash).is_none(), "Snapshot already registered");
        require!(self.dragons.len() < MAX_DRAGONS, "Demo dragon capacity reached");
        let caller=env::predecessor_account_id();
        let mut player=self.accounts.get(&caller).expect("Register account first");
        require!(player.owned < MAX_OWNED, "Maximum eight owned dragons");
        let id=self.next_id;
        let dragon=Dragon{id:U64(id), owner_id:caller.clone(),species,name,snapshot_hash:hash.clone(),price:None};
        self.dragons.insert(&id,&dragon);self.snapshots.insert(&hash,&id);
        self.next_id=self.next_id.checked_add(1).expect("ID overflow");
        player.owned+=1;self.accounts.insert(&caller,&player);
        event("dragon_registered",near_sdk::serde_json::json!({"id":dragon.id,"owner_id":caller,"snapshot_hash":hash,"origin":"self_registered_demo"}));
        dragon
    }

    #[payable]
    pub fn list_dragon(&mut self, id: U64, price: U128) {
        one_yocto();
        require!(price.0 > 0 && price.0 <= MAX_PRICE, "Price must be positive and at most 10 test NEAR");
        let mut dragon=self.dragons.get(&id.0).expect("Unknown dragon");
        require!(dragon.owner_id==env::predecessor_account_id(), "Only owner can list");
        dragon.price=Some(price);self.dragons.insert(&id.0,&dragon);
        event("listed",near_sdk::serde_json::json!({"id":id,"seller":dragon.owner_id,"price":price}));
    }
    #[payable]
    pub fn cancel_listing(&mut self, id: U64) {
        one_yocto();let mut dragon=self.dragons.get(&id.0).expect("Unknown dragon");
        require!(dragon.owner_id==env::predecessor_account_id(), "Only owner can cancel");
        require!(dragon.price.is_some(), "Not listed");dragon.price=None;self.dragons.insert(&id.0,&dragon);
        event("cancelled",near_sdk::serde_json::json!({"id":id,"owner_id":dragon.owner_id}));
    }

    /// Atomic internal transfer and seller credit. No external receipt is made during buy.
    #[payable]
    pub fn buy_dragon(&mut self, id: U64, expected_price: U128) -> Dragon {
        let mut dragon=self.dragons.get(&id.0).expect("Unknown dragon");
        let price=dragon.price.expect("Not listed");
        require!(price==expected_price, "Listing price changed");exact_deposit(price.0);
        let buyer_id=env::predecessor_account_id();let seller_id=dragon.owner_id.clone();
        require!(buyer_id!=seller_id, "Cannot buy own dragon");
        let mut buyer=self.accounts.get(&buyer_id).expect("Register buyer account first");
        require!(buyer.owned < MAX_OWNED, "Buyer already owns eight dragons");
        let mut seller=self.accounts.get(&seller_id).expect("Seller must be registered");
        let credit=seller.credit.checked_add(price.0).expect("Credit overflow");
        buyer.owned+=1;seller.owned=seller.owned.checked_sub(1).expect("Ownership invariant");seller.credit=credit;
        dragon.owner_id=buyer_id.clone();dragon.price=None;
        self.accounts.insert(&seller_id,&seller);self.accounts.insert(&buyer_id,&buyer);self.dragons.insert(&id.0,&dragon);
        event("sold",near_sdk::serde_json::json!({"id":id,"seller":seller_id,"buyer":buyer_id,"price":price}));
        dragon
    }

    /// Effects before interaction; one outstanding withdrawal per registered account.
    #[payable]
    pub fn withdraw(&mut self) -> Promise {
        one_yocto();require!(env::prepaid_gas()>=Gas::from_tgas(30), "Attach at least 30 Tgas");
        let caller=env::predecessor_account_id();let mut player=self.accounts.get(&caller).expect("Register account first");
        require!(player.pending.is_none(), "Withdrawal already pending");require!(player.credit>0, "Nothing to withdraw");
        let amount=player.credit;self.withdrawal_nonce=self.withdrawal_nonce.checked_add(1).expect("Nonce overflow");
        let id=self.withdrawal_nonce;player.credit=0;player.pending=Some(Pending{id,amount});self.accounts.insert(&caller,&player);
        Promise::new(caller.clone()).transfer(NearToken::from_yoctonear(amount)).then(
            ext_self::ext(env::current_account_id()).with_static_gas(Gas::from_tgas(10)).on_withdraw(caller,U64(id)))
    }

    #[private]
    pub fn on_withdraw(&mut self, account_id: AccountId, withdrawal_id: U64) -> bool {
        // Explicit check also protects direct native tests; #[private] guards the exported wrapper.
        require!(env::predecessor_account_id()==env::current_account_id(), "Private callback");
        require!(env::promise_results_count()==1, "Expected one transfer result");
        let mut player=self.accounts.get(&account_id).expect("Unknown account");
        let pending=player.pending.as_ref().expect("No pending withdrawal");
        require!(pending.id==withdrawal_id.0, "Stale withdrawal callback");let amount=pending.amount;
        let success=matches!(env::promise_result(0),PromiseResult::Successful(_));
        if !success {player.credit=player.credit.checked_add(amount).expect("Credit overflow");}
        player.pending=None;self.accounts.insert(&account_id,&player);
        event(if success {"withdrawn"}else{"withdrawal_restored"},near_sdk::serde_json::json!({"account_id":account_id,"amount":U128(amount),"withdrawal_id":withdrawal_id}));
        success
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[allow(deprecated)]
    use near_sdk::{test_utils::{VMContextBuilder,testing_env_with_promise_results},testing_env};
    fn id(s:&str)->AccountId{s.parse().unwrap()}
    fn context(who:&str,deposit:u128)->near_sdk::VMContext {
        let mut b=VMContextBuilder::new();b.current_account_id(id("market.testnet")).predecessor_account_id(id(who)).signer_account_id(id(who)).attached_deposit(NearToken::from_yoctonear(deposit)).account_balance(NearToken::from_near(100)).prepaid_gas(Gas::from_tgas(100));b.build()
    }
    fn setup()->Market {testing_env!(context("alice.testnet",0));let mut m=Market::new();for who in ["alice.testnet","bob.testnet"]{testing_env!(context(who,ACCOUNT_STORAGE));m.register_account();}m}
    fn dragon(m:&mut Market)->Dragon {testing_env!(context("alice.testnet",DRAGON_STORAGE));m.register_dragon("moss".into(),"Листочок".into(),"a".repeat(64))}
    fn sale(m:&mut Market)->Dragon {let d=dragon(m);testing_env!(context("alice.testnet",1));m.list_dragon(d.id,U128(1000));testing_env!(context("bob.testnet",1000));m.buy_dragon(d.id,U128(1000))}

    #[test] fn registration_and_atomic_trade(){let mut m=setup();let d=sale(&mut m);assert_eq!(d.owner_id,id("bob.testnet"));assert!(d.price.is_none());assert_eq!(m.get_account(id("alice.testnet")).unwrap().credit.0,1000);assert_eq!(m.get_account(id("alice.testnet")).unwrap().owned,0);assert_eq!(m.get_account(id("bob.testnet")).unwrap().owned,1);assert_eq!(m.get_dragons(Some(U64(0)),Some(500)).len(),1);}
    #[test] #[should_panic(expected="Only owner can list")] fn stranger_cannot_list(){let mut m=setup();let d=dragon(&mut m);testing_env!(context("bob.testnet",1));m.list_dragon(d.id,U128(1000));}
    #[test] #[should_panic(expected="Listing price changed")] fn buyer_price_guard(){let mut m=setup();let d=dragon(&mut m);testing_env!(context("alice.testnet",1));m.list_dragon(d.id,U128(1000));testing_env!(context("bob.testnet",900));m.buy_dragon(d.id,U128(900));}
    #[test] #[should_panic(expected="Attach the exact")] fn buyer_cannot_underpay(){let mut m=setup();let d=dragon(&mut m);testing_env!(context("alice.testnet",1));m.list_dragon(d.id,U128(1000));testing_env!(context("bob.testnet",999));m.buy_dragon(d.id,U128(1000));}
    #[test] fn owner_can_cancel(){let mut m=setup();let d=dragon(&mut m);testing_env!(context("alice.testnet",1));m.list_dragon(d.id,U128(1000));m.cancel_listing(d.id);assert!(m.get_dragon(d.id).unwrap().price.is_none());}
    #[test] #[should_panic(expected="Snapshot already registered")] fn snapshot_cannot_be_registered_twice(){let mut m=setup();dragon(&mut m);dragon(&mut m);}
    #[test] #[should_panic(expected="Attach the exact")] fn storage_is_not_free(){let mut m=setup();testing_env!(context("alice.testnet",0));m.register_dragon("moss".into(),"Leaf".into(),"a".repeat(64));}
    #[test] #[should_panic(expected="testnet only")] fn mainnet_account_is_rejected(){let mut c=context("alice.testnet",0);c.current_account_id=id("market.near");testing_env!(c);Market::new();}
    #[test] fn withdrawal_zeros_credit_before_receipt(){let mut m=setup();sale(&mut m);testing_env!(context("alice.testnet",1));m.withdraw();let p=m.get_account(id("alice.testnet")).unwrap();assert_eq!(p.credit.0,0);assert_eq!(p.pending_withdrawal.0,1000);}
    #[test] #[should_panic(expected="Withdrawal already pending")] fn cannot_withdraw_twice(){let mut m=setup();sale(&mut m);testing_env!(context("alice.testnet",1));m.withdraw();m.withdraw();}
    #[test] #[allow(deprecated)] fn failed_transfer_restores_credit(){let mut m=setup();sale(&mut m);testing_env!(context("alice.testnet",1));m.withdraw();testing_env_with_promise_results(context("market.testnet",0),PromiseResult::Failed);assert!(!m.on_withdraw(id("alice.testnet"),U64(1)));let p=m.get_account(id("alice.testnet")).unwrap();assert_eq!(p.credit.0,1000);assert_eq!(p.pending_withdrawal.0,0);}
    #[test] #[allow(deprecated)] fn successful_transfer_settles_credit(){let mut m=setup();sale(&mut m);testing_env!(context("alice.testnet",1));m.withdraw();testing_env_with_promise_results(context("market.testnet",0),PromiseResult::Successful(vec![]));assert!(m.on_withdraw(id("alice.testnet"),U64(1)));let p=m.get_account(id("alice.testnet")).unwrap();assert_eq!(p.credit.0,0);assert_eq!(p.pending_withdrawal.0,0);}
    #[test] #[should_panic(expected="Private callback")] #[allow(deprecated)] fn callback_not_callable_by_seller(){let mut m=setup();sale(&mut m);testing_env!(context("alice.testnet",1));m.withdraw();testing_env_with_promise_results(context("alice.testnet",0),PromiseResult::Failed);m.on_withdraw(id("alice.testnet"),U64(1));}
    #[test] #[should_panic(expected="No pending withdrawal")] #[allow(deprecated)]
    fn callback_success_cannot_be_replayed() {
        let mut m=setup();sale(&mut m);testing_env!(context("alice.testnet",1));m.withdraw();
        testing_env_with_promise_results(context("market.testnet",0),PromiseResult::Successful(vec![]));
        assert!(m.on_withdraw(id("alice.testnet"),U64(1)));
        m.on_withdraw(id("alice.testnet"),U64(1));
    }
    #[test] #[allow(deprecated)]
    fn failed_withdrawal_preserves_new_sale_credit() {
        let mut m=setup();sale(&mut m);testing_env!(context("alice.testnet",1));m.withdraw();
        testing_env!(context("alice.testnet",DRAGON_STORAGE));
        let d=m.register_dragon("ember".into(),"Ember".into(),"b".repeat(64));
        testing_env!(context("alice.testnet",1));m.list_dragon(d.id,U128(2000));
        testing_env!(context("bob.testnet",2000));m.buy_dragon(d.id,U128(2000));
        assert_eq!(m.get_account(id("alice.testnet")).unwrap().credit.0,2000);
        testing_env_with_promise_results(context("market.testnet",0),PromiseResult::Failed);
        assert!(!m.on_withdraw(id("alice.testnet"),U64(1)));
        assert_eq!(m.get_account(id("alice.testnet")).unwrap().credit.0,3000);
    }
    #[test]
    fn worst_case_storage_is_covered_by_permanent_deposits() {
        let caller=format!("{}.testnet","a".repeat(56));
        testing_env!(context(&caller,0));let mut m=Market::new();
        testing_env!(context(&caller,ACCOUNT_STORAGE));let before=env::storage_usage();m.register_account();
        let account_bytes=env::storage_usage()-before;
        assert!((account_bytes as u128)*env::storage_byte_cost().as_yoctonear()<=ACCOUNT_STORAGE);
        testing_env!(context(&caller,DRAGON_STORAGE));let before=env::storage_usage();
        let d=m.register_dragon("ember".into(),"龍".repeat(20),"c".repeat(64));
        let dragon_bytes=env::storage_usage()-before;
        assert!((dragon_bytes as u128+100)*env::storage_byte_cost().as_yoctonear()<=DRAGON_STORAGE);
        testing_env!(context(&caller,1));m.list_dragon(d.id,U128(MAX_PRICE));
        assert!((env::storage_usage()-before+100) as u128*env::storage_byte_cost().as_yoctonear()<=DRAGON_STORAGE);
    }
    #[test] #[should_panic(expected="Maximum eight owned dragons")]
    fn registration_stops_at_eight_owned_dragons() {
        let mut m=setup();
        for i in 0..9 {testing_env!(context("alice.testnet",DRAGON_STORAGE));m.register_dragon("moss".into(),"Leaf".into(),format!("{:064x}",i));}
    }

}
