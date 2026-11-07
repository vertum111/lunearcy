/** Development-only bridge. Keys are fresh disposable testnet accounts, never a player's wallet. */
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {Account,JsonRpcProvider,nearToYocto,teraToGas} from 'near-api-js';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const CREDENTIALS=path.join(ROOT,'.local/near-testnet.json'),STATE=path.join(ROOT,'.local/near-bridge.json');
const DEPLOYMENT=path.join(ROOT,'contracts/market/deployment.testnet.json');
const RPC='https://test.rpc.fastnear.com',PRICE=nearToYocto('0.001'),REGISTER=nearToYocto('0.02');
const MAX_REGISTRATIONS=6,COOLDOWN=15_000;
const provider=new JsonRpcProvider({url:RPC});
let busy=false,lastMutation=0,statusCache=null,statusAt=0;
const txHash=r=>r.transaction?.hash||r.transaction_outcome?.id||null;
const explorer=hash=>hash?`https://testnet.nearblocks.io/txns/${hash}`:null;
const accountLink=id=>`https://testnet.nearblocks.io/address/${id}`;
function testnet(id){if(typeof id!=='string'||!id.endsWith('.testnet'))throw Error('Testnet-only guard rejected account');return id;}
export function isLoopbackRequest(req){
 const ip=req.socket?.remoteAddress;
 if(!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(ip))return false;
 const host=String(req.headers?.host||'').toLowerCase();
 if(!/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host))return false;
 if(req.headers.origin){try{if(new URL(req.headers.origin).host.toLowerCase()!==host)return false;}catch{return false;}}
 return true;
}
export function registrationInput(data){
 const {species,name,localId}=data||{};
 if(!['moss','ember','stone'].includes(species))throw Error('Невідомий вид дракона.');
 const cleanName=typeof name==='string'?name.trim().replace(/\s+/g,' '):'';
 if(!cleanName||[...cleanName].length>20||!/^[\p{L}\p{M}\p{N} .’\-]+$/u.test(cleanName))throw Error('Ім’я: 1–20 літер, цифр, пробілів або дефісів.');
 if(!['string','number'].includes(typeof localId)||!String(localId).match(/^[a-zA-Z0-9_-]{1,48}$/))throw Error('Непридатний локальний ID.');
 return {species,name:cleanName,localId:String(localId)};
}
const json=(res,code,data)=>{res.statusCode=code;res.setHeader('content-type','application/json; charset=utf-8');res.setHeader('cache-control','no-store');res.setHeader('x-content-type-options','nosniff');res.end(JSON.stringify(data));};
async function body(req){
 if(!String(req.headers['content-type']||'').startsWith('application/json'))throw Error('Потрібен application/json.');
 let text='';for await(const part of req){text+=part.toString();if(Buffer.byteLength(text)>4096)throw Error('Запит завеликий.');}
 try{return JSON.parse(text);}catch{throw Error('Непридатний JSON.');}
}
async function credentials(){const session=JSON.parse(await readFile(CREDENTIALS,'utf8'));if(session.network!=='testnet')throw Error('Only disposable testnet session is supported');testnet(session.market.accountId);testnet(session.buyer.accountId);return session;}
async function state(){try{return JSON.parse(await readFile(STATE,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;return {registrations:{},transactions:[],tradeCount:0};}}
async function save(s){await writeFile(STATE,JSON.stringify(s,null,2)+'\n',{mode:0o600});}
async function view(contractId,method,args={}){return provider.callFunction({contractId:testnet(contractId),method,args});}
function actors(session){return {seller:new Account(session.market.accountId,provider,session.market.privateKey),buyer:new Account(session.buyer.accountId,provider,session.buyer.privateKey)};}
async function change(account,contractId,methodName,args,deposit,log){
 const result=await account.callFunctionRaw({contractId:testnet(contractId),methodName,args,deposit,gas:teraToGas('100'),waitUntil:'FINAL'});
 const hash=txHash(result);if(!hash)throw Error('RPC did not return a verifiable transaction hash');
 const tx={method:methodName,hash,url:explorer(hash)};log.push(tx);return tx;
}
async function status(){
 if(statusCache&&Date.now()-statusAt<10_000)return statusCache;
 let deployment;try{deployment=JSON.parse(await readFile(DEPLOYMENT,'utf8'));}catch{return {available:false,verified:false,network:'testnet',walletConnected:false,reason:'Контракт ще не розгорнутий.'};}
 const verified=deployment.status==='deployed-and-trade-verified';
 let configured=false;try{await credentials();configured=true;}catch{}
 const contractId=testnet(deployment.contractId),config=await view(contractId,'get_config');
 if(config.standard!=='CUSTOM_REGISTRY_NOT_NEP171')throw Error('Unexpected registry contract');
 statusCache={available:verified&&configured,verified,network:'testnet',mode:'throwaway-demo-accounts',walletConnected:false,customRegistry:true,nep171:false,contractId,contractUrl:accountLink(contractId),accounts:{seller:deployment.sellerId,buyer:deployment.buyerId},config,proof:deployment.transactions?.filter(tx=>['register_dragon','buy_dragon','withdraw'].includes(tx.label)).map(tx=>({method:tx.label,hash:tx.hash,url:tx.explorer})),limits:{cooldownSeconds:15,maxRegistrations:MAX_REGISTRATIONS,registrationFee:'0.02',tradePrice:'0.001'},disclosure:'Окремі демонстраційні акаунти. Тестові NEAR не мають грошової вартості. Це власний реєстр, не NEP-171 NFT; локальний прогрес не підтверджується контрактом.'};
 statusAt=Date.now();return statusCache;
}
async function register(input,session,s){
 const data=registrationInput(input),key=`${data.species}:${data.localId}`,contractId=session.market.accountId;
 if(s.registrations[key])return {idempotent:true,dragon:await view(contractId,'get_dragon',{id:s.registrations[key]}),transactions:[]};
 if(Object.keys(s.registrations).length>=MAX_REGISTRATIONS)throw Error('Ліміт цієї тестової сесії: шість нових драконів.');
 const {seller}=actors(session),account=await view(contractId,'get_account',{account_id:seller.accountId});
 if(!account||account.owned>=8)throw Error('Демонстраційний розплідник заповнений. Спочатку виконай тестовий обмін.');
 const snapshot_hash=createHash('sha256').update(JSON.stringify({namespace:'sanctuary-local-demo-v1',contractId,species:data.species,localId:data.localId})).digest('hex');
 // Recovery after a dropped HTTP response: query public chain before scheduling another registration.
 let dragon;
 for(let offset=0;offset<256&&!dragon;offset+=50){const rows=await view(contractId,'get_dragons',{from_index:String(offset),limit:50});dragon=rows.find(d=>d.snapshot_hash===snapshot_hash);if(rows.length<50)break;}
 const transactions=[];
 if(!dragon){await change(seller,contractId,'register_dragon',{species:data.species,name:data.name,snapshot_hash},REGISTER,transactions);const rows=await view(contractId,'get_dragons',{from_index:'0',limit:50});dragon=rows.find(d=>d.snapshot_hash===snapshot_hash);}
 if(!dragon)throw Error('Не вдалося підтвердити зареєстрованого дракона. Перевір статус перед повтором.');
 s.registrations[key]=dragon.id;s.transactions.push(...transactions);await save(s);statusCache=null;
 return {dragon,transactions,ownerUrl:accountLink(dragon.owner_id),selfRegisteredSnapshot:true};
}
async function trade(input,session,s){
 const creatureId=String(input?.creatureId||'');if(!/^[1-9][0-9]{0,8}$/.test(creatureId))throw Error('Непридатний ID реєстру.');
 if(!Object.values(s.registrations).includes(creatureId))throw Error('Обмін доступний лише для дракона, доданого цією локальною демо-сесією.');
 const contractId=session.market.accountId,{seller,buyer}=actors(session);let dragon=await view(contractId,'get_dragon',{id:creatureId});
 if(!dragon)throw Error('Дракона не знайдено у реєстрі.');
 const transactions=[];let idempotent=false;
 if(dragon.owner_id===buyer.accountId)idempotent=true;
 else {
  if(s.tradeCount>=MAX_REGISTRATIONS)throw Error('Ліміт тестових обмінів сесії вичерпано.');
  if(dragon.owner_id!==seller.accountId)throw Error('Цим драконом не володіє демонстраційний продавець.');
  const account=await view(contractId,'get_account',{account_id:buyer.accountId});if(!account||account.owned>=8)throw Error('Демонстраційний покупець уже має вісім драконів.');
  await change(seller,contractId,'list_dragon',{id:creatureId,price:PRICE.toString()},1n,transactions);
  await change(buyer,contractId,'buy_dragon',{id:creatureId,expected_price:PRICE.toString()},PRICE,transactions);
  s.tradeCount++;s.transactions.push(...transactions);await save(s);
 }
 let proceeds=await view(contractId,'get_account',{account_id:seller.accountId});
 if(BigInt(proceeds.credit)>0n&&BigInt(proceeds.pending_withdrawal)===0n)await change(seller,contractId,'withdraw',{},1n,transactions);
 dragon=await view(contractId,'get_dragon',{id:creatureId});proceeds=await view(contractId,'get_account',{account_id:seller.accountId});
 s.transactions.push(...transactions.filter(tx=>!s.transactions.some(old=>old.hash===tx.hash)));await save(s);statusCache=null;
 return {idempotent,dragon,transactions,ownerUrl:accountLink(dragon.owner_id),seller:proceeds,verifiedOwnerTransfer:dragon.owner_id===buyer.accountId,priceYocto:PRICE.toString()};
}

export async function middleware(req,res,next){
 const route=(req.url||'').split('?')[0];if(!route.startsWith('/api/near/'))return next();
 if(!isLoopbackRequest(req))return json(res,403,{error:'Ця демонстрація працює тільки на локальному комп’ютері.'});
 if(req.method==='GET'&&route==='/api/near/status'){try{return json(res,200,await status());}catch(e){return json(res,503,{available:false,verified:false,network:'testnet',error:String(e.message).slice(0,500)});}}
 if(req.method!=='POST'||!['/api/near/register','/api/near/demo-trade'].includes(route))return json(res,404,{error:'Невідома демонстраційна дія.'});
 if(busy)return json(res,409,{error:'Попередня тестова транзакція ще виконується.'});
 if(Date.now()-lastMutation<COOLDOWN)return json(res,429,{error:'Зачекай 15 секунд між тестовими діями.'});
 busy=true;
 let session;
 try{
  const input=await body(req);session=await credentials();const deployment=JSON.parse(await readFile(DEPLOYMENT,'utf8'));
  if(deployment.status!=='deployed-and-trade-verified'||deployment.contractId!==session.market.accountId)throw Error('Контракт не має підтвердженого тестового розгортання.');
  lastMutation=Date.now();const s=await state();
  const result=route.endsWith('/register')?await register(input,session,s):await trade(input,session,s);
  return json(res,200,{network:'testnet',mode:'throwaway-demo-accounts',walletConnected:false,contractId:session.market.accountId,...result});
 }catch(e){let error=String(e.message).slice(0,1000);for(const secret of [session?.market?.privateKey,session?.buyer?.privateKey].filter(Boolean))error=error.split(secret).join('[REDACTED]');return json(res,400,{error,network:'testnet'});}
 finally{busy=false;}
}
