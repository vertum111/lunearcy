import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';

test('a beginner who spends starting coins on food recovers chapter one through barter after reload',t=>{
 const start=5_000_000;let s=E.createState(start),done=null,bartered=0;
 // A plausible costly mistake through public actions, not a resource fixture.
 for(let n=0;n<4;n++)E.act(s,{type:'buyFood'},start);
 assert.equal(s.resources.coins,10);
 const afford=cost=>Object.entries(cost).every(([k,n])=>s.resources[k]>=n);
 for(let sec=0;sec<=900;sec+=5){
  const now=start+sec*1000,act=a=>E.act(s,a,now);E.tick(s,now);
  if(now>=s.forageAt)act({type:'forage'});
  for(const d of s.dragons){
   if(d.stage==='egg'&&now>=d.hatchAt)act({type:'hatch',id:d.id});
   while(d.stage==='baby'&&afford({berries:2}))act({type:'feed',id:d.id});
   if(d.ready&&!s.expedition?.team.includes(d.id))act({type:'collect',id:d.id});
  }
  for(const species of ['ember','stone'])if(!s.dragons.some(d=>d.species===species)&&s.resources.berries>=E.BERRY_EGG_COST[species]+6){act({type:'buyEgg',species,payment:'berries'});bartered++;}
  if(new Set(s.dragons.filter(d=>d.stage==='adult').map(d=>d.species)).size===3){
   if(!s.crafted&&afford({embers:2,ore:2}))act({type:'craft'});
   if(s.crafted&&!s.expedition&&E.phase(s,now).red&&afford({berries:3}))act({type:'expedition'});
   if(s.expedition&&now>=s.expedition.ends)act({type:'claim'});
   if(s.crafted&&s.expeditions&&afford({embers:4,ore:4,relics:6})){act({type:'restore'});done=sec;break;}
  }
  if(sec%30===0)s=E.hydrate(JSON.parse(JSON.stringify(s)),now);
  assert.equal(E.validate(s),true);
 }
 assert.equal(bartered,2);assert.ok(s.restored,'no coin purchases or merchant grants should be needed for recovery');assert.ok(done<=900);
 assert.equal(s.trades,0);assert.equal(s.phaseOverride,null);t.diagnostic(`Food mistake recovered at ${done}s with ${s.expeditions} natural-phase expeditions.`);
});
