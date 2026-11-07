/** Lunearcy gas sponsor (testnet). Players never see gas: when a browser creates its player key, this service tops up
 * that player's implicit NEAR account with a little test NEAR, so its game transactions just work.
 *
 * Abuse limits: the caller must prove it holds the key (signed, fresh challenge); top-ups only when the balance is low;
 * per-IP, per-account and per-day caps. Testnet only — the sponsor key is a disposable testnet account.
 *
 * Env: SPONSOR_ACCOUNT_ID, SPONSOR_PRIVATE_KEY, CONTRACT_ID, ALLOWED_ORIGINS (comma list), PORT,
 *      TOPUP_NEAR (default 0.1), LOW_NEAR (default 0.05), DAILY_CAP (default 500), PRIVY_APP_ID (optional). */
import http from 'node:http';
import {Account,JsonRpcProvider,KeyPair,PublicKey,nearToYocto} from 'near-api-js';

const env=process.env;
const RPC=env.NEAR_RPC||'https://test.rpc.fastnear.com';
const SPONSOR=env.SPONSOR_ACCOUNT_ID,KEY=env.SPONSOR_PRIVATE_KEY,CONTRACT=env.CONTRACT_ID;
const ORIGINS=(env.ALLOWED_ORIGINS||'http://127.0.0.1:5180,http://localhost:5180').split(',').map(s=>s.trim()).filter(Boolean);
const TOPUP=nearToYocto(env.TOPUP_NEAR||'0.1'),LOW=nearToYocto(env.LOW_NEAR||'0.05');
const DAILY_CAP=Number(env.DAILY_CAP||500),PER_IP_HOUR=Number(env.PER_IP_HOUR||6),ACCOUNT_COOLDOWN=10*60_000;
for(const [k,v] of Object.entries({SPONSOR_ACCOUNT_ID:SPONSOR,SPONSOR_PRIVATE_KEY:KEY,CONTRACT_ID:CONTRACT}))if(!v)throw Error(`Missing env ${k}`);
if(!SPONSOR.endsWith('.testnet')||!CONTRACT.endsWith('.testnet'))throw Error('Testnet only');

const provider=new JsonRpcProvider({url:RPC});
const sponsor=new Account(SPONSOR,provider,KEY);
const ipHits=new Map(),accountHits=new Map();let day=new Date().toDateString(),dayCount=0;let busy=Promise.resolve();

const json=(res,code,data,origin)=>{res.writeHead(code,{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...cors(origin)});res.end(JSON.stringify(data));};
const cors=origin=>ORIGINS.includes(origin)?{'access-control-allow-origin':origin,'access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'content-type','vary':'origin'}:{};
async function body(req){let t='';for await(const c of req){t+=c;if(t.length>4096)throw Error('Request too large');}return JSON.parse(t||'{}');}
const hex=bytes=>Buffer.from(bytes).toString('hex');

/** The browser signs `lunearcy-fund:<accountId>:<timestamp>` with its player key; the implicit account id is that
 * key's public bytes in hex, so a valid signature proves the caller owns the account it asks to fund. */
function verifyOwnership({accountId,publicKey,signature,timestamp}){
 if(!/^[0-9a-f]{64}$/.test(accountId||''))throw Error('Expected an implicit account id');
 if(Math.abs(Date.now()-Number(timestamp))>120_000)throw Error('Stale challenge');
 const pk=PublicKey.fromString(publicKey);
 if(hex(pk.data)!==accountId)throw Error('The key does not match the account');
 const ok=pk.verify(new TextEncoder().encode(`lunearcy-fund:${accountId}:${timestamp}`),Buffer.from(signature,'base64'));
 if(!ok)throw Error('Bad signature');
}
async function balance(accountId){try{const a=await provider.viewAccount({accountId});return BigInt(a.amount);}catch(e){if(/does not exist|UNKNOWN_ACCOUNT|UnknownAccount/i.test(String(e.message)))return 0n;throw e;}}

async function fund(req,res,origin){
 const ip=String(req.headers['x-forwarded-for']||req.socket.remoteAddress||'').split(',')[0].trim();
 const input=await body(req);verifyOwnership(input);
 const now=Date.now(),hour=(ipHits.get(ip)||[]).filter(t=>now-t<3_600_000);
 if(hour.length>=PER_IP_HOUR)return json(res,429,{error:'Too many new valleys from this network. Try again later.'},origin);
 if(now-(accountHits.get(input.accountId)||0)<ACCOUNT_COOLDOWN)return json(res,429,{error:'This valley was topped up recently.'},origin);
 if(new Date().toDateString()!==day){day=new Date().toDateString();dayCount=0;}
 if(dayCount>=DAILY_CAP)return json(res,503,{error:'The sponsor has used today’s budget.'},origin);
 const current=await balance(input.accountId);
 if(current>=LOW)return json(res,200,{funded:false,balance:current.toString()},origin);
 // One transfer at a time, so nonces never collide.
 const result=await(busy=busy.then(()=>sponsor.transfer({receiverId:input.accountId,amount:TOPUP}),()=>sponsor.transfer({receiverId:input.accountId,amount:TOPUP})));
 hour.push(now);ipHits.set(ip,hour);accountHits.set(input.accountId,now);dayCount++;
 json(res,200,{funded:true,amount:TOPUP.toString(),tx:result.transaction?.hash||result.transaction_outcome?.id||null},origin);
}

http.createServer(async(req,res)=>{
 const origin=req.headers.origin||'';
 try{
  if(req.method==='OPTIONS')return json(res,204,{},origin);
  const route=(req.url||'').split('?')[0];
  if(req.method==='GET'&&route==='/health')return json(res,200,{ok:true,network:'testnet',contract:CONTRACT,sponsor:SPONSOR,sponsorBalance:(await balance(SPONSOR)).toString(),today:dayCount},origin);
  if(req.method==='POST'&&route==='/fund'){if(origin&&!ORIGINS.includes(origin))return json(res,403,{error:'Origin not allowed'},origin);return await fund(req,res,origin);}
  json(res,404,{error:'Not found'},origin);
 }catch(e){json(res,400,{error:String(e.message).slice(0,300)},origin);}
}).listen(Number(env.PORT||8787),()=>console.log(`Lunearcy sponsor on :${env.PORT||8787} for ${CONTRACT}`));

export {verifyOwnership};
void KeyPair;
