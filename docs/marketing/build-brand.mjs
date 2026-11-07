import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from '/Users/maksimbojcuk/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/dist/index.mjs';
const base='/Users/maksimbojcuk/Documents/Codex/2026-09-30/new-chat/dragon-sanctuary/public/brand';
const mark='M35 37C99 30 155 48 199 93C217 112 225 137 220 162C213 199 178 221 137 221H61C92 201 114 177 124 146C92 144 64 125 49 100C39 83 35 61 35 37ZM149 126C136 126 116 161 116 178C116 194 128 204 143 204C159 204 172 193 172 177C172 159 161 138 149 126Z';
const small='M35 37C99 30 155 48 199 93C217 112 225 137 220 162C213 199 178 221 137 221H61C92 201 114 177 124 146C92 144 64 125 49 100C39 83 35 61 35 37ZM149 122C134 122 111 160 111 179C111 197 125 208 143 208C161 208 177 195 177 177C177 157 163 134 149 122Z';
const glyph={
 H:'M0 0H18V42H64V0H82V100H64V59H18V100H0Z',
 A:'M0 100V38C0 13 15 0 41 0C67 0 82 13 82 38V100H64V64H18V100ZM18 47H64V38C64 24 57 17 41 17C25 17 18 24 18 38Z',
 T:'M0 0H82V18H50V100H32V18H0Z',
 C:'M78 8C67 3 57 0 44 0C15 0 0 19 0 50C0 81 15 100 44 100C58 100 69 97 80 91L73 75C63 81 55 83 44 83C27 83 18 72 18 50C18 28 27 17 44 17C55 17 62 20 70 25Z',
 G:'M78 8C67 3 57 0 44 0C15 0 0 19 0 50C0 81 15 100 44 100C59 100 72 96 82 89V45H44V62H64V79C57 82 51 83 44 83C27 83 18 72 18 50C18 28 27 17 44 17C55 17 62 20 70 25Z',
 L:'M0 0H18V83H72V100H0Z',
 E:'M0 0H72V17H18V42H64V59H18V83H72V100H0Z',
 N:'M0 100V0H18L64 66V0H82V100H64L18 34V100Z'
};
function word(fill,scale=1){let x=0;return `<g fill="${fill}" fill-rule="evenodd" transform="scale(${scale})">${[...'HATCHGLEN'].map((c,i)=>{const v=`<path transform="translate(${x} 0)" d="${glyph[c]}"/>`;x+=(c==='L'||c==='E'?72:82)+(i===3?17:13);return v;}).join('')}</g>`;}
function svg(w,h,title,body){return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="title"><title id="title">${title}</title>${body}</svg>`;}
for(const [file,color,data] of [['symbol','#A6C96A',mark],['symbol-ink','#173B35',mark],['symbol-black','#111111',mark],['symbol-white','#FFFFFF',mark],['symbol-small','#A6C96A',small]])await fs.writeFile(path.join(base,`hatchglen-${file}.svg`),svg(256,256,`Hatchglen ${file}`,`<path fill="${color}" fill-rule="evenodd" d="${data}"/>`));
for(const [mode,wordColor,markColor] of [['dark','#EEF0D5','#A6C96A'],['light','#173B35','#3D7250'],['mono','#173B35','#173B35']]){
 await fs.writeFile(path.join(base,`hatchglen-logo-${mode}.svg`),svg(1110,180,`Hatchglen ${mode} horizontal logo`,`<g transform="translate(0 -3) scale(.73)"><path fill="${markColor}" fill-rule="evenodd" d="${mark}"/></g><g transform="translate(208 36)">${word(wordColor,1.02)}</g>`));
}

for(const [mode,wordColor,markColor] of [['dark','#EEF0D5','#A6C96A'],['light','#173B35','#3D7250']]){
 await fs.writeFile(path.join(base,`hatchglen-stacked-${mode}.svg`),svg(500,400,`Hatchglen ${mode} stacked logo`,`<path fill="${markColor}" fill-rule="evenodd" transform="translate(126 0) scale(.96)" d="${mark}"/><g transform="translate(38 285)">${word(wordColor,.5)}</g>`));
}
await fs.writeFile(path.join(base,'hatchglen-wordmark.svg'),svg(865,112,'Hatchglen outlined wordmark',`<g transform="translate(7 6)">${word('#173B35')}</g>`));
await fs.writeFile(path.join(base,'hatchglen-avatar.svg'),svg(512,512,'Hatchglen social avatar','<rect width="512" height="512" rx="112" fill="#173B35"/>'+`<path fill="#A6C96A" fill-rule="evenodd" transform="translate(14 6) scale(1.9)" d="${mark}"/>`));
await fs.writeFile(path.join(base,'hatchglen-favicon.svg'),svg(256,256,'Hatchglen favicon','<rect width="256" height="256" rx="56" fill="#173B35"/>'+`<path fill="#C3DA92" fill-rule="evenodd" d="${small}"/>`));
// Compact production exports; no browser is used for SVG rendering.
for(const name of ['avatar','symbol','logo-dark','logo-light','wordmark']){
 const input=path.join(base,`hatchglen-${name}.svg`);
 const width=name==='avatar'?512:name==='symbol'?512:1600;
 await sharp(input,{density:144}).resize({width}).png().toFile(path.join(base,`hatchglen-${name}.png`));
}
for(const size of [16,24,32,64,128,256])await sharp(path.join(base,'hatchglen-favicon.svg'),{density:192}).resize(size,size).png().toFile(path.join(base,`hatchglen-icon-${size}.png`));
const detail={name:'Hatchglen',tagline:'Raise dragons. Wake the valley.',palette:{ink:'#173B35',forest:'#2B6654',moss:'#A6C96A',ivory:'#EEF0D5',coral:'#C85D4A',eclipse:'#542A3B',mist:'#74AC9B'},logo:{primary:'hatchglen-logo-dark.svg',onLight:'hatchglen-logo-light.svg',symbol:'hatchglen-symbol.svg',avatar:'hatchglen-avatar.svg',favicon:'hatchglen-favicon.svg'},status:'Internal production candidate, not trademark-cleared'};
await fs.writeFile(path.join(base,'brand.json'),JSON.stringify(detail,null,2));
