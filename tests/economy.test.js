import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
const T=1_000_000;
const grow=(s,id,now)=>{const d=s.dragons.find(d=>d.id===id);E.act(s,{type:'hatch',id},d.hatchAt);for(let i=0;i<3;i++)E.act(s,{type:'feed',id},d.hatchAt);return d.hatchAt;};

test('a new valley has exactly three resources and one egg',()=>{
 const s=E.createState(T);
 assert.deepEqual(Object.keys(s.resources),['coins','berries','crystals']);
 assert.equal(s.dragons.length,1);assert.equal(s.dragons[0].stage,'egg');assert.equal(E.validate(s),true);
});

test('starting berries are exactly enough to raise the first dragon',()=>{
 const s=E.createState(T),t=grow(s,1,T);
 assert.equal(s.dragons[0].stage,'adult');assert.equal(s.resources.berries,0);
 const at=t+E.SPECIES.moss.cycle*1000;E.tick(s,at);assert.equal(E.production(s,s.dragons[0]).stored,E.production(s,s.dragons[0],at).output);
});

test('Mara pays less as her shelf fills and never more than her wallet',()=>{
 const s=E.createState(T);s.resources.crystals=40;
 const first=E.price(s,'crystals');E.act(s,{type:'sell',resource:'crystals',qty:10},T);
 assert.ok(E.price(s,'crystals')<first,'price drops after a big sale');
 s.market.wallet=10;const q=E.quote(s,'crystals');assert.ok(q.total<=10);assert.equal(q.limited,true);
 s.market.wallet=0;assert.throws(()=>E.act(s,{type:'sell',resource:'crystals'},T),/закінчились монети/);
});

test('coins circulate: spending refills Mara, neighbours drain her stock',()=>{
 const s=E.createState(T);s.resources.crystals=10;
 E.act(s,{type:'sell',resource:'crystals'},T);const wallet=s.market.wallet,stock=s.market.stock.crystals;
 E.tick(s,s.market.resellAt);assert.equal(s.market.stock.crystals,stock-1);assert.equal(s.market.wallet,wallet+E.MARKET.base.crystals);
 const before=s.market.wallet;E.act(s,{type:'buyEgg',species:'ember'},s.last);assert.equal(s.market.wallet,before+E.SPECIES.ember.eggCost);
 s.resources.crystals=1;const total=st=>st.resources.coins+st.market.wallet;const c=total(s);E.act(s,{type:'sell',resource:'crystals',qty:1},s.last);
 assert.equal(total(s),c,'a sale only moves coins between player and Mara');
});

test('expeditions bring new coins and crystals; the team pauses at home',()=>{
 const s=E.createState(T),t=grow(s,1,T);s.resources.berries=3;
 E.act(s,{type:'expedition',team:[1]},t);assert.equal(E.production(s,s.dragons[0]).away,true);
 assert.throws(()=>E.act(s,{type:'claim'},t+1000),/триває/);
 const coins=s.resources.coins;E.act(s,{type:'claim'},t+E.EXPEDITION_MS);
 assert.equal(s.resources.coins,coins+6);assert.equal(s.resources.crystals,2);assert.equal(s.expeditions,1);
});

test('the first three eggs must be different species',()=>{
 const s=E.createState(T);s.resources.coins=500;
 assert.throws(()=>E.act(s,{type:'buyEgg',species:'moss'},T),/три різні види/);
 E.act(s,{type:'buyEgg',species:'ember'},T);E.act(s,{type:'buyEgg',species:'stone'},T);
 assert.throws(()=>E.act(s,{type:'buyEgg',species:'moss'},T),/вільного/);
 assert.throws(()=>E.act(s,{type:'buyEgg',species:'mist'},T),/Серця долини/);
});

test('upgrades cost coins and berries and do not inflate stored harvest',()=>{
 const s=E.createState(T),t=grow(s,1,T),d=s.dragons[0];s.resources.coins=100;s.resources.berries=20;
 E.tick(s,t+E.SPECIES.moss.cycle*1000);const stored=E.production(s,d).stored;
 E.act(s,{type:'upgrade',id:1},s.last);assert.equal(d.level,2);assert.equal(E.production(s,d).stored,stored);
 assert.ok(E.production(s,d).output>E.SPECIES.moss.output);
});

test('v3 saves fold six resources into three without losing dragons',()=>{
 const v3={version:3,start:T,last:T,forageAt:0,restored:true,chapter2Complete:false,trades:5,collected:9,location:'grove',locations:{grove:{unlocked:true,level:2},quarry:{unlocked:true,level:1},ruins:{unlocked:false,level:0}},resources:{coins:50,berries:4,embers:3,ore:5,relics:2,fruit:1},dragons:[{id:1,species:'moss',slot:0,location:'grove',name:'Тест',stage:'adult',hatchAt:T,feeds:3,level:2,xp:1,ready:0,readyAmount:0,next:T+1000}],nextId:2,slots:5,crafted:2,phaseOverride:null,orders:[],merchantBudget:200,orderBatch:1,nextOrderId:4,coinSpent:0,totalProduced:{},expedition:null,expeditions:2,tree:{shift:null,ends:0},fruitHarvested:0,hurried:1,goalsClaimed:['arrivals','crafter'],journal:[]};
 const s=E.hydrate(v3,T);
 assert.deepEqual(s.resources,{coins:50,berries:6,crystals:10});assert.equal(s.market.wallet,200);assert.equal(s.slots,6);
 assert.equal(s.dragons[0].name,'Тест');assert.deepEqual(s.goalsClaimed,['arrivals']);assert.equal(E.validate(s),true);
});

test('both chapters are reachable by a simple player within 30 minutes, then the valley keeps growing',t=>{
 const s=E.createState(T),afford=c=>Object.entries(c).every(([k,n])=>s.resources[k]>=n);let ch1=null,ch2=null;
 for(let sec=0;sec<=1800;sec++){
  const now=T+sec*1000,act=a=>E.act(s,a,now);E.tick(s,now);
  if(now>=s.forageAt)act({type:'forage'});
  for(const d of s.dragons){
   if(d.stage==='egg'&&now>=d.hatchAt)act({type:'hatch',id:d.id});
   while(d.stage==='baby'&&s.resources.berries>=2)act({type:'feed',id:d.id});
   if(d.stage==='adult'&&d.ready&&!s.expedition?.team.includes(d.id))act({type:'collect',id:d.id});
  }
  if(s.resources.berries>14&&E.quote(s,'berries',s.resources.berries-14).units)act({type:'sell',resource:'berries',qty:s.resources.berries-14});
  const keep=s.restored?E.LOCATIONS[s.locations.quarry.unlocked?'ruins':'quarry'].unlockCost.crystals:E.RESTORE_COST.crystals;
  if(s.resources.crystals>keep&&E.quote(s,'crystals',s.resources.crystals-keep).units)act({type:'sell',resource:'crystals',qty:s.resources.crystals-keep});
  const free=s.dragons.length<s.slots,owned=new Set(s.dragons.map(d=>d.species));
  const want=['moss','ember','stone'].find(k=>!owned.has(k))||(s.dragons.length<6?['ember','stone','moss'][s.dragons.length%3]:null);
  if(free&&want&&s.resources.coins>=E.SPECIES[want].eggCost+(owned.size<3?0:40))act({type:'buyEgg',species:want});
  if(!s.expedition&&s.dragons.some(d=>d.stage==='adult')&&s.resources.berries>=3)act({type:'expedition',team:[s.dragons.find(d=>d.stage==='adult').id]});
  if(s.expedition&&now>=s.expedition.ends)act({type:'claim'});
  if(!s.restored&&new Set(s.dragons.filter(d=>d.stage==='adult').map(d=>d.species)).size>=3&&afford(E.RESTORE_COST)){act({type:'restore'});ch1=sec;}
  for(const loc of ['quarry','ruins'])if(!s.locations[loc].unlocked&&E.locationRequirements(s,loc).met&&afford(E.LOCATIONS[loc].unlockCost))act({type:'unlockLocation',location:loc});
  if(s.locations.ruins.unlocked){ch2=sec;break;}
  assert.equal(E.validate(s),true);
 }
 t.diagnostic(`chapter 1: ${ch1}s, chapter 2: ${ch2}s, coins ${s.resources.coins}, wallet ${s.market.wallet}`);
 assert.ok(ch1!==null&&ch1<=600,'chapter one within ten minutes');
 assert.ok(ch2!==null&&ch2<=1800,'chapter two within thirty minutes');
});

test('objective walks the chapter-one loop in order',()=>{
 const s=E.createState(T);assert.equal(E.objective(s).step,0);
 const t=grow(s,1,T);assert.equal(E.objective(s).step,1);
 E.tick(s,t+12000);E.act(s,{type:'collect',id:1},s.last);assert.equal(E.objective(s).tab,'market');
 E.act(s,{type:'sell',resource:'berries',qty:1},s.last);assert.equal(E.objective(s).tab,'eggs');
});

test('Mara keeps a short price history that falls on sales and recovers on resale',()=>{
 const s=E.createState(T);s.resources.crystals=30;
 E.act(s,{type:'sell',resource:'crystals',qty:10},T);const h=s.market.history.crystals;
 assert.ok(h.at(-1)<h[0],'a big sale lowers the recorded price');
 const afterSale=h.at(-1);E.tick(s,T+E.MARKET.resellSeconds*1000*12);assert.ok(s.market.history.crystals.at(-1)>afterSale,'reselling to neighbours raises it again');
 for(let i=0;i<40;i++){s.resources.crystals=1;s.market.wallet=1000;E.act(s,{type:'sell',resource:'crystals',qty:1},s.last);}
 assert.ok(s.market.history.crystals.length<=E.HISTORY_LEN);assert.equal(E.validate(s),true);
});

test('after the chapters the valley grows forever: each level costs more and pays +10%',()=>{
 const s=E.createState(T);s.restored=true;s.locations.quarry.unlocked=true;s.locations.ruins.unlocked=true;s.slots=8;
 s.resources={coins:1e6,berries:0,crystals:1e6};
 const d=s.dragons[0];d.stage='adult';const base=E.production(s,d).output,costs=[];
 for(let i=0;i<12;i++){costs.push(E.valleyCost(s).coins);E.act(s,{type:'growValley'},T);}
 assert.equal(s.valleyLevel,13);assert.ok(costs.every((c,i)=>!i||c>costs[i-1]),'every level is dearer than the last');
 assert.ok(E.production(s,d).output>base);assert.equal(E.objective(s).chapter,3);assert.equal(E.objective(s).total,null);
 assert.equal(E.validate(s),true);
});

test('a save with only Mara\'s shop damaged keeps the valley and reopens the shop',()=>{
 const s=E.createState(T);s.resources.coins=777;s.valleyLevel=4;
 const raw=JSON.parse(JSON.stringify(s));delete raw.market;
 const h=E.hydrate(raw,T);assert.equal(h.resources.coins,777);assert.equal(h.valleyLevel,4);assert.equal(h.market.wallet,E.MARKET.startWallet);
 const bad=JSON.parse(JSON.stringify(s));bad.dragons[0].level='abc';
 assert.throws(()=>E.hydrate(bad,T),'other damage is still refused');
});

test('each dragon in a trip eats 3 berries; Кремінь brings more treasure',()=>{
 assert.deepEqual(E.expeditionCost([1]),{berries:3});assert.deepEqual(E.expeditionCost([1,2,3]),{berries:9});
 const s=E.createState(T);s.dragons[0].stage='adult';s.dragons.push({...s.dragons[0],id:2,species:'stone',slot:1});s.nextId=3;
 assert.deepEqual(E.expeditionReward(s,[1]),{coins:6,crystals:2});assert.deepEqual(E.expeditionReward(s,[2]),{coins:9,crystals:4});
});

test('levels get dearer: each costs about 1.7 times the last',()=>{
 const d={level:1},costs=[1,2,3,4].map(l=>E.upgradeCost(null,{...d,level:l}).coins);
 assert.deepEqual(costs,[20,34,58,98]);assert.equal(E.upgradeCost(null,{level:E.MAX_LEVEL}),null);
});

test('traits: Жарик works harder in the eclipse, Мохолист by day, Кришталик holds twice as many harvests',()=>{
 const s=E.createState(T),day=T+1000,red=T+E.PHASE_MS+1000;assert.equal(E.phase(s,red).red,true);
 const ember={species:'ember',level:1},moss={species:'moss',level:1};
 assert.ok(E.production(s,ember,red).output>E.production(s,ember,day).output);
 assert.ok(E.production(s,moss,day).output>E.production(s,moss,red).output);
 assert.equal(E.capOf({species:'crystal'}),2*E.PRODUCTION_CAP);assert.equal(E.capOf({species:'moss'}),E.PRODUCTION_CAP);
});

test('in the eclipse Lucy pays more for crystals, and the tooltip says why',()=>{
 const s=E.createState(T);E.tick(s,T+1000);const calm=E.price(s,'crystals'),berries=E.price(s,'berries');
 E.tick(s,T+E.PHASE_MS+1000);assert.equal(s.market.panic,true);assert.ok(E.price(s,'crystals')>calm);
 assert.equal(E.price(s,'berries'),berries,'berries are not affected');
 const rows=E.explainPrice(s,'crystals');assert.ok(rows.some(r=>/Затемнення/.test(r[0])));assert.equal(rows.at(-1)[1],String(E.price(s,'crystals')));
});

test('away from the valley a full nest keeps filling at half speed, for 45 minutes at most',()=>{
 const s=E.createState(T),t=grow(s,1,T),d=s.dragons[0],cyc=E.SPECIES.moss.cycle*1000;
 E.tick(s,t+cyc*E.PRODUCTION_CAP);const full=E.production(s,d).stored;assert.equal(d.ready,E.PRODUCTION_CAP);
 const a=structuredClone(s);E.tick(a,a.last+10*60000);const tenMin=E.production(a,a.dragons[0]).stored;assert.ok(tenMin>full,'it keeps filling while away');
 const b=structuredClone(s);E.tick(b,b.last+5*3600000);const c=structuredClone(s);E.tick(c,c.last+E.OFFLINE_MS);
 assert.equal(E.production(b,b.dragons[0]).stored,E.production(c,c.dragons[0]).stored,'capped at 45 minutes');
 const online=structuredClone(s);for(let i=1;i<=30;i++)E.tick(online,s.last+i*1000);assert.equal(E.production(online,online.dragons[0]).stored,full,'no overflow while playing');
 assert.equal(E.validate(b),true);
});
