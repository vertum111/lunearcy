// Writes contracts/economy/tests/parity.json: the game's numbers as computed by the browser's rules
// (src/market-rules.js, src/engine.js). The contract's tests/parity.rs checks it computes exactly the same;
// tests/parity.test.js checks this file is up to date with the JavaScript.
import {writeFileSync} from 'node:fs';
import * as R from '../src/market-rules.js';
import * as E from '../src/engine.js';
export function vectors(){
 const prices=[];for(const panic of [false,true])for(const token of ['berries','crystals'])for(let stock=0;stock<=60;stock++)prices.push({token,stock,panic,price:R.price({market:{stock:{[token]:stock},panic}},token)});
 const quotes=[];for(const [token,stock,wallet,have,panic] of [['berries',0,150,22,false],['crystals',0,150,22,true],['crystals',5,40,30,false],['berries',30,9,40,false],['crystals',0,7,3,false]]){const s={resources:{[token]:have},market:{stock:{[token]:stock},wallet,panic}};const q=R.quote(s,token,have);quotes.push({token,stock,wallet,have,panic,units:q.units,total:q.total});}
 const outputs=[];for(const species of Object.keys(E.SPECIES))for(let level=1;level<=5;level++)for(const valley of [1,2,5])for(const trait of [1,1.1,1.2,1.25,1.5])outputs.push({species,level,valley,trait_pm:Math.round(trait*1000),output:E.outputAt(species,level,E.valleyBonus({valleyLevel:valley})*trait)});
 const rewards=[];const teams=[[['moss',1]],[['stone',1]],[['moss',3],['ember',2]],[['stone',5],['crystal',4],['mist',2]]];for(const team of teams)for(const valley of [1,3,7]){const s={valleyLevel:valley,dragons:team.map(([species,level],i)=>({id:i+1,species,level}))};rewards.push({team,valley,...E.expeditionReward(s,s.dragons.map(d=>d.id))});}
 const valley=[];for(let level=1;level<=20;level++)valley.push({level,...E.valleyCost({valleyLevel:level})});
 const levels=[1,2,3,4].map(level=>({level,...E.upgradeCost(null,{level})}));
 return {prices,quotes,outputs,rewards,valley,levels};
}
if(import.meta.url===`file://${process.argv[1]}`){writeFileSync(new URL('../contracts/economy/tests/parity.json',import.meta.url),JSON.stringify(vectors())+'\n');console.log('parity.json written');}
