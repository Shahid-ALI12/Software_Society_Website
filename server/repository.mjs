import { FieldValue, Timestamp, FieldPath } from 'firebase-admin/firestore';
import { createHash } from 'node:crypto';
import { RequestError } from './security/errors.mjs';
import { fields, settingFields, settingTextFields } from '../shared/content-schema.js';
import { invalid,identifier } from './schema.mjs';
const pageSize=24;
function cursorDecode(s){
 if(!s)return null;if(s.length>300)throw invalid();
 try {const p=JSON.parse(Buffer.from(s,'base64url').toString());if(!Number.isSafeInteger(p.ms)||p.ms<0)throw invalid();identifier(p.id);return p;}catch{throw invalid();}
}
function document(d,privateFields=false){const v=d.data();return {id:d.id,version:v.version||0,kind:v.kind,status:v.status,data:privateFields?v.data:Object.fromEntries(Object.keys(fields[v.kind]||{}).map(k=>[k,v.data?.[k]??''])),updatedAt:v.updatedAt?.toMillis()||0,...(privateFields?{uid:v.uid}: {})};}
function page(snapshot,privateFields=false){const docs=snapshot.docs.slice(0,pageSize),last=docs.at(-1);return {items:docs.map(d=>document(d,privateFields)),nextCursor:snapshot.size>pageSize?Buffer.from(JSON.stringify({ms:last.data().updatedAt.toMillis(),id:last.id})).toString('base64url'):null};}
function withCursor(query,cursor){const c=cursorDecode(cursor);return c?query.startAfter(Timestamp.fromMillis(c.ms),c.id):query;}
export function createRepository(db){
 const audit=(tx,uid,action,target)=>tx.set(db.collection('auditLogs').doc(),{uid,action,target,at:FieldValue.serverTimestamp()});
 return {
  async content(kind,cursor,published=true){let q=db.collection('content').where('kind','==',kind);if(published)q=q.where('status','==','published');q=q.orderBy('updatedAt','desc').orderBy(FieldPath.documentId());return page(await withCursor(q,cursor).limit(pageSize+1).get());},
  async settings(){const d=await db.doc('settings/site').get();return d.exists?{data:{currentSession:d.data().data.currentSession,photos:Object.fromEntries(Object.keys(settingFields).map(k=>[k,{url:d.data().data.photos?.[k]?.url||'',alt:d.data().data.photos?.[k]?.alt||''}])),texts:Object.fromEntries(Object.keys(settingTextFields).map(k=>[k,d.data().data.texts?.[k]||'']))},version:d.data().version}:{data:null,version:0};},
  async saveContent(uid,body){const ref=body.id?db.collection('content').doc(body.id):db.collection('content').doc();return db.runTransaction(async tx=>{
   const old=await tx.get(ref);if((old.exists?old.data().version:0)!==body.version)throw new RequestError(409,'conflict','This item changed. Reload it before saving.');
   if(old.exists&&old.data().kind!==body.content.kind)throw invalid();
   tx.set(ref,{...body.content,version:body.version+1,createdAt:old.exists?old.data().createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()});audit(tx,uid,'content.save',ref.path);return {id:ref.id,version:body.version+1};
  });},
  // Soft delete = archive (item stays in DB, hidden from public). Hard delete = permanent removal.
  // Both check version to prevent concurrent-edit loss; both write audit logs.
  async deleteContent(uid,body){const ref=db.collection('content').doc(body.id);return db.runTransaction(async tx=>{
   const old=await tx.get(ref);if(!old.exists)throw new RequestError(404,'not_found','This item no longer exists.');
   if(old.data().version!==body.version)throw new RequestError(409,'conflict','This item changed. Reload it before deleting.');
   if(body.permanent){tx.delete(ref);audit(tx,uid,'content.delete',ref.path);return {id:body.id,deleted:true,permanent:true};}
   tx.update(ref,{status:'archived',version:body.version+1,updatedAt:FieldValue.serverTimestamp()});audit(tx,uid,'content.archive',ref.path);return {id:body.id,version:body.version+1,archived:true};
  });},
  async saveSettings(uid,body){const ref=db.doc('settings/site');return db.runTransaction(async tx=>{const old=await tx.get(ref);if((old.exists?old.data().version:0)!==body.version)throw new RequestError(409,'conflict','Settings changed. Reload before saving.');tx.set(ref,{data:body.data,version:body.version+1,updatedAt:FieldValue.serverTimestamp()});audit(tx,uid,'settings.save',ref.path);return {version:body.version+1};});},
  async submit(uid,kind,data,key){
   const id=createHash('sha256').update(uid+':'+kind+':'+key).digest('hex'),ref=db.collection('submissions').doc(id),hash=createHash('sha256').update(JSON.stringify(data)).digest('hex');
   return db.runTransaction(async tx=>{const old=await tx.get(ref);if(old.exists){if(old.data().hash!==hash)throw new RequestError(409,'conflict','This submission identifier was already used.');return {id};}tx.create(ref,{uid,kind,data,hash,status:'pending',version:1,createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()});return {id};});
  },
  async inbox(cursor){const q=db.collection('submissions').orderBy('updatedAt','desc').orderBy(FieldPath.documentId());return page(await withCursor(q,cursor).limit(pageSize+1).get(),true);},
  async moderate(uid,id,status,version){const ref=db.collection('submissions').doc(id);return db.runTransaction(async tx=>{const old=await tx.get(ref);if(!old.exists)throw new RequestError(404,'not_found','Submission not found.');const v=old.data();if(v.version!==version)throw new RequestError(409,'conflict','Submission changed. Reload before reviewing.');if(v.status!=='pending')throw invalid();
   if(v.kind==='alumni'&&status==='approved'){
    if(v.data.consent!==true)throw invalid();
    tx.set(db.collection('content').doc('alumni-'+id),{kind:'alumni',status:'published',data:{title:v.data.name,batch:v.data.batch,role:v.data.role,linkedin:v.data.linkedin,image:'',alt:''},version:1,createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()});
   }else if(status==='approved')throw invalid();
   tx.update(ref,{status,version:version+1,updatedAt:FieldValue.serverTimestamp()});audit(tx,uid,'submission.'+status,ref.path);return {id,status};
  });}
 };
}
