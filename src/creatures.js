// Dragon sprites traced from the approved Codex concept art (public/art/dragons/*.webp).
// `facing` is the direction the art looks (1 = right); the map mirrors sprites to face the valley centre.
// `paw` is the fraction of sprite height where the paws touch the ground (tails may hang lower);
// `width` is the on-map width in world pixels. Motion is applied by CSS to the whole sprite.
// The previous articulated SVG version is archived in art-source/legacy-v3-runtime/creatures-svg.js.
const SPRITES={
 moss:{label:'Лісовий',facing:1,adult:{paw:.96,width:280},baby:{paw:.99,width:108}},
 ember:{label:'Вогняний',facing:-1,adult:{paw:.99,width:216},baby:{paw:.99,width:104}},
 stone:{label:'Кам’яний',facing:1,adult:{paw:.89,width:240},baby:{paw:.99,width:108}},
 mist:{label:'Туманний',facing:1,adult:{paw:.995,width:288},baby:{paw:.99,width:112}},
 crystal:{label:'Кришталевий',facing:1,adult:{paw:.995,width:264},baby:{paw:.99,width:112}}
};
// Looping hand-animated idles (tools/art/animate.py); their crop differs from the stills, hence own paw/width.
const ANIMATED={moss:{paw:.945,width:280},ember:{paw:.997,width:220},stone:{paw:.875,width:244},'baby-moss':{paw:.994,width:112},'baby-ember':{paw:.987,width:108},'baby-stone':{paw:.993,width:112},mist:{paw:.99,width:288},crystal:{paw:.99,width:264},'baby-mist':{paw:.99,width:112},'baby-crystal':{paw:.99,width:112}};
export function dragon(species,stage='adult',{animated=false}={}){
 const kind=SPRITES[species]?species:'moss',age=stage==='baby'?'baby':'adult',file=`${age==='baby'?'baby-':''}${kind}`,anim=animated&&ANIMATED[file];
 const sprite=anim||SPRITES[kind][age],src=anim?`/art/dragons/anim2/${file}.webp`:`/art/dragons/${file}.webp`;
 return `<span class="dragon-sprite dg-${kind} dg-${age}" style="--dg-paw:${sprite.paw};--dg-w:${sprite.width}px;--dg-face:${age==='baby'?1:SPRITES[kind].facing}" role="img" aria-label="${SPRITES[kind].label} дракон${age==='baby'?' (малюк)':''}"><img src="${src}" alt="" draggable="false" decoding="async"${anim?` onerror="this.onerror=null;this.parentNode.style.setProperty('--dg-paw','${SPRITES[kind][age].paw}');this.parentNode.style.setProperty('--dg-w','${SPRITES[kind][age].width}px');this.src='/art/dragons/${file}.webp'"`:''}></span>`;
}
// Extra hand-animated poses for adults (tools/art/animate.py): curled-up sleep, a wing-beat flight and a play-once
// wake-up stretch. Loaded lazily by the world (data-src) the first time a dragon sleeps, flies or wakes.
const POSE_SCALE={fly:1.08};
// Wake clips (rebuilt with animate.py --normalize, so the dragon keeps one size) and the sleep loop they start from,
// measured by tools/art/calibrate_wake.py: [layer width, foot drop, x shift]. The clip starts exactly on the sleep pose
// and drifts by its x shift onto the idle's spot, so neither falling asleep, waking nor the hand-off to the idle jumps.
const WAKE={moss:[305,38,-15],ember:[254,26,-18],stone:[264,34,-10],mist:[324,30,17],crystal:[279,39,-4]};
const SLEEP={moss:[198,16,16],ember:[164,6,21],stone:[188,24,9],mist:[205,15,-17],crystal:[195,11,7]};
// Which way each pose was drawn (1 = facing right); the world mirrors them like the idle so dragons never flip mid-switch.
// Sleep and wake share one mirror (the wake clip starts on the sleep frame), chosen so the clip ends facing like the idle.
const WAKE_FACING={moss:1,ember:-1,stone:1,mist:1,crystal:1};
// Stone's wake clip starts on its sleep frame mirrored (head right), so its sleep layer is flipped once more to match.
const POSE_FACING={sleep:{...WAKE_FACING,stone:-1},wake:WAKE_FACING};
export function pose(species,kind){
 const k=SPRITES[species]?species:'moss',[w,drop,dx]=kind==='wake'?WAKE[k]:kind==='sleep'?SLEEP[k]:[Math.round((ANIMATED[k]||SPRITES[k].adult).width*POSE_SCALE[kind]),0,0];
 return `<span class="dg-pose dg-pose-${kind}" style="--pw:${w}px;--pdy:${drop}px;--pdx:${dx}px;--pf:${POSE_FACING[kind]?.[k]??1}" aria-hidden="true"><img alt="" draggable="false" decoding="async" data-src="/art/dragons/${kind}/${k}.webp"></span>`;
}
