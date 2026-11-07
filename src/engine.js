/** Local game simulation (v4, hackathon build): three resources and one merchant with her own wallet.
 * Loop: dragons make berries or crystals → Lucy buys them with coins from her wallet → coins hatch more dragons.
 * Coins the player spends go back into Lucy's wallet; expeditions bring new coins into the valley. */
import {MARKET,price,quote,resell,settleSale} from './market-rules.js';
// Lucy's pricing rules live in market-rules.js; re-exported so callers keep using E.price etc.
export {MARKET,price,quote,marketMood,explainPrice,shopOpen} from './market-rules.js';
export const RESOURCE={coins:'Монети',berries:'Ягоди',crystals:'Кристали'};
export const RESOURCE_ROLE={coins:'Гроші: яйця, рівні, нові землі',berries:'Їжа: годування малюків і рівні',crystals:'Товар: продавай Люсі за монети'};
export const SPECIES={
 moss:{name:'Мохолист',kind:'Лісовий дракон',job:'Вирощує ягоди',resource:'berries',output:3,cycle:12,color:'#84b77a',belly:'#e8dba5',horn:'#c4d28a',desc:'Трохи сонний садівник. Де він ступає, прокидаються паростки.',eggCost:30,trait:{name:'Сонцелюб',text:'Удень вирощує на 20% більше.',day:1.2}},
 ember:{name:'Жарик',kind:'Вогняний дракон',job:'Видобуває кристали',resource:'crystals',output:2,cycle:15,color:'#c77858',belly:'#f5d197',horn:'#e5ab6c',desc:'Збирає тепло під крилами й виплавляє з каміння сяючі кристали.',eggCost:45,trait:{name:'Вогонь затемнення',text:'У затемнення видобуває на 50% більше.',eclipse:1.5}},
 stone:{name:'Кремінь',kind:'Кам’яний дракон',job:'Видобуває багато кристалів',resource:'crystals',output:4,cycle:25,color:'#8b94ac',belly:'#e2ddc5',horn:'#bdc6da',desc:'Тихий шукач скарбів. Чує кристали навіть крізь товщу скелі.',eggCost:70,trait:{name:'Шукач скарбів',text:'У поході приносить удвічі більше кристалів і в півтора раза більше монет.',trip:true}},
 mist:{name:'Туманник',kind:'Туманний дракон',job:'Вирощує гори ягід',resource:'berries',output:6,cycle:18,color:'#b9b2d6',belly:'#efe9f6',horn:'#d8d2ee',desc:'Народився з останнього клаптя туману. Знаходить стиглі ягоди там, куди не дивляться інші.',eggCost:90,unlock:'restored',trait:{name:'Нічний збирач',text:'У затемнення вирощує на 50% більше.',eclipse:1.5}},
 crystal:{name:'Кришталик',kind:'Кришталевий дракон',job:'Вирощує кристали',resource:'crystals',output:7,cycle:24,color:'#4a5bb0',belly:'#c9d2f5',horn:'#9fe8ff',desc:'Співає разом із кристалами кар’єру. Кожна пісня лишає по собі сяючий кристал.',eggCost:120,unlock:'quarry',trait:{name:'Невтомний',text:'Накопичує в гнізді вдвічі більше зборів.',cap:2}}
};
// Extra species appear later in the story: mist after the Heart is restored, crystal once the quarry is open.
export function speciesLocked(s,id){const u=SPECIES[id]?.unlock;if(u==='restored'&&!s.restored)return 'Відкриється після відновлення Серця долини.';if(u==='quarry'&&!s.locations?.quarry?.unlocked)return 'Відкриється разом із Місячним кар’єром.';return '';}
export const PHASE_MS=120000,HATCH_MS=8000,MAX_SLOTS=8,MAX_LEVEL=5,PRODUCTION_CAP=5,FEED_COST=2,FORAGE_MS=20000;
export const HURRY_COST={coins:5};
export const RESTORE_COST={coins:60,crystals:20};
export const EXPEDITION_MS=30000,EXPEDITION_COST={berries:3};
// A trip costs berries for every dragon in the team (one dragon: 3 berries, three: 9).
export function expeditionCost(team){return {berries:EXPEDITION_COST.berries*Math.max(1,team?.length||1)};}
// While the player is away, nests keep filling past the usual cap at half speed, for up to 45 minutes.
export const OFFLINE_MS=45*60000,OFFLINE_RATE=.5,AWAY_GAP_MS=60000;
/** How many harvests a dragon's nest holds (Кришталик holds twice as many). */
export function capOf(d){return PRODUCTION_CAP*(SPECIES[d.species]?.trait?.cap||1);}
/** The species trait multiplier for a harvest that completes at `now` (day or eclipse). */
export function traitBoost(s,d,now=Date.now()){const t=SPECIES[d.species]?.trait;if(!t)return 1;const red=phase(s,now).red;return red?(t.eclipse||1):(t.day||1);}
export const LOCATIONS={
 grove:{name:'Сонячний гай',description:'Дім перших драконів. Тут ростуть ягоди й вилуплюються яйця.',unlockCost:{},slots:4},
 quarry:{name:'Місячний кар’єр',description:'Кристали співають під землею. Два нові гнізда й Кришталевий дракон.',unlockCost:{coins:80,crystals:20},slots:6},
 ruins:{name:'Стародавні руїни',description:'Далекий притулок за туманом. Ще два гнізда для великої зграї.',unlockCost:{coins:120,crystals:40},slots:8}
};
export const SLOTS=[
 {id:0,location:'grove',x:50,y:49},{id:1,location:'grove',x:77,y:68},{id:2,location:'grove',x:27,y:68},{id:3,location:'grove',x:18,y:35},
 {id:4,location:'quarry',x:35,y:60},{id:5,location:'quarry',x:72,y:44},
 {id:6,location:'ruins',x:35,y:60},{id:7,location:'ruins',x:72,y:44}
];
// Goals: progress is derived from state; rewards are claimed once.
export const GOALS=[
 {id:'arrivals',title:'Нові мешканці',text:'Вилупи двох драконів.',target:2,progress:s=>s.dragons.filter(d=>d.stage!=='egg').length,reward:{coins:15}},
 {id:'seller',title:'Добрий сусід',text:'Продай Люсі 10 товарів.',target:10,progress:s=>s.sold,reward:{coins:20}},
 {id:'impatient',title:'Нетерплячий',text:'Поквап одне яйце.',target:1,progress:s=>s.hurried,reward:{coins:10}},
 {id:'trio',title:'Три характери',text:'Вирости три різні види.',target:3,progress:s=>new Set(s.dragons.filter(d=>d.stage==='adult').map(d=>d.species)).size,reward:{crystals:5}},
 {id:'traveller',title:'Мандрівник',text:'Заверши експедицію.',target:1,progress:s=>s.expeditions,reward:{berries:10}},
 {id:'pack',title:'Зграя',text:'Вирости чотирьох дорослих драконів.',target:4,progress:s=>s.dragons.filter(d=>d.stage==='adult').length,reward:{crystals:10}},
 {id:'master',title:'Майстер справи',text:'Підніми дракона до рівня 3.',target:3,progress:s=>Math.max(...s.dragons.map(d=>d.level)),reward:{coins:40}},
 {id:'legend',title:'Легенда долини',text:'Підніми дракона до рівня 5 — і запиши легенду в реєстр NEAR.',target:5,progress:s=>Math.max(...s.dragons.map(d=>d.level)),reward:{crystals:25}}
];
export function goalStatus(s){return GOALS.map(g=>{const value=Math.min(g.target,g.progress(s)||0);return {...g,value,done:value>=g.target,claimed:s.goalsClaimed.includes(g.id)};});}
// Dragon score: a single number for the whole flock, like the reference's dragon score.
export function dragonScore(s){return s.dragons.reduce((n,d)=>n+(d.stage==='egg'?2:d.stage==='baby'?5:10*d.level),0);}
const own=(o,k)=>Object.hasOwn(o,k);
const integer=(n,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
const timeValue=n=>{if(!Number.isFinite(n)||n<0||!Number.isSafeInteger(Math.floor(n)))throw Error('Непридатний час гри.');return Math.floor(n);};
const nameValid=n=>typeof n==='string'&&[...n].length<=20&&/^[\p{L}\p{M}\p{N} .’'\-]+$/u.test(n);
function newDragon(id,species,slot,now){return {id,species,slot,location:SLOTS[slot].location,name:null,stage:'egg',hatchAt:now+HATCH_MS,feeds:0,level:1,ready:0,readyAmount:0,next:0};}
function slotsFor(s){return s.locations.ruins.unlocked?8:s.locations.quarry.unlocked?6:s.restored?4:3;}
export function createState(now=Date.now()){
 now=timeValue(now);
 return {version:4,start:now,last:now,forageAt:0,restored:false,trades:0,sold:0,collected:0,location:'grove',
  locations:{grove:{unlocked:true},quarry:{unlocked:false},ruins:{unlocked:false}},resources:{coins:40,berries:6,crystals:0},
  dragons:[newDragon(1,'moss',0,now)],nextId:2,slots:3,valleyLevel:1,phaseOverride:null,
  market:freshMarket(now),
  expedition:null,expeditions:0,hurried:0,goalsClaimed:[],journal:['Ти знайшов перше яйце. Незабаром воно прокинеться.']};
}
export function dragonName(d){return d.name||SPECIES[d.species]?.name||'Дракон';}
export function availableSlots(s,location){return SLOTS.filter(slot=>slot.id<s.slots&&(!location||slot.location===location));}
// Endless growth: after the chapters the valley itself levels up. Each level costs more and adds +10% to everything.
export const VALLEY_STEP=.1;
export function valleyBonus(s){return 1+VALLEY_STEP*((s.valleyLevel||1)-1);}
// Integer arithmetic throughout, so the on-chain economy (contracts/economy/src/rules.rs) gives exactly the same numbers.
const roundDiv=(n,d)=>Math.floor((n+Math.floor(d/2))/d);
export function valleyCost(s){const k=BigInt(Math.min(30,(s.valleyLevel||1)-1)),num=14n**k,den=10n**k,r=(n,d)=>(n+d/2n)/d;return {coins:Number(r(10n*num,den))*10,crystals:Number(r(8n*num,den))*5};}
/** One harvest: output × (1 + 0.5 per level above 1) × bonus (valley × trait), rounded half up. */
export function outputAt(species,level,bonus=1){return roundDiv(SPECIES[species].output*(level+1)*Math.round(bonus*1000),2000);}
export function production(s,d,now=Date.now()){
 const sp=SPECIES[d.species],boost=traitBoost(s,d,now),output=outputAt(d.species,d.level,valleyBonus(s)*boost);
 return {resource:sp.resource,output,boost,cycle:sp.cycle,cap:capOf(d),away:!!s.expedition?.team.includes(d.id),bonus:0,stored:d.readyAmount??d.ready*output};
}
// Each level costs about 1.7× the last (20, 34, 58, 98 coins), so a level is a choice against a new egg.
const LEVEL_COINS=[20,34,58,98];
export function upgradeCost(s,d){return d.level>=MAX_LEVEL?null:{coins:LEVEL_COINS[d.level-1],berries:5*d.level};}
/** What a team brings home: new coins from outside the valley plus crystals. */
export function expeditionReward(s,teamIds){
 const team=teamIds.map(id=>s.dragons.find(d=>d.id===id)).filter(Boolean),b=valleyBonus(s);
 // 6 coins per level and 2 crystals per dragon; a treasure hunter (Кремінь) brings 1.5× coins and 2× crystals.
 const vpm=Math.round(b*1000),coinsTenths=team.reduce((n,d)=>n+6*d.level*(SPECIES[d.species].trait?.trip?15:10),0),crystals=team.reduce((n,d)=>n+(SPECIES[d.species].trait?.trip?4:2),0);
 return {coins:roundDiv(coinsTenths*vpm,10000),crystals:roundDiv(crystals*vpm,1000)};
}
export function locationRequirements(s,location){
 if(!own(LOCATIONS,location))return {met:false,reasons:['Невідома місцевість.']};
 const reasons=[];
 if(location==='quarry'&&!s.restored)reasons.push('Віднови Серце долини.');
 if(location==='ruins'&&!s.locations.quarry.unlocked)reasons.push('Відкрий Місячний кар’єр.');
 return {met:reasons.length===0,reasons};
}
export function phase(s,now=Date.now()){
 now=timeValue(now);
 if(s.phaseOverride&&now<s.phaseOverride.until)return {red:s.phaseOverride.red,left:s.phaseOverride.until-now};
 const elapsed=Math.max(0,now-s.start);return {red:Math.floor(elapsed/PHASE_MS)%2===1,left:PHASE_MS-elapsed%PHASE_MS};
}
// ---- Lucy's market -------------------------------------------------------------------------
// Recent prices per good (newest last) so the market can draw how the economy moved.
export const HISTORY_LEN=24;
function note(s,k){const h=s.market.history??={berries:[],crystals:[]};h[k].push(price(s,k));if(h[k].length>HISTORY_LEN)h[k].splice(0,h[k].length-HISTORY_LEN);}
export function marketStatus(s){return {wallet:s.market.wallet,stock:{...s.market.stock},prices:{berries:price(s,'berries'),crystals:price(s,'crystals')}};}
// Ukrainian plural for message counts: 1 монета, 2 монети, 5 монет.
const FORMS={coins:['монета','монети','монет'],crystals:['кристал','кристали','кристалів'],berries:['ягода','ягоди','ягід']};
export function count(n,key){const m=n%100,i=m>=11&&m<=14?2:n%10===1?0:n%10>=2&&n%10<=4?1:2;return `${n} ${FORMS[key][i]}`;}
function log(s,msg){s.journal.unshift(msg);s.journal=s.journal.slice(0,32);return msg;}
function spend(s,cost){
 for(const [k,n] of Object.entries(cost))if(!own(RESOURCE,k)||!integer(n)||s.resources[k]<n)throw Error(`Не вистачає: ${RESOURCE[k]||k}.`);
 for(const [k,n] of Object.entries(cost))s.resources[k]-=n;
 // Every coin the player spends in the valley lands in Lucy's wallet.
 if(cost.coins)s.market.wallet+=cost.coins;
}
function awardProduction(s,d){const p=production(s,d),amount=p.stored;s.resources[p.resource]+=amount;d.ready=0;d.readyAmount=0;s.collected++;return amount;}
export function tick(s,now=Date.now()){
 now=Math.max(timeValue(now),s.last);if(s.phaseOverride&&now>=s.phaseOverride.until)s.phaseOverride=null;
 const gap=now-s.last,away=gap>AWAY_GAP_MS;
 for(const d of s.dragons){
  if(d.stage!=='adult'||s.expedition?.team.includes(d.id))continue;
  const cap=capOf(d),cyc=SPECIES[d.species].cycle*1000;let filled=0;
  if(d.ready<cap&&now>=d.next){
   const cycles=Math.floor((now-d.next)/cyc)+1,added=Math.min(cap-d.ready,cycles);
   // Each harvest is sized by the phase it finished in: a trait can be stronger by day or in the eclipse.
   for(let i=0;i<added;i++)d.readyAmount=(d.readyAmount??0)+production(s,d,d.next+i*cyc).output;
   d.ready+=added;d.next+=cycles*cyc;filled=added;
  }
  // Away from the valley the nest keeps filling past its cap, at half speed, for up to 45 minutes.
  if(away&&d.ready>=cap){
   const left=Math.min(gap,OFFLINE_MS)-filled*cyc,extra=Math.floor(Math.max(0,left)/(cyc/OFFLINE_RATE));
   if(extra>0){const t=SPECIES[d.species].trait||{},avg=((t.day||1)+(t.eclipse||1))/2;d.readyAmount=(d.readyAmount??0)+extra*outputAt(d.species,d.level,valleyBonus(s)*avg);}
  }
 }
 // In the eclipse the neighbours panic about the NEAR chart and hoard crystals: Lucy pays more for them.
 s.market.panic=phase(s,now).red;
 // Neighbours buy from Lucy's shelves: stock slowly drains and her wallet refills.
 for(const k of resell(s.market,now))note(s,k);
 s.last=now;return s;
}
export function act(s,a,now=Date.now()){
 if(!a||typeof a!=='object'||typeof a.type!=='string')throw Error('Невідома дія.');
 tick(s,now);now=s.last;const d=s.dragons.find(d=>d.id===a.id);let msg='';
 switch(a.type){
 case 'hatch':
  if(!d||d.stage!=='egg')throw Error('Яйце вже вилупилось.');if(now<d.hatchAt)throw Error('Яйце ще зігрівається.');d.stage='baby';msg=`${dragonName(d)} вилупився! Нагодуй малюка тричі ягодами.`;break;
 case 'hurry':
  if(!d||d.stage!=='egg')throw Error('Поквапити можна лише яйце.');if(now>=d.hatchAt)throw Error('Яйце вже готове вилупитись.');spend(s,HURRY_COST);d.hatchAt=now;s.hurried++;msg='Яйце тріщить — можна вилуплювати!';break;
 case 'feed':
  if(!d||d.stage!=='baby')throw Error('Цьому дракону зараз не потрібне годування.');spend(s,{berries:FEED_COST});d.feeds++;
  if(d.feeds>=3){d.stage='adult';d.next=now+SPECIES[d.species].cycle*1000;msg=`${dragonName(d)} виріс і починає працювати!`;}else msg=`Ще ${3-d.feeds} годування до дорослішання.`;break;
 case 'collect':{
  if(!d||d.stage!=='adult'||!d.ready)throw Error('Урожай ще не готовий.');if(s.expedition?.team.includes(d.id))throw Error('Дочекайся повернення дракона.');
  const wasFull=d.ready>=capOf(d),resource=SPECIES[d.species].resource,amount=awardProduction(s,d);
  if(wasFull||d.next<=now)d.next=now+SPECIES[d.species].cycle*1000;msg=`+${amount} · ${RESOURCE[resource]}`;break;}
 case 'buyEgg':{
  if(!own(SPECIES,a.species))throw Error('Невідомий вид.');if(speciesLocked(s,a.species))throw Error(speciesLocked(s,a.species));
  if(new Set(s.dragons.map(d=>d.species)).size<3&&s.dragons.some(d=>d.species===a.species))throw Error('Спершу запроси три різні види.');
  const free=availableSlots(s).filter(slot=>!s.dragons.some(d=>d.slot===slot.id));
  const slot=a.slot===undefined?(free.find(slot=>slot.location===s.location)||free[0])?.id:a.slot;
  if(!integer(slot,0,MAX_SLOTS-1)||!free.some(f=>f.id===slot))throw Error('Немає вільного відкритого гнізда.');
  spend(s,{coins:SPECIES[a.species].eggCost});s.dragons.push(newDragon(s.nextId++,a.species,slot,now));msg='Нове яйце вже у притулку.';break;}
 case 'upgrade':{
  if(!d||d.stage!=='adult')throw Error('Спочатку вирости дракона.');if(s.expedition?.team.includes(d.id))throw Error('Дочекайся повернення дракона.');if(d.level>=MAX_LEVEL)throw Error('Дракон уже досяг найвищого рівня.');
  // Already stored harvest keeps its old size; only future cycles grow.
  spend(s,upgradeCost(s,d));d.readyAmount=production(s,d).stored;d.level++;msg=`${dragonName(d)} · рівень ${d.level}! Тепер дає більше.`;break;}
 case 'rename':{
  if(!d)throw Error('Дракона не знайдено.');if(typeof a.name!=='string')throw Error('Введи ім’я дракона.');const name=a.name.trim().replace(/\s+/g,' ');
  if(name&&!nameValid(name))throw Error('Ім’я: до 20 літер, цифр, пробілів або дефісів.');d.name=name||null;msg=`Тепер твого друга звуть ${dragonName(d)}.`;break;}
 case 'travel':
  if(!own(LOCATIONS,a.location)||!s.locations[a.location].unlocked)throw Error('Цю місцевість ще не відкрито.');s.location=a.location;msg=`Ти у місцевості «${LOCATIONS[a.location].name}».`;break;
 case 'moveDragon':{
  if(!d)throw Error('Дракона не знайдено.');if(s.expedition?.team.includes(d.id))throw Error('Дочекайся повернення дракона.');
  if(!integer(a.slot,0,s.slots-1)||s.dragons.some(other=>other.slot===a.slot))throw Error('Обери вільне відкрите гніздо.');
  const amount=d.ready?awardProduction(s,d):0;d.slot=a.slot;d.location=SLOTS[a.slot].location;if(d.stage==='adult')d.next=now+SPECIES[d.species].cycle*1000;
  msg=`${dragonName(d)} переїхав: ${LOCATIONS[d.location].name}.${amount?` Зібрано ${amount} перед переїздом.`:''}`;break;}
 case 'sell':{
  if(!own(MARKET.base,a.resource))throw Error('Люсі таке не купує.');if(!s.resources[a.resource])throw Error(`Не вистачає: ${RESOURCE[a.resource]}.`);
  const q=quote(s,a.resource,integer(a.qty,1)?a.qty:s.resources[a.resource]);
  if(!q.units)throw Error('У Люсі закінчились монети. Купи щось у неї або зачекай, поки вона розпродасть склад.');
  settleSale(s,a.resource,q);note(s,a.resource);s.trades++;s.sold+=q.units;
  const now2=price(s,a.resource);msg=`Продано ${q.units} · +${count(q.total,'coins')}. Тепер Люсі платить ${now2} за 1${now2<q.unitPrice?' — склад повнішає':''}.`;break;}
 case 'forage':if(now<s.forageAt)throw Error('Ягоди ще дозрівають.');s.resources.berries+=3;s.forageAt=now+FORAGE_MS;msg='+3 ягоди з лісової галявини.';break;
 case 'restore':
  if(s.restored)throw Error('Серце долини вже відновлене.');if(new Set(s.dragons.filter(d=>d.stage==='adult').map(d=>d.species)).size<3)throw Error('Потрібні дорослі дракони трьох різних видів.');
  spend(s,RESTORE_COST);s.restored=true;s.slots=Math.max(s.slots,slotsFor(s));msg='Серце долини сяє! Відкрито четверте гніздо й Туманного дракона.';break;
 case 'unlockLocation':{
  if(!own(LOCATIONS,a.location)||a.location==='grove')throw Error('Невідома нова місцевість.');if(s.locations[a.location].unlocked)throw Error('Місцевість уже відкрита.');
  const r=locationRequirements(s,a.location);if(!r.met)throw Error(r.reasons[0]);
  spend(s,LOCATIONS[a.location].unlockCost);s.locations[a.location]={unlocked:true};s.slots=Math.max(s.slots,slotsFor(s));msg=`Відкрито ${LOCATIONS[a.location].name}! Нові гнізда чекають мешканців.`;break;}
 case 'expedition':{
  if(s.expedition)throw Error('Команда вже в експедиції.');const team=a.team??s.dragons.filter(d=>d.stage==='adult').map(d=>d.id).slice(0,3);
  if(!Array.isArray(team)||new Set(team).size!==team.length||team.some(id=>!s.dragons.some(d=>d.id===id&&d.stage==='adult')))throw Error('Обери різних дорослих драконів.');if(!team.length)throw Error('Потрібен хоча б один дорослий дракон.');if(team.length>3)throw Error('У команді до трьох драконів.');
  spend(s,expeditionCost(team));s.expedition={team:[...team],duration:EXPEDITION_MS,ends:now+EXPEDITION_MS,reward:expeditionReward(s,team)};msg='Дракони вирушили в похід. Поки їх немає, вони не працюють удома.';break;}
 case 'claim':{
  if(!s.expedition||now<s.expedition.ends)throw Error('Експедиція ще триває.');const r=s.expedition.reward;s.resources.coins+=r.coins;s.resources.crystals+=r.crystals;
  for(const id of s.expedition.team){const dragon=s.dragons.find(d=>d.id===id);if(dragon)dragon.next=now+SPECIES[dragon.species].cycle*1000;}
  s.expedition=null;s.expeditions++;msg=`Команда повернулась! +${count(r.coins,'coins')} і +${count(r.crystals,'crystals')}.`;break;}
 case 'growValley':{
  if(!s.locations.ruins.unlocked)throw Error('Спершу відкрий усі землі долини.');const cost=valleyCost(s);spend(s,cost);s.valleyLevel=(s.valleyLevel||1)+1;
  msg=`Долина досягла рівня ${s.valleyLevel}! Дракони дають +${Math.round((valleyBonus(s)-1)*100)}%.`;break;}
 case 'claimGoal':{
  const g=goalStatus(s).find(g=>g.id===a.goal);if(!g)throw Error('Невідома ціль.');if(g.claimed)throw Error('Нагороду вже отримано.');if(!g.done)throw Error('Ціль ще не виконана.');
  for(const[k,n]of Object.entries(g.reward))s.resources[k]+=n;s.goalsClaimed.push(g.id);msg=`Ціль «${g.title}» виконано!`;break;}
 case 'demoPhase':s.phaseOverride={red:!phase(s,now).red,until:now+60000};msg=phase(s,now).red?'Демо: затемнення на 60 секунд.':'Демо: сонячна фаза на 60 секунд.';break;
 default:throw Error('Невідома дія.');
 }
 log(s,msg);return msg;
}

export function validate(s){
 if(!s||s.version!==4||!integer(s.start)||!integer(s.last)||s.last<s.start)throw Error('Пошкоджене збереження.');
 if(!s.resources||Object.keys(RESOURCE).some(k=>!integer(s.resources[k]))||Object.keys(s.resources).length!==3)throw Error('Пошкоджені ресурси.');
 if(!Array.isArray(s.dragons)||!s.dragons.length||!integer(s.slots,3,MAX_SLOTS)||s.dragons.length>s.slots||!integer(s.nextId,1))throw Error('Пошкоджений притулок.');
 const ids=new Set(),slots=new Set();
 for(const d of s.dragons){
  if(!integer(d.id,1)||ids.has(d.id)||d.id>=s.nextId||!own(SPECIES,d.species)||!['egg','baby','adult'].includes(d.stage)||!integer(d.feeds,0,3)||!integer(d.level,1,MAX_LEVEL)||!integer(d.ready,0,capOf(d))||!integer(d.slot,0,s.slots-1)||slots.has(d.slot)||d.location!==SLOTS[d.slot].location||(d.name!==null&&!nameValid(d.name)))throw Error('Пошкоджений дракон.');
  ids.add(d.id);slots.add(d.slot);
 }
 if(!s.market||!integer(s.market.wallet)||!integer(s.market.stock?.berries)||!integer(s.market.stock?.crystals)||!integer(s.market.resellAt)||['berries','crystals'].some(k=>!Array.isArray(s.market.history?.[k])||s.market.history[k].length>HISTORY_LEN||s.market.history[k].some(n=>!integer(n))))throw Error('Пошкоджений ринок.');
 if(!Object.keys(LOCATIONS).every(k=>typeof s.locations?.[k]?.unlocked==='boolean')||!s.locations.grove.unlocked||!own(LOCATIONS,s.location)||!s.locations[s.location].unlocked)throw Error('Пошкоджені місцевості.');
 if((s.locations.quarry.unlocked&&!s.restored)||(s.locations.ruins.unlocked&&!s.locations.quarry.unlocked))throw Error('Пошкоджена послідовність розділів.');
 if(s.expedition&&(!Array.isArray(s.expedition.team)||!s.expedition.team.length||s.expedition.team.some(id=>!s.dragons.some(d=>d.id===id&&d.stage==='adult'))||!integer(s.expedition.ends)||!integer(s.expedition.reward?.coins)||!integer(s.expedition.reward?.crystals)))throw Error('Пошкоджена експедиція.');
 if(!integer(s.valleyLevel,1)||!integer(s.trades)||!integer(s.sold)||!integer(s.collected)||!integer(s.expeditions)||!integer(s.hurried)||!Array.isArray(s.goalsClaimed)||s.goalsClaimed.some(id=>!GOALS.some(g=>g.id===id))||!Array.isArray(s.journal))throw Error('Пошкоджений журнал.');
 return true;
}
/** Loads a save. Older (v3, six-resource) saves are folded into the three-resource economy. */
function freshMarket(now){return {wallet:MARKET.startWallet,stock:{berries:0,crystals:0},resellAt:now+MARKET.resellSeconds*1000,history:{berries:[3],crystals:[8]}};}
export function hydrate(raw,now=Date.now()){
 const s=structuredClone(raw);
 if(s?.version===3)migrateV3(s);
 if(s&&!s.valleyLevel)s.valleyLevel=1;
 if(s)delete s.chapter2Complete;
 if(s?.market&&!s.market.history)s.market.history={berries:[price(s,'berries')],crystals:[price(s,'crystals')]};
 // Lucy's shop is NPC state: if only it is damaged, reopen it fresh instead of throwing the whole valley away.
 try{validate(s);}catch(e){if(!/ринок/.test(e.message))throw e;s.market=freshMarket(now);validate(s);}
 tick(s,Math.max(now,s.last));return s;
}
function migrateV3(s){
 const r=s.resources||{};
 s.resources={coins:r.coins|0,berries:(r.berries|0)+2*(r.fruit|0),crystals:(r.embers|0)+(r.ore|0)+(r.relics|0)};
 if(s.expedition){s.resources.crystals+=s.expedition.reward|0;s.resources.coins+=15;s.expeditions=(s.expeditions|0)+1;s.expedition=null;}
 s.locations=Object.fromEntries(Object.keys(LOCATIONS).map(k=>[k,{unlocked:Boolean(s.locations?.[k]?.unlocked)}]));
 s.market={wallet:Math.max(0,s.merchantBudget|0),stock:{berries:0,crystals:0},resellAt:(s.last||Date.now())+MARKET.resellSeconds*1000};
 s.sold=(s.trades|0)*4;s.hurried=s.hurried|0;s.slots=Math.max(s.slots|0,slotsFor(s));
 s.goalsClaimed=(s.goalsClaimed||[]).filter(id=>GOALS.some(g=>g.id===id));
 for(const d of s.dragons||[])delete d.xp;
 for(const k of ['orders','merchantBudget','orderBatch','nextOrderId','coinSpent','totalProduced','tree','fruitHarvested','crafted','tutorial'])delete s[k];
 s.version=4;
}
// The one next step for the chapter card. Chapter one teaches the whole loop in six steps.
export function objective(s){
 const first=s.dragons.find(d=>d.species==='moss')||s.dragons[0];
 const goal=(step,title,text,tab='home',id=first?.id,chapter=1,total=6)=>({step,title,text,tab,id,chapter,total});
 if(!s.restored){
  if(first.stage!=='adult')return goal(0,first.stage==='egg'?'Перше пробудження':'Нагодуй малюка',first.stage==='egg'?'Допоможи першому яйцю вилупитись.':`Годування ${first.feeds}/3. Кожне коштує 2 ягоди.`);
  if(!s.collected)return goal(1,'Перший урожай','Дочекайся ягід Мохолиста та збери їх.');
  if(!s.trades)return goal(2,'Знайомство з Люсі','Продай Люсі ягоди — отримаєш монети.','market');
  const ember=s.dragons.find(d=>d.species==='ember');
  if(!ember)return goal(3,'Запроси: Жарик','Купи яйце вогняного дракона — він видобуває кристали.','eggs');
  if(ember.stage!=='adult')return goal(3,'Вирости Жарика',ember.stage==='egg'?'Вилупи яйце Жарика.':`Нагодуй Жарика: ${ember.feeds}/3.`,'home',ember.id);
  if(!s.expeditions)return goal(4,'Перший похід','Відправ дракона в похід — він принесе монети й кристали.','expedition');
  const species=new Set(s.dragons.filter(d=>d.stage==='adult').map(d=>d.species)).size;
  if(species<3){const stone=s.dragons.find(d=>d.species==='stone');return goal(5,stone?'Вирости Кременя':'Запроси: Кремінь','Для Серця долини потрібні три різні дорослі дракони.',stone?'home':'eggs',stone?.id);}
  return goal(5,'Серце долини',`Віднови святилище: ${RESTORE_COST.crystals} кристалів і ${RESTORE_COST.coins} монет.`,'valley');
 }
 const next=(step,title,text)=>goal(step,title,text,'valley',first?.id,2,2);
 if(!s.locations.quarry.unlocked)return next(0,'Новий горизонт',`Відкрий Місячний кар’єр: ${LOCATIONS.quarry.unlockCost.coins} монет і ${LOCATIONS.quarry.unlockCost.crystals} кристалів.`);
 if(!s.locations.ruins.unlocked)return next(1,'Стародавні руїни',`Відкрий руїни: ${LOCATIONS.ruins.unlockCost.coins} монет і ${LOCATIONS.ruins.unlockCost.crystals} кристалів.`);
 // No ending: from here the valley grows level by level (new lands arrive as later expansions).
 const L=s.valleyLevel||1,c=valleyCost(s);return goal(L,`Рівень долини ${L+1}`,`Підніми долину: ${c.coins} монет і ${c.crystals} кристалів. Усі дракони даватимуть ще +10%.`,'valley',first?.id,3,null);
}
