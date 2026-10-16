import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { sampleContent } from '../client/sample.js';
import { fields,kinds,settingFields } from '../shared/content-schema.js';
import { escapeHTML,safeImage,safeLinkedIn } from '../client/api.js';
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
async function home(api){
 const dom=new JSDOM(readFileSync('index.html','utf8'),{url:'https://society.example'});dom.window.scrollTo=()=>{};
 const source=readFileSync('client/home.js','utf8').replace(/^import .*;\n/gm,'');
 await new AsyncFunction('document','window','api','esc','safeImage','safeLinkedIn','sampleContent','kinds',source)(dom.window.document,dom.window,api,escapeHTML,safeImage,safeLinkedIn,structuredClone(sampleContent),kinds);
 return dom;
}
test('homepage loads API data, enables forms and updates photo slots',async()=>{
 const dom=await home(async(action,{kind})=>kind==='settings'?{data:{currentSession:'2026-2027',photos:{hero:{url:'https://images.unsplash.com/test',alt:'Actual society photo'}}},version:1}:{items:[],nextCursor:null});
 const d=dom.window.document;assert.match(d.getElementById('data-status').textContent,/connected/);assert.equal(d.querySelector('[data-site-photo=hero]').alt,'Actual society photo');assert.equal(d.querySelector('#contactForm button[type=submit]').disabled,false);assert.match(d.getElementById('eventsGrid').textContent,/Nothing published/);
 dom.window.toggleMobileMenu();assert.equal(d.getElementById('menuToggle').getAttribute('aria-expanded'),'true');dom.window.switchTab('events');assert.equal(d.getElementById('menuToggle').getAttribute('aria-expanded'),'false');assert.ok(d.getElementById('tab-events').classList.contains('active'));dom.window.close();
});
test('backend failure labels sample content and keeps all forms disabled',async()=>{
 const dom=await home(async()=>{throw new Error('outage');});const d=dom.window.document;
 assert.match(d.getElementById('data-status').textContent,/sample content/);for(const button of d.querySelectorAll('button[type=submit]'))assert.equal(button.disabled,true);dom.window.close();
});
test('stored content cannot create HTML elements or executable hyperlinks',async()=>{
 const dom=await home(async(action,{kind})=>kind==='settings'?{data:null,version:0}:{items:kind==='notices'?[{id:'x',data:{title:'<img src=x onerror=alert(1)>',category:'News',description:'<script>alert(1)</script>'}}]:kind==='alumni'?[{id:'a',data:{title:'Member',linkedin:'javascript:alert(1)'}}]:[],nextCursor:null});
 const d=dom.window.document;assert.equal(d.querySelectorAll('#noticeContainer img, #noticeContainer script, #alumniGrid a').length,0);assert.match(d.getElementById('noticeContainer').textContent,/<img/);dom.window.close();
});
test('contact form waits for API success and reports persistence failure accurately',async()=>{
 let write;const dom=await home(async(action,options)=>{if(action==='submission'){write=options;throw Error('Service unavailable');}return options.kind==='settings'?{data:null,version:0}:{items:[],nextCursor:null};});
 const d=dom.window.document,form=d.getElementById('contactForm');form.querySelector('input[type=text]').value='Member';form.querySelector('input[type=email]').value='member@example.com';form.querySelector('textarea').value='Please share the event details.';
 await form.onsubmit({preventDefault(){}});assert.equal(write.kind,'contact');assert.equal(write.authenticated,true);assert.ok(write.key);assert.equal(form.querySelector('.form-status').textContent,'Service unavailable');assert.equal(form.querySelector('input[type=text]').value,'Member');dom.window.close();
});
test('admin photo editor saves five explicit slots and server version',async()=>{
 const dom=new JSDOM(readFileSync('admin.html','utf8'));const d=dom.window.document;let save;
 const api=async(action,options)=>{if(action==='me')return {role:'admin'};if(action==='settings-read')return {data:null,version:3};if(action==='settings'){save=options.body;return {version:4};}return {items:[],nextCursor:null};};
 const source=readFileSync('client/admin.js','utf8').replace(/^import .*;\n/gm,'');
 await new AsyncFunction('document','api','safeImage','fields','kinds','settingFields',source)(d,api,safeImage,fields,kinds,settingFields);
 assert.equal(d.getElementById('admin-panel').hidden,false);await d.querySelector('[data-panel=photos-panel]').onclick();
 d.getElementById('site-hero-url').value='https://images.unsplash.com/actual';d.getElementById('site-hero-alt').value='Society team';d.getElementById('photos-form').onsubmit({preventDefault(){}});await new Promise(setImmediate);
 assert.equal(save.version,3);assert.equal(save.data.photos.hero.alt,'Society team');assert.equal(Object.keys(save.data.photos).length,5);assert.match(d.getElementById('admin-status').textContent,/saved/);dom.window.close();
});

test('admin date picker and explicit publish save public visibility with useful confirmation',async()=>{
 const dom=new JSDOM(readFileSync('admin.html','utf8'));const d=dom.window.document;let saved;
 const api=async(action,options)=>{if(action==='me')return {role:'admin',uploadsEnabled:false};if(action==='content'){saved=options.body;return {id:'saved',version:1};}return {items:[],nextCursor:null};};
 const source=readFileSync('client/admin.js','utf8').replace(/^import .*;\n/gm,'');
 await new AsyncFunction('document','api','safeImage','fields','kinds','settingFields',source)(d,api,safeImage,fields,kinds,settingFields);
 assert.equal(d.getElementById('field-date').type,'date');
 d.getElementById('field-title').value='Society workshop';d.getElementById('field-date').value='2026-10-20';
 d.getElementById('content-form').onsubmit({preventDefault(){},submitter:d.querySelector('[data-publish]')});await new Promise(setImmediate);
 assert.equal(saved.content.status,'published');assert.equal(saved.content.data.date,'2026-10-20');
 assert.match(d.getElementById('admin-status').textContent,/Published and saved/);
 assert.equal(d.querySelector('input[type=file]').disabled,true);dom.window.close();
});

test('event dates normalize day-first input and reject impossible dates with a clear error',async()=>{
 const {validateContent}=await import('../server/schema.mjs');
 const event={kind:'events',status:'published',data:{title:'Workshop',date:'22-09-2026'}};
 assert.equal(validateContent(event).data.date,'2026-09-22');
 assert.throws(()=>validateContent({...event,data:{...event.data,date:'31-02-2026'}}),/valid event date/);
});
