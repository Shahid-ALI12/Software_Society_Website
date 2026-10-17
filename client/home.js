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
// Scroll-reveal: toggle .is-visible on .reveal-up elements every time they
// enter/leave the viewport — works in BOTH scroll directions.
//   - Scrolling DOWN  -> element enters from bottom -> fade IN
//   - Scrolling UP    -> element leaves from bottom -> fade OUT
//                        -> element re-enters from top -> fade IN again
// The IntersectionObserver fires on every enter/leave with rootMargin
// applied on BOTH top and bottom, so the animation triggers whether the
// element scrolls in from the top OR the bottom of the viewport.
// Respects reduced-motion (CSS shows them at the final state with no transition).
function initRevealOnScroll(){
 const targets=document.querySelectorAll('.reveal-up');if(!targets.length)return;
 if(!('IntersectionObserver' in window)){targets.forEach(t=>t.classList.add('is-visible'));return;}
 const io=new IntersectionObserver((entries)=>{
  entries.forEach(e=>{
   if(e.isIntersecting){
    // Element is at least 12% visible (from either direction) -> reveal
    e.target.classList.add('is-visible');
   }else{
    // Element has fully left the viewport -> reset so the next entrance
    // (down OR up) replays the fade-in animation.
    e.target.classList.remove('is-visible');
   }
  });
  // Symmetric rootMargin: -8% top AND -8% bottom so the trigger point is
  // equally fair regardless of scroll direction.
 },{rootMargin:'-8% 0px -8% 0px',threshold:0.12});
 targets.forEach(t=>io.observe(t));
}
const empty='<p class="empty-state">Nothing published here yet.</p>';
const card='bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm';
function image(data,classes='w-full h-56 sm:h-64 object-cover'){const url=safeImage(data.image);return url?`<img src="${esc(url)}" alt="${esc(data.alt||data.title)}" loading="lazy" decoding="async" class="${classes}">`:'';}
function content(kind){return state.content[kind].map(item=>({...item.data,id:item.id}));}
function render(){renderHome();renderEvents();renderNotices();loadCabinet();renderAlumni();renderFeatured();initRevealOnScroll();}
function renderHome(){
 $('home-session')&&($('home-session').textContent='Session '+state.session+' Society Leadership');
 // Show only 3 members on the homepage Core Executive Body strip.
 // Filter by placement: only 'homepage' or 'both' (or missing = old data = both).
 const core=content('cabinet').filter(m=>m.session===state.session&&m.group==='core'&&(m.placement==='homepage'||m.placement==='both'||!m.placement)).sort((a,b)=>(Number(a.displayOrder)||0)-(Number(b.displayOrder)||0)).slice(0,3);
 if($('homeExecutiveGrid'))$('homeExecutiveGrid').innerHTML=core.map(m=>`<article class="profile-card rounded-2xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 text-center"><div class="avatar-ring w-36 h-36 sm:w-44 sm:h-44 md:w-48 md:h-48 mx-auto mb-5">${image(m,'w-full h-full')}</div><h3 class="font-bold text-lg sm:text-xl text-slate-900 dark:text-white">${esc(m.title)}</h3><div class="role-label mt-2">${esc(m.role)}</div></article>`).join('')||empty;
 if($('blogGrid'))$('blogGrid').innerHTML=content('posts').map(b=>`<button type="button" class="blog-card rounded-2xl p-5 border border-slate-200 dark:border-slate-800 text-left space-y-3" data-blog="${esc(b.id)}"><div class="blog-image">${image(b,'w-full h-56 sm:h-64 lg:h-72 object-cover')}</div><h3 class="font-bold text-lg text-slate-900 dark:text-white">${esc(b.title)}</h3><p class="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">${esc(b.description)}</p><p class="text-sm text-blue-600 dark:text-blue-400 font-medium">By ${esc(b.author)} &rarr;</p></button>`).join('')||empty;
 const t=state.settings?.texts||{};
 if(t.hodName){const el=$('hod-name');if(el)el.textContent=t.hodName;}
 if(t.hodTitle){const el=$('hod-title');if(el)el.textContent=t.hodTitle;}
 if(t.hodMessage){const el=$('hod-message');if(el){el.textContent='\u201C'+t.hodMessage+'\u201D';el.classList.add('italic');}}
 if(t.convenierName){const el=$('convenier-name');if(el)el.textContent=t.convenierName;}
 if(t.convenierTitle){const el=$('convenier-title');if(el)el.textContent=t.convenierTitle;}
 if(t.convenierMessage){const el=$('convenier-message');if(el){el.textContent='\u201C'+t.convenierMessage+'\u201D';el.classList.add('italic');}}
}
function renderEvents(){
 const today=new Date().toISOString().slice(0,10);
 const list=content('events').filter(e=>state.eventFilter==='all'||(new Date(e.date).getTime()>=new Date(today).getTime()?'upcoming':'past')===state.eventFilter);
 if($('eventsGrid'))$('eventsGrid').innerHTML=list.map(e=>`<article class="${card} overflow-hidden">${image(e,'w-full h-56 sm:h-64 object-cover rounded-xl')}<div class="space-y-3 mt-4"><p class="text-xs text-blue-600">${esc(e.date)}</p><h3 class="font-bold text-lg">${esc(e.title)}</h3><p class="text-sm text-slate-500 whitespace-pre-wrap">${esc(e.description)}</p><p class="text-xs text-slate-500">${esc(e.location)}</p></div></article>`).join('')||empty;
 if($('galleryGrid'))$('galleryGrid').innerHTML=content('gallery').map(e=>`<button type="button" data-photo="${esc(safeImage(e.image))}" aria-label="View ${esc(e.alt||e.title)}" class="rounded-xl overflow-hidden text-left group">${image(e,'w-full h-48 sm:h-56 md:h-64 object-cover transition duration-300 group-hover:scale-105')}<p class="text-sm sm:text-base p-3">${esc(e.title)}</p></button>`).join('')||empty;
}
function renderNotices(){const query=$('noticeSearch')?$('noticeSearch').value.toLowerCase():'';if($('noticeContainer'))$('noticeContainer').innerHTML=content('notices').filter(n=>(n.title+' '+n.description).toLowerCase().includes(query)).map(n=>`<article class="${card} space-y-3"><span class="text-xs text-blue-600">${esc(n.category)}</span><h3 class="font-bold">${esc(n.title)}</h3><p class="text-sm text-slate-500 whitespace-pre-wrap">${esc(n.description)}</p></article>`).join('')||empty;}
function loadCabinet(){
 const select=$('cabinetSessionSelect');if(!select)return;
 const sessions=[...new Set(content('cabinet').map(m=>m.session))].sort().reverse();const previous=select.value;
 select.replaceChildren(...sessions.map(s=>{const o=document.createElement('option');o.value=s;o.textContent=s;return o;}));select.value=sessions.includes(previous)?previous:sessions.includes(state.session)?state.session:sessions[0]||'';

 // Filter by session + placement (cabinet or both or missing=old data).
 const allMembers=content('cabinet').filter(m=>m.session===select.value&&(m.placement==='cabinet'||m.placement==='both'||!m.placement));

 // Determine row for each member.
 // - If member has a `row` field, use it.
 // - Else (old data) infer: core displayOrder 0 = row 1, core >0 = row 2,
 //   exec = row 3, general = row 4.
 const withRows=allMembers.map(m=>{
  let row=Number(m.row);
  if(!Number.isSafeInteger(row)||row<1){
   if(m.group==='core') row=(Number(m.displayOrder)||0)===0?1:2;
   else if(m.group==='exec') row=3;
   else row=4;
  }
  return {...m,_row:row};
 });

 // Group members by row number.
 const rowMap={};
 withRows.forEach(m=>{if(!rowMap[m._row])rowMap[m._row]=[];rowMap[m._row].push(m);});

 // Sort rows ascending; within each row sort by displayOrder.
 const sortedRowNums=Object.keys(rowMap).map(Number).sort((a,b)=>a-b);

 // Render into #cabinetRows — each row is a flex container.
 const rowsWrap=$('cabinetRows');if(!rowsWrap)return;
 rowsWrap.replaceChildren();
 if(!sortedRowNums.length){rowsWrap.innerHTML=empty;return;}

 sortedRowNums.forEach(rowNum=>{
  // Before row 3 (heads level), insert a left-aligned "All Heads" label.
  if(rowNum===3){
   const head=document.createElement('div');
   head.className='cabinet-section-head';
   head.innerHTML='<i class="fas fa-users-cog"></i> All Heads';
   rowsWrap.append(head);
  }
  const members=rowMap[rowNum].sort((a,b)=>(Number(a.displayOrder)||0)-(Number(b.displayOrder)||0));
  const rowDiv=document.createElement('div');
  rowDiv.className='cabinet-row';
  rowDiv.dataset.row=String(rowNum);
  rowDiv.innerHTML=members.map(m=>`<div class="cab-photo-wrap" data-bio-id="${esc(m.id)}" style="cursor:pointer;" title="Click to view biography"><div class="avatar-ring">${image(m,'w-full h-full')}</div><div class="cab-info"><div class="name">${esc(m.title)}</div><div class="role-label">${esc(m.role)}</div></div></div>`).join('');
  rowsWrap.append(rowDiv);
 });
 // Add click listeners to all cabinet photos — opens the bio modal.
 rowsWrap.querySelectorAll('[data-bio-id]').forEach(el=>{
  el.onclick=()=>{
   const id=el.dataset.bioId;
   const member=content('cabinet').find(m=>m.id===id);
   if(member) openBioModal(member);
  };
 });
}
function renderAlumni(){if(!$('alumniGrid'))return;$('alumniGrid').innerHTML=content('alumni').map(a=>`<article class="profile-card rounded-2xl p-5 border border-slate-200 dark:border-slate-800 space-y-3 text-center"><div class="avatar-ring w-28 h-28 sm:w-32 sm:h-32 mx-auto">${image(a,'w-full h-full')}</div><h3 class="font-bold text-slate-900 dark:text-white">${esc(a.title)}</h3><p class="text-xs text-slate-500 dark:text-slate-400">Batch: ${esc(a.batch)}</p><p class="text-sm text-slate-700 dark:text-slate-300">${esc(a.role)}</p>${safeLinkedIn(a.linkedin)?`<a href="${esc(safeLinkedIn(a.linkedin))}" target="_blank" rel="noopener noreferrer" class="inline-block text-blue-600 dark:text-blue-400 text-sm font-medium hover:underline">Connect on LinkedIn &rarr;</a>`:''}</article>`).join('')||empty;}
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
  pane.innerHTML=items.map(p=>`<article class="profile-card rounded-2xl p-5 border border-slate-200 dark:border-slate-800 text-center"><div class="avatar-ring w-28 h-28 sm:w-32 sm:h-32 mx-auto mb-4">${image(p,'w-full h-full')}</div><h3 class="font-bold text-slate-900 dark:text-white">${esc(p.title)}</h3><p class="text-sm text-blue-600 dark:text-blue-400 mt-0.5">${esc(p.role)}</p></article>`).join('')||empty;
  tabs.append(tab);panel.append(pane);
 });
}
let lastFocus;
function openModal(id){lastFocus=document.activeElement;const modal=$(id);modal.classList.remove('hidden');modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label',id==='blogModal'?'Article':id==='lightboxModal'?'Photo preview':id==='bioModal'?'Member biography':'Alumni application');modal.querySelector('button,input')?.focus();}
function closeModal(id){$(id).classList.add('hidden');lastFocus?.focus();}
function showToast(message){$('toastMsg').textContent=message;$('toast').classList.remove('translate-y-20','opacity-0');setTimeout(()=>$('toast').classList.add('translate-y-20','opacity-0'),5000);}
// Open the biography modal for a cabinet member.
function openBioModal(member){
 const content=$('bioModalContent');if(!content)return;
 content.innerHTML=`
  <div class="flex flex-col items-center text-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
   <div class="w-36 h-36 sm:w-40 sm:h-40 rounded-full overflow-hidden shadow-xl">${member.image?`<img src="${esc(safeImage(member.image))}" alt="${esc(member.alt||member.title)}" class="w-full h-full object-cover">`:`<div class="w-full h-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-400 text-4xl"><i class="fas fa-user"></i></div>`}</div>
   <div>
    <h2 class="text-2xl font-extrabold text-slate-900 dark:text-white">${esc(member.title)}</h2>
    <p class="text-sm text-indigo-600 dark:text-indigo-400 font-semibold mt-1">${esc(member.role)}</p>
   </div>
  </div>
  <div class="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">${member.bio?esc(member.bio):'No biography available yet for this member.'}</div>
 `;
 openModal('bioModal');
}
function switchTab(tab){document.querySelectorAll('.tab-content').forEach(e=>e.classList.toggle('active',e.id==='tab-'+tab));document.querySelectorAll('.nav-btn').forEach(b=>{b.classList.toggle('active',b.dataset.target===tab);b.setAttribute('aria-current',b.dataset.target===tab?'page':'false');});$('mobileMenu').classList.add('hidden');$('menuToggle').setAttribute('aria-expanded','false');window.scrollTo({top:0,behavior:'smooth'});
 // Push tab changes to history so the phone's native back button (and our
 // floating Back FAB) can navigate between tabs the way users expect.
 if(history.state?.tab!==tab){history.pushState({tab},'','/#'+tab);}
}
function toggleMobileMenu(){const menu=$('mobileMenu');menu.classList.toggle('hidden');$('menuToggle').setAttribute('aria-expanded',String(!menu.classList.contains('hidden')));}
// Dark mode toggle removed per owner request — site always stays in light mode.
// Mobile floating-action buttons: Back (uses history), Top (scrolls up).
// Back falls back to Home tab if there's no tab history (e.g. deep-linked).
function goBack(){if(history.state?.tab&&history.state.tab!=='home'){window.history.back();}else{switchTab('home');}}
function scrollToTop(){window.scrollTo({top:0,behavior:'smooth'});}
// Listen for popstate so when the user hits the phone's native Back button
// (or our floating Back button) we restore the previous tab instead of
// leaving the site entirely on the first back press.
window.addEventListener('popstate',(e)=>{const tab=e.state?.tab||'home';document.querySelectorAll('.tab-content').forEach(el=>el.classList.toggle('active',el.id==='tab-'+tab));document.querySelectorAll('.nav-btn').forEach(b=>{b.classList.toggle('active',b.dataset.target===tab);b.setAttribute('aria-current',b.dataset.target===tab?'page':'false');});window.scrollTo({top:0,behavior:'smooth'});});
// Show the "scroll to top" FAB only after the user has scrolled down.
window.addEventListener('scroll',()=>{const fab=document.querySelector('.fab-top');if(!fab)return;fab.classList.toggle('is-visible',window.scrollY>400);},{passive:true});
function filterEvents(type){state.eventFilter=type;renderEvents();for(const [id,name]of Object.entries({btnEvtAll:'all',btnEvtUpcoming:'upcoming',btnEvtPast:'past'}))$(id).setAttribute('aria-pressed',String(type===name));}
Object.assign(window,{switchTab,toggleMobileMenu,filterEvents,searchNotices:renderNotices,loadCabinet,openModal,closeModal,showToast,goBack,scrollToTop,openBioModal});
document.addEventListener('click',e=>{
 // Close any open modal when clicking on the dark overlay (not the card itself).
 const openModalEl=[...document.querySelectorAll('[aria-modal="true"]')].find(m=>!m.classList.contains('hidden'));
 if(openModalEl&&e.target===openModalEl){closeModal(openModalEl.id);return;}
 const blog=e.target.closest('[data-blog]'),photo=e.target.closest('[data-photo]');
 if(blog){const b=content('posts').find(b=>b.id===blog.dataset.blog);$('blogModalContent').innerHTML=`<h2 class="text-2xl font-bold pr-8">${esc(b.title)}</h2><p class="text-sm my-4">By ${esc(b.author)}</p><p class="whitespace-pre-wrap">${esc(b.body)}</p>`;openModal('blogModal');}
 if(photo&&photo.dataset.photo){$('lightboxImg').src=photo.dataset.photo;openModal('lightboxModal');}
});
document.addEventListener('keydown',e=>{const modal=[...document.querySelectorAll('[aria-modal="true"]')].find(m=>!m.classList.contains('hidden'));if(e.key==='Escape'){if(modal)closeModal(modal.id);$('mobileMenu').classList.add('hidden');$('menuToggle').setAttribute('aria-expanded','false');}if(e.key==='Tab'&&modal){const elements=[...modal.querySelectorAll('button,a,input,select,textarea')].filter(n=>!n.disabled),first=elements[0],last=elements.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
const containers={events:'eventsGrid',posts:'blogGrid',notices:'noticeContainer',cabinet:'generalBodyGrid',gallery:'galleryGrid',alumni:'alumniGrid',featured:'featuredPanel'};
for(const kind of kinds){const button=document.createElement('button');button.className='secondary-button load-more';button.textContent='Load more '+kind;button.hidden=true;button.id='more-'+kind;const fallback=$(containers[kind])||$('featuredPanel');if(fallback)fallback.after(button);button.onclick=async()=>{button.disabled=true;try{const page=await api('public',{kind,cursor:state.cursors[kind]});const known=new Set(state.content[kind].map(i=>i.id));state.content[kind].push(...page.items.filter(i=>!known.has(i.id)));state.cursors[kind]=page.nextCursor;button.hidden=!page.nextCursor;render();}catch(e){showToast(e.message);}finally{button.disabled=false;}};}
function wireForm(id,kind,body){const form=$(id);if(!form)return;/* form may be absent on this page — skip wiring instead of crashing */
let pending=false,key=null;form.addEventListener('input',()=>{if(!pending)key=null;});form.onsubmit=async e=>{e.preventDefault();if(pending||!state.live)return;pending=true;key||=crypto.randomUUID();const button=form.querySelector('button[type="submit"]'),status=form.querySelector('.form-status');if(button)button.disabled=true;if(status)status.textContent='Saving…';try{await api('submission',{kind,method:'POST',authenticated:true,body:body(form),key});form.reset();key=null;if(status)status.textContent=kind==='alumni'?'Application saved for review. Your profile is not public until approved.':'Saved to the society inbox. Thank you.';}catch(error){if(status)status.textContent=error.message;}finally{pending=false;if(button)button.disabled=false;}};}
wireForm('suggestionForm','suggestion',()=>{const cat=$('sugCategory');return {category:cat?cat.value:'general',name:$('sugName')?.value||'',email:$('sugEmail')?.value||'',message:$('sugMessage')?.value||''};});
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
 // Auto-load ALL cabinet pages so all 25+ members show at once (no "Load more" button).
 if(state.cursors['cabinet']){
  let cursor=state.cursors['cabinet'];
  while(cursor){
   try{
    const more=await api('public',{kind:'cabinet',cursor,timeoutMs:12000});
    const known=new Set(state.content['cabinet'].map(i=>i.id));
    state.content['cabinet'].push(...more.items.filter(i=>!known.has(i.id)));
    cursor=more.nextCursor;
   }catch{break;}
  }
  state.cursors['cabinet']=null;
  const mb=$('more-cabinet');if(mb)mb.hidden=true;
 }
 state.live=true;$('cabinetSessionSelect').value=state.session;render();document.querySelectorAll('button[type="submit"]').forEach(b=>b.disabled=false);
 const ds=$('data-status');if(ds) ds.textContent='Society content is connected. Sign in with a verified email to send submissions.';
}catch{
 const ds=$('data-status');if(ds) ds.textContent='Website preview — showing sample content while the database connection is being configured. Submissions are currently unavailable.';
}
hideBrandLoader();
