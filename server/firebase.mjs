import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { RequestError } from './security/errors.mjs';
export const projectId='softwarewebsite-861b4';
export function getFirebase(){
 if(!process.env.FIREBASE_SERVICE_ACCOUNT_JSON || (process.env.VERCEL_ENV==='preview' && process.env.ALLOW_PREVIEW_BACKEND!=='true'))throw new RequestError(503,'backend_not_configured','The database connection is not configured yet. Please try again later.');
 try{
  const credentials=JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  if(credentials.project_id!==projectId)throw new Error('Wrong project');
  const app=getApps().find(a=>a.name==='society-server')||initializeApp({credential:cert(credentials),projectId,storageBucket:'softwarewebsite-861b4.firebasestorage.app'},'society-server');
  return {auth:getAuth(app),db:getFirestore(app),bucket:getStorage(app).bucket()};
 }catch{throw new RequestError(503,'backend_not_configured','The database connection is not configured yet. Please try again later.');}
}
