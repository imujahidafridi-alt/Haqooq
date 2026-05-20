import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { verifyAdminRequest } from '@/lib/server/auth';

export const GET = async (request: Request) => {
  const auth = await verifyAdminRequest(request as any);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const snapshot = await getAdminDb().collection('audit_logs').orderBy('timestamp', 'desc').limit(200).get();
  const logs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  return NextResponse.json(logs);
};
