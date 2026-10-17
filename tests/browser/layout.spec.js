import {test,expect} from '@playwright/test';
const settings={data:{currentSession:'2026-2027',photos:{}},version:0};
async function publicAPI(page){
 await page.route('**/api/portal?*',route=>{const kind=new URL(route.request().url()).searchParams.get('kind');return route.fulfill({json:kind==='settings'?settings:{items:kind==='events'?[{id:'event1',data:{title:'A very long society event title to verify narrow screen wrapping',date:'2026-12-20',description:'Workshop for members',location:'Campus'}}]:[],nextCursor:null}});});
 await page.route('https://images.unsplash.com/**',r=>r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400"><rect width="800" height="400" fill="#233d63"/></svg>'}));
}
for(const width of [360,390,768,1024,1440])test('public pages fit '+width+'px',async({page})=>{
 await page.setViewportSize({width,height:900});await publicAPI(page);const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await expect(page.locator('#data-status')).toContainText('connected');
 for(const tab of ['home','events','notices','cabinet','alumni','about','suggestion','contact']){
  await page.evaluate(tab=>window.switchTab(tab),tab);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 }
 if(width<1280){await page.locator('#menuToggle').click();await expect(page.locator('#menuToggle')).toHaveAttribute('aria-expanded','true');await page.locator('#mobileMenu').getByRole('button',{name:'Events & Gallery'}).click();await expect(page.locator('#mobileMenu')).toBeHidden();}
 expect(errors).toEqual([]);
 if(width===390){await page.evaluate(()=>window.switchTab('home'));await page.screenshot({path:'test-results/mobile-home.png',fullPage:true});}
});
test('unconfigured backend shows sample notice and disables forms',async({page})=>{
 await page.route('**/api/portal?*',r=>r.fulfill({status:503,json:{message:'Not configured'}}));await page.goto('/');await expect(page.locator('#data-status')).toContainText('sample content');await expect(page.locator('#suggestionForm button[type=submit]')).toBeDisabled();
});
test('photo editor fits phone and saves chosen photo URL',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 // UI-only fixture: replace the client adapter; server authorization is covered separately.
 await page.route('**/client/api.js',async route=>{const response=await route.fetch();const source=await response.text();await route.fulfill({response,body:source.replace(/if\s*\(authenticated\)\s*\{[\s\S]*?headers.Authorization[\s\S]*?\n\s*\}/,'')});});
 let saved;
 await page.route('**/api/portal?*',route=>{const action=new URL(route.request().url()).searchParams.get('action');if(action==='settings'){saved=route.request().postDataJSON();return route.fulfill({json:{version:1}});}return route.fulfill({json:action==='me'?{role:'admin'}:action==='settings-read'?settings:{items:[],nextCursor:null}});});
 await page.goto('/admin.html');await expect(page.locator('#admin-panel')).toBeVisible();await page.getByRole('button',{name:'Website photos',exact:true}).click();await page.locator('#site-hero-url').fill('https://images.unsplash.com/photo-123');await page.locator('#site-hero-alt').fill('Society team at campus');await page.getByRole('button',{name:'Save website photos',exact:true}).click();await expect(page.locator('#admin-status')).toContainText('saved');expect(saved.data.photos.hero.alt).toBe('Society team at campus');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.screenshot({path:'test-results/mobile-admin.png',fullPage:true});
});
test('hostile content is rendered as text and cannot inject scripts or links',async({page})=>{
 await page.route('**/api/portal?*',r=>{const kind=new URL(r.request().url()).searchParams.get('kind');return r.fulfill({json:kind==='settings'?settings:{items:kind==='notices'?[{id:'test',data:{title:'<img src=x onerror=alert(1)>',category:'News',description:'<script>bad()</script>'}}]:[],nextCursor:null}});});await page.goto('/');await expect(page.locator('#data-status')).toContainText('connected');await page.evaluate(()=>window.switchTab('notices'));await expect(page.locator('#noticeContainer')).toContainText('<img src=x');await expect(page.locator('#noticeContainer img')).toHaveCount(0);
});
