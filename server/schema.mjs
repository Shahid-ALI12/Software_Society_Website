import { RequestError } from './security/errors.mjs';
import { fields, kinds, settingFields, settingTextFields, featuredGroups } from '../shared/content-schema.js';
export const invalid = (message='Check the submitted fields.') => new RequestError(400, 'invalid_input', message);
function field(label, fn){try{return fn();}catch(e){if(e instanceof RequestError)throw invalid(label+': '+e.message);throw e;}}
export function exact(value, keys) {
 if (!value || Object.getPrototypeOf(value)!==Object.prototype || Object.keys(value).some(k=>!keys.includes(k))) throw invalid();
}
export function text(value, max=200, min=0) {
 if(typeof value!=='string') throw invalid();
 const v=value.trim();
 if(v.length<min || v.length>max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(v)) throw invalid();
 return v;
}
export function imageURL(value, required=false) {
 const v=text(value,2000,required?1:0); if(!v) return '';
 let u; try{u=new URL(v);}catch{throw invalid();}
 // Never fetch arbitrary URLs on the server. Limit browser images to established image providers.
 if(u.protocol!=='https:' || u.username || u.password || u.port || !['images.unsplash.com','images.pexels.com','res.cloudinary.com','firebasestorage.googleapis.com'].includes(u.hostname)) throw invalid('Use an HTTPS photo URL from Unsplash, Pexels, Cloudinary or this project’s Firebase Storage.');
 if(u.hostname==='firebasestorage.googleapis.com' && !u.pathname.startsWith('/v0/b/softwarewebsite-861b4.firebasestorage.app/o/')) throw invalid();
 return u.href;
}
export function linkedIn(value) {
 const v=text(value,500); if(!v)return '';
 let u;try{u=new URL(v);}catch{throw invalid();}
 if(u.protocol!=='https:' || !['www.linkedin.com','linkedin.com'].includes(u.hostname) || u.username || u.password || u.port || !u.pathname.startsWith('/in/'))throw invalid();
 return u.href;
}
export function identifier(v){ if(typeof v!=='string'||!/^[A-Za-z0-9_-]{1,80}$/.test(v))throw invalid();return v; }
export function version(v){if(!Number.isSafeInteger(v)||v<0)throw invalid();return v;}
// Optional small non-negative integer used for ordering featured people inside a tab.
function displayOrder(v){if(v===undefined||v===null||v==='')return 0;const n=Number(v);if(!Number.isSafeInteger(n)||n<0||n>9999)throw invalid('Display order must be a number between 0 and 9999.');return n;}
export function validateContent(body){
 exact(body,['kind','status','data']);if(!kinds.includes(body.kind)||!['draft','published','archived'].includes(body.status))throw invalid();
 const spec=fields[body.kind];exact(body.data,Object.keys(spec));const data={};
 for(const key of Object.keys(spec)) {
  const v=body.data[key]??'';
  data[key]=field(spec[key],()=>key==='image'?imageURL(v,body.kind==='gallery'):key==='linkedin'?linkedIn(v):key==='displayOrder'?displayOrder(v):key==='bio'?text(v,4000,0):text(v,key==='body'?12000:key==='description'?4000:200,key==='title'?1:0));
 }
 if(data.image&&!data.alt)throw invalid('Add a photo description before saving.');
 if(body.kind==='events' && /^\d{2}-\d{2}-\d{4}$/.test(data.date))data.date=data.date.split('-').reverse().join('-');
 if(body.kind==='events' && (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)||!Number.isFinite(Date.parse(data.date))||new Date(data.date).toISOString().slice(0,10)!==data.date))throw invalid('Choose a valid event date using the date picker.');
 if(body.kind==='cabinet' && (!/^20\d{2}-20\d{2}$/.test(data.session)||!['core','exec','general'].includes(data.group)))throw invalid('Choose a cabinet group and enter the session as 2026-2027.');
 // placement: where to show this member. Default to 'both' for old data.
 if(body.kind==='cabinet'){
  if(!data.placement) data.placement='both';
  if(!['homepage','cabinet','both'].includes(data.placement)) throw invalid('Choose where to show this member: homepage, cabinet, or both.');
  // row: which row on the cabinet page (1=top). Default to 1 for old data.
  if(data.row===undefined||data.row===null||data.row==='') data.row=1;
  const rowNum=Number(data.row);
  if(!Number.isSafeInteger(rowNum)||rowNum<1||rowNum>20) throw invalid('Row must be a number between 1 and 20.');
  data.row=rowNum;
 }
 if(body.kind==='featured' && !Object.keys(featuredGroups).includes(data.group))throw invalid('Choose a valid featured tab (e.g. hod, director, patron, dean).');
 return {kind:body.kind,status:body.status,data};
}
export function validateSettings(body){
 exact(body,['photos','currentSession','texts']);exact(body.photos,Object.keys(settingFields));
 const photos={};for(const key of Object.keys(settingFields)){
  exact(body.photos[key],['url','alt']);photos[key]={url:field(settingFields[key],()=>imageURL(body.photos[key].url)),alt:text(body.photos[key].alt,200)};
  if(photos[key].url&&!photos[key].alt)throw invalid(settingFields[key]+': add a photo description.');
 }
 const currentSession=text(body.currentSession,9,9);if(!/^20\d{2}-20\d{2}$/.test(currentSession))throw invalid();
 // HOD text fields are optional but, if present, must be sane strings so the homepage
 // block is never fed control characters or a multi-megabyte paste.
 exact(body.texts,Object.keys(settingTextFields));
 const texts={};for(const key of Object.keys(settingTextFields)){const limit=key==='hodMessage'||key==='convenierMessage'||key==='hodBio'||key==='convenierBio'?4000:key==='hodLink'||key==='convenierLink'?500:200;texts[key]=text(body.texts[key],limit);}
 return {photos,currentSession,texts};
}
export function validateAlumni(b){
 exact(b,['name','batch','role','linkedin','consent']);if(b.consent!==true)throw invalid();
 return {name:text(b.name,120,1),batch:text(b.batch,40,1),role:text(b.role,200,1),linkedin:linkedIn(b.linkedin),consent:true};
}
