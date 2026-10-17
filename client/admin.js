import './styles.css';
import { api, safeImage } from './api.js';
import { fields,kinds,settingFields,settingTextFields,featuredGroups } from '../shared/content-schema.js';
const $=id=>document.getElementById(id),state={id:null,version:0,settingsVersion:0,contentCursor:null,inboxCursor:null,usersCursor:null,uploadsEnabled:false};
let busy=false;
async function task(fn){if(busy)return;busy=true;document.querySelectorAll('button,input,select,textarea').forEach(b=>b.disabled=true);$('admin-status').textContent='Please wait…';try{await fn();}catch(e){$('admin-status').textContent=e.message||'Request failed. Please try again.';$('admin-status').scrollIntoView?.({block:'center',behavior:'smooth'});}finally{busy=false;document.querySelectorAll('button,input,select,textarea').forEach(b=>b.disabled=b.dataset.unavailable==='true');}}
function node(tag,text,classes){const e=document.createElement(tag);if(text)e.textContent=text;if(classes)e.className=classes;return e;}
function input(label,id,multiline=false){const wrap=node('label',label,'field-label');const field=node(multiline?'textarea':'input');field.id=id;field.name=id;if(multiline)field.rows=4;field.maxLength=id.endsWith('body')?12000:id.endsWith('description')?4000:2000;wrap.append(field);return wrap;}
function photo(label,prefix){
 const box=node('div',null,'photo-field'),url=input(label+' URL',prefix+'-url'),alt=input('Photo description',prefix+'-alt');
 const preview=node('img');preview.alt='Photo preview';preview.className='photo-preview';preview.hidden=true;
 const refresh=()=>{const v=safeImage(url.lastChild.value);preview.hidden=!v;if(v)preview.src=v;};url.lastChild.addEventListener('input',refresh);
 const hint=node('p',state.uploadsEnabled?'Choose a JPEG, PNG or WebP up to 10 MB. Large photos are resized before upload.':'PC uploads are not active yet. Ask the owner to finish photo storage setup, or paste a hosted photo URL.','text-sm text-slate-600');
 const fileWrap=node('label','Choose photo from PC','field-label'),file=node('input');file.type='file';file.accept='image/jpeg,image/png,image/webp';fileWrap.append(file);
 const button=node('button','Upload selected photo','secondary-button');button.type='button';
 for(const control of [file,button]){control.dataset.unavailable=String(!state.uploadsEnabled);control.disabled=!state.uploadsEnabled;}
 button.onclick=()=>task(async()=>{
  const f=file.files[0];if(!f)throw new Error('Choose a photo from your PC first.');
  if(!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>10*1024*1024)throw new Error('Choose a JPEG, PNG or WebP photo no larger than 10 MB.');
  const bitmap=await createImageBitmap(f);
  let blob;try{if(bitmap.width*bitmap.height>24000000)throw new Error('Choose a photo smaller than 24 megapixels.');const scale=Math.min(1,1920/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',0.82));}finally{bitmap.close();}
  if(!blob||blob.size>2*1024*1024)throw new Error('This photo is still too large after resizing. Choose a smaller image.');
  const base64=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=reject;reader.readAsDataURL(blob);});
  const result=await api('upload',{method:'POST',authenticated:true,body:{base64}});url.lastChild.value=result.url;if(!alt.lastChild.value)alt.lastChild.value=$('field-title')?.value||label;refresh();file.value='';$('admin-status').textContent='Photo uploaded. Click Publish or Save website photos to make it visible.';
 });
 box.append(preview,url,alt,hint,fileWrap,button);box.refresh=refresh;return box;
}
function editor(item){
 state.id=item?.id||null;state.version=item?.version||0;const kind=$('content-kind').value;$('editor-title').textContent=item?'Edit item':'New item';$('editor-fields').replaceChildren();
 for(const [key,label] of Object.entries(fields[kind])){if(key==='alt')continue;if(key==='image'){const p=photo('Photo','item-photo');$('editor-fields').append(p);$('item-photo-url').value=item?.data.image||'';$('item-photo-alt').value=item?.data.alt||'';p.refresh();}else{const wrap=input(label,'field-'+key,['description','body'].includes(key));wrap.lastChild.value=item?.data[key]||'';if(key==='date')wrap.lastChild.type='date';if(key==='session'){wrap.lastChild.placeholder='2026-2027';wrap.lastChild.pattern='20[0-9]{2}-20[0-9]{2}';wrap.lastChild.value=item?.data[key]||'2026-2027';}if(key==='group'){const select=node('select');select.id='field-group';const options=kind==='featured'?Object.entries(featuredGroups):Object.entries({core:'Main Body (President, VP, etc.)',exec:'Heads',general:'General Members'});for(const [value,label]of options){const option=node('option',label);option.value=value;select.append(option);}select.value=item?.data[key]||options[0][0];wrap.replaceChild(select,wrap.lastChild);}if(key==='placement'){const select=node('select');select.id='field-placement';const options=[['both','Both — Homepage + Cabinet page'],['homepage','Homepage only'],['cabinet','Cabinet page only']];for(const [value,label]of options){const option=node('option',label);option.value=value;select.append(option);}select.value=item?.data[key]||'both';wrap.replaceChild(select,wrap.lastChild);}if(key==='displayOrder')wrap.lastChild.type='number';if(key==='row'){wrap.lastChild.type='number';wrap.lastChild.min='1';wrap.lastChild.max='20';wrap.lastChild.step='1';wrap.lastChild.value=item?.data[key]||'1';wrap.lastChild.placeholder='1';}wrap.lastChild.required=['title','date','session','group'].includes(key);$('editor-fields').append(wrap);}}
 $('content-status').value=item?.status||'draft';
 // Show delete buttons only when editing an existing item. Editors see "Archive" (soft
 // delete), admins also see "Delete forever" (permanent). Both ask for confirmation.
 const deleteBar=$('delete-bar');if(deleteBar)deleteBar.replaceChildren();
 if(item&&deleteBar){
  const archive=node('button',null,'secondary-button');archive.type='button';archive.dataset.adminOnly='';archive.innerHTML='<i class="fas fa-box-archive"></i> Archive (hide from website)';
  archive.onclick=()=>confirmAction('Archive this item? It will be hidden from the public website but kept in the database for recovery.',()=>deleteItem(false));
  const permanent=node('button',null,'danger-button');permanent.type='button';permanent.dataset.adminOnly='';permanent.innerHTML='<i class="fas fa-trash"></i> Delete forever';
  permanent.onclick=()=>confirmAction('Delete this item PERMANENTLY? This cannot be undone.',()=>deleteItem(true));
  deleteBar.append(archive,permanent);
  // Editor role cannot permanently delete: only archive.
  document.querySelectorAll('[data-admin-only]').forEach(e=>e.hidden=state.role!=='admin');
 }
}
function confirmAction(message,onConfirm){if(window.confirm(message))task(onConfirm);}
async function deleteItem(permanent){
 if(!state.id)throw new Error('Open an item before deleting it.');
 const result=await api('delete',{method:'POST',authenticated:true,body:{id:state.id,version:state.version,permanent}});
 $('admin-status').textContent=permanent?'Item deleted permanently.':('Item archived. Version '+result.version+'.');
 state.id=null;state.version=0;editor();
 try{await loadContent();}catch{}
}
async function loadContent(append=false){const result=await api('list',{kind:$('content-kind').value,cursor:append?state.contentCursor:null,authenticated:true});if(!append)$('content-list').replaceChildren();
 // Cabinet group filter: if cabinet is selected and a filter is chosen,
 // only show items matching that group.
 const filterVal=$('cabinet-filter')?.value||'all';
 const kind=$('content-kind').value;
 let items=result.items;
 if(kind==='cabinet'&&filterVal!=='all'){items=items.filter(i=>i.data.group===filterVal);}
 for(const item of items){const b=node('button',null,'content-list-item');b.type='button';const title=node('strong',item.data.title,'font-semibold text-slate-900');const statusBadge=node('span',item.status,'status-badge '+item.status);b.append(title,statusBadge);b.onclick=()=>{document.querySelectorAll('.content-list-item').forEach(el=>el.classList.remove('active'));b.classList.add('active');editor(item);$('content-form').scrollIntoView({behavior:'smooth',block:'start'});};$('content-list').append(b);}
 if(!$('content-list').children.length)$('content-list').append(node('p',kind==='cabinet'&&filterVal!=='all'?'No members in this group. Try a different filter or create a new one.':'No items yet. Create the first one.','empty-state'));
 state.contentCursor=result.nextCursor;$('content-more').hidden=!result.nextCursor;
}
async function loadPhotos(){const result=await api('settings-read',{authenticated:true});state.settingsVersion=result.version;$('current-session').value=result.data?.currentSession||'2026-2027';
 // HOD photo -> HOD section container (next to HOD text fields)
 const hodWrap=$('hod-photo-field');if(hodWrap){hodWrap.replaceChildren();const p=photo('HOD portrait','site-hod');hodWrap.append(p);$('site-hod-url').value=result.data?.photos?.hod?.url||'';$('site-hod-alt').value=result.data?.photos?.hod?.alt||'';p.refresh();}
 // Convenier photo -> Convenier section container (next to Convenier text fields)
 const convWrap=$('convenier-photo-field');if(convWrap){convWrap.replaceChildren();const p=photo('Convenier portrait','site-convenier');convWrap.append(p);$('site-convenier-url').value=result.data?.photos?.convenier?.url||'';$('site-convenier-alt').value=result.data?.photos?.convenier?.alt||'';p.refresh();}
 // General website photos (hero, campus, lab, society) -> general grid
 const genWrap=$('general-photos');if(genWrap){genWrap.replaceChildren();for(const [key,label]of Object.entries(settingFields)){if(key==='hod'||key==='convenier')continue;const p=photo(label,'site-'+key);genWrap.append(p);$('site-'+key+'-url').value=result.data?.photos?.[key]?.url||'';$('site-'+key+'-alt').value=result.data?.photos?.[key]?.alt||'';p.refresh();}}
 // Text fields (HOD + Convenier) — each rendered into its matching container.
 const textContainers={hodName:'hod-text-fields',hodTitle:'hod-text-fields',hodMessage:'hod-text-fields',convenierName:'convenier-text-fields',convenierTitle:'convenier-text-fields',convenierMessage:'convenier-text-fields'};
 for(const containerId of [...new Set(Object.values(textContainers))]){$(containerId)?.replaceChildren?.();}
 for(const [key,label]of Object.entries(settingTextFields)){
  const containerId=textContainers[key];const wrap=$(containerId);if(!wrap)continue;
  const isMessage=key==='hodMessage'||key==='convenierMessage';
  const fieldWrap=input(label,'text-'+key,isMessage);
  const ta=fieldWrap.lastChild;ta.value=result.data?.texts?.[key]||'';
  if(isMessage){ta.rows=4;ta.maxLength=2000;ta.placeholder='Welcome message shown beside the portrait on the homepage.';}
  wrap.append(fieldWrap);
 }}
async function loadUsers(append=false){const result=await api('users',{cursor:append?state.usersCursor:null,authenticated:true});if(!append)$('users-list').replaceChildren();
 for(const u of result.items){const card=node('article',null,'user-card');
  const emailRow=node('div',null,'user-email');emailRow.append(node('span',null,'fas fa-circle-user text-indigo-500'),node('span',u.email||u.uid));
  const meta=node('div',null,'user-meta');
  const verified=u.emailVerified?'<i class="fas fa-check-circle text-emerald-500"></i> verified':'<i class="fas fa-exclamation-circle text-amber-500"></i> not verified';
  const status=u.disabled?'disabled':'enabled';
  meta.innerHTML='<span>'+verified+'</span><span>·</span><span>'+status+'</span>';
  const roleBadge=node('span',u.role,'user-role '+u.role);
  const controls=node('div',null,'role-controls');
  for(const role of ['member','editor','admin']){const b=node('button',null,'role-btn'+(u.role===role?' active':''));b.type='button';
   const label=role==='member'?'Member':role==='editor'?'Editor':'Admin';
   b.innerHTML='<i class="fas '+(role==='admin'?'fa-crown':role==='editor'?'fa-pen':'fa-user')+'"></i> '+label;
   b.disabled=u.role===role;
   b.onclick=()=>confirmAction('Change '+(u.email||u.uid)+' to '+label+'? The user must sign out and back in to see the change.',async()=>{await api('assign-role',{method:'POST',authenticated:true,body:{uid:u.uid,role}});$('admin-status').textContent='Role updated. Ask '+(u.email||u.uid)+' to sign out and sign in again.';await loadUsers();});
   controls.append(b);}
  card.append(emailRow,meta,roleBadge,controls);$('users-list').append(card);}
 if(!$('users-list').children.length)$('users-list').append(node('p','No users yet. Users will appear here after they sign up on the account page.','empty-state'));
 state.usersCursor=result.nextPageToken;$('users-more').hidden=!result.nextPageToken;}
async function inbox(append=false){const result=await api('inbox',{cursor:append?state.inboxCursor:null,authenticated:true});if(!append)$('inbox-list').replaceChildren();
 for(const item of result.items){const card=node('article',null,'inbox-card');
  const kindBadge=node('span',item.kind,'inbox-kind');kindBadge.innerHTML='<i class="fas '+(item.kind==='contact'?'fa-envelope':item.kind==='suggestion'?'fa-lightbulb':item.kind==='alumni'?'fa-user-graduate':'fa-inbox')+'"></i> '+item.kind;
  card.append(kindBadge);
  const statusBadge=node('span',item.status,'user-role '+(item.status==='pending'?'member':item.status==='approved'?'editor':item.status==='rejected'?'admin':'member'));
  card.append(statusBadge);
  for(const[key,value]of Object.entries(item.data)){const row=node('div',null,'inbox-row');row.innerHTML='<span class="label">'+key+':</span> '+String(value).replace(/</g,'&lt;').replace(/>/g,'&gt;');card.append(row);}
  if(item.status==='pending'){const controls=node('div',null,'role-controls');for(const status of item.kind==='alumni'?['approved','rejected']:['reviewed','rejected']){const b=node('button',null,'role-btn');b.innerHTML='<i class="fas '+(status==='approved'?'fa-check':status==='rejected'?'fa-xmark':'fa-check-double')+'"></i> '+status;b.onclick=()=>task(async()=>{await api('moderate',{method:'POST',authenticated:true,body:{id:item.id,version:item.version,status}});await inbox();$('admin-status').textContent='Review saved.';});controls.append(b);}card.append(controls);}
  $('inbox-list').append(card);}
 if(!$('inbox-list').children.length)$('inbox-list').append(node('p','No submissions yet. New contact messages, suggestions and alumni applications will appear here.','empty-state'));
 state.inboxCursor=result.nextCursor;$('inbox-more').hidden=!result.nextCursor;}
for(const kind of kinds){const o=node('option',kind);o.value=kind;$('content-kind').append(o);}
$('content-kind').onchange=()=>task(async()=>{
 // Show cabinet filter only when cabinet is selected
 const isCabinet=$('content-kind').value==='cabinet';
 const fl=$('cabinet-filter-label');if(fl)fl.style.display=isCabinet?'':'none';
 editor();await loadContent();$('admin-status').textContent='Content loaded.';
});
// Cabinet filter change — reload content list
$('cabinet-filter')?.addEventListener('change',()=>task(async()=>{await loadContent();$('admin-status').textContent='Filter applied.';}));
$('new-item').onclick=()=>{editor();$('content-form').scrollIntoView({behavior:'smooth'});};
$('content-more').onclick=()=>task(()=>loadContent(true));
$('content-form').onsubmit=e=>{e.preventDefault();if(e.submitter?.dataset.publish==='true')$('content-status').value='published';task(async()=>{const data={};for(const key of Object.keys(fields[$('content-kind').value]))data[key]=$(key==='image'?'item-photo-url':key==='alt'?'item-photo-alt':'field-'+key).value;if(data.image&&!data.alt)data.alt=data.title;const result=await api('content',{method:'POST',authenticated:true,body:{id:state.id,version:state.version,content:{kind:$('content-kind').value,status:$('content-status').value,data}}});state.id=result.id;state.version=result.version;$('editor-title').textContent='Edit item';const visibility=$('content-status').value;const confirmation=visibility==='published'?'Published and saved to the database. Refresh the website after 30 seconds.':visibility==='draft'?'Draft saved to the database. Click Publish to show it on the website.':'Archived and saved to the database. It will no longer appear publicly.';try{await loadContent();$('admin-status').textContent=confirmation;}catch{$('admin-status').textContent=confirmation+' The item list could not refresh; reopen this page.';}});};
$('photos-form').onsubmit=e=>{e.preventDefault();task(async()=>{const photos={};for(const key of Object.keys(settingFields))photos[key]={url:$('site-'+key+'-url').value,alt:$('site-'+key+'-alt').value||($('site-'+key+'-url').value?settingFields[key]:'')};
 const texts={};for(const key of Object.keys(settingTextFields))texts[key]=$('text-'+key).value;
 const result=await api('settings',{method:'POST',authenticated:true,body:{version:state.settingsVersion,data:{photos,currentSession:$('current-session').value,texts}}});state.settingsVersion=result.version;$('admin-status').textContent='Website photos and HOD/Convenier text saved. Changes appear within 30 seconds.';});};
$('inbox-refresh').onclick=()=>task(()=>inbox());$('inbox-more').onclick=()=>task(()=>inbox(true));
$('users-refresh').onclick=()=>task(()=>loadUsers());$('users-more').onclick=()=>task(()=>loadUsers(true));
// loadUsers already shows the API error message in admin-status via task().
// The 503 from the server now carries a friendly 'Could not load the user
// list...' message instead of a bare 500, so editors see what to do next.
document.querySelectorAll('[data-panel]').forEach(b=>b.onclick=()=>task(async()=>{document.querySelectorAll('.manage-panel').forEach(p=>p.hidden=p.id!==b.dataset.panel);document.querySelectorAll('.admin-tabs button').forEach(btn=>btn.classList.toggle('active',btn===b));if(b.dataset.panel==='photos-panel')await loadPhotos();if(b.dataset.panel==='inbox-panel')await inbox();if(b.dataset.panel==='users-panel')await loadUsers();$('admin-status').textContent='Ready.';}));
// Mark the Content tab as active on initial load.
document.querySelector('.admin-tabs button[data-panel="content-panel"]')?.classList.add('active');
await task(async()=>{const user=await api('me',{authenticated:true});if(!['admin','editor'].includes(user.role))throw new Error('Your account has no management role. Ask the society owner to grant access.');state.role=user.role;state.uploadsEnabled=user.uploadsEnabled===true;$('admin-panel').hidden=false;document.querySelectorAll('[data-admin-only]').forEach(e=>e.hidden=user.role!=='admin');editor();await loadContent();$('admin-status').textContent='Signed in as '+user.role+'.';});
