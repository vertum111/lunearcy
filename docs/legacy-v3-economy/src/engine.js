/** Local game simulation. No wallet, market price or financial returns are represented. */
export const SPECIES = {
 moss: {name:'Мохолист',kind:'Лісовий дракон',job:'Вирощує сонячні ягоди',resource:'berries',output:3,cycle:14,color:'#84b77a',belly:'#e8dba5',horn:'#c4d28a',desc:'Трохи сонний садівник. Де він ступає, прокидаються паростки.',eggCost:35},
 ember: {name:'Жарик',kind:'Вогняний дракон',job:'Виплавляє жарокамінь',resource:'embers',output:2,cycle:20,color:'#c77858',belly:'#f5d197',horn:'#e5ab6c',desc:'Збирає тепло під крилами. Любить хрумкі ягоди й гарячі камінці.',eggCost:50},
 stone: {name:'Кремінь',kind:'Кам’яний дракон',job:'Видобуває місячну руду',resource:'ore',output:2,cycle:24,color:'#8b94ac',belly:'#e2ddc5',horn:'#bdc6da',desc:'Тихий шукач скарбів. Чує кристали навіть крізь товщу скелі.',eggCost:60},
 mist: {name:'Туманник',kind:'Туманний дракон',job:'Збирає драконячі плоди в тумані',resource:'fruit',output:1,cycle:30,color:'#b9b2d6',belly:'#efe9f6',horn:'#d8d2ee',desc:'Народився з останнього клаптя туману. Знаходить стиглі плоди там, куди не дивляться інші.',eggCost:80,unlock:'restored'},
 crystal: {name:'Кришталик',kind:'Кришталевий дракон',job:'Вирощує уламки з кристалів',resource:'relics',output:1,cycle:40,color:'#4a5bb0',belly:'#c9d2f5',horn:'#9fe8ff',desc:'Співає разом із кристалами кар’єру. Кожна пісня лишає по собі сяючий уламок.',eggCost:110,unlock:'quarry'}
};
// Extra species appear later in the story: mist after the Heart is restored, crystal once the quarry is open.
export function speciesLocked(s,id){const u=SPECIES[id]?.unlock;if(u==='restored'&&!s.restored)return 'Відкриється після відновлення Серця долини.';if(u==='quarry'&&!s.locations?.quarry?.unlocked)return 'Відкриється разом із Місячним кар’єром.';return '';}
export const RESOURCE = {coins:'Монети',berries:'Ягоди',embers:'Жарокамінь',ore:'Руда',relics:'Уламки',fruit:'Драконячі плоди'};
// Fruit tree growing shifts (after Hatch Dragons): one shift at a time, harvest before planting the next.
export const TREE_SHIFTS={
 tiny:{name:'Крихітний урожай',seconds:30,yield:1,cost:{}},
 small:{name:'Малий урожай',seconds:180,yield:6,cost:{coins:20}},
 rich:{name:'Щедрий урожай',seconds:600,yield:15,cost:{coins:50}}
};
export const HURRY_COST={coins:5};
// Goals: progress is derived from state; rewards are claimed once.
export const GOALS=[
 {id:'arrivals',title:'Нові мешканці',text:'Вилупи двох драконів.',target:2,progress:s=>s.dragons.filter(d=>d.stage!=='egg').length,reward:{coins:15}},
 {id:'impatient',title:'Нетерплячий',text:'Поквап одне яйце.',target:1,progress:s=>s.hurried,reward:{coins:10}},
 {id:'gardener',title:'Садівник',text:'Збери 10 драконячих плодів.',target:10,progress:s=>s.fruitHarvested,reward:{coins:20}},
 {id:'treat',title:'Ласунка',text:'Пригости дракона плодами до рівня 2.',target:2,progress:s=>Math.max(...s.dragons.map(d=>d.level)),reward:{fruit:3}},
 {id:'neighbour',title:'Добрий сусід',text:'Виконай 3 замовлення Мари.',target:3,progress:s=>s.trades,reward:{coins:25}},
 {id:'trio',title:'Три характери',text:'Вирости три різні види.',target:3,progress:s=>new Set(s.dragons.filter(d=>d.stage==='adult').map(d=>d.species)).size,reward:{relics:2}},
 {id:'crafter',title:'Майстер оберегів',text:'Створи оберіг.',target:1,progress:s=>s.crafted,reward:{coins:20}},
 {id:'traveller',title:'Мандрівник',text:'Заверши експедицію.',target:1,progress:s=>s.expeditions,reward:{fruit:4}},
 {id:'pack',title:'Зграя',text:'Вирости чотирьох дорослих драконів.',target:4,progress:s=>s.dragons.filter(d=>d.stage==='adult').length,reward:{relics:2}},
 {id:'master',title:'Майстер справи',text:'Підніми дракона до рівня 3.',target:3,progress:s=>Math.max(...s.dragons.map(d=>d.level)),reward:{relics:3}}
];
export function goalStatus(s){return GOALS.map(g=>{const value=Math.min(g.target,g.progress(s)||0);return {...g,value,done:value>=g.target,claimed:s.goalsClaimed.includes(g.id)};});}
export function fruitToLevel(d){return d.level*2;}
// Dragon score: a single number for the whole flock, like the reference's dragon score.
export function dragonScore(s){return s.dragons.reduce((n,d)=>n+(d.stage==='egg'?2:d.stage==='baby'?5:10*d.level),0);}
export const PHASE_MS=120000, HATCH_MS=8000, MAX_SLOTS=8, MAX_LEVEL=5, MAX_CHARMS=5, PRODUCTION_CAP=5;
export const BERRY_EGG_COST={moss:18,ember:24,stone:30,mist:40,crystal:55};
export const LOCATIONS={
 grove:{name:'Сонячний гай',description:'Дім перших драконів. Розвинений сад дає Мохолистам більше ягід.',specialist:'moss',unlockCost:{}},
 quarry:{name:'Місячний кар’єр',description:'Кристали співають під землею. Кам’яні дракони знаходять тут більше руди.',specialist:'stone',unlockCost:{coins:30,ore:4,embers:2}},
 ruins:{name:'Стародавні руїни',description:'Після трьох походів відкривається далекий притулок. Вогняні дракони збирають його давнє тепло.',specialist:'ember',unlockCost:{coins:45,relics:6,embers:4}}
};
export const SLOTS=[
 {id:0,location:'grove',x:50,y:49},{id:1,location:'grove',x:77,y:68},{id:2,location:'grove',x:27,y:68},{id:3,location:'grove',x:18,y:35},
 {id:4,location:'quarry',x:35,y:60},{id:5,location:'quarry',x:72,y:44},
 {id:6,location:'ruins',x:35,y:60},{id:7,location:'ruins',x:72,y:44}
];
const ORDER_TYPES=[{resource:'berries',quantity:6,pay:18},{resource:'embers',quantity:4,pay:28},{resource:'ore',quantity:4,pay:32}];
const own=(o,k)=>Object.hasOwn(o,k);
const integer=(n,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
const timeValue=n=>{if(!Number.isFinite(n)||n<0||!Number.isSafeInteger(Math.floor(n)))throw Error('Непридатний час гри.');return Math.floor(n);};
const nameValid=n=>typeof n==='string'&&[...n].length<=20&&/^[\p{L}\p{M}\p{N} .’'\-]+$/u.test(n);
function newDragon(id,species,slot,now){return {id,species,slot,location:SLOTS[slot].location,name:null,stage:'egg',hatchAt:now+HATCH_MS,feeds:0,level:1,xp:0,ready:0,readyAmount:0,next:0};}
export function createState(now=Date.now()){
 now=timeValue(now);
 return {version:3,start:now,last:now,forageAt:0,restored:false,chapter2Complete:false,trades:0,collected:0,location:'grove',locations:{grove:{unlocked:true,level:1},quarry:{unlocked:false,level:0},ruins:{unlocked:false,level:0}},resources:{coins:90,berries:12,embers:0,ore:0,relics:0,fruit:0},dragons:[newDragon(1,'moss',0,now)],nextId:2,slots:3,crafted:0,phaseOverride:null,orders:ORDER_TYPES.map((o,i)=>({...o,id:i+1,left:3,limit:3})),merchantBudget:234,orderBatch:1,nextOrderId:4,coinSpent:0,totalProduced:{berries:0,embers:0,ore:0},expedition:null,expeditions:0,tree:{shift:null,ends:0},fruitHarvested:0,hurried:0,goalsClaimed:[],journal:['Ти знайшов перше яйце. Незабаром воно прокинеться.'],tutorial:0};
}
export function dragonName(d){return d.name||SPECIES[d.species]?.name||'Дракон';}
export function availableSlots(s,location){return SLOTS.filter(slot=>slot.id<s.slots&&(!location||slot.location===location));}
export function production(s,d){
 const sp=SPECIES[d.species],location=d.location||SLOTS[d.slot??0].location,level=s.locations?.[location]?.level??1;
 const bonus=LOCATIONS[location].specialist===d.species?Math.max(0,level-1)+(location==='grove'?0:1):0;
 return {resource:sp.resource,output:sp.output*d.level+bonus,cycle:sp.cycle,cap:PRODUCTION_CAP,away:!!s.expedition?.team.includes(d.id),bonus,stored:d.readyAmount??d.ready*sp.output*d.level};
}
/** Canonical departure reward; callers validate team eligibility before committing actions. */
export function expeditionReward(s,teamIds){
 const advanced=teamIds.reduce((n,id)=>n+Math.max(0,(s.dragons.find(d=>d.id===id)?.level||1)-3),0);
 return 2+s.crafted+Math.min(teamIds.length,3)+Math.min(advanced,3)+(s.locations.ruins.unlocked?1:0);
}
export function upgradeCost(s,d){if(d.level>=MAX_LEVEL)return null;return d.level<3?{coins:d.level*25,berries:d.level*3}:d.level===3?{coins:60,berries:9,embers:2,ore:2}:{coins:80,berries:12,relics:2};}
export function expandCost(s){return s.slots>=MAX_SLOTS?null:{coins:45+15*Math.max(0,s.slots-4),ore:2+Math.max(0,s.slots-4)};}
export function locationUpgradeCost(s,location){const level=s.locations[location]?.level;if(!level||level>=3)return null;return {coins:20*level,ore:2*level,embers:2*level,berries:6*level};}
export function locationRequirements(s,location){
 if(!own(LOCATIONS,location))return {met:false,reasons:['Невідома місцевість.']};
 const reasons=[];
 if(location==='quarry'&&!s.restored)reasons.push('Віднови Серце долини.');
 if(location==='ruins'){if(!s.locations.quarry.unlocked)reasons.push('Відкрий Місячний кар’єр.');if(s.slots<6)reasons.push('Відкрий друге гніздо кар’єру.');if(s.expeditions<3)reasons.push(`Заверши три експедиції: ${s.expeditions}/3.`);}
 return {met:reasons.length===0,reasons};
}
export function phase(s,now=Date.now()){
 now=timeValue(now);
 if(s.phaseOverride&&now<s.phaseOverride.until)return {red:s.phaseOverride.red,left:s.phaseOverride.until-now};
 const elapsed=Math.max(0,now-s.start);return {red:Math.floor(elapsed/PHASE_MS)%2===1,left:PHASE_MS-elapsed%PHASE_MS};
}
function log(s,msg){s.journal.unshift(msg);s.journal=s.journal.slice(0,32);return msg;}
function spend(s,cost){
 for(const [k,n] of Object.entries(cost))if(!own(RESOURCE,k)||!integer(n)||s.resources[k]<n)throw Error(`Не вистачає: ${RESOURCE[k]||k}.`);
 for(const [k,n] of Object.entries(cost))s.resources[k]-=n;
 if(cost.coins){s.merchantBudget+=cost.coins;s.coinSpent+=cost.coins;}
}
function awardProduction(s,d){const p=production(s,d),amount=p.stored;s.resources[p.resource]+=amount;if(own(s.totalProduced,p.resource))s.totalProduced[p.resource]+=amount;if(p.resource==='fruit')s.fruitHarvested+=amount;d.ready=0;d.readyAmount=0;s.collected++;return amount;}
export function tick(s,now=Date.now()){
 now=Math.max(timeValue(now),s.last);if(s.phaseOverride&&now>=s.phaseOverride.until)s.phaseOverride=null;
 for(const d of s.dragons){
  if(d.stage!=='adult'||s.expedition?.team.includes(d.id)||d.ready>=PRODUCTION_CAP)continue;
  const p=production(s,d),cycles=Math.floor((now-d.next)/(p.cycle*1000))+1;
  if(cycles>0){const added=Math.min(PRODUCTION_CAP-d.ready,cycles);d.ready+=added;d.readyAmount=(d.readyAmount??0)+added*p.output;d.next+=cycles*p.cycle*1000;}
 }
 s.last=now;return s;
}
export function marketStatus(s){
 const reserved=s.orders.reduce((n,o)=>n+o.pay*o.left,0),available=Math.max(0,s.merchantBudget-reserved);let remaining=available,refreshable=0;
 for(const o of s.orders)if(o.left===0&&remaining>=o.pay){remaining-=o.pay;refreshable++;}
 return {budget:s.merchantBudget,reserved,available,refreshable,canRefresh:refreshable>0};
}
export function act(s,a,now=Date.now()){
 if(!a||typeof a!=='object'||typeof a.type!=='string')throw Error('Невідома дія.');
 tick(s,now);now=s.last;const d=s.dragons.find(d=>d.id===a.id);let msg='';
 switch(a.type){
 case 'hatch':
  if(!d||d.stage!=='egg')throw Error('Яйце вже вилупилось.');if(now<d.hatchAt)throw Error('Яйце ще зігрівається.');d.stage='baby';msg=`${dragonName(d)} вилупився! Нагодуй малюка тричі.`;break;
 case 'feed':
  if(!d||d.stage!=='baby')throw Error('Цьому дракону зараз не потрібне годування.');spend(s,{berries:2});d.feeds++;
  if(d.feeds>=3){d.stage='adult';d.next=now+SPECIES[d.species].cycle*1000;msg=`${dragonName(d)} виріс і починає працювати!`;}else msg=`Ще ${3-d.feeds} годування до дорослішання.`;break;
 case 'collect':{
  if(!d||d.stage!=='adult'||!d.ready)throw Error('Урожай ще не готовий.');if(s.expedition?.team.includes(d.id))throw Error('Дочекайся повернення дракона.');
  const wasFull=d.ready>=PRODUCTION_CAP,resource=SPECIES[d.species].resource,amount=awardProduction(s,d);
  if(wasFull||d.next<=now)d.next=now+SPECIES[d.species].cycle*1000;msg=`+${amount} · ${RESOURCE[resource]}`;break;}
 case 'buyEgg':{
  if(!own(SPECIES,a.species))throw Error('Невідомий вид.');if(speciesLocked(s,a.species))throw Error(speciesLocked(s,a.species));if(new Set(s.dragons.map(d=>d.species)).size<3&&s.dragons.some(d=>d.species===a.species))throw Error('Спершу запроси всі три види. Дублікати — після відкриття трійки.');
  const free=availableSlots(s).filter(slot=>!s.dragons.some(d=>d.slot===slot.id));
  const slot=a.slot===undefined?(free.find(slot=>slot.location===s.location)||free[0])?.id:a.slot;
  if(!integer(slot,0,MAX_SLOTS-1)||!free.some(f=>f.id===slot))throw Error('Немає вільного відкритого гнізда.');
  if(a.payment&&a.payment!=='berries'&&a.payment!=='coins')throw Error('Невідомий спосіб обміну.');
  spend(s,a.payment==='berries'?{berries:BERRY_EGG_COST[a.species]}:{coins:SPECIES[a.species].eggCost});s.dragons.push(newDragon(s.nextId++,a.species,slot,now));msg='Нове яйце вже у притулку.';break;}
 case 'upgrade':
  if(!d||d.stage!=='adult')throw Error('Спочатку вирости дракона.');if(s.expedition?.team.includes(d.id))throw Error('Дочекайся повернення дракона.');if(d.level>=MAX_LEVEL)throw Error('Дракон уже досяг п’ятого рівня.');if(d.level>=3&&!s.restored)throw Error('Віднови Серце долини для рівнів 4–5.');spend(s,upgradeCost(s,d));d.level++;d.xp=0;msg=`${dragonName(d)} · рівень ${d.level}. Нові цикли дадуть більше ресурсів.`;break;
 case 'rename':{
  if(!d)throw Error('Дракона не знайдено.');if(typeof a.name!=='string')throw Error('Введи ім’я дракона.');const name=a.name.trim().replace(/\s+/g,' ');
  if(name&&!nameValid(name))throw Error('Ім’я: до 20 літер, цифр, пробілів або дефісів.');d.name=name||null;msg=`Тепер твого друга звуть ${dragonName(d)}.`;break;}
 case 'travel':
  if(!own(LOCATIONS,a.location)||!s.locations[a.location].unlocked)throw Error('Цю місцевість ще не відкрито.');s.location=a.location;msg=`Ти у місцевості «${LOCATIONS[a.location].name}».`;break;
 case 'moveDragon':{
  if(!d)throw Error('Дракона не знайдено.');if(s.expedition?.team.includes(d.id))throw Error('Дочекайся повернення дракона.');
  if(!integer(a.slot,0,s.slots-1)||s.dragons.some(other=>other.slot===a.slot))throw Error('Обери вільне відкрите гніздо.');
  const amount=d.ready?awardProduction(s,d):0;d.slot=a.slot;d.location=SLOTS[a.slot].location;if(d.stage==='adult')d.next=now+SPECIES[d.species].cycle*1000;
  msg=`${dragonName(d)} переїхав: ${LOCATIONS[d.location].name}.${amount?` Зібрано ${amount} ресурсів перед переїздом.`:''}`;break;}
 case 'unlockLocation':{
  if(!own(LOCATIONS,a.location)||a.location==='grove')throw Error('Невідома нова місцевість.');if(s.locations[a.location].unlocked)throw Error('Місцевість уже відкрита.');const requirements=locationRequirements(s,a.location);if(!requirements.met)throw Error(requirements.reasons.join(' '));
  spend(s,LOCATIONS[a.location].unlockCost);s.locations[a.location]={unlocked:true,level:1};s.slots=Math.max(s.slots,a.location==='quarry'?5:7);msg=`Відкрито ${LOCATIONS[a.location].name}! Нове гніздо чекає мешканця.`;break;}
 case 'upgradeLocation':{
  if(!own(LOCATIONS,a.location)||!s.locations[a.location].unlocked)throw Error('Спочатку відкрий місцевість.');const cost=locationUpgradeCost(s,a.location);if(!cost)throw Error('Місцевість уже має третій рівень.');spend(s,cost);s.locations[a.location].level++;msg=`${LOCATIONS[a.location].name} · рівень ${s.locations[a.location].level}. Місцевим фахівцям тут працюється краще.`;break;}
 case 'expand':{
  if(!s.restored)throw Error('Спочатку віднови Серце долини — воно відкриє четверте гніздо.');if(s.slots>=MAX_SLOTS)throw Error('Усі вісім гнізд відкриті.');const target=SLOTS[s.slots];if(!s.locations[target.location].unlocked)throw Error(`Спочатку відкрий ${LOCATIONS[target.location].name}.`);spend(s,expandCost(s));s.slots++;msg='Туман відступає. Нове гніздо відкрите.';break;}
 case 'craft':
  if(s.crafted>=MAX_CHARMS)throw Error('Усі п’ять оберегів створені.');spend(s,{embers:2,ore:2});s.crafted++;msg='Створено оберіг. Майбутні експедиції принесуть більше уламків.';break;
 case 'sell':{
  const o=s.orders.find(o=>o.id===a.id);if(!o||!o.left)throw Error('Замовлення виконано повністю.');if(s.merchantBudget<o.pay)throw Error('Бюджет торговця вичерпано.');spend(s,{[o.resource]:o.quantity});s.resources.coins+=o.pay;s.merchantBudget-=o.pay;o.left--;s.trades++;msg=`Замовлення виконано · +${o.pay} монет`;break;}
 case 'refreshOrders':{
  let available=marketStatus(s).available;const replacements=[];
  for(let i=0;i<s.orders.length;i++){const o=s.orders[i];if(o.left===0&&available>=o.pay){available-=o.pay;replacements.push([i,{id:s.nextOrderId+replacements.length,resource:o.resource,quantity:o.quantity,pay:o.pay,left:1,limit:1}]);}}
  if(!replacements.length)throw Error('Для нових замовлень потрібні закриті заявки та вільний бюджет. Покупки поповнюють бюджет Мари.');
  for(const [i,o] of replacements)s.orders[i]=o;s.nextOrderId+=replacements.length;s.orderBatch++;msg=`Мара відкрила ${replacements.length} нові замовлення зі свого бюджету.`;break;}
 case 'buyFood':spend(s,{coins:20});s.resources.berries+=6;msg='+6 ягід для малюків.';break;
 case 'forage':if(now<s.forageAt)throw Error('Ягоди ще дозрівають.');s.resources.berries+=3;s.forageAt=now+20000;msg='+3 ягоди з лісової галявини.';break;
 case 'restore':
  if(s.restored)throw Error('Серце долини вже відновлене.');if(new Set(s.dragons.filter(d=>d.stage==='adult').map(d=>d.species)).size<3)throw Error('Потрібні дорослі дракони усіх трьох видів.');if(!s.crafted||!s.expeditions)throw Error('Створи оберіг та заверши першу експедицію.');spend(s,{embers:4,ore:4,relics:6});s.restored=true;s.slots=Math.max(s.slots,4);msg='Серце долини прокинулось! Четверте гніздо відкрите. Перший розділ завершено.';break;
 case 'delve':
  if(!s.expedition||now<s.expedition.ends)throw Error('Команда ще не дісталась брами.');if(s.expedition.delved)throw Error('Сховище вже відкрите.');spend(s,{embers:2,ore:2});s.expedition.delved=true;s.expedition.duration=10000;s.expedition.ends=now+10000;s.expedition.reward+=3;msg='Браму відкрито. Ще 10 секунд шляху за +3 уламками.';break;
 case 'expedition':{
  if(s.expedition)throw Error('Команда вже в експедиції.');if(!phase(s,now).red)throw Error('Руїни відкриються під час затемнення.');const team=a.team??s.dragons.filter(d=>d.stage==='adult').map(d=>d.id);
  if(!Array.isArray(team)||new Set(team).size!==team.length||team.some(id=>!s.dragons.some(d=>d.id===id&&d.stage==='adult')))throw Error('Обери різних дорослих драконів.');if(!team.length)throw Error('Потрібен хоча б один дорослий дракон.');
  spend(s,{berries:3});s.expedition={team:[...team],delved:false,duration:20000,ends:now+20000,reward:expeditionReward(s,team)};msg='Дракони вирушили до руїн. Виробництво команди тимчасово зупинене.';break;}
 case 'claim':{
  if(!s.expedition||now<s.expedition.ends)throw Error('Експедиція ще триває.');s.resources.relics+=s.expedition.reward;s.resources.coins+=15;
  for(const id of s.expedition.team){const dragon=s.dragons.find(d=>d.id===id);dragon.next=now+SPECIES[dragon.species].cycle*1000;}
  s.expedition=null;s.expeditions++;msg='Команда повернулась! +15 монет і давні уламки.';break;}
 case 'completeChapter':
  if(s.chapter2Complete)throw Error('Другий розділ уже завершено.');if(!Object.values(s.locations).every(l=>l.unlocked)||s.dragons.filter(d=>d.stage==='adult').length<6||!s.dragons.some(d=>d.level>=3)||s.expeditions<3||s.crafted<3)throw Error('Відкрий три місцевості, вирости шість драконів, підніми одного до рівня 3, створи три обереги та заверши три походи.');
  spend(s,{ore:12,embers:12,relics:12});s.chapter2Complete=true;msg='Союз долини засновано! Другий розділ завершено. Усі місцевості тепер мають спільний дім.';break;
 case 'hurry':
  if(!d||d.stage!=='egg')throw Error('Поквапити можна лише яйце.');if(now>=d.hatchAt)throw Error('Яйце вже готове вилупитись.');spend(s,HURRY_COST);d.hatchAt=now;s.hurried++;msg='Яйце тріщить — можна вилуплювати!';break;
 case 'plantTree':{
  const shift=TREE_SHIFTS[a.shift];if(!shift)throw Error('Невідомий урожай.');if(s.tree.shift)throw Error(now>=s.tree.ends?'Спершу збери плоди.':'Дерево вже росте.');
  spend(s,shift.cost);s.tree={shift:a.shift,ends:now+shift.seconds*1000};msg=`${shift.name}: дерево почало рости.`;break;}
 case 'harvestTree':{
  if(!s.tree.shift)throw Error('Дерево ще не посаджене.');if(now<s.tree.ends)throw Error('Плоди ще дозрівають.');
  const amount=TREE_SHIFTS[s.tree.shift].yield;s.resources.fruit+=amount;s.fruitHarvested+=amount;s.tree={shift:null,ends:0};msg=`+${amount} · ${RESOURCE.fruit}`;break;}
 case 'feedFruit':{
  if(!d||d.stage!=='adult')throw Error('Плоди їдять лише дорослі дракони.');if(s.expedition?.team.includes(d.id))throw Error('Дочекайся повернення дракона.');
  if(d.level>=MAX_LEVEL)throw Error('Дракон уже досяг п’ятого рівня.');if(d.level>=3&&!s.restored)throw Error('Віднови Серце долини для рівнів 4–5.');
  spend(s,{fruit:1});d.xp++;if(d.xp>=fruitToLevel(d)){d.level++;d.xp=0;msg=`${dragonName(d)} · рівень ${d.level}! Тепер дає більше ресурсів.`;}else msg=`Смакота! Ще ${fruitToLevel(d)-d.xp} до рівня ${d.level+1}.`;break;}
 case 'claimGoal':{
  const g=goalStatus(s).find(g=>g.id===a.goal);if(!g)throw Error('Невідома ціль.');if(g.claimed)throw Error('Нагороду вже отримано.');if(!g.done)throw Error('Ціль ще не виконана.');
  for(const[k,n]of Object.entries(g.reward))s.resources[k]+=n;s.goalsClaimed.push(g.id);msg=`Ціль «${g.title}» виконано!`;break;}
 case 'demoPhase':s.phaseOverride={red:!phase(s,now).red,until:now+60000};msg=phase(s,now).red?'Демо: затемнення на 60 секунд. Руїни відкриті.':'Демо: сонячна фаза на 60 секунд.';break;
 default:throw Error('Невідома дія.');
 }
 log(s,msg);return msg;
}

export function validate(s){
 if(!s||s.version!==3||!s.resources||!Array.isArray(s.dragons)||!s.dragons.length||s.dragons.length>MAX_SLOTS||!s.dragons.some(d=>d.species==='moss'))throw Error('Непридатне збереження.');
 for(const k of Object.keys(RESOURCE))if(!integer(s.resources[k]))throw Error('Пошкоджений баланс.');
 if(!integer(s.slots,3,MAX_SLOTS)||s.dragons.length>s.slots||!integer(s.nextId,1)||!integer(s.merchantBudget)||!integer(s.nextOrderId,1))throw Error('Пошкоджений притулок.');
 if(new Set(s.dragons.map(d=>d.id)).size!==s.dragons.length||new Set(s.dragons.map(d=>d.slot)).size!==s.dragons.length)throw Error('Повторний дракон або зайняте гніздо.');
 for(const d of s.dragons){
  if(!integer(d.id,1)||!own(SPECIES,d.species)||!['egg','baby','adult'].includes(d.stage)||!integer(d.slot,0,s.slots-1)||d.location!==SLOTS[d.slot].location||!integer(d.level,1,MAX_LEVEL)||!integer(d.feeds,0,3)||!integer(d.ready,0,PRODUCTION_CAP)||!integer(d.readyAmount)||!integer(d.next)||!integer(d.hatchAt)||(d.name!==null&&!nameValid(d.name)))throw Error('Пошкоджена колекція.');
  if(d.id>=s.nextId||!s.locations?.[d.location]?.unlocked||(d.ready===0&&d.readyAmount!==0))throw Error('Пошкоджена належність дракона.');
 }
 for(const id of Object.keys(LOCATIONS)){const l=s.locations?.[id];if(!l||typeof l.unlocked!=='boolean'||!integer(l.level,l.unlocked?1:0,l.unlocked?3:0))throw Error('Пошкоджені місцевості.');}
 if(!s.locations.grove.unlocked||!own(LOCATIONS,s.location)||!s.locations[s.location].unlocked||(s.slots>=5&&!s.locations.quarry.unlocked)||(s.slots>=7&&!s.locations.ruins.unlocked))throw Error('Пошкоджені відкриття місцевостей.');
 if((s.restored&&s.slots<4)||(s.locations.quarry.unlocked&&(!s.restored||s.slots<5))||(s.locations.ruins.unlocked&&(!s.locations.quarry.unlocked||s.slots<7))||(s.chapter2Complete&&(!s.restored||!Object.values(s.locations).every(l=>l.unlocked))))throw Error('Пошкоджена послідовність розділів.');
 if(!Array.isArray(s.orders)||s.orders.length!==3||new Set(s.orders.map(o=>o.id)).size!==3)throw Error('Пошкоджений ринок.');
 for(const o of s.orders)if(!integer(o.id,1)||o.id>=s.nextOrderId||!['berries','embers','ore'].includes(o.resource)||!integer(o.quantity,1)||!integer(o.pay,1)||!integer(o.limit,1,3)||!integer(o.left,0,o.limit))throw Error('Пошкоджене замовлення.');
 if(new Set(s.orders.map(o=>o.resource)).size!==3)throw Error('Пошкоджені види замовлень.');
 for(const k of ['start','last','forageAt','trades','collected','crafted','expeditions','coinSpent','orderBatch'])if(!integer(s[k]))throw Error('Пошкоджений прогрес.');
 if(s.last<s.start||typeof s.restored!=='boolean'||typeof s.chapter2Complete!=='boolean'||!Array.isArray(s.journal)||s.journal.some(m=>typeof m!=='string'))throw Error('Пошкоджений розділ.');
 for(const k of ['berries','embers','ore'])if(!integer(s.totalProduced?.[k]))throw Error('Пошкоджений облік виробництва.');
 if(!s.tree||(s.tree.shift!==null&&!own(TREE_SHIFTS,s.tree.shift))||!integer(s.tree.ends)||!integer(s.fruitHarvested)||!integer(s.hurried)||!Array.isArray(s.goalsClaimed)||s.goalsClaimed.some(id=>!GOALS.some(g=>g.id===id))||new Set(s.goalsClaimed).size!==s.goalsClaimed.length||s.dragons.some(d=>!integer(d.xp,0,MAX_LEVEL*2)))throw Error('Пошкоджені сад або цілі.');
 if(s.phaseOverride&&(typeof s.phaseOverride.red!=='boolean'||!integer(s.phaseOverride.until)))throw Error('Пошкоджена фаза.');
 if(s.expedition){const e=s.expedition;if(!Array.isArray(e.team)||!e.team.length||new Set(e.team).size!==e.team.length||e.team.some(id=>!s.dragons.some(d=>d.id===id&&d.stage==='adult'))||!integer(e.ends)||!integer(e.duration,1)||!integer(e.reward,1)||typeof e.delved!=='boolean')throw Error('Пошкоджена експедиція.');}
 return true;
}
export function hydrate(raw,now=Date.now()){
 if(!raw||![1,2,3].includes(raw.version)||!Array.isArray(raw.dragons)||!raw.dragons.length||!raw.resources||!Array.isArray(raw.orders))throw Error('Непридатне збереження.');
 const s=JSON.parse(JSON.stringify(raw)),legacy=s.version<3;
 if(legacy){
  s.version=3;s.slots=Math.max(s.slots||3,s.dragons.length);s.location='grove';s.locations={grove:{unlocked:true,level:1},quarry:{unlocked:s.slots>=5,level:s.slots>=5?1:0},ruins:{unlocked:s.slots>=7,level:s.slots>=7?1:0}};
  s.dragons=s.dragons.map((d,i)=>({...d,slot:i,location:SLOTS[i]?.location,name:null,readyAmount:d.ready*SPECIES[d.species]?.output*d.level}));
  s.forageAt??=0;s.restored??=false;s.trades??=s.orders.reduce((n,o)=>n+3-o.left,0);s.collected??=0;s.crafted??=0;
  s.orders=s.orders.map(o=>({...o,limit:o.limit||3}));s.nextOrderId=Math.max(0,...s.orders.map(o=>o.id))+1;s.orderBatch=1;s.coinSpent=0;s.totalProduced={berries:0,embers:0,ore:0};s.chapter2Complete=false;
  if(s.expedition){s.expedition.duration??=20000;s.expedition.delved??=false;}
 }
 s.resources.fruit??=0;s.tree??={shift:null,ends:0};s.fruitHarvested??=0;s.hurried??=0;s.goalsClaimed??=[];for(const d of s.dragons)d.xp??=0;
 validate(s);return tick(s,now);
}
export function achievements(s){return [
 {id:'first-hatch',title:'Перше знайомство',description:'Вилупи першого дракона.',earned:s.dragons.some(d=>d.stage!=='egg')},
 {id:'trio',title:'Три характери',description:'Вирости три різні види.',earned:new Set(s.dragons.filter(d=>d.stage==='adult').map(d=>d.species)).size>=3},
 {id:'merchant',title:'Добрі сусіди',description:'Виконай три замовлення.',earned:s.trades>=3},
 {id:'heart',title:'Серце долини',description:'Віднови святилище.',earned:s.restored},
 {id:'explorer',title:'За туманом',description:'Відкрий три місцевості.',earned:Object.values(s.locations).every(l=>l.unlocked)},
 {id:'union',title:'Спільний дім',description:'Заверши другий розділ.',earned:s.chapter2Complete}
 ];}
export function objective(s){
 const first=s.dragons.find(d=>d.species==='moss');
 const goal=(step,title,text,tab='home',id=first?.id,chapter=1,total=7)=>({step,title,text,tab,id,chapter,total});
 if(!s.restored){
  if(first.stage!=='adult')return goal(0,first.stage==='egg'?'Перше пробудження':'Нагодуй малого друга',first.stage==='egg'?'Допоможи першому яйцю вилупитись.':`Годування ${first.feeds}/3. Ягоди можна безкоштовно збирати в лісі.`);
  if(!s.collected)return goal(1,'Перший урожай','Дочекайся ягід Мохолиста та збери їх.');
  if(!s.trades)return goal(2,'Знайомство з Марою','Виконай перше замовлення на ринку.','market');
  for(const species of ['ember','stone']){const d=s.dragons.find(d=>d.species===species);if(!d)return goal(3,`Запроси: ${SPECIES[species].name}`,'Купи яйце за монети або обміняй на ягоди.','eggs');if(d.stage!=='adult')return goal(3,`Вирости: ${SPECIES[species].name}`,'Вилупи яйце та нагодуй малюка тричі.','home',d.id);}
  if(!s.crafted)return goal(4,'Магія співпраці','Збери 2 жарокамені та 2 руди. Створи оберіг.','collection');
  if(!s.expeditions)return goal(5,'За межі знайомого','У затемненні обери команду та вирушай до руїн.','expedition');
  return goal(6,'Серце долини','Віднови святилище: 4 жарокамені, 4 руди та 6 уламків.','collection');
 }
 const next=(step,title,text,tab='collection')=>goal(step,title,text,tab,first?.id,2,5);
 if(s.chapter2Complete)return next(5,'Союз долини','Два розділи завершені. Розвивай свої місцевості та вирощуй нових друзів.');
 if(!s.locations.quarry.unlocked)return next(0,'Новий горизонт','Відкрий Місячний кар’єр: 30 монет, 4 руди та 2 жарокамені.','locations');
 if(!s.locations.ruins.unlocked)return next(1,'Стародавній притулок','Відкрий друге гніздо кар’єру — шосте в долині. Заверши три експедиції та відкрий Стародавні руїни.','locations');
 if(s.dragons.filter(d=>d.stage==='adult').length<6)return next(2,'Велика зграя','Вирости шість драконів. Обмін ягід на яйця завжди доступний.','eggs');
 if(!s.dragons.some(d=>d.level>=3))return next(3,'Майстер своєї справи','Покращи одного дорослого дракона до третього рівня.','home');
 if(s.crafted<3)return next(3,'Обереги єдності','Створи три обереги для нових мандрівок.');
 return next(4,'Спільний дім','Заснуй Союз долини: 12 руди, 12 жарокаменів та 12 уламків.');
}
