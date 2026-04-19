// Defines the Authentication Service utilizing Firebase Auth
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  GoogleAuthProvider, 
  signInWithCredential,
  getAdditionalUserInfo,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc, getDocFromCache } from 'firebase/firestore';
import { auth, db } from '../../../services/firebaseConfig';
import { UserProfile, UserRole } from '../../../types/models';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

GoogleSignin.configure({
  webClientId: '99158635959-69f4je7o2frsedu4dua19qtvaq8l7q4f.apps.googleusercontent.com',
  offlineAccess: false,
});

// A robust helper to prevent Firebase functions from hanging infinitely
const timeoutPromise = <T>(ms: number, promise: Promise<T>, timeoutMsg: string): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(timeoutMsg)), ms);
    promise.then((res) => {
      clearTimeout(timer);
      resolve(res);
    }).catch((err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
};

export const signInWithGoogleCredential = async (idToken: string, role?: UserRole, isSignUp: boolean = false): Promise<UserProfile> => {
  const credential = GoogleAuthProvider.credential(idToken);
  
  // Wrap with timeout incase Firebase hangs
  const result = await timeoutPromise(15000, signInWithCredential(auth, credential), 'Firebase Auth timeout');
  const user = result.user;

  // Enterprise Check: Did Google just create this Auth account right now?
  const extraInfo = getAdditionalUserInfo(result);
  const isNewUser = extraInfo?.isNewUser || false;

  // If they are logging in (not signing up) but it's a brand new account, 
  // they never registered for Haqooq. We must cleanly reject them.
  if (!isSignUp && isNewUser) {
      try {
        await user.delete(); // Delete the accidental Firebase Auth account
        await signOut(auth);
        await GoogleSignin.signOut();
      } catch (e) {}
      throw { code: 'auth/unregistered-google-account' };
  }

  const docRef = doc(db, 'users', user.uid);
  
  let docSnap;
  try {
    docSnap = await timeoutPromise(15000, getDoc(docRef), 'Firestore getDoc timeout');
  } catch (error) {
    console.error("Firestore getDoc failed or timed out, attempting local cache:", error);
    try {
      docSnap = await getDocFromCache(docRef);
    } catch (cacheError) {
      console.error("Cache read failed:", cacheError);
    }
  }

  if (docSnap && docSnap.exists()) {
    // Verified existing user.
    return docSnap.data() as UserProfile;
  }

  // If docSnap is undefined, the network entirely failed. Give offline degraded login.
  if (!docSnap && !isSignUp) {
    console.log("Providing gracefully degraded offline profile.");
    return {
       id: user.uid,
       role: 'client', // Default fallback
       email: user.email,
       displayName: user.displayName || 'Google User',
       status: 'verified',
       createdAt: Date.now()
    };
  }

  // If docSnap affirmatively confirmed the user does NOT exist in Firestore (but they passed the !isNewUser check)
  // This heals edge-case users whose initial Firestore creation failed due to security rule bugs!
  const assignedRole = role || 'client';
  const newUserProfile: UserProfile = {
    id: user.uid,
    role: assignedRole,
    email: user.email,
    displayName: user.displayName || 'Google User',
    status: 'verified',
    createdAt: Date.now(),
  };

  try {
    await timeoutPromise(15000, setDoc(docRef, newUserProfile), 'Firestore setDoc timeout');
  } catch (e) {
    console.log("Offline mode/timeout: User profile prepared but Firestore write deferred.", e);
  }
  return newUserProfile;
};

export const registerUser = async (
  email: string,
  password: string,
  role: UserRole,
  displayName: string,
  city?: string,
  specialization?: string[]
): Promise<UserProfile> => {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  const user = result.user;

  const newUserProfile: any = {
    id: user.uid,
    role,
    email: user.email,
    displayName,
    // Approval removed for testing: lawyer accounts are immediately verified
    status: 'verified',
    createdAt: Date.now(),
  };

  if (role === 'lawyer') {
    newUserProfile.city = city || '';
    newUserProfile.specialization = specialization || [];
    newUserProfile.experienceYears = 0; // default
    newUserProfile.rating = 0;
    newUserProfile.isPremium = false;
    newUserProfile.biddingCredits = 100;
  }

  try {
    // Write new user details to Firestore 'users' collection
    await setDoc(doc(db, 'users', user.uid), newUserProfile);
  } catch(e) {
    console.log("Offline mode: Registration complete but Firestore write deferred.", e);
  }
  return newUserProfile as UserProfile;
};

export const loginUser = async (email: string, password: string): Promise<UserProfile> => {
  const result = await signInWithEmailAndPassword(auth, email, password);
  const user = result.user;

  const docRef = doc(db, 'users', user.uid);
  let docSnap;
  try {
     docSnap = await getDoc(docRef);
  } catch(error) {
     console.warn("Firestore offline, loading from cache...");
     try {
       docSnap = await getDocFromCache(docRef);
     } catch (cacheErr) {
       console.log("No valid cache snapshot found.");
     }
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
      try {
        docSnap = await getDocFromCache(docRef);
      } catch (cacheErr) {
        console.log("No valid cache snapshot found during Google profile hydration.");
      }
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
  try {
    // If user is Google authenticated, this ensures their token is fully revoked on logout
    await GoogleSignin.revokeAccess();
  } catch (error) {
    // Ignore revoke errors (often thrown if they just used email/password)
  }
  try {
    await GoogleSignin.signOut();
  } catch (error) {
    // Ignore signout errors
  }
};

export const resetPassword = async (email: string) => {
  if (!email.trim()) throw new Error('Valid email required for password reset.');
  await sendPasswordResetEmail(auth, email.trim());
};
