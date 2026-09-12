// Defines the Authentication Service utilizing Firebase Auth
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  GoogleAuthProvider, 
  signInWithCredential,
  getAdditionalUserInfo,
  sendPasswordResetEmail,
  updateProfile,
  linkWithCredential
} from 'firebase/auth';
import { doc, setDoc, getDoc, getDocFromCache, updateDoc } from 'firebase/firestore';
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

/**
 * Idempotent recovery for orphaned Firebase Auth accounts missing a Firestore database record.
 * Conforms strictly to Firestore create rules.
 */
export const recoverOrphanProfile = async (
  user: { uid: string; email: string | null; displayName: string | null; photoURL?: string | null },
  role: UserRole = 'client'
): Promise<UserProfile> => {
  const profile: any = {
    id: user.uid,
    role,
    email: user.email,
    displayName: user.displayName || (role === 'lawyer' ? 'Counselor' : 'Client'),
    photoURL: user.photoURL || null,
    status: role === 'lawyer' ? 'pending' : 'verified',
    credits: role === 'lawyer' ? 10 : 0,
    isPremium: false,
    createdAt: Date.now()
  };

  if (role === 'lawyer') {
    profile.city = 'Pakistan';
    profile.specialization = [];
    profile.experienceYears = 0;
    profile.rating = 0;
    profile.ratingCount = 0;
  }

  await setDoc(doc(db, 'users', user.uid), profile);
  return profile as UserProfile;
};

export const signInWithGoogleCredential = async (
  idToken: string, 
  role?: UserRole, 
  isSignUp: boolean = false,
  lawyerMeta?: { city?: string; specialization?: string[] }
): Promise<UserProfile> => {
  const credential = GoogleAuthProvider.credential(idToken);
  
  // Wrap with timeout in case Firebase hangs
  const result = await timeoutPromise(15000, signInWithCredential(auth, credential), 'Firebase Auth timeout');
  const user = result.user;

  // Check: Did Google just create this Auth account right now?
  const extraInfo = getAdditionalUserInfo(result);
  const isNewUser = extraInfo?.isNewUser || false;

  // If they are logging in (not signing up) but it's a brand new account, 
  // they never registered for Haqooq. We must cleanly reject them.
  if (!isSignUp && isNewUser) {
    try {
      await user.delete();
      await signOut(auth);
      await GoogleSignin.signOut();
    } catch (e) {}
    throw { code: 'auth/unregistered-google-account' };
  }

  const docRef = doc(db, 'users', user.uid);
  
  let docSnap;
  let fetchFailed = false;
  try {
    docSnap = await timeoutPromise(15000, getDoc(docRef), 'Firestore getDoc timeout');
  } catch (error) {
    console.warn("Firestore getDoc failed or timed out, attempting local cache:", error);
    try {
      docSnap = await getDocFromCache(docRef);
    } catch (cacheError) {
      fetchFailed = true;
    }
  }

  if (docSnap && docSnap.exists()) {
    const existingProfile = docSnap.data() as UserProfile;
    // Identity sync: if user has a Google photo and Firestore record lacks one, update photoURL safely
    if (!existingProfile.photoURL && user.photoURL) {
      updateDoc(docRef, { photoURL: user.photoURL }).catch(() => {});
      existingProfile.photoURL = user.photoURL;
    }
    return existingProfile;
  }

  // If network failed completely on login, report connection error rather than degrading profile
  if (fetchFailed || (!docSnap && !isSignUp)) {
    throw { 
      code: 'auth/network-request-failed', 
      message: 'Network issue loading profile. Please check your connection and try again.' 
    };
  }

  // Profile creation for new Google signup (or recovered orphan)
  const assignedRole = role || 'client';
  const newUserProfile: any = {
    id: user.uid,
    role: assignedRole,
    email: user.email,
    displayName: user.displayName || (assignedRole === 'lawyer' ? 'Counselor' : 'Google User'),
    photoURL: user.photoURL || null,
    status: assignedRole === 'lawyer' ? 'pending' : 'verified',
    credits: assignedRole === 'lawyer' ? 10 : 0,
    isPremium: false,
    createdAt: Date.now(),
  };

  if (assignedRole === 'lawyer') {
    newUserProfile.city = lawyerMeta?.city || 'Pakistan';
    newUserProfile.specialization = lawyerMeta?.specialization || [];
    newUserProfile.experienceYears = 0;
    newUserProfile.rating = 0;
    newUserProfile.ratingCount = 0;
  }

  await timeoutPromise(15000, setDoc(docRef, newUserProfile), 'Firestore setDoc timeout');
  return newUserProfile as UserProfile;
};

export const linkGoogleAccountWithPassword = async (
  email: string, 
  password: string, 
  pendingCredential: any
): Promise<UserProfile> => {
  const result = await signInWithEmailAndPassword(auth, email, password);
  if (pendingCredential) {
    await linkWithCredential(result.user, pendingCredential);
  }
  const profile = await getCurrentUserProfile(result.user.uid);
  if (!profile) {
    return await recoverOrphanProfile(result.user, 'client');
  }
  return profile;
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

  try {
    await updateProfile(user, { displayName });
  } catch (e) {
    console.warn("Failed to set auth displayName:", e);
  }

  const newUserProfile: any = {
    id: user.uid,
    role,
    email: user.email,
    displayName,
    photoURL: null,
    status: role === 'lawyer' ? 'pending' : 'verified',
    credits: role === 'lawyer' ? 10 : 0,
    isPremium: false,
    createdAt: Date.now(),
  };

  if (role === 'lawyer') {
    newUserProfile.city = city || 'Pakistan';
    newUserProfile.specialization = specialization || [];
    newUserProfile.experienceYears = 0;
    newUserProfile.rating = 0;
    newUserProfile.ratingCount = 0;
  }

  try {
    await timeoutPromise(10000, setDoc(doc(db, 'users', user.uid), newUserProfile), 'Firestore profile creation timed out');
  } catch(e: any) {
    console.error("Profile database creation failed, attempting cleanup:", e);
    try {
      await user.delete();
      await signOut(auth);
    } catch (cleanupErr) {
      console.warn("Auth rollback deferred or failed (orphan account recoverable upon next login):", cleanupErr);
    }
    throw {
      code: 'auth/profile-creation-failed',
      message: 'Failed to create user database record. Please verify your connection and try again.'
    };
  }

  return newUserProfile as UserProfile;
};

export const loginUser = async (email: string, password: string): Promise<UserProfile> => {
  const result = await signInWithEmailAndPassword(auth, email, password);
  const user = result.user;

  const docRef = doc(db, 'users', user.uid);
  let docSnap;
  let fetchFailed = false;

  try {
    docSnap = await timeoutPromise(10000, getDoc(docRef), 'Profile fetch timeout');
  } catch(error) {
    console.warn("Firestore network fetch failed, attempting cache match...", error);
    try {
      docSnap = await getDocFromCache(docRef);
    } catch (cacheErr) {
      fetchFailed = true;
    }
  }

  if (fetchFailed || !docSnap) {
    throw {
      code: 'auth/network-request-failed',
      message: 'Network issue loading your profile. Please check your internet connection and try again.'
    };
  }

  if (!docSnap.exists()) {
    // Affirmatively missing profile -> trigger orphan account recovery
    console.warn(`Orphan account detected for UID ${user.uid}. Initializing recovered profile...`);
    return await recoverOrphanProfile(user, 'client');
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
      try {
        docSnap = await getDocFromCache(docRef);
      } catch (cacheErr) {}
    }
    
    if (docSnap && docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    console.error("Error fetching user profile:", error);
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
