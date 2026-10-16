import { createAuthorizer } from './security/authorize.mjs';
import { readJsonBody,validateContact,validateSuggestion } from './security/submissions.mjs';
import { errorResponse,RequestError } from './security/errors.mjs';
import { exact,identifier,version,validateContent,validateSettings,validateAlumni,invalid } from './schema.mjs';
import { kinds } from '../shared/content-schema.js';
const actions={'settings-read':'settings:write',me:'suggestion:submit',list:'content:write',content:'content:write',delete:'content:delete',settings:'settings:write',inbox:'inbox:read',moderate:'alumni:moderate',upload:'content:write',users:'users:manage','assign-role':'users:manage'};
// Assign a role to another user. Trusted admins only. Preserves existing custom claims
// (apart from role), revokes sessions to force re-sign-in, and never operates on the caller.
async function assignRole(auth,uid,role,actorUid){
 const user=await auth.getUser(uid);
 if(!user.emailVerified||user.disabled)throw new RequestError(400,'invalid_input','Target account must be enabled and email verified.');
 await auth.setCustomUserClaims(uid,{...user.customClaims,role});
 await auth.revokeRefreshTokens(uid);
 return {uid,role,actor:actorUid};
}
export function createHandler({getServices,limit,siteOrigin,production=false,uploadsEnabled=false}){
 return async request=>{
  try{
   const url=new URL(request.url),action=url.searchParams.get('action');
   if(!['GET','POST'].includes(request.method))return new Response(null,{status:405,headers:{Allow:'GET, POST','Cache-Control':'no-store'}});
   const reads=['public','me','list','inbox','settings-read','users'];
   if(![...reads,'content','delete','settings','submission','moderate','upload','assign-role'].includes(action))throw new RequestError(404,'not_found','Endpoint not found.');
   if((reads.includes(action)?'GET':'POST')!==request.method)return new Response(null,{status:405,headers:{Allow:reads.includes(action)?'GET':'POST','Cache-Control':'no-store'}});
   // Bearer authentication; reject cross-origin browser mutations. Non-browser clients still require valid tokens.
   if(request.method==='POST'&&request.headers.get('origin')&&request.headers.get('origin')!==siteOrigin)throw new RequestError(403,'origin_not_allowed','This origin cannot submit requests.');
   // Vercel overwrites this header at its ingress; never trust generic X-Forwarded-For.
   const ip=production?(request.headers.get('x-vercel-forwarded-for')||'unknown').split(',')[0].trim():'development';
   await limit('ingress:'+ip,600,60);
   const {auth,repo,upload}=getServices();
   if(action==='public'){
    const kind=url.searchParams.get('kind')||'settings';
    if(kind!=='settings'&&!kinds.includes(kind))throw invalid();
    const result=kind==='settings'?await repo.settings():await repo.content(kind,url.searchParams.get('cursor'),true);
    return Response.json(result,{headers:{'Cache-Control':'public, max-age=0, s-maxage=10'}});
   }
   const kind=url.searchParams.get('kind');
   const permission=action==='submission'?{contact:'contact:submit',suggestion:'suggestion:submit',alumni:'alumni:apply'}[kind]:actions[action];
   const user=await createAuthorizer({auth,projectId:'softwarewebsite-861b4'})(request,permission);
   await limit('user:'+user.uid+':'+action,action==='submission'?5:action==='upload'?10:60,action==='submission'?600:60);
   let result;
   if(action==='settings-read')result=await repo.settings();
   else if(action==='me')result={uid:user.uid,role:user.role,uploadsEnabled};
   else if(action==='list'){if(!kinds.includes(kind))throw invalid();result=await repo.content(kind,url.searchParams.get('cursor'),false);}
   else if(action==='inbox')result=await repo.inbox(url.searchParams.get('cursor'));
   else if(action==='users'){const list=await auth.listUsers(url.searchParams.get('pageToken')||undefined,100);result={items:list.users.map(u=>({uid:u.uid,email:u.email,emailVerified:u.emailVerified,disabled:u.disabled,role:u.customClaims?.role||'member'})),nextPageToken:list.pageToken||null};}
   else{
    const body=await readJsonBody(request,action==='upload'?2900000:24000);
    if(action==='content'){
     exact(body,['id','version','content']);result=await repo.saveContent(user.uid,{id:body.id?identifier(body.id):null,version:version(body.version),content:validateContent(body.content)});
    }else if(action==='delete'){
     exact(body,['id','version','permanent']);if(typeof body.permanent!=='boolean')throw invalid();result=await repo.deleteContent(user.uid,{id:identifier(body.id),version:version(body.version),permanent:body.permanent});
    }else if(action==='settings'){
     exact(body,['version','data']);result=await repo.saveSettings(user.uid,{version:version(body.version),data:validateSettings(body.data)});
    }else if(action==='submission'){
     const key=request.headers.get('idempotency-key');if(!key||!/^[a-zA-Z0-9_-]{16,80}$/.test(key))throw invalid();
     const data=kind==='contact'?validateContact(body):kind==='suggestion'?validateSuggestion(body):validateAlumni(body);
     result=await repo.submit(user.uid,kind,data,key);
    }else if(action==='moderate'){
     exact(body,['id','status','version']);if(!['approved','rejected','reviewed'].includes(body.status))throw invalid();
     result=await repo.moderate(user.uid,identifier(body.id),body.status,version(body.version));
    }else if(action==='assign-role'){
     exact(body,['uid','role']);if(!['member','editor','admin'].includes(body.role))throw invalid();
     if(body.uid===user.uid)throw new RequestError(400,'invalid_input','You cannot change your own role.');
     result=await assignRole(auth,body.uid,body.role,user.uid);
    }else if(action==='upload')result=await upload(body,user.uid);
   }
   return Response.json(result,{headers:{'Cache-Control':'private, no-store'}});
  }catch(error){
   const response=errorResponse(error);if(error.retryAfter)response.headers.set('Retry-After',String(error.retryAfter));
   // Do not log submitted data or credentials.
   if(!(error instanceof RequestError))console.error('portal_request_failed',error?.code||'unknown');
   return response;
  }
 };
}
