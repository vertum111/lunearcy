import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from '/Users/maksimbojcuk/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/dist/index.mjs';
const base='/Users/maksimbojcuk/Documents/Codex/2026-09-30/new-chat/dragon-sanctuary/public/brand';
const data=async file=>'data:image/svg+xml;base64,'+Buffer.from(await fs.readFile(path.join(base,file))).toString('base64');
const black=await data('hatchglen-symbol-black.svg'),white=await data('hatchglen-symbol-white.svg'),dark=await data('hatchglen-logo-dark.svg'),light=await data('hatchglen-logo-light.svg'),stack=await data('hatchglen-stacked-dark.svg'),avatar=await data('hatchglen-avatar.svg');
const sizes=[16,24,32,64,128];
const icons=await Promise.all(sizes.map(async n=>({n,src:'data:image/png;base64,'+(await fs.readFile(path.join(base,`hatchglen-icon-${n}.png`))).toString('base64')})));
const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800"><rect width="1200" height="800" fill="#F4F1E4"/><text x="40" y="48" font-family="Arial" font-size="22" fill="#173B35">HATCHGLEN / VECTOR AND SMALL-SIZE CHECK</text><image href="${black}" x="40" y="80" width="180" height="180"/><image href="${light}" x="275" y="115" width="850" height="138"/><rect x="0" y="290" width="1200" height="300" fill="#173B35"/><image href="${white}" x="40" y="330" width="170" height="170"/><image href="${dark}" x="270" y="330" width="650" height="106"/><image href="${stack}" x="960" y="310" width="200" height="230"/><image href="${avatar}" x="770" y="455" width="100" height="100"/><text x="40" y="630" font-family="Arial" font-size="18" fill="#173B35">Actual favicon sizes:16 /24 /32 /64 /128px</text>${icons.map(({n,src},i)=>`<image href="${src}" x="${40+i*205}" y="660" width="${n}" height="${n}"/><text x="${40+i*205+n+12}" y="687" font-family="Arial" font-size="16" fill="#173B35">${n}px</text>`).join('')}</svg>`;
await fs.writeFile(path.join(base,'previews','brand-test-sheet.svg'),svg);await sharp(Buffer.from(svg),{density:96}).resize(1200,800).png().toFile(path.join(base,'previews','brand-test-sheet.png'));
function lum(h){const v=h.match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return .2126*v[0]+.7152*v[1]+.0722*v[2];}
for(const h of ['EEF0D5','A6C96A','C3D6BD','E4938B']){const a=lum(h),b=lum('173B35'),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);if(ratio<4.5)throw Error(`${h} contrast${ratio}`);console.log(`${h} on173B35: ${ratio.toFixed(2)}:1`);}
const posts=JSON.parse(await fs.readFile('/Users/maksimbojcuk/Documents/Codex/2026-09-30/new-chat/dragon-sanctuary/docs/marketing/calendar-2026-11-01-to-14.json','utf8'));
if(posts.length!==14||posts.some(p=>p.post_en.length>280||p.fallback_en.length>280))throw Error('Invalidpostcount/length');
console.log('14 dates /28 drafts / no length overflow');
