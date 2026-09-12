"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, getIdToken, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { firebaseAuth, firebaseDb } from '@/lib/firebaseClient';
import { UserProfile } from '@/types';

interface AuthResult {
  authorized: boolean;
  profile?: UserProfile;
}

interface AuthContextValue {
  user: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAuthorized: boolean;
  authError: string | null;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signOutAdmin: () => Promise<void>;
  token: string | null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (fbUser) => {
      if (!fbUser) {
        setFirebaseUser(null);
        setUser(null);
        setToken(null);
        setIsAuthenticated(false);
        setIsAuthorized(false);
        setAuthError(null);
        setLoading(false);
        return;
      }

      setFirebaseUser(fbUser);
      setIsAuthenticated(true);

      try {
        const idToken = await getIdToken(fbUser, true);
        const profileSnap = await getDoc(doc(firebaseDb, 'users', fbUser.uid));

        if (!profileSnap.exists()) {
          setUser(null);
          setToken(idToken);
          setIsAuthorized(false);
          setAuthError('PROFILE_NOT_FOUND');
          return;
        }

        const profile = profileSnap.data() as UserProfile;
        profile.id = fbUser.uid;
        setUser(profile);
        setToken(idToken);

        if (profile.role === 'admin') {
          setIsAuthorized(true);
          setAuthError(null);
        } else {
          setIsAuthorized(false);
          setAuthError('ACCESS_DENIED');
        }
      } catch (error) {
        console.error('Auth hydration error:', error);
        setUser(null);
        setToken(null);
        setIsAuthorized(false);
        setAuthError('HYDRATION_ERROR');
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string): Promise<AuthResult> => {
    setLoading(true);
    setAuthError(null);
    try {
      const cred = await signInWithEmailAndPassword(firebaseAuth, email, password);
      const fbUser = cred.user;
      setFirebaseUser(fbUser);
      setIsAuthenticated(true);

      const idToken = await getIdToken(fbUser, true);
      const profileSnap = await getDoc(doc(firebaseDb, 'users', fbUser.uid));

      if (!profileSnap.exists()) {
        setUser(null);
        setToken(idToken);
        setIsAuthorized(false);
        setAuthError('PROFILE_NOT_FOUND');
        setLoading(false);
        return { authorized: false };
      }

      const profile = profileSnap.data() as UserProfile;
      profile.id = fbUser.uid;
      setUser(profile);
      setToken(idToken);

      if (profile.role !== 'admin') {
        setIsAuthorized(false);
        setAuthError('ACCESS_DENIED');
        setLoading(false);
        return { authorized: false, profile };
      }

      setIsAuthorized(true);
      setAuthError(null);
      setLoading(false);
      return { authorized: true, profile };
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const signOutAdmin = async () => {
    setLoading(true);
    try {
      await signOut(firebaseAuth);
    } finally {
      setFirebaseUser(null);
      setUser(null);
      setToken(null);
      setIsAuthenticated(false);
      setIsAuthorized(false);
      setAuthError(null);
      setLoading(false);
    }
  };

  const value = useMemo(
    () => ({
      user,
      firebaseUser,
      loading,
      isAuthenticated,
      isAuthorized,
      authError,
      signIn,
      signOutAdmin,
      token,
    }),
    [user, firebaseUser, loading, isAuthenticated, isAuthorized, authError, token]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside an AuthProvider');
  return context;
};
