import './styles.css';
import { api,escapeHTML as esc,safeImage,safeLinkedIn } from './api.js';
import { sampleContent } from './sample.js';
import { kinds } from '../shared/content-schema.js';
const $=id=>document.getElementById(id),state={content:sampleContent,cursors:{},eventFilter:'all',live:false,session:'2025-2026'};
const empty='<p class="empty-state">Nothing published here yet.</p>';
const card='bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm';
function image(data,classes='w-full h-44 object-cover'){const url=safeImage(data.image);return url?`<img src="${esc(url)}" alt="${esc(data.alt||data.title)}" loading="lazy" decoding="async" class="${classes}">`:'';}
function content(kind){return state.content[kind].map(item=>({...item.data,id:item.id}));}
function render(){renderHome();renderEvents();renderNotices();loadCabinet();renderAlumni();}
function renderHome(){
 $('home-session').textContent='Session '+state.session+' Society Leadership';
 const core=content('cabinet').filter(m=>m.session===state.session&&m.group==='core').slice(0,4);
 $('homeExecutiveGrid').innerHTML=core.map(m=>`<article class="${card} text-center">${image(m,'w-20 h-20 mx-auto rounded-full object-cover mb-3')}<h3 class="font-bold">${esc(m.title)}</h3><p class="text-sm text-blue-600">${esc(m.role)}</p></article>`).join('')||empty;
 $('blogGrid').innerHTML=content('posts').map(b=>`<button type="button" class="${card} text-left space-y-3" data-blog="${esc(b.id)}">${image(b)}<h3 class="font-bold text-lg">${esc(b.title)}</h3><p class="text-sm text-slate-500">${esc(b.description)}</p><p class="text-sm">By ${esc(b.author)} →</p></button>`).join('')||empty;
}
function renderEvents(){
 const today=new Date().toISOString().slice(0,10);
 const list=content('events').filter(e=>state.eventFilter==='all'||(new Date(e.date).getTime()>=new Date(today).getTime()?'upcoming':'past')===state.eventFilter);
 $('eventsGrid').innerHTML=list.map(e=>`<article class="${card} overflow-hidden">${image(e)}<div class="space-y-3 mt-4"><p class="text-xs text-blue-600">${esc(e.date)}</p><h3 class="font-bold text-lg">${esc(e.title)}</h3><p class="text-sm text-slate-500 whitespace-pre-wrap">${esc(e.description)}</p><p class="text-xs text-slate-500">${esc(e.location)}</p></div></article>`).join('')||empty;
 $('galleryGrid').innerHTML=content('gallery').map(e=>`<button type="button" data-photo="${esc(safeImage(e.image))}" aria-label="View ${esc(e.alt||e.title)}" class="rounded-xl overflow-hidden text-left">${image(e,'w-full h-40 object-cover')}<p class="text-xs p-2">${esc(e.title)}</p></button>`).join('')||empty;
}
function renderNotices(){const query=$('noticeSearch').value.toLowerCase();$('noticeContainer').innerHTML=content('notices').filter(n=>(n.title+' '+n.description).toLowerCase().includes(query)).map(n=>`<article class="${card} space-y-3"><span class="text-xs text-blue-600">${esc(n.category)}</span><h3 class="font-bold">${esc(n.title)}</h3><p class="text-sm text-slate-500 whitespace-pre-wrap">${esc(n.description)}</p></article>`).join('')||empty;}
function loadCabinet(){
 const sessions=[...new Set(content('cabinet').map(m=>m.session))].sort().reverse(),select=$('cabinetSessionSelect');const previous=select.value;
 select.replaceChildren(...sessions.map(s=>{const o=document.createElement('option');o.value=s;o.textContent=s;return o;}));select.value=sessions.includes(previous)?previous:sessions.includes(state.session)?state.session:sessions[0]||'';
 for(const[group,id]of Object.entries({core:'coreBodyGrid',exec:'executiveBodyGrid',general:'generalBodyGrid'}))$(id).innerHTML=content('cabinet').filter(m=>m.session===select.value&&m.group===group).map(m=>`<article class="${card} text-center">${image(m,'w-24 h-24 mx-auto rounded-xl object-cover mb-3')}<h3 class="font-bold">${esc(m.title)}</h3><p class="text-sm text-blue-600">${esc(m.role)}</p></article>`).join('')||empty;
}
function renderAlumni(){$('alumniGrid').innerHTML=content('alumni').map(a=>`<article class="${card} space-y-3">${image(a,'w-20 h-20 rounded-full object-cover')}<h3 class="font-bold">${esc(a.title)}</h3><p class="text-xs text-slate-500">Batch: ${esc(a.batch)}</p><p class="text-sm">${esc(a.role)}</p>${safeLinkedIn(a.linkedin)?`<a href="${esc(safeLinkedIn(a.linkedin))}" target="_blank" rel="noopener noreferrer" class="text-blue-600 text-sm underline">Connect on LinkedIn</a>`:''}</article>`).join('')||empty;}
let lastFocus;
function openModal(id){lastFocus=document.activeElement;const modal=$(id);modal.classList.remove('hidden');modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label',id==='blogModal'?'Article':id==='lightboxModal'?'Photo preview':'Alumni application');modal.querySelector('button,input')?.focus();}
function closeModal(id){$(id).classList.add('hidden');lastFocus?.focus();}
function showToast(message){$('toastMsg').textContent=message;$('toast').classList.remove('translate-y-20','opacity-0');setTimeout(()=>$('toast').classList.add('translate-y-20','opacity-0'),5000);}
function switchTab(tab){document.querySelectorAll('.tab-content').forEach(e=>e.classList.toggle('active',e.id==='tab-'+tab));document.querySelectorAll('.nav-btn').forEach(b=>{b.classList.toggle('bg-slate-100',b.dataset.target===tab);b.setAttribute('aria-current',b.dataset.target===tab?'page':'false');});$('mobileMenu').classList.add('hidden');$('menuToggle').setAttribute('aria-expanded','false');window.scrollTo({top:0,behavior:'smooth'});}
function toggleMobileMenu(){const menu=$('mobileMenu');menu.classList.toggle('hidden');$('menuToggle').setAttribute('aria-expanded',String(!menu.classList.contains('hidden')));}
function toggleTheme(){const dark=document.documentElement.classList.toggle('dark');document.documentElement.classList.toggle('light',!dark);$('themeIcon').className=dark?'fas fa-sun text-amber-400':'fas fa-moon';}
function filterEvents(type){state.eventFilter=type;renderEvents();for(const [id,name]of Object.entries({btnEvtAll:'all',btnEvtUpcoming:'upcoming',btnEvtPast:'past'}))$(id).setAttribute('aria-pressed',String(type===name));}
Object.assign(window,{switchTab,toggleMobileMenu,toggleTheme,filterEvents,searchNotices:renderNotices,loadCabinet,openModal,closeModal,showToast});
document.addEventListener('click',e=>{const blog=e.target.closest('[data-blog]'),photo=e.target.closest('[data-photo]');if(blog){const b=content('posts').find(b=>b.id===blog.dataset.blog);$('blogModalContent').innerHTML=`<h2 class="text-2xl font-bold pr-8">${esc(b.title)}</h2><p class="text-sm my-4">By ${esc(b.author)}</p><p class="whitespace-pre-wrap">${esc(b.body)}</p>`;openModal('blogModal');}if(photo&&photo.dataset.photo){$('lightboxImg').src=photo.dataset.photo;openModal('lightboxModal');}});
document.addEventListener('keydown',e=>{const modal=[...document.querySelectorAll('[aria-modal="true"]')].find(m=>!m.classList.contains('hidden'));if(e.key==='Escape'){if(modal)closeModal(modal.id);$('mobileMenu').classList.add('hidden');$('menuToggle').setAttribute('aria-expanded','false');}if(e.key==='Tab'&&modal){const elements=[...modal.querySelectorAll('button,a,input,select,textarea')].filter(n=>!n.disabled),first=elements[0],last=elements.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
const containers={events:'eventsGrid',posts:'blogGrid',notices:'noticeContainer',cabinet:'generalBodyGrid',gallery:'galleryGrid',alumni:'alumniGrid'};
for(const kind of kinds){const button=document.createElement('button');button.className='secondary-button load-more';button.textContent='Load more '+kind;button.hidden=true;button.id='more-'+kind;$(containers[kind]).after(button);button.onclick=async()=>{button.disabled=true;try{const page=await api('public',{kind,cursor:state.cursors[kind]});const known=new Set(state.content[kind].map(i=>i.id));state.content[kind].push(...page.items.filter(i=>!known.has(i.id)));state.cursors[kind]=page.nextCursor;button.hidden=!page.nextCursor;render();}catch(e){showToast(e.message);}finally{button.disabled=false;}};}
function wireForm(id,kind,body){const form=$(id);let pending=false,key=null;form.addEventListener('input',()=>{if(!pending)key=null;});form.onsubmit=async e=>{e.preventDefault();if(pending||!state.live)return;pending=true;key||=crypto.randomUUID();const button=form.querySelector('button[type="submit"]'),status=form.querySelector('.form-status');button.disabled=true;status.textContent='Saving…';try{await api('submission',{kind,method:'POST',authenticated:true,body:body(form),key});form.reset();key=null;status.textContent=kind==='alumni'?'Application saved for review. Your profile is not public until approved.':'Saved to the society inbox. Thank you.';}catch(error){status.textContent=error.message;}finally{pending=false;button.disabled=false;}};}
wireForm('suggestionForm','suggestion',()=>({category:$('sugCategory').value,name:$('sugName').value,message:$('sugMessage').value}));
wireForm('contactForm','contact',form=>({name:form.querySelector('input[type="text"]').value,email:form.querySelector('input[type="email"]').value,message:form.querySelector('textarea').value}));
wireForm('alumniForm','alumni',()=>({name:$('almName').value,batch:$('almBatch').value,role:$('almRole').value,linkedin:$('almLinkedIn').value,consent:$('alumniConsent').checked}));
render();
try{
 const results=await Promise.all([api('public',{kind:'settings'}),...kinds.map(kind=>api('public',{kind}))]);const settings=results[0].data;state.session=settings?.currentSession||'2026-2027';
 kinds.forEach((kind,i)=>{state.content[kind]=results[i+1].items;state.cursors[kind]=results[i+1].nextCursor;$('more-'+kind).hidden=!state.cursors[kind];});
 document.querySelectorAll('[data-site-photo]').forEach(img=>{const photo=settings?.photos?.[img.dataset.sitePhoto];if(photo?.url&&safeImage(photo.url)){img.src=photo.url;img.alt=photo.alt;}});
 state.live=true;$('cabinetSessionSelect').value=state.session;render();document.querySelectorAll('button[type="submit"]').forEach(b=>b.disabled=false);$('data-status').textContent='Society content is connected. Sign in with a verified email to send submissions.';
}catch{$('data-status').textContent='Website preview — showing sample content while the database connection is being configured. Submissions are currently unavailable.';}
