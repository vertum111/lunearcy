/** Standalone gas sponsor (e.g. on Render, see render.yaml). The game's own deployment uses the same code as a
 * Netlify function (netlify/functions/sponsor.mjs). Env: see sponsor-core.mjs, plus ALLOWED_ORIGINS and PORT. */
import http from 'node:http';
import {createSponsor} from './sponsor-core.mjs';

const sponsor=createSponsor(process.env);
const ORIGINS=(process.env.ALLOWED_ORIGINS||'http://127.0.0.1:5180,http://localhost:5180').split(',').map(s=>s.trim()).filter(Boolean);
const cors=origin=>ORIGINS.includes(origin)?{'access-control-allow-origin':origin,'access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'content-type','vary':'origin'}:{};
const send=(res,{status,body},origin)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...cors(origin)});res.end(JSON.stringify(body));};
async function read(req){let t='';for await(const c of req){t+=c;if(t.length>4096)throw Error('Request too large');}return JSON.parse(t||'{}');}

http.createServer(async(req,res)=>{
 const origin=req.headers.origin||'',route=(req.url||'').split('?')[0];
 try{
  if(req.method==='OPTIONS')return send(res,{status:204,body:{}},origin);
  if(req.method==='GET'&&route==='/health')return send(res,await sponsor.health(),origin);
  if(req.method==='POST'&&route==='/fund'){
   if(origin&&!ORIGINS.includes(origin))return send(res,{status:403,body:{error:'Origin not allowed'}},origin);
   const ip=String(req.headers['x-forwarded-for']||req.socket.remoteAddress||'').split(',')[0].trim();
   return send(res,await sponsor.fund(await read(req),ip),origin);
  }
  send(res,{status:404,body:{error:'Not found'}},origin);
 }catch(e){send(res,{status:400,body:{error:String(e.message).slice(0,300)}},origin);}
}).listen(Number(process.env.PORT||8787),()=>console.log(`Lunearcy sponsor on :${process.env.PORT||8787}`));
