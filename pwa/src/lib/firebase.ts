import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  initializeFirestore, 
  getFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAfMYwWD0JskbvaFAXIG03lOxX1F5EBR8Q",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "haqooq-a3e91.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://haqooq-a3e91-default-rtdb.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "haqooq-a3e91",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "haqooq-a3e91.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "99158635959",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:99158635959:web:3cc560b4cb2130d574e432"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);

let db: ReturnType<typeof getFirestore>;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    }),
    ignoreUndefinedProperties: true
  });
} catch (e) {
  db = getFirestore(app);
}

export { db };
export const storage = getStorage(app);
export default app;
