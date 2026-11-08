// The valley on NEAR testnet, without the player ever seeing a wallet.
//
// The browser keeps a player key (one per save slot) whose implicit NEAR account plays the game; a small sponsor
// service tops that account up with test NEAR, so there are no gas prompts. Every action runs at once in the local
// engine (same rules, see contracts/economy/src/rules.rs) and is sent as a transaction in the background; the
// contract's answer then replaces the local guess. If the chain is unreachable the game keeps working locally.
import {SLOTS} from './engine.js';
import deployment from '../contracts/economy/deployment.testnet.json';

// A Node `util` polyfill pulled in by the wallet libraries reads `process.env`; browsers have no `process`.
globalThis.process??={env:{}};

export const CONTRACT=import.meta.env.VITE_CONTRACT_ID||deployment.contractId;
const RPC=import.meta.env.VITE_NEAR_RPC||'https://test.rpc.fastnear.com';
const SPONSOR=import.meta.env.VITE_SPONSOR_URL||(import.meta.env.DEV?'http://127.0.0.1:8787':'/api');
export const explorer=id=>`https://testnet.nearblocks.io/address/${id}`;

const METHOD={hatch:'hatch',hurry:'hurry',feed:'feed',collect:'collect',buyEgg:'buy_egg',upgrade:'upgrade',rename:'rename',moveDragon:'move_dragon',
 sell:'sell',forage:'forage',restore:'restore',unlockLocation:'unlock_location',expedition:'expedition',claim:'claim',growValley:'grow_valley',claimGoal:'claim_goal'};
/** The contract arguments for one engine action (travel and demo actions stay local). */
export function toCall(a){
 const m=METHOD[a.type];if(!m)return null;
 const args={hatch:{id:a.id},hurry:{id:a.id},feed:{id:a.id},collect:{id:a.id},upgrade:{id:a.id},buyEgg:{species_id:a.species,slot:a.slot??null},
  rename:{id:a.id,name:a.name??''},moveDragon:{id:a.id,slot:a.slot},sell:{token_id:a.resource,qty:String(a.qty??1000000000)},
  unlockLocation:{location:a.location},expedition:{team:a.team},claimGoal:{goal:a.goal}}[a.type]||{};
 return {method:m,args};
}

/** The contract's view of a player and Lucy's market, as the engine's save format. */
export function toState(view,market,prev){
 const p=view.player,stage={Egg:'egg',Baby:'baby',Adult:'adult'};
 const dragons=view.dragons.map(d=>({id:d.id,species:d.species,slot:d.slot,location:SLOTS[d.slot].location,name:d.name,stage:stage[d.stage],
  hatchAt:d.hatch_at,feeds:d.feeds,level:d.level,ready:d.ready,readyAmount:d.ready_amount,next:d.next}));
 return {version:4,start:Number(market.genesis),last:p.last,forageAt:p.forage_at,restored:p.restored,trades:p.trades,sold:p.sold,collected:p.collected,
  location:prev?.location&&(prev.location==='grove'||(prev.location==='quarry'&&p.quarry)||(prev.location==='ruins'&&p.ruins))?prev.location:'grove',
  locations:{grove:{unlocked:true},quarry:{unlocked:p.quarry},ruins:{unlocked:p.ruins}},
  resources:{coins:Number(view.coins),berries:Number(view.berries),crystals:Number(view.crystals)},
  dragons,nextId:Math.max(0,...dragons.map(d=>d.id))+1,slots:p.slots,valleyLevel:p.valley_level,phaseOverride:null,
  market:{wallet:Number(market.wallet),stock:{berries:Number(market.stock_berries),crystals:Number(market.stock_crystals)},resellAt:Number(market.resell_at),
   history:{berries:market.history_berries.slice(-24),crystals:market.history_crystals.slice(-24)},panic:market.eclipse},
  expedition:p.expedition?{team:p.expedition.team,duration:30000,ends:p.expedition.ends,reward:{coins:p.expedition.coins,crystals:p.expedition.crystals}}:null,
  expeditions:p.expeditions,hurried:p.hurried,goalsClaimed:p.goals_claimed,journal:prev?.journal||[]};
}

const hex=bytes=>[...bytes].map(b=>b.toString(16).padStart(2,'0')).join('');
const b64=bytes=>btoa(String.fromCharCode(...bytes));
const wait=ms=>new Promise(r=>setTimeout(r,ms));

const sha256=async bytes=>new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));

/** One player's link to the chain. `onState(state)` receives fresh chain state; `onStatus({kind})` the link status.
 *  `identity` is an optional signed-in player ({accountId, signer} from Privy); without it the browser keeps a guest
 *  key under `storageKey`. */
export function connect({storageKey,identity,onState,onStatus,onError}){
 let near,account,provider,queue=Promise.resolve(),pending=0,closed=false;
 const status=(kind,extra={})=>onStatus?.({kind,pending,accountId:account?.accountId,...extra});
 async function view(method,args={}){return provider.callFunction({contractId:CONTRACT,method,args});}
 function guestKey(){
  let secret=null;try{secret=localStorage.getItem(storageKey);}catch{}
  if(!secret){secret=near.KeyPair.fromRandom('ed25519').toString();try{localStorage.setItem(storageKey,secret);}catch{}}
  const kp=near.KeyPair.fromString(secret);
  return {accountId:hex(kp.getPublicKey().data),signer:new near.KeyPairSigner(kp)};
 }
 async function exists(id){try{await provider.viewAccount({accountId:id});return true;}catch{return false;}}
 /** The sponsor tops up an account once its owner signs SHA-256(`lunearcy-fund:<account>:<time>`). */
 async function fund(signer,id){
  const timestamp=Date.now(),digest=await sha256(new TextEncoder().encode(`lunearcy-fund:${id}:${timestamp}`));
  const signature=await signer.signBytes(digest),publicKey=(await signer.getPublicKey()).toString();
  const r=await fetch(`${SPONSOR}/fund`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({accountId:id,publicKey,signature:b64(signature),timestamp})});
  if(!r.ok&&r.status!==429)throw Error((await r.json().catch(()=>({}))).error||`Sponsor ${r.status}`);
 }
 async function pull(prev){
  const [v,m]=await Promise.all([view('get_player',{account_id:account.accountId}),view('get_market')]);
  if(v&&!closed)onState?.(toState(v,m,prev()));
  return v;
 }
 const api={
  get accountId(){return account?.accountId;},
  async start(prev){
   status('connecting');
   near=await import('near-api-js');provider=new near.JsonRpcProvider({url:RPC});
   const who=identity||guestKey(),id=who.accountId;
   // Sign-in accounts are topped up whenever they run low; guests only on their first visit.
   if(!await exists(id)||identity){try{await fund(who.signer,id);}catch(e){if(!await exists(id))throw e;}for(let i=0;i<20&&!await exists(id);i++)await wait(1000);}
   account=new near.Account(id,provider,who.signer);
   let v=await view('get_player',{account_id:id});
   if(!v){status('joining');await account.callFunction({contractId:CONTRACT,methodName:'join',args:{},gas:30_000_000_000_000n});}
   // An RPC node can lag a block behind the one that ran `join`: ask again until the new valley shows up.
   for(let i=0;i<15&&!await pull(prev);i++)await wait(700);
   status('synced');
   return api;
  },
  /** Sends one engine action; the chain's answer replaces the local guess. */
  submit(a,prev){
   const call=toCall(a);if(!call||!account)return;
   pending++;status('saving');
   queue=queue.then(async()=>{
    try{await account.callFunction({contractId:CONTRACT,methodName:call.method,args:call.args,gas:30_000_000_000_000n});}
    catch(e){onError?.(e);}
    pending--;
    if(!pending){try{await pull(prev);status('synced');}catch(e){status('offline');onError?.(e);}}
   });
   return queue;
  },
  async refresh(prev){if(!account||pending)return;try{await pull(prev);status('synced');}catch{status('offline');}},
  close(){closed=true;}
 };
 return api;
}
