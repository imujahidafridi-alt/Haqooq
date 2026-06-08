import { cert, getApps, getApp, initializeApp, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

let adminApp: App | null = null;

const initializeAdminApp = () => {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  if (!serviceAccountJson) {
    throw new Error('Missing FIREBASE_SERVICE_ACCOUNT environment variable for admin access.');
  }

  const serviceAccount = JSON.parse(serviceAccountJson);

  if (getApps().length === 0) {
    adminApp = initializeApp({
      credential: cert(serviceAccount)
    });
  } else {
    adminApp = getApp();
  }

  return adminApp;
};

export const getAdminApp = () => adminApp || initializeAdminApp();
export const getAdminAuth = () => getAuth(getAdminApp());
export const getAdminDb = () => getFirestore(getAdminApp());
