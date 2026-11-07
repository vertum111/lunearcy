// "A week in a minute": plays the market simulation (market-sim.js) as a live chart, so anyone can watch the economy move:
// both prices, Lucy's wallet, the days her shop was closed and what happened in the village.
import {simulateWeek} from './market-sim.js';
import {MARKET} from './market-rules.js';
import {trapFocus} from './focus-trap.js';
import {icon} from './art.js';
const W=720,H=230,PAD=34,WH=70;
const DAY=86400000;
const clockOf=t=>t>=7*DAY?'День 7 · 24:00':`День ${Math.floor(t/DAY)+1} · ${String(Math.floor(t%DAY/3600000)).padStart(2,'0')}:${String(Math.floor(t%3600000/60000)).padStart(2,'0')}`;
const KIND_ICON={event:'★',closed:'✕',open:'✓',invest:'+',drop:'↓'};

/** Opens the simulation over the game. `translate(node)` localises text; resolves when it is closed. */
export function openMarketWeek({translate=()=>{},reduced=false}={}){
 return new Promise(resolve=>{
  const root=document.createElement('div');
  root.className='mw';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','Тиждень ринку за хвилину');
  root.innerHTML=`<div class="mw-card"><header class="mw-head"><div><span class="kicker">Симуляція економіки</span><h2>Тиждень ринку за хвилину</h2></div><b class="mw-clock" aria-live="off">Рахуємо тиждень…</b><button class="mw-play" type="button" aria-label="Пауза">❚❚</button><button class="close-panel mw-close" type="button" aria-label="Закрити">${icon('close',18)}</button></header>
<div class="mw-stats"><span class="mw-b"><i></i>Ягоди <b>–</b></span><span class="mw-c"><i></i>Кристали <b>–</b></span><span class="mw-w"><i></i>Гаманець Люсі <b>–</b></span><span class="mw-shop">Крамниця <b>–</b></span></div>
<svg class="mw-chart" viewBox="0 0 ${W} ${H+WH+30}" role="img" aria-label="Ціни й гаманець Люсі за тиждень"></svg>
<ol class="mw-feed" aria-live="polite"></ol>
<p class="mw-note">Шестеро гравців грають короткими сесіями: вранці, в обід і ввечері. Ринок рухається за тими самими правилами, що й у грі (<code>src/market-rules.js</code>). Твоє збереження не змінюється.</p></div>`;
  document.body.append(root);translate(root);
  const release=trapFocus(root,root.querySelector('.mw-play'));
  const svg=root.querySelector('.mw-chart'),clock=root.querySelector('.mw-clock'),feed=root.querySelector('.mw-feed'),play=root.querySelector('.mw-play');
  let done=false,raf=0,paused=false,elapsed=0,last=0,shown=0;
  const close=()=>{if(done)return;done=true;cancelAnimationFrame(raf);removeEventListener('keydown',keys,true);release();root.classList.add('mw-out');setTimeout(()=>{root.remove();resolve();},250);};
  const keys=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}else if(e.key===' '){e.preventDefault();toggle();}};
  const toggle=()=>{paused=!paused;play.textContent=paused?'▶':'❚❚';play.setAttribute('aria-label',paused?'Далі':'Пауза');translate(play);};
  addEventListener('keydown',keys,true);
  root.querySelector('.mw-close').addEventListener('click',close);play.addEventListener('click',toggle);
  // Clicks stay inside: the game would read them as a click past its panel and close the market behind.
  root.addEventListener('click',e=>{e.stopPropagation();if(e.target===root)close();});
  requestAnimationFrame(()=>root.classList.add('mw-in'));
  // Let the card appear first; the week itself takes a few hundred milliseconds to compute.
  setTimeout(()=>{
   if(done)return;
   const sim=simulateWeek(),{samples,events,length}=sim,DURATION=60000;
   // Wallet on a square-root scale, so the empty-wallet days stay visible next to the rich ones.
   const top=Math.max(MARKET.base.crystals*1.25,...samples.map(s=>s.crystals)),wTop=Math.max(...samples.map(s=>s.wallet),1);
   const x=t=>PAD+(W-PAD-8)*t/length,y=p=>H-8-(H-24)*p/top,yw=w=>H+30+WH-(WH-6)*Math.sqrt(w/wTop);
   // Static frame: day grid, price axis, event markers and the closed-shop bands.
   let grid='';
   for(let d=0;d<=7;d++){const gx=x(d*DAY);grid+=`<line class="mw-grid" x1="${gx}" x2="${gx}" y1="8" y2="${H+30+WH}"/>${d<7?`<text class="mw-day" x="${gx+4}" y="${H+22}">Д${d+1}</text>`:''}`;}
   // The floor line stays unlabelled: its number would sit on top of the base price's.
   for(const p of [MARKET.floor.berries,MARKET.base.berries,MARKET.base.crystals])grid+=`<line class="mw-hline" x1="${PAD}" x2="${W-8}" y1="${y(p)}" y2="${y(p)}"/>${p===MARKET.floor.berries?'':`<text class="mw-axis" x="${PAD-6}" y="${y(p)+4}">${p}</text>`}`;
   const bands=[];let from=null;for(const s of samples){if(!s.open&&from===null)from=s.t;if(s.open&&from!==null){bands.push([from,s.t]);from=null;}}if(from!==null)bands.push([from,length]);
   svg.innerHTML=`${grid}<g class="mw-bands"></g><g class="mw-marks"></g><path class="mw-wallet"/><polyline class="mw-line mw-line-b"/><polyline class="mw-line mw-line-c"/><circle class="mw-dot mw-dot-b" r="4"/><circle class="mw-dot mw-dot-c" r="4"/><line class="mw-now" y1="8" y2="${H+30+WH}"/><text class="mw-label" x="${PAD+4}" y="${H+56}">Гаманець Люсі</text>`;
   translate(svg);
   const lineB=svg.querySelector('.mw-line-b'),lineC=svg.querySelector('.mw-line-c'),wallet=svg.querySelector('.mw-wallet'),dotB=svg.querySelector('.mw-dot-b'),dotC=svg.querySelector('.mw-dot-c'),now=svg.querySelector('.mw-now'),bandG=svg.querySelector('.mw-bands'),markG=svg.querySelector('.mw-marks');
   const stat=(cls,v)=>{root.querySelector(`.${cls} b`).textContent=v;};
   const draw=t=>{
    const vis=samples.filter(s=>s.t<=t),cur=vis[vis.length-1];if(!cur)return;
    lineB.setAttribute('points',vis.map(s=>`${x(s.t).toFixed(1)},${y(s.berries).toFixed(1)}`).join(' '));
    lineC.setAttribute('points',vis.map(s=>`${x(s.t).toFixed(1)},${y(s.crystals).toFixed(1)}`).join(' '));
    wallet.setAttribute('d',`M${x(0)},${yw(0)} `+vis.map(s=>`L${x(s.t).toFixed(1)},${yw(s.wallet).toFixed(1)}`).join(' ')+` L${x(cur.t).toFixed(1)},${yw(0)} Z`);
    dotB.setAttribute('cx',x(cur.t));dotB.setAttribute('cy',y(cur.berries));dotC.setAttribute('cx',x(cur.t));dotC.setAttribute('cy',y(cur.crystals));
    now.setAttribute('x1',x(t));now.setAttribute('x2',x(t));
    bandG.innerHTML=bands.filter(([a])=>a<=t).map(([a,b])=>`<rect x="${x(a)}" y="8" width="${Math.max(2,x(Math.min(b,t))-x(a))}" height="${H+22+WH}"/>`).join('');
    clock.textContent=clockOf(t);translate(clock);
    stat('mw-b',`${cur.berries} за 1`);stat('mw-c',`${cur.crystals} за 1`);stat('mw-w',`${cur.wallet}`);stat('mw-shop',cur.open?'відкрита':'закрита');
    root.querySelector('.mw-shop').classList.toggle('closed',!cur.open);translate(root.querySelector('.mw-stats'));
    const due=events.filter(e=>e.t<=t);
    for(const e of due.slice(shown)){
     const li=document.createElement('li');li.className=`mw-ev mw-${e.kind}`;li.innerHTML=`<i>${KIND_ICON[e.kind]||'•'}</i><small></small><span></span>`;
     li.querySelector('small').textContent=clockOf(e.t);li.querySelector('span').textContent=e.text;translate(li);feed.prepend(li);
     if(e.kind==='event')markG.insertAdjacentHTML('beforeend',`<line x1="${x(e.t)}" x2="${x(e.t)}" y1="8" y2="${H+30+WH}"/><text x="${x(e.t)+4}" y="20">★</text>`);
    }
    shown=due.length;
   };
   if(reduced){draw(length);clock.textContent=clockOf(length);translate(clock);return;}
   const frame=ts=>{if(done)return;if(last&&!paused)elapsed=Math.min(DURATION,elapsed+(ts-last));last=ts;draw(length*elapsed/DURATION);if(elapsed>=DURATION){play.textContent='↺';play.setAttribute('aria-label','Ще раз');paused=true;play.onclick=()=>{elapsed=0;shown=0;feed.innerHTML='';markG.innerHTML='';play.onclick=null;};}raf=requestAnimationFrame(frame);};
   draw(0);raf=requestAnimationFrame(frame);
  },120);
 });
}
