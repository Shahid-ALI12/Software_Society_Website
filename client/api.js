export async function api(action,{kind,cursor,method='GET',body,key,authenticated=false}={}){
 const query=new URLSearchParams({action});if(kind)query.set('kind',kind);if(cursor)query.set('cursor',cursor);
 const headers={};if(body)headers['Content-Type']='application/json';if(key)headers['Idempotency-Key']=key;
 if(authenticated){
  const [{auth},{ready}]=await Promise.all([import('./firebase.js'),import('./auth-service.js')]);await ready;await auth.authStateReady();
  if(!auth.currentUser)throw new Error('Please sign in from Account before continuing.');
  headers.Authorization='Bearer '+await auth.currentUser.getIdToken();
 }
 const response=await fetch('/api/portal?'+query,{method,headers,body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(25000)});
 let data;try{data=await response.json();}catch{throw new Error('The data service is not available yet. Please try again later.');}
 if(!response.ok){const error=new Error(data.message||'Request failed. Please try again.');error.status=response.status;throw error;}return data;
}
export function escapeHTML(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
export function safeImage(value){try{const u=new URL(value);return u.protocol==='https:'&&['images.unsplash.com','images.pexels.com','res.cloudinary.com','firebasestorage.googleapis.com'].includes(u.hostname)&&!u.username&&!u.password?u.href:'';}catch{return '';}}
export function safeLinkedIn(value){try{const u=new URL(value);return u.protocol==='https:'&&['www.linkedin.com','linkedin.com'].includes(u.hostname)&&u.pathname.startsWith('/in/')?u.href:'';}catch{return '';}}
