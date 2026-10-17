import { createAuthorizer } from './security/authorize.mjs';
import { readJsonBody,validateContact,validateSuggestion } from './security/submissions.mjs';
import { errorResponse,RequestError } from './security/errors.mjs';
import { exact,identifier,version,validateContent,validateSettings,validateAlumni,invalid } from './schema.mjs';
import { kinds } from '../shared/content-schema.js';
const actions={'settings-read':'settings:write',me:'suggestion:submit',list:'content:write',content:'content:write',delete:'content:delete',settings:'settings:write',inbox:'inbox:read',moderate:'alumni:moderate',upload:'content:write',users:'users:manage','assign-role':'users:manage'};
// Assign a role to another user. Trusted admins only. Preserves existing custom claims
// (apart from role), revokes sessions to force re-sign-in, and never operates on the caller.
async function assignRole(auth,uid,role,actorUid){
 // getUser can return customClaims as null/undefined for users who have no
 // claims yet — guard the spread so we don't crash with a bare 500.
 let user;
 try{user=await auth.getUser(uid);}
 catch(e){throw new RequestError(503,'auth_lookup_failed','Could not look up that account. The Identity Toolkit may be temporarily unavailable.');}
 if(!user.emailVerified||user.disabled)throw new RequestError(400,'invalid_input','Target account must be enabled and email verified.');
 const existingClaims=user.customClaims&&typeof user.customClaims==='object'?user.customClaims:{};
 // setCustomUserClaims needs the 'Firebase Authentication Admin' (or Identity
 // Toolkit Admin) IAM role on the service account. Wrap it so a permission
 // gap surfaces a clear, actionable 503 instead of a bare 500.
 try{
  await auth.setCustomUserClaims(uid,{...existingClaims,role});
 }catch(e){
  throw new RequestError(503,'auth_permission_failed','The server account is not allowed to change roles. Grant the service account the Firebase Authentication Admin (or Identity Toolkit Admin) IAM role in Google Cloud IAM, then try again. Note: Firebase Console > Users and permissions only controls who can open the Firebase Console — it does NOT grant the backend service account any permissions.');
 }
 // revokeRefreshTokens is best-effort: if it fails (e.g. service account lacks
 // the additional 'Service Account Token Creator' permission), the role is
 // still set — the user just has to sign out manually instead of being forced.
 // Don't fail the whole request over it.
 try{await auth.revokeRefreshTokens(uid);}catch(e){/* best-effort — role was set */}
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
   // Bearer authentication; reject cross-origin browser mutations.
   // Allow the configured site origin AND any Vercel deployment URL for the
   // same project (preview deployments, etc.) so the check doesn't break
   // when the URL changes.
   if(request.method==='POST'){
    const origin=request.headers.get('origin');
    if(origin){
     let allowed=false;
     // Exact match
     if(origin===siteOrigin)allowed=true;
     // Match without trailing slash
     if(origin.replace(/\/$/,'')===siteOrigin.replace(/\/$/,''))allowed=true;
     // Allow any Vercel deployment for this project (softwarewebsite-*.vercel.app)
     try{const o=new URL(origin);if(o.hostname.endsWith('.vercel.app')&&o.hostname.startsWith('softwarewebsite'))allowed=true;}catch{}
     // Allow localhost for development
     try{const o=new URL(origin);if(o.hostname==='localhost'||o.hostname==='127.0.0.1')allowed=true;}catch{}
     if(!allowed)throw new RequestError(403,'origin_not_allowed','This origin cannot submit requests. Origin: '+origin);
    }
   }
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
   else if(action==='users'){
    // listUsers signature is (maxResults, pageToken). Wrap in try/catch so a
    // Firebase Admin API hiccup returns a clear 503 instead of a bare 500 —
    // the user-facing admin panel can then show a helpful message.
    let list;
    try{list=await auth.listUsers(100,url.searchParams.get('pageToken')||undefined);}
    catch(e){throw new RequestError(503,'auth_list_failed','Could not load the user list. The Identity Toolkit may be temporarily unavailable or the service account may lack permissions.');}
    result={items:list.users.map(u=>({uid:u.uid,email:u.email,emailVerified:u.emailVerified,disabled:u.disabled,role:u.customClaims?.role||'member'})),nextPageToken:list.pageToken||null};
   }
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
     // Send notification email to the applicant when an alumni application is
     // approved or rejected. Uses Resend API (https://resend.com).
     // If RESEND_API_KEY is not set, the email is silently skipped — the
     // moderation itself still succeeds.
     if(result.submitterUid && (body.status==='approved'||body.status==='rejected') && process.env.RESEND_API_KEY){
      try{
       const submitter=await auth.getUser(result.submitterUid);
       const emailAddr=submitter.email;
       if(emailAddr){
        const subject=body.status==='approved'?'Your alumni application has been approved':'Your alumni application has been rejected';
        const html=body.status==='approved'
         ?'<h2>Congratulations!</h2><p>Your alumni directory submission has been approved by the SE Society admin team. Your profile is now visible on the public Alumni Directory page.</p><p>Thank you for being part of the SE Society community!</p><br><p>Best regards,<br>SE Society Team<br>National Textile University, Faisalabad</p>'
         :'<h2>Alumni Application Update</h2><p>We regret to inform you that your alumni directory submission has been rejected by the SE Society admin team.</p><p>If you believe this was a mistake, please contact us at se.society.ntu@gmail.com.</p><br><p>Best regards,<br>SE Society Team<br>National Textile University, Faisalabad</p>';
        await fetch('https://api.resend.com/emails',{
         method:'POST',
         headers:{'Authorization':'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json'},
         body:JSON.stringify({
          from:process.env.EMAIL_FROM||'SE Society <onboarding@resend.dev>',
          to:[emailAddr],
          subject,
          html
         }),
         signal:AbortSignal.timeout(5000)
        });
        result.emailSent=true;
       }
      }catch(e){/* email failed — don't fail the moderation */}
     }
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
