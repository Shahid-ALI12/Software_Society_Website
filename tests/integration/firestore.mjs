import {test,before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initializeTestEnvironment,assertFails} from '@firebase/rules-unit-testing';
import {doc,getDoc,setDoc,getDocs,collection,updateDoc,deleteDoc} from 'firebase/firestore';
import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {createRepository} from '../../server/repository.mjs';
if(!process.env.FIRESTORE_EMULATOR_HOST)throw new Error('Run using Firestore emulator with project demo-society.');
let env,app,db,repo;
before(async()=>{env=await initializeTestEnvironment({projectId:'demo-society',firestore:{rules:readFileSync('firestore.rules','utf8')}});app=initializeApp({projectId:'demo-society'},'integration');db=getFirestore(app);repo=createRepository(db);});
beforeEach(async()=>env.clearFirestore());
after(async()=>{await env.cleanup();await deleteApp(app);});
test('direct clients including forged admin claims cannot read/write any business collection',async()=>{
 await db.doc('content/existing').set({kind:'notices'});
 for(const ctx of [env.unauthenticatedContext(),env.authenticatedContext('member'),env.authenticatedContext('admin',{role:'admin'})]){
  const client=ctx.firestore();
  await assertFails(getDoc(doc(client,'content/existing')));
  await assertFails(getDocs(collection(client,'content')));
  await assertFails(setDoc(doc(client,'submissions/fake'),{uid:'member'}));
  await assertFails(updateDoc(doc(client,'content/existing'),{role:'admin'}));
  await assertFails(deleteDoc(doc(client,'content/existing')));
 }
});
test('public pages exclude drafts/private fields and use stable cursors',async()=>{
 for(let i=0;i<27;i++)await repo.saveContent('admin',{version:0,content:{kind:'notices',status:i===26?'draft':'published',data:{title:'Notice '+i,category:'General',description:'Public text',privateEmail:'never@example.com'}}});
 const first=await repo.content('notices',null,true);assert.equal(first.items.length,24);assert.ok(first.nextCursor);assert.equal(first.items[0].data.privateEmail,undefined);
 const next=await repo.content('notices',first.nextCursor,true);assert.equal(next.items.length,2);assert.equal(next.nextCursor,null);
 assert.equal(new Set([...first.items,...next.items].map(i=>i.id)).size,26);
});
test('optimistic edit conflicts preserve last committed item and audit',async()=>{
 const item=await repo.saveContent('admin',{version:0,content:{kind:'notices',status:'draft',data:{title:'Original'}}});
 await repo.saveContent('admin',{id:item.id,version:1,content:{kind:'notices',status:'published',data:{title:'Updated'}}});
 await assert.rejects(repo.saveContent('admin',{id:item.id,version:1,content:{kind:'notices',status:'published',data:{title:'Stale'}}}),e=>e.status===409);
 assert.equal((await db.doc('content/'+item.id).get()).data().data.title,'Updated');assert.equal((await db.collection('auditLogs').get()).size,2);
});
test('retries create one submission; changed data cannot reuse the key',async()=>{
 const data={name:'Member',email:'member@example.com',message:'Please contact me.'};
 await Promise.all([repo.submit('uid','contact',data,'same-key'),repo.submit('uid','contact',data,'same-key')]);
 assert.equal((await db.collection('submissions').get()).size,1);
 await assert.rejects(repo.submit('uid','contact',{...data,message:'Different'},'same-key'),e=>e.status===409);
});
test('alumni approval atomically publishes only consented public fields',async()=>{
 const application=await repo.submit('member','alumni',{name:'Member',batch:'2020-2024',role:'Developer',linkedin:'https://www.linkedin.com/in/member',consent:true},'key');
 await repo.moderate('admin',application.id,'approved',1);
 const published=(await repo.content('alumni',null,true)).items[0];assert.equal(published.data.title,'Member');assert.equal(published.data.uid,undefined);assert.equal(published.data.consent,undefined);
 assert.equal((await db.doc('submissions/'+application.id).get()).data().status,'approved');
 await assert.rejects(repo.moderate('admin',application.id,'approved',1),e=>e.status===409);
});
