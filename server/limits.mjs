import { createHash } from 'node:crypto';
import { RequestError } from './security/errors.mjs';
const script=`local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return {n,redis.call('TTL',KEYS[1])}`;
export function createLimiter({url,token,namespace='society:production',fetcher=fetch}){
 return async function limit(key,max,seconds){
  if(!url||!token)throw new RequestError(503,'limiter_unavailable','Service is temporarily unavailable. Please try again later.');
  let result;
  try{
   const response=await fetcher(url,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(['EVAL',script,'1',namespace+':'+createHash('sha256').update(key).digest('hex'),String(seconds)]),signal:AbortSignal.timeout(2500)});
   if(!response.ok)throw new Error(); const value=await response.json();result=value.result;
   if(value.error||!Array.isArray(result)||result.length!==2||!Number.isFinite(result[0])||!Number.isFinite(result[1])||result[0]<1||result[1]<0)throw new Error();
  }catch{throw new RequestError(503,'limiter_unavailable','Service is temporarily unavailable. Please try again later.');}
  if(result[0]>max){const e=new RequestError(429,'rate_limited','Too many requests. Please wait before trying again.');e.retryAfter=Math.max(1,result[1]);throw e;}
 };
}
export const rateLimit=createLimiter({url:process.env.UPSTASH_REDIS_REST_URL,token:process.env.UPSTASH_REDIS_REST_TOKEN,namespace:`society:${process.env.VERCEL_ENV||'development'}`});
