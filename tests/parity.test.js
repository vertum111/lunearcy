import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {vectors} from '../tools/parity-vectors.mjs';
test('the contract parity vectors match the game rules (run node tools/parity-vectors.mjs after changing them)',()=>{
 const saved=JSON.parse(readFileSync(new URL('../contracts/economy/tests/parity.json',import.meta.url),'utf8'));
 assert.deepEqual(saved,JSON.parse(JSON.stringify(vectors())));
});
