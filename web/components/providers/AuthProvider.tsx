"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, getIdToken } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { firebaseAuth, firebaseDb } from '@/lib/firebaseClient';
import { UserProfile } from '@/types';

interface AuthContextValue {
  user: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOutAdmin: () => Promise<void>;
  token: string | null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setToken(null);
        setLoading(false);
        return;
      }

      try {
        const idToken = await getIdToken(firebaseUser, true);
        const profileSnap = await getDoc(doc(firebaseDb, 'users', firebaseUser.uid));

        if (!profileSnap.exists()) {
          await signOut(firebaseAuth);
          setUser(null);
          setToken(null);
          setLoading(false);
          return;
        }

        const profile = profileSnap.data() as UserProfile;

        if (profile.role !== 'admin') {
          await signOut(firebaseAuth);
          setUser(null);
          setToken(null);
          setLoading(false);
          return;
        }

        setUser(profile);
        setToken(idToken);
      } catch (error) {
        console.error('Auth hydration failed:', error);
        setUser(null);
        setToken(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    await signInWithEmailAndPassword(firebaseAuth, email, password);
    setLoading(false);
  };

  const signOutAdmin = async () => {
    await signOut(firebaseAuth);
    setUser(null);
    setToken(null);
  };

  const value = useMemo(
    () => ({ user, loading, signIn, signOutAdmin, token }),
    [user, loading, token]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside an AuthProvider');
  return context;
};
