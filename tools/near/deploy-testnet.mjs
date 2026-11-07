/** Only fresh, project-local testnet keys. Never reads ~/.near-credentials or a browser wallet. */
import {readFile,writeFile,mkdir,chmod} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {Account,JsonRpcProvider,KeyPair,nearToYocto,teraToGas} from 'near-api-js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const local=path.join(root,'.local'),secretFile=path.join(local,'near-testnet.json');
const reportFile=path.join(root,'contracts/market/deployment.testnet.json');
const wasmFile=path.join(root,'contracts/market/target/wasm32-unknown-unknown/release/sanctuary_market.wasm');
const RPC='https://test.rpc.fastnear.com',FAUCET='https://helper.testnet.near.org/account';
const provider=new JsonRpcProvider({url:RPC});
let session,report={network:'testnet',status:'not-deployed',rpc:RPC,customRegistry:true,nep171:false,transactions:[],checks:{}};
const testnetId=id=>{if(typeof id!=='string'||!id.endsWith('.testnet'))throw Error('Testnet account guard rejected destination');return id;};
const cleanError=e=>{let msg=String(e?.message||e).slice(0,2500);for(const key of [session?.market?.privateKey,session?.buyer?.privateKey].filter(Boolean))msg=msg.split(key).join('[REDACTED]');return msg;};
async function publicReport(){await writeFile(reportFile,JSON.stringify({...report,updatedAt:new Date().toISOString()},null,2)+'\n');}
async function saveSession(){await writeFile(secretFile,JSON.stringify(session,null,2)+'\n',{mode:0o600});await chmod(secretFile,0o600);}
async function exists(accountId){try{await provider.viewAccount({accountId});return true;}catch(e){if(/does not exist|UNKNOWN_ACCOUNT|UnknownAccount/i.test(String(e.message)))return false;throw e;}}
const hashOf=r=>r.transaction?.hash||r.transaction_outcome?.id||null;
async function record(label,result){const hash=hashOf(result);report.transactions.push({label,hash,explorer:hash?`https://testnet.nearblocks.io/txns/${hash}`:null});await publicReport();console.log(`${label}: ${hash||'completed'}`);return result;}
async function call(account,methodName,args={},deposit=0n){testnetId(account.accountId);return record(methodName,await account.callFunctionRaw({contractId:testnetId(session.market.accountId),methodName,args,deposit,gas:teraToGas('100'),waitUntil:'FINAL'}));}
async function view(method,args={}){return provider.callFunction({contractId:testnetId(session.market.accountId),method,args});}
async function main(){
 await mkdir(local,{recursive:true,mode:0o700});await chmod(local,0o700);
 try{session=JSON.parse(await readFile(secretFile,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;const marketKey=KeyPair.fromRandom('ed25519'),buyerKey=KeyPair.fromRandom('ed25519'),suffix=Date.now().toString(36);const marketId=`sanctuary-market-${suffix}.testnet`;session={network:'testnet',market:{accountId:marketId,privateKey:marketKey.toString(),publicKey:marketKey.getPublicKey().toString()},buyer:{accountId:`buyer.${marketId}`,privateKey:buyerKey.toString(),publicKey:buyerKey.getPublicKey().toString()},steps:{}};await saveSession();}
 if(session.network!=='testnet')throw Error('Only testnet sessions are accepted');testnetId(session.market.accountId);testnetId(session.buyer.accountId);
 report.contractId=session.market.accountId;report.sellerId=session.market.accountId;report.buyerId=session.buyer.accountId;
 try{const prior=JSON.parse(await readFile(reportFile,'utf8'));if(prior.contractId===report.contractId)report={...prior,status:'checking',checks:prior.checks||{},transactions:prior.transactions||[]};}catch{}
 await publicReport();
 if(!await exists(session.market.accountId)){
  const response=await fetch(FAUCET,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({newAccountId:session.market.accountId,newAccountPublicKey:session.market.publicKey}),signal:AbortSignal.timeout(30_000)});
  const text=await response.text();if(!response.ok)throw Error(`Official testnet faucet rejected request (${response.status}): ${text.slice(0,300)}`);
  if(!await exists(session.market.accountId))throw Error('Faucet returned but testnet account is not confirmed');
 }
 report.status='account-created';await publicReport();console.log(`Fresh testnet account: ${session.market.accountId}`);
 const market=new Account(session.market.accountId,provider,session.market.privateKey),buyer=new Account(session.buyer.accountId,provider,session.buyer.privateKey);
 if(!await exists(session.buyer.accountId))await record('create_buyer',await market.createSubAccount({accountOrPrefix:'buyer',publicKey:session.buyer.publicKey,nearToTransfer:nearToYocto('1')}));
 const wasm=await readFile(wasmFile);report.wasmSha256=createHash('sha256').update(wasm).digest('hex');report.wasmBytes=wasm.length;
 if(!session.steps.deployed){await record('deploy',await market.deployContract(wasm));session.steps.deployed=true;await saveSession();}
 if(!session.steps.initialized){await call(market,'new');session.steps.initialized=true;await saveSession();}
 const config=await view('get_config');report.config=config;
 if(config.standard!=='CUSTOM_REGISTRY_NOT_NEP171'||config.network!=='testnet')throw Error('Unexpected contract configuration');
 for(const account of [market,buyer])if(!await view('get_account',{account_id:account.accountId}))await call(account,'register_account',{},BigInt(config.account_storage));
 let dragons=await view('get_dragons',{from_index:'0',limit:50});
 if(!dragons.length){const snapshot_hash=createHash('sha256').update(JSON.stringify({demo:'sanctuary',species:'moss',instance:session.market.accountId})).digest('hex');await call(market,'register_dragon',{species:'moss',name:'Листочок',snapshot_hash},BigInt(config.dragon_storage));dragons=await view('get_dragons',{from_index:'0',limit:50});}
 let dragon=dragons[0];const price=nearToYocto('0.001');
 if(dragon.owner_id===market.accountId){await call(market,'list_dragon',{id:dragon.id,price:price.toString()},1n);await call(buyer,'buy_dragon',{id:dragon.id,expected_price:price.toString()},price);}
 dragon=await view('get_dragon',{id:dragon.id});report.checks.ownerTransferred=dragon.owner_id===buyer.accountId;report.checks.listingCleared=dragon.price===null;
 let seller=await view('get_account',{account_id:market.accountId});
 if(BigInt(seller.credit)>0n){report.checks.sellerCredited=true;await call(market,'withdraw',{},1n);}
 seller=await view('get_account',{account_id:market.accountId});report.checks.withdrawalSettled=BigInt(seller.credit)===0n&&BigInt(seller.pending_withdrawal)===0n;
 report.finalDragon=dragon;report.finalSeller=seller;report.status=Object.values(report.checks).every(Boolean)?'deployed-and-trade-verified':'deployed-checks-incomplete';await publicReport();
 console.log(JSON.stringify({status:report.status,contractId:report.contractId,checks:report.checks},null,2));
}
main().catch(async e=>{report.status='blocked';report.error=cleanError(e);await publicReport();console.error(report.error);process.exitCode=1;});
