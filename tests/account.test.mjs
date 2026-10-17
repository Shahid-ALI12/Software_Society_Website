import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { mountAccount, errorMessage } from '../client/account-controller.js';
function setup(overrides = {}) {
  const doc = new JSDOM(readFileSync(new URL('../account.html', import.meta.url), 'utf8')).window.document;
  let observer;
  const service = { observe(cb) { observer = cb; cb(null); return () => {}; }, ...overrides };
  mountAccount(doc, service);
  doc.getElementById('email').value = 'member@example.com';
  doc.getElementById('password').value = 'a long passphrase';
  return { doc, emit: u => observer(u), submit: () => doc.getElementById('form').onsubmit({ preventDefault() {} }) };
}
test('email login clears password and safely renders identity', async () => {
  let credentials;
  const {doc, emit, submit} = setup({ login: async (...args) => { credentials=args; } });
  await submit();
  assert.equal(credentials[0], 'member@example.com');
  assert.equal(doc.getElementById('password').value, '');
  emit({email:'<img src=x onerror=alert(1)>', emailVerified:false});
  assert.equal(doc.getElementById('identity').children.length,0);
  assert.equal(doc.getElementById('guest').hidden,true);
});
test('reset accepts only email and gives generic confirmation', async () => {
  let email;
  const {doc,submit}=setup({reset:async e=>{email=e;}});
  doc.getElementById('reset').click();
  assert.equal(doc.getElementById('password').required,false);
  await submit();
  assert.equal(email,'member@example.com');
  assert.match(doc.getElementById('status').textContent,/If this email/);
});
test('double submission cannot duplicate an authentication request', async () => {
  let resolve, calls=0;
  const pending=new Promise(r=>{resolve=r;});
  const {submit}=setup({login:async()=>{calls++;await pending;}});
  const first=submit(); await submit(); assert.equal(calls,1); resolve(); await first;
});
test('partial signup success is explained', async () => {
  const {doc,submit}=setup({signup:async()=>false});
  doc.getElementById('toggle').click();
  doc.getElementById('password').value='another long passphrase';
  await submit();
  assert.match(doc.getElementById('status').textContent,/Account created, but/);
});
test('verification refresh updates visible account status', async () => {
  const {doc,emit}=setup({refresh:async()=>({email:'member@example.com',emailVerified:true})});
  emit({email:'member@example.com',emailVerified:false});
  await doc.getElementById('refresh').onclick();
  assert.equal(doc.getElementById('verify').hidden,true);
  assert.equal(doc.getElementById('verified').textContent,'Email verified.');
});
test('authentication errors do not reveal account existence', () => {
  assert.equal(errorMessage({code:'auth/user-not-found'}),errorMessage({code:'auth/email-already-in-use'}));
  assert.match(errorMessage({code:'auth/popup-closed-by-user'}),/cancelled/);
});
test('homepage removes demonstration access and fake submissions', () => {
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.doesNotMatch(html,/1234|promptAdminPin|localStorage|submitted successfully|Message sent to society/);
  assert.match(html,/account.html/);
  const dom=new JSDOM(html);
  for(const button of dom.window.document.querySelectorAll('button[type="submit"]')) assert.equal(button.disabled,true);
});
