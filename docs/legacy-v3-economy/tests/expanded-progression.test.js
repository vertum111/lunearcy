import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,act,tick,hydrate,validate,production,dragonName,availableSlots,marketStatus,upgradeCost,expandCost,locationRequirements,objective,achievements,PHASE_MS,HATCH_MS,SPECIES,BERRY_EGG_COST,MAX_SLOTS} from '../src/engine.js';
const T=1_000_000;
function mature(s,id=1,now=s.last+HATCH_MS){act(s,{type:'hatch',id},now);for(let i=0;i<3;i++)act(s,{type:'feed',id},now);return s.dragons.find(d=>d.id===id);}
const balances=s=>({...s.resources});
function fixture(){
 const s=createState(T);s.resources={coins:1000,berries:1000,embers:1000,ore:1000,relics:1000,fruit:0};
 mature(s);for(const species of ['ember','stone']){act(s,{type:'buyEgg',species},s.last);mature(s,s.nextId-1);}
 act(s,{type:'craft'},s.last);s.expeditions=3;act(s,{type:'restore'},s.last);return s;
}

test('individual names are bounded plain text and resetting does not rename the species',()=>{
 const s=createState(T);
 act(s,{type:'rename',id:1,name:'  Листочок   Перший  '},T);
 assert.equal(dragonName(s.dragons[0]),'Листочок Перший');assert.equal(SPECIES.moss.name,'Мохолист');
 for(const name of ['<script>', 'x'.repeat(21),42])assert.throws(()=>act(s,{type:'rename',id:1,name},T));
 act(s,{type:'rename',id:1,name:' '},T);assert.equal(dragonName(s.dragons[0]),'Мохолист');
});

test('coin purchases transfer budget, berry barter does not print coins',()=>{
 const s=createState(T),total=s.resources.coins+s.merchantBudget;
 act(s,{type:'buyFood'},T);assert.equal(s.resources.coins+s.merchantBudget,total);assert.equal(s.coinSpent,20);
 act(s,{type:'buyEgg',species:'ember'},T);assert.equal(s.resources.coins+s.merchantBudget,total);
 s.resources.berries=100;const before=s.merchantBudget;
 act(s,{type:'buyEgg',species:'stone',payment:'berries'},T);
 assert.equal(s.merchantBudget,before);assert.equal(s.resources.coins+s.merchantBudget,total);
});

test('closed orders cannot refresh without budget; purchasing funds exactly affordable new requests',()=>{
 const s=createState(T);Object.assign(s.resources,{berries:100,embers:100,ore:100});
 for(const o of [...s.orders])for(let n=0;n<3;n++)act(s,{type:'sell',id:o.id},T);
 assert.equal(s.merchantBudget,0);assert.equal(marketStatus(s).canRefresh,false);
 assert.throws(()=>act(s,{type:'refreshOrders'},T));
 const total=s.resources.coins+s.merchantBudget;
 act(s,{type:'buyFood'},T);assert.equal(s.merchantBudget,20);
 assert.equal(marketStatus(s).refreshable,1);
 act(s,{type:'refreshOrders'},T);
 assert.equal(s.merchantBudget,20);assert.equal(marketStatus(s).reserved,18);assert.equal(marketStatus(s).available,2);
 const o=s.orders.find(o=>o.left===1);assert.equal(o.resource,'berries');assert.equal(o.limit,1);
 assert.throws(()=>act(s,{type:'refreshOrders'},T));
 act(s,{type:'sell',id:o.id},T);assert.equal(s.merchantBudget,2);
 assert.equal(s.resources.coins+s.merchantBudget,total);
 assert.throws(()=>act(s,{type:'refreshOrders'},T));
});

test('refresh keeps pending requests and reserves their entire liability first',()=>{
 const s=createState(T);s.resources.berries=30;
 for(let i=0;i<3;i++)act(s,{type:'sell',id:1},T);
 const pending=s.orders.slice(1).map(o=>({...o}));
 assert.equal(marketStatus(s).reserved,180);assert.equal(marketStatus(s).available,0);
 act(s,{type:'buyFood'},T);act(s,{type:'refreshOrders'},T);
 assert.deepEqual(s.orders.slice(1),pending);assert.equal(marketStatus(s).reserved,198);
 assert.equal(s.merchantBudget,200);assert.equal(s.orders[0].left,1);
});

test('location unlock requirements and costs are atomic, slots remain distinct up to eight',()=>{
 const s=fixture(),before=balances(s);
 assert.throws(()=>act(s,{type:'travel',location:'quarry'},s.last));
 assert.throws(()=>act(s,{type:'expand'},s.last));assert.deepEqual(s.resources,before);
 act(s,{type:'unlockLocation',location:'quarry'},s.last);
 assert.equal(s.slots,5);assert.equal(s.resources.coins,before.coins-30);assert.equal(s.resources.ore,before.ore-4);
 assert.equal(availableSlots(s,'quarry').length,1);
 act(s,{type:'expand'},s.last);assert.equal(s.slots,6);
 act(s,{type:'unlockLocation',location:'ruins'},s.last);assert.equal(s.slots,7);
 act(s,{type:'expand'},s.last);assert.equal(s.slots,MAX_SLOTS);
 assert.equal(new Set(availableSlots(s).map(slot=>slot.id)).size,8);
 assert.throws(()=>act(s,{type:'expand'},s.last));
 act(s,{type:'travel',location:'ruins'},s.last);assert.equal(s.location,'ruins');
 assert.equal(validate(s),true);
});

test('a locked map or insufficient resources cannot consume an unlock',()=>{
 const s=createState(T),before=balances(s);
 assert.equal(locationRequirements(s,'quarry').met,false);
 assert.throws(()=>act(s,{type:'unlockLocation',location:'quarry'},T));assert.deepEqual(s.resources,before);
 const full=fixture();full.resources.coins=0;const snapshot=balances(full);
 assert.throws(()=>act(full,{type:'unlockLocation',location:'quarry'},full.last));
 assert.equal(full.locations.quarry.unlocked,false);assert.equal(full.slots,4);assert.deepEqual(full.resources,snapshot);
});

test('moving settles old habitat production and applies only future specialist bonuses',()=>{
 const s=fixture();act(s,{type:'unlockLocation',location:'quarry'},s.last);
 const stone=s.dragons.find(d=>d.species==='stone');tick(s,s.last+24_000);
 const oldAmount=production(s,stone).stored,before=s.resources.ore;
 act(s,{type:'moveDragon',id:stone.id,slot:4},s.last);
 assert.equal(s.resources.ore,before+oldAmount);assert.equal(stone.ready,0);assert.equal(stone.readyAmount,0);
 assert.equal(stone.location,'quarry');assert.equal(production(s,stone).output,3);
 tick(s,stone.next);assert.equal(production(s,stone).stored,3);
 const snapshot=balances(s);
 assert.throws(()=>act(s,{type:'moveDragon',id:stone.id,slot:0},s.last));assert.deepEqual(s.resources,snapshot);
});

test('upgrades do not retroactively multiply already stored harvest',()=>{
 const s=createState(T),d=mature(s);tick(s,d.next);
 assert.equal(d.readyAmount,3);act(s,{type:'upgrade',id:d.id},s.last);
 assert.equal(production(s,d).output,6);assert.equal(d.readyAmount,3);
 tick(s,d.next);assert.equal(d.readyAmount,9);const before=s.resources.berries;
 act(s,{type:'collect',id:d.id},s.last);assert.equal(s.resources.berries,before+9);
});

test('location upgrade bonus is species-specific and respects the offline cycle cap',()=>{
 const s=fixture();act(s,{type:'unlockLocation',location:'quarry'},s.last);act(s,{type:'upgradeLocation',location:'quarry'},s.last);
 const stone=s.dragons.find(d=>d.species==='stone');act(s,{type:'moveDragon',id:stone.id,slot:4},s.last);
 assert.equal(production(s,stone).output,4);
 tick(s,s.last+100_000_000);assert.equal(stone.ready,5);assert.equal(stone.readyAmount,20);
 assert.equal(production(s,s.dragons[0]).bonus,0);
});

test('slot-specific egg purchase rejects occupied or locked nests without charging',()=>{
 const s=fixture();const before=balances(s);
 assert.throws(()=>act(s,{type:'buyEgg',species:'moss',slot:0},s.last));
 assert.throws(()=>act(s,{type:'buyEgg',species:'moss',slot:4},s.last));
 assert.deepEqual(s.resources,before);
 act(s,{type:'buyEgg',species:'moss',slot:3,payment:'berries'},s.last);
 assert.equal(s.dragons.at(-1).slot,3);assert.equal(s.dragons.at(-1).location,'grove');assert.equal(validate(s),true);
});

test('v2 saves migrate slots, names, offline stock and legacy earned charms without a reset',()=>{
 const original=fixture();const old=JSON.parse(JSON.stringify(original));old.version=2;old.crafted=8;
 for(const d of old.dragons){delete d.slot;delete d.location;delete d.name;delete d.readyAmount;}
 old.dragons[0].ready=2;const snapshot=JSON.parse(JSON.stringify(old));
 const migrated=hydrate(old,old.last);
 assert.equal(migrated.version,3);assert.equal(migrated.crafted,8);assert.equal(migrated.dragons[0].readyAmount,6);
 assert.deepEqual(migrated.resources,old.resources);assert.deepEqual(old,snapshot);
 assert.deepEqual(migrated.dragons.map(d=>d.slot),[0,1,2]);assert.equal(migrated.restored,true);
 assert.throws(()=>act(migrated,{type:'craft'},migrated.last));
});

test('v3 validation rejects damaged IDs, slots, unsafe names, balances and expedition teams',()=>{
 const s=fixture();
 const corrupt=change=>{const c=JSON.parse(JSON.stringify(s));change(c);assert.throws(()=>hydrate(c,c.last));};
 corrupt(c=>c.dragons[1].slot=c.dragons[0].slot);
 corrupt(c=>c.dragons[1].id=c.dragons[0].id);
 corrupt(c=>c.dragons[0].name='<img>');
 corrupt(c=>c.resources.coins=-1);
 corrupt(c=>c.dragons[0].ready=6);
 corrupt(c=>c.location='missing');
 corrupt(c=>c.locations.ruins={unlocked:true,level:1});
 corrupt(c=>c.chapter2Complete=true);
 corrupt(c=>c.expedition={team:[999],ends:c.last+1000,duration:1000,reward:1,delved:false});
 assert.equal(validate(s),true);
});

test('second chapter has a resource sink and cannot be completed twice',()=>{
 const s=fixture();act(s,{type:'unlockLocation',location:'quarry'},s.last);act(s,{type:'expand'},s.last);act(s,{type:'unlockLocation',location:'ruins'},s.last);
 for(let i=0;i<3;i++){act(s,{type:'buyEgg',species:'moss',payment:'berries'},s.last);mature(s,s.nextId-1);}
 while(s.crafted<3)act(s,{type:'craft'},s.last);
 act(s,{type:'upgrade',id:1},s.last);act(s,{type:'upgrade',id:1},s.last);
 const before=balances(s);act(s,{type:'completeChapter'},s.last);
 assert.equal(s.resources.ore,before.ore-12);assert.equal(s.resources.embers,before.embers-12);assert.equal(s.resources.relics,before.relics-12);
 assert.equal(s.chapter2Complete,true);assert.equal(objective(s).chapter,2);assert.equal(objective(s).step,5);
 const after=balances(s);assert.throws(()=>act(s,{type:'completeChapter'},s.last));assert.deepEqual(s.resources,after);
 assert.ok(achievements(s).find(a=>a.id==='union').earned);
 assert.equal(hydrate(s,s.last).chapter2Complete,true);
});

test('ruins unlock cannot bypass paying for the quarry second nest',()=>{
 const s=fixture();act(s,{type:'unlockLocation',location:'quarry'},s.last);
 const before=balances(s);assert.throws(()=>act(s,{type:'unlockLocation',location:'ruins'},s.last));
 assert.deepEqual(s.resources,before);assert.equal(s.slots,5);
 act(s,{type:'expand'},s.last);act(s,{type:'unlockLocation',location:'ruins'},s.last);assert.equal(s.slots,7);
});

test('two chapters are reachable with earned resources, natural phases and funded orders only',(t)=>{
 const s=createState(T),afford=c=>c&&Object.entries(c).every(([k,n])=>s.resources[k]>=n);
 let first=null,finished=null;
 for(let seconds=0;seconds<=1800;seconds++){
  const now=T+seconds*1000,doAction=a=>act(s,a,now);tick(s,now);
  if(now>=s.forageAt)doAction({type:'forage'});
  for(const d of s.dragons){
   if(d.stage==='egg'&&now>=d.hatchAt)doAction({type:'hatch',id:d.id});
   while(d.stage==='baby'&&s.resources.berries>=2)doAction({type:'feed',id:d.id});
   if(d.stage==='adult'&&d.ready&&!s.expedition?.team.includes(d.id))doAction({type:'collect',id:d.id});
  }
  for(const species of ['ember','stone'])if(!s.dragons.some(d=>d.species===species)){
   if(s.resources.coins>=SPECIES[species].eggCost)doAction({type:'buyEgg',species});
   else if(s.resources.berries>=BERRY_EGG_COST[species]+6)doAction({type:'buyEgg',species,payment:'berries'});
  }
  for(const o of s.orders)if(o.left&&s.resources[o.resource]>=o.quantity+(o.resource==='berries'?18:12))doAction({type:'sell',id:o.id});
  if(marketStatus(s).canRefresh)doAction({type:'refreshOrders'});
  if((!s.crafted||(s.restored&&s.crafted<3))&&afford({embers:2,ore:2}))doAction({type:'craft'});
  if(!s.expedition&&s.crafted&&s.resources.berries>=3&&afford({embers:2,ore:2})&&s.dragons.filter(d=>d.stage==='adult').length>=3&&Math.floor((now-s.start)/PHASE_MS)%2===1){
   doAction({type:'expedition',team:[s.dragons.find(d=>d.species==='ember'&&d.stage==='adult').id]});
  }
  if(s.expedition&&now>=s.expedition.ends){
   if(!s.expedition.delved&&afford({embers:2,ore:2}))doAction({type:'delve'});
   else doAction({type:'claim'});
  }
  if(!s.restored&&s.crafted&&s.expeditions&&afford({embers:4,ore:4,relics:6})){doAction({type:'restore'});first=seconds;}
  if(s.restored&&!s.locations.quarry.unlocked&&afford({coins:30,ore:4,embers:2}))doAction({type:'unlockLocation',location:'quarry'});
  if(s.locations.quarry.unlocked&&s.slots===5&&afford(expandCost(s)))doAction({type:'expand'});
  if(!s.locations.ruins.unlocked&&locationRequirements(s,'ruins').met&&afford({coins:45,relics:6,embers:4}))doAction({type:'unlockLocation',location:'ruins'});
  if(s.restored&&s.dragons.length<s.slots&&s.dragons.length<6){
   const species=['moss','ember','stone'][s.dragons.length%3];
   if(s.resources.berries>=BERRY_EGG_COST[species]+6)doAction({type:'buyEgg',species,payment:'berries'});
  }
  if(s.locations.ruins.unlocked&&s.dragons.filter(d=>d.stage==='adult').length>=6&&s.dragons[0].level<3&&afford(upgradeCost(s,s.dragons[0])))doAction({type:'upgrade',id:1});
  if(!s.chapter2Complete&&Object.values(s.locations).every(l=>l.unlocked)&&s.dragons.filter(d=>d.stage==='adult').length>=6&&s.dragons[0].level>=3&&s.crafted>=3&&s.expeditions>=3&&afford({ore:12,embers:12,relics:12})){
   doAction({type:'completeChapter'});finished=seconds;break;
  }
  assert.equal(validate(s),true);
 }
 t.diagnostic(`First chapter ${first}s; second chapter ${finished}s; ${s.trades} trades, merchant budget ${s.merchantBudget}, state ${JSON.stringify({locations:s.locations,slots:s.slots,adults:s.dragons.filter(d=>d.stage==='adult').length,crafted:s.crafted,expeditions:s.expeditions,level:s.dragons[0].level,resources:s.resources})}`);
 assert.ok(first!==null&&first<600,'first chapter remains under ten minutes');
 assert.ok(finished!==null&&finished<=1800,'extended progression must have a reachable finish');
 assert.equal(s.chapter2Complete,true);assert.equal(validate(s),true);assert.equal(s.phaseOverride,null);
 assert.equal(hydrate(s,s.last).chapter2Complete,true);
});
