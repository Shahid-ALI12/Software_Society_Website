import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
// Public web-app configuration. This does not grant administrative access.
export const auth = getAuth(initializeApp({
  apiKey: 'AIzaSyAaTAwjUvuhtXa-Sd0dKVvJCgu5oDsOH8Y',
  authDomain: 'softwarewebsite-861b4.firebaseapp.com',
  projectId: 'softwarewebsite-861b4',
  appId: '1:740362010306:web:360d00e56f06d77731055b',
  messagingSenderId: '740362010306'
}));
