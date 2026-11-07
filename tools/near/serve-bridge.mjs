import http from 'node:http';
import {middleware} from './bridge.mjs';
const port=Number(process.env.NEAR_BRIDGE_PORT||5181);
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid local port');
http.createServer((req,res)=>middleware(req,res,()=>{res.statusCode=404;res.end('Not found');})).listen(port,'127.0.0.1',()=>console.log(`Testnet demo bridge: http://127.0.0.1:${port}`));
