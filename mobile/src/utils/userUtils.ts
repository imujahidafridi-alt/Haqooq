import { UserProfile, LawyerProfile } from '../types/models';

/**
 * Canonical helper to check whether a user profile is a Bar Council verified advocate.
 * 
 * IMPORTANT: This helper is for client-side UX gating, navigation, and badge rendering.
 * Firestore security rules independently and authoritatively enforce:
 * role == 'lawyer' && status == 'verified'
 */
export const isVerifiedLawyer = (user: UserProfile | null | undefined): user is LawyerProfile => {
  return !!user && user.role === 'lawyer' && user.status === 'verified';
};

/**
 * Checks whether a user is an advocate (regardless of verification status).
 */
export const isLawyer = (user: UserProfile | null | undefined): boolean => {
  return !!user && user.role === 'lawyer';
};

/**
 * Checks whether a user is a client.
 */
export const isClient = (user: UserProfile | null | undefined): boolean => {
  return !!user && user.role === 'client';
};
