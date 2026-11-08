/** Lunearcy gas sponsor (testnet), shared by the Netlify function (netlify/functions/sponsor.mjs) and the standalone
 * server (server/relayer.mjs). Players never see gas: when a browser creates its player key, the sponsor tops up that
 * player's implicit NEAR account with a little test NEAR, so its game transactions just work.
 *
 * Abuse limits: the caller must prove it holds the key (a signed, fresh challenge); top-ups only when the balance is
 * low; per-IP, per-account and per-day caps (per running instance). Testnet only: the sponsor is a disposable account.
 *
 * Env: SPONSOR_ACCOUNT_ID, SPONSOR_PRIVATE_KEY, CONTRACT_ID, TOPUP_NEAR (0.1), LOW_NEAR (0.05), DAILY_CAP (500),
 *      PER_IP_HOUR (6), NEAR_RPC. */
import {createHash} from 'node:crypto';
import {Account,JsonRpcProvider,PublicKey,nearToYocto} from 'near-api-js';

const hex=bytes=>Buffer.from(bytes).toString('hex');

/** The browser signs SHA-256(`lunearcy-fund:<accountId>:<timestamp>`) with its player key (a guest key or a Privy
 * embedded wallet, which signs 32-byte hashes); the implicit account id is that key's public bytes in hex, so a valid
 * signature proves the caller owns the account it asks to fund. */
export function verifyOwnership({accountId,publicKey,signature,timestamp}){
 if(!/^[0-9a-f]{64}$/.test(accountId||''))throw Error('Expected an implicit account id');
 if(Math.abs(Date.now()-Number(timestamp))>120_000)throw Error('Stale challenge');
 const pk=PublicKey.fromString(publicKey);
 if(hex(pk.data)!==accountId)throw Error('The key does not match the account');
 const digest=createHash('sha256').update(`lunearcy-fund:${accountId}:${timestamp}`).digest();
 if(!pk.verify(new Uint8Array(digest),Buffer.from(signature,'base64')))throw Error('Bad signature');
}

export function createSponsor(env=process.env){
 const SPONSOR=env.SPONSOR_ACCOUNT_ID,KEY=env.SPONSOR_PRIVATE_KEY,CONTRACT=env.CONTRACT_ID;
 for(const [k,v] of Object.entries({SPONSOR_ACCOUNT_ID:SPONSOR,SPONSOR_PRIVATE_KEY:KEY,CONTRACT_ID:CONTRACT}))if(!v)throw Error(`Missing env ${k}`);
 if(!SPONSOR.endsWith('.testnet')||!CONTRACT.endsWith('.testnet'))throw Error('Testnet only');
 const TOPUP=nearToYocto(env.TOPUP_NEAR||'0.1'),LOW=nearToYocto(env.LOW_NEAR||'0.05');
 const DAILY_CAP=Number(env.DAILY_CAP||500),PER_IP_HOUR=Number(env.PER_IP_HOUR||6),ACCOUNT_COOLDOWN=10*60_000;
 const provider=new JsonRpcProvider({url:env.NEAR_RPC||'https://test.rpc.fastnear.com'});
 const sponsor=new Account(SPONSOR,provider,KEY);
 const ipHits=new Map(),accountHits=new Map();let day=new Date().toDateString(),dayCount=0,busy=Promise.resolve();
 async function balance(accountId){try{const a=await provider.viewAccount({accountId});return BigInt(a.amount);}catch(e){if(/does not exist|UNKNOWN_ACCOUNT|UnknownAccount/i.test(String(e.message)))return 0n;throw e;}}
 const transfer=to=>sponsor.transfer({receiverId:to,amount:TOPUP});
 return {
  async health(){return {status:200,body:{ok:true,network:'testnet',contract:CONTRACT,sponsor:SPONSOR,sponsorBalance:(await balance(SPONSOR)).toString(),today:dayCount}};},
  /** Returns {status, body}. */
  async fund(input,ip=''){
   verifyOwnership(input||{});
   const now=Date.now(),hour=(ipHits.get(ip)||[]).filter(t=>now-t<3_600_000);
   if(hour.length>=PER_IP_HOUR)return {status:429,body:{error:'Too many new valleys from this network. Try again later.'}};
   if(now-(accountHits.get(input.accountId)||0)<ACCOUNT_COOLDOWN)return {status:429,body:{error:'This valley was topped up recently.'}};
   if(new Date().toDateString()!==day){day=new Date().toDateString();dayCount=0;}
   if(dayCount>=DAILY_CAP)return {status:503,body:{error:'The sponsor has used today’s budget.'}};
   const current=await balance(input.accountId);
   if(current>=LOW)return {status:200,body:{funded:false,balance:current.toString()}};
   // One transfer at a time per instance, so nonces never collide; one retry covers a clash with another instance.
   const run=()=>transfer(input.accountId).catch(e=>{if(/nonce/i.test(String(e.message)))return transfer(input.accountId);throw e;});
   const result=await(busy=busy.then(run,run));
   hour.push(now);ipHits.set(ip,hour);accountHits.set(input.accountId,now);dayCount++;
   return {status:200,body:{funded:true,amount:TOPUP.toString(),tx:result.transaction?.hash||result.transaction_outcome?.id||null}};
  }
 };
}
