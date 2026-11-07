/**
 * Original, code-native 2.5D sanctuary. Logical coordinates are independent of UI.
 * The module never mutates economic state; it emits intentions to its owner.
 */
import * as Economy from './engine.js';
import {dragon, egg, icon, gem, pose, nearMark, nearEgg} from './art.js';
import './world.css';

export const WORLD_SIZE = Object.freeze({width:3168,height:1344});
// Feet positions on the painted valley plate (public/art/valley-*.webp, same logical size).
export const WORLD_SLOTS = Object.freeze([
 {id:0,location:'grove',x:1600,y:730}, {id:1,location:'grove',x:2265,y:665},
 {id:2,location:'grove',x:1300,y:865}, {id:3,location:'grove',x:1345,y:335},
 {id:4,location:'quarry',x:530,y:995}, {id:5,location:'quarry',x:400,y:475},
 {id:6,location:'ruins',x:2535,y:545}, {id:7,location:'ruins',x:2720,y:1020}
]);
// `plate` locations are painted into the valley and get a marker; `art` locations are illustrated cut-out props.
const LOCATIONS={grove:{name:'Сонячний гай',x:1600,y:730,plate:true,hidden:true},quarry:{name:'Місячний кар’єр',x:330,y:335,plate:true},ruins:{name:Economy.LOCATIONS.ruins.name,x:2880,y:470,plate:true},shrine:{name:'Серце долини',x:2010,y:485,spot:{w:150,h:230}},forage:{name:'Лісові ягоди',x:1010,y:420,spot:{w:260,h:200}},market:{name:'Крамниця Люсі',x:1110,y:775,spot:{w:230,h:230}},tree:{name:'Драконяче дерево',x:975,y:905,art:'/art/props/tree.webp',decor:true}};
const LOCATION_ICONS={grove:'leaf',quarry:'crystal',ruins:'compass',forage:'berry',market:'market',shrine:'relics'};
// 4096px for small/1x screens, the 6336px master for HiDPI so zoomed-in views stay crisp.
const VALLEY_ART={day:'/art/valley-day.webp',eclipse:'/art/valley-eclipse.webp'};
// Phones take the 4096 px plate even on dense screens (two decoded HD plates are ~136 MB, too much for mobile
// Safari); tablets and desktops get the HD plate when the screen is dense enough.
const VALLEY_SIZES=`(max-width: 760px) 1360px, ${WORLD_SIZE.width}px`;
const valleySrcset=k=>`/art/valley-${k}.webp 4096w, /art/valley-${k}-hd.webp 6336w`;
// Hand-animated loops cut from the plate (art-source/v4/ambient), laid exactly over their painted spot.
const AMBIENT=[{id:'water',x:1650,y:440,size:450},{id:'fire',x:2165,y:280,size:210}];
// Fog of war: revealed areas are soft circles in world coordinates.
const FOG_AREAS={
 nest:[[1600,700,330]],
 grove:[[1600,700,520],[1340,350,460],[1950,520,440],[1150,840,440],[2200,430,330],[1000,400,340],[2180,700,300]],
 quarry:[[400,480,440],[520,990,440],[640,740,300],[300,320,260]],
 ruins:[[2600,520,440],[2720,1020,430],[2500,780,300],[2880,420,280]]
};
const FOG_SCALE=.25;
// Soft lighter puffs painted into the darkness (fractions of the canvas), so the fog reads as cloud, not a flat fill.
const FOG_PUFFS=Array.from({length:46},(_,i)=>{const r=(n=>{n=Math.sin(n*12.9898)*43758.5453;return n-Math.floor(n);});return [r(i+1),r(i+51),.05+r(i+101)*.09,.25+r(i+151)*.35];});
// The realm map shown when zooming out past the valley: our valley plus lands that are not open yet.
const REALM=[
 {id:'valley',name:'Драконяча долина',x:.51,y:.5,open:true},
 {id:'frost',name:'Морозні вершини',x:.18,y:.2},
 {id:'spires',name:'Хмарні шпилі',x:.53,y:.2},
 {id:'volcano',name:'Вогняна гора',x:.84,y:.22},
 {id:'lake',name:'Затоплене озеро',x:.17,y:.76},
 {id:'autumn',name:'Золотий ліс',x:.82,y:.74}
];
// Drifting cloud shadows and daytime butterflies keep the painted valley alive between taps.
const CLOUD_SHADOWS=[[200,180,900,60],[1300,620,1100,85],[2300,260,800,72]];
const BUTTERFLIES=[[1050,520,'#ffd36b'],[1500,860,'#ff9fc4'],[1900,420,'#a6e3ff'],[2350,780,'#ffd36b'],[700,760,'#c6f08a'],[2700,560,'#ff9fc4']];
const butterfly=c=>`<svg viewBox="-12 -10 24 20" width="26" height="22"><g class="sw-bf-wing"><path d="M0 0C-4-9-12-9-11-2-10 3-4 3 0 0Z" fill="${c}"/><path d="M0 0C-3 4-9 8-8 3-7 0-3 0 0 0Z" fill="${c}" opacity=".85"/></g><g class="sw-bf-wing sw-bf-right"><path d="M0 0C4-9 12-9 11-2 10 3 4 3 0 0Z" fill="${c}"/><path d="M0 0C3 4 9 8 8 3 7 0 3 0 0 0Z" fill="${c}" opacity=".85"/></g><path d="M0-4V5" stroke="#3a2a1c" stroke-width="1.6" stroke-linecap="round"/></svg>`;
const FIREFLIES=[[880,250],[1180,560],[1460,300],[1730,210],[1890,640],[2150,300],[2380,620],[700,520],[560,880],[1300,1040],[1820,980],[2480,900],[2950,700],[300,700],[2050,1180],[980,1150]];
const setText=(el,v)=>{if(el&&el.dataset.src!==v){el.dataset.src=v;el.textContent=v;}};
const setAttr=(el,k,v)=>{const key='src'+k.replace(/-./g,m=>m[1].toUpperCase());if(el.dataset[key]!==v){el.dataset[key]=v;el.setAttribute(k,v);}};
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const seconds=ms=>Math.max(0,Math.ceil(ms/1000));
const clock=ms=>{const n=seconds(ms);return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;};
const resourceIcons={berries:'berry',crystals:'crystal'};
let mountCount=0;
// Tapping the Heart crystal flashes the NEAR mark in its light.
function flashNear(){const el=document.querySelector('.sw-near-flash');if(!el)return;el.classList.remove('on');void el.offsetWidth;el.classList.add('on');}

/** Callbacks are optional. zoom(+1/-1) is a single zoom step. */
export function mountWorld(container,{onSelect=()=>{},onAction=()=>{},onLocation=()=>{},onBackground=()=>{}}={}){
 if(!(container instanceof Element))throw new TypeError('mountWorld requires a container element.');
 const prefix=`sw${++mountCount}`,abort=new AbortController(),signal=abort.signal;
 let state=null,selected=null,now=Date.now(),destroyed=false,frame=0,tween=0,tweenEnd=0,drag=null,pinch=null,suppressClickUntil=0,lastNodeSignatures=new Map();
 const awayState=new Map();let initialFogDone=false,camera={x:0,y:0,z:.6},size={width:0,height:0},initialized=false,fit=.5,homeZ=.9,maxZ=1.6;
 const pointers=new Map(),effectTimers=new Set(),reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const host=document.createElement('div');host.className='sanctuary-world';host.tabIndex=0;host.setAttribute('aria-label','Карта притулку. Перетягуй для огляду, коліщатко — масштаб. Стрілки — рух, Home — вся долина.');
 host.innerHTML=`<div class="sw-sky" aria-hidden="true"></div><div class="sw-stage"><div class="sw-valley" aria-hidden="true"><img class="sw-valley-art sw-valley-day" src="${VALLEY_ART.day}" srcset="${valleySrcset('day')}" sizes="${VALLEY_SIZES}" alt="" width="${WORLD_SIZE.width}" height="${WORLD_SIZE.height}" draggable="false" decoding="async" fetchpriority="high"><img class="sw-valley-art sw-valley-eclipse" data-src="${VALLEY_ART.eclipse}" data-srcset="${valleySrcset('eclipse')}" sizes="${VALLEY_SIZES}" alt="" width="${WORLD_SIZE.width}" height="${WORLD_SIZE.height}" draggable="false" decoding="async">${AMBIENT.map(a=>['day','eclipse'].map(phase=>`<video class="sw-ambient sw-ambient-${a.id} sw-ambient-${phase}" style="left:${a.x}px;top:${a.y}px;width:${a.size}px;height:${a.size}px" muted loop playsinline preload="none" data-src="/art/ambient/${a.id}-${phase}.mp4"></video>`).join('')).join('')}<span class="sw-brazier-glow"></span><span class="sw-crystal-glow sw-crystal-glow-a"></span><span class="sw-crystal-glow sw-crystal-glow-b"></span><span class="sw-near-flash" aria-hidden="true">${nearMark(64)}</span>${FIREFLIES.map(([x,y],i)=>`<i class="sw-firefly" style="left:${x}px;top:${y}px;--sw-ff-delay:${-(i*1.7)%9}s;--sw-ff-dur:${7+i%5}s"></i>`).join('')}${CLOUD_SHADOWS.map(([x,y,w,dur],i)=>`<i class="sw-cloud-shadow" style="left:${x}px;top:${y}px;width:${w}px;height:${Math.round(w*.42)}px;--cs-dur:${dur}s;--cs-delay:${-i*23}s"></i>`).join('')}${BUTTERFLIES.map(([x,y,c],i)=>`<i class="sw-butterfly" style="left:${x}px;top:${y}px;--bf-dur:${14+i*3}s;--bf-delay:${-i*4.3}s">${butterfly(c)}</i>`).join('')}</div><div class="sw-paper" aria-hidden="true"></div><div class="sw-node-layer"></div><div class="sw-ui-layer"></div><canvas class="sw-fog" width="${Math.round(WORLD_SIZE.width*FOG_SCALE)}" height="${Math.round(WORLD_SIZE.height*FOG_SCALE)}" aria-hidden="true"></canvas><span class="sw-wisp" aria-hidden="true"><i></i><i></i><i></i></span><div class="sw-fog-fx" aria-hidden="true"></div></div><div class="sw-rays" aria-hidden="true"><i></i><i></i><i></i></div><div class="sw-weather" aria-hidden="true">${Array.from({length:14},(_,i)=>`<i style="left:${(i*7.3+3)%100}%;--wd:${-(i*1.9)%13}s;--wt:${11+i%5*2}s;--ws:${.7+(i%4)*.18};--wx:${(i%2?1:-1)*(40+i*6)}px"></i>`).join('')}</div><div class="sw-world-vignette" aria-hidden="true"></div><div class="sw-realm" aria-hidden="true"><div class="sw-realm-map"><img src="/art/realm.webp" alt="" draggable="false" decoding="async">${REALM.map(r=>`<button type="button" class="sw-realm-pin ${r.open?'is-open':'is-locked'}" data-realm="${r.id}" style="left:${r.x*100}%;top:${r.y*100}%"><span class="sw-realm-icon">${icon(r.open?'home':'lock',20)}</span><strong>${esc(r.name)}</strong><small>${r.open?'Повернутись у долину':'Ще під туманом'}</small></button>`).join('')}</div><span class="sw-realm-title">Світ Lunearcy</span></div><div class="sw-camera-controls" aria-label="Керування картою"><button type="button" data-camera="out" aria-label="Віддалити карту">−</button><button type="button" data-camera="home" aria-label="Показати всю долину">${icon('home',19)}</button><button type="button" data-camera="in" aria-label="Наблизити карту">+</button></div><div class="sw-camera-hint" aria-hidden="true">Перетягуй, щоб досліджувати</div>`;
 container.append(host);const stage=host.querySelector('.sw-stage'),layer=host.querySelector('.sw-node-layer'),uiLayer=host.querySelector('.sw-ui-layer');
 // Labels, bubbles, timers and chips live in their own layer above every sprite, so no dragon can cover them.
 const overlays=new Map();
 function ovOf(b){let ov=overlays.get(b);if(!ov){ov=document.createElement('div');ov.style.left=b.style.left;ov.style.top=b.style.top;ov.style.width=b.style.width;ov.style.height=b.style.height;if(b.dataset.slot!==undefined)ov.dataset.slot=b.dataset.slot;if(b.dataset.location)ov.dataset.location=b.dataset.location;uiLayer.append(ov);overlays.set(b,ov);b.addEventListener('pointerenter',()=>ov.classList.add('is-hover'),{signal});b.addEventListener('pointerleave',()=>ov.classList.remove('is-hover'),{signal});}return ov;}
 function syncOv(b){const ov=ovOf(b),hover=ov.classList.contains('is-hover');ov.className=`${b.className.replace(/\btutorial-\S+/g,'')} sw-ov${hover?' is-hover':''}${b.matches(':focus-visible')?' is-hover':''}`;ov.hidden=b.hidden;return ov;}
 function lift(b,selector){const ov=ovOf(b);for(const el of b.querySelectorAll(selector))ov.append(el);}
 const dayArt=host.querySelector('.sw-valley-day'),eclipseArt=host.querySelector('.sw-valley-eclipse');
 // Show the valley once the day plate is decoded, then fetch the eclipse plate in the background.
 // Only the current phase's water/fire loops load and play; the eclipse plate and its loops follow a few seconds
 // after the day valley (at once if the game opens mid-eclipse), so they never compete with the first paint.
 function ambientSync(){if(destroyed||!host.classList.contains('sw-art-ready'))return;const phase=host.classList.contains('sw-eclipse')?'eclipse':'day';
  for(const v of host.querySelectorAll('.sw-ambient')){const on=v.classList.contains(`sw-ambient-${phase}`);
   if(on&&!v.getAttribute('src')){v.src=v.dataset.src;v.addEventListener('loadeddata',()=>v.classList.add('sw-ambient-ready'),{once:true,signal});}
   if(on&&!motionReduced()){if(v.paused)v.play().catch(()=>{});}else if(!v.paused)v.pause();}}
 function loadEclipse(){if(destroyed||eclipseArt.src)return;eclipseArt.srcset=eclipseArt.dataset.srcset;eclipseArt.src=eclipseArt.dataset.src;eclipseArt.decode().catch(()=>{}).then(()=>{if(!destroyed)host.classList.add('sw-eclipse-ready');});}
 function artworkReady(){if(destroyed||host.classList.contains('sw-art-ready'))return;host.classList.add('sw-art-ready');ambientSync();if(host.classList.contains('sw-eclipse'))loadEclipse();else setTimeout(loadEclipse,5000);}
 if(dayArt.complete&&dayArt.naturalWidth)artworkReady();else dayArt.decode().then(artworkReady,()=>dayArt.addEventListener('load',artworkReady,{once:true,signal}));
 const slotNodes=WORLD_SLOTS.map(slot=>{const b=document.createElement('button');b.type='button';b.className='sw-nest sw-cullable';b.dataset.slot=String(slot.id);b.style.left=`${slot.x}px`;b.style.top=`${slot.y}px`;b.style.zIndex=String(Math.round(slot.y));b.dataset.worldX=slot.x;b.dataset.worldY=slot.y;b.dataset.side=slot.x>1700?'right':'left';layer.append(b);return b;});
 const locationNodes=Object.fromEntries(Object.entries(LOCATIONS).map(([id,location])=>{const b=document.createElement('button');b.type='button';b.className=`sw-location sw-location-${id} sw-cullable${location.plate?' sw-location-plate':''}${location.spot?' sw-location-spot':''}`;if(location.spot){b.style.width=`${location.spot.w}px`;b.style.height=`${location.spot.h}px`;}b.hidden=Boolean(location.hidden);b.dataset.location=id;b.style.left=`${location.x}px`;b.style.top=`${location.y}px`;b.style.zIndex=String(location.y-5);b.dataset.worldX=location.x;b.dataset.worldY=location.y;b.innerHTML=`<span class="sw-location-art">${location.spot?`<span class="sw-spot-glow"></span><span class="sw-chip">${icon(LOCATION_ICONS[id]||'leaf',22)}</span>`:location.plate?`<span class="sw-marker"><img class="sw-sign" src="/art/props/sign.webp" alt="" draggable="false" decoding="async"><span class="sw-sign-icon">${icon(LOCATION_ICONS[id]||'leaf',22)}</span></span>`:`<img class="sw-prop" src="${location.art}" alt="" draggable="false" decoding="async">`}</span><span class="sw-location-label"><strong>${esc(location.name)}</strong><small></small></span>`;if(location.decor){b.tabIndex=-1;b.setAttribute('aria-hidden','true');b.style.pointerEvents='none';b.querySelector('.sw-location-label').remove();}layer.append(b);return[id,b];}));
 const cullables=[...slotNodes,...Object.values(locationNodes)];
 for(const b of Object.values(locationNodes))lift(b,'.sw-location-label,.sw-chip');
 function motionReduced(){return reduced.matches||document.body.classList.contains('reduced-motion');}
 // inset = height of the docked dragon card; the camera may slide that far past the bottom edge so a dragon near it stays visible.
let inset=0,topInset=0;
function bounds(){const w=WORLD_SIZE.width*camera.z,h=WORLD_SIZE.height*camera.z;return {minX:Math.min(0,size.width-w),maxX:Math.max(0,(size.width-w)/2),minY:Math.min(0,size.height-h-inset),maxY:Math.max(0,(size.height-h)/2)+topInset};}
 function constrain(){const b=bounds();camera.x=clamp(camera.x,b.minX,b.maxX);camera.y=clamp(camera.y,b.minY,b.maxY);}
 function cull(){const padding=210*camera.z;for(const b of cullables){const x=Number(b.dataset.worldX)*camera.z+camera.x,y=Number(b.dataset.worldY)*camera.z+camera.y;const visible=x>-padding&&x<size.width+padding&&y>-padding&&y<size.height+padding;const focused=b===document.activeElement;b.classList.toggle('sw-offscreen',!visible&&!focused);overlays.get(b)?.classList.toggle('sw-offscreen',!visible&&!focused);b.style.setProperty('--sw-near',visible?1:0);}}
 function drawCamera(){if(destroyed)return;stage.style.transform=`translate3d(${camera.x}px,${camera.y}px,0) scale(${camera.z})`;host.style.setProperty('--sw-camera-scale',camera.z);cull();}
 function scheduleCamera(){if(frame)return;frame=requestAnimationFrame(()=>{frame=0;drawCamera();});}
 function stopTween(){if(tween)cancelAnimationFrame(tween);tween=0;tweenEnd=0;}
 function setCamera(target,smooth=false,ms=350){stopTween();if(!smooth||motionReduced()){camera={...target};constrain();drawCamera();return;}const from={...camera},start=performance.now();tweenEnd=start+ms;function animate(t){if(destroyed)return;const p=clamp((t-start)/ms,0,1),ease=ms>600?(p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2):1-Math.pow(1-p,3);camera={x:from.x+(target.x-from.x)*ease,y:from.y+(target.y-from.y)*ease,z:from.z+(target.z-from.z)*ease};constrain();drawCamera();if(p<1)tween=requestAnimationFrame(animate);else{tween=0;tweenEnd=0;}}tween=requestAnimationFrame(animate);}
 // Reveal: a slow pull back to the whole valley (used when the last fog lifts), a short hold, then back home.
 // Any touch on the map during the hold cancels the way back, so the player keeps control.
 let revealTimer=0,touchedAt=0;
 function reveal(hold=2600,back=()=>home(true,1200)){clearTimeout(revealTimer);setRealm(false);const z=fit,startedAt=performance.now();setCamera({z,x:(size.width-WORLD_SIZE.width*z)/2,y:(size.height-WORLD_SIZE.height*z)/2},true,1800);revealTimer=setTimeout(()=>{if(!destroyed&&touchedAt<startedAt)back();},1800+hold);return 1800+hold;}
 // Home frames the central grove the way the approved concept does.
 function home(smooth=true,ms){setRealm(false);const z=homeZ;setCamera({z,x:size.width/2-1610*z,y:size.height*(size.width<761?.4:.5)-625*z},smooth,ms);}
 // zoomIn>1 brings a selected dragon closer, which also leaves room to lift it above the bottom dock near the world's edge.
// Zoom in on a nest, but never so far that a nest with its dragon (~300 world px) outgrows the gap left by the dock and banner.
function focusPoint(x,y,zoomIn=1){const mobile=size.width<761,visible=size.height-inset-topInset,z=clamp(Math.min(Math.max(camera.z,homeZ*zoomIn),inset?visible*.9/300:maxZ),fit,maxZ);setCamera({z,x:size.width/2-x*z,y:(inset?topInset+visible*0.72:topInset?topInset+visible*0.62:size.height*(mobile ? 0.56 : 0.42))-y*z},true);}
 function setRealm(open){if(open===host.classList.contains('sw-realm-open'))return;host.classList.toggle('sw-realm-open',open);host.querySelector('.sw-realm').setAttribute('aria-hidden',String(!open));}
 let realmLatch=0,realmPull=0;
 function zoomAt(z,x=size.width/2,y=size.height/2){const t=performance.now();if(t<realmLatch)return;
 if(host.classList.contains('sw-realm-open')){if(z>camera.z*1.01){setRealm(false);realmLatch=t+450;realmPull=0;}return;}
 if(camera.z<=fit*1.02&&z<camera.z){realmPull+=Math.log(camera.z/Math.max(z,1e-3));if(realmPull>.12){setRealm(true);realmLatch=t+450;realmPull=0;return;}}else realmPull=0;stopTween();const next=clamp(z,fit,maxZ);camera.x=x-(x-camera.x)/camera.z*next;camera.y=y-(y-camera.y)/camera.z*next;camera.z=next;constrain();scheduleCamera();}
 function zoom(delta=1){zoomAt(camera.z*Math.exp(clamp(delta,-3,3)*.18));}
 function resize(){const r=host.getBoundingClientRect();if(r.width<1||r.height<1)return;const previous={...size},oldFit=fit;size={width:r.width,height:r.height};fit=Math.max(size.width/WORLD_SIZE.width,size.height/WORLD_SIZE.height);homeZ=Math.max(fit,size.width<761?size.height/1180:Math.max(size.width/1660,size.height/930));maxZ=Math.max(homeZ*1.35,Math.min(1.25,6336/WORLD_SIZE.width/(devicePixelRatio||1)));if(!initialized){initialized=true;home(false);}else{const worldX=(previous.width/2-camera.x)/camera.z,worldY=(previous.height/2-camera.y)/camera.z;camera.z=clamp(camera.z*fit/oldFit,fit,maxZ);camera.x=size.width/2-worldX*camera.z;camera.y=size.height/2-worldY*camera.z;constrain();drawCamera();}}
 const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(host);resize();
 // ---- Fog of war ----
 const fogCanvas=host.querySelector('.sw-fog'),fogCtx=fogCanvas.getContext('2d'),fogFx=host.querySelector('.sw-fog-fx');
 let fogOpen={},fogGrow={},fogAnim=0,fogRed=null;

 function drawFog(){const w=fogCanvas.width,h=fogCanvas.height,red=host.classList.contains('sw-eclipse');fogCtx.globalCompositeOperation='source-over';fogCtx.clearRect(0,0,w,h);fogCtx.fillStyle=red?'#12050a':'#06161b';fogCtx.fillRect(0,0,w,h);for(const[x,y,r,a]of FOG_PUFFS){const g=fogCtx.createRadialGradient(x*w,y*h,0,x*w,y*h,r*w);g.addColorStop(0,red?`rgba(70,22,34,${a})`:`rgba(38,78,84,${a})`);g.addColorStop(1,'rgba(0,0,0,0)');fogCtx.fillStyle=g;fogCtx.fillRect(0,0,w,h);}fogCtx.globalCompositeOperation='destination-out';for(const[id,circles]of Object.entries(FOG_AREAS)){const k=fogGrow[id]??0;if(k<=0)continue;for(const[x,y,rad]of circles){const R=rad*k*FOG_SCALE,X=x*FOG_SCALE,Y=y*FOG_SCALE,g=fogCtx.createRadialGradient(X,Y,R*.55,X,Y,R);g.addColorStop(0,'rgba(0,0,0,1)');g.addColorStop(1,'rgba(0,0,0,0)');fogCtx.fillStyle=g;fogCtx.beginPath();fogCtx.arc(X,Y,R,0,Math.PI*2);fogCtx.fill();}}fogRed=red;host.dataset.fog=Object.keys(FOG_AREAS).filter(id=>fogOpen[id]).join(' ')||'none';
  markFogged();}
 function markFogged(){for(const b of cullables){const x=+b.dataset.worldX,y=+b.dataset.worldY;let open=false;for(const[id,circles]of Object.entries(FOG_AREAS))if((fogGrow[id]??0)>.6&&circles.some(([cx,cy,r])=>Math.hypot(x-cx,y-cy)<r*.8))open=true;b.classList.toggle('sw-fogged',!open);overlays.get(b)?.classList.toggle('sw-fogged',!open);}}
 function fogBurst(id){if(motionReduced())return;const[x,y,r]=FOG_AREAS[id][0];for(let i=0;i<34;i++){const p=document.createElement('i'),a=i/34*Math.PI*2,d=r*(.55+Math.random()*.5);p.style.left=`${x+Math.cos(a)*d*.35}px`;p.style.top=`${y+Math.sin(a)*d*.35}px`;p.style.setProperty('--fx',`${Math.cos(a+1.2)*d}px`);p.style.setProperty('--fy',`${Math.sin(a+1.2)*d*.7}px`);p.style.setProperty('--fd',`${Math.random()*500}ms`);p.style.setProperty('--fs',`${.6+Math.random()*1.4}`);fogFx.append(p);setTimeout(()=>p.remove(),2600);}}
 function setFog(next,animate=true){const changed=Object.keys(FOG_AREAS).filter(id=>Boolean(next[id])!==Boolean(fogOpen[id]));fogOpen={...next};if(!changed.length){if(fogRed!==host.classList.contains('sw-eclipse'))drawFog();return;}
  if(!animate||motionReduced()){for(const id of Object.keys(FOG_AREAS))fogGrow[id]=fogOpen[id]?1:0;drawFog();return;}
  for(const id of changed)if(fogOpen[id])fogBurst(id);cancelAnimationFrame(fogAnim);const from={...fogGrow},start=performance.now();const step=t=>{const p=Math.min(1,(t-start)/1700),e=1-Math.pow(1-p,3);for(const id of Object.keys(FOG_AREAS))fogGrow[id]=(from[id]??0)+((fogOpen[id]?1:0)-(from[id]??0))*e;drawFog();if(p<1)fogAnim=requestAnimationFrame(step);};fogAnim=requestAnimationFrame(step);}
 // Waking up is a play-once clip: kept as a blob and given a fresh object URL each time so it restarts from frame one.
 const wakeBlobs=new Map(),sleepState=new Map();
 function wakeClip(species){if(!wakeBlobs.has(species)){wakeBlobs.set(species,null);fetch(`/art/dragons/wake/${species}.webp`).then(r=>r.ok?r.blob():null).then(bl=>wakeBlobs.set(species,bl)).catch(()=>{});}return wakeBlobs.get(species);}
 function playWake(b,species){const bl=wakeClip(species),img=b.querySelector('.dg-pose-wake img');if(!bl||!img)return;const url=URL.createObjectURL(bl);img.onload=()=>(img.decode?img.decode().catch(()=>{}):Promise.resolve()).then(()=>{b.classList.add('sw-waking');clearTimeout(b._wakeT);b._wakeT=setTimeout(()=>{b.classList.add('sw-wake-out');b.classList.remove('sw-waking');setTimeout(()=>{b.classList.remove('sw-wake-out');URL.revokeObjectURL(url);},400);},3300);});img.src=url;}
 // Pose loops load on first need; callers only switch poses once the image is decoded (else the standing idle stays).
 function wake(b,sel){const img=b.querySelector(sel);if(img&&!img.getAttribute('src'))img.src=img.dataset.src;return img;}
 function zoneUnlocked(id){return !['quarry','ruins'].includes(id)||Boolean(state?.locations?.[id]?.unlocked);}
 function update(nextState,{selected:nextSelected=selected,now:nextNow=Date.now(),fog=2,flyReady=false,dock=0,top=0}={}){inset=dock;topInset=top;
 if(destroyed||!nextState)return;state=nextState;selected=nextSelected;now=nextNow;
 const red=Economy.phase?Economy.phase(state,now).red:false;const wasRed=host.classList.contains('sw-eclipse');host.classList.toggle('sw-eclipse',red);if(wasRed!==red&&red)loadEclipse();ambientSync();host.classList.toggle('sw-restored',Boolean(state.restored));
 host.classList.toggle('sw-quarry-locked',!zoneUnlocked('quarry'));host.classList.toggle('sw-ruins-locked',!zoneUnlocked('ruins'));
 for(const slot of WORLD_SLOTS){const b=slotNodes[slot.id],d=state.dragons?.find((d,index)=>(d.slot??index)===slot.id),open=slot.id<Number(state.slots??3)&&zoneUnlocked(slot.location),sp=d?Economy.SPECIES[d.species]:null,away=Boolean(d&&state.expedition?.team?.includes(d.id));
 const production=d&&Economy.production?Economy.production(state,d):d&&sp?{resource:sp.resource,output:sp.output*(d.level??1),cycle:sp.cycle,cap:5}:null;
 const ready=d?.ready??0,quantity=production?.stored??ready*(production?.output??0),name=d?.name||sp?.name||'Дракон';
 const kind=!open?'locked':!d?'empty':d.stage,readyHatch=d?.stage==='egg'&&now>=d.hatchAt;
 const status=!open?(zoneUnlocked(slot.location)?'Потрібне розширення':'Зона під туманом'):!d?'Поселити дракона':away?'В експедиції':d.stage==='egg'?(readyHatch?'Готове вилупитись':clock(d.hatchAt-now)):d.stage==='baby'?`Годування ${d.feeds}/3`:ready?`Забрати +${quantity}`:clock(d.next-now);
 // Only replace the creature subtree when its identity or growth stage changes.
 const still=motionReduced(),signature=JSON.stringify([kind,d?.id,d?.species,d?.stage,still]);
 if(lastNodeSignatures.get(slot.id)!==signature){
 b.className=`sw-nest sw-cullable sw-${kind}${d?.id===selected?' sw-selected':''}${away?' sw-away':''}${ready&&!away?' sw-harvest-ready':''}`;b.dataset.dragon=d?String(d.id):'';b.dataset.locked=open?'false':'true';b.setAttribute('aria-label',!open?`Закрите гніздо ${slot.id+1}, ${LOCATIONS[slot.location]?.name}`:!d?`Вільне гніздо ${slot.id+1}, поселити дракона`:`${name}, ${d.stage==='egg'?'яйце':d.stage==='baby'?'малюк':'дорослий'}, ${status}`);b.setAttribute('aria-pressed',d?.id===selected?'true':'false');
 // Everything sits on the terrace: a woven nest for empty/egg/baby, a vine-choked nest when locked.
 const base=!open?'/art/props/nest-locked.webp':!d||d.stage!=='adult'?'/art/props/nest.webp':'';
 b.innerHTML=`<span class="sw-pad-shadow"></span><span class="sw-select" aria-hidden="true"><svg class="sw-rune-ring" viewBox="-100 -40 200 80"><ellipse rx="92" ry="32" fill="none" stroke="currentColor" stroke-width="2.4" stroke-dasharray="14 7 3 7"/><ellipse rx="80" ry="26" fill="none" stroke="currentColor" stroke-width="1.2" opacity=".6"/></svg><i></i><i></i><i></i><i></i><i></i></span>${base?`<img class="sw-nest-base" src="${base}" alt="" draggable="false" decoding="async">`:''}<span class="sw-nest-ring"></span>${!open?`<span class="sw-lock-art">${icon('lock',22)}</span>`:!d?`<span class="sw-empty-art">${icon('plus',24)}</span>`:`<span class="sw-creature sw-creature-${d.stage} sw-species-${esc(d.species)}">${d.stage==='egg'?egg(d):dragon(d.species,d.stage,{animated:!still})}${d.stage==='adult'?pose(d.species,'sleep')+pose(d.species,'fly')+pose(d.species,'wake'):''}<span class="sw-hit"></span></span>`}<span class="sw-timer" aria-hidden="true"><i><b></b></i><small></small></span><span class="sw-nest-caption"><strong>${!open?'Закрите гніздо':!d?'Вільне гніздо':d.stage==='egg'?(nearEgg(d)?'Рідкісне NEAR-яйце':'Таємниче яйце'):esc(name)}</strong><small>${esc(status)}</small></span>`;
 ovOf(b).replaceChildren();lift(b,'.sw-timer,.sw-nest-caption');markFogged();
 lastNodeSignatures.set(slot.id,signature);
 }
 const wasAway=awayState.get(slot.id);awayState.set(slot.id,away);
 // Idle life: an adult whose store is full curls up and sleeps until collected; in the eclipse every other dragon naps.
 // A dragon you are looking at stays awake.
 const sleeping=Boolean(d&&d.stage==='adult'&&!away&&open&&d.id!==selected&&(d.ready>=Economy.PRODUCTION_CAP||(red&&d.id%2===1&&!d.ready)));
 if(sleeping&&d)wakeClip(d.species);
 const wasSleeping=sleepState.get(slot.id);sleepState.set(slot.id,b.classList.contains('sw-sleeping'));
 if(wasSleeping&&!sleeping&&d&&!motionReduced())playWake(b,d.species);
 // Flight loops are fetched only when a trip is being planned or a team is out (so they are ready for take-off and landing).
 if(initialFogDone&&d?.stage==='adult'&&(flyReady||away))wake(b,'.dg-pose-fly img');
 const sleepImg=sleeping?wake(b,'.dg-pose-sleep img'):null;b.classList.toggle('sw-sleeping',Boolean(sleepImg?.complete&&sleepImg.naturalWidth)&&!motionReduced());
 // A sleep loop that is still downloading curls the dragon up as soon as it arrives (not on the next redraw).
 b._wantSleep=sleeping;if(sleepImg&&!sleepImg.complete)sleepImg.onload=()=>{if(b._wantSleep&&!motionReduced()){b.classList.add('sw-sleeping');sleepState.set(slot.id,true);syncOv(b);}};
 if(initialFogDone&&wasAway!==undefined&&wasAway!==away&&!motionReduced()){const cls=away?'sw-flying-off':'sw-landing',flyImg=wake(b,'.dg-pose-fly img');b.classList.toggle('sw-fly-pose',Boolean(flyImg?.complete&&flyImg.naturalWidth));b.classList.add(cls);setTimeout(()=>b.classList.remove(cls),2300);}
 b.classList.toggle('sw-selected',d?.id===selected);b.classList.toggle('sw-away',away);b.classList.toggle('sw-harvest-ready',Boolean(ready&&!away&&open));
 b.setAttribute('aria-pressed',d?.id===selected?'true':'false');
 setAttr(b,'aria-label',!open?`Закрите гніздо ${slot.id+1}, ${LOCATIONS[slot.location]?.name}`:!d?`Вільне гніздо ${slot.id+1}, поселити дракона`:`${name}, ${d.stage==='egg'?'яйце':d.stage==='baby'?'малюк':'дорослий'}, ${status}`);
 const ov=ovOf(b);const caption=ov.querySelector('.sw-nest-caption');if(caption){const title=!open?'Закрите гніздо':!d?'Вільне гніздо':d.stage==='egg'?(nearEgg(d)?'Рідкісне NEAR-яйце':'Таємниче яйце'):name;const strong=caption.querySelector('strong'),small=caption.querySelector('small');setText(strong,title);setText(small,status);if(d?.name)strong.dataset.noTr='';else delete strong.dataset.noTr;}
 // Progress bar under the creature (hatching or the next harvest), like a little work timer.
 const timer=ov.querySelector('.sw-timer');let progress=null,label='';
 if(open&&d&&!away){if(d.stage==='egg'&&!readyHatch){progress=1-(d.hatchAt-now)/(Economy.HATCH_MS||8000);label=clock(d.hatchAt-now);}else if(d.stage==='adult'&&!ready&&production?.cycle){progress=1-(d.next-now)/(production.cycle*1000);label=clock(d.next-now);}else if(d.stage==='baby'){progress=(d.feeds||0)/3;label=`${d.feeds||0}/3`;}}
 if(timer){timer.hidden=progress===null;if(progress!==null){timer.firstChild.firstChild.style.width=`${Math.round(Math.max(0,Math.min(1,progress))*100)}%`;timer.lastChild.textContent=label;}}
 // One-tap bubble: the single thing this dragon needs right now (collect, feed or hatch).
 const bubble=!open||!d||away?null:ready?{act:'collect',html:`${gem(resourceIcons[production?.resource]||'berry',26)}<b>+${quantity}</b>`}:d.stage==='baby'?((state.resources?.berries??0)<2?{act:'feed',lacking:true,html:`${gem('berry',26)}<b>Потрібно 2</b>`}:{act:'feed',html:`${gem('berry',26)}<b>Нагодувати</b>`}):readyHatch?{act:'hatch',html:`${icon('egg',22)}<b>Вилупити</b>`}:null;
 let awayChip=ov.querySelector('.sw-away-chip');if(away){if(!awayChip){awayChip=document.createElement('span');awayChip.className='sw-away-chip';awayChip.innerHTML=`${icon('compass',14)}<span></span>`;ov.append(awayChip);}const ends=state.expedition?.ends??now;setText(awayChip.lastElementChild,now<ends?clock(ends-now):'Повернулись!');}else awayChip?.remove();
 let harvest=ov.querySelector('.sw-harvest');
 if(bubble){if(!harvest){harvest=document.createElement('span');harvest.className='sw-harvest';ov.append(harvest);}const key=bubble.act+bubble.html;if(harvest.dataset.key!==key){harvest.innerHTML=bubble.html;harvest.dataset.key=key;harvest.dataset.act=bubble.act;harvest.className=`sw-harvest sw-bubble-${bubble.act}`;}harvest.classList.toggle('is-lacking',Boolean(bubble.lacking));harvest.setAttribute('role','button');harvest.tabIndex=0;harvest.setAttribute('aria-label',bubble.act==='collect'?'Зібрати':bubble.act==='feed'?'Нагодувати':'Вилупити');}else harvest?.remove();
 b.classList.toggle('sw-has-bubble',Boolean(bubble));syncOv(b);
 }
 for(const[id,b]of Object.entries(locationNodes)){
 if(LOCATIONS[id].decor)continue;const locked=!zoneUnlocked(id),active=state.location===id;let hint='Відкрити';
 if(id==='forage'){hint=now<(state.forageAt??0)?`Дозріють за ${clock(state.forageAt-now)}`:'+3 ягоди · зібрати';b.classList.toggle('sw-location-ready',now>=(state.forageAt??0));}
 if(id==='shrine')hint=state.restored?'Відновлене':'Мета першого розділу';
 if(id==='market')hint=`Гаманець Люсі: ${state.market?.wallet??0}`;
 // Lucy's live price board: always visible over her stall, flashes ▲/▼ when a price moves.
 if(id==='market'&&state.market&&Economy.price){const ov=ovOf(b);let tag=ov.querySelector('.sw-price-tag');if(!tag){tag=document.createElement('span');tag.className='sw-price-tag';tag.setAttribute('role','button');tag.tabIndex=-1;tag.innerHTML=`<small>Люсі купує</small>${['crystals','berries'].map(k=>`<span class="sw-price" data-k="${k}">${gem(resourceIcons[k],20)}<b></b><i></i></span>`).join('')}`;ov.append(tag);}
  for(const k of ['crystals','berries']){const el=tag.querySelector(`[data-k="${k}"]`),p=Economy.price(state,k),was=Number(el.dataset.p||p);if(String(p)!==el.dataset.p){el.querySelector('b').textContent=p;el.dataset.p=p;if(p!==was){el.classList.remove('up','down');void el.offsetWidth;el.classList.add(p>was?'up':'down');el.querySelector('i').textContent=p>was?'▲':'▼';}}}
  const broke=state.market.wallet<Economy.price(state,'berries');tag.classList.toggle('is-broke',broke);const lab=tag.querySelector('small'),txt=broke?'Немає грошей':'Люсі купує';if(lab.dataset.v!==txt){lab.dataset.v=txt;lab.textContent=txt;}}
 if(id==='grove')hint='Дім і вирощування';
 if(id==='quarry')hint=locked?'Відкриється після Серця долини':'Кристали й нові гнізда';
 if(id==='ruins')hint=state.expedition?'Команда в поході':'Походи за скарбами';
 b.classList.toggle('sw-location-locked',locked);b.classList.toggle('sw-location-active',active);const lov=ovOf(b);const hs=lov.querySelector('.sw-location-label small');setText(hs,hint);setAttr(b,'aria-label',`${LOCATIONS[id].name}. ${hint}`);syncOv(b);
 }
 setFog({nest:fog>=1,grove:fog>=2,quarry:fog>=2&&zoneUnlocked('quarry'),ruins:fog>=2&&zoneUnlocked('ruins')},initialFogDone);initialFogDone=true;
 cull();
 }
 function click(e){
 const pin=e.target.closest('.sw-realm-pin');if(pin){if(pin.dataset.realm==='valley')setRealm(false);else{pin.classList.add('sw-realm-shake');setTimeout(()=>pin.classList.remove('sw-realm-shake'),500);onLocation?.('realm',{name:REALM.find(r=>r.id===pin.dataset.realm)?.name});}return;}
 if(performance.now()<suppressClickUntil){e.preventDefault();return;}
 const ov=e.target.closest('.sw-ov');
 if(ov&&!ov.classList.contains('sw-fogged')){const owner=[...overlays].find(([,o])=>o===ov)?.[0];const bub=e.target.closest('.sw-harvest');
  // Hatching gets an anticipation beat: the egg shakes and cracks before the dragon pops out.
  if(bub&&owner?.dataset.dragon&&bub.dataset.act==='hatch'&&!motionReduced()){if(owner.classList.contains('sw-cracking'))return;owner.classList.add('sw-cracking');setTimeout(()=>{owner.classList.remove('sw-cracking');onAction({type:'hatch',id:Number(owner.dataset.dragon)});},700);return;}
  if(bub&&owner?.dataset.dragon){onAction({type:bub.dataset.act,id:Number(owner.dataset.dragon)});return;}
  if(bub&&owner?.dataset.location==='tree'){onAction({type:'harvestTree'});return;}
  if(e.target.closest('.sw-chip')&&owner){owner.click();return;}
  if(e.target.closest('.sw-away-chip')){onLocation('ruins');return;}}
 const b=e.target.closest('button');if(!b||!host.contains(b)){if(e.target.closest('.sw-stage'))onBackground();return;}if(b.classList.contains('sw-fogged'))return;if(b.dataset.camera){if(b.dataset.camera==='home')home();else zoom(b.dataset.camera==='in'?1:-1);return;}
 const bubble=e.target.closest('.sw-harvest');if(bubble&&b.dataset.dragon){onAction({type:bubble.dataset.act,id:Number(b.dataset.dragon)});return;}
 if(b.dataset.slot!==undefined){const slot=WORLD_SLOTS[Number(b.dataset.slot)];if(b.dataset.locked==='true'){onLocation(zoneUnlocked(slot.location)?slot.id===3&&!state?.restored?'shrine':'expansion':slot.location);return;}if(b.dataset.dragon){onSelect(Number(b.dataset.dragon));return;}onLocation('eggs',{slot:slot.id,location:slot.location});return;}
 if(b.dataset.location==='tree'&&e.target.closest('.sw-harvest')){onAction({type:'harvestTree'});return;}
 if(b.dataset.location){const id=b.dataset.location;if(id==='shrine')flashNear();if(id==='forage'&&now>=(state?.forageAt??0))onAction({type:'forage'});else onLocation(id);}
 }
 host.addEventListener('click',click,{signal});
 host.addEventListener('keydown',e=>{const bub=e.target.closest?.('.sw-harvest');if(bub&&(e.key==='Enter'||e.key===' ')){e.preventDefault();bub.click();}},{signal});
 host.addEventListener('wheel',e=>{if(e.ctrlKey||Math.abs(e.deltaY)>0){e.preventDefault();const rect=host.getBoundingClientRect();zoomAt(camera.z*Math.exp(-clamp(e.deltaY,-120,120)*.0017),e.clientX-rect.left,e.clientY-rect.top);}}, {passive:false,signal});
 function point(e){const r=host.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};}
 host.addEventListener('pointerdown',e=>{touchedAt=performance.now();if(e.button!==0&&e.pointerType==='mouse')return;if(e.target.closest('.sw-camera-controls'))return;stopTween();const p=point(e);pointers.set(e.pointerId,p);if(pointers.size===1)drag={id:e.pointerId,start:p,last:p,moved:false};if(pointers.size===2){const[a,b]=[...pointers.values()];pinch={distance:Math.hypot(a.x-b.x,a.y-b.y),center:{x:(a.x+b.x)/2,y:(a.y+b.y)/2}};host.classList.add('sw-dragging');}}, {signal});
 host.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;const p=point(e);pointers.set(e.pointerId,p);if(pointers.size>1&&pinch){const[a,b]=[...pointers.values()],center={x:(a.x+b.x)/2,y:(a.y+b.y)/2},distance=Math.hypot(a.x-b.x,a.y-b.y);zoomAt(camera.z*distance/Math.max(pinch.distance,1),pinch.center.x,pinch.center.y);camera.x+=center.x-pinch.center.x;camera.y+=center.y-pinch.center.y;constrain();scheduleCamera();pinch={distance,center};suppressClickUntil=performance.now()+350;e.preventDefault();return;}
 if(!drag||drag.id!==e.pointerId)return;const dx=p.x-drag.start.x,dy=p.y-drag.start.y;if(!drag.moved&&Math.hypot(dx,dy)<7)return;if(!drag.moved){stopTween();drag.moved=true;try{host.setPointerCapture(e.pointerId);}catch{}host.classList.add('sw-dragging');host.classList.add('sw-camera-used');}camera.x+=p.x-drag.last.x;camera.y+=p.y-drag.last.y;drag.last=p;constrain();scheduleCamera();suppressClickUntil=performance.now()+350;e.preventDefault();},{signal});
 function pointerEnd(e){if(!pointers.has(e.pointerId))return;pointers.delete(e.pointerId);if(drag?.moved)suppressClickUntil=performance.now()+200;if(pointers.size===1){const[id,p]=[...pointers.entries()][0];drag={id,start:p,last:p,moved:true};pinch=null;}else{drag=null;pinch=null;host.classList.remove('sw-dragging');}try{if(host.hasPointerCapture(e.pointerId))host.releasePointerCapture(e.pointerId);}catch{}}
 window.addEventListener('pointerup',pointerEnd,{signal});host.addEventListener('pointercancel',pointerEnd,{signal});host.addEventListener('lostpointercapture',e=>{if(!pointers.size)host.classList.remove('sw-dragging');},{signal});
 host.addEventListener('keydown',e=>{if(e.target!==host||e.ctrlKey||e.metaKey||e.altKey)return;let used=true;stopTween();switch(e.key){case'ArrowLeft':camera.x+=65;break;case'ArrowRight':camera.x-=65;break;case'ArrowUp':camera.y+=65;break;case'ArrowDown':camera.y-=65;break;case'+':case'=':zoom(1);break;case'-':zoom(-1);break;case'Home':home();break;default:used=false;}if(used){e.preventDefault();constrain();scheduleCamera();}}, {signal});
 host.addEventListener('focusin',e=>{const b=e.target.closest('.sw-cullable');if(b&&b.matches(':focus-visible'))focusPoint(Number(b.dataset.worldX),Number(b.dataset.worldY));},{signal});
 const motionChange=()=>{host.classList.toggle('sw-reduced-motion',reduced.matches);if(reduced.matches)stopTween();ambientSync();};reduced.addEventListener('change',motionChange,{signal});motionChange();
 const EVO_TINT={moss:'#c6f57a',ember:'#ffb35c',stone:'#e4e8ef',mist:'#e7d2ff',crystal:'#8ff3ff'};
 function feedback(id,type='collect'){const MAP={harvestTree:'collect',feedFruit:'upgrade',restore:'restore',claim:'claim',forage:'forage',collect:'collect',feed:'feed',hatch:'hatch',upgrade:'upgrade',grow:'grow'};if(type==='harvestTree')id='tree';if(type==='restore')id='shrine';if(!MAP[type])return false;type=MAP[type];const node=typeof id==='string'?locationNodes[id]:slotNodes.find(b=>b.dataset.dragon===String(id));if(!node)return false;const valid=['feed','hatch','collect','upgrade','claim','forage','restore','grow'].includes(type)?type:'collect';node.classList.remove(...[...node.classList].filter(c=>c.startsWith('sw-feedback-')));if(['hatch','restore','grow'].includes(type)&&!motionReduced()){const burst=document.createElement('span');burst.className='sw-burst';burst.innerHTML='<i></i>'.repeat(12);node.append(burst);setTimeout(()=>burst.remove(),1400);}void node.offsetWidth;node.classList.add(`sw-feedback-${valid}`);if(!motionReduced()&&['grow','upgrade','claim'].includes(valid)){
  // Big moments get their own little scene: growing up (stars), a level (rising gold ring and +1), loot coming home.
  const fx=document.createElement('span');fx.className=`sw-moment sw-moment-${valid}`;fx.setAttribute('aria-hidden','true');
  if(valid==='upgrade'){
   // Level-up is a small transformation: light gathers in a spiral, the dragon flashes white, then pops out of a burst.
   // Light pillar, rays and the ground rune sit behind the dragon; sparks and the level badge in front.
   const d=state.dragons?.find(x=>String(x.id)===node.dataset.dragon);const tint=EVO_TINT[d?.species]||'#ffe680';node.style.setProperty('--evo',tint);fx.style.setProperty('--evo',tint);
   const back=document.createElement('span');back.className='sw-evo-back';back.setAttribute('aria-hidden','true');
   back.innerHTML='<span class="sw-evo-rune"></span><span class="sw-evo-pillar"></span><span class="sw-evo-rays"></span>';
   node.insertBefore(back,node.querySelector('.sw-creature'));node.classList.add('sw-evolving');syncOv(node);setTimeout(()=>{back.remove();node.classList.remove('sw-evolving');syncOv(node);},2800);
  }
  fx.innerHTML=valid==='grow'?'<i>★</i>'.repeat(8):valid==='upgrade'?`${'<i class="sw-evo-mote"></i>'.repeat(10)}${'<i class="sw-evo-spark"></i>'.repeat(12)}<span class="sw-evo-wave"></span><b class="sw-lv-text"><small>Рівень</small>${state.dragons?.find(x=>String(x.id)===node.dataset.dragon)?.level??''}</b>`:`<span class="sw-loot-chest"><img src="/art/icons/act-collect.webp" alt=""></span>${[0,1,2,3,4,5].map(i=>`<span class="sw-loot-bit">${gem(i%2?'crystal':'coin',34)}</span>`).join('')}`;
  ovOf(node).append(fx);setTimeout(()=>fx.remove(),valid==='upgrade'?2900:2200);
 }if(valid==='hatch'&&!motionReduced()){
  // Hatching: shell shards fly out of the nest.
  const fx=document.createElement('span');fx.className='sw-shell-fx';fx.setAttribute('aria-hidden','true');fx.innerHTML='<i></i>'.repeat(8);ovOf(node).append(fx);setTimeout(()=>fx.remove(),1400);
 }if(valid==='feed'&&!motionReduced()){
  // Feeding is a little scene: a berry arcs into the baby's mouth, it munches, crumbs and hearts pop out.
  const fx=document.createElement('span');fx.className='sw-feed-fx';fx.setAttribute('aria-hidden','true');
  fx.innerHTML=`<span class="sw-feed-berry">${gem('berry',64)}</span>${'<i class="sw-crumb"></i>'.repeat(7)}${'<b class="sw-heart">❤</b>'.repeat(3)}<span class="sw-feed-ring"></span>`;
  ovOf(node).append(fx);setTimeout(()=>fx.remove(),2400);
 }const layer=document.createElement('span');layer.className=`sw-feedback-particles sw-feedback-particles-${valid}`;layer.setAttribute('aria-hidden','true');const source=state?.dragons?.find(d=>d.id===id),resource=source?(Economy.production?.(state,source)?.resource||Economy.SPECIES[source.species]?.resource):null;const glyph=valid==='collect'?(id==='tree'?'fruit':resourceIcons[resource]||'leaf'):valid==='feed'||valid==='forage'?'berry':valid==='claim'||valid==='restore'?'relics':valid==='upgrade'?'plus':'leaf';if(valid==='collect')layer.style.color=({berries:'#c9e187',embers:'#efad7d',ore:'#b8dddd',fruit:'#ff9a7a',relics:'#bfe8e0'})[resource]||'#e7edb2';for(let i=0;i<(motionReduced()?1:7);i++){const p=document.createElement('i');p.style.setProperty('--sw-px',`${Math.cos(i*2.4)*65}px`);p.style.setProperty('--sw-py',`${-35-(i%4)*23}px`);p.style.setProperty('--sw-pdelay',`${i*32}ms`);p.innerHTML=['berry','crystal','fruit','relics'].includes(glyph)?gem(glyph,i%2?18:24):icon(glyph,i%2?15:20);layer.append(p);}node.append(layer);const timer=setTimeout(()=>{node.classList.remove(`sw-feedback-${valid}`);layer.remove();effectTimers.delete(timer);},1300);effectTimers.add(timer);return true;}
 return Object.freeze({resetAway(){awayState.clear();},update,feedback,focusDragon(id){const d=state?.dragons?.find(d=>d.id===id),slot=d?WORLD_SLOTS[d.slot??state.dragons.indexOf(d)]:null;if(slot)focusPoint(slot.x,slot.y,1.35);},focusLocation(id){const location=LOCATIONS[id]||LOCATIONS.grove;focusPoint(location.x,location.y);},zoom,home,reveal,destroy(){if(destroyed)return;destroyed=true;clearTimeout(revealTimer);abort.abort();resizeObserver.disconnect();stopTween();if(frame)cancelAnimationFrame(frame);pointers.clear();for(const timer of effectTimers)clearTimeout(timer);effectTimers.clear();host.remove();lastNodeSignatures.clear();}});
}
