/** Runs the gas sponsor locally with the keys in .local/ (for development; on Render the same values are env vars). */
import {readFileSync} from 'node:fs';
const root=new URL('../../',import.meta.url);
const sponsor=JSON.parse(readFileSync(new URL('.local/sponsor-testnet.json',root),'utf8'));
const deployment=JSON.parse(readFileSync(new URL('contracts/economy/deployment.testnet.json',root),'utf8'));
Object.assign(process.env,{SPONSOR_ACCOUNT_ID:sponsor.accountId,SPONSOR_PRIVATE_KEY:sponsor.privateKey,CONTRACT_ID:deployment.contractId,TOPUP_NEAR:'0.1',LOW_NEAR:'0.05',PORT:process.env.PORT||'8787'},process.env.SPONSOR_PRIVATE_KEY?{}:{});
await import('../../server/relayer.mjs');
