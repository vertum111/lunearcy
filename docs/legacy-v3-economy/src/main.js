import * as E from './engine.js';
import {icon,egg,dragon,gem,navIcon,phaseGlyph} from './art.js';
import {mountWorld} from './world.js';
import {setSound,sound} from './audio.js';
import './game.css';
import './skin.css';
import {lang,setLang,LANGS,startI18n,translateNode} from './i18n.js';

const session=new URLSearchParams(location.search).get('session');
const KEY=session?`dragon-demo-${session}`:'lunearcy-sanctuary-v1',PREF=KEY+'-ui';
let state,hasSave=false,prefs={sound:true,motion:true,tutorial:true,tut:0,started:false};
let awayMs=0;
try{const raw=localStorage.getItem(KEY);hasSave=Boolean(raw);const parsed=raw?JSON.parse(raw):null;awayMs=parsed?Math.max(0,Date.now()-(parsed.last||Date.now())):0;state=parsed?E.hydrate(parsed):E.createState();}catch{try{const raw=localStorage.getItem(KEY);if(raw)localStorage.setItem(KEY+'-broken',raw);}catch{}state=E.createState();hasSave=false;setTimeout(()=>toast('Збереження пошкоджене — почато нову пригоду. Стару копію збережено.','error'),3000);}
try{prefs={...prefs,...JSON.parse(localStorage.getItem(PREF)||'{}')};}catch{}
// Saves from before the fog-of-war intro already know the valley.
if(prefs.fog===undefined)prefs.fog=hasSave?2:0;
try{if(hasSave&&!localStorage.getItem(PREF))prefs.tutorial=false;}catch{}
setSound(prefs.sound);
let started=false,tab='home',selected=state.dragons[0]?.id,panelOpen=false,teamIds=null,chosenSlot=null,locationId='grove',world,lastSignature='',toastTimer,activeEventUntil=0;
let onchain=null,nearBusy=false,nearResult=null,nearError='',nearCreature=null,nearCooldown=0,nearLocalId=null,nearRecords={};
try{nearRecords=JSON.parse(localStorage.getItem(KEY+'-near')||'{}');}catch{}
const app=document.querySelector('#app');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const seconds=ms=>Math.max(0,Math.ceil(ms/1000));
const clock=ms=>`${Math.floor(seconds(ms)/60)}:${String(seconds(ms)%60).padStart(2,'0')}`;
const resourceIcon={coins:'coin',berries:'berry',embers:'flame',ore:'ore',relics:'relics',fruit:'fruit'};
const resourceForms={coins:['монета','монети','монет'],berries:['ягода','ягоди','ягід'],embers:['жарокамінь','жарокамені','жарокаменів'],ore:['руда','руди','руди'],relics:['уламок','уламки','уламків'],fruit:['плід','плоди','плодів']};
// Developer shortcuts (eclipse toggle) only with ?debug in the URL.
const DEBUG=new URLSearchParams(location.search).has('debug');
function plural(n,forms){const mod=n%100,i=mod>=11&&mod<=14?2:n%10===1?0:n%10>=2&&n%10<=4?1:2;return forms[i];}
function amount(n,key){const forms=resourceForms[key],mod=n%100,index=mod>=11&&mod<=14?2:n%10===1?0:n%10>=2&&n%10<=4?1:2;return `${n} ${forms[index]}`;}
const names={home:'Притулок',eggs:'Яйця',collection:'Дракони',market:'Ринок',expedition:'Експедиції',locations:'Мапа долини',tree:'Драконяче дерево'};
let collectionView='flock';
function persist(){try{localStorage.setItem(KEY,JSON.stringify(state));hasSave=true;}catch{toast('Браузер не дозволив зберегти прогрес.','error');}}
function prefSave(){try{localStorage.setItem(PREF,JSON.stringify(prefs));}catch{}}
function latest(){try{const raw=localStorage.getItem(KEY);if(raw)state=E.hydrate(JSON.parse(raw));}catch{}}
function cost(items){return `<span class="costs">${Object.entries(items||{}).map(([k,n])=>`<span class="cost ${state.resources[k]<n?'short':''}" title="${E.RESOURCE[k]}">${icon(resourceIcon[k],16)}${n}</span>`).join('')}</span>`;}
function canPay(items){return Boolean(items)&&Object.entries(items).every(([k,n])=>state.resources[k]>=n);}
function action(text,a,style='secondary',disabled=false,why=''){const button=`<button class="button ${style}" data-action="${a}" ${disabled?'disabled':''}>${text}</button>`;return disabled&&why?`<span class="act">${button}<small class="why">${why}</small></span>`:button;}
// Disabled buttons say what is missing instead of just turning grey.
function lack(items){const miss=Object.entries(items||{}).filter(([k,n])=>state.resources[k]<n).map(([k,n])=>amount(n-state.resources[k],k));return miss.length?`Ще потрібно: ${miss.join(', ')}`:'';}
function heading(over,title,desc='',art=''){return `<div class="panel-heading${art?' has-art':''}">${art?`<img class="panel-art" src="${art}" alt="" draggable="false">`:''}<span class="kicker">${over}</span><h2>${title}</h2>${desc?`<p>${desc}</p>`:''}</div>`;}
function name(d){return E.dragonName(d);}
function adultTeam(){const adults=state.dragons.filter(d=>d.stage==='adult'),workers=adults.filter(d=>d.species!=='moss');return teamIds===null?(workers.length?workers:adults).map(d=>d.id):teamIds.filter(id=>adults.some(d=>d.id===id));}
function first(){return state.dragons.find(d=>d.species==='moss');}
function progressTutorial(){
 const d=first();let step=prefs.tut;
 if(step===0&&prefs.started)step=1;
 if(step===1&&(prefs.fog??0)>=1)step=2;
 if(step===2&&d.stage!=='egg')step=3;
 if(step===3&&d.stage==='adult')step=4;
 if(step===4&&(prefs.fog??0)>=2)step=5;
 if(step===5&&state.collected)step=6;
 if(step===6&&state.trades)step=7;
 if(step>7)step=7;
 if(step!==prefs.tut){prefs.tut=step;prefSave();}
}
// Narrated onboarding (after Hatch Dragons): one verb per step; fog clears in two stages.
const TUTORIAL=[
 null,
 ['Густий туман укрив долину','Багато років тут не чути крил. Але глибоко під туманом ще жевріє світло…','fog'],
 ['Серце долини прокидається','У гнізді з коріння з’явилось перше за багато років яйце. <b>Торкнись</b>, щоб вилупити!','hatch'],
 ['Маленькому другу потрібні ягоди','<b>Нагодуй</b> малюка тричі — кожне годування коштує 2 ягоди.','feed'],
 ['Дракону потрібен простір','Він уже дорослий! <b>Розвій туман</b> довкола, щоб відкрити весь Сонячний гай.','fog'],
 ['Перший врожай','Коли над драконом з’явиться врожай — <b>торкнись</b> його, щоб зібрати.','collect'],
 ['Познайомся з Марою','Відкрий <b>Ринок</b> і продай 6 ягід. Монети допоможуть покликати нових драконів.','sell'],
 ['Це лише початок!','Скільки драконів ти розбудиш? Мета розділу завжди підкаже наступний крок.','done']
];
function shell(){
 app.innerHTML=`<div class="game is-menu"><div class="boot-screen" id="boot-screen" role="status"><strong>Завантажуємо долину…</strong><span class="boot-loader"><i></i></span></div><svg class="ink-filters" aria-hidden="true" width="0" height="0"><defs>${[1,2,3].map(n=>`<filter id="boil${n}" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="${n*7}"/><feDisplacementMap in="SourceGraphic" scale="3.2"/></filter><filter id="ink${n}" x="-4%" y="-4%" width="108%" height="108%" color-interpolation-filters="sRGB"><feMorphology in="SourceAlpha" operator="dilate" radius="1.7" result="d"/><feFlood flood-color="#1d2a22"/><feComposite in2="d" operator="in" result="o"/><feMerge result="m"><feMergeNode in="o"/><feMergeNode in="SourceGraphic"/></feMerge><feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="${n*11}"/><feDisplacementMap in="m" scale="2.6" xChannelSelector="R" yChannelSelector="G"/></filter><filter id="sel${n}" x="-12%" y="-12%" width="124%" height="124%" color-interpolation-filters="sRGB"><feMorphology in="SourceAlpha" operator="dilate" radius="6" result="halo"/><feFlood flood-color="#d8fff2"/><feComposite in2="halo" operator="in"/><feGaussianBlur stdDeviation="3.5" result="glow"/><feMorphology in="SourceAlpha" operator="dilate" radius="1.7" result="d"/><feFlood flood-color="#1d2a22"/><feComposite in2="d" operator="in" result="o"/><feMerge result="m"><feMergeNode in="glow"/><feMergeNode in="glow"/><feMergeNode in="o"/><feMergeNode in="SourceGraphic"/></feMerge><feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="${n*11}"/><feDisplacementMap in="m" scale="2.6" xChannelSelector="R" yChannelSelector="G"/></filter>`).join('')}</defs></svg><div id="world" class="world-host"></div><div class="screen-vignette"></div><div class="paper-grain" aria-hidden="true"></div>
 <header class="hud"><button class="brand-button" data-action="menu" aria-label="Меню Hatchglen"><img src="/brand/hatchglen-symbol.svg" width="36" height="36" alt=""><span>Hatchglen<small>ДРАКОНЯЧА ДОЛИНА</small></span></button><div class="balances" id="balances" aria-label="Ресурси"></div><div class="hud-tools"><button class="phase" data-action="phaseInfo" id="phase"></button><button class="icon-button" data-action="settings" aria-label="Налаштування">${icon('gear')}</button></div></header>
 <div id="chapter" class="chapter"></div><div class="camera-tools"><button data-camera="home" aria-label="Огляд усієї долини">${icon('home')}</button><button data-camera="in" aria-label="Наблизити">${icon('plus')}</button><button data-camera="out" aria-label="Віддалити"><span aria-hidden="true">−</span></button><small>Потягни, щоб оглянути світ</small></div>
 <section class="tutorial" id="tutorial" aria-label="Підказка навчання" aria-live="polite"></section>
 <button class="panel-backdrop" data-action="closePanel" aria-label="Закрити панель" tabindex="-1"></button>
 <aside class="inspector" id="inspector" aria-label="Ігрові дії" tabindex="-1"></aside>
 <nav class="nav" aria-label="Меню гри">${[['home','home'],['eggs','egg'],['collection','book'],['market','market'],['expedition','compass']].map(([id,ic])=>`<button data-tab="${id}" aria-label="${names[id]}" title="${names[id]}">${navIcon(ic)}<span>${names[id]}</span><i></i></button>`).join('')}</nav>
 <div class="status-label"><span class="status-dot"></span><span id="local-status">Локальне збереження</span><button data-action="nearInfo">NEAR</button></div><div id="toast" role="status" aria-live="polite"></div><div id="phase-event" aria-hidden="true"></div><dialog id="dialog"></dialog>
 <section class="main-menu splash" id="main-menu"><picture class="splash-art"><source media="(max-width: 900px)" srcset="/art/splash-sm.webp"><img src="/art/splash.webp" alt="" draggable="false"></picture><div class="splash-shade"></div><img class="splash-logo" src="/brand/hatchglen-logo-dark.svg" alt="Hatchglen" width="380" height="100"><p class="splash-tag">Вирощуй драконів. Розбуди долину.</p><div class="splash-cta"><button class="splash-play" data-action="play"><span>${hasSave?'Торкнись, щоб продовжити':'Торкнись, щоб почати'}</span></button><div class="splash-links"><button class="button text-button" data-action="help">Як грати</button></div></div><div class="splash-lang">${Object.entries(LANGS).map(([id])=>`<button class="${id===lang?'on':''}" data-action="setLang:${id}" lang="${id}">${id.toUpperCase()}</button>`).join('')}</div><button class="icon-button menu-gear" data-action="settings" aria-label="Налаштування">${icon('gear')}</button></section>
 </div>`;
 world=mountWorld(document.querySelector('#world'),{onSelect:selectDragon,onAction:perform,onLocation:openLocation,onBackground:()=>{if(panelOpen&&tab==='home'){panelOpen=false;render();}}});
 world.update(state,{selected:null,now:Date.now(),fog:prefs.fog??2});
 render();
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!document.querySelector('#dialog').open&&started){panelOpen=false;tab='home';render();}});
}
// The world highlights a dragon only while its card is open; tapping it again (or empty ground) lets go.
function worldSelection(){return started&&panelOpen&&tab==='home'?selected:null;}
function selectDragon(id){
 if(id===selected&&panelOpen&&tab==='home'){panelOpen=false;render();sound('tap');return;}
 selected=id;tab='home';panelOpen=true;
 if(id===first().id){prefs.eggSelected=true;prefSave();}
 world.focusDragon(id);progressTutorial();render();sound('tap');
}
function openTab(id,keepSlot=false){if(!keepSlot)chosenSlot=null;if(id==='eggs'&&prefs.tut===7){prefs.tutorial=false;prefSave();}tab=id;panelOpen=id!=='home';if(id==='home'){panelOpen=false;world.home();}if(id==='market'){prefs.marketSeen=true;prefSave();}progressTutorial();render();if(panelOpen)document.querySelector('#inspector').scrollTop=0;sound('tap');}
// Scrolls only the side panel (scrollIntoView would also scroll the page behind it).
function panelScroll(sel){setTimeout(()=>{const box=document.querySelector('#inspector'),el=box?.querySelector(sel);if(!el)return;const top=el.getBoundingClientRect().top-box.getBoundingClientRect().top+box.scrollTop-(box.clientHeight-el.offsetHeight)/2;box.scrollTo({top:Math.max(0,top),behavior:prefs.motion?'smooth':'instant'});},30);}
function openLocation(id,meta={}){
 if(id==='eggs'){chosenSlot=meta.slot??null;openTab('eggs',true);return;}
 if(id==='tree'){openTab('tree');return;}
 if(id==='expansion'){openTab('locations');return;}
 if(id==='forage'){perform({type:'forage'});return;}
 if(id==='market'){openTab('market');return;}
 if(id==='workshop'||id==='shrine'){collectionView='flock';openTab('collection');panelScroll(id==='workshop'?'#workshop':'#shrine-project');return;}
 if(id==='ruins'&&state.locations.ruins.unlocked){locationId=id;openTab('expedition');world.focusLocation(id);return;}
 locationId=id;tab='locations';panelOpen=true;world.focusLocation(id);render();
}
function detail(){
 const d=state.dragons.find(d=>d.id===selected)||first(),sp=E.SPECIES[d.species],p=E.production(state,d),now=Date.now();selected=d.id;
 let controls;
 if(d.stage==='egg')controls=`<p>Зовсім скоро ви познайомитесь.</p><div class="meter"><i style="width:${Math.min(100,100*(1-(d.hatchAt-now)/E.HATCH_MS))}%"></i></div>${now>=d.hatchAt?action('Вилупити дракона','hatch','primary'):action(`Поквапити ${cost(E.HURRY_COST)}`,'hurry','primary',!canPay(E.HURRY_COST),lack(E.HURRY_COST))}`;
 else if(d.stage==='baby')controls=`<div class="feed-progress">${[0,1,2].map(i=>`<span class="${i<d.feeds?'fed':''}">${icon('berry',18)}</span>`).join('')}<small>${d.feeds}/3 · до дорослішання</small></div>${action(`Нагодувати ${cost({berries:2})}`,'feed','primary',state.resources.berries<2)}${state.resources.berries<2?action('Зібрати 3 лісові ягоди','forage','secondary',now<state.forageAt):''}`;
 else controls=`<p>${sp.job} · ${p.output} / ${p.cycle} с ${p.bonus?`<b>+${p.bonus} бонус місця</b>`:''}</p><div class="compact-stat"><span>${p.away?'В експедиції':p.stored?'Готово до збору':'Наступна порція'}</span><strong data-live="production">${p.away?'Команда в дорозі':p.stored?`+${p.stored}`:clock(d.next-now)}</strong></div><div class="meter"><i style="width:${p.away?0:p.stored?100:Math.max(0,100*(1-(d.next-now)/(p.cycle*1000)))}%"></i></div>${action(`${icon(resourceIcon[p.resource],18)} Зібрати ${p.stored?`+${p.stored}`:''}`,'collect','primary',!p.stored||p.away)}${d.level<E.MAX_LEVEL?`<div class="fruit-row"><span class="fruit-progress"><small>Плоди ${d.xp||0}/${E.fruitToLevel(d)}</small><span class="fruit-dots" title="Плоди до рівня ${d.level+1}">${Array.from({length:E.fruitToLevel(d)},(_,i)=>`<i class="${i<(d.xp||0)?'on':''}"></i>`).join('')}</span></span>${action(`Пригостити ${cost({fruit:1})}`,'feedFruit','secondary small',!canPay({fruit:1})||p.away||(d.level>=3&&!state.restored),d.level>=3&&!state.restored?'Віднови Серце долини для рівнів 4–5':!canPay({fruit:1})?'Збери плоди з дерева':'')}</div>`:''}<button class="button text-button" data-action="dragonInfo">Догляд і покращення ${icon('arrow',16)}</button>`;
 return `<div class="selected-card"><div class="selected-portrait">${d.stage==='egg'?egg():dragon(d.species,d.stage)}</div><div class="selected-title"><span class="kicker">${d.stage==='egg'?'НОВЕ ЖИТТЯ':d.stage==='baby'?'МАЛЮК':`РІВЕНЬ ${d.level} · ${E.LOCATIONS[d.location].name}`}</span><h2>${d.stage==='egg'?'Таємниче яйце':(d.name?`<span data-no-tr>${esc(d.name)}</span>`:esc(name(d)))}</h2><button class="close-panel" data-action="closePanel" aria-label="Закрити панель">${icon('close',18)}</button></div><div class="selected-controls">${controls}</div></div>`;
}
function food(){return `<div class="food-supply"><h3>Трохи припасів</h3><p>Лісові ягоди відновлюються без монет. Якщо припаси скінчились, пригода продовжиться.</p>${action(`Зібрати 3 ягоди · ${Date.now()<state.forageAt?clock(state.forageAt-Date.now()):'готові'}`,'forage','secondary',Date.now()<state.forageAt)}${action(`Купити 6 ягід ${cost({coins:20})}`,'buyFood','secondary',state.resources.coins<20,lack({coins:20}))}</div>`;}
function eggs(){
 const count=new Set(state.dragons.map(d=>d.species)).size,full=state.dragons.length>=state.slots;
 return heading('НОВІ МЕШКАНЦІ','Кого запросимо?','Кожен вид має свою справу. Вирощуй команду, що допомагає одне одному.')+`<div class="species-list">${Object.entries(E.SPECIES).map(([id,sp])=>{const duplicate=count<3&&state.dragons.some(d=>d.species===id);return `<article class="species-card ${E.speciesLocked(state,id)?'is-locked':''}"><div class="species-art">${dragon(id)}</div><div><span class="kicker">${sp.kind}</span><h3>${sp.name}</h3><p>${sp.job}</p>${E.speciesLocked(state,id)?`<span class="owned locked-species">${icon('lock',16)} ${E.speciesLocked(state,id)}</span>`:duplicate?'<span class="owned">Уже у твоїй долині</span>':`${action(`Запросити ${cost({coins:sp.eggCost})}`,`buyEgg:${id}`,'primary',full||!canPay({coins:sp.eggCost}),full?'Усі гнізда зайняті':lack({coins:sp.eggCost}))}${action(`Обміняти ${cost({berries:E.BERRY_EGG_COST[id]})}`,`barter:${id}`,'ghost',full||!canPay({berries:E.BERRY_EGG_COST[id]}),full?'':lack({berries:E.BERRY_EGG_COST[id]}))}`}</div></article>`;}).join('')}</div><p class="subtle">Гнізда: ${state.dragons.length}/${state.slots}. Спочатку запроси всі три види, потім можна вирощувати дублікати.</p>${full?'<button class="button secondary" data-tab="locations">Відкрити більше місця</button>':''}${food()}`;
}
function collection(){
 const adults=new Set(state.dragons.filter(d=>d.stage==='adult').map(d=>d.species)).size;
 const readyRestore=adults===3&&state.crafted&&state.expeditions&&canPay({embers:4,ore:4,relics:6});
 const goals=E.goalStatus(state),claimable=goals.filter(g=>g.done&&!g.claimed).length;
 const views=`<div class="segmented" role="tablist">${[['flock','Зграя'],['bestiary','Бестіарій'],['goals',`Цілі${claimable?` <i>${claimable}</i>`:''}`]].map(([id,label])=>`<button role="tab" aria-selected="${collectionView===id}" class="${collectionView===id?'on':''}" data-action="collectionView:${id}">${label}</button>`).join('')}</div>`;
 const head=heading('ТВОЯ ЗГРАЯ','Маленькі легенди',`${state.dragons.length} ${plural(state.dragons.length,['мешканець','мешканці','мешканців'])} · ${Math.min(adults,3)}/3 дорослих видів`)+`<div class="score-pill">${icon('relics',18)} Сила зграї <b>${E.dragonScore(state)}</b></div>`+views;
 if(collectionView==='bestiary'){const owned=new Set(state.dragons.filter(d=>d.stage!=='egg').map(d=>d.species));return head+`<div class="bestiary">${Object.entries(E.SPECIES).map(([id,sp])=>`<article class="beast ${owned.has(id)?'known':'unknown'}"><div class="beast-art">${dragon(id)}</div><h3>${owned.has(id)?sp.name:'???'}</h3><small>${sp.kind}</small><p>${owned.has(id)?sp.desc:E.speciesLocked(state,id)||'Вилупи цей вид, щоб дізнатися його історію…'}</p></article>`).join('')}</div>`;}
 if(collectionView==='goals')return head+`<div class="goal-list">${goals.map(g=>`<article class="goal ${g.claimed?'claimed':g.done?'done':''}"><div><h3>${g.title}</h3><p>${g.text}</p><div class="meter"><i style="width:${Math.round(100*g.value/g.target)}%"></i></div><small>${g.value}/${g.target}</small></div><div class="goal-reward"><span class="costs">${Object.entries(g.reward).map(([k,n])=>`<span class="cost">${icon(resourceIcon[k],16)}+${n}</span>`).join('')}</span>${g.claimed?`<span class="goal-check">${icon('check',22)}</span>`:action('Забрати',`claimGoal:${g.id}`,'primary small',!g.done)}</div></article>`).join('')}</div>`;
 return head+`<div class="collection-list">${state.dragons.map(d=>`<button data-select="${d.id}" class="collection-item"><span class="thumb">${d.stage==='egg'?egg():dragon(d.species,d.stage)}</span><span><strong>${d.stage==='egg'?'Таємниче яйце':(d.name?`<span data-no-tr>${esc(d.name)}</span>`:esc(name(d)))}</strong><small>${d.stage==='egg'?'Очікує вилуплення':d.stage==='baby'?`Годування ${d.feeds}/3`:`Рівень ${d.level} · ${E.LOCATIONS[d.location].name}`}</small></span>${icon('arrow',17)}</button>`).join('')}</div>
 <section class="project" id="workshop"><span class="kicker">МАЙСТЕРНЯ</span><h3>Оберіг мандрівника</h3><p>Додає +1 уламок до кожної наступної експедиції. Створено ${state.crafted}/${E.MAX_CHARMS}.</p>${action(`Створити оберіг ${cost({embers:2,ore:2})}`,'craft','primary',!canPay({embers:2,ore:2})||state.crafted>=E.MAX_CHARMS,state.crafted>=E.MAX_CHARMS?'Усі обереги створено':lack({embers:2,ore:2}))}</section>
 <section class="project has-art" id="shrine-project"><img class="project-art" src="/art/shrine.webp" alt="" draggable="false"><span class="kicker">СЕРЦЕ ДОЛИНИ</span><h3>${state.restored?'Світло повернулось':'Пробуди святилище'}</h3>${state.restored?'<p>Четверте гніздо відкрите. Попереду — кар’єр і забуті руїни.</p><button class="button secondary" data-tab="locations">Дослідити долину</button>':`<ul class="requirements"><li>${adults===3?'✓':'○'} Три дорослі види · ${adults}/3</li><li>${state.crafted?'✓':'○'} Створено оберіг</li><li>${state.expeditions?'✓':'○'} Завершено експедицію</li></ul>${action(`Відновити ${cost({embers:4,ore:4,relics:6})}`,'restore','primary',!readyRestore,lack({embers:4,ore:4,relics:6})||'Виконай умови вище')}`}</section>
 ${state.restored?`<section class="project" id="chapter-project"><span class="kicker">ДРУГИЙ РОЗДІЛ</span><h3>Жива долина</h3><ul class="requirements chapter-checklist"><li>${Object.values(state.locations).filter(l=>l.unlocked).length===3?'✓':'○'} Місцевості: ${Object.values(state.locations).filter(l=>l.unlocked).length}/3</li><li>${state.dragons.filter(d=>d.stage==='adult').length>=6?'✓':'○'} Дорослі друзі: ${Math.min(6,state.dragons.filter(d=>d.stage==='adult').length)}/6</li><li>${state.dragons.some(d=>d.level>=3)?'✓':'○'} Один майстер рівня 3</li><li>${state.crafted>=3?'✓':'○'} Обереги: ${Math.min(3,state.crafted)}/3</li><li>${state.expeditions>=3?'✓':'○'} Експедиції: ${Math.min(3,state.expeditions)}/3</li></ul>${action(state.chapter2Complete?'Розділ завершено':`Повернути долині життя ${cost({ore:12,embers:12,relics:12})}`,'completeChapter','primary',state.chapter2Complete||!(state.locations.quarry.unlocked&&state.locations.ruins.unlocked&&state.dragons.filter(d=>d.stage==='adult').length>=6&&state.dragons.some(d=>d.level>=3)&&state.crafted>=3&&state.expeditions>=3&&canPay({ore:12,embers:12,relics:12})))}</section>`:''}`;
}
function treePanel(){
 const t=state.tree,now=Date.now(),ripe=t.shift&&now>=t.ends,shift=t.shift?E.TREE_SHIFTS[t.shift]:null;
 const status=!t.shift?'<p class="tree-status">Дерево відпочиває. Обери, скільки плодів виростити.</p>':ripe?`<div class="tree-status ripe">${gem('fruit',34)}<strong>+${shift.yield} ${amount(shift.yield,'fruit').split(' ')[1]} дозріли!</strong>${action('Зібрати плоди','harvestTree','primary')}</div>`:`<div class="tree-status"><span>${shift.name}</span><strong data-live="tree">${clock(t.ends-now)}</strong><div class="meter"><i style="width:${Math.round(100*(1-(t.ends-now)/(shift.seconds*1000)))}%"></i></div></div>`;
 return heading('ДРАКОНЯЧЕ ДЕРЕВО','Плоди для росту','Пригощай дорослих драконів плодами — кожні кілька плодів піднімають рівень, і дракон працює щедріше.')+status+`<div class="shift-list">${Object.entries(E.TREE_SHIFTS).map(([id,sh])=>`<article class="shift-card"><div class="shift-art">${Array.from({length:Math.min(5,sh.yield)},()=>gem('fruit',28)).join('')}</div><h3>${sh.name}</h3><p>${amount(sh.yield,'fruit')} за ${sh.seconds<60?`${sh.seconds} секунд`:`${sh.seconds/60} хв`}</p>${action(Object.keys(sh.cost).length?`Посадити ${cost(sh.cost)}`:'Безкоштовно',`plantTree:${id}`,'primary',Boolean(t.shift)||!canPay(sh.cost),t.shift?(ripe?'Спершу збери плоди':'Дерево вже росте'):lack(sh.cost))}</article>`).join('')}</div>`;
}
function market(){
 const status=E.marketStatus(state);
 return heading('КРАМНИЦЯ МАРИ','Обмін, що оживляє долину','Твої покупки фінансують нові замовлення. Мара завжди показує, скільки може заплатити.','/art/market.webp')+`<div class="merchant"><span><img src="/art/mara.svg" width="53" height="53" alt="Мара"></span><div><strong>Мара · торговиця</strong><small>Бюджет ${status.budget} · зарезервовано ${status.reserved}</small></div></div><p class="merchant-quote">«Сусіди чекають на припаси. Принесеш трохи?»</p><div class="orders">${state.orders.map(o=>`<article class="order"><div class="order-heading"><span>${icon(resourceIcon[o.resource],25)}<strong>${amount(o.quantity,o.resource)}</strong></span><b>+${o.pay}${icon('coin',17)}</b></div><p>${o.left?`Ще ${o.left}/${o.limit} замовлень`:'Цю партію закрито'}</p>${action(o.left?'Продати':'Виконано',`sell:${o.id}`,'primary',!o.left||!canPay({[o.resource]:o.quantity}),o.left?lack({[o.resource]:o.quantity}):'')}</article>`).join('')}</div>${action('Оновити замовлення','refreshOrders','primary',!status.canRefresh,'Спершу виконай поточні замовлення')}<p class="subtle">${status.available?`Мара може відкрити нові замовлення ще на ${status.available} монет.`:'Монети, які ти витрачаєш у долині, повертаються до Мари — з них з’являються нові замовлення.'}</p>${food()}<button class="button text-button" data-action="nearInfo">${icon('compass',16)} Про NEAR та ончейн-торгівлю</button>`;
}
function expedition(){
 const ex=state.expedition,now=Date.now(),p=E.phase(state),adults=state.dragons.filter(d=>d.stage==='adult'),team=adultTeam(),arrived=ex&&now>=ex.ends;
 const reward=E.expeditionReward(state,team);
 return heading('ЗА МЕЖАМИ ТУМАНУ','Шлях до старої брами','Команда вирушає за скарбами. Дракони, яких залишиш удома, продовжать свою справу.')+`<div class="ruins-window ${p.red?'open':''}"><span>${icon('relics',40)}</span><small>${ex?arrived?'Команда чекає твого рішення':'Похід триває':p.red?'Прохід відкритий':'Прокинеться у затемненні'}</small></div>${ex?`<div class="exp-facts"><span>Команда<strong>${ex.team.map(id=>esc(name(state.dragons.find(d=>d.id===id)))).join(', ')}</strong></span><span>У рюкзаку<strong>${amount(ex.reward,'relics')} +15 монет</strong></span></div>${!arrived?`<div class="compact-stat"><span>${ex.delved?'Досліджуємо сховище':'Шлях до брами'}</span><b data-live="expedition">${clock(ex.ends-now)}</b></div><div class="meter"><i style="width:${Math.min(100,100*(1-(ex.ends-now)/ex.duration))}%"></i></div>`:''}${arrived&&!ex.delved?`<section class="encounter"><span class="kicker">ПЕРЕД ТОБОЮ ВИБІР</span><h3>Піти глибше?</h3><p>Ще 10 секунд і 2 жарокамені з 2 рудами відкриють сховище. Отримаєш +3 уламки.</p>${action(`Відкрити сховище ${cost({embers:2,ore:2})}`,'delve','primary',!canPay({embers:2,ore:2}),lack({embers:2,ore:2}))}</section>`:''}${action(arrived?'Повернутись зі здобиччю':'Команда в дорозі…','claim',arrived&&!ex.delved?'secondary':'primary',!arrived)}<p class="subtle">Зміна фази не перериває похід. Члени команди повернуться до роботи після збору нагороди.</p>`:`<div class="team-list">${adults.length?adults.map(d=>`<button class="team-choice ${team.includes(d.id)?'chosen':''}" data-team="${d.id}" aria-pressed="${team.includes(d.id)}"><span class="thumb">${dragon(d.species)}</span><span><strong>${(d.name?`<span data-no-tr>${esc(d.name)}</span>`:esc(name(d)))}</strong><small>${team.includes(d.id)?'Іде до брами':'Залишається працювати'}</small></span>${icon(team.includes(d.id)?'check':'plus',18)}</button>`).join(''):'<p>Вирости першого дракона, щоб зібрати команду.</p>'}</div><div class="exp-facts"><span>До першого вибору<strong>20 секунд</strong></span><span>Здобич команди<strong>${reward} уламків +15 монет</strong></span></div><p class="subtle">Для глибшого шляху залиш у запасі 2 жарокамені та 2 руди.</p>${action(`Вирушити ${cost({berries:3})}`,'expedition','primary',!p.red||!team.length||!canPay({berries:3}),!p.red?'Брама відкривається лише в затемнення':!team.length?'Обери хоча б одного дракона':lack({berries:3}))}${!p.red?`<p class="phase-hint">До затемнення <span data-live="phase-wait">${clock(p.left)}</span>. Поки команда готується, можна зібрати ресурси.</p>`:''}`}${DEBUG?`<button class="button ghost small" data-action="demoPhase">Демо: ${p.red?'повернути денне світло':'показати затемнення'}</button>`:''}`;
}
function locations(){
 const current=E.LOCATIONS[locationId]?locationId:'grove',nextSlot=E.SLOTS[state.slots],zoneReady=nextSlot&&state.locations[nextSlot.location].unlocked;
 return heading('МАПА ДОЛИНИ','За межі знайомого','Кожна нова земля має свою користь. Перетягуй світ або обери місце нижче.')+`<div class="location-list">${Object.entries(E.LOCATIONS).map(([id,loc])=>{const open=state.locations[id].unlocked,requirements=E.locationRequirements(state,id),upgrade=E.locationUpgradeCost(state,id);return `<section class="location-card ${current===id?'selected':''}"><button class="location-name" data-focus="${id}">${icon(id==='grove'?'leaf':id==='quarry'?'ore':'relics',25)}<span><strong>${loc.name}</strong><small>${open?`Відкрито · рівень ${state.locations[id].level}`:'Під туманом'}</small></span>${icon(open?'check':'lock',16)}</button><p>${loc.description}</p>${open?(()=>{const bonus=Math.max(0,state.locations[id].level-1)+(id==='grove'?0:1),name=E.SPECIES[loc.specialist].name;return `<p class="habitat-bonus">${bonus?`${name}: +${bonus} до кожного збору.${state.locations[id].level<3?' Покращення дає ще +1.':''}`:`Покращ місце — ${name} отримає +1 до кожного збору.`}</p>`;})():''}${!open?`${requirements.reasons.length?`<ul class="requirements">${requirements.reasons.map(r=>`<li>${esc(r)}</li>`).join('')}</ul>`:''}${action(`Відкрити ${cost(loc.unlockCost)}`,`unlockLocation:${id}`,'primary',!requirements.met||!canPay(loc.unlockCost),!requirements.met?'Спершу виконай умови':lack(loc.unlockCost))}`:`${action('Показати на мапі',`travel:${id}`,'secondary')}${action(upgrade?`Покращити місце ${cost(upgrade)}`:'Місце повністю розвинене',`upgradeLocation:${id}`,'ghost',state.locations[id].level>=3||!canPay(upgrade),state.locations[id].level>=3?'':lack(upgrade))}`}</section>`;}).join('')}</div><section class="project"><h3>Більше місця для друзів</h3><p>Відкрито ${state.slots}/${E.MAX_SLOTS} гнізд. ${nextSlot?`Наступне гніздо: ${E.LOCATIONS[nextSlot.location].name}.${zoneReady?'':' Спочатку відкрий цю місцевість.'}`:'Усі гнізда вже відкриті.'}</p>${action(state.slots>=E.MAX_SLOTS?'Усі гнізда відкриті':`Відкрити наступне гніздо ${cost(E.expandCost(state))}`,'expand','primary',!state.restored||!zoneReady||state.slots>=E.MAX_SLOTS||!canPay(E.expandCost(state)),state.slots>=E.MAX_SLOTS?'':!state.restored?'Спершу віднови Серце долини':!zoneReady?'Спершу відкрий цю місцевість':lack(E.expandCost(state)))}</section>`;
}
// Small counters on the bottom tabs: where something can be done right now.
function navBadges(){
 const now=Date.now(),p=E.phase(state),ex=state.expedition,adults=state.dragons.filter(d=>d.stage==='adult');
 const free=state.dragons.length<state.slots,eggs=free&&Object.entries(E.SPECIES).some(([id,sp])=>canPay({coins:sp.eggCost})||canPay({berries:E.BERRY_EGG_COST[id]}));
 const sells=state.orders.filter(o=>o.left&&canPay({[o.resource]:o.quantity})).length;
 const trip=ex?now>=ex.ends:p.red&&adults.length&&canPay({berries:3});
 const crafts=state.crafted<E.MAX_CHARMS&&canPay({embers:2,ore:2}),goals=E.goalStatus(state).filter(g=>g.done&&!g.claimed).length;
 if(prefs.tutorial&&prefs.tut<=7)return {};
 return {eggs:eggs?'•':'',market:sells?String(sells):'',expedition:trip?'•':'',collection:goals?String(goals):crafts?'•':''};
}
function render(){
 E.tick(state);progressTutorial();
 const now=Date.now(),p=E.phase(state),goal=E.objective(state);
 document.body.classList.toggle('eclipse',p.red);document.body.classList.toggle('reduced-motion',!prefs.motion);
 document.querySelector('#main-menu').hidden=started;
 document.querySelector('.game').classList.toggle('is-menu',!started);
 document.querySelector('#world').inert=!started;
 for(const el of document.querySelectorAll('.hud,.chapter,.camera-tools,.nav,.status-label'))el.inert=!started;
 document.querySelector('#balances').innerHTML=Object.entries(state.resources).map(([k,n])=>`<div class="balance" data-resource="${k}" title="${E.RESOURCE[k]}"><span class="${k}">${gem(resourceIcon[k],30)}</span><span><b>${n}</b><small>${E.RESOURCE[k]}</small></span></div>`).join('');
 const passed=Math.min(4,Math.floor((1-p.left/E.PHASE_MS)*5));
 document.querySelector('#phase').innerHTML=`${phaseGlyph(p.red)}<span class="phase-dots" aria-hidden="true">${[0,1,2,3,4].map(i=>`<i class="${i<=passed?'on':''}"></i>`).join('')}</span><span class="phase-text">${p.red?'Затемнення':'Денне світло'}<small data-live="phase">${clock(p.left)}</small></span>`;
 document.querySelector('#chapter').innerHTML=`<button data-action="goal"><span class="chapter-progress">${goal.chapter||1}<small>РОЗДІЛ</small></span><span><small>${prefs.tutorial?'МЕТА ПРИГОДИ':`${goal.step}/${goal.total||7} · ${goal.chapter===2?'Долина прокидається':'Перше світло'}`}</small><strong>${esc(goal.title)}</strong></span><span class="quest-bar"><i style="width:${Math.round(100*(goal.step||0)/(goal.total||7))}%"></i></span>${icon('arrow',16)}</button>`;
 const inspector=document.querySelector('#inspector');inspector.className=`inspector ${tab==='home'?'compact':'full-panel'} ${panelOpen&&started?'open':''}`;
 if(panelOpen){const sc=inspector.scrollTop;inspector.innerHTML=`${tab!=='home'?`<button class="close-panel" data-action="closePanel" aria-label="Закрити панель">${icon('close',18)}</button>`:''}${tab==='home'?detail():tab==='eggs'?eggs():tab==='collection'?collection():tab==='market'?market():tab==='expedition'?expedition():tab==='tree'?treePanel():locations()}`;inspector.scrollTop=sc;}
 const badges=navBadges();
 document.querySelectorAll('.nav button').forEach(b=>{const active=b.dataset.tab===tab;b.querySelector('i').textContent=badges[b.dataset.tab]||'';b.classList.toggle('has-badge',Boolean(badges[b.dataset.tab]));b.classList.toggle('active',active);b.setAttribute('aria-current',active?'page':'false');});
 renderTutorial();world.update(state,{selected:worldSelection(),now,fog:prefs.fog??2});applyTutorialFocus();lastSignature=signature();
}
let guideKey='',guideTyping=0;
function applyTutorialFocus(){
 const box=document.querySelector('#tutorial');
 const current=document.querySelectorAll('.tutorial-focus');
 if(box.hidden){current.forEach(el=>el.classList.remove('tutorial-focus','tutorial-spot'));return;}
 // Spotlight + pointing hand on the one thing to tap now (falls back to the egg's timer while it warms).
 const slotOf=d=>d?.slot??0,ov=`.sw-ov[data-slot="${slotOf(first())}"]`;
 const fogBtn=TUTORIAL[prefs.tut]?.[2]==='fog'?'.tutorial .fog-button':null;
 const target=fogBtn||(prefs.tut===2||prefs.tut===3?`${ov} .sw-harvest, ${ov} .sw-timer`:prefs.tut===5?`${ov} .sw-bubble-collect, ${ov} .sw-timer`:prefs.tut===6?(tab==='market'?'[data-action="sell:1"]':'[data-tab="market"]'):prefs.tut===7?'.tutorial [data-action="finishTutorial"]':null);
 const el=target&&(target.includes(',')?target.split(',').map(t=>document.querySelector(t.trim()+(t.includes('sw-timer')?':not([hidden])':''))).find(Boolean):document.querySelector(target));
 for(const old of current)if(old!==el)old.classList.remove('tutorial-focus','tutorial-spot');
 if(el){el.classList.add('tutorial-focus');el.classList.toggle('tutorial-spot',!el.closest('.tutorial'));}
}
// Lira types each line letter by letter and "talks" (bobs) while she does; a new step makes her hop.
function typeGuide(box,advanced){
 const p=box.querySelector('.guide-text p'),avatar=box.querySelector('.guide-avatar');clearInterval(guideTyping);
 if(advanced){avatar.classList.remove('guide-hop');void avatar.offsetWidth;avatar.classList.add('guide-hop');}
 if(!prefs.motion)return;
 const chars=[];const walk=node=>{for(const n of [...node.childNodes]){if(n.nodeType===3){const frag=document.createDocumentFragment();for(const ch of n.textContent){const sp=document.createElement('span');sp.className='tw';sp.textContent=ch;frag.append(sp);chars.push(sp);}n.replaceWith(frag);}else walk(n);}};
 walk(p);let k=0;avatar.classList.add('guide-talking');
 guideTyping=setInterval(()=>{for(let n=0;n<2&&k<chars.length;n++)chars[k++].classList.add('on');if(k>=chars.length){clearInterval(guideTyping);avatar.classList.remove('guide-talking');}},26);
}
function renderTutorial(){
 const box=document.querySelector('#tutorial');
 box.hidden=!started||!prefs.tutorial||prefs.tut===0||prefs.tut>7;
 document.querySelector('.game').classList.toggle('is-tutorial',!box.hidden);
 if(box.hidden){guideKey='';applyTutorialFocus();return;}
 box.dataset.step=String(prefs.tut);
 const item=TUTORIAL[prefs.tut],fog=item[2]==='fog',key=`${prefs.tut}|${tab}`;
 if(key!==guideKey){
  const advanced=guideKey!==''&&!guideKey.startsWith(`${prefs.tut}|`);guideKey=key;
  const button=prefs.tut===7?action('Покликати нового друга','finishTutorial','primary'):fog?`<button class="button primary fog-button" data-action="clearFog">${icon('leaf',20)} Розвіяти туман</button>`:action(prefs.tut===6?'До ринку':'Показати','guideFocus','guide-action');
  box.innerHTML=`<div class="guide-avatar"><span class="guide-shadow"></span>${dragon('moss','baby',{animated:true})}<span class="guide-sparks"><i></i><i></i><i></i><i></i><i></i></span></div><div class="guide-text"><span class="kicker">ЛІРА · ПРОВІДНИЦЯ ДОЛИНИ</span><h3>${item[0]}</h3><p>${item[1]}</p></div><span class="guide-step">${prefs.tut}/7</span><button class="guide-close" data-action="skipTutorial" aria-label="Пропустити навчання">${icon('close',15)}</button><div class="guide-actions">${button}</div>`;
  if(fog&&panelOpen&&tab==='home'){panelOpen=false;}
  translateNode(box);typeGuide(box,advanced);
  if([2,3,5].includes(prefs.tut)&&!panelOpen)setTimeout(()=>world.focusDragon(first().id),advanced?500:0);
 }
 applyTutorialFocus();
}
function signature(){return JSON.stringify([tab,panelOpen,selected,state.resources,state.dragons.map(d=>[d.id,d.stage,d.feeds,d.level,d.name,d.slot,d.ready,d.readyAmount,Date.now()>=d.hatchAt]),state.locations,state.slots,state.crafted,state.trades,state.collected,state.restored,state.chapter2Complete,state.orders,state.expedition,state.expedition&&Date.now()>=state.expedition.ends,state.tree,state.tree.shift&&Date.now()>=state.tree.ends,state.goalsClaimed,collectionView,E.phase(state).red,Date.now()>=state.forageAt,prefs.tut]);}
function toast(message,kind='success'){
 const box=document.querySelector('#toast');box.innerHTML=`${icon(kind==='error'?'close':'check',18)}<span>${esc(message)}</span>`;box.className=`visible ${kind}`;clearTimeout(toastTimer);toastTimer=setTimeout(()=>box.className='',4200);
}
function phaseEvent(red){if(prefs.tutorial&&prefs.tut<=6)return;const el=document.querySelector('#phase-event');el.innerHTML=`${icon(red?'moon':'sun',34)}<span>${red?'Небо змінюється':'Світло повертається'}<small>${red?'Стара брама прокинулась':'Час вирощувати й готуватись'}</small></span>`;el.className='show';clearTimeout(activeEventUntil);activeEventUntil=setTimeout(()=>el.className='',3600);}
// When something is missing, say where it comes from and make that source pulse on the map.
const SOURCES={'Ягоди':['berries','Збери ягоди на грядці або врожай Мохолиста.'],'Жарокамінь':['embers','Його виплавляє Жарик.'],'Руда':['ore','Її видобуває Кремінь.'],'Монети':['coins','Продай припаси Марі на ринку.'],'Драконячі плоди':['fruit','Посади зміну на драконячому дереві.'],'Уламки':['relics','Уламки приносять експедиції та Кришталик.']};
function lackHint(msg){const m=/Не вистачає: ([^.]+)\./.exec(msg||'');const src=m&&SOURCES[m[1]];if(!src)return '';const spot={berries:'.sw-ov.sw-location-forage .sw-chip',coins:'.sw-ov.sw-location-market .sw-chip',fruit:'.sw-ov.sw-location-tree .sw-timer:not([hidden]), .sw-ov.sw-location-tree .sw-harvest'}[src[0]];const el=spot&&[...document.querySelectorAll(spot)][0];const where={berries:'forage',coins:'market',fruit:'tree'}[src[0]];if(where&&!panelOpen)world.focusLocation(where);if(el){el.classList.remove('hint-pulse');void el.offsetWidth;el.classList.add('hint-pulse');setTimeout(()=>el.classList.remove('hint-pulse'),3000);}return ' '+src[1];}
function perform(a){
 latest();
 const wasRed=E.phase(state).red,before={...state.resources};
 try{
 const message=E.act(state,a);persist();
 if(a.type==='expedition'||a.type==='claim'){panelOpen=false;tab='home';setTimeout(()=>world.focusLocation('ruins'),50);}
 if(a.type==='buyEgg'){selected=state.dragons.at(-1).id;tab='home';panelOpen=true;}
 if(a.type==='travel'||a.type==='unlockLocation'){world.focusLocation(a.location);locationId=a.location;}
 render();if(a.type==='moveDragon'||a.type==='buyEgg')world.focusDragon(selected);sound(a.type);toast(message);
 world.feedback?.(a.type==='forage'?'forage':a.id??selected,a.type);
 resourceFeedback(before);
 if(wasRed!==E.phase(state).red)phaseEvent(E.phase(state).red);
 if(a.type==='upgrade'&&document.querySelector('#dialog').open)showDialog('dragonInfo');
 if(a.type==='restore')showDialog('chapter1');
 if(a.type==='completeChapter')showDialog('chapter2');
 }catch(err){render();sound('error');toast(err.message+lackHint(err.message),'error');}
}
function guideFocus(){
 const step=prefs.tut;
 if(step<=5){selected=first().id;panelOpen=true;tab='home';world.focusDragon(selected);}
 else if(step===6)openTab('market');
 render();
}
app.addEventListener('click',event=>{
 // Like the reference splash: tapping anywhere on the key art starts the game.
 if(!started&&event.target.closest('#main-menu')&&!event.target.closest('button')&&!document.querySelector('#boot-screen')){document.querySelector('[data-action="play"]')?.click();return;}
 const b=event.target.closest('button');if(!b||b.disabled)return;
 if(b.dataset.tab){openTab(b.dataset.tab);return;}
 if(b.dataset.select){selectDragon(+b.dataset.select);return;}
 if(b.dataset.focus){locationId=b.dataset.focus;world.focusLocation(locationId);render();return;}
 if(b.dataset.camera){if(b.dataset.camera==='home')world.home();else world.zoom(b.dataset.camera==='in'?1:-1);return;}
 if(b.dataset.team){const id=+b.dataset.team,team=adultTeam();teamIds=team.includes(id)?team.filter(n=>n!==id):[...team,id];render();return;}
 const actionId=b.dataset.action;if(!actionId)return;
 const [type,value]=actionId.split(':');
 if(type==='play'){const showAway=hasSave&&awayMs>300000&&state.dragons.some(d=>d.stage==='adult'&&E.production(state,d).stored);if(showAway&&!document.querySelector('#main-menu').classList.contains('diving'))setTimeout(()=>showDialog('away'),2200);const menu=document.querySelector('#main-menu');if(prefs.motion&&!menu.classList.contains('diving')){menu.classList.add('diving');document.querySelector('.game').classList.add('entering');sound('tap');setTimeout(()=>{b.disabled=false;b.click();},900);b.disabled=true;setTimeout(()=>{menu.classList.remove('diving');document.querySelector('.game').classList.remove('entering');},2600);return;}if(!hasSave){state=E.createState();selected=state.dragons[0].id;prefs.tut=1;prefs.fog=0;prefs.eggSelected=false;previousRed=false;}started=true;prefs.started=true;prefSave();if(!hasSave)persist();render();world.home();sound('hatch');return;}
 if(type==='menu'){showDialog('menu');return;}
 if(type==='nearRefresh'){loadNear(true);return;}
 if(type==='nearRegister'||type==='nearTrade'){nearAction(type);return;}
 if(type==='settings'||type==='help'||type==='phaseInfo'||type==='nearInfo'||type==='dragonInfo'||type==='skipTutorial'||type==='resetView'){showDialog(type);return;}
 if(type==='closeDialog'){document.querySelector('#dialog').close();return;}
 if(type==='closePanel'){panelOpen=false;tab='home';render();return;}
 if(type==='goal'){const g=E.objective(state);if(g.tab==='home'){selectDragon(g.id||first().id);}else if(g.tab==='locations'){const target=['quarry','ruins'].find(id=>!state.locations[id].unlocked);if(target){locationId=target;world.focusLocation(target);}openTab('locations');panelScroll('.location-card.selected');}else{const anchor=g.tab!=='collection'?null:g.chapter===1?(g.step===4?'#workshop':g.step===6?'#shrine-project':null):(g.step===4?'#chapter-project':g.step===3&&state.dragons.some(d=>d.level>=3)?'#workshop':null);if(anchor)collectionView='flock';openTab(g.tab);if(anchor)panelScroll(anchor);}return;}
 if(type==='guideFocus'){guideFocus();return;}
 if(type==='collectAll'){document.querySelector('#dialog').close();const before={...state.resources};let n=0;for(const d of state.dragons){if(d.stage==='adult'&&E.production(state,d).stored&&!state.expedition?.team.includes(d.id)){try{E.act(state,{type:'collect',id:d.id});world.feedback?.(d.id,'collect');n++;}catch{}}}persist();render();resourceFeedback(before);sound('collect');if(n)toast(`Зібрано врожай з ${n} ${plural(n,['дракона','драконів','драконів'])}`);return;}
 if(type==='setLang'){setLang(value);return;}
 if(type==='collectionView'){collectionView=value;render();document.querySelector('#inspector').scrollTop=0;return;}
 if(type==='clearFog'){prefs.fog=Math.min(2,(prefs.fog??0)+1);prefSave();sound('hatch');progressTutorial();render();if(prefs.fog===1)world.focusDragon(first().id);else world.home();return;}
 if(type==='finishTutorial'||type==='confirmSkip'){prefs.tutorial=false;prefs.fog=2;prefSave();document.querySelector('#dialog').close();if(type==='finishTutorial')openTab('eggs');else render();return;}
 if(type==='restartTutorial'){prefs.tut=prefs.fog>=2?5:1;prefs.tutorial=true;prefs.eggSelected=false;prefSave();document.querySelector('#dialog').close();render();return;}
 if(type==='toggleSound'){prefs.sound=!prefs.sound;setSound(prefs.sound);prefSave();showDialog('settings');sound('tap');return;}
 if(type==='toggleMotion'){prefs.motion=!prefs.motion;prefSave();render();showDialog('settings');return;}
 if(type==='resetConfirm'){state=E.createState();selected=1;teamIds=null;chosenSlot=null;previousRed=false;world.resetAway?.();panelOpen=false;tab='home';prefs.tut=1;prefs.fog=0;prefs.tutorial=true;prefs.eggSelected=false;prefs.started=true;prefSave();persist();document.querySelector('#dialog').close();world.home();render();return;}
 if(type==='renameSubmit'){const n=document.querySelector('#dragon-name').value;const was=E.dragonName(state.dragons.find(d=>d.id===selected));perform({type:'rename',id:selected,name:n});if(E.dragonName(state.dragons.find(d=>d.id===selected))!==was||!n.trim())document.querySelector('#dialog').close();return;}
 if(type==='moveDragon'){perform({type,id:selected,slot:+value});document.querySelector('#dialog').close();return;}
 let a={type:type==='barter'?'buyEgg':type,id:type==='sell'?+value:selected};
 if(type==='buyEgg'||type==='barter'){a.species=value;a.payment=type==='barter'?'berries':'coins';if(chosenSlot!==null)a.slot=chosenSlot;chosenSlot=null;}
 if(['travel','unlockLocation','upgradeLocation'].includes(type))a.location=value;
 if(type==='expedition')a.team=adultTeam();
 if(type==='plantTree')a.shift=value;
 if(type==='claimGoal')a.goal=value;
 perform(a);
});
let lastTap={x:innerWidth/2,y:innerHeight/2};
document.addEventListener('pointerdown',e=>{lastTap={x:e.clientX,y:e.clientY};},{capture:true,passive:true});
// Gains fly in a hand-drawn arc from the tap point to their HUD capsule, then the capsule pops.
function flyReward(key,delta){
 const target=document.querySelector(`.balance[data-resource="${key}"] .gem`);if(!target||!prefs.motion)return;
 const to=target.getBoundingClientRect(),tx=to.left+to.width/2,ty=to.top+to.height/2,n=Math.min(7,Math.max(2,Math.ceil(delta/3)));
 for(let i=0;i<n;i++){const el=document.createElement('span');el.className='fly-reward';el.innerHTML=gem(resourceIcon[key],30);document.body.append(el);
  const sx=lastTap.x+(Math.random()-.5)*50,sy=lastTap.y+(Math.random()-.5)*30,mx=(sx+tx)/2+(Math.random()-.5)*160,my=Math.min(sy,ty)-80-Math.random()*90;
  const anim=el.animate([{transform:`translate(${sx}px,${sy}px) scale(.3) rotate(0deg)`,opacity:0},{transform:`translate(${sx+(Math.random()-.5)*60}px,${sy-50}px) scale(1.15) rotate(-12deg)`,opacity:1,offset:.22},{transform:`translate(${mx}px,${my}px) scale(1) rotate(10deg)`,offset:.6},{transform:`translate(${tx}px,${ty}px) scale(.55) rotate(0deg)`,opacity:.9}],{duration:780+i*70,delay:i*55,easing:'cubic-bezier(.45,0,.55,1)',fill:'forwards'});
  let landed=false;const land=()=>{if(landed)return;landed=true;el.remove();const cap=target.closest('.balance');cap.classList.remove('balance-hit');void cap.offsetWidth;cap.classList.add('balance-hit');};
  anim.onfinish=land;setTimeout(land,780+i*125+250);}
}
function resourceFeedback(before){
 for(const [key,value] of Object.entries(state.resources)){
  const delta=value-before[key];if(!delta)continue;
  const el=document.querySelector(`[data-resource="${key}"]`);if(!el)continue;
  if(delta>0)flyReward(key,delta);
  el.classList.remove('balance-changed');void el.offsetWidth;el.classList.add('balance-changed');
  const label=document.createElement('span');label.className=`balance-delta ${delta<0?'spent':''}`;label.textContent=`${delta>0?'+':''}${delta}`;el.append(label);setTimeout(()=>label.remove(),1500);
 }
}
function nearPanel(){
 const d=state.dragons.find(d=>d.id===selected)||first();
 if(nearLocalId!==d.id){nearLocalId=d.id;nearResult=nearRecords[d.id]||null;nearCreature=nearResult?.dragon||null;nearError='';}
 const ready=onchain?.available,proof=nearResult?.transactions?.length?nearResult.transactions:onchain?.proof||[];
 return heading('NEAR TESTNET','Справжній обмін. Тестові акаунти.')+`<p>Долина працює у браузері. Окремо можна записати дракона у відкритий реєстр NEAR і перевірити передачу власності між двома демонстраційними акаунтами.</p><div class="connection-state"><strong>${ready?'Контракт працює у testnet':onchain===null?'Перевіряємо з’єднання…':'Тестовий сервер зараз недоступний'}</strong>${onchain?.contractUrl?`<a href="${esc(onchain.contractUrl)}" target="_blank" rel="noopener noreferrer">${esc(onchain.contractId)} ↗</a>`:''}</div>${ready?`<div class="near-dragon"><span class="thumb">${dragon(d.species,d.stage)}</span><span><strong>${(d.name?`<span data-no-tr>${esc(d.name)}</span>`:esc(name(d)))}</strong><small>${E.SPECIES[d.species].kind} · локальний дракон #${d.id}</small></span></div>${action(nearBusy?'Підтверджуємо в мережі…':nearCreature?'Запис дракона підтверджено':'1. Додати цього дракона до реєстру','nearRegister','primary',nearBusy||Boolean(nearCreature))}${action(nearBusy?'Транзакція виконується…':Date.now()<nearCooldown?'Мережа підтверджена · обмін за мить':nearResult?.verifiedOwnerTransfer?'Обмін підтверджено ✓':'2. Виконати тестовий обмін','nearTrade','secondary',nearBusy||!nearCreature||Date.now()<nearCooldown||nearResult?.verifiedOwnerTransfer)}<p class="subtle">Ціна обміну: 0.001 testNEAR. Використовуються лише тестові кошти окремих демо-акаунтів. Твій гаманець не підключено; дракон у локальній грі залишається з тобою.</p>`:action('Перевірити з’єднання','nearRefresh','secondary',nearBusy)}${nearError?`<p class="near-error" role="alert">${esc(nearError)}</p>`:''}${nearCreature?`<p class="near-owner">Запис #${esc(nearCreature.id)} · власник<br><a href="${esc(nearResult?.ownerUrl||'https://testnet.nearblocks.io/address/'+nearCreature.owner_id)}" target="_blank" rel="noopener noreferrer">${esc(nearCreature.owner_id)} ↗</a></p>`:''}${proof.length?`<details class="near-proof"><summary>Перевірити транзакції в explorer</summary>${proof.map(tx=>`<a href="${esc(tx.url)}" target="_blank" rel="noopener noreferrer">${esc(tx.method)} · ${esc(tx.hash?.slice(0,12))}… ↗</a>`).join('')}</details>`:''}<p class="subtle">Це власний реєстр, ще не стандарт NFT NEP-171. Він не підтверджує локальне вирощування. Ігрові монети не є токенами. AI та події від ціни NEAR у цій збірці не підключені.</p>`;
}
async function loadNear(reopen=false){
 try{const response=await fetch('/api/near/status');if(!response.ok)throw Error('Локальна testnet-демонстрація недоступна.');onchain=await response.json();}catch{onchain={available:false};}
 if(reopen||(document.querySelector('#dialog')?.open&&document.querySelector('#dialog').dataset.kind==='nearInfo'))showDialog('nearInfo');
}
async function nearAction(type){
 if(nearBusy)return;nearBusy=true;nearError='';showDialog('nearInfo');
 const d=state.dragons.find(d=>d.id===selected)||first();
 try{
  const response=await fetch(type==='nearRegister'?'/api/near/register':'/api/near/demo-trade',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(type==='nearRegister'?{species:d.species,name:name(d),localId:`${(session||'default').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,35)}_${d.id}`}:{creatureId:nearCreature.id})});
  const data=await response.json();if(!response.ok)throw Error(data.error||'Мережа не підтвердила дію.');
  nearResult=data;nearCreature=data.dragon;nearLocalId=d.id;nearRecords[d.id]=data;try{localStorage.setItem(KEY+'-near',JSON.stringify(nearRecords));}catch{}nearCooldown=Date.now()+15000;setTimeout(()=>{if(document.querySelector('#dialog').open&&document.querySelector('.near-dragon'))showDialog('nearInfo');},15100);toast(data.verifiedOwnerTransfer?'Передачу власності підтверджено в NEAR testnet.':'Дракона записано в реєстр NEAR testnet.');sound('claim');
 }catch(error){nearError=error.message;}
 finally{nearBusy=false;if(document.querySelector('#dialog').open&&document.querySelector('#dialog').dataset.kind==='nearInfo')showDialog('nearInfo');}
}
function showDialog(kind){
 const dialog=document.querySelector('#dialog');dialog.dataset.kind=kind;let body;
 if(kind==='away'){const ready=state.dragons.filter(d=>d.stage==='adult'&&!state.expedition?.team.includes(d.id)&&E.production(state,d).stored);const totals={};for(const d of ready){const p=E.production(state,d);totals[p.resource]=(totals[p.resource]||0)+p.stored;}const mins=Math.round(awayMs/60000);body=heading('З ПОВЕРНЕННЯМ','Поки тебе не було',`Минуло ${mins<60?`${mins} хв`:`${Math.round(mins/60)} год`}. Дракони не сиділи без діла!`)+`<div class="away-loot">${Object.entries(totals).map(([k,n])=>`<span>${gem(resourceIcon[k],40)}<b>+${n}</b></span>`).join('')}</div>${action('Зібрати все','collectAll','primary')}`;}
 else if(kind==='settings')body=heading('НАЛАШТУВАННЯ','Як тобі зручно')+`<div class="setting-row"><span>Звуки гри<small>М’які сигнали дій і нагород</small></span>${action(prefs.sound?'Увімкнено':'Вимкнено','toggleSound','secondary')}</div><div class="setting-row"><span>Анімації<small>Можна зменшити рух</small></span>${action(prefs.motion?'Увімкнено':'Зменшено','toggleMotion','secondary')}</div><div class="setting-row"><span>Мова · Language</span><span class="lang-pills">${Object.entries(LANGS).map(([id,label])=>`<button class="button ${id===lang?'primary':'secondary'} small" data-action="setLang:${id}" lang="${id}">${label}</button>`).join('')}</span></div>${action('Повторити підказки навчання','restartTutorial','secondary')}${action('Почати нову пригоду','resetView','ghost')}<p class="subtle">Збереження лише в цьому браузері. Далекі анімації призупиняються; виробництво рахується таймерами.</p>`;
 else if(kind==='help')body=heading('ПЕРША ПРИГОДА','Долина росте разом із тобою')+`<ol class="help-list"><li>Вилупи яйце й нагодуй малюка тричі.</li><li>Збирай ягоди, жарокамінь і руду. У лісі є безкоштовні ягоди.</li><li>Виконуй замовлення й запрошуй три різні види драконів.</li><li>Створи оберіг. У затемненні вирушай до старої брами.</li><li>Віднови святилище та відкрий кар’єр і руїни.</li></ol><p>Колесо миші або два пальці — масштаб. Перетягування — огляд. Кнопка дому — повернення. Клавіатура: стрілки, +/−, Home.</p>${action('Повернутись до гри','closeDialog','primary')}`;
 else if(kind==='phaseInfo')body=heading('ДВА СТАНИ ОДНІЄЇ ДОЛИНИ','Світло та затемнення')+`<p>За денного світла готуй припаси й вирощуй друзів. У затемненні відкривається шлях до брами. Дракони вдома працюють в обох станах.</p><p>Кожна фаза триває 2 хвилини. Уже розпочата експедиція завершується незалежно від неба.</p><p class="subtle">У цій збірці працює ігровий цикл. Ринкова ціна NEAR ще не запускає подій.</p>${action('Зрозуміло','closeDialog','primary')}`;
 else if(kind==='nearInfo')body=nearPanel();
 else if(kind==='skipTutorial')body=heading('НАВЧАННЯ','Досліджувати самостійно?')+`<p>Підказку розділу можна натиснути будь-коли. Навчання повертається через налаштування.</p>${action('Так, пропустити підказки','confirmSkip','primary')}${action('Залишити навчання','closeDialog','secondary')}`;
 else if(kind==='resetView')body=heading('НОВА ПРИГОДА','Почати з першого яйця?')+`<p>Поточний локальний прогрес цієї сесії буде замінено. </p>${action('Так, почати заново','resetConfirm','primary')}${action('Продовжити поточну','closeDialog','secondary')}`;
 else if(kind==='menu')body=heading('HATCHGLEN','Твоя долина чекає')+`${action('Продовжити пригоду','closeDialog','primary')}${action('Як грати','help','secondary')}${action('Налаштування','settings','secondary')}<p class="subtle">Raise dragons. Wake the valley.</p>`;
 else if(kind==='dragonInfo'){
 const d=state.dragons.find(d=>d.id===selected),sp=E.SPECIES[d.species],upgrade=E.upgradeCost(state,d),currentOutput=E.production(state,d).output,nextOutput=E.production(state,{...d,level:d.level+1}).output;
 body=heading(sp.kind,(d.name?`<span data-no-tr>${esc(d.name)}</span>`:esc(name(d))),sp.desc)+`<div class="dialog-dragon">${dragon(d.species,d.stage)}</div><label for="dragon-name">Ім’я дракона</label><div class="input-row"><input id="dragon-name" maxlength="20" enterkeyhint="done" onkeydown="if(event.key==='Enter'){event.preventDefault();this.parentNode.querySelector('[data-action=renameSubmit]').click()}" value="${esc(d.name||'')}" placeholder="${sp.name}">${action('Зберегти','renameSubmit','secondary')}</div><p>Рівень ${d.level}/${E.MAX_LEVEL}. Поточне місце: ${E.LOCATIONS[d.location].name}.</p>${upgrade?`<div class="upgrade-preview"><span>Збір зараз<strong>${currentOutput} / ${sp.cycle} с</strong></span>${icon('arrow',22)}<span>Наступний рівень<strong>${nextOutput} / ${sp.cycle} с</strong></span></div>`:''}${action(upgrade?`Покращити ${cost(upgrade)}`:'Найвищий рівень','upgrade','primary',d.level>=E.MAX_LEVEL||(d.level>=3&&!state.restored)||!canPay(upgrade)||Boolean(state.expedition?.team.includes(d.id)),d.level>=3&&d.level<E.MAX_LEVEL&&!state.restored?'Віднови Серце долини для рівнів 4–5':state.expedition?.team.includes(d.id)?'Дочекайся повернення дракона':lack(upgrade))}<h3>Переселити у вільне гніздо</h3><div class="move-options">${E.availableSlots(state).filter(slot=>!state.dragons.some(other=>other.slot===slot.id)).map(slot=>action(`${E.LOCATIONS[slot.location].name} · гніздо ${slot.id+1}`,`moveDragon:${slot.id}`,'ghost',Boolean(state.expedition?.team.includes(d.id)))).join('')||'<p class="subtle">Усі відкриті гнізда зайняті.</p>'}</div>`;
 }else body=(kind==='chapter2'?`<div class="completion-art trio">${[...new Set(state.dragons.filter(d=>d.stage==='adult').map(d=>d.species))].slice(0,3).map(k=>`<img src="/art/dragons/${k}.webp" alt="">`).join('')}</div>`:`<div class="completion-art"><img src="/art/shrine.webp" alt=""></div>`)+heading(kind==='chapter2'?'ДРУГИЙ РОЗДІЛ ЗАВЕРШЕНО':'ПЕРШИЙ РОЗДІЛ ЗАВЕРШЕНО',kind==='chapter2'?'Долина знову жива':'Світло повернулось',kind==='chapter2'?'Три землі об’єднані. Твої друзі дали цій долині новий початок.':'Серце прокинулось і відкрило четверте гніздо. Попереду — нові землі.')+`<div class="completion-stats"><span><b>${state.dragons.length}</b>драконів</span><span><b>${state.trades}</b>обмінів</span><span><b>${state.expeditions}</b>походів</span></div>${action('Повернутись у долину','closeDialog','primary')}`;
 dialog.innerHTML=`<button class="close-panel" data-action="closeDialog" aria-label="Закрити вікно">${icon('close',20)}</button>${body}`;
 if(!dialog.open)dialog.showModal();
}
let previousRed=E.phase(state).red;
setInterval(()=>{
 if(!started||document.hidden)return;
 E.tick(state);const now=Date.now(),p=E.phase(state);
 if(p.red!==previousRed){previousRed=p.red;phaseEvent(p.red);}
 if(signature()!==lastSignature)render();
 else{
 document.querySelector('[data-live="phase"]')?.replaceChildren(document.createTextNode(clock(p.left)));
 const treeLive=document.querySelector('[data-live="tree"]');if(treeLive&&state.tree.shift){const left=state.tree.ends-now;treeLive.textContent=clock(left);const bar=treeLive.nextElementSibling?.querySelector('i');if(bar)bar.style.width=`${Math.round(100*(1-left/(E.TREE_SHIFTS[state.tree.shift].seconds*1000)))}%`;}
 const wait=document.querySelector('[data-live="phase-wait"]');if(wait)wait.textContent=clock(p.left);
 const ex=document.querySelector('[data-live="expedition"]');if(ex&&state.expedition){ex.textContent=clock(state.expedition.ends-now);const bar=ex.parentElement.nextElementSibling?.querySelector('i');if(bar)bar.style.width=`${Math.min(100,100*(1-(state.expedition.ends-now)/state.expedition.duration))}%`;}
 const prod=document.querySelector('[data-live="production"]'),d=state.dragons.find(d=>d.id===selected);if(prod&&d&&!E.production(state,d).stored&&!state.expedition?.team.includes(d.id))prod.textContent=clock(d.next-now);
 if(d&&tab==='home'&&panelOpen){
  const bar=document.querySelector('.selected-controls .meter i');
  if(d.stage==='egg'){const button=document.querySelector('[data-action="hatch"]');if(button){const v=now>=d.hatchAt?'Вилупити дракона':`Яйце зігрівається · ${clock(d.hatchAt-now)}`;if(button.dataset.src!==v){button.dataset.src=v;button.textContent=v;}}if(bar)bar.style.width=`${Math.min(100,100*(1-(d.hatchAt-now)/E.HATCH_MS))}%`;}
  else if(d.stage==='adult'&&bar){const prod=E.production(state,d);bar.style.width=`${prod.away?0:prod.stored?100:Math.max(0,100*(1-(d.next-now)/(prod.cycle*1000)))}%`;}
 }
 for(const button of document.querySelectorAll('[data-action="forage"]')){if(button.textContent.includes('·')){const v=`Зібрати 3 ягоди · ${now<state.forageAt?clock(state.forageAt-now):'готові'}`;if(button.dataset.src!==v){button.dataset.src=v;button.textContent=v;}}}
 world.update(state,{selected:worldSelection(),now,fog:prefs.fog??2});applyTutorialFocus();
 }
},500);
window.addEventListener('storage',e=>{if(e.key===KEY&&e.newValue){try{state=E.hydrate(JSON.parse(e.newValue));render();}catch{}}});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){latest();render();}});
shell();
startI18n();
loadNear();
// Everything visible on the first game frame is decoded before the boot screen lifts;
// the eclipse plate is fetched afterwards by the world so it never competes with the day plate.
const BOOT_ART=['/art/splash.webp','/art/valley-day.webp','/art/market.webp','/art/shrine.webp','/brand/hatchglen-logo-dark.svg',...['moss','ember','stone','mist','crystal'].flatMap(k=>[`/art/dragons/${k}.webp`,`/art/dragons/baby-${k}.webp`])];
// Keep the decoded images referenced so panels with dragon cards never pop in empty.
const bootImages=BOOT_ART.map(src=>{const img=new Image();img.src=src;return img;});
const artReady=bootImages.map(img=>img.decode().catch(()=>{}));
Promise.race([Promise.allSettled([document.fonts.ready,...artReady]),new Promise(resolve=>setTimeout(resolve,4000))]).then(()=>{const boot=document.querySelector('#boot-screen');if(!boot)return;boot.classList.add('done');boot.querySelector('strong').textContent='Долина готова!';setTimeout(()=>boot.remove(),650);});
