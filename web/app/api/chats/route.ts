import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { verifyAdminRequest } from '@/lib/server/auth';

export const GET = async (request: Request) => {
  const auth = await verifyAdminRequest(request as any);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const snapshot = await getAdminDb().collection('chats').orderBy('updatedAt', 'desc').limit(200).get();
  
  // Also fetch details of the participants
  const chats = await Promise.all(snapshot.docs.map(async (doc) => {
    const data = doc.data();
    return { id: doc.id, ...data };
  }));

  return NextResponse.json(chats);
};
