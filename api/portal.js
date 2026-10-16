import { Readable } from 'node:stream';
import { getFirebase } from '../server/firebase.mjs';
import { createRepository } from '../server/repository.mjs';
import { rateLimit } from '../server/limits.mjs';
import { uploadImage } from '../server/uploads.mjs';
import { createHandler } from '../server/handler.mjs';
import { errorResponse } from '../server/security/errors.mjs';
const handle=createHandler({getServices(){const {auth,db,bucket}=getFirebase();return {auth,repo:createRepository(db),upload:body=>uploadImage(bucket,body)};},limit:rateLimit,production:process.env.VERCEL==='1',siteOrigin:process.env.SITE_ORIGIN||'https://softwarewebsite-brown.vercel.app'});
export default async function handler(req,res){
 let result;
 try{
  const headers=new Headers();for(const [key,value]of Object.entries(req.headers))if(value!==undefined)headers.set(key,Array.isArray(value)?value.join(','):value);
  const init={method:req.method,headers};
  if(!['GET','HEAD'].includes(req.method)){
   init.body=req.body===undefined?Readable.toWeb(req):Buffer.isBuffer(req.body)||typeof req.body==='string'?req.body:JSON.stringify(req.body);init.duplex='half';
  }
  result=await handle(new Request(new URL(req.url,'https://softwarewebsite-brown.vercel.app'),init));
 }catch(error){result=errorResponse(error);}
 res.statusCode=result.status;for(const[key,value]of result.headers)res.setHeader(key,value);res.end(await result.text());
}
