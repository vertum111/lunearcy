/** "A week in a minute": a village of simulated players trades with Lucy for seven days, minute by minute,
 * through the same rules as the game (market-rules.js), so the economy can be watched as it moves.
 * Deterministic for a given seed. Nothing here touches the player's save. */
import {MARKET,price,quote,settleSale,resell,shopOpen} from './market-rules.js';
import {SPECIES,PRODUCTION_CAP,OFFLINE_MS,OFFLINE_RATE,PHASE_MS} from './engine.js';
const MIN=60000,DAY=1440*MIN,WEEK=7*DAY,SAMPLE=30*MIN;
// Scripted village events: they change what players do or whether neighbours come, never the market rules.
export const SIM_EVENTS=[
 {at:2*DAY+18*60*MIN,id:'quarry',text:'Відкрили кар’єр: усі заводять Кришталиків'},
 {at:4*DAY+6*60*MIN,id:'storm',text:'Злива розмила дорогу: сусіди не приходять добу'},
 {at:4*DAY+10*60*MIN,id:'caravan',text:'Мандрівний караван продає Люсі гори ягід і кристалів за будь-яку ціну'},
 {at:5*DAY+6*60*MIN,id:'road',text:'Дорогу полагодили: сусіди повертаються'}
];
const ORDER=['moss','ember','stone','crystal'];
// Seeded random numbers (mulberry32).
function rng(seed){return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
const perMinute=k=>SPECIES[k].output*60/SPECIES[k].cycle;
// Each player plays a few short sessions a day: a morning look, a lunch break, a longer evening.
function sessions(rand){
 const out=[];
 for(let d=0;d<7;d++)for(const [from,to,len] of [[7,9,8],[12,14,10],[18,23,25]])if(rand()<.85){const start=d*DAY+(from+rand()*(to-from))*60*MIN;out.push([start,start+(len*(.6+rand()*.8))*MIN]);}
 return out;
}

/** Runs the week. Returns half-hour samples of both prices, the wallet and the shelves, plus a timeline of events. */
export function simulateWeek({seed=7,players=6}={}){
 const rand=rng(seed),market={wallet:MARKET.startWallet,stock:{berries:0,crystals:0},resellAt:MARKET.resellSeconds*1000};
 // Each player has a lowest price they accept; below it they keep the goods and wait.
 const village=Array.from({length:players},()=>({flock:{moss:1,ember:0,stone:0,crystal:0},resources:{coins:40,berries:0,crystals:0},market,plan:sessions(rand),online:false,accept:{berries:2,crystals:3+Math.floor(rand()*3)}}));
 const samples=[],events=[];let open=true,pending=0,neighbours=true,quarry=false,nextEvent=0;let lastEvent=0;const floorLogged={berries:-1,crystals:-1};
 const log=(t,text,kind='info')=>events.push({t,text,kind});
 const sample=t=>samples.push({t,berries:price({market},'berries'),crystals:price({market},'crystals'),wallet:market.wallet,stockBerries:market.stock.berries,stockCrystals:market.stock.crystals,open,online:village.filter(v=>v.online).length});
 for(let t=0;t<=WEEK;t+=MIN){
  while(nextEvent<SIM_EVENTS.length&&SIM_EVENTS[nextEvent].at<=t){const e=SIM_EVENTS[nextEvent++];log(t,e.text,'event');lastEvent=t;if(e.id==='quarry')quarry=true;if(e.id==='storm')neighbours=false;if(e.id==='caravan'){const caravan={resources:{coins:0,berries:50000,crystals:50000},market};for(const k of ['crystals','berries'])settleSale(caravan,k,quote(caravan,k));}if(e.id==='road'){neighbours=true;market.resellAt=t;}}
  // The eclipse comes every two minutes, as in the game: crystals sell dearer while it lasts.
  market.panic=Math.floor(t/PHASE_MS)%2===1;
  // Neighbours buy from the shelves (unless the road is out).
  if(neighbours)resell(market,t);else market.resellAt=t+MARKET.resellSeconds*1000;
  for(const v of village){
   const on=v.plan.some(([a,b])=>t>=a&&t<b);
   // Coming back: nests filled while the player was away, as in the game: the usual cap at full speed,
   // then half speed, for 45 minutes at most.
   if(on&&!v.online){const away=Math.min(t-(v.leftAt??t),OFFLINE_MS);for(const [k,n] of Object.entries(v.flock))if(n){const cyc=SPECIES[k].cycle*1000,full=Math.min(PRODUCTION_CAP,Math.floor(away/cyc)),extra=Math.floor(Math.max(0,away-full*cyc)/(cyc/OFFLINE_RATE));v.resources[SPECIES[k].resource]+=n*SPECIES[k].output*(full+extra);}}
   if(!on&&v.online){
    // Leaving: spend the coins. Every coin spent in the valley lands in Lucy's wallet.
    const next=ORDER.find(k=>(k!=='crystal'||quarry)&&v.flock[k]<2&&v.resources.coins>=SPECIES[k].eggCost)||(quarry&&v.resources.coins>=SPECIES.crystal.eggCost?'crystal':null);
    const herd=Object.values(v.flock).reduce((a,b)=>a+b,0);
    if(next&&herd<8){const c=SPECIES[next].eggCost;v.resources.coins-=c;market.wallet+=c;v.flock[next]++;if(!open)log(t,`Хтось купив яйце за ${c} — гаманець Люсі ожив`,'invest');}
    // Spare coins go on levels and food, which also pay into Lucy's wallet.
    else if(v.resources.coins>100){const c=Math.floor((v.resources.coins-100)/2);v.resources.coins-=c;market.wallet+=c;if(!open)log(t,`Хтось витратив ${c} на рівні драконів — гаманець Люсі ожив`,'invest');}
   }
   if(!on&&v.online)v.leftAt=t;
   v.online=on;if(!on)continue;
   for(const [k,n] of Object.entries(v.flock))if(n)v.resources[SPECIES[k].resource]+=Math.round(n*perMinute(k));
   // Sell what is not needed (keep a few berries to feed the next baby), at whatever Lucy pays now.
   for(const k of ['berries','crystals']){const spare=v.resources[k]-(k==='berries'?6:0);if(spare<=0||price(v,k)<v.accept[k])continue;let n=0;while(n<spare&&price(v,k,n)>=v.accept[k])n++;const q=quote(v,k,n);if(q.units)settleSale(v,k,q);}
  }
  // The shop counts as closed (or reopened) once that lasts five minutes, so a single sale does not flicker it.
  const nowOpen=shopOpen(market)&&market.wallet>=Math.min(price({market},'berries'),price({market},'crystals'));
  pending=nowOpen===open?0:pending+1;
  if(pending>=5){open=nowOpen;pending=0;log(t,open?'Крамниця Люсі знову відкрита':'Люсі збанкрутувала — крамниця закрита, поки хтось не витратить монети',open?'open':'closed');}
  for(const k of ['berries','crystals']){const p=price({market},k);// A price hitting the floor is worth a line the first time, and again after each village event.
   if(p===MARKET.floor[k]&&(floorLogged[k]<0||floorLogged[k]<lastEvent)){floorLogged[k]=t;log(t,`${k==='berries'?'Ягоди':'Кристали'} подешевшали до мінімуму: ${p} за 1`,'drop');}}
  if(t%SAMPLE===0)sample(t);
 }
 return {samples,events,length:WEEK};
}
