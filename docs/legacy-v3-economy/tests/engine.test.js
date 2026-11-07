import test from 'node:test';
import assert from 'node:assert/strict';
import {createState, act, tick, phase, SPECIES, PHASE_MS, HATCH_MS, BERRY_EGG_COST, hydrate, objective} from '../src/engine.js';

const T = 1_000_000;
function adult(s, id = 1, at = T + HATCH_MS) {
  act(s, {type:'hatch', id}, at);
  for (let i=0; i<3; i++) act(s, {type:'feed', id}, at);
  return s.dragons.find(d => d.id === id);
}
function resources(s) { return {...s.resources}; }

test('new states have separate mutable inventory and dragons', () => {
  const a=createState(T), b=createState(T);
  a.resources.coins=0; a.dragons[0].feeds=99;
  assert.equal(b.resources.coins,90); assert.equal(b.dragons[0].feeds,0);
});

test('hatching observes the boundary, cannot be repeated, and feeding consumes exactly six berries', () => {
  const s=createState(T);
  assert.throws(()=>act(s,{type:'hatch',id:1},T+HATCH_MS-1));
  const d=adult(s);
  assert.equal(d.stage,'adult'); assert.equal(s.resources.berries,6);
  assert.throws(()=>act(s,{type:'hatch',id:1},T+HATCH_MS));
  assert.throws(()=>act(s,{type:'feed',id:1},T+HATCH_MS));
  assert.equal(s.resources.berries,6);
});

test('production pays only for completed cycles and collection cannot be repeated', () => {
  const s=createState(T), d=adult(s), due=d.next;
  tick(s,due-1); assert.equal(d.ready,0);
  tick(s,due); assert.equal(d.ready,1);
  const before=s.resources.berries;
  act(s,{type:'collect',id:1},due);
  assert.equal(s.resources.berries,before+SPECIES.moss.output);
  assert.throws(()=>act(s,{type:'collect',id:1},due));
  assert.equal(s.resources.berries,before+SPECIES.moss.output);
});

test('long offline period caps production storage at five cycles', () => {
  const s=createState(T), d=adult(s);
  tick(s,T+10_000_000);
  assert.equal(d.ready,5);
  const before=s.resources.berries;
  act(s,{type:'collect',id:1},s.last);
  assert.equal(s.resources.berries-before,15);
  tick(s,s.last+1); assert.equal(d.ready,0);
});

test('failed multi-resource spending is atomic and never makes coins negative', () => {
  const s=createState(T); adult(s);
  s.resources.coins=100; s.resources.berries=0;
  const before=resources(s);
  assert.throws(()=>act(s,{type:'upgrade',id:1},s.last));
  assert.deepEqual(s.resources,before); assert.equal(s.dragons[0].level,1);
  s.resources.coins=7;
  assert.throws(()=>act(s,{type:'buyFood'},s.last));
  assert.equal(s.resources.coins,7);
});

test('egg prices, uniqueness and capacity reject purchases without charging', () => {
  const s=createState(T);
  act(s,{type:'buyEgg',species:'ember'},T);
  assert.equal(s.resources.coins,40); assert.equal(s.dragons.length,2);
  const before=resources(s);
  assert.throws(()=>act(s,{type:'buyEgg',species:'stone'},T));
  assert.throws(()=>act(s,{type:'buyEgg',species:'moss'},T));
  assert.throws(()=>act(s,{type:'buyEgg',species:'unknown'},T));
  assert.deepEqual(s.resources,before);
  s.resources.berries=BERRY_EGG_COST.stone;
  act(s,{type:'buyEgg',species:'stone',payment:'berries'},T);
  const full=resources(s);
  assert.throws(()=>act(s,{type:'buyEgg',species:'moss'},T));
  assert.deepEqual(s.resources,full); assert.equal(s.dragons.length,3);
  assert.equal(new Set(s.dragons.map(d=>d.id)).size,3);
});

test('all NPC orders are finite and payouts match the exact merchant budget', () => {
  const s=createState(T);
  Object.assign(s.resources,{berries:100,embers:100,ore:100});
  const before=s.resources.coins;
  for(const o of s.orders) for(let i=0;i<3;i++) act(s,{type:'sell',id:o.id},T);
  assert.equal(s.resources.coins-before,234); assert.equal(s.merchantBudget,0);
  for(const o of s.orders) {
    assert.equal(o.left,0);
    assert.throws(()=>act(s,{type:'sell',id:o.id},T));
  }
  assert.equal(s.resources.coins-before,234);
  assert.deepEqual([s.resources.berries,s.resources.embers,s.resources.ore],[82,88,88]);
});

test('insufficient merchant budget or goods rejects trade without partial debit', () => {
  const s=createState(T); s.merchantBudget=17;
  const before=resources(s);
  assert.throws(()=>act(s,{type:'sell',id:1},T));
  assert.deepEqual(s.resources,before); assert.equal(s.orders[0].left,3);
  s.merchantBudget=234; s.resources.berries=5;
  assert.throws(()=>act(s,{type:'sell',id:1},T));
  assert.equal(s.merchantBudget,234); assert.equal(s.resources.berries,5);
});

test('automatic phases alternate at exact boundaries and demo override expires', () => {
  const s=createState(T);
  assert.equal(phase(s,T).red,false);
  assert.equal(phase(s,T+PHASE_MS-1).red,false);
  assert.equal(phase(s,T+PHASE_MS).red,true);
  assert.equal(phase(s,T+2*PHASE_MS).red,false);
  act(s,{type:'demoPhase'},T);
  assert.equal(phase(s,T).red,true);
  tick(s,T+60_000);
  assert.equal(s.phaseOverride,null); assert.equal(phase(s,s.last).red,false);
});

test('expeditions require eclipse, an adult and food; no overlapping trips', () => {
  const s=createState(T);
  assert.throws(()=>act(s,{type:'expedition'},T));
  act(s,{type:'demoPhase'},T);
  assert.throws(()=>act(s,{type:'expedition'},T));
  adult(s);
  const before=s.resources.berries;
  act(s,{type:'expedition'},s.last);
  assert.equal(s.resources.berries,before-3);
  assert.deepEqual(s.expedition.team,[1]);
  assert.throws(()=>act(s,{type:'expedition'},s.last));
  assert.equal(s.resources.berries,before-3);
});

test('trip stops new production, survives world transition, and reward can be claimed only once', () => {
  const s=createState(T), d=adult(s);
  const depart=T+2*PHASE_MS-10_000;
  act(s,{type:'expedition'},depart);
  const readyAtDeparture=d.ready;
  const ends=s.expedition.ends;
  assert.throws(()=>act(s,{type:'claim'},ends-1));
  tick(s,ends);
  assert.equal(phase(s,ends).red,false);
  assert.equal(d.ready,readyAtDeparture);
  const before=resources(s), reward=s.expedition.reward;
  act(s,{type:'claim'},ends);
  assert.equal(s.resources.coins,before.coins+15);
  assert.equal(s.resources.relics,before.relics+reward);
  assert.equal(s.expeditions,1); assert.equal(s.expedition,null);
  assert.throws(()=>act(s,{type:'claim'},ends));
  assert.equal(s.resources.coins,before.coins+15);
  assert.equal(d.next,ends+SPECIES.moss.cycle*1000);
});

test('crafting consumes both resources and snapshots the reward at expedition departure', () => {
  const s=createState(T); adult(s);
  Object.assign(s.resources,{embers:4,ore:4});
  act(s,{type:'craft'},s.last);
  assert.equal(s.crafted,1); assert.equal(s.resources.embers,2); assert.equal(s.resources.ore,2);
  act(s,{type:'demoPhase'},s.last);
  act(s,{type:'expedition'},s.last);
  const reward=s.expedition.reward;
  act(s,{type:'craft'},s.last);
  assert.equal(s.crafted,2); assert.equal(s.expedition.reward,reward);
});

test('JSON reload preserves timers, production, finite orders and expedition reward exactly', () => {
  const s=createState(T); adult(s);
  act(s,{type:'sell',id:1},s.last);
  act(s,{type:'buyFood'},s.last);
  act(s,{type:'demoPhase'},s.last);
  act(s,{type:'expedition'},s.last);
  const reloaded=JSON.parse(JSON.stringify(s));
  const end=s.expedition.ends;
  act(s,{type:'claim'},end); act(reloaded,{type:'claim'},end);
  assert.deepEqual(reloaded,s);
  assert.throws(()=>act(reloaded,{type:'claim'},end));
});

test('tick is idempotent and cannot move its stored clock backwards', () => {
  const s=createState(T); adult(s);
  tick(s,T+100_000);
  const snapshot=JSON.parse(JSON.stringify(s));
  tick(s,T+100_000); assert.deepEqual(s,snapshot);
  tick(s,T); assert.deepEqual(s,snapshot);
});

test('foraging is free, time gated and recovers the starter-food hardlock', () => {
  const s=createState(T);
  act(s,{type:'sell',id:1},T); act(s,{type:'sell',id:1},T);
  act(s,{type:'buyEgg',species:'ember'},T); act(s,{type:'buyEgg',species:'stone'},T);
  assert.equal(s.resources.coins,16); assert.equal(s.resources.berries,0);
  act(s,{type:'hatch',id:1},T+HATCH_MS);
  assert.throws(()=>act(s,{type:'feed',id:1},s.last));
  act(s,{type:'forage'},s.last);
  assert.equal(s.resources.berries,3); assert.equal(s.resources.coins,16);
  assert.throws(()=>act(s,{type:'forage'},s.last+19_999));
  assert.equal(s.resources.berries,3);
  act(s,{type:'forage'},T+HATCH_MS+20_000);
  for(let i=0;i<3;i++)act(s,{type:'feed',id:1},s.last);
  assert.equal(s.dragons[0].stage,'adult');
  act(s,{type:'collect',id:1},s.dragons[0].next);
  assert.equal(s.resources.berries,3);
});

test('berry egg purchase consumes exact quoted food price and validates payment', () => {
  const s=createState(T); s.resources.berries=40;
  assert.throws(()=>act(s,{type:'buyEgg',species:'ember',payment:'free'},T));
  assert.equal(s.resources.berries,40); assert.equal(s.resources.coins,90);
  act(s,{type:'buyEgg',species:'ember',payment:'berries'},T);
  assert.equal(s.resources.berries,40-BERRY_EGG_COST.ember);
  assert.equal(s.resources.coins,90);
});

test('travel blocks both collecting stored yield and upgrading away dragons', () => {
  const s=createState(T), d=adult(s);
  tick(s,T+PHASE_MS);
  act(s,{type:'expedition',team:[1]},T+PHASE_MS);
  const before=resources(s), level=d.level, ready=d.ready;
  assert.ok(ready>0);
  assert.throws(()=>act(s,{type:'collect',id:1},s.last));
  assert.throws(()=>act(s,{type:'upgrade',id:1},s.last));
  assert.deepEqual(s.resources,before); assert.equal(d.level,level); assert.equal(d.ready,ready);
});

test('team validation rejects duplicate, unknown, baby or empty teams before charging', () => {
  const s=createState(T); adult(s);
  act(s,{type:'buyEgg',species:'ember'},s.last);
  const at=T+PHASE_MS, before=resources(s);
  for(const team of [[1,1],[999],[2],[], 'all']){
    assert.throws(()=>act(s,{type:'expedition',team},at));
    assert.deepEqual(s.resources,before); assert.equal(s.expedition,null);
  }
  const team=[1]; act(s,{type:'expedition',team},at); team.push(2);
  assert.deepEqual(s.expedition.team,[1]);
});

test('delving requires arrival, charges both ingredients once and extends return timer', () => {
  const s=createState(T); adult(s);
  Object.assign(s.resources,{embers:4,ore:4});
  act(s,{type:'expedition'},T+PHASE_MS);
  const at=s.expedition.ends, reward=s.expedition.reward;
  assert.throws(()=>act(s,{type:'delve'},at-1));
  assert.equal(s.resources.embers,4);
  act(s,{type:'delve'},at);
  assert.equal(s.resources.embers,2); assert.equal(s.resources.ore,2);
  assert.equal(s.expedition.reward,reward+3); assert.equal(s.expedition.ends,at+10_000);
  assert.throws(()=>act(s,{type:'claim'},at+9_999));
  assert.throws(()=>act(s,{type:'delve'},at+10_000));
  assert.equal(s.resources.embers,2);
  act(s,{type:'claim'},at+10_000);
  assert.equal(s.resources.relics,reward+3);
});

test('returning at first arrival is a valid alternative to delving', () => {
  const s=createState(T); adult(s);
  act(s,{type:'expedition'},T+PHASE_MS);
  const reward=s.expedition.reward, at=s.expedition.ends;
  act(s,{type:'claim'},at);
  assert.equal(s.resources.relics,reward); assert.equal(s.expedition,null);
  assert.throws(()=>act(s,{type:'delve'},at));
});

test('restoration rejects missing milestones and expansion is gated behind it', () => {
  const s=createState(T);
  const before=resources(s);
  assert.throws(()=>act(s,{type:'restore'},T));
  assert.throws(()=>act(s,{type:'expand'},T));
  assert.equal(s.restored,false); assert.equal(s.slots,3); assert.deepEqual(s.resources,before);
});

test('legacy migration preserves progress and adds new defaults without inventing wealth', () => {
  const raw=createState(T); raw.version=1;
  delete raw.forageAt; delete raw.restored; delete raw.trades; delete raw.collected;
  raw.orders[0].left=2;
  const old=JSON.parse(JSON.stringify(raw));
  const s=hydrate(raw,T);
  assert.equal(s.version,3); assert.equal(s.forageAt,0); assert.equal(s.restored,false);
  assert.equal(s.trades,1); assert.equal(s.collected,0);
  assert.deepEqual(s.resources,raw.resources); assert.deepEqual(raw,old);
  assert.throws(()=>hydrate({...raw,resources:{...raw.resources,coins:-1}},T));
  assert.throws(()=>hydrate({version:2},T));
});

test('fresh player completes the chapter using only legal earned resources and natural phases', (t) => {
  const s=createState(T);
  const actAt=(a,at)=>act(s,a,at);
  let finishedAt=null, didDelve=false;
  for(let seconds=0;seconds<=600;seconds++){
    const at=T+seconds*1000;
    tick(s,at);
    if(at>=s.forageAt)actAt({type:'forage'},at);
    for(const d of s.dragons){
      if(d.stage==='egg'&&at>=d.hatchAt)actAt({type:'hatch',id:d.id},at);
      while(d.stage==='baby'&&s.resources.berries>=2)actAt({type:'feed',id:d.id},at);
      if(d.stage==='adult'&&d.ready&&!s.expedition?.team.includes(d.id))actAt({type:'collect',id:d.id},at);
    }
    if(s.collected&&!s.trades&&s.resources.berries>=6)actAt({type:'sell',id:1},at);
    for(const species of ['ember','stone']) if(!s.dragons.some(d=>d.species===species)){
      if(s.resources.coins>=SPECIES[species].eggCost)actAt({type:'buyEgg',species},at);
      else if(s.resources.berries>=BERRY_EGG_COST[species])actAt({type:'buyEgg',species,payment:'berries'},at);
    }
    if(!s.crafted&&s.resources.embers>=2&&s.resources.ore>=2)actAt({type:'craft'},at);
    if(!s.expeditions&&!s.expedition&&s.crafted&&phase(s,at).red&&s.dragons.every(d=>d.stage==='adult')&&s.resources.berries>=3&&s.resources.embers>=2&&s.resources.ore>=2){
      const team=s.dragons.filter(d=>d.species!=='moss').map(d=>d.id);
      actAt({type:'expedition',team},at);
    }
    if(s.expedition&&at>=s.expedition.ends){
      if(!s.expedition.delved&&s.resources.embers>=2&&s.resources.ore>=2){actAt({type:'delve'},at);didDelve=true;}
      else if(s.expedition.delved)actAt({type:'claim'},at);
    }
    if(!s.restored&&s.crafted&&s.expeditions&&s.resources.embers>=4&&s.resources.ore>=4&&s.resources.relics>=6){
      const beforeRestore=resources(s);
      actAt({type:'restore'},at);
      assert.equal(s.resources.embers,beforeRestore.embers-4);
      assert.equal(s.resources.ore,beforeRestore.ore-4);
      assert.equal(s.resources.relics,beforeRestore.relics-6);
      assert.equal(s.resources.coins,beforeRestore.coins);
      finishedAt=seconds;break;
    }
    for(const n of Object.values(s.resources))assert.ok(n>=0&&Number.isFinite(n));
  }
  t.diagnostic(`Earned-resource progression finished in ${finishedAt} simulated seconds`);
  assert.ok(finishedAt!==null&&finishedAt<=600,'chapter must finish within ten minutes');
  assert.ok(didDelve,'simulation exercised the expedition decision');
  assert.equal(s.restored,true); assert.equal(s.slots,4);
  assert.equal(objective(s).chapter,2); assert.equal(objective(s).step,0);
  assert.equal(new Set(s.dragons.filter(d=>d.stage==='adult').map(d=>d.species)).size,3);
  assert.equal(s.phaseOverride,null,'no demo phase shortcut');
  const before=resources(s);
  assert.throws(()=>act(s,{type:'restore'},s.last));
  assert.deepEqual(s.resources,before);
  const restored=hydrate(JSON.parse(JSON.stringify(s)),s.last);
  assert.equal(restored.restored,true); assert.equal(objective(restored).chapter,2); assert.equal(objective(restored).step,0);
});
