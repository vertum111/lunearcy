import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import sharp from '/Users/maksimbojcuk/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/dist/index.mjs';
import {dragon} from '../../src/creatures.js';
const base=path.resolve('public/brand');
const source=await fs.readFile('src/world.js','utf8');
const creature=(species,x,y,w)=>dragon(species).replace('<svg ',`<svg x="${x}" y="${y}" width="${w}" height="${w*.8}" `);
// Use the same terrain cutouts and logical positions as the running game.
// This is a promotional valley illustration, with no simulated UI or transaction.
const terrainConfig=vm.runInNewContext(source.match(/const TERRAIN_ART=(\[.*?\]);/s)[1],{});
const slots=vm.runInNewContext(source.match(/WORLD_SLOTS\s*=\s*Object\.freeze\((\[.*?\])\)/s)[1],{});
const creatures=['moss','ember','stone'].map((species,i)=>{const slot=slots[i],width=[260,250,255][i];return `<ellipse cx="${slot.x}" cy="${slot.y-10}" rx="${width*.27}" ry="${width*.055}" fill="#173B35" opacity=".2"/>`+creature(species,slot.x-width/2,slot.y-width*.8,width);}).join('');
const terrain=await Promise.all(terrainConfig.map(async region=>{
 const asset=await fs.readFile(path.resolve('public'+region.src));
 const embedded=await sharp(asset).resize({width:Math.round(region.w*.7)}).png().toBuffer();
 const uri='data:image/png;base64,'+embedded.toString('base64');
 return `<image href="${uri}" x="${region.x}" y="${region.y}" width="${region.w}" height="${region.h}"/>`;
}));
const forest='data:image/png;base64,'+(await sharp('public/art/forest-layer.webp').resize({width:1200}).png().toBuffer()).toString('base64');
let world=`<svg x="390" y="-25" viewBox="320 150 1600 1220" width="850" height="650"><image href="${forest}" x="0" y="0" width="2200" height="1500" preserveAspectRatio="xMidYMid slice" opacity=".5"/><path d="M1320 595C1460 580 1510 535 1630 500" fill="none" stroke="#78815a" stroke-width="27" stroke-linecap="round"/>${terrain.join('')}${creatures}</svg>`;
const logo=Buffer.from(await fs.readFile(path.join(base,'hatchglen-logo-dark.svg'))).toString('base64');
const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" role="img" aria-labelledby="title desc"><title id="title">Hatchglen — Raise dragons. Wake the valley.</title><desc id="desc">Original illustrated valley, the woodland, fire and stone dragons, and the Hatchglen mark. Prototype promotional illustration, not a screenshot.</desc><defs><linearGradient id="poster-bg" x2="1" y2="1"><stop stop-color="#173B35"/><stop offset="1" stop-color="#265956"/></linearGradient></defs><rect width="1200" height="630" fill="url(#poster-bg)"/><ellipse cx="940" cy="240" rx="460" ry="360" fill="#528E72" opacity=".15"/>${world}<path d="M0 0H450C490 170 484 412 460 630H0Z" fill="#173B35"/><image href="data:image/svg+xml;base64,${logo}" x="54" y="49" width="350" height="57"/><g font-family="Arial, Helvetica, sans-serif"><text x="58" y="209" font-size="53" font-weight="700" fill="#EEF0D5">Raise dragons.</text><text x="58" y="274" font-size="53" font-weight="700" fill="#EEF0D5">Wake the valley.</text><text x="59" y="346" font-size="23" fill="#C3D6BD">Small creatures.</text><text x="59" y="382" font-size="23" fill="#C3D6BD">Useful work.</text><text x="59" y="418" font-size="23" fill="#C3D6BD">Places worth discovering.</text><path d="M58 494H358" stroke="#6F8C64"/><text x="59" y="538" font-size="15" font-weight="700" fill="#A6C96A">A DRAGON SANCTUARY GAME</text><text x="59" y="573" font-size="12" fill="#C3D6BD">IN DEVELOPMENT · VALLEY ILLUSTRATION</text></g></svg>`;
await fs.writeFile(path.join(base,'hatchglen-og.svg'),svg);
await sharp(Buffer.from(svg)).resize(1200,630).png().toFile(path.join(base,'hatchglen-og.png'));
console.log('Illustrated OG exported with current terrain cutouts and original code-native creatures.');
