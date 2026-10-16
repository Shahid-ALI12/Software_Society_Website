import './styles.css';
import { api,escapeHTML as esc,safeImage,safeLinkedIn } from './api.js';
import { sampleContent } from './sample.js';
import { kinds, featuredGroups } from '../shared/content-schema.js';
const $=id=>document.getElementById(id),state={content:sampleContent,cursors:{},eventFilter:'all',live:false,session:'2025-2026',settings:null};
// Brand loader: fade out once the homepage has either loaded its content or
// fallen back to sample data. Also has a hard safety timeout (8s) so the
// overlay never strands a visitor if a script error blocks the ready path.
// 8s matches the worst-case API round-trip (cold Firebase start) so the
// loader stays visible until real content is ready, not sample content.
function hideBrandLoader(){
 const loader=$('brand-loader');if(!loader||loader.classList.contains('hidden-loader'))return;
 loader.classList.add('hidden-loader');
 loader.setAttribute('aria-hidden','true');
 // Remove from the accessibility tree entirely after the fade so screen
 // readers never announce a phantom loading state.
 setTimeout(()=>{loader.remove?.();},700);
}
setTimeout(hideBrandLoader,8000);
// Scroll-reveal: add .is-visible to .reveal-up elements when they enter the
// viewport. Respects reduced-motion (CSS already shows them at final state).
function initRevealOnScroll(){
 const targets=document.querySelectorAll('.reveal-up');if(!targets.length)return;
 if(!('IntersectionObserver' in window)){targets.forEach(t=>t.classList.add('is-visible'));return;}
 const io=new IntersectionObserver((entries)=>{entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-visible');io.unobserve(e.target);}});},{rootMargin:'0px 0px -8% 0px',threshold:0.12});
 targets.forEach(t=>io.observe(t));
}
const empty='<p class="empty-state">Nothing published here yet.</p>';
const card='bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm';
function image(data,classes='w-full h-56 sm:h-64 object-cover'){const url=safeImage(data.image);return url?`<img src="${esc(url)}" alt="${esc(data.alt||data.title)}" loading="lazy" decoding="async" class="${classes}">`:'';}
function content(kind){return state.content[kind].map(item=>({...item.data,id:item.id}));}
function render(){renderHome();renderEvents();renderNotices();loadCabinet();renderAlumni();renderFeatured();initRevealOnScroll();}
function renderHome(){
 $('home-session').textContent='Session '+state.session+' Society Leadership';
 const core=content('cabinet').filter(m=>m.session===state.session&&m.group==='core').slice(0,4);
 $('homeExecutiveGrid').innerHTML=core.map(m=>`<article class="${card} text-center">${image(m,'w-28 h-28 sm:w-32 sm:h-32 mx-auto rounded-full object-cover mb-4')}<h3 class="font-bold">${esc(m.title)}</h3><p class="text-sm text-blue-600">${esc(m.role)}</p></article>`).join('')||empty;
 $('blogGrid').innerHTML=content('posts').map(b=>`<button type="button" class="${card} text-left space-y-3" data-blog="${esc(b.id)}">${image(b,'w-full h-56 sm:h-64 lg:h-72 object-cover rounded-xl')}<h3 class="font-bold text-lg">${esc(b.title)}</h3><p class="text-sm text-slate-500">${esc(b.description)}</p><p class="text-sm">By ${esc(b.author)} →</p></button>`).join('')||empty;
 // Drive the HOD block from saved settings instead of hardcoded HTML so the admin
 // panel can update the name, title and message without editing index.html.
 const t=state.settings?.texts||{};
 if(t.hodName){const el=$('hod-name');if(el)el.textContent=t.hodName;}
 if(t.hodTitle){const el=$('hod-title');if(el)el.textContent=t.hodTitle;}
 if(t.hodMessage){const el=$('hod-message');if(el){el.textContent='"'+t.hodMessage+'"';el.classList.add('italic');}}
}
function renderEvents(){
 const today=new Date().toISOString().slice(0,10);
 const list=content('events').filter(e=>state.eventFilter==='all'||(new Date(e.date).getTime()>=new Date(today).getTime()?'upcoming':'past')===state.eventFilter);
 $('eventsGrid').innerHTML=list.map(e=>`<article class="${card} overflow-hidden">${image(e,'w-full h-56 sm:h-64 object-cover rounded-xl')}<div class="space-y-3 mt-4"><p class="text-xs text-blue-600">${esc(e.date)}</p><h3 class="font-bold text-lg">${esc(e.title)}</h3><p class="text-sm text-slate-500 whitespace-pre-wrap">${esc(e.description)}</p><p class="text-xs text-slate-500">${esc(e.location)}</p></div></article>`).join('')||empty;
 $('galleryGrid').innerHTML=content('gallery').map(e=>`<button type="button" data-photo="${esc(safeImage(e.image))}" aria-label="View ${esc(e.alt||e.title)}" class="rounded-xl overflow-hidden text-left group">${image(e,'w-full h-48 sm:h-56 md:h-64 object-cover transition duration-300 group-hover:scale-105')}<p class="text-sm sm:text-base p-3">${esc(e.title)}</p></button>`).join('')||empty;
}
function renderNotices(){const query=$('noticeSearch').value.toLowerCase();$('noticeContainer').innerHTML=content('notices').filter(n=>(n.title+' '+n.description).toLowerCase().includes(query)).map(n=>`<article class="${card} space-y-3"><span class="text-xs text-blue-600">${esc(n.category)}</span><h3 class="font-bold">${esc(n.title)}</h3><p class="text-sm text-slate-500 whitespace-pre-wrap">${esc(n.description)}</p></article>`).join('')||empty;}
function loadCabinet(){
 const sessions=[...new Set(content('cabinet').map(m=>m.session))].sort().reverse(),select=$('cabinetSessionSelect');const previous=select.value;
 select.replaceChildren(...sessions.map(s=>{const o=document.createElement('option');o.value=s;o.textContent=s;return o;}));select.value=sessions.includes(previous)?previous:sessions.includes(state.session)?state.session:sessions[0]||'';
 for(const[group,id]of Object.entries({core:'coreBodyGrid',exec:'executiveBodyGrid',general:'generalBodyGrid'}))$(id).innerHTML=content('cabinet').filter(m=>m.session===select.value&&m.group===group).map(m=>`<article class="${card} text-center">${image(m,'w-32 h-32 sm:w-36 sm:h-36 mx-auto rounded-xl object-cover mb-4')}<h3 class="font-bold">${esc(m.title)}</h3><p class="text-sm text-blue-600">${esc(m.role)}</p></article>`).join('')||empty;
}
function renderAlumni(){$('alumniGrid').innerHTML=content('alumni').map(a=>`<article class="${card} space-y-3">${image(a,'w-28 h-28 sm:w-32 sm:h-32 rounded-full object-cover')}<h3 class="font-bold">${esc(a.title)}</h3><p class="text-xs text-slate-500">Batch: ${esc(a.batch)}</p><p class="text-sm">${esc(a.role)}</p>${safeLinkedIn(a.linkedin)?`<a href="${esc(safeLinkedIn(a.linkedin))}" target="_blank" rel="noopener noreferrer" class="text-blue-600 text-sm underline">Connect on LinkedIn</a>`:''}</article>`).join('')||empty;}
// Featured people: render one tab per group (HOD, Director, Patrons, Dean, etc.).
// Each tab shows the published featured members for that group, sorted by displayOrder.
// When no featured members exist for any group the entire section is hidden so the
// homepage stays clean for societies that haven't populated it yet.
function renderFeatured(){
 const wrap=$('featuredSection');
 if(!wrap)return;
 const all=content('featured');
 if(!all.length){wrap.hidden=true;return;}
 wrap.hidden=false;
 const groups=Object.keys(featuredGroups).filter(g=>all.some(p=>p.group===g));
 if(!groups.length){wrap.hidden=true;return;}
 const tabs=$('featuredTabs');tabs.replaceChildren();
 const panel=$('featuredPanel');panel.replaceChildren();
 groups.forEach((g,i)=>{
  const tab=document.createElement('button');tab.type='button';tab.className='featured-tab'+(i===0?' active':'');tab.textContent=featuredGroups[g];tab.dataset.group=g;tab.onclick=()=>{document.querySelectorAll('.featured-tab').forEach(b=>b.classList.toggle('active',b===tab));document.querySelectorAll('.featured-pane').forEach(p=>p.hidden=p.dataset.group!==g);};
  const pane=document.createElement('div');pane.className='featured-pane'+(i===0?'':' hidden-Pane');pane.dataset.group=g;pane.hidden=i!==0;
  const items=all.filter(p=>p.group===g).sort((a,b)=>(Number(a.displayOrder)||0)-(Number(b.displayOrder)||0));
  pane.innerHTML=items.map(p=>`<article class="${card} text-center">${image(p,'w-28 h-28 sm:w-32 sm:h-32 mx-auto rounded-full object-cover mb-4')}<h3 class="font-bold">${esc(p.title)}</h3><p class="text-sm text-blue-600">${esc(p.role)}</p></article>`).join('')||empty;
  tabs.append(tab);panel.append(pane);
 });
}
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
const containers={events:'eventsGrid',posts:'blogGrid',notices:'noticeContainer',cabinet:'generalBodyGrid',gallery:'galleryGrid',alumni:'alumniGrid',featured:'featuredPanel'};
for(const kind of kinds){const button=document.createElement('button');button.className='secondary-button load-more';button.textContent='Load more '+kind;button.hidden=true;button.id='more-'+kind;const fallback=$(containers[kind])||$('featuredPanel');if(fallback)fallback.after(button);button.onclick=async()=>{button.disabled=true;try{const page=await api('public',{kind,cursor:state.cursors[kind]});const known=new Set(state.content[kind].map(i=>i.id));state.content[kind].push(...page.items.filter(i=>!known.has(i.id)));state.cursors[kind]=page.nextCursor;button.hidden=!page.nextCursor;render();}catch(e){showToast(e.message);}finally{button.disabled=false;}};}
function wireForm(id,kind,body){const form=$(id);let pending=false,key=null;form.addEventListener('input',()=>{if(!pending)key=null;});form.onsubmit=async e=>{e.preventDefault();if(pending||!state.live)return;pending=true;key||=crypto.randomUUID();const button=form.querySelector('button[type="submit"]'),status=form.querySelector('.form-status');button.disabled=true;status.textContent='Saving…';try{await api('submission',{kind,method:'POST',authenticated:true,body:body(form),key});form.reset();key=null;status.textContent=kind==='alumni'?'Application saved for review. Your profile is not public until approved.':'Saved to the society inbox. Thank you.';}catch(error){status.textContent=error.message;}finally{pending=false;button.disabled=false;}};}
wireForm('suggestionForm','suggestion',()=>({category:$('sugCategory').value,name:$('sugName').value,message:$('sugMessage').value}));
wireForm('contactForm','contact',form=>({name:form.querySelector('input[type="text"]').value,email:form.querySelector('input[type="email"]').value,message:form.querySelector('textarea').value}));
wireForm('alumniForm','alumni',()=>({name:$('almName').value,batch:$('almBatch').value,role:$('almRole').value,linkedin:$('almLinkedIn').value,consent:$('alumniConsent').checked}));
render();
// Load settings + every content kind in parallel. Each request is independent
// so a single failing endpoint doesn't block the others. IMPORTANT: if a
// request fails we keep the existing sample content for that kind instead of
// wiping it to an empty array — otherwise visitors see "Nothing published
// here yet." when the backend is just slow, not broken.
//
// Retry: each public read gets up to 2 attempts (initial + 1 retry). This
// covers transient cold-start timeouts on Vercel serverless + Firebase.
async function fetchPublic(kind){
 for(let attempt=0;attempt<2;attempt++){
  try{return await api('public',{kind,timeoutMs:12000});}
  catch(e){if(attempt===1)return null;/* keep sample content on 2nd failure */}
 }
 return null;
}
try{
 const settingsReq=fetchPublic('settings');
 const kindReqs=kinds.map(kind=>fetchPublic(kind));
 const [settingsResult,...kindResults]=await Promise.all([settingsReq,...kindReqs]);
 if(settingsResult){
  const settings=settingsResult.data;state.session=settings?.currentSession||'2026-2027';state.settings=settings;
  document.querySelectorAll('[data-site-photo]').forEach(img=>{const photo=settings?.photos?.[img.dataset.sitePhoto];if(photo?.url&&safeImage(photo.url)){img.src=photo.url;img.alt=photo.alt;}});
 }
 kinds.forEach((kind,i)=>{const result=kindResults[i];if(result&&Array.isArray(result.items)){state.content[kind]=result.items;state.cursors[kind]=result.nextCursor;$('more-'+kind).hidden=!result.nextCursor;}});
 state.live=true;$('cabinetSessionSelect').value=state.session;render();document.querySelectorAll('button[type="submit"]').forEach(b=>b.disabled=false);
 $('data-status').textContent='Society content is connected. Sign in with a verified email to send submissions.';
}catch{
 $('data-status').textContent='Website preview — showing sample content while the database connection is being configured. Submissions are currently unavailable.';
}
hideBrandLoader();
