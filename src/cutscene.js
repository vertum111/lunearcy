// First eclipse cutscene: one painted film tells the joke behind the eclipse (the NEAR price drops, the sky turns red
// like a chart), then Lucy the forest spirit calms the dragons down and the day comes back. The film plays in a framed
// 16:9 window at its own resolution (never stretched over the whole screen) and the subtitles run on its timeline.
// Tap jumps to the next line, "Пропустити" ends it. With reduced motion it shows paused frames instead of playing.
import {lucy} from './art.js';
import {cachedUrl} from './preload.js';
import {trapFocus} from './focus-trap.js';
const FILM='/art/cutscene/eclipse.mp4',POSTER='/art/cutscene/eclipse-poster.jpg';
// [from, to, who, text] in seconds of the film; who: 'n' narrator, 'l' Lucy.
const CUES=[
 [.4,2.8,'n','Ранок у долині. NEAR зеленіє, ягоди солодкі, життя прекрасне.'],
 [2.9,6.6,'n','Аж раптом хтось на ринку натиснув „Продати“…'],
 [11.9,18,'n','Мохолист біжить до друзів: „Прокидайтеся! Графік падає!“'],
 [18.2,24.1,'n','Кремінь знепритомнів. Жарик бігає колами. Мохолист обіймає кристали й нізащо не продає.'],
 [24.5,27.4,'l','Ой-ой-ой, без паніки! Я Люсі, дух цього лісу.'],
 [27.5,30.9,'l','Це Затемнення: коли ціна NEAR падає, небо червоніє, як графік.'],
 [31,33.4,'l','Буває кожні дві хвилини. Ну… це ж крипта.'],
 [33.5,36.1,'l','Але воно завжди минає — і знову світить сонце!'],
 [36.2,38.7,'l','А ягоди й кристали несіть мені — плачу монетами!']
];
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const readMs=text=>Math.max(2600,text.length*62);

/** Plays the cutscene over the game. `translate(node)` localises the text; resolves when it is closed. */
export function playEclipseCutscene({translate=()=>{},reduced=false}={}){
 return new Promise(resolve=>{
  const root=document.createElement('div');
  root.className=`cutscene${reduced?' cs-reduced':''}`;root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','Перше затемнення');
  root.innerHTML=`<div class="cs-frame"><video class="cs-video" muted playsinline preload="auto" poster="${POSTER}" src="${cachedUrl(FILM)}"></video><p class="cs-caption" aria-live="polite"></p><div class="cs-talk" aria-live="polite"><span class="cs-face">${lucy(44)}</span><div><b>Люсі</b><p></p></div></div></div><button class="cs-skip" type="button">Пропустити</button>`;
  document.body.append(root);translate(root);
  const release=trapFocus(root,root.querySelector('.cs-skip'));
  const video=root.querySelector('.cs-video'),caption=root.querySelector('.cs-caption'),talk=root.querySelector('.cs-talk'),talkLine=talk.querySelector('p');
  let done=false,shown=-1,next=null;
  const finish=async()=>{if(done)return;done=true;removeEventListener('keydown',keys,true);release();video.pause();document.body.classList.remove('cs-playing');root.classList.add('cs-out');await wait(700);root.remove();resolve();};
  // Show cue i (or nothing for -1); the narrator line and Lucy's bubble never overlap.
  const show=i=>{
   if(i===shown)return;shown=i;caption.classList.remove('show');talk.classList.remove('show');
   if(i<0)return;const [,,who,text]=CUES[i],el=who==='l'?talkLine:caption,box=who==='l'?talk:caption;
   el.textContent=text;translate(el);void box.offsetWidth;box.classList.add('show');
  };
  const sync=()=>{const t=video.currentTime;show(CUES.findIndex(([a,b])=>t>=a&&t<b));};
  const keys=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();finish();}else if(e.key===' '||e.key==='Enter'){e.preventDefault();next?.();}};
  addEventListener('keydown',keys,true);
  root.querySelector('.cs-skip').addEventListener('click',e=>{e.stopPropagation();finish();});
  root.addEventListener('click',e=>{e.stopPropagation();next?.();});
  // The film needs a little buffer before it starts, so it does not stall on the first seconds.
  const ready=()=>new Promise(r=>{if(video.readyState>=4)return r();video.addEventListener('canplaythrough',r,{once:true});video.addEventListener('error',r,{once:true});setTimeout(r,4000);});
  (async()=>{
   await wait(60);root.classList.add('cs-in');await wait(500);
   // Behind an opaque overlay the valley would still animate and repaint; hiding it keeps the film smooth.
   document.body.classList.add('cs-playing');
   await ready();if(done)return;
   if(!reduced&&await video.play().then(()=>true,()=>false)){
    video.addEventListener('timeupdate',sync);
    next=()=>{const t=video.currentTime,c=CUES.find(([a])=>a>t+.05);if(c)video.currentTime=c[0];else finish();};
    await new Promise(r=>video.addEventListener('ended',r,{once:true}));
    if(!done){await wait(400);finish();}
    return;
   }
   // Reduced motion (or autoplay refused): step through the lines over paused frames.
   video.pause();
   for(let i=0;i<CUES.length&&!done;i++){
    video.currentTime=Math.min(CUES[i][1]-.2,CUES[i][0]+1.2);show(i);
    await new Promise(r=>{next=r;setTimeout(r,readMs(CUES[i][3]));});
   }
   finish();
  })();
 });
}
