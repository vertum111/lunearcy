import test from 'node:test';
import assert from 'node:assert/strict';
import {isLoopbackRequest,registrationInput,middleware} from './bridge.mjs';
test('loopback bridge rejects remote addresses, hostile hosts and cross-site origins',()=>{
 const req={socket:{remoteAddress:'127.0.0.1'},headers:{host:'127.0.0.1:5180',origin:'http://127.0.0.1:5180'}};
 assert.equal(isLoopbackRequest(req),true);
 assert.equal(isLoopbackRequest({...req,socket:{remoteAddress:'192.168.1.1'}}),false);
 assert.equal(isLoopbackRequest({...req,headers:{host:'evil.example'}}),false);
 assert.equal(isLoopbackRequest({...req,headers:{host:'localhost:5180',origin:'https://evil.example'}}),false);
});
test('registration validates and bounds all caller-controlled metadata',()=>{
 assert.deepEqual(registrationInput({species:'moss',name:'  Листочок  ',localId:1}),{species:'moss',name:'Листочок',localId:'1'});
 for(const input of [{species:'__proto__',name:'Leaf',localId:1},{species:'moss',name:'<img>',localId:1},{species:'moss',name:'Leaf',localId:'../keys'},{species:'moss',name:'x'.repeat(21),localId:1}])assert.throws(()=>registrationInput(input));
});
test('unrelated middleware paths pass through and remote bridge calls reject before loading keys',async()=>{
 let passed=false;await middleware({url:'/other'},null,()=>{passed=true;});assert.equal(passed,true);
 const response={setHeader(){},end(body){this.body=JSON.parse(body);}};
 await middleware({url:'/api/near/status',method:'GET',socket:{remoteAddress:'10.0.0.1'},headers:{host:'localhost'}},response,()=>assert.fail());
 assert.equal(response.statusCode,403);
});
test('an in-flight request holds the mutex before asynchronous body parsing',async()=>{
 let release;const blocked=new Promise(resolve=>{release=resolve;});
 const request={url:'/api/near/register',method:'POST',socket:{remoteAddress:'127.0.0.1'},headers:{host:'localhost:5180','content-type':'application/json'},async *[Symbol.asyncIterator](){await blocked;yield Buffer.from('{');}};
 const response=()=>({setHeader(){},end(value){this.body=JSON.parse(value);}});
 const firstResponse=response(),pending=middleware(request,firstResponse,()=>assert.fail());
 const secondResponse=response();await middleware(request,secondResponse,()=>assert.fail());
 assert.equal(secondResponse.statusCode,409);
 release();await pending;assert.equal(firstResponse.statusCode,400);
});
