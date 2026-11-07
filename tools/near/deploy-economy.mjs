/** Deploys the Lunearcy economy contract to NEAR testnet with fresh, project-local keys (.local/, git-ignored),
 * then plays a short smoke round with a throwaway player sub-account. Re-running resumes where it stopped.
 * Never reads ~/.near-credentials or a browser wallet. Testnet only. */
import {readFile,writeFile,mkdir,chmod} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {Account,JsonRpcProvider,KeyPair,nearToYocto,teraToGas} from 'near-api-js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const local=path.join(root,'.local'),secretFile=path.join(local,'economy-testnet.json');
const reportFile=path.join(root,'contracts/economy/deployment.testnet.json');
const wasmFile=path.join(root,'contracts/economy/target/wasm32-unknown-unknown/release/lunearcy_economy.wasm');
const RPC='https://test.rpc.fastnear.com',FAUCET='https://helper.testnet.near.org/account';
const provider=new JsonRpcProvider({url:RPC});
const testnetId=id=>{if(typeof id!=='string'||!id.endsWith('.testnet'))throw Error('Testnet account guard rejected '+id);return id;};
let session,report={network:'testnet',status:'not-deployed',rpc:RPC,standard:'nep245',transactions:[],checks:{}};
const hashOf=r=>r.transaction?.hash||r.transaction_outcome?.id||null;
const secrets=()=>[session?.contract?.privateKey,session?.smoke?.privateKey].filter(Boolean);
const clean=e=>{let m=String(e?.message||e).slice(0,2500);for(const k of secrets())m=m.split(k).join('[REDACTED]');return m;};
async function publish(){await writeFile(reportFile,JSON.stringify({...report,updatedAt:new Date().toISOString()},null,2)+'\n');}
async function save(){await writeFile(secretFile,JSON.stringify(session,null,2)+'\n',{mode:0o600});await chmod(secretFile,0o600);}
async function exists(accountId){try{await provider.viewAccount({accountId});return true;}catch(e){if(/does not exist|UNKNOWN_ACCOUNT|UnknownAccount/i.test(String(e.message)))return false;throw e;}}
async function record(label,result){const hash=hashOf(result);report.transactions.push({label,hash,explorer:hash?`https://testnet.nearblocks.io/txns/${hash}`:null});await publish();console.log(`${label}: ${hash||'done'}`);return result;}
const view=(method,args={})=>provider.callFunction({contractId:session.contract.accountId,method,args});
const call=(account,methodName,args={},deposit=0n)=>account.callFunctionRaw({contractId:session.contract.accountId,methodName,args,deposit,gas:teraToGas('100'),waitUntil:'FINAL'}).then(r=>record(methodName,r));
const fresh=()=>{const k=KeyPair.fromRandom('ed25519');return {privateKey:k.toString(),publicKey:k.getPublicKey().toString()};};

async function main(){
 await mkdir(local,{recursive:true,mode:0o700});await chmod(local,0o700);
 try{session=JSON.parse(await readFile(secretFile,'utf8'));}
 catch(e){if(e.code!=='ENOENT')throw e;const suffix=Date.now().toString(36);session={network:'testnet',contract:{accountId:`lunearcy-${suffix}.testnet`,...fresh()},smoke:fresh(),steps:{}};await save();}
 testnetId(session.contract.accountId);report.contractId=session.contract.accountId;
 try{const prior=JSON.parse(await readFile(reportFile,'utf8'));if(prior.contractId===report.contractId)report={...prior,status:'checking',checks:{}};}catch{}
 await publish();
 if(!await exists(session.contract.accountId)){
  const r=await fetch(FAUCET,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({newAccountId:session.contract.accountId,newAccountPublicKey:session.contract.publicKey}),signal:AbortSignal.timeout(30_000)});
  if(!r.ok)throw Error(`Testnet faucet rejected the account (${r.status}): ${(await r.text()).slice(0,300)}`);
  if(!await exists(session.contract.accountId))throw Error('Faucet returned but the account is not on testnet yet');
 }
 console.log('Contract account (Lucy):',session.contract.accountId);
 const lucy=new Account(session.contract.accountId,provider,session.contract.privateKey);
 const wasm=await readFile(wasmFile);report.wasmSha256=createHash('sha256').update(wasm).digest('hex');report.wasmBytes=wasm.length;
 if(session.steps.wasm!==report.wasmSha256){await record('deploy',await lucy.deployContract(wasm));session.steps.wasm=report.wasmSha256;await save();}
 if(!session.steps.initialized){await call(lucy,'new');session.steps.initialized=true;await save();}
 const config=await view('get_config');report.config=config;
 if(config.standard!=='nep245'||config.game!=='lunearcy')throw Error('Unexpected contract configuration');
 // Smoke round: a throwaway player joins, gathers berries and reads its valley back.
 const smokeId=`smoke.${session.contract.accountId}`;
 if(!await exists(smokeId))await record('create_smoke_player',await lucy.createSubAccount({accountOrPrefix:'smoke',publicKey:session.smoke.publicKey,nearToTransfer:nearToYocto('0.5')}));
 const smoke=new Account(smokeId,provider,session.smoke.privateKey);
 if(!await view('get_player',{account_id:smokeId}))await call(smoke,'join');
 const before=await view('get_player',{account_id:smokeId});
 try{await call(smoke,'forage');}catch(e){if(!/ripening/.test(String(e.message)))throw e;}
 const after=await view('get_player',{account_id:smokeId}),market=await view('get_market');
 report.checks.joined=Boolean(before?.dragons?.length);
 report.checks.foraged=BigInt(after.berries)>=BigInt(before.berries);
 report.checks.lucyHasWallet=BigInt(market.wallet)>0n;
 report.checks.nep245Balance=(await view('mt_balance_of',{account_id:smokeId,token_id:'coins'}))===after.coins;
 report.market=market;report.status=Object.values(report.checks).every(Boolean)?'deployed-and-smoke-tested':'deployed-checks-incomplete';
 await publish();console.log(JSON.stringify({status:report.status,contractId:report.contractId,checks:report.checks},null,2));
}
main().catch(async e=>{report.status='blocked';report.error=clean(e);await publish();console.error(report.error);process.exitCode=1;});
