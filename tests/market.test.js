import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import * as R from '../src/market-rules.js';
import {simulateWeek} from '../src/market-sim.js';
const T=1_000_000;

test('the game prices goods with the rules file',()=>{
 assert.equal(E.MARKET,R.MARKET);assert.equal(E.price,R.price);
 const s=E.createState(T);s.market.stock.berries=5;
 assert.equal(E.price(s,'berries'),R.price(s,'berries'));
});

test('the price tooltip ends on the price Lucy actually pays',()=>{
 const s=E.createState(T);
 for(const stock of [0,3,12,40]){s.market.stock.crystals=stock;const rows=E.explainPrice(s,'crystals');assert.equal(rows.at(-1)[1],String(E.price(s,'crystals')));}
 s.market.wallet=0;assert.match(E.explainPrice(s,'berries').find(r=>r[0]==='Гаманець Люсі')[1],/не вистачає/);
});

test('the week simulation is repeatable and covers seven days',()=>{
 const a=simulateWeek(),b=simulateWeek();
 assert.deepEqual(a,b);
 assert.equal(a.samples.at(-1).t,7*86400000);assert.equal(a.samples.length,7*48+1);
});

test('in the simulated week a flood makes goods cheap and an empty wallet closes the shop until someone spends',()=>{
 const {samples,events}=simulateWeek();
 assert.ok(samples.some(s=>s.berries===R.MARKET.floor.berries),'berries hit the floor');
 assert.ok(samples.some(s=>s.crystals===R.MARKET.floor.crystals),'crystals hit the floor');
 assert.ok(samples.some(s=>s.crystals>R.MARKET.base.crystals),'prices recover above base');
 const closed=events.findIndex(e=>e.kind==='closed'),open=events.findIndex((e,i)=>i>closed&&e.kind==='open');
 assert.ok(closed>=0&&open>closed,'the shop closes and reopens');
 assert.ok(events.slice(closed,open).some(e=>e.kind==='invest'),'it reopens because someone spent coins');
 assert.ok(samples.every(s=>s.wallet>=0&&s.stockBerries>=0&&s.stockCrystals>=0));
});

test('neighbours buy berries three at a time and crystals one at a time',()=>{
 const s=E.createState(T);s.market.stock={berries:10,crystals:10};const w=s.market.wallet;
 E.tick(s,s.market.resellAt);assert.equal(s.market.stock.berries,7);assert.equal(s.market.stock.crystals,9);
 assert.equal(s.market.wallet,w+3*R.MARKET.base.berries+R.MARKET.base.crystals);
});
