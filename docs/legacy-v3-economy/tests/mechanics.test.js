import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,act,hydrate,validate,goalStatus,dragonScore,fruitToLevel,TREE_SHIFTS,HURRY_COST,HATCH_MS} from '../src/engine.js';
const T=1_000_000;
function mature(s,id=1,now=s.last+HATCH_MS){act(s,{type:'hatch',id},now);for(let i=0;i<3;i++)act(s,{type:'feed',id},now);return s.dragons.find(d=>d.id===id);}

test('fruit tree runs one shift at a time and pays its yield only when ripe',()=>{
 const s=createState(T);
 act(s,{type:'plantTree',shift:'tiny'},T);
 assert.throws(()=>act(s,{type:'plantTree',shift:'tiny'},T+1000),/вже росте/);
 assert.throws(()=>act(s,{type:'harvestTree'},T+1000),/дозрівають/);
 act(s,{type:'harvestTree'},T+TREE_SHIFTS.tiny.seconds*1000);
 assert.equal(s.resources.fruit,1);assert.equal(s.fruitHarvested,1);assert.equal(s.tree.shift,null);
});

test('paid shifts are atomic: no coins, no shift',()=>{
 const s=createState(T);s.resources.coins=10;
 assert.throws(()=>act(s,{type:'plantTree',shift:'small'},T),/Не вистачає/);
 assert.equal(s.resources.coins,10);assert.equal(s.tree.shift,null);
 assert.throws(()=>act(s,{type:'plantTree',shift:'golden'},T),/Невідомий/);
});

test('a ripe tree must be harvested before the next shift',()=>{
 const s=createState(T);act(s,{type:'plantTree',shift:'tiny'},T);
 assert.throws(()=>act(s,{type:'plantTree',shift:'tiny'},T+31000),/Спершу збери/);
});

test('fruit raises a dragon level after level×2 treats and is spent atomically',()=>{
 const s=createState(T);const d=mature(s);s.resources.fruit=2;
 assert.equal(fruitToLevel(d),2);
 act(s,{type:'feedFruit',id:d.id},s.last);assert.equal(d.level,1);assert.equal(d.xp,1);
 act(s,{type:'feedFruit',id:d.id},s.last);assert.equal(d.level,2);assert.equal(d.xp,0);
 assert.throws(()=>act(s,{type:'feedFruit',id:d.id},s.last),/Не вистачає/);
 assert.equal(d.level,2);
});

test('levels 4–5 through fruit still require the restored heart',()=>{
 const s=createState(T);const d=mature(s);d.level=3;s.resources.fruit=20;
 assert.throws(()=>act(s,{type:'feedFruit',id:d.id},s.last),/Серце долини/);
 assert.equal(s.resources.fruit,20);
});

test('eggs can be hurried once for coins; ready eggs cannot',()=>{
 const s=createState(T);const coins=s.resources.coins;
 act(s,{type:'hurry',id:1},T+1000);
 assert.equal(s.resources.coins,coins-HURRY_COST.coins);assert.equal(s.hurried,1);
 assert.throws(()=>act(s,{type:'hurry',id:1},T+1000),/вже готове/);
 act(s,{type:'hatch',id:1},T+1000);
});

test('goals pay their reward exactly once and only when done',()=>{
 const s=createState(T);
 assert.throws(()=>act(s,{type:'claimGoal',goal:'impatient'},T),/ще не виконана/);
 act(s,{type:'hurry',id:1},T);const coins=s.resources.coins;
 act(s,{type:'claimGoal',goal:'impatient'},T);
 assert.equal(s.resources.coins,coins+10);
 assert.throws(()=>act(s,{type:'claimGoal',goal:'impatient'},T),/вже отримано/);
 assert.ok(goalStatus(s).find(g=>g.id==='impatient').claimed);
});

test('dragon score grows with stage and level',()=>{
 const s=createState(T);assert.equal(dragonScore(s),2);
 const d=mature(s);assert.equal(dragonScore(s),10);d.level=3;assert.equal(dragonScore(s),30);
});

test('saves from before the garden migrate with empty fruit, tree and goals',()=>{
 const s=createState(T);mature(s);const raw=JSON.parse(JSON.stringify(s));
 delete raw.resources.fruit;delete raw.tree;delete raw.fruitHarvested;delete raw.hurried;delete raw.goalsClaimed;for(const d of raw.dragons)delete d.xp;
 const h=hydrate(raw,s.last);
 assert.equal(h.resources.fruit,0);assert.deepEqual(h.tree,{shift:null,ends:0});assert.deepEqual(h.goalsClaimed,[]);assert.equal(h.dragons[0].xp,0);
 assert.ok(validate(h));
});

test('damaged garden or goal data is rejected',()=>{
 const s=createState(T);
 assert.throws(()=>validate({...s,tree:{shift:'golden',ends:0}}),/сад або цілі/);
 assert.throws(()=>validate({...s,goalsClaimed:['nope']}),/сад або цілі/);
 assert.throws(()=>validate({...s,goalsClaimed:['impatient','impatient']}),/сад або цілі/);
});

import {speciesLocked,SPECIES as ALL_SPECIES,tick as tickState} from '../src/engine.js';
test('mist and crystal dragons unlock with the story and cannot be bought early',()=>{
 const s=createState(T);s.resources.coins=500;
 assert.ok(speciesLocked(s,'mist'));assert.ok(speciesLocked(s,'crystal'));
 assert.throws(()=>act(s,{type:'buyEgg',species:'mist'},T),/Серця долини/);
 assert.equal(s.resources.coins,500);
 s.restored=true;assert.equal(speciesLocked(s,'mist'),'');assert.ok(speciesLocked(s,'crystal'));
 s.locations.quarry.unlocked=true;assert.equal(speciesLocked(s,'crystal'),'');
});
test('a mist dragon grows fruit and a crystal dragon grows relics',()=>{
 const s=createState(T);const d=mature(s);d.species='mist';d.next=s.last;
 tickState(s,s.last);
 act(s,{type:'collect',id:d.id},s.last);
 assert.equal(s.resources.fruit,1);assert.equal(s.fruitHarvested,1);
 d.species='crystal';d.next=s.last;tickState(s,s.last);act(s,{type:'collect',id:d.id},s.last);
 assert.equal(s.resources.relics,1);d.species='moss';assert.ok(validate(s));
});
