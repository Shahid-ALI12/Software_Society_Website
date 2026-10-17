import { auth } from './firebase.js';
import { setPersistence, browserLocalPersistence, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, sendEmailVerification, sendPasswordResetEmail, signOut, reload, validatePassword } from 'firebase/auth';
// Keep the user signed in across tabs and browser restarts on this device.
export const ready = setPersistence(auth, browserLocalPersistence);
export const service = {
  observe: callback => onAuthStateChanged(auth, callback),
  login: (email, password) => signInWithEmailAndPassword(auth, email, password),
  async signup(email, password) {
    const policy = await validatePassword(auth, password);
    if (!policy.isValid) throw Object.assign(new Error(), { code: 'auth/password-does-not-meet-requirements' });
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    try { await sendEmailVerification(user); return true; } catch { return false; }
  },
  google() {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    return signInWithPopup(auth, provider);
  },
  async reset(email) {
    try { await sendPasswordResetEmail(auth, email); }
    catch (error) { if (!['auth/user-not-found', 'auth/invalid-email'].includes(error.code)) throw error; }
  },
  verify: () => sendEmailVerification(auth.currentUser),
  async refresh() { await reload(auth.currentUser); await auth.currentUser.getIdToken(true); return auth.currentUser; },
  logout: () => signOut(auth)
};
