import fs from 'node:fs/promises';
import sharp from '/Users/maksimbojcuk/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/dist/index.mjs';
const asset=await fs.readFile('public/art/mara.svg');
const uri='data:image/svg+xml;base64,'+asset.toString('base64');
for(const size of [24,48,72])await sharp(asset).resize(size,size).png().toFile(`docs/qa/brand-v3/mara-${size}.png`);
const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 260"><rect width="700" height="260" fill="#173B35"/><g fill="#EEF0D5" font-family="Arial,Helvetica,sans-serif"><text x="24" y="35" font-size="20" font-weight="700">MARA / ACTUAL SMALL SIZES</text><text x="24" y="224" font-size="16">Original Hatchglen art · three-color palette</text></g>${[24,48,72].map((s,i)=>`<image x="${40+i*180}" y="${145-s}" width="${s}" height="${s}" href="${uri}"/><text x="${40+i*180}" y="175" fill="#EEF0D5" font-family="Arial" font-size="14">${s}px</text>`).join('')}<image x="560" y="68" width="140" height="140" href="${uri}"/></svg>`;
await fs.writeFile('docs/qa/brand-v3/mara-size-check.svg',svg);
await sharp(Buffer.from(svg)).png().toFile('docs/qa/brand-v3/mara-size-check.png');
