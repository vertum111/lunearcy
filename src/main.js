import * as E from './engine.js';
import {icon,egg,dragon,gem,navIcon,phaseGlyph,pic,nearMark,nearEgg,lucy} from './art.js';
import {mountWorld} from './world.js';
import {setSound,sound} from './audio.js'
import {playEclipseCutscene} from './cutscene.js';
import {preloadGame,preloadLater} from './preload.js';
import {openMarketWeek} from './market-week.js';
import './game.css';
import './skin.css';
import './minimal.css';
import {lang,setLang,LANGS,startI18n,translateNode} from './i18n.js';
import {connect as connectChain,explorer as nearExplorer,CONTRACT as NEAR_CONTRACT} from './chain.js';

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
// ---- The valley on NEAR testnet (see chain.js). On by default; ?offline or VITE_CHAIN=off keeps the game local only.
const CHAIN_ON=import.meta.env.VITE_CHAIN!=='off'&&!new URLSearchParams(location.search).has('offline');
let chain=null,chainReady=null,chainStatus={kind:'off'},chainRefreshed=0;
// Email / Google sign-in (Privy). The App ID is public; the dashboard restricts which sites may use it.
const PRIVY_APP_ID=import.meta.env.VITE_PRIVY_APP_ID||'cmw6y3hqm00g20hjm0j4j79f3';
let privy=null,signedIn=null;
function startChain(identity){
 if(!CHAIN_ON)return;
 chain?.close();
 // The guest's NEAR key lives under its own name (the old registry demo used KEY+'-near' for its records).
 chain=connectChain({storageKey:KEY+'-player-key',identity,
  onState:s=>{try{state=E.hydrate(s);hasSave=true;persist();if(started)render();}catch(e){console.warn('NEAR state',e);}},
  onStatus:st=>{chainStatus=st;showChainStatus();},
  onError:e=>console.warn('NEAR',e?.message||e)});
 chainReady=chain.start(()=>state).catch(e=>{console.warn('NEAR unavailable, playing locally:',e?.message||e);chain=null;chainStatus={kind:'offline'};showChainStatus();});
}
/** Loads Privy on demand. A signed-in player's valley lives on their Privy wallet; signing out returns to the guest. */
async function loadPrivy(){
 if(privy)return privy;
 const {startPrivy}=await import('./privy.js');
 privy=startPrivy({appId:PRIVY_APP_ID,
  onAccount:({accountId,signer,email})=>{const fresh=!signedIn;signedIn={accountId,email};prefs.login='privy';prefSave();startChain({accountId,signer});if(fresh&&started)toast(email?`Ти увійшов: ${email}. Долина збережена в NEAR.`:'Ти увійшов. Долина збережена в NEAR.','success');if(document.querySelector('#dialog').open&&document.querySelector('#dialog').dataset.kind==='nearInfo')showDialog('nearInfo');},
  onLogout:()=>{signedIn=null;delete prefs.login;prefSave();startChain();if(document.querySelector('#dialog').open)showDialog('nearInfo');}});
 return privy;
}
async function signIn(){try{(await loadPrivy());setTimeout(()=>privy.login(),50);}catch(e){console.warn('Privy',e);toast('Вхід зараз недоступний. Гра працює як гість.','error');}}
function showChainStatus(){
 const el=document.querySelector('#local-status');if(!el)return;
 const text={synced:'Збережено в NEAR',saving:'Зберігаємо в NEAR…',connecting:'Підключаємо NEAR…',joining:'Створюємо долину в NEAR…',offline:'Локальне збереження',off:'Локальне збереження'}[chainStatus.kind]||'Локальне збереження';
 el.textContent=text;translateNode(el);el.closest('.status-label')?.classList.toggle('on-chain',chainStatus.kind==='synced'||chainStatus.kind==='saving');
}
let started=false,tab='home',selected=state.dragons[0]?.id,panelOpen=false,teamIds=null,chosenSlot=null,locationId='grove',world,lastSignature='',toastTimer,activeEventUntil=0;
let onchain=null,nearBusy=false,nearResult=null,nearError='',nearCreature=null,nearCooldown=0,nearLocalId=null,nearRecords={};
try{nearRecords=JSON.parse(localStorage.getItem(KEY+'-near')||'{}');}catch{}
const app=document.querySelector('#app');
// Big desktop windows scale the interface up, so panels and text stay readable next to the zoomed valley.
function uiScale(){const z=innerWidth<761?1:Math.max(1,Math.min(1.6,innerWidth/1180,innerHeight/780));document.documentElement.style.setProperty('--ui',z.toFixed(3));}
uiScale();addEventListener('resize',uiScale);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const seconds=ms=>Math.max(0,Math.ceil(ms/1000));
const clock=ms=>`${Math.floor(seconds(ms)/60)}:${String(seconds(ms)%60).padStart(2,'0')}`;
const resourceIcon={coins:'coin',berries:'berry',crystals:'crystal'};
const resourceForms={coins:['монета','монети','монет'],berries:['ягода','ягоди','ягід'],crystals:['кристал','кристали','кристалів']};
// Developer shortcuts (eclipse toggle) only with ?debug in the URL.
const DEBUG=new URLSearchParams(location.search).has('debug');
// ?cutscene replays the first-eclipse cutscene right after "Play", for reviewing it.
const PREVIEW_CUTSCENE=new URLSearchParams(location.search).has('cutscene');
function plural(n,forms){const mod=n%100,i=mod>=11&&mod<=14?2:n%10===1?0:n%10>=2&&n%10<=4?1:2;return forms[i];}
function amount(n,key){const forms=resourceForms[key],mod=n%100,index=mod>=11&&mod<=14?2:n%10===1?0:n%10>=2&&n%10<=4?1:2;return `${n} ${forms[index]}`;}
const names={home:'Притулок',eggs:'Яйця',market:'Ринок',expedition:'Похід',valley:'Долина'};
let collectionView='quest';
function persist(){try{localStorage.setItem(KEY,JSON.stringify(state));hasSave=true;}catch{toast('Браузер не дозволив зберегти прогрес.','error');}}
function prefSave(){try{localStorage.setItem(PREF,JSON.stringify(prefs));}catch{}}
function latest(){try{const raw=localStorage.getItem(KEY);if(raw)state=E.hydrate(JSON.parse(raw));}catch{}}
function cost(items){return `<span class="costs">${Object.entries(items||{}).map(([k,n])=>`<span class="cost ${state.resources[k]<n?'short':''}" title="${E.RESOURCE[k]}">${gem(resourceIcon[k],20)}${n}</span>`).join('')}</span>`;}
function canPay(items){return Boolean(items)&&Object.entries(items).every(([k,n])=>state.resources[k]>=n);}
function action(text,a,style='secondary',disabled=false,why=''){const button=`<button class="button ${style}" data-action="${a}" ${disabled?'disabled':''}>${text}</button>`;return disabled&&why?`<span class="act">${button}<small class="why${/^Ще потрібно/.test(why)?'':' info'}">${why}</small></span>`:button;}
// Disabled buttons say what is missing instead of just turning grey.
function lack(items){const miss=Object.entries(items||{}).filter(([k,n])=>state.resources[k]<n).map(([k,n])=>amount(n-state.resources[k],k));return miss.length?`Ще потрібно: ${miss.join(', ')}`:'';}
// Settings switches share the splash language pill: one dark pill, the chosen option filled with mint.
function seg(opts){return `<span class="seg">${opts.map(([label,on,act])=>`<button class="${on?'on':''}" ${on?'aria-pressed="true" disabled':`data-action="${act}" aria-pressed="false"`}>${label}</button>`).join('')}</span>`;}
function heading(over,title,desc='',art=''){return `<div class="panel-heading${art?' has-art':''}">${art?`<img class="panel-art" src="${art}" alt="" draggable="false">`:''}<span class="kicker">${over}</span><h2>${title}</h2>${desc?`<p>${desc}</p>`:''}</div>`;}
function name(d){return E.dragonName(d);}
function adultTeam(){const adults=state.dragons.filter(d=>d.stage==='adult');return teamIds===null?adults.slice(0,1).map(d=>d.id):teamIds.filter(id=>adults.some(d=>d.id===id));}
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
 if(step!==prefs.tut){const before=prefs.tut;prefs.tut=step;prefSave();if(before===5&&step===6)firstEclipse();}
}
// Narrated onboarding (after Hatch Dragons): one verb per step; fog clears in two stages.
const TUTORIAL=[
 null,
 ['Густий туман укрив долину','Багато років тут не чути крил. Але глибоко під туманом ще жевріє світло…','fog'],
 ['Серце долини прокидається','У гнізді з коріння з’явилось перше за багато років яйце. <b>Торкнись</b>, щоб вилупити!','hatch'],
 ['Ягоди — це їжа','<b>Нагодуй</b> малюка тричі — кожне годування коштує 2 ягоди.','feed'],
 ['Дракону потрібен простір','Він уже дорослий! <b>Розвій туман</b> довкола, щоб відкрити весь Сонячний гай.','fog'],
 ['Перший врожай','Мохолист вирощує ягоди. Коли над ним з’явиться бульбашка — <b>торкнись</b> її, щоб зібрати.','collect'],
 ['Познайомся з Люсі','Люсі купує ягоди й кристали за монети. Відкрий <b>Ринок</b> і продай ягоди.','sell'],
 ['Ось і весь цикл!','Дракони збирають <b>ягоди</b> й <b>кристали</b> → Люсі платить за них <b>монетами</b> → за монети ти кличеш нових драконів. Картка мети підкаже наступний крок.','done']
];
function shell(){
 app.innerHTML=`<div class="game is-menu" role="main"><svg class="ink-filters" aria-hidden="true" width="0" height="0"><defs>${[1,2,3].map(n=>`<filter id="boil${n}" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="${n*7}"/><feDisplacementMap in="SourceGraphic" scale="3.2"/></filter><filter id="ink${n}" x="-4%" y="-4%" width="108%" height="108%" color-interpolation-filters="sRGB"><feMorphology in="SourceAlpha" operator="dilate" radius="1.7" result="d"/><feFlood flood-color="#1d2a22"/><feComposite in2="d" operator="in" result="o"/><feMerge result="m"><feMergeNode in="o"/><feMergeNode in="SourceGraphic"/></feMerge><feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="${n*11}"/><feDisplacementMap in="m" scale="2.6" xChannelSelector="R" yChannelSelector="G"/></filter><filter id="sel${n}" x="-12%" y="-12%" width="124%" height="124%" color-interpolation-filters="sRGB"><feMorphology in="SourceAlpha" operator="dilate" radius="2.5" result="halo"/><feFlood flood-color="#d8fff2" flood-opacity=".8"/><feComposite in2="halo" operator="in"/><feGaussianBlur stdDeviation="6" result="glow"/><feMorphology in="SourceAlpha" operator="dilate" radius="1.7" result="d"/><feFlood flood-color="#1d2a22"/><feComposite in2="d" operator="in" result="o"/><feMerge result="m"><feMergeNode in="glow"/><feMergeNode in="o"/><feMergeNode in="SourceGraphic"/></feMerge><feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="${n*11}"/><feDisplacementMap in="m" scale="2.6" xChannelSelector="R" yChannelSelector="G"/></filter>`).join('')}</defs></svg><div id="world" class="world-host"></div><div class="screen-vignette"></div><div class="paper-grain" aria-hidden="true"></div>
 <header class="hud"><button class="brand-button" data-action="menu" aria-label="Меню Lunearcy"><img src="/brand/lunearcy-mark.svg" width="36" height="36" alt=""><span>Lunearcy<small>ДРАКОНЯЧА ДОЛИНА</small></span></button><div class="balances" id="balances" aria-label="Ресурси"></div><div class="hud-tools"><button class="phase" data-action="phaseInfo" id="phase"></button><button class="icon-button" data-action="settings" aria-label="Налаштування">${icon('gear')}</button></div></header>
 <div id="chapter" class="chapter"></div><div class="camera-tools"><button data-camera="home" aria-label="Огляд усієї долини">${icon('home')}</button><button data-camera="in" aria-label="Наблизити">${icon('plus')}</button><button data-camera="out" aria-label="Віддалити"><span aria-hidden="true">−</span></button><small>Потягни, щоб оглянути світ</small></div>
 <section class="tutorial" id="tutorial" aria-label="Підказка навчання" aria-live="polite"></section>
 <button class="panel-backdrop" data-action="closePanel" aria-label="Закрити панель" tabindex="-1"></button>
 <aside class="inspector" id="inspector" aria-label="Ігрові дії" tabindex="-1"></aside>
 <nav class="nav" aria-label="Меню гри">${[['home','home'],['eggs','egg'],['market','market'],['expedition','compass'],['valley','book']].map(([id,ic])=>`<button data-tab="${id}" aria-label="${names[id]}" title="${names[id]}">${navIcon(ic)}<span>${names[id]}</span><i></i></button>`).join('')}</nav>
 <div class="status-label"><span class="status-dot"></span><span id="local-status">Локальне збереження</span><button data-action="nearInfo">${nearMark(11)} NEAR</button></div><div id="toast" role="status" aria-live="polite"></div><aside id="lira-tip" class="lira-tip" role="status" aria-live="polite" hidden></aside><div id="phase-event" aria-hidden="true"></div><dialog id="dialog"></dialog>
 <section class="main-menu splash" id="main-menu"><picture class="splash-art"><source media="(max-width: 900px)" srcset="/art/splash-sm.webp"><img src="/art/splash.webp" alt="" draggable="false"></picture><div class="splash-shade"></div><div class="splash-brand"><h1 class="splash-logo"><img src="/brand/lunearcy-mark.svg" alt="" width="76" height="76" draggable="false"><span>Lunearcy</span></h1><p class="splash-tag">Вирощуй драконів. Розбуди долину.</p><p class="splash-near">${nearMark(18)}<span>Створено на NEAR</span></p></div><div class="splash-cta"><button class="splash-play" data-action="play"><span>${hasSave?'Продовжити':'Почати гру'}</span></button><button class="splash-help" data-action="help">Як грати</button>${CHAIN_ON?'<button class="splash-signin" data-action="signIn">Увійти: пошта або Google</button>':''}</div><div class="splash-top"><div class="splash-lang">${Object.entries(LANGS).map(([id])=>`<button class="${id===lang?'on':''}" data-action="setLang:${id}" lang="${id}">${id.toUpperCase()}</button>`).join('')}</div><button class="splash-gear" data-action="settings" aria-label="Налаштування">${icon('gear')}</button></div></section>
 </div>`;
 world=mountWorld(document.querySelector('#world'),{onSelect:selectDragon,onAction:perform,onLocation:openLocation,onBackground:()=>{if(panelOpen&&tab==='home'){panelOpen=false;render();}}});
 world.update(state,{selected:null,now:Date.now(),fog:prefs.fog??2});
 render();
 // Tab strips (role=tablist): arrows, Home and End move between tabs and open them, like a native tab control.
document.addEventListener('keydown',e=>{const t=e.target.closest?.('[role="tablist"] [role="tab"]');if(!t||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
 const tabs=[...t.parentElement.querySelectorAll('[role="tab"]')],i=tabs.indexOf(t),n=tabs.length;
 const next=tabs[e.key==='Home'?0:e.key==='End'?n-1:(i+(e.key==='ArrowRight'?1:-1)+n)%n];e.preventDefault();next.focus();next.click();});
// The price "?" is a role=button span: Enter and Space toggle it; Escape first closes an open breakdown.
document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.classList?.contains('price-why')){e.preventDefault();e.target.click();}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){const open=document.querySelector('.price-why.open');if(open){open.classList.remove('open');open.setAttribute('aria-expanded','false');e.stopImmediatePropagation();}}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!document.querySelector('#dialog').open&&started){panelOpen=false;tab='home';render();}});
}
// Height of the docked dragon card, so the camera keeps the dragon above it.
// A tutorial banner at the top hides part of the map too, so the camera frames what is left below it.
function topInset(){const t=document.querySelector('.tutorial');if(!t||!t.offsetHeight||getComputedStyle(t).display==='none')return 0;return Math.max(0,t.getBoundingClientRect().bottom-document.querySelector('.game').getBoundingClientRect().top);}
// Everything below the dock's top edge is hidden (the dock sits above the tab bar), plus a little air.
function dockInset(){const el=document.querySelector('.inspector.compact.open');if(!el)return 0;const g=document.querySelector('.game').getBoundingClientRect();return Math.max(0,Math.round(g.bottom-el.getBoundingClientRect().top+12));}
// The world highlights a dragon only while its card is open; tapping it again (or empty ground) lets go.
function worldSelection(){return started&&panelOpen&&tab==='home'?selected:null;}
function selectDragon(id){
 if(id===selected&&panelOpen&&tab==='home'){panelOpen=false;render();sound('tap');return;}
 selected=id;tab='home';panelOpen=true;
 if(id===first().id){prefs.eggSelected=true;prefSave();}
 progressTutorial();render();world.focusDragon(id);sound('tap');
}
function openTab(id,keepSlot=false){if(!keepSlot)chosenSlot=null;if(id==='eggs'&&prefs.tut===7){prefs.tutorial=false;prefSave();}tab=id;panelOpen=id!=='home';if(id==='home'){panelOpen=false;world.home();}if(id==='market'){prefs.marketSeen=true;prefSave();}progressTutorial();render();if(panelOpen)document.querySelector('#inspector').scrollTop=0;sound('tap');}
// Scrolls only the side panel (scrollIntoView would also scroll the page behind it).
function panelScroll(sel){setTimeout(()=>{const box=document.querySelector('#inspector'),el=box?.querySelector(sel);if(!el)return;const top=el.getBoundingClientRect().top-box.getBoundingClientRect().top+box.scrollTop-(box.clientHeight-el.offsetHeight)/2;box.scrollTo({top:Math.max(0,top),behavior:prefs.motion?'smooth':'instant'});},30);}
function openLocation(id,meta={}){
 if(id==='eggs'){chosenSlot=meta.slot??null;openTab('eggs',true);return;}
 if(id==='realm'){toast(`${meta.name||'Ця земля'} ще під туманом — відкриється в наступних оновленнях.`,'info');sound('tap');return;}
 if(id==='forage'){perform({type:'forage'});return;}
 if(id==='market'){openTab('market');return;}
 if(id==='ruins'){openTab('expedition');world.focusLocation('ruins');return;}
 collectionView='quest';
 if(id==='shrine'){openTab('valley');panelScroll('#shrine-project');return;}
 if(id==='quarry'||id==='grove'){locationId=id;openTab('valley');world.focusLocation(id);panelScroll(state.restored?`#loc-${id}`:'#shrine-project');return;}
 openTab('valley');
}
// The selected dragon docks at the bottom like the reference: square action tiles above a slim card.
function tile(ic,label,act,main=false,disabled=false,price=null){return `<button class="tile${main?' tile-main':''}" data-action="${act}" ${disabled?'disabled':''}><span class="tile-ic">${ic}</span>${price?`<b class="tile-cost">${cost(price)}</b>`:''}<small>${label}</small></button>`;}
function detail(){
 const d=state.dragons.find(d=>d.id===selected)||first(),sp=E.SPECIES[d.species],p=E.production(state,d),now=Date.now();selected=d.id;
 let tiles='',body='',why='';
 if(d.stage==='egg'){
  const ready=now>=d.hatchAt;
  tiles=ready?tile(pic('act-hatch',34),'Вилупити','hatch',true):tile(pic('act-hurry',34),'Поквапити','hurry',true,!canPay(E.HURRY_COST),E.HURRY_COST);
  if(!ready&&!canPay(E.HURRY_COST))why=lack(E.HURRY_COST);
  body=`<p class="dock-status">${ready?'Готове вилупитись!':`Вилупиться за <b data-live="hatch">${clock(d.hatchAt-now)}</b>`} · даватиме ${E.RESOURCE[sp.resource].toLowerCase()} ${gem(resourceIcon[sp.resource],18)}</p><div class="meter"><i style="width:${Math.min(100,100*(1-(d.hatchAt-now)/E.HATCH_MS))}%"></i></div>`;
 }else if(d.stage==='baby'){
  const short=state.resources.berries<E.FEED_COST;
  tiles=tile(pic('act-feed',34),'Нагодувати','feed',true,short,{berries:E.FEED_COST})+(short?tile(gem('berry',34),'Галявина','forage',false,now<state.forageAt):'');
  if(short)why=lack({berries:E.FEED_COST});
  body=`<div class="feed-progress">${[0,1,2].map(i=>`<span class="${i<d.feeds?'fed':''}">${gem('berry',20)}</span>`).join('')}<small>Годування ${d.feeds}/3 — потім дорослий</small></div>`;
 }else{
  const up=E.upgradeCost(state,d);
  tiles=tile(gem(resourceIcon[p.resource],34),p.stored?`+${p.stored}`:'Зібрати','collect',true,!p.stored||p.away)
   +(up?tile(pic('act-level',34),`Рівень ${d.level+1}`,'upgrade',false,!canPay(up)||p.away,up):'')
   +tile(pic('act-about',34),'Про дракона','dragonInfo');
  if(up&&!canPay(up)&&!p.stored)why=lack(up);
  if(p.away)why='Дочекайся повернення дракона';
  body=`<p class="dock-status"><span><span class="dock-line">${gem(resourceIcon[p.resource],18)} ${sp.job}: <b>+${p.output}</b> кожні ${p.cycle} с${p.boost>1?` <i class="boost">${sp.trait.name} +${Math.round((p.boost-1)*100)}%</i>`:''}</span>${up?`<small>Рівень ${d.level+1} дасть +${E.outputAt(d.species,d.level+1,E.valleyBonus(state)*p.boost)}</small>`:''}</span></p>${sp.trait?`<p class="trait">${icon('sparkle',16)}<span><b>${sp.trait.name}.</b> ${sp.trait.text}</span></p>`:''}<div class="compact-stat"><span>${p.away?'У поході':p.stored?'Готово до збору':'Наступна порція'}</span><strong data-live="production">${p.away?'Команда в дорозі':p.stored?`+${p.stored}`:clock(d.next-now)}</strong></div><div class="meter"><i style="width:${p.away?0:p.stored?100:Math.max(0,100*(1-(d.next-now)/(p.cycle*1000)))}%"></i></div>`;
 }
 const title=d.stage==='egg'?(nearEgg(d)?'Рідкісне NEAR-яйце':'Таємниче яйце'):(d.name?`<span data-no-tr>${esc(d.name)}</span>`:esc(name(d)));
 return `<div class="dock"><div class="dock-actions">${tiles}</div><div class="dock-card"><button class="close-panel" data-action="closePanel" aria-label="Закрити панель">${icon('close',18)}</button><span class="kicker">${d.stage==='egg'?'Нове життя':d.stage==='baby'?'Малюк':`Рівень ${d.level} · ${E.LOCATIONS[d.location].name}`}</span><h2>${title}</h2>${body}${why?`<small class="why${/^Ще потрібно/.test(why)?'':' info'}">${why}</small>`:''}</div></div>`;
}
function food(){return `<div class="food-supply"><h3>${gem('berry',24)} Лісова галявина</h3><p>Безкоштовні ягоди кожні ${E.FORAGE_MS/1000} секунд — щоб їжа ніколи не скінчилась.</p>${action(`Зібрати 3 ягоди · ${Date.now()<state.forageAt?clock(state.forageAt-Date.now()):'готові'}`,'forage','secondary',Date.now()<state.forageAt)}</div>`;}
function eggs(){
 const count=new Set(state.dragons.map(d=>d.species)).size,full=state.dragons.length>=state.slots;
 return heading('Нові мешканці','Кого запросимо?','Яйце коштує монети. Одні дракони вирощують ягоди — їжу, інші видобувають кристали — товар для Люсі.')+(chosenSlot!==null&&E.SLOTS[chosenSlot]?`<p class="nest-target">${icon('egg',18)} Яйце ляже в гніздо: <b>${E.LOCATIONS[E.SLOTS[chosenSlot].location].name}</b></p>`:'')+`<div class="species-list">${Object.entries(E.SPECIES).map(([id,sp])=>{const duplicate=count<3&&state.dragons.some(d=>d.species===id),locked=E.speciesLocked(state,id);return `<article class="species-card ${locked?'is-locked':''}"><div class="species-art">${dragon(id)}</div><div><span class="kicker">${sp.kind}</span><h3>${sp.name}</h3><p class="makes">${gem(resourceIcon[sp.resource],24)}<span><b>+${sp.output} ${E.RESOURCE[sp.resource].toLowerCase()}</b> <small>кожні ${sp.cycle} с</small></span></p>${sp.trait?`<p class="trait">${icon('sparkle',16)}<span><b>${sp.trait.name}.</b> ${sp.trait.text}</span></p>`:''}${locked?`<span class="owned locked-species">${icon('lock',16)} ${locked}</span>`:duplicate?'<span class="owned">Уже у твоїй долині</span>':action(`Купити яйце ${cost({coins:sp.eggCost})}`,`buyEgg:${id}`,'primary',full||!canPay({coins:sp.eggCost}),full?'Усі гнізда зайняті':lack({coins:sp.eggCost}))}</div></article>`;}).join('')}</div><p class="subtle">Гнізда: ${state.dragons.length}/${state.slots}. Перші три яйця — різних видів.</p>${full?'<button class="button secondary" data-tab="valley">Більше гнізд — у «Долині»</button>':''}`;
}
function valley(){
 const adults=state.dragons.filter(d=>d.stage==='adult'),kinds=new Set(adults.map(d=>d.species)).size,openLands=Object.values(state.locations).filter(l=>l.unlocked).length;
 const goals=E.goalStatus(state),claimable=goals.filter(g=>g.done&&!g.claimed).length;
 const views=`<div class="segmented" role="tablist">${[['quest','Мета','compass'],['flock','Зграя','book'],['goals',`Цілі${claimable?` <i>${claimable}</i>`:''}`,'check']].map(([id,label,ic])=>`<button role="tab" aria-selected="${collectionView===id}" tabindex="${collectionView===id?0:-1}" class="${collectionView===id?'on':''}" data-action="collectionView:${id}">${icon(ic,20)}<span>${label}</span></button>`).join('')}</div>`;
 const head=heading('Долина','Що далі?',`${state.dragons.length} ${plural(state.dragons.length,['дракон','дракони','драконів'])} · гнізд зайнято ${state.dragons.length}/${state.slots}`)+views;
 if(collectionView==='flock'){const owned=new Set(state.dragons.filter(d=>d.stage!=='egg').map(d=>d.species));return head+`<div class="score-pill">${gem('relics',20)} Сила зграї <b>${E.dragonScore(state)}</b></div><div class="collection-list">${state.dragons.map(d=>`<button data-select="${d.id}" class="collection-item"><span class="thumb">${d.stage==='egg'?egg(d):dragon(d.species,d.stage)}</span><span><strong>${d.stage==='egg'?(nearEgg(d)?'Рідкісне NEAR-яйце':'Таємниче яйце'):(d.name?`<span data-no-tr>${esc(d.name)}</span>`:esc(name(d)))}</strong><small>${d.stage==='egg'?'Очікує вилуплення':d.stage==='baby'?`Годування ${d.feeds}/3`:(state.expedition?.team.includes(d.id)?`У поході · рівень ${d.level}`:`Рівень ${d.level} · ${E.RESOURCE[E.SPECIES[d.species].resource]}`)}</small></span>${icon('arrow',17)}</button>`).join('')}</div><h3 class="section-title">Бестіарій</h3><div class="bestiary">${Object.entries(E.SPECIES).map(([id,sp])=>`<article class="beast ${owned.has(id)?'known':'unknown'}"><div class="beast-art">${dragon(id)}</div><h3>${owned.has(id)?sp.name:'???'}</h3><small>${sp.kind}</small><p>${owned.has(id)?sp.desc:E.speciesLocked(state,id)||'Вилупи цей вид, щоб дізнатися його історію…'}</p></article>`).join('')}</div>`;}
 if(collectionView==='goals')return head+`<div class="goal-list">${goals.map(g=>`<article class="goal ${g.claimed?'claimed':g.done?'done':''}"><div><h3>${g.title}</h3><p>${g.text}</p><div class="meter"><i style="width:${Math.round(100*g.value/g.target)}%"></i></div><small>${g.value}/${g.target}</small></div><div class="goal-reward"><span class="costs">${Object.entries(g.reward).map(([k,n])=>`<span class="cost">${gem(resourceIcon[k],20)}+${n}</span>`).join('')}</span>${g.claimed?`<span class="goal-check">${icon('check',22)}</span>`:action('Забрати',`claimGoal:${g.id}`,'primary small',!g.done)}</div></article>`).join('')}</div>`;
 const heart=`<section class="project has-art" id="shrine-project"><img class="project-art" src="/art/shrine.webp" alt="" draggable="false"><span class="kicker">Розділ 1 · Серце долини</span><h3>${state.restored?'Світло повернулось':'Пробуди святилище'}</h3>${state.restored?'<p>Четверте гніздо й Туманний дракон уже твої.</p>':`<p>Відкриє четверте гніздо й Туманного дракона.</p><ul class="requirements"><li>${kinds>=3?'✓':'○'} Три різні дорослі дракони · ${Math.min(kinds,3)}/3</li></ul>${action(`Відновити ${cost(E.RESTORE_COST)}`,'restore','primary',kinds<3||!canPay(E.RESTORE_COST),kinds<3?'Спершу вирости три різні види':lack(E.RESTORE_COST))}`}</section>`;
 const lands=state.restored?Object.entries(E.LOCATIONS).filter(([id])=>id!=='grove').map(([id,loc])=>{const open=state.locations[id].unlocked,req=E.locationRequirements(state,id);return `<section class="location-card ${locationId===id?'selected':''}" id="loc-${id}"><button class="location-name" data-focus="${id}">${icon(id==='quarry'?'crystal':'compass',25)}<span><strong>${loc.name}</strong><small>${open?'Відкрито':'Під туманом'}</small></span>${icon(open?'check':'lock',16)}</button><p>${loc.description}</p>${open?action('Показати на мапі',`travel:${id}`,'secondary'):action(`Відкрити ${cost(loc.unlockCost)}`,`unlockLocation:${id}`,'primary',!req.met||!canPay(loc.unlockCost),!req.met?req.reasons[0]:lack(loc.unlockCost))}</section>`;}).join(''):'';
 const L=state.valleyLevel||1,vc=E.valleyCost(state),allOpen=openLands===3;
 const prosper=state.restored?`<section class="project prosper" id="prosper-project"><span class="kicker">Процвітання · без меж</span><h3>Рівень долини ${L}</h3><p>${allOpen?(L>1?`Зараз дракони дають <b>+${Math.round((E.valleyBonus(state)-1)*100)}%</b>. Кожен новий рівень — ще +10% до збору й походів.`:'Кожен рівень долини дає драконам +10% до збору й походів. Рівнів — без межі.'):'Відкрий кар’єр і руїни — тоді долину можна буде піднімати рівень за рівнем.'}</p>${action(`Рівень ${L+1} ${cost(vc)}`,'growValley','primary',!allOpen||!canPay(vc),!allOpen?'Спершу відкрий усі землі':lack(vc))}</section>`:'';
 // Once every land is open the endless valley level is the only live goal, so it leads and the finished chapters follow.
 return allOpen?head+prosper+heart+lands:head+heart+lands+prosper;
}
// A tiny hand-drawn price line: how Lucy's price moved over the last trades and resales.
function spark(values=[]){
 const v=values.length>1?values:[values[0]??0,values[0]??0],w=132,h=40,max=Math.max(...v),min=Math.min(...v),span=Math.max(1,max-min);
 // A price that never moved is drawn through the middle, level with its caption.
 const pts=v.map((n,i)=>[4+i*(w-8)/(v.length-1),max===min?h/2:h-6-(n-min)*(h-12)/span]);const last=pts.at(-1),trend=v.at(-1)-v.at(-2);
 return `<svg class="spark ${trend<0?'down':trend>0?'up':''}" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="Ціна: від ${min} до ${max}"><polyline points="${pts.map(p=>p.map(n=>n.toFixed(1)).join(',')).join(' ')}" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="4.5"/></svg>`;
}
function market(){
 const st=E.marketStatus(state);
 // Berries are food too: the big button keeps enough to raise one baby (3 feeds).
 const keep=k=>k==='berries'&&state.resources.berries>3*E.FEED_COST?3*E.FEED_COST:0;
 const row=k=>{const have=state.resources[k],q=E.quote(state,k,have-keep(k)),p=st.prices[k];return `<article class="trade-row trade-${k}"><div class="trade-good">${gem(resourceIcon[k],44)}<span><strong>${E.RESOURCE[k]}</strong><small>У тебе: ${have}</small></span><b class="trade-price">${p}${gem("coin",24)}<small>за 1</small><span class="price-why" tabindex="0" role="button" aria-expanded="false" aria-label="Як Люсі рахує ціну" aria-describedby="price-tip-${k}">?<span class="price-tip" id="price-tip-${k}" role="tooltip"><strong>Як Люсі рахує ціну</strong>${E.explainPrice(state,k).map(([l,v],i,a)=>`<span${i===a.length-1?' class="tip-total"':''}><em>${l}</em><b>${v}</b></span>`).join('')}<small>За цими ж правилами грає «Тиждень ринку за хвилину»</small></span></span></b></div><div class="trade-trend">${spark(state.market.history?.[k])}<small>Ціна за останні угоди</small></div><p class="mara-says">«${E.marketMood(state,k)}»</p><div class="trade-actions">${action(`Продати 1 · +${p}`,`sell:${k}:1`,'secondary',!have||st.wallet<p)}${action(have?`Продати ${q.units||have} · +${q.total}`:'Нічого продати',`sell:${k}:${Math.max(1,have-keep(k))}`,'primary',!q.units,!have?(k==='berries'?'Ягоди вирощує Мохолист':'Кристали видобувають Жарик і Кремінь'):q.units?'':'У Люсі не вистачає монет')}</div>${keep(k)?`<small class="keep-note">${keep(k)} ягід лишаю на годування малюка</small>`:''}</article>`;};
 return heading('Крамниця Люсі','Продавай — отримуй монети','Люсі платить зі свого гаманця. Що більше в неї на складі, то менше вона платить. Монети, які ти витрачаєш у долині, повертаються до неї.','/art/market.webp')+`<div class="merchant"><span class="lucy-frame">${lucy(40)}</span><div><strong>Люсі · дух лісу</strong><small>Гаманець Люсі: <b>${st.wallet}</b> монет</small></div></div><div class="trades">${row('berries')}${row('crystals')}</div><p class="subtle">Люсі поступово розпродає склад сусідам — тоді ціни знову ростуть, а гаманець поповнюється.</p>${food()}<button class="button ghost small sim-week" data-action="simWeek">${icon('chart',18)} Тиждень ринку за хвилину</button><button class="button text-button" data-action="nearInfo">${nearMark(14)} Про NEAR та ончейн-торгівлю</button>`;
}
function expedition(){
 const ex=state.expedition,now=Date.now(),p=E.phase(state),adults=state.dragons.filter(d=>d.stage==='adult'),team=adultTeam(),arrived=ex&&now>=ex.ends;
 const loot=r=>`<span class="loot">${gem('coin',22)}+${r.coins}</span><span class="loot">${gem('crystal',22)}+${r.crystals}</span>`;
 const body=ex?`<div class="exp-facts"><span>Команда<strong>${ex.team.map(id=>esc(name(state.dragons.find(d=>d.id===id)))).join(', ')}</strong></span><span>Принесуть<strong>${loot(ex.reward)}</strong></span></div>${!arrived?`<div class="compact-stat"><span>Повернуться через</span><b data-live="expedition">${clock(ex.ends-now)}</b></div><div class="meter"><i style="width:${Math.min(100,100*(1-(ex.ends-now)/ex.duration))}%"></i></div>`:''}${action(arrived?'Забрати здобич':'Команда в дорозі…','claim','primary',!arrived)}`
  :`<p class="team-hint">Обери до трьох дорослих драконів. Кожен у команді з’їдає в дорозі 3 ягоди; що вищий рівень — то більше монет. Кремінь знаходить найбільше скарбів.</p><div class="team-list">${adults.length?adults.map(d=>`<button class="team-choice ${team.includes(d.id)?'chosen':''}" data-team="${d.id}" aria-pressed="${team.includes(d.id)}"><span class="thumb">${dragon(d.species)}</span><span><strong>${(d.name?`<span data-no-tr>${esc(d.name)}</span>`:esc(name(d)))}</strong><small>${team.includes(d.id)?'Іде в похід':`Рівень ${d.level} · залишається вдома`}</small></span>${icon(team.includes(d.id)?'check':'plus',18)}</button>`).join(''):'<p>Вирости першого дракона, щоб зібрати команду.</p>'}</div><div class="exp-facts"><span>Тривалість<strong>${E.EXPEDITION_MS/1000} секунд</strong></span><span>Принесуть<strong>${loot(E.expeditionReward(state,team))}</strong></span></div>${action(`Вирушити ${cost(E.expeditionCost(team))}`,'expedition','primary',!team.length||!canPay(E.expeditionCost(team)),!team.length?'Обери хоча б одного дракона':lack(E.expeditionCost(team)))}`;
 return heading('Похід за туман','Скарби старих руїн','Похід приносить у долину нові монети й кристали. Поки дракони в дорозі, удома вони не працюють.')+body+(DEBUG?`<button class="button ghost small" data-action="demoPhase">Демо: ${p.red?'повернути денне світло':'показати затемнення'}</button>`:'');
}
// Small dots on the bottom tabs: where something useful can be done right now.
function navBadges(){
 const now=Date.now(),ex=state.expedition,adults=state.dragons.filter(d=>d.stage==='adult'),kinds=new Set(adults.map(d=>d.species)).size;
 const free=state.dragons.length<state.slots,eggs=free&&Object.entries(E.SPECIES).some(([id,sp])=>!E.speciesLocked(state,id)&&canPay({coins:sp.eggCost}));
 const sells=['berries','crystals'].some(k=>state.resources[k]>=6&&E.quote(state,k).units);
 const trip=ex?now>=ex.ends:adults.length&&canPay(E.EXPEDITION_COST);
 const goals=E.goalStatus(state).filter(g=>g.done&&!g.claimed).length,heart=(!state.restored&&kinds>=3&&canPay(E.RESTORE_COST))||(state.locations.ruins.unlocked&&canPay(E.valleyCost(state)));
 if(prefs.tutorial&&prefs.tut<=7)return {};
 // One dot at a time: only on the tab the current goal points to. A returned trip and claimable goals always show.
 const aim=E.objective(state).tab,dot=(tabId,ok)=>ok&&aim===tabId?'•':'';
 return {eggs:dot('eggs',eggs),market:dot('market',sells),expedition:ex&&now>=ex.ends?'•':dot('expedition',trip),valley:goals?String(goals):heart?'•':''};
}
// HUD numbers roll to their new value instead of jumping (like coins being counted).
const shownBalance={};let countFrame=0;
function countBalances(){
 cancelAnimationFrame(countFrame);const from={...shownBalance},start=performance.now();
 const step=t=>{const k2=Math.min(1,(t-start)/450),e=1-(1-k2)**3;let busy=false;
  for(const [k,n] of Object.entries(state.resources)){const a=from[k]??n,v=Math.round(a+(n-a)*e);shownBalance[k]=v;const el=document.querySelector(`.balance[data-resource="${k}"] b`);if(el&&el.textContent!==String(v))el.textContent=v;if(v!==n)busy=true;}
  if(busy&&prefs.motion)countFrame=requestAnimationFrame(step);else for(const [k,n] of Object.entries(state.resources)){shownBalance[k]=n;const el=document.querySelector(`.balance[data-resource="${k}"] b`);if(el)el.textContent=n;}};
 countFrame=requestAnimationFrame(step);
}
function render(){
 const focusKey=rememberFocus();
 E.tick(state);progressTutorial();
 const now=Date.now(),p=E.phase(state),goal=E.objective(state);
 document.body.classList.toggle('eclipse',p.red);document.body.classList.toggle('reduced-motion',!prefs.motion);
 document.querySelector('#main-menu').hidden=started;
 document.querySelector('.game').classList.toggle('is-menu',!started);
 document.querySelector('#world').inert=!started;
 for(const el of document.querySelectorAll('.hud,.chapter,.camera-tools,.nav,.status-label'))el.inert=!started;
 document.querySelector('#balances').innerHTML=`<button class="res-group" data-action="resInfo">${Object.entries(state.resources).map(([k,n])=>`<span class="balance" data-resource="${k}"><span class="${k}">${gem(resourceIcon[k],30)}</span><span><b data-n="${shownBalance[k]??n}">${shownBalance[k]??n}</b><small>${E.RESOURCE[k]}</small></span></span>`).join('')}</button>`;
 countBalances();
 const passed=Math.min(4,Math.floor((1-p.left/E.PHASE_MS)*5));
 document.querySelector('#phase').innerHTML=`${phaseGlyph(p.red)}<span class="phase-dots" aria-hidden="true">${[0,1,2,3,4].map(i=>`<i class="${i<=passed?'on':''}"></i>`).join('')}</span><span class="phase-text">${p.red?'Затемнення':'Денне світло'}<small data-live="phase">${clock(p.left)}</small></span>`;
 document.querySelector('#chapter').innerHTML=`<button data-action="goal"><span class="chapter-progress">${goal.chapter||1}<small>РОЗДІЛ</small></span><span><small>${prefs.tutorial?'Мета пригоди':(goal.total?`${goal.step}/${goal.total} · ${goal.chapter===2?'Долина прокидається':'Перше світло'}`:`Процвітання · рівень ${goal.step}`)}</small><strong>${esc(goal.title)}</strong></span><span class="quest-bar"><i style="width:${goal.total?Math.round(100*(goal.step||0)/goal.total):Math.round(100*Math.min(1,...Object.entries(E.valleyCost(state)).map(([k,n])=>state.resources[k]/n)))}%"></i></span>${icon('arrow',16)}</button>`;
 const inspector=document.querySelector('#inspector');inspector.className=`inspector ${tab==='home'?'compact':'full-panel'} ${panelOpen&&started?'open':''}`;inspector.setAttribute('aria-label',names[tab]||'Ігрові дії');
 if(panelOpen){const sc=inspector.scrollTop;inspector.innerHTML=`${tab!=='home'?`<button class="close-panel" data-action="closePanel" aria-label="Закрити панель">${icon('close',18)}</button>`:''}${tab==='home'?detail():tab==='eggs'?eggs():tab==='market'?market():tab==='expedition'?expedition():valley()}`;inspector.scrollTop=sc;}
 const badges=navBadges();
 document.querySelectorAll('.nav button').forEach(b=>{const active=b.dataset.tab===tab;b.querySelector('i').textContent=badges[b.dataset.tab]||'';b.classList.toggle('has-badge',Boolean(badges[b.dataset.tab]));b.classList.toggle('active',active);b.setAttribute('aria-current',active?'page':'false');});
 renderTutorial();world.update(state,{selected:worldSelection(),now,fog:prefs.fog??2,flyReady:tab==='expedition',dock:dockInset(),top:topInset()});applyTutorialFocus();lastSignature=signature();checkTips();
 restoreFocus(focusKey);
}
// render() rebuilds the HUD and the open panel with innerHTML, which would drop keyboard focus onto <body> after every action.
// Remember what had focus (by its data-action or tab) and put focus back on the rebuilt twin, or on the panel it lived in.
function rememberFocus(){
 const el=document.activeElement;if(!el||el===document.body||el.closest('dialog'))return null;
 const sel=el.dataset.action?`[data-action="${CSS.escape(el.dataset.action)}"]`:el.dataset.tab?`[data-tab="${CSS.escape(el.dataset.tab)}"]`:null;
 return {el,sel,box:el.closest('#inspector,#balances,#tutorial,#chapter,.hud')};
}
function restoreFocus(key){
 // A panel that just closed keeps its buttons but hides them: hand focus to the active tab instead of losing it.
 const ae=document.activeElement,insp=document.querySelector('#inspector');
 if(ae&&insp.contains(ae)&&!insp.classList.contains('open')){document.querySelector('.nav button.active')?.focus({preventScroll:true});return;}
 if(!key||document.contains(key.el)&&key.el===document.activeElement)return;
 if(document.activeElement&&document.activeElement!==document.body)return;
 const twin=key.sel&&[...document.querySelectorAll(key.sel)].find(e=>e.offsetParent&&!e.closest('[inert]'));
 const box=key.box&&document.contains(key.box)&&!key.box.hidden?key.box:null;
 const fallback=box&&[...box.querySelectorAll('button:not(:disabled),a[href],[tabindex="0"]')].find(e=>e.offsetParent);
 (twin||fallback)?.focus({preventScroll:true});
}
let guideKey='',guideTyping=0;
function applyTutorialFocus(){
 const box=document.querySelector('#tutorial');
 const current=document.querySelectorAll('.tutorial-focus');
 if(box.hidden){current.forEach(el=>el.classList.remove('tutorial-focus','tutorial-spot'));return;}
 // Spotlight + pointing hand on the one thing to tap now (falls back to the egg's timer while it warms).
 const slotOf=d=>d?.slot??0,ov=`.sw-ov[data-slot="${slotOf(first())}"]`;
 const fogBtn=TUTORIAL[prefs.tut]?.[2]==='fog'?'.tutorial .fog-button':null;
 const target=fogBtn||(prefs.tut===2||prefs.tut===3?`${ov} .sw-harvest, ${ov} .sw-timer`:prefs.tut===5?`${ov} .sw-bubble-collect, ${ov} .sw-timer`:prefs.tut===6?(tab==='market'?'[data-action^="sell:berries:"]:not([data-action$=":1"]), [data-action="sell:berries:1"]':'[data-tab="market"]'):prefs.tut===7?'.tutorial [data-action="finishTutorial"]':null);
 const el=target&&(target.includes(',')?target.split(',').map(t=>document.querySelector(t.trim()+(t.includes('sw-timer')?':not([hidden])':''))).find(Boolean):document.querySelector(target));
 for(const old of current)if(old!==el)old.classList.remove('tutorial-focus','tutorial-spot');
 if(el){const fresh=!el.classList.contains('tutorial-focus');el.classList.add('tutorial-focus');el.classList.toggle('tutorial-spot',!el.closest('.tutorial'));
  // A target inside a scrolling sheet (Lucy's sell button) may sit below the fold: bring it into view once.
  if(fresh&&el.closest('.inspector'))setTimeout(()=>el.scrollIntoView({block:'center',behavior:prefs.motion?'smooth':'auto'}),350);}
}
// Lucy types each line letter by letter and "talks" (bobs) while she does; a new step makes her hop.
function typeGuide(box,advanced){
 const p=box.querySelector('.guide-text p'),avatar=box.querySelector('.guide-avatar');clearInterval(guideTyping);
 if(advanced){avatar.classList.remove('guide-hop');void avatar.offsetWidth;avatar.classList.add('guide-hop');}
 if(!prefs.motion)return;
 const chars=[];const walk=node=>{for(const n of [...node.childNodes]){if(n.nodeType===3){const frag=document.createDocumentFragment();for(const ch of n.textContent){const sp=document.createElement('span');sp.className='tw';sp.textContent=ch;frag.append(sp);chars.push(sp);}n.replaceWith(frag);}else walk(n);}};
 const full=p.textContent;p.setAttribute('aria-hidden','true');const sr=document.createElement('span');sr.className='sr-only';sr.textContent=full;p.after(sr);
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
  box.innerHTML=`<div class="guide-avatar guide-lucy">${lucy(46)}</div><div class="guide-text"><span class="kicker">Люсі · дух лісу</span><h3>${item[0]}</h3><p>${item[1]}</p></div><span class="guide-step">${prefs.tut}/7</span><button class="guide-close" data-action="skipTutorial" aria-label="Пропустити навчання">${icon('close',15)}</button><div class="guide-actions">${button}</div>`;
  // The fog step's button lives in the banner, which hides its buttons while the dock is open: let the grow-up moment
  // play, then close the dock and frame the grown dragon.
  if(fog&&panelOpen&&tab==='home'){const step=prefs.tut;setTimeout(()=>{if(prefs.tut!==step||!panelOpen||tab!=='home')return;panelOpen=false;render();world.focusDragon(first().id);},1300);}
  translateNode(box);typeGuide(box,advanced);
  if([2,3,4,5].includes(prefs.tut)&&!panelOpen)setTimeout(()=>{if(Date.now()>revealUntil)world.focusDragon(first().id);},advanced?500:0);
 }
 applyTutorialFocus();
}
function signature(){return JSON.stringify([tab,panelOpen,selected,state.resources,state.dragons.map(d=>[d.id,d.stage,d.feeds,d.level,d.name,d.slot,d.ready,d.readyAmount,Date.now()>=d.hatchAt]),state.locations,state.slots,state.trades,state.collected,state.restored,state.valleyLevel,state.market,state.expedition,state.expedition&&Date.now()>=state.expedition.ends,state.goalsClaimed,collectionView,E.phase(state).red,Date.now()>=state.forageAt,prefs.tut]);}
// After the tutorial Lucy drops one-time tips at the moments the economy first surprises a player.
const TIPS={
 crystals:'Це кристали — товар. Продай їх мені на ринку: найбільше я плачу, коли полиця порожня.',
 pricedrop:'Ціна впала, бо в мене повний склад. Зачекай трохи — я розпродам сусідам, і ціна підросте.',
 broke:'У мене скінчились монети. Купи яйце чи рівень — і гроші повернуться до мене.',
 levelup:'Тепер вистачає на новий рівень! Торкнись дракона й натисни «Рівень 2» — він даватиме більше.',
 full:'Усі гнізда зайняті. Серце долини відкриє ще одне — дивись «Долину».'
};
let tipTimer;
function checkTips(){
 if(!started||prefs.tutorial||(panelOpen&&tab!=='home')||document.querySelector('#dialog').open||!document.querySelector('#lira-tip').hidden)return;
 const seen=prefs.tips||[],adults=state.dragons.filter(d=>d.stage==='adult');
 const due=[['crystals',state.resources.crystals>0],['pricedrop',E.price(state,'crystals')<E.MARKET.base.crystals||E.price(state,'berries')<E.MARKET.base.berries],['broke',state.market.wallet<E.price(state,'berries')],['levelup',adults.some(d=>canPay(E.upgradeCost(state,d)||{coins:1e9}))&&adults.every(d=>d.level===1)],['full',!state.restored&&state.dragons.length>=state.slots]].find(([id,ok])=>ok&&!seen.includes(id));
 if(!due)return;prefs.tips=[...seen,due[0]];prefSave();
 const box=document.querySelector('#lira-tip');box.innerHTML=`<span class="lira-face">${lucy(30)}</span><p><b>Люсі:</b> ${TIPS[due[0]]}</p><button class="guide-close" data-action="closeTip" aria-label="Закрити підказку">${icon('close',14)}</button>`;translateNode(box);box.hidden=false;box.classList.remove('show');void box.offsetWidth;box.classList.add('show');
 clearTimeout(tipTimer);tipTimer=setTimeout(()=>{box.hidden=true;},9000);
}
function toast(message,kind='success'){
 const box=document.querySelector('#toast');box.innerHTML=`${icon(kind==='error'?'close':kind==='info'?'leaf':'check',18)}<span>${esc(message)}</span>`;box.className=`visible ${kind}`;clearTimeout(toastTimer);toastTimer=setTimeout(()=>box.className='',4200);
}
// A valley level-up gets the same banner as the sky changing, plus a burst over the Heart.
function levelEvent(){const el=document.querySelector('#phase-event'),L=state.valleyLevel;el.innerHTML=`<span class="near-seal">${nearMark(26)}</span><span>Долина · рівень ${L}<small>Дракони дають +${Math.round((E.valleyBonus(state)-1)*100)}% до збору й походів</small></span>`;el.className='show level-up';clearTimeout(activeEventUntil);activeEventUntil=setTimeout(()=>el.className='',3600);world.feedback?.('shrine','restore');}
// The first eclipse is a short cutscene (once per save): the sky turns red right now, Lucy explains it.
let cutscenePlaying=false;
// While the camera pulls back over the freshly cleared valley, the guide must not snap it to the dragon.
let revealUntil=0;
function firstEclipse(){
 if(prefs.eclipseSeen||cutscenePlaying||!started)return;
 cutscenePlaying=true;prefs.eclipseSeen=true;prefSave();
 if(!E.phase(state).red){state.start=Math.min(state.last,Date.now()-E.PHASE_MS);persist();}
 previousRed=true;render();
 playEclipseCutscene({translate:translateNode,reduced:!prefs.motion||matchMedia('(prefers-reduced-motion: reduce)').matches}).then(()=>{cutscenePlaying=false;render();});
}
function phaseEvent(red){if(prefs.tutorial&&prefs.tut<=6)return;const el=document.querySelector('#phase-event');el.innerHTML=`${phaseGlyph(red,34)}<span>${red?'Небо змінюється':'Світло повертається'}<small>${red?'Дракони працюють і в затемнення':'Новий день у долині'}</small></span>`;el.className='show';clearTimeout(activeEventUntil);activeEventUntil=setTimeout(()=>el.className='',3600);}
// When something is missing, say where it comes from and make that source pulse on the map.
const SOURCES={'Ягоди':['berries','Їх вирощує Мохолист, а ще є безкоштовна галявина.'],'Кристали':['crystals','Їх видобувають Жарик і Кремінь, а також приносять походи.'],'Монети':['coins','Продай Люсі ягоди чи кристали або відправ дракона в похід.']};
function lackHint(msg){const m=/Не вистачає: ([^.]+)\./.exec(msg||'');const src=m&&SOURCES[m[1]];if(!src)return '';const spot={berries:'.sw-ov.sw-location-forage .sw-chip',coins:'.sw-ov.sw-location-market .sw-chip'}[src[0]];const el=spot&&[...document.querySelectorAll(spot)][0];const where={berries:'forage',coins:'market'}[src[0]];if(where&&!panelOpen)world.focusLocation(where);if(el){el.classList.remove('hint-pulse');void el.offsetWidth;el.classList.add('hint-pulse');setTimeout(()=>el.classList.remove('hint-pulse'),3000);}return ' '+src[1];}
function perform(a){
 latest();
 const wasRed=E.phase(state).red,before={...state.resources},teamBefore=state.expedition?.team;
 try{
 const message=E.act(state,a);persist();chain?.submit(a,()=>state);
 // The camera watches the first team member take off (and land again on its return).
 if(a.type==='expedition'||a.type==='claim'){panelOpen=false;tab='home';const flier=(a.team||teamBefore||[])[0];setTimeout(()=>flier?world.focusDragon(flier):world.home(),50);}
 if(a.type==='buyEgg'){selected=state.dragons.at(-1).id;tab='home';panelOpen=true;}
 // A newly opened land is shown on the map, so the panel steps aside.
 if(a.type==='unlockLocation'){panelOpen=false;tab='home';}
 if(a.type==='travel'||a.type==='unlockLocation'){world.focusLocation(a.location);locationId=a.location;}
 render();if(a.type==='moveDragon'||a.type==='buyEgg')world.focusDragon(selected);sound(a.type);if(a.type!=='growValley'&&a.type!=='upgrade')toast(message);
 // The tutorial's sale is its last market step: once the coins land, close Lucy's sheet so Lucy's final step shows.
 if(a.type==='sell'&&prefs.tutorial&&prefs.tut>=6)setTimeout(()=>{if(tab==='market'&&panelOpen&&prefs.tut===7){panelOpen=false;tab='home';render();}},1800);
 world.feedback?.(a.type==='forage'?'forage':a.type==='claim'?(teamBefore||[])[0]:a.id??selected,a.type);
 if(a.type==='feed'&&state.dragons.find(d=>d.id===a.id)?.stage==='adult')setTimeout(()=>world.feedback?.(a.id,'grow'),300);
 resourceFeedback(before);
 if(wasRed!==E.phase(state).red)phaseEvent(E.phase(state).red);
 if(a.type==='upgrade'&&document.querySelector('#dialog').open)showDialog('dragonInfo');
 if(a.type==='restore')showDialog('chapter1');
 if(a.type==='unlockLocation'&&a.location==='ruins')showDialog('chapter2');
 if(a.type==='growValley'){panelOpen=false;tab='home';render();world.home();levelEvent();}
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
 if(!started&&event.target.closest('#main-menu')&&!event.target.closest('button')&&!document.querySelector('#loader')){document.querySelector('[data-action="play"]')?.click();return;}
 // The price "?" opens its breakdown on a tap too (touch screens have no hover); a second tap or a tap elsewhere closes it.
 const why=event.target.closest('.price-why');document.querySelectorAll('.price-why.open').forEach(el=>{if(el!==why)el.classList.remove('open');});
 if(why){why.classList.toggle('open');why.setAttribute('aria-expanded',why.classList.contains('open'));return;}
 const b=event.target.closest('button');if(!b||b.disabled)return;
 if(b.dataset.tab){openTab(b.dataset.tab);return;}
 if(b.dataset.select){selectDragon(+b.dataset.select);return;}
 if(b.dataset.focus){locationId=b.dataset.focus;world.focusLocation(locationId);render();return;}
 if(b.dataset.camera){if(b.dataset.camera==='home')world.home();else world.zoom(b.dataset.camera==='in'?1:-1);return;}
 if(b.dataset.team){const id=+b.dataset.team,team=adultTeam();if(!team.includes(id)&&team.length>=3){toast('У команді до трьох драконів.','error');return;}teamIds=team.includes(id)?team.filter(n=>n!==id):[...team,id];render();return;}
 const actionId=b.dataset.action;if(!actionId)return;
 const [type,value,extra]=actionId.split(':');
 if(type==='play'&&chain&&!['synced','saving'].includes(chainStatus.kind)&&!b.dataset.waited){b.dataset.waited='1';const label=b.innerHTML;b.disabled=true;b.textContent='Готуємо долину…';translateNode(b);Promise.race([chainReady,new Promise(r=>setTimeout(r,12000))]).then(()=>{b.disabled=false;b.innerHTML=label;b.click();});return;}
 if(type==='play'){const showAway=hasSave&&awayMs>300000&&(state.dragons.some(d=>d.stage==='adult'&&E.production(state,d).stored)||state.expedition?.ends<=Date.now());if(showAway&&!document.querySelector('#main-menu').classList.contains('diving'))setTimeout(function away(){if(cutscenePlaying)return setTimeout(away,500);showDialog('away');},2200);const menu=document.querySelector('#main-menu');if(prefs.motion&&!menu.classList.contains('diving')){menu.classList.add('diving');document.querySelector('.game').classList.add('entering');sound('tap');setTimeout(()=>{b.disabled=false;b.click();},900);b.disabled=true;setTimeout(()=>{menu.classList.remove('diving');document.querySelector('.game').classList.remove('entering');},2600);return;}if(!hasSave){state=E.createState();selected=state.dragons[0].id;prefs.tut=1;prefs.fog=0;prefs.eclipseSeen=false;prefs.eggSelected=false;previousRed=false;}started=true;prefs.started=true;prefSave();if(!hasSave)persist();render();world.home();sound('hatch');if(PREVIEW_CUTSCENE){prefs.eclipseSeen=false;setTimeout(firstEclipse,900);}return;}
 if(type==='menu'){showDialog('menu');return;}
 if(type==='signIn'){signIn();return;}
 if(type==='signOut'){privy?.logout();return;}
 if(type==='nearRefresh'){loadNear(true);return;}
 if(type==='nearRegister'||type==='nearTrade'){nearAction(type);return;}
 if(type==='simWeek'){openMarketWeek({translate:translateNode,reduced:!prefs.motion||matchMedia('(prefers-reduced-motion: reduce)').matches});return;}
 if(type==='settings'||type==='help'||type==='phaseInfo'||type==='nearInfo'||type==='dragonInfo'||type==='skipTutorial'||type==='resetView'){showDialog(type);return;}
 if(type==='closeDialog'){document.querySelector('#dialog').close();return;}
 if(type==='closePanel'){panelOpen=false;tab='home';render();return;}
 if(type==='goal'){const g=E.objective(state);if(g.tab==='home'){selectDragon(g.id||first().id);return;}if(g.tab==='valley'){const anchor=g.chapter===3?'#prosper-project':g.chapter===1?'#shrine-project':['#loc-quarry','#loc-ruins'][g.step];collectionView='quest';if(g.chapter===2&&g.step<2)locationId=g.step?'ruins':'quarry';openTab('valley');if(anchor)panelScroll(anchor);return;}openTab(g.tab);return;}
 if(type==='guideFocus'){guideFocus();return;}
 if(type==='closeTip'){document.querySelector('#lira-tip').hidden=true;clearTimeout(tipTimer);setTimeout(checkTips,600);return;}
 if(type==='resInfo'){showDialog('resInfo');return;}
 if(type==='sell'){perform({type:'sell',resource:value,qty:extra?+extra:undefined});return;}
 if(type==='collectAll'){document.querySelector('#dialog').close();const before={...state.resources};let n=0;for(const d of state.dragons){if(d.stage==='adult'&&E.production(state,d).stored&&!state.expedition?.team.includes(d.id)){try{E.act(state,{type:'collect',id:d.id});chain?.submit({type:'collect',id:d.id},()=>state);world.feedback?.(d.id,'collect');n++;}catch{}}}let trip=false;if(state.expedition?.ends<=Date.now()){try{const team=state.expedition.team[0];E.act(state,{type:'claim'});chain?.submit({type:'claim'},()=>state);trip=true;world.feedback?.(team,'claim');}catch{}}persist();render();resourceFeedback(before);sound('collect');if(n||trip)toast(n?`Зібрано врожай з ${n} ${plural(n,['дракона','драконів','драконів'])}${trip?' і здобич походу':''}`:'Здобич походу зібрано!');return;}
 if(type==='setLang'){setLang(value);return;}
 if(type==='collectionView'){collectionView=value;render();document.querySelector('#inspector').scrollTop=0;return;}
 if(type==='clearFog'){prefs.fog=Math.min(2,(prefs.fog??0)+1);prefSave();sound('hatch');progressTutorial();render();if(prefs.fog===1)world.focusDragon(first().id);else revealUntil=Date.now()+world.reveal(2600,()=>world.focusDragon(first().id));return;}
 if(type==='finishTutorial'||type==='confirmSkip'){prefs.tutorial=false;prefs.fog=2;prefSave();document.querySelector('#dialog').close();if(type==='finishTutorial')openTab('eggs');else render();return;}
 if(type==='restartTutorial'){prefs.tut=prefs.fog>=2?5:1;prefs.tutorial=true;prefs.eggSelected=false;prefSave();document.querySelector('#dialog').close();render();return;}
 if(type==='toggleSound'){prefs.sound=!prefs.sound;setSound(prefs.sound);prefSave();showDialog('settings');sound('tap');return;}
 if(type==='toggleMotion'){prefs.motion=!prefs.motion;prefSave();render();showDialog('settings');return;}
 if(type==='resetConfirm'){if(CHAIN_ON){try{localStorage.removeItem(KEY+'-player-key');}catch{}chain?.close();startChain();}state=E.createState();selected=1;teamIds=null;chosenSlot=null;previousRed=false;world.resetAway?.();panelOpen=false;tab='home';prefs.tut=1;prefs.fog=0;prefs.eclipseSeen=false;prefs.tutorial=true;prefs.eggSelected=false;prefs.started=true;prefs.tips=[];prefSave();persist();document.querySelector('#dialog').close();world.home();render();return;}
 if(type==='renameSubmit'){const n=document.querySelector('#dragon-name').value;const was=E.dragonName(state.dragons.find(d=>d.id===selected));perform({type:'rename',id:selected,name:n});if(E.dragonName(state.dragons.find(d=>d.id===selected))!==was||!n.trim())document.querySelector('#dialog').close();return;}
 if(type==='moveDragon'){perform({type,id:selected,slot:+value});document.querySelector('#dialog').close();return;}
 let a={type,id:selected};
 if(type==='buyEgg'){a.species=value;if(chosenSlot!==null)a.slot=chosenSlot;chosenSlot=null;}
 if(['travel','unlockLocation'].includes(type))a.location=value;
 if(type==='expedition'){a.team=adultTeam();teamIds=null;}
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
// Spending: a few coins/berries/crystals leave the HUD and arc toward what you paid for; the counter dips and wobbles.
function flySpend(key,delta){
 const src=document.querySelector(`.balance[data-resource="${key}"] .gem`);if(!src)return;const cap=src.closest('.balance');
 cap.classList.remove('balance-spend');void cap.offsetWidth;cap.classList.add('balance-spend');
 if(!prefs.motion)return;
 const from=src.getBoundingClientRect(),sx=from.left+from.width/2,sy=from.top+from.height/2,n=Math.min(5,Math.max(1,Math.ceil(delta/4)));
 for(let i=0;i<n;i++){const el=document.createElement('span');el.className='fly-reward fly-spend';el.innerHTML=gem(resourceIcon[key],26);document.body.append(el);
  const tx=lastTap.x+(Math.random()-.5)*40,ty=lastTap.y+(Math.random()-.5)*30,mx=(sx+tx)/2+(Math.random()-.5)*120,my=Math.min(sy,ty)-60;
  const anim=el.animate([{transform:`translate(${sx}px,${sy}px) scale(.9)`,opacity:1},{transform:`translate(${mx}px,${my}px) scale(1) rotate(-14deg)`,opacity:1,offset:.45},{transform:`translate(${tx}px,${ty}px) scale(.35) rotate(12deg)`,opacity:0}],{duration:620+i*60,delay:i*50,easing:'cubic-bezier(.4,0,.6,1)',fill:'forwards'});
  anim.onfinish=()=>el.remove();setTimeout(()=>el.remove(),1400);}
}
function resourceFeedback(before){
 for(const [key,value] of Object.entries(state.resources)){
  const delta=value-before[key];if(!delta)continue;
  const el=document.querySelector(`[data-resource="${key}"]`);if(!el)continue;
  if(delta>0)flyReward(key,delta);else flySpend(key,-delta);
  el.classList.remove('balance-changed');void el.offsetWidth;el.classList.add('balance-changed');
  const label=document.createElement('span');label.className=`balance-delta ${delta<0?'spent':''}`;label.textContent=`${delta>0?'+':''}${delta}`;el.append(label);setTimeout(()=>label.remove(),1500);
 }
}
// The deployed testnet registry only accepts the three starter species (contracts/market, bridge.mjs).
const NEAR_SPECIES=['moss','ember','stone'];
function nearPanel(){
 // The valley itself is on NEAR: goods, coins and dragons are NEP-245 tokens of one contract, and Lucy is that contract.
 const on=chainStatus.kind==='synced'||chainStatus.kind==='saving',id=chain?.accountId,m=state.market;
 const legend=state.dragons.filter(d=>d.level>=E.MAX_LEVEL);
 const facts=on?`<div class="exp-facts near-facts"><span>Гаманець Люсі<strong>${m.wallet} ${gem('coin',18)}</strong></span><span>На її полицях<strong>${m.stock.berries} ${gem('berry',18)} · ${m.stock.crystals} ${gem('crystal',18)}</strong></span><span>Твої токени<strong>${state.resources.coins} ${gem('coin',18)} · ${state.resources.berries} ${gem('berry',18)} · ${state.resources.crystals} ${gem('crystal',18)}</strong></span><span>Дракони-токени<strong>${state.dragons.length}</strong></span></div>`:'';
 return `<div class="near-brand">${nearMark(30)}</div>`+heading('NEAR testnet','Твоя долина живе в NEAR')
  +`<p>Кожна монета, ягода, кристал і дракон — токен стандарту NEP-245 в одному контракті. Люсі — сам цей контракт: її гаманець і полиці спільні для всіх гравців, тож чужий продаж змінює ціну й для тебе. Газ платить спонсор гри — гаманець не потрібен.</p>`
  +`<div class="connection-state"><strong>${on?'Долина збережена в testnet':chainStatus.kind==='connecting'||chainStatus.kind==='joining'?'Підключаємо NEAR…':'Зараз гра працює локально'}</strong>${on&&id?`<a href="${esc(nearExplorer(id))}" target="_blank" rel="noopener noreferrer">Твій акаунт ${esc(id.slice(0,8))}… ↗</a>`:''}<a href="${esc(nearExplorer(NEAR_CONTRACT))}" target="_blank" rel="noopener noreferrer">Контракт Люсі: ${esc(NEAR_CONTRACT)} ↗</a></div>`
  +facts
  +(CHAIN_ON?(signedIn?`<p class="signed-in">${icon('check',16)} Ти увійшов${signedIn.email?`: <b data-no-tr>${esc(signedIn.email)}</b>`:''}. Долина та сама на будь-якому пристрої.</p>${action('Вийти','signOut','ghost small')}`:`<p class="subtle">Зараз ти граєш як гість: долина прив’язана до цього браузера.</p>${action('Зберегти долину: пошта або Google','signIn','primary')}`):'')
  +(legend.length?`<p class="legend-tag">${icon('sparkle',14)} Легенда долини: ${legend.map(d=>d.name?`<span data-no-tr>${esc(d.name)}</span>`:esc(name(d))).join(', ')}</p>`:'<p class="subtle">Дракон 5 рівня стає легендою долини.</p>')
  +`<p class="subtle">Це testnet: токени не мають грошової вартості. Правила цін — у src/market-rules.js і contracts/economy/src/rules.rs, однакові до монети.</p>`;
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
// The three resources as cards; in the HUD dialog each card also shows how much the player has.
function resourceLoop(amounts){
 const card=(k,icon,name,text)=>`<div class="loop-step">${gem(icon,40)}<b>${amounts?`<span class="res-amount">${state.resources[k]}</span> `:''}${name}</b><small>${text}</small></div>`;
 return `<div class="loop">${card('berries','berry','Ягоди','Їжа. Ними годуєш малюків і піднімаєш рівень.')}${card('crystals','crystal','Кристали','Товар. Їх видобувають дракони — продавай Люсі.')}${card('coins','coin','Монети','Гроші. Купуй яйця, рівні й нові землі.')}</div>`;
}
function showDialog(kind){
 const dialog=document.querySelector('#dialog');dialog.dataset.kind=kind;let body;
 if(kind==='away'){const ready=state.dragons.filter(d=>d.stage==='adult'&&!state.expedition?.team.includes(d.id)&&E.production(state,d).stored);const totals={};for(const d of ready){const p=E.production(state,d);totals[p.resource]=(totals[p.resource]||0)+p.stored;}const mins=Math.round(awayMs/60000);body=heading('З поверненням','Поки тебе не було',`Минуло ${mins<60?`${mins} хв`:`${Math.round(mins/60)} год`}. Дракони не сиділи без діла!`)+(ready.length?`<div class="away-loot">${Object.entries(totals).map(([k,n])=>`<span>${gem(resourceIcon[k],40)}<b>+${n}</b></span>`).join('')}</div>`:'')+(state.expedition?.ends<=Date.now()?`<p class="away-trip">${pic('nav-trip',28)} Команда повернулась із походу — здобич теж забереш.</p>`:'')+action(ready.length?'Зібрати все':'Забрати здобич','collectAll','primary');}
 else if(kind==='settings')body=heading('Налаштування','Як тобі зручно')+`<div class="settings-list"><div class="setting-row"><span>Звуки гри<small>М’які сигнали дій і нагород</small></span>${seg([['Увімк.',prefs.sound,'toggleSound'],['Вимк.',!prefs.sound,'toggleSound']])}</div><div class="setting-row"><span>Анімації<small>Можна зменшити рух</small></span>${seg([['Повні',prefs.motion,'toggleMotion'],['Менше',!prefs.motion,'toggleMotion']])}</div><div class="setting-row"><span>Мова<small>Language</small></span>${seg(Object.entries(LANGS).map(([id])=>[id.toUpperCase(),id===lang,`setLang:${id}`]))}</div></div><div class="settings-actions">${action('Повторити підказки навчання','restartTutorial','secondary')}${action('Почати нову пригоду','resetView','ghost')}</div><p class="subtle">Прогрес зберігається лише в цьому браузері. Поки тебе немає, дракони працюють далі вдвічі повільніше — до 45 хвилин.</p>`;
 else if(kind==='resInfo')body=heading('Твої ресурси','Що в тебе є')+resourceLoop(true)+action('Зрозуміло','closeDialog','primary');
 else if(kind==='help')body=heading('Як грати','Три ресурси — один цикл')+resourceLoop(false)+`<ol class="help-list"><li>Вилупи яйце й нагодуй малюка тричі ягодами.</li><li>Торкайся бульбашок над драконами, щоб збирати ягоди й кристали.</li><li>Продавай Люсі на ринку. Що більше в неї на складі — то нижча ціна.</li><li>За монети купуй нові яйця. Відправляй драконів у похід за новими монетами.</li><li>Віднови Серце долини, а далі відкрий кар’єр і руїни.</li></ol><p>Колесо миші або два пальці — масштаб. Перетягування — огляд. Кнопка дому — повернення.</p>${action(started?'Повернутись до гри':'Зрозуміло','closeDialog','primary')}`;
 else if(kind==='phaseInfo')body=heading('День і затемнення','Небо над долиною')+`<p>Кожні дві хвилини день змінюється червоним затемненням. Це настрій долини: дракони працюють і вдень, і в затемнення, а походи можна починати будь-коли.</p>${action('Зрозуміло','closeDialog','primary')}`;
 else if(kind==='nearInfo')body=nearPanel();
 else if(kind==='skipTutorial')body=heading('Навчання','Досліджувати самостійно?')+`<p>Підказку розділу можна натиснути будь-коли. Навчання повертається через налаштування.</p>${action('Так, пропустити підказки','confirmSkip','primary')}${action('Залишити навчання','closeDialog','secondary')}`;
 else if(kind==='resetView')body=heading('Нова пригода','Почати з першого яйця?')+`<p>Усі дракони, ресурси й відкриті землі в цьому браузері зникнуть. Цю дію не можна скасувати.</p>${action('Залишити мою долину','closeDialog','primary')}${action('Стерти й почати заново','resetConfirm','danger')}`;
 else if(kind==='menu')body=heading('Lunearcy','Твоя долина чекає')+`${action('Продовжити пригоду','closeDialog','primary')}${action('Як грати','help','secondary')}${action('Налаштування','settings','secondary')}<p class="subtle">Raise dragons. Wake the valley.</p>`;
 else if(kind==='dragonInfo'){
 const d=state.dragons.find(d=>d.id===selected),sp=E.SPECIES[d.species],upgrade=E.upgradeCost(state,d),currentOutput=E.production(state,d).output,nextOutput=E.production(state,{...d,level:d.level+1}).output;
 body=heading(sp.kind,(d.name?`<span data-no-tr>${esc(d.name)}</span>`:esc(name(d))),sp.desc)+`<div class="dialog-dragon">${dragon(d.species,d.stage)}</div><label for="dragon-name">Ім’я дракона</label><div class="input-row"><input id="dragon-name" maxlength="20" enterkeyhint="done" onkeydown="if(event.key==='Enter'){event.preventDefault();this.parentNode.querySelector('[data-action=renameSubmit]').click()}" value="${esc(d.name||'')}" placeholder="${sp.name}">${action('Зберегти','renameSubmit','secondary')}</div><p>Рівень ${d.level}/${E.MAX_LEVEL}. Дає ${E.RESOURCE[sp.resource].toLowerCase()}. Поточне місце: ${E.LOCATIONS[d.location].name}.</p>${upgrade?`<div class="upgrade-preview"><span>Зараз<strong>+${currentOutput} кожні ${sp.cycle} с</strong></span>${icon('arrow',22)}<span>Рівень ${d.level+1}<strong>+${nextOutput} кожні ${sp.cycle} с</strong></span></div>`:''}${action(upgrade?`Покращити ${cost(upgrade)}`:'Найвищий рівень','upgrade','primary',d.level>=E.MAX_LEVEL||!canPay(upgrade)||Boolean(state.expedition?.team.includes(d.id)),state.expedition?.team.includes(d.id)?'Дочекайся повернення дракона':lack(upgrade))}<h3>Переселити у вільне гніздо</h3><div class="move-options">${E.availableSlots(state).filter(slot=>!state.dragons.some(other=>other.slot===slot.id)).map(slot=>action(`${E.LOCATIONS[slot.location].name} · гніздо ${slot.id+1}`,`moveDragon:${slot.id}`,'ghost',Boolean(state.expedition?.team.includes(d.id)))).join('')||'<p class="subtle">Усі відкриті гнізда зайняті.</p>'}</div>`;
 }else body=(kind==='chapter2'?`<div class="completion-art trio">${[...new Set(state.dragons.filter(d=>d.stage==='adult').map(d=>d.species))].slice(0,3).map(k=>`<img src="/art/dragons/${k}.webp" alt="">`).join('')}</div>`:`<div class="completion-art"><img src="/art/shrine.webp" alt=""></div>`)+heading(kind==='chapter2'?'Усі землі відкрито':'Перший розділ завершено',kind==='chapter2'?'Долина знову жива':'Світло повернулось',kind==='chapter2'?'Гай, кар’єр і руїни знову живі. Тепер піднімай рівень долини — кожен дає драконам +10%. А за туманом уже чекають нові землі.':'Серце прокинулось: четверте гніздо й Туманний дракон уже твої. Попереду — кар’єр і руїни.')+`<div class="completion-stats"><span><b>${state.dragons.length}</b>${plural(state.dragons.length,['дракон','дракони','драконів'])}</span><span><b>${state.sold}</b>продано</span><span><b>${state.expeditions}</b>${plural(state.expeditions,['похід','походи','походів'])}</span></div>${action('Повернутись у долину','closeDialog','primary')}`;
 dialog.innerHTML=`<button class="close-panel" data-action="closeDialog" aria-label="Закрити вікно">${icon('close',20)}</button>${body}`;
 // Focus lands on the dialog itself, so the close button does not open with a focus ring.
 if(!dialog.open){dialog.showModal();dialog.tabIndex=-1;dialog.focus({preventScroll:true});}
}
let previousRed=E.phase(state).red;
// The save's "last seen" time moves only with actions; store it when the tab is hidden or closed too, or a player who
// just watched the valley would be greeted with "While you were away" on the next visit.
const saveOnLeave=()=>{if(started){E.tick(state);persist();}};
addEventListener('pagehide',saveOnLeave);document.addEventListener('visibilitychange',()=>{if(document.hidden)saveOnLeave();});
setInterval(()=>{
 if(!started||document.hidden)return;
 E.tick(state);const now=Date.now(),p=E.phase(state);
 if(p.red!==previousRed){const first=p.red&&!prefs.eclipseSeen&&!(prefs.tutorial&&prefs.tut<6);
  // The first-eclipse film waits for an open dialog (e.g. "While you were away") instead of playing over it.
  if(!(first&&document.querySelector('#dialog').open)){previousRed=p.red;if(first)firstEclipse();else phaseEvent(p.red);}}
 if(chain&&Date.now()-chainRefreshed>15000){chainRefreshed=Date.now();chain.refresh(()=>state);}
 if(signature()!==lastSignature)render();
 else{
 document.querySelector('[data-live="phase"]')?.replaceChildren(document.createTextNode(clock(p.left)));
 const wait=document.querySelector('[data-live="phase-wait"]');if(wait)wait.textContent=clock(p.left);
 const ex=document.querySelector('[data-live="expedition"]');if(ex&&state.expedition){ex.textContent=clock(state.expedition.ends-now);const bar=ex.parentElement.nextElementSibling?.querySelector('i');if(bar)bar.style.width=`${Math.min(100,100*(1-(state.expedition.ends-now)/state.expedition.duration))}%`;}
 const prod=document.querySelector('[data-live="production"]'),d=state.dragons.find(d=>d.id===selected);if(prod&&d&&!E.production(state,d).stored&&!state.expedition?.team.includes(d.id))prod.textContent=clock(d.next-now);
 if(d&&tab==='home'&&panelOpen){
  const bar=document.querySelector('.dock .meter i');
  if(d.stage==='egg'){const t=document.querySelector('[data-live="hatch"]');if(t)t.textContent=clock(d.hatchAt-now);if(bar)bar.style.width=`${Math.min(100,100*(1-(d.hatchAt-now)/E.HATCH_MS))}%`;}
  else if(d.stage==='adult'&&bar){const prod=E.production(state,d);bar.style.width=`${prod.away?0:prod.stored?100:Math.max(0,100*(1-(d.next-now)/(prod.cycle*1000)))}%`;}
 }
 for(const button of document.querySelectorAll('[data-action="forage"]')){if(button.textContent.includes('·')){const v=`Зібрати 3 ягоди · ${now<state.forageAt?clock(state.forageAt-now):'готові'}`;if(button.dataset.src!==v){button.dataset.src=v;button.textContent=v;}}}
 world.update(state,{selected:worldSelection(),now,fog:prefs.fog??2,flyReady:tab==='expedition',dock:dockInset(),top:topInset()});applyTutorialFocus();
 }
},500);
window.addEventListener('storage',e=>{if(e.key===KEY&&e.newValue){try{state=E.hydrate(JSON.parse(e.newValue));render();}catch{}}});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){latest();render();}});
shell();
startI18n();
if(CHAIN_ON&&prefs.login==='privy'){loadPrivy().catch(()=>{});setTimeout(()=>{if(!signedIn&&!chain)startChain();},8000);}else startChain();
// The loader (index.html) stays up until the art of the first minutes is downloaded and decoded, including both valley
// plates exactly as the world declares them (srcset may pick the HD file); the pose clips and the film follow later.
{
 const loader=document.querySelector('#loader'),pct=loader?.querySelector('.ld-pct'),bar=loader?.querySelector('.ld-bar');
 const plates=[...document.querySelectorAll('.sw-valley-art')].map(img=>({src:img.getAttribute('src')||img.dataset.src,srcset:img.getAttribute('srcset')||img.dataset.srcset,sizes:img.getAttribute('sizes')}));
 const progress=p=>{if(!loader)return;const n=Math.round(p*100);pct.textContent=`${n}%`;bar.style.strokeDashoffset=String(100-n);};
 const lift=()=>{preloadLater();if(!loader)return;progress(1);loader.classList.add('done');setTimeout(()=>loader.remove(),700);};
 // A slow connection still gets into the game; whatever is missing then loads as it is needed.
 Promise.race([preloadGame({plates,progress}),new Promise(resolve=>setTimeout(resolve,25000))]).then(lift);
}
