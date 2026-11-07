// Loads the game's art before the loader lifts, so nothing pops in or stalls on the first minutes of play.
// Images are decoded (not just downloaded) and kept referenced; videos are fetched into the cache.
// The big one-off clips (pose animations, the eclipse film) follow in the background after the game opens.
const SPECIES=['moss','ember','stone','mist','crystal'];
const small=matchMedia('(max-width: 900px)').matches;
const IMAGES=[
 small?'/art/splash-sm.webp':'/art/splash.webp','/brand/lunearcy-mark.svg','/art/market.webp','/art/shrine.webp','/art/realm.webp',
 ...['act-about','act-collect','act-feed','act-hatch','act-hurry','act-level','berry','coin','crystal','nav-eggs','nav-home','nav-market','nav-trip','nav-valley'].map(n=>`/art/icons/${n}.webp`),
 ...['egg-near','egg','nest-locked','nest','sign','tree-fruit','tree'].map(n=>`/art/props/${n}.webp`),
 '/art/ui/parchment.webp','/art/ui/wood.webp',
 // The first dragon (Мохолист) is needed at once; the other species follow right after the loader lifts.
 ...['moss'].flatMap(k=>[`/art/dragons/${k}.webp`,`/art/dragons/baby-${k}.webp`,`/art/dragons/anim2/${k}.webp`,`/art/dragons/anim2/baby-${k}.webp`]),
 ...SPECIES.filter(k=>k!=='moss').flatMap(k=>[`/art/dragons/${k}.webp`,`/art/dragons/baby-${k}.webp`])
];
// Loaded in the background right after the loader: other species' animations (about 6 MB) and the ambient clips.
const SOON=SPECIES.filter(k=>k!=='moss').flatMap(k=>[`/art/dragons/anim2/${k}.webp`,`/art/dragons/anim2/baby-${k}.webp`]);
const VIDEOS=['/art/ambient/water-day.mp4','/art/ambient/fire-day.mp4','/art/ambient/water-eclipse.mp4','/art/ambient/fire-eclipse.mp4'];
const LATER=[...['sleep','wake','fly'].flatMap(p=>SPECIES.map(k=>`/art/dragons/${p}/${k}.webp`))];
const FILM='/art/cutscene/eclipse.mp4';
const kept=[];
const blobs=new Map();

/** A local blob URL for a file fetched in the background, or the path itself if it is not ready yet. */
export const cachedUrl=path=>blobs.get(path)||path;

function loadImage(src,srcset,sizes){
 const img=new Image();if(sizes)img.sizes=sizes;if(srcset)img.srcset=srcset;img.src=src;kept.push(img);
 return img.decode().catch(()=>{});
}
const warm=url=>fetch(url).then(r=>r.ok?r.blob():null).catch(()=>null);

/**
 * Loads everything the first screens need. `plates` are the valley images as the world declares them
 * ({src, srcset, sizes}), so the browser picks the same file the world will show. Calls `progress(0..1)`.
 */
export function preloadGame({plates=[],progress=()=>{}}={}){
 const jobs=[...IMAGES.map(src=>()=>loadImage(src)),...plates.map(p=>()=>loadImage(p.src,p.srcset,p.sizes)),()=>document.fonts.ready];
 let done=0;const total=jobs.length;progress(0);
 // A few at a time: the first screens arrive early instead of everything finishing together at the end.
 const queue=[...jobs];
 const worker=async()=>{while(queue.length){await queue.shift()();progress(++done/total);}};
 return Promise.all(Array.from({length:6},worker));
}

/** After the loader lifts: the other species' animations and the ambient clips (a few at a time), then the pose
 * clips and the eclipse film one at a time, so they never compete with play. */
export async function preloadLater(){
 const soon=[...SOON.map(src=>()=>loadImage(src)),...VIDEOS.map(url=>()=>warm(url))];
 await Promise.all(Array.from({length:3},async()=>{while(soon.length)await soon.shift()();}));
 for(const url of LATER)await warm(url);
 const film=await warm(FILM);
 if(film)blobs.set(FILM,URL.createObjectURL(film));
}
