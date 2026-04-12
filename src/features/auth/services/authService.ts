// Defines the Authentication Service utilizing Firebase Auth
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithCredential
} from 'firebase/auth';
import { doc, setDoc, getDoc, getDocFromCache } from 'firebase/firestore';
import { auth, db } from '../../../services/firebaseConfig';
import { UserProfile, UserRole } from '../../../types/models';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

// Configure Google Sign-In globally for the Service
GoogleSignin.configure({
  webClientId: '99158635959-69f4je7o2frsedu4dua19qtvaq8l7q4f.apps.googleusercontent.com',
  offlineAccess: false,
});

export const signInWithGoogleCredential = async (idToken: string, role?: UserRole): Promise<UserProfile> => {
  const credential = GoogleAuthProvider.credential(idToken);
  const result = await signInWithCredential(auth, credential);
  const user = result.user;

  const docRef = doc(db, 'users', user.uid);
  
  let docSnap;
  try {
    docSnap = await getDoc(docRef);
  } catch (error) {
    console.error("Firestore getDoc failed, attempting local cache due to offline:", error);
    try {
      docSnap = await getDocFromCache(docRef);
    } catch (cacheError) {
      console.error("Cache read failed:", cacheError);
    }
  }

  if (docSnap && docSnap.exists()) {
    return docSnap.data() as UserProfile;
  }

  // If user doesn't exist in DB (or both network & cache failed on first sign-in), create new profile
  const assignedRole = role || 'client';
  const newUserProfile: UserProfile = {
    id: user.uid,
    role: assignedRole,
    email: user.email,
    displayName: user.displayName || 'Google User',
    status: assignedRole === 'lawyer' ? 'pending' : 'verified',
    createdAt: Date.now(),
  };

  try {
    await setDoc(docRef, newUserProfile);
  } catch (e) {
    console.log("Offline mode: User profile prepared but Firestore write deferred.", e);
  }
  return newUserProfile;
};

export const registerUser = async (
  email: string,
  password: string,
  role: UserRole,
  displayName: string
): Promise<UserProfile> => {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  const user = result.user;

  const newUserProfile: UserProfile = {
    id: user.uid,
    role,
    email: user.email,
    displayName,
    // Lawyers start as pending, everyone else is verified by default
    status: role === 'lawyer' ? 'pending' : 'verified',
    createdAt: Date.now(),
  };

  try {
    // Write new user details to Firestore 'users' collection
    await setDoc(doc(db, 'users', user.uid), newUserProfile);
  } catch(e) {
    console.log("Offline mode: Registration complete but Firestore write deferred.", e);
  }
  return newUserProfile;
};

export const loginUser = async (email: string, password: string): Promise<UserProfile> => {
  const result = await signInWithEmailAndPassword(auth, email, password);
  const user = result.user;

  const docRef = doc(db, 'users', user.uid);
  let docSnap;
  try {
     docSnap = await getDoc(docRef);
  } catch(error) {
     console.error("Firestore offline, loading from cache...", error);
     docSnap = await getDocFromCache(docRef);
  }

  if (!docSnap || !docSnap.exists()) {
    // Return a degraded profile so the user isn't permanently locked out of the app
    return {
       id: user.uid,
       role: 'client', // Default fallback
       email: user.email,
       displayName: user.displayName || 'User',
       status: 'verified',
       createdAt: Date.now()
    };
  }

  return docSnap.data() as UserProfile;
};

export const getCurrentUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const docRef = doc(db, 'users', uid);
    let docSnap;
    try {
      docSnap = await getDoc(docRef);
    } catch(e) {
      console.warn("Network fetch failed, attempting cache match...");
      docSnap = await getDocFromCache(docRef);
    }
    
    if (docSnap && docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    console.error("Error fetching user profile (complete timeout):", error);
    return null;
  }
};

export const logoutUser = async () => {
  await signOut(auth);
};
