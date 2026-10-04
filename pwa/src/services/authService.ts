import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  GoogleAuthProvider, 
  signInWithPopup,
  sendPasswordResetEmail,
  updateProfile,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth';
import { doc, setDoc, getDoc, getDocFromCache, updateDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile, UserRole } from '../types/models';
import { normalizeSpecialization } from '../constants/legalDomains';

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

const safeDeleteDoc = async (docRef: any): Promise<void> => {
  try {
    await deleteDoc(docRef);
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

export const recoverOrphanProfile = async (
  authUser: { uid: string; email: string | null; displayName: string | null; photoURL?: string | null }
): Promise<UserProfile> => {
  const userDocRef = doc(db, 'users', authUser.uid);
  const intentDocRef = doc(db, 'registration_intents', authUser.uid);

  try {
    const existingSnap = await getDoc(userDocRef);
    if (existingSnap && existingSnap.exists()) {
      safeDeleteDoc(intentDocRef);
      return existingSnap.data() as UserProfile;
    }
  } catch (e) {
    console.warn("Error checking existing profile during recovery:", e);
  }

  let intentSnap;
  try {
    intentSnap = await getDoc(intentDocRef);
  } catch (err) {
    console.warn("Failed to fetch registration intent during orphan recovery:", err);
  }

  if (!intentSnap || !intentSnap.exists()) {
    throw {
      code: 'auth/registration-incomplete',
      message: 'Your registration was interrupted and no valid intent was found. Please register again.'
    };
  }

  const intent = intentSnap.data() as RegistrationIntent;

  if (intent.uid !== authUser.uid) {
    throw { code: 'auth/invalid-registration-intent', message: 'Registration intent UID mismatch.' };
  }

  const recoveredRole = intent.role || 'client';
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
    recoveredProfile.specialization = specs.map(s => normalizeSpecialization(s)).slice(0, 5);
    recoveredProfile.experienceYears = 0;
    recoveredProfile.rating = 0;
    recoveredProfile.ratingCount = 0;
  }

  await setDoc(userDocRef, recoveredProfile);
  safeDeleteDoc(intentDocRef);

  return recoveredProfile as UserProfile;
};

export const registerUser = async (
  email: string,
  password: string,
  role: UserRole,
  displayName: string,
  city?: string,
  specialization?: string[]
): Promise<UserProfile> => {
  const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
  const user = result.user;

  try {
    await updateProfile(user, { displayName: displayName.trim() });
  } catch (e) {}

  const now = Date.now();
  const intentRef = doc(db, 'registration_intents', user.uid);
  try {
    const intentData: any = {
      uid: user.uid,
      email: user.email,
      role,
      displayName: displayName.trim(),
      createdAt: now,
      expiresAt: now + 1800000,
    };
    if (city) intentData.city = city;
    if (specialization && specialization.length > 0) intentData.specialization = specialization;
    await setDoc(intentRef, intentData);
  } catch (e) {}

  const newUserProfile: any = {
    id: user.uid,
    role,
    email: user.email,
    displayName: displayName.trim(),
    photoURL: null,
    status: role === 'lawyer' ? 'pending' : 'verified',
    credits: role === 'lawyer' ? 10 : 0,
    isPremium: false,
    createdAt: now,
  };

  if (city) newUserProfile.city = city;
  if (role === 'lawyer') {
    newUserProfile.city = city || 'Pakistan';
    const rawSpecs = specialization || [];
    newUserProfile.specialization = rawSpecs.map(s => normalizeSpecialization(s)).slice(0, 5);
    newUserProfile.experienceYears = 0;
    newUserProfile.rating = 0;
    newUserProfile.ratingCount = 0;
  }

  try {
    await timeoutPromise(10000, setDoc(doc(db, 'users', user.uid), newUserProfile), 'Profile creation timed out');
    safeDeleteDoc(intentRef);
  } catch (e: any) {
    console.error("Profile creation failed, leaving intent for recovery:", e);
    throw new Error(e?.message || 'Failed to initialize account profile.');
  }

  return newUserProfile as UserProfile;
};

export const loginUser = async (email: string, password: string): Promise<UserProfile> => {
  const result = await signInWithEmailAndPassword(auth, email.trim(), password);
  const user = result.user;

  const docRef = doc(db, 'users', user.uid);
  let docSnap;

  try {
    docSnap = await timeoutPromise(10000, getDoc(docRef), 'Profile fetch timeout');
  } catch (error) {
    try {
      docSnap = await getDocFromCache(docRef);
    } catch (cacheErr) {
      throw new Error('Network issue loading profile. Please check your connection.');
    }
  }

  if (!docSnap || !docSnap.exists()) {
    return await recoverOrphanProfile(user);
  }

  return { id: docSnap.id, ...docSnap.data() } as UserProfile;
};

export const signInWithGoogle = async (
  role?: UserRole, 
  isSignUp: boolean = false,
  lawyerMeta?: { city?: string; specialization?: string[] }
): Promise<UserProfile> => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  
  const result = await signInWithPopup(auth, provider);
  const user = result.user;

  const docRef = doc(db, 'users', user.uid);
  let docSnap;
  try {
    docSnap = await getDoc(docRef);
  } catch (e) {
    try {
      docSnap = await getDocFromCache(docRef);
    } catch (ce) {}
  }

  if (docSnap && docSnap.exists()) {
    const existingProfile = docSnap.data() as UserProfile;
    existingProfile.id = docSnap.id;

    if (isSignUp && role && existingProfile.role !== role) {
      await signOut(auth);
      throw new Error(`This Google account is already registered as a ${existingProfile.role}. Please log in instead.`);
    }

    if (!existingProfile.photoURL && user.photoURL) {
      updateDoc(docRef, { photoURL: user.photoURL }).catch(() => {});
      existingProfile.photoURL = user.photoURL;
    }

    return existingProfile;
  }

  // Brand new user registration
  const assignedRole = role || 'client';
  const now = Date.now();
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

  if (lawyerMeta?.city) newUserProfile.city = lawyerMeta.city;
  if (assignedRole === 'lawyer') {
    newUserProfile.city = lawyerMeta?.city || 'Pakistan';
    const rawSpecs = lawyerMeta?.specialization || [];
    newUserProfile.specialization = rawSpecs.map(s => normalizeSpecialization(s)).slice(0, 5);
    newUserProfile.experienceYears = 0;
    newUserProfile.rating = 0;
    newUserProfile.ratingCount = 0;
  }

  await setDoc(docRef, newUserProfile);
  return newUserProfile as UserProfile;
};

export const fetchUserProfileWithStatus = async (uid: string): Promise<{ status: 'success'; profile: UserProfile } | { status: 'genuinely_missing' } | { status: 'offline_or_error'; error: any }> => {
  const docRef = doc(db, 'users', uid);
  try {
    const docSnap = await timeoutPromise(10000, getDoc(docRef), 'Profile fetch timeout');
    if (docSnap.exists()) {
      return { status: 'success', profile: { id: docSnap.id, ...docSnap.data() } as UserProfile };
    }
    return { status: 'genuinely_missing' };
  } catch (netErr: any) {
    try {
      const cachedSnap = await getDocFromCache(docRef);
      if (cachedSnap && cachedSnap.exists()) {
        return { status: 'success', profile: { id: cachedSnap.id, ...cachedSnap.data() } as UserProfile };
      }
    } catch (cacheErr) {}
    return { status: 'offline_or_error', error: netErr };
  }
};

export const logoutUser = async () => {
  await signOut(auth);
};

export const resetPassword = async (email: string) => {
  if (!email.trim()) throw new Error('Please enter your registered email address.');
  await sendPasswordResetEmail(auth, email.trim());
};

export const deleteUserAccount = async (password?: string) => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('No authenticated user session found.');

  // If password-based account, re-authenticate first
  if (password && currentUser.email) {
    const credential = EmailAuthProvider.credential(currentUser.email, password);
    await reauthenticateWithCredential(currentUser, credential);
  }

  // Delete Firestore user document
  await deleteDoc(doc(db, 'users', currentUser.uid));
  // Delete Firebase auth user
  await deleteUser(currentUser);
};

export const authService = {
  registerUser,
  registerWithEmail: registerUser,
  loginUser,
  signInWithGoogle,
  logout: logoutUser,
  logoutUser,
  resetPassword,
  deleteUserAccount,
  fetchUserProfile: fetchUserProfileWithStatus,
  fetchUserProfileWithStatus,
};
