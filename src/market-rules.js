/** Lucy's market rules: everything that decides a price lives in this one file.
 *
 * Lucy is the valley's merchant. She has her own wallet and her own shelves:
 * - She pays for goods from her wallet. When the wallet is empty she cannot buy: her shop is closed
 *   until someone spends coins in the valley (every coin a player spends lands in her wallet).
 * - The fuller her shelf, the less she pays: each unit in stock takes `drop` off the price,
 *   never below `floor`. An empty shelf pays 25% over `base`.
 * - Every `resellSeconds` she sells `resellUnits` of each good to the neighbours for `base` (berries go
 *   three at a time, crystals one), so flooded shelves drain, prices climb back and her wallet refills.
 * - In the eclipse (`market.panic`) the neighbours hoard crystals: she pays `panic` more for them.
 * The game (engine.js), the price tooltip and the week simulation (market-sim.js) all use these functions. */
// Percentages are whole per-mille (80 = 8%) so the price is exact integer arithmetic. The on-chain merchant
// (contracts/economy/src/market.rs) mirrors this file line for line; tests/parity checks both give the same prices.
export const MARKET={base:{berries:2,crystals:6},floor:{berries:1,crystals:2},drop:{berries:80,crystals:70},resellSeconds:20,resellUnits:{berries:3,crystals:1},panic:{berries:0,crystals:250},emptyShelf:250,startWallet:150};
const panicPerMille=(s,resource)=>1000+(s.market.panic?(MARKET.panic[resource]||0):0);
/** The price before the floor, in millionths of a coin: base × (1000 + 250 − drop × stock) × panic. */
function rawMicro(s,resource,stock){return MARKET.base[resource]*(1000+MARKET.emptyShelf-MARKET.drop[resource]*stock)*panicPerMille(s,resource);}

/** What Lucy pays for one unit right now (`extra` = units already in this sale). */
export function price(s,resource,extra=0){
 const m=MARKET,stock=(s.market.stock[resource]||0)+extra;
 // Round half up to whole coins (raw is in millionths), never below the floor.
 const raw=rawMicro(s,resource,stock);
 return Math.max(m.floor[resource],raw>0?Math.floor((raw+500000)/1e6):0);
}
/** How many units Lucy would take right now and what she would pay, unit by unit. */
export function quote(s,resource,qty=s.resources[resource]){
 let units=0,total=0;
 while(units<qty&&units<s.resources[resource]){const p=price(s,resource,units);if(total+p>s.market.wallet)break;total+=p;units++;}
 return {units,total,unitPrice:price(s,resource),limited:units<Math.min(qty,s.resources[resource])};
}
/** Carries out a quoted sale: goods go to Lucy's shelf, coins from her wallet to the seller. */
export function settleSale(s,resource,q){s.resources[resource]-=q.units;s.resources.coins+=q.total;s.market.wallet-=q.total;s.market.stock[resource]+=q.units;}
/** The shop is closed when Lucy cannot pay even the lowest price for anything. */
export const shopOpen=m=>Object.keys(MARKET.base).some(k=>m.wallet>=MARKET.floor[k]);
/** Neighbours buy from Lucy's shelves until `now`: stock drains one unit per good per round, the wallet refills.
 * Returns the goods that changed, so callers can note the new prices. */
export function resell(m,now){
 const step=MARKET.resellSeconds*1000,changed=[];
 if(now<m.resellAt)return changed;
 const rounds=Math.floor((now-m.resellAt)/step)+1;
 for(const k of Object.keys(m.stock)){const n=Math.min(m.stock[k],rounds*(MARKET.resellUnits[k]||1));if(!n)continue;m.stock[k]-=n;m.wallet+=n*MARKET.base[k];changed.push(k);}
 m.resellAt+=rounds*step;return changed;
}
/** Lucy explains her price in one line (shown next to it). */
export function marketMood(s,resource){
 const stock=s.market.stock[resource]||0,p=price(s,resource),base=MARKET.base[resource];
 if(s.market.wallet<p)return 'Гаманець порожній. Купи щось у мене — і я знову зможу платити.';
 if(s.market.panic&&resource==='crystals')return 'Затемнення! Усі скуповують кристали — плачу більше.';
 if(stock===0)return 'Полиця порожня — плачу найкраще.';
 if(p<=MARKET.floor[resource])return `На складі вже ${stock} — більше не треба. Зачекай, поки розпродам сусідам.`;
 if(p<base)return `На складі ${stock}. Ціна падає — сусіди не встигають купувати.`;
 return `На складі ${stock}. Поки що беру охоче.`;
}
/** The price worked out step by step, for the tooltip: [label, value] rows, the last one is the result. */
export function explainPrice(s,resource){
 const m=MARKET,stock=s.market.stock[resource]||0,base=m.base[resource],cut=m.drop[resource]*stock,panic=panicPerMille(s,resource),raw=rawMicro(s,resource,stock)/1e6,p=price(s,resource);
 const pct=n=>`${n/10}%`,factor=(1000+m.emptyShelf-cut)*panic/1e6;
 return [
  ['Базова ціна',`${base}`],
  ['Порожня полиця',`+${pct(m.emptyShelf)}`],
  [`На складі ${stock}`,stock?`−${stock} × ${pct(m.drop[resource])} = −${pct(cut)}`:'0'],
  ...(panic>1000?[['Затемнення: паніка',`+${pct(panic-1000)}`]]:[]),
  ['Розрахунок',`${base} × ${factor.toFixed(2)} = ${raw.toFixed(1)}`],
  ['Не менше ніж',`${m.floor[resource]}`],
  [`Гаманець Люсі`,s.market.wallet<p?`${s.market.wallet} — не вистачає`:`${s.market.wallet}`],
  ['Платить за 1',`${p}`]
 ];
}
