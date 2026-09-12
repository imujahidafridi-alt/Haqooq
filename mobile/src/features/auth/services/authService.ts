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
import { doc, setDoc, getDoc, getDocFromCache, updateDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../../../services/firebaseConfig';
import { UserProfile, UserRole } from '../../../types/models';
import { normalizeSpecialization } from '../../../constants/legalDomains';
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

// Safe document deletion helper that never throws or unhandled rejects
const safeDeleteDoc = async (docRef: any): Promise<void> => {
  try {
    const res = deleteDoc(docRef);
    if (res && typeof res.then === 'function') {
      await res;
    }
  } catch (e) {
    // Ignore cleanup errors
  }
};

export interface RegistrationIntent {
  uid: string;
  email: string | null;
  role: UserRole;
  displayName: string;
  city?: string;
  specialization?: string[];
  createdAt: number;
  expiresAt: number;
}

/**
 * Idempotent recovery for orphaned Firebase Auth accounts missing a Firestore database record.
 * Conforms strictly to Firestore create rules and registration intent lifecycle.
 * Safely handles:
 * - intent exists + profile exists: returns profile, cleans up intent
 * - intent exists + profile missing: validates intent (TTL, role, canonical schema) -> creates profile -> cleans up intent
 * - intent missing + profile exists: returns profile
 * - intent missing + profile missing: throws auth/registration-incomplete (never silently converts role)
 */
export const recoverOrphanProfile = async (
  authUser: { uid: string; email: string | null; displayName: string | null; photoURL?: string | null }
): Promise<UserProfile> => {
  const userDocRef = doc(db, 'users', authUser.uid);
  const intentDocRef = doc(db, 'registration_intents', authUser.uid);

  // 1. Check if profile already exists (handles race conditions or repeat calls)
  try {
    const existingSnap = await getDoc(userDocRef);
    if (existingSnap && existingSnap.exists()) {
      safeDeleteDoc(intentDocRef);
      return existingSnap.data() as UserProfile;
    }
  } catch (e) {
    console.warn("Error checking existing profile during recovery:", e);
  }

  // 2. Fetch registration intent
  let intentSnap;
  try {
    intentSnap = await getDoc(intentDocRef);
  } catch (err) {
    console.warn("Failed to fetch registration intent during orphan recovery:", err);
  }

  if (!intentSnap || !intentSnap.exists()) {
    throw {
      code: 'auth/registration-incomplete',
      message: 'Your registration was interrupted and no valid registration intent was found. Please register again.'
    };
  }

  const intent = intentSnap.data() as RegistrationIntent;

  // 3. Security validations
  if (intent.uid !== authUser.uid) {
    throw { code: 'auth/invalid-registration-intent', message: 'Registration intent UID mismatch.' };
  }
  if (authUser.email && intent.email && intent.email.toLowerCase() !== authUser.email.toLowerCase()) {
    throw { code: 'auth/invalid-registration-intent', message: 'Registration intent email mismatch.' };
  }
  if (!intent.expiresAt || intent.expiresAt < Date.now()) {
    // Intent expired: clean up stale intent
    await safeDeleteDoc(intentDocRef);
    throw {
      code: 'auth/registration-incomplete',
      message: 'Your registration session has expired (30-minute limit). Please register again.'
    };
  }
  if (intent.role !== 'client' && intent.role !== 'lawyer') {
    throw { code: 'auth/invalid-registration-intent', message: 'Invalid role specified in registration intent.' };
  }

  // 4. Construct canonical profile
  const recoveredRole = intent.role;
  const now = Date.now();
  const recoveredProfile: any = {
    id: authUser.uid,
    role: recoveredRole,
    email: authUser.email || intent.email,
    displayName: authUser.displayName || intent.displayName || (recoveredRole === 'lawyer' ? 'Counselor' : 'Client'),
    photoURL: authUser.photoURL || null,
    status: recoveredRole === 'lawyer' ? 'pending' : 'verified',
    credits: recoveredRole === 'lawyer' ? 10 : 0,
    isPremium: false,
    createdAt: now
  };

  if (intent.city) {
    recoveredProfile.city = intent.city;
  }

  if (recoveredRole === 'lawyer') {
    recoveredProfile.city = intent.city || 'Pakistan';
    const specs = Array.isArray(intent.specialization) ? intent.specialization : [];
    const canonicalSpecs = specs
      .map(s => normalizeSpecialization(s))
      .filter((s, idx, arr) => arr.indexOf(s) === idx)
      .slice(0, 5);
    recoveredProfile.specialization = canonicalSpecs;
    recoveredProfile.experienceYears = 0;
    recoveredProfile.rating = 0;
    recoveredProfile.ratingCount = 0;
  }

  // 5. Commit profile to Firestore
  await setDoc(userDocRef, recoveredProfile);

  // 6. Clean up registration intent
  safeDeleteDoc(intentDocRef);

  return recoveredProfile as UserProfile;
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

  // Check if profile exists
  if (docSnap && docSnap.exists()) {
    const existingProfile = docSnap.data() as UserProfile;

    // Cross-Role Collision Guard:
    // If the user is on the SignUp screen and selected role != existing role, reject immediately!
    if (isSignUp && role && existingProfile.role !== role) {
      // Sign out of auth session to prevent session leak
      try {
        await signOut(auth);
        await GoogleSignin.signOut();
      } catch (e) {}
      throw {
        code: 'auth/role-conflict',
        message: `This Google account is already registered as a ${existingProfile.role}. Please log in to your account or use another Google account.`
      };
    }

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

  // New Google Signup flow:
  // User selects role -> Authenticate Google -> Obtain UID -> Create Registration Intent -> Create Profile -> Delete Intent
  const assignedRole = role || 'client';
  const now = Date.now();
  const intentRef = doc(db, 'registration_intents', user.uid);

  try {
    const intentData: any = {
      uid: user.uid,
      email: user.email,
      role: assignedRole,
      displayName: user.displayName || (assignedRole === 'lawyer' ? 'Counselor' : 'Google User'),
      createdAt: now,
      expiresAt: now + 1800000,
    };
    if (lawyerMeta?.city) {
      intentData.city = lawyerMeta.city;
    }
    if (lawyerMeta?.specialization && lawyerMeta.specialization.length > 0) {
      intentData.specialization = lawyerMeta.specialization;
    }
    await timeoutPromise(10000, setDoc(intentRef, intentData), 'Registration intent timed out');
  } catch (intentErr) {
    console.warn("Could not save registration intent, continuing with profile creation:", intentErr);
  }

  const newUserProfile: any = {
    id: user.uid,
    role: assignedRole,
    email: user.email,
    displayName: user.displayName || (assignedRole === 'lawyer' ? 'Counselor' : 'Google User'),
    photoURL: user.photoURL || null,
    status: assignedRole === 'lawyer' ? 'pending' : 'verified',
    credits: assignedRole === 'lawyer' ? 10 : 0,
    isPremium: false,
    createdAt: now,
  };

  if (lawyerMeta?.city) {
    newUserProfile.city = lawyerMeta.city;
  }
  if (assignedRole === 'lawyer') {
    newUserProfile.city = lawyerMeta?.city || 'Pakistan';
    const rawSpecs = lawyerMeta?.specialization || [];
    newUserProfile.specialization = rawSpecs.map(s => normalizeSpecialization(s)).slice(0, 5);
    newUserProfile.experienceYears = 0;
    newUserProfile.rating = 0;
    newUserProfile.ratingCount = 0;
  }

  await timeoutPromise(15000, setDoc(docRef, newUserProfile), 'Firestore setDoc timeout');

  // Clean up intent upon successful creation
  safeDeleteDoc(intentRef);

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
    return await recoverOrphanProfile(result.user);
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

  const now = Date.now();
  const intentRef = doc(db, 'registration_intents', user.uid);
  try {
    const intentData: any = {
      uid: user.uid,
      email: user.email,
      role,
      displayName,
      createdAt: now,
      expiresAt: now + 1800000,
    };
    if (city) intentData.city = city;
    if (specialization && specialization.length > 0) intentData.specialization = specialization;
    await timeoutPromise(10000, setDoc(intentRef, intentData), 'Registration intent timed out');
  } catch (intentErr) {
    console.warn("Could not write registration intent:", intentErr);
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
    createdAt: now,
  };

  if (city) {
    newUserProfile.city = city;
  }
  if (role === 'lawyer') {
    newUserProfile.city = city || 'Pakistan';
    const rawSpecs = specialization || [];
    newUserProfile.specialization = rawSpecs.map(s => normalizeSpecialization(s)).slice(0, 5);
    newUserProfile.experienceYears = 0;
    newUserProfile.rating = 0;
    newUserProfile.ratingCount = 0;
  }

  try {
    await timeoutPromise(10000, setDoc(doc(db, 'users', user.uid), newUserProfile), 'Firestore profile creation timed out');
    // Successfully created profile: clean up intent
    safeDeleteDoc(intentRef);
  } catch(e: any) {
    console.error("Profile database creation failed, leaving intent for recovery:", e);
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
    // Affirmatively missing profile -> trigger idempotent orphan account recovery
    console.warn(`Orphan account detected for UID ${user.uid}. Attempting recovery via registration intent...`);
    return await recoverOrphanProfile(user);
  }

  return docSnap.data() as UserProfile;
};

export type ProfileFetchResult =
  | { status: 'success'; profile: UserProfile }
  | { status: 'genuinely_missing' }
  | { status: 'offline_or_error'; error: any };

/**
 * Categorizes profile fetch outcome into distinct semantic states:
 * - 'success': Document found and loaded
 * - 'genuinely_missing': Server affirmatively confirms document does not exist
 * - 'offline_or_error': Network error, timeout, or unreachable server
 */
export const fetchUserProfileWithStatus = async (uid: string): Promise<ProfileFetchResult> => {
  const docRef = doc(db, 'users', uid);
  try {
    const docSnap = await timeoutPromise(10000, getDoc(docRef), 'Profile fetch timeout');
    if (docSnap.exists()) {
      return { status: 'success', profile: docSnap.data() as UserProfile };
    }
    return { status: 'genuinely_missing' };
  } catch (netErr: any) {
    // Try offline cache before reporting network failure
    try {
      const cachedSnap = await getDocFromCache(docRef);
      if (cachedSnap && cachedSnap.exists()) {
        return { status: 'success', profile: cachedSnap.data() as UserProfile };
      }
    } catch (cacheErr) {}
    return { status: 'offline_or_error', error: netErr };
  }
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
