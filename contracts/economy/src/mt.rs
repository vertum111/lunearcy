//! NEP-245 multi token core: every item of the game in one contract.
//! Token IDs: `coins`, `berries`, `crystals` (fungible) and `dragon:<id>` (supply of one, bound to the valley it lives
//! in for now: dragons carry game state, so they move between players only through the game, not by plain transfer).
//! Goods and coins are freely transferable between players — a player-owned market outside Lucy's shop.
use crate::*;
use near_sdk::{ext_contract, Gas, NearToken, Promise, PromiseOrValue, PromiseResult};

const GAS_FOR_RESOLVE: Gas = Gas::from_tgas(15);
const GAS_FOR_CALL: Gas = Gas::from_tgas(30);

#[derive(Serialize, Deserialize, Clone)]
#[serde(crate = "near_sdk::serde")]
pub struct Token { pub token_id: String, pub owner_id: Option<AccountId> }

#[ext_contract(ext_receiver)]
#[allow(dead_code)]
trait MultiTokenReceiver {
    fn mt_on_transfer(&mut self, sender_id: AccountId, previous_owner_ids: Vec<AccountId>, token_ids: Vec<String>, amounts: Vec<U128>, msg: String) -> PromiseOrValue<Vec<U128>>;
}
#[ext_contract(ext_self)]
#[allow(dead_code)]
trait MultiTokenResolver {
    fn mt_resolve_transfer(&mut self, previous_owner_ids: Vec<AccountId>, receiver_id: AccountId, token_ids: Vec<String>, amounts: Vec<U128>) -> Vec<U128>;
}

fn transferable(token_id: &str) {
    require!([COINS, BERRIES, CRYSTALS].contains(&token_id), "Dragons move only through the game");
}

impl Economy {
    pub(crate) fn balance(&self, who: &AccountId, token: &str) -> u128 { self.balances.get(&(who.clone(), token.to_string())).unwrap_or(0) }
    fn set_balance(&mut self, who: &AccountId, token: &str, amount: u128) {
        let key = (who.clone(), token.to_string());
        if amount == 0 { self.balances.remove(&key); } else { self.balances.insert(&key, &amount); }
    }
    pub(crate) fn mint(&mut self, who: &AccountId, token: &str, amount: u128) {
        if amount == 0 { return; }
        let b = self.balance(who, token).checked_add(amount).expect("Balance overflow");
        self.set_balance(who, token, b);
        let s = self.supply.get(&token.to_string()).unwrap_or(0) + amount;
        self.supply.insert(&token.to_string(), &s);
        mt_event("mt_mint", near_sdk::serde_json::json!({"owner_id":who,"token_ids":[token],"amounts":[amount.to_string()]}));
    }
    pub(crate) fn burn(&mut self, who: &AccountId, token: &str, amount: u128) {
        if amount == 0 { return; }
        let b = self.balance(who, token);
        require!(b >= amount, format!("Not enough {token}"));
        self.set_balance(who, token, b - amount);
        let s = self.supply.get(&token.to_string()).unwrap_or(0).saturating_sub(amount);
        self.supply.insert(&token.to_string(), &s);
        mt_event("mt_burn", near_sdk::serde_json::json!({"owner_id":who,"token_ids":[token],"amounts":[amount.to_string()]}));
    }
    pub(crate) fn move_tokens(&mut self, from: &AccountId, to: &AccountId, token: &str, amount: u128) {
        if amount == 0 { return; }
        let b = self.balance(from, token);
        require!(b >= amount, format!("Not enough {token}"));
        self.set_balance(from, token, b - amount);
        let t = self.balance(to, token) + amount;
        self.set_balance(to, token, t);
        mt_event("mt_transfer", near_sdk::serde_json::json!({"old_owner_id":from,"new_owner_id":to,"token_ids":[token],"amounts":[amount.to_string()]}));
    }
    fn player_transfer(&mut self, receiver_id: &AccountId, token_ids: &[String], amounts: &[U128]) -> AccountId {
        near_sdk::assert_one_yocto();
        require!(token_ids.len() == amounts.len() && !token_ids.is_empty(), "Token and amount lists must match");
        let sender = env::predecessor_account_id();
        require!(receiver_id != &sender, "Sender and receiver must differ");
        require!(receiver_id != &env::current_account_id(), "Sell to Lucy through her shop");
        for (t, a) in token_ids.iter().zip(amounts) {
            transferable(t);
            require!(a.0 > 0, "Amount must be positive");
            self.move_tokens(&sender, receiver_id, t, a.0);
        }
        sender
    }
}

#[near_bindgen]
impl Economy {
    pub fn mt_balance_of(&self, account_id: AccountId, token_id: String) -> U128 { U128(self.balance(&account_id, &token_id)) }
    pub fn mt_batch_balance_of(&self, account_id: AccountId, token_ids: Vec<String>) -> Vec<U128> {
        token_ids.iter().map(|t| U128(self.balance(&account_id, t))).collect()
    }
    pub fn mt_supply(&self, token_id: String) -> Option<U128> { self.supply.get(&token_id).map(U128) }
    pub fn mt_batch_supply(&self, token_ids: Vec<String>) -> Vec<Option<U128>> { token_ids.into_iter().map(|t| self.mt_supply(t)).collect() }
    pub fn mt_token(&self, token_ids: Vec<String>) -> Vec<Option<Token>> {
        token_ids.into_iter().map(|t| {
            if let Some(id) = t.strip_prefix("dragon:").and_then(|n| n.parse::<u64>().ok()) {
                self.dragons.get(&id).map(|d| Token { token_id: t.clone(), owner_id: Some(d.owner) })
            } else if [COINS, BERRIES, CRYSTALS].contains(&t.as_str()) { Some(Token { token_id: t, owner_id: None }) } else { None }
        }).collect()
    }
    pub fn mt_metadata_contract(&self) -> near_sdk::serde_json::Value {
        near_sdk::serde_json::json!({"spec":"mt-1.0.0","name":"Lunearcy valley goods","id":"lunearcy"})
    }

    #[payable]
    pub fn mt_transfer(&mut self, receiver_id: AccountId, token_id: String, amount: U128, approval: Option<(AccountId, u64)>, memo: Option<String>) {
        require!(approval.is_none(), "Approvals are not supported");
        let _ = memo;
        self.player_transfer(&receiver_id, &[token_id], &[amount]);
    }
    #[payable]
    pub fn mt_batch_transfer(&mut self, receiver_id: AccountId, token_ids: Vec<String>, amounts: Vec<U128>, approvals: Option<Vec<Option<(AccountId, u64)>>>, memo: Option<String>) {
        require!(approvals.is_none_or(|a| a.iter().all(|x| x.is_none())), "Approvals are not supported");
        let _ = memo;
        self.player_transfer(&receiver_id, &token_ids, &amounts);
    }
    #[payable]
    pub fn mt_transfer_call(&mut self, receiver_id: AccountId, token_id: String, amount: U128, approval: Option<(AccountId, u64)>, memo: Option<String>, msg: String) -> PromiseOrValue<Vec<U128>> {
        require!(approval.is_none(), "Approvals are not supported");
        self.mt_batch_transfer_call(receiver_id, vec![token_id], vec![amount], None, memo, msg)
    }
    #[payable]
    pub fn mt_batch_transfer_call(&mut self, receiver_id: AccountId, token_ids: Vec<String>, amounts: Vec<U128>, approvals: Option<Vec<Option<(AccountId, u64)>>>, memo: Option<String>, msg: String) -> PromiseOrValue<Vec<U128>> {
        require!(approvals.is_none_or(|a| a.iter().all(|x| x.is_none())), "Approvals are not supported");
        let _ = memo;
        let sender = self.player_transfer(&receiver_id, &token_ids, &amounts);
        let owners = vec![sender.clone(); token_ids.len()];
        ext_receiver::ext(receiver_id.clone()).with_static_gas(GAS_FOR_CALL)
            .mt_on_transfer(sender, owners.clone(), token_ids.clone(), amounts.clone(), msg)
            .then(ext_self::ext(env::current_account_id()).with_static_gas(GAS_FOR_RESOLVE).mt_resolve_transfer(owners, receiver_id, token_ids, amounts))
            .into()
    }
    /// Refunds what the receiver did not use (or everything if its call failed), from what it still holds.
    #[private]
    pub fn mt_resolve_transfer(&mut self, previous_owner_ids: Vec<AccountId>, receiver_id: AccountId, token_ids: Vec<String>, amounts: Vec<U128>) -> Vec<U128> {
        let unused: Vec<u128> = match env::promise_result(0) {
            PromiseResult::Successful(v) => near_sdk::serde_json::from_slice::<Vec<U128>>(&v).ok().filter(|r| r.len() == amounts.len())
                .map(|r| r.iter().zip(&amounts).map(|(u, a)| u.0.min(a.0)).collect()).unwrap_or_else(|| amounts.iter().map(|a| a.0).collect()),
            _ => amounts.iter().map(|a| a.0).collect(),
        };
        let mut used = vec![];
        for (i, t) in token_ids.iter().enumerate() {
            let refund = unused[i].min(self.balance(&receiver_id, t));
            if refund > 0 { self.move_tokens(&receiver_id, &previous_owner_ids[i], t, refund); }
            used.push(U128(amounts[i].0 - refund));
        }
        used
    }
}

#[allow(dead_code)]
fn _unused(_: NearToken, _: Promise) {}
