import { initializeApp, getApps, getApp } from "firebase/app";
// @ts-ignore
import { initializeAuth, getReactNativePersistence, getAuth } from "firebase/auth";
import { initializeFirestore, getFirestore, memoryLocalCache } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyAfMYwWD0JskbvaFAXIG03lOxX1F5EBR8Q",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "haqooq-a3e91.firebaseapp.com",
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL || "https://haqooq-a3e91-default-rtdb.firebaseio.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "haqooq-a3e91",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "haqooq-a3e91.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "99158635959",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:99158635959:android:f5d4eaa916cf665674e432"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let auth: ReturnType<typeof getAuth>;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
} catch (e) {
  auth = getAuth(app);
}

let db: ReturnType<typeof getFirestore>;
try {
  // Enterprise standard for Firestore in React Native: Disable long sockets if they block
  // Use memory cache because the Web SDK's persistentLocalCache relies on IndexedDB, which is unsupported in RN.
  db = initializeFirestore(app, {
    localCache: memoryLocalCache(),
    experimentalForceLongPolling: true
  });
} catch (e) {
  db = getFirestore(app);
}

export { auth, db };

export const storage = getStorage(app);
export const functions = getFunctions(app);

export default app;
