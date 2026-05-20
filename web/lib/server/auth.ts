import { NextRequest } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebaseAdmin';

export const verifyAdminRequest = async (request: NextRequest) => {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return null;
  }

  const token = authorization.split(' ')[1];
  if (!token) return null;

  const decoded = await getAdminAuth().verifyIdToken(token).catch(() => null);
  if (!decoded?.uid) return null;

  const userDoc = await getAdminDb().collection('users').doc(decoded.uid).get();
  if (!userDoc.exists) return null;

  const userData = userDoc.data();
  if (!userData || userData.role !== 'admin') return null;

  return { uid: decoded.uid, profile: userData };
};
