import { getIdToken } from 'firebase/auth';
import { firebaseAuth } from './firebaseClient';

const getAuthHeader = async () => {
  const user = firebaseAuth.currentUser;
  if (!user) return null;
  const token = await getIdToken(user, true);
  return `Bearer ${token}`;
};

export const apiFetch = async (path: string, init: RequestInit = {}) => {
  const authHeader = await getAuthHeader();
  const headers = {
    'Content-Type': 'application/json',
    ...(init.headers || {}),
    ...(authHeader ? { Authorization: authHeader } : {})
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
