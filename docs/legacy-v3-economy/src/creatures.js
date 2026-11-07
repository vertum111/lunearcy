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
