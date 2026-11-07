/** Creates the disposable testnet account that pays players' gas (.local/sponsor-testnet.json, git-ignored). */
import {readFile,writeFile,chmod} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {JsonRpcProvider,KeyPair} from 'near-api-js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),file=path.join(root,'.local/sponsor-testnet.json');
const provider=new JsonRpcProvider({url:'https://test.rpc.fastnear.com'});
let s;try{s=JSON.parse(await readFile(file,'utf8'));}catch{const k=KeyPair.fromRandom('ed25519');s={accountId:`lunearcy-sponsor-${Date.now().toString(36)}.testnet`,privateKey:k.toString(),publicKey:k.getPublicKey().toString()};await writeFile(file,JSON.stringify(s,null,2)+'\n',{mode:0o600});await chmod(file,0o600);}
try{await provider.viewAccount({accountId:s.accountId});}catch{
 const r=await fetch('https://helper.testnet.near.org/account',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({newAccountId:s.accountId,newAccountPublicKey:s.publicKey})});
 if(!r.ok)throw Error(`Faucet: ${r.status} ${(await r.text()).slice(0,200)}`);}
const a=await provider.viewAccount({accountId:s.accountId});console.log(s.accountId,'balance',Number(BigInt(a.amount)/10n**21n)/1000,'NEAR');
