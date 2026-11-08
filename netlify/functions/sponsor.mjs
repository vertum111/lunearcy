// The gas sponsor as a Netlify function on the game's own domain (no cold-starting server, no CORS):
// GET /api/health, POST /api/fund. Logic and limits: server/sponsor-core.mjs.
// Env (Netlify site settings, Functions scope): SPONSOR_ACCOUNT_ID, SPONSOR_PRIVATE_KEY; CONTRACT_ID is optional.
import {createSponsor} from '../../server/sponsor-core.mjs';

let sponsor;
const json=(status,body)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});

export default async(req,context)=>{
 try{
  sponsor??=createSponsor({CONTRACT_ID:'lunearcy-mw6wrkww.testnet',...process.env});
  const route=new URL(req.url).pathname;
  if(req.method==='GET'&&route==='/api/health'){const r=await sponsor.health();return json(r.status,r.body);}
  if(req.method==='POST'&&route==='/api/fund'){
   const text=await req.text();if(text.length>4096)return json(413,{error:'Request too large'});
   const r=await sponsor.fund(JSON.parse(text||'{}'),context.ip||'');return json(r.status,r.body);
  }
  return json(404,{error:'Not found'});
 }catch(e){return json(400,{error:String(e.message).slice(0,300)});}
};
export const config={path:['/api/health','/api/fund']};
