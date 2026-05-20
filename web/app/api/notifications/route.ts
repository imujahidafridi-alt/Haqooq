import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { verifyAdminRequest } from '@/lib/server/auth';

export const GET = async (request: Request) => {
  const auth = await verifyAdminRequest(request as any);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const snapshot = await getAdminDb().collection('notifications').orderBy('createdAt', 'desc').limit(200).get();
  const notifications = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  return NextResponse.json(notifications);
};
