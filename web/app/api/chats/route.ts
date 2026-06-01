import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { verifyAdminRequest } from '@/lib/server/auth';

export const GET = async (request: Request) => {
  const auth = await verifyAdminRequest(request as any);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getAdminDb();
  const snapshot = await db.collection('chats').orderBy('updatedAt', 'desc').limit(200).get();
  
  // Also fetch details of the participants
  const chats = await Promise.all(snapshot.docs.map(async (docRef) => {
    const data = docRef.data();
    
    const participantDetails = [];
    if (Array.isArray(data.participants)) {
      for (const uid of data.participants) {
        try {
          const userSnap = await db.collection('users').doc(uid).get();
          if (userSnap.exists) {
            const userData = userSnap.data()!;
            participantDetails.push({
              uid,
              name: userData.displayName || userData.name || userData.email || 'Unknown User',
              role: userData.role || 'user'
            });
          } else {
            participantDetails.push({ uid, name: 'Unknown User', role: 'unknown' });
          }
        } catch (e) {
          participantDetails.push({ uid, name: 'Error', role: 'unknown' });
        }
      }
    }

    let caseTitle = data.metadata?.caseTitle || null;
    if (!caseTitle && data.caseId) {
      try {
        const caseSnap = await db.collection('cases').doc(data.caseId).get();
        if (caseSnap.exists) {
           caseTitle = caseSnap.data()?.title;
        }
      } catch(e) {}
    }

    return { 
      id: docRef.id, 
      ...data,
      participantDetails,
      resolvedCaseTitle: caseTitle || 'Direct Chat'
    };
  }));

  return NextResponse.json(chats);
};
