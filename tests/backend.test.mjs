import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHandler} from '../server/handler.mjs';
import {createLimiter} from '../server/limits.mjs';
import {RequestError} from '../server/security/errors.mjs';
import {validateContent,validateSettings,imageURL,validateAlumni} from '../server/schema.mjs';
import {normalizeImage} from '../server/uploads.mjs';
import sharp from 'sharp';
const project='softwarewebsite-861b4',token='abc.def.ghi',uid='student-1';
function setup({role='member',verified=true,limiter=async()=>{}}={}){
 const calls=[];
 const repo=new Proxy({}, {get(_,name){return async(...args)=>{calls.push({name,args});return name==='settings'?{data:null,version:0}:{items:[],nextCursor:null};};}});
 const auth={verifyIdToken:async()=>({uid,aud:project,iss:'https://securetoken.google.com/'+project,email_verified:verified}),getUser:async()=>({uid,emailVerified:verified,customClaims:{role}})};
 const handle=createHandler({getServices:()=>({auth,repo,upload:async()=>({url:'photo'})}),limit:limiter,siteOrigin:'https://society.example'});
 return {handle,calls};
}
function request(action,{method='GET',body,auth=true,kind,origin,key='1234567890abcdef'}={}){
 const q=new URLSearchParams({action});if(kind)q.set('kind',kind);
 return new Request('https://society.example/api/portal?'+q,{method,headers:{...(auth?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{}),...(origin?{Origin:origin}:{}),'Idempotency-Key':key},body:body?JSON.stringify(body):undefined});
}
test('public endpoint only invokes published bounded content query and has cache headers',async()=>{
 const{handle,calls}=setup();const response=await handle(request('public',{auth:false,kind:'events'}));assert.equal(response.status,200);assert.equal(calls[0].name,'content');assert.equal(calls[0].args[2],true);assert.match(response.headers.get('cache-control'),/s-maxage=10/);
});
test('members cannot write editorial content or read private inbox',async()=>{
 const{handle,calls}=setup();assert.equal((await handle(request('list',{kind:'events'}))).status,403);assert.equal((await handle(request('inbox'))).status,403);assert.equal(calls.length,0);
});
test('editors cannot change global settings or review private submissions',async()=>{
 const{handle}=setup({role:'editor'});assert.equal((await handle(request('settings-read'))).status,403);assert.equal((await handle(request('inbox'))).status,403);
});
test('anonymous and unverified users cannot submit',async()=>{
 assert.equal((await setup().handle(request('submission',{kind:'contact',method:'POST',auth:false,body:{}}))).status,401);
 assert.equal((await setup({verified:false}).handle(request('submission',{kind:'contact',method:'POST',body:{}}))).status,403);
});
test('writes reject foreign origins, wrong methods and role injection',async()=>{
 const{handle,calls}=setup({role:'admin'});
 assert.equal((await handle(request('settings',{method:'POST',origin:'https://evil.example',body:{}}))).status,403);
 assert.equal((await handle(request('content'))).status,405);
 const body={category:'general',message:'This is useful feedback.',role:'admin'};
 assert.equal((await handle(request('submission',{method:'POST',kind:'suggestion',body}))).status,400);assert.equal(calls.length,0);
});
test('valid submission forwards trusted UID and key only after validation',async()=>{
 const{handle,calls}=setup();const response=await handle(request('submission',{method:'POST',kind:'suggestion',body:{category:'general',email:'member@example.com',message:'This is useful feedback.'}}));
 assert.equal(response.status,200);assert.equal(calls[0].args[0],uid);assert.equal(calls[0].args[3],'1234567890abcdef');assert.match(response.headers.get('cache-control'),/no-store/);
});
test('limiter outages fail closed before database or auth work',async()=>{
 let reached=false;const handle=createHandler({getServices:()=>{reached=true;},limit:async()=>{throw new RequestError(503,'limiter_unavailable','Unavailable');}});
 assert.equal((await handle(request('public'))).status,503);assert.equal(reached,false);
});
test('Redis limiter rejects malformed results, network failures and missing config',async()=>{
 for(const fetcher of [async()=>{throw Error('secret');},async()=>Response.json({result:null}),async()=>Response.json({result:[1,-1]})])await assert.rejects(createLimiter({url:'https://redis.example',token:'test',fetcher})('a',5,60),e=>e.status===503);
 await assert.rejects(createLimiter({})('a',1,60),e=>e.status===503);
});
test('atomic Redis count returns Retry-After when quota is exceeded',async()=>{
 let command;const limit=createLimiter({url:'https://redis.example',token:'test',fetcher:async(_,init)=>{command=JSON.parse(init.body);return Response.json({result:[6,42]});}});
 const {handle}=setup({limiter:limit});const response=await handle(request('public')); // ingress max 600 so explicitly test limit below
 assert.equal(response.status,200);await assert.rejects(limit('user',5,60),e=>e.status===429&&e.retryAfter===42);assert.equal(command[0],'EVAL');
 const {handle:h}=setup({limiter:async()=>{const e=new RequestError(429,'rate_limited','Wait');e.retryAfter=42;throw e;}});assert.equal((await h(request('public'))).headers.get('retry-after'),'42');
});
test('URL validators reject executable, credential-bearing and external-bucket URLs',()=>{
 for(const url of ['javascript:alert(1)','data:image/svg+xml,x','https://evil.example/x','https://user@images.unsplash.com/x','https://firebasestorage.googleapis.com/v0/b/other/o/photo'])assert.throws(()=>imageURL(url));
 assert.equal(imageURL('https://images.unsplash.com/photo'), 'https://images.unsplash.com/photo');
});
test('schemas reject impossible dates, unexpected fields, consent bypass and huge text',()=>{
 assert.throws(()=>validateContent({kind:'events',status:'published',data:{title:'Event',date:'2026-02-31'}}));
 assert.throws(()=>validateContent({kind:'notices',status:'published',data:{title:'A',ownerId:'attacker'}}));
 assert.throws(()=>validateContent({kind:'notices',status:'published',data:{title:'A',description:'x'.repeat(4001)}}));
 assert.throws(()=>validateAlumni({name:'A',batch:'2026',role:'Developer',linkedin:'',consent:false}));
 assert.throws(()=>validateSettings({photos:{},currentSession:'2026-2027'}));
});
test('upload decoder rejects SVG, invalid base64 and strips metadata by re-encoding WebP',async()=>{
 await assert.rejects(normalizeImage({base64:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>').toString('base64')}));
 await assert.rejects(normalizeImage({base64:'not base64!'}));
 const png=await sharp({create:{width:40,height:20,channels:3,background:'#003366'}}).png().toBuffer();const output=await normalizeImage({base64:png.toString('base64')});const metadata=await sharp(output).metadata();assert.equal(metadata.format,'webp');assert.equal(metadata.exif,undefined);
});
