import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,expeditionReward,act,HATCH_MS} from '../src/engine.js';

test('expedition preview matches departure snapshot at level3/4/5 and caps advanced contribution at three',()=>{
 const now=1_000_000,s=createState(now);
 act(s,{type:'hatch',id:1},now+HATCH_MS);
 for(let i=0;i<3;i++)act(s,{type:'feed',id:1},now+HATCH_MS);
 // Focused reward boundary fixture; resources are not a progression simulation.
 act(s,{type:'forage'},now+HATCH_MS);
 s.crafted=3;s.phaseOverride={red:true,until:now+100_000};
 for(const [level,expected] of [[3,6],[4,7],[5,8]]){
  s.dragons[0].level=level;assert.equal(expeditionReward(s,[1]),expected);
  act(s,{type:'expedition',team:[1]},now+HATCH_MS);
  assert.equal(s.expedition.reward,expected);s.expedition=null;
 }
 s.dragons.push({...s.dragons[0],id:2,slot:1,level:5},{...s.dragons[0],id:3,slot:2,level:5});
 assert.equal(expeditionReward(s,[1,2]),10,'two level5 dragons add only capped3 advanced points');
 assert.equal(expeditionReward(s,[1,2,3]),11,'base team bonus caps at3 independently');
 s.locations.ruins.unlocked=true;assert.equal(expeditionReward(s,[1,2,3]),12,'ruins bonus adds exactly one');
});
