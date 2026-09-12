import { getIdToken } from 'firebase/auth';
import { firebaseAuth } from './firebaseClient';

const getAuthHeader = async () => {
  // Wait for Firebase client to finish session restoration before attempting request
  if (typeof (firebaseAuth as any).authStateReady === 'function') {
    await firebaseAuth.authStateReady();
  }
  const user = firebaseAuth.currentUser;
  if (!user) return null;
  const token = await getIdToken(user);
  return `Bearer ${token}`;
};

export const apiFetch = async (path: string, init: RequestInit = {}) => {
  const authHeader = await getAuthHeader();
  if (!authHeader) {
    throw new Error('Authentication required. Please sign in as an administrator.');
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(init.headers || {}),
    Authorization: authHeader
  } as Record<string, string>;

  const response = await fetch(path, {
    ...init,
    headers
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || response.statusText);
  }

  return response.json();
};
