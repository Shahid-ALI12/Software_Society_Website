// Trusted operator only. Never expose this as a public API.
import { getFirebase } from '../server/firebase.mjs';
const [uid,role]=process.argv.slice(2);
if(!uid||!['member','editor','admin'].includes(role))throw new Error('Usage: node scripts/set-role.mjs FIREBASE_UID member|editor|admin');
const {auth}=getFirebase(),user=await auth.getUser(uid);
if(!user.emailVerified||user.disabled)throw new Error('Account must be enabled and email verified.');
await auth.setCustomUserClaims(uid,{...user.customClaims,role});
await auth.revokeRefreshTokens(uid);
console.log('Role updated. Sign out and sign in again.');
