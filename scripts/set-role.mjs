// Trusted operator only. Never expose this as a public API.
// In Google Cloud Shell, use its user ADC; elsewhere, a dedicated operator
// service-account JSON can be supplied without ever going through the browser.
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
const [uid,role]=process.argv.slice(2);
if(!uid||!['member','editor','admin'].includes(role))throw new Error('Usage: node scripts/set-role.mjs FIREBASE_UID member|editor|admin');
const projectId='softwarewebsite-861b4';
const credential=process.env.FIREBASE_SERVICE_ACCOUNT_JSON
 ? cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON))
 : applicationDefault();
const app=getApps().find(a=>a.name==='society-role-operator')||initializeApp({credential,projectId},'society-role-operator');
const auth=getAuth(app),user=await auth.getUser(uid);
if(!user.emailVerified||user.disabled)throw new Error('Account must be enabled and email verified.');
await auth.setCustomUserClaims(uid,{...user.customClaims,role});
await auth.revokeRefreshTokens(uid);
console.log('Role updated. Sign out and sign in again.');
