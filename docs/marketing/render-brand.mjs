import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from '/Users/maksimbojcuk/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/dist/index.mjs';
const dir='/Users/maksimbojcuk/Documents/Codex/2026-09-30/new-chat/dragon-sanctuary/public/brand';
for (const file of (await fs.readdir(path.join(dir,'concepts'))).filter(x=>x.endsWith('.svg'))) {
 await sharp(path.join(dir,'concepts',file),{density:192}).resize(512,512,{fit:'contain'}).png().toFile(path.join(dir,'previews',file.replace('.svg','.png')));
}
