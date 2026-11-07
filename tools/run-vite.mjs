import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const local=createRequire(import.meta.url);
let cli;
try {cli=local.resolve('vite/package.json').replace(/package.json$/, 'bin/vite.js');}
catch {cli=new URL('../../lunearcy/node_modules/vite/bin/vite.js',import.meta.url).pathname;}
await import(pathToFileURL(cli).href);
