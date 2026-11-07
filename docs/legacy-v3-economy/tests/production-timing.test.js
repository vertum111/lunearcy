import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,act,tick,HATCH_MS,SPECIES} from '../src/engine.js';

test('collecting midway through production preserves the next scheduled harvest',()=>{
 const t=1000000,s=createState(t);
 act(s,{type:'hatch',id:1},t+HATCH_MS);
 for(let i=0;i<3;i++)act(s,{type:'feed',id:1},t+HATCH_MS);
 const d=s.dragons[0],firstDue=d.next,cycle=SPECIES.moss.cycle*1000;
 act(s,{type:'collect',id:1},firstDue+cycle/2);
 assert.equal(d.next,firstDue+cycle);
 tick(s,firstDue+cycle);
 assert.equal(d.ready,1);
});

test('restoration cannot be counted again after a reload',()=>{
 const t=1000000,s=createState(t);
 s.restored=true;s.slots=4;
 const copy=JSON.parse(JSON.stringify(s)),resources={...copy.resources};
 assert.throws(()=>act(copy,{type:'restore'},t));
 assert.deepEqual(copy.resources,resources);
 assert.equal(copy.slots,4);
});
