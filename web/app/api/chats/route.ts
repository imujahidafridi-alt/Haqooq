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
  
  const rawChats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

  // Collect distinct participant UIDs and caseIds
  const participantUids = new Set<string>();
  const caseIds = new Set<string>();
  
  rawChats.forEach(chat => {
    if (Array.isArray(chat.participants)) {
      chat.participants.forEach((uid: string) => participantUids.add(uid));
    }
    if (chat.caseId) {
      caseIds.add(chat.caseId);
    }
  });

  // Fetch all participant details in a single batch
  const userDetailsMap: Record<string, { uid: string; name: string; role: string }> = {};
  if (participantUids.size > 0) {
    const userRefs = Array.from(participantUids).map(uid => db.collection('users').doc(uid));
    const userDocs = await db.getAll(...userRefs);
    userDocs.forEach(userDoc => {
      if (userDoc.exists) {
        const data = userDoc.data()!;
        userDetailsMap[userDoc.id] = {
          uid: userDoc.id,
          name: data.displayName || data.name || data.email || 'Unknown User',
          role: data.role || 'user'
        };
      } else {
        userDetailsMap[userDoc.id] = {
          uid: userDoc.id,
          name: 'Unknown User',
          role: 'unknown'
        };
      }
    });
  }

  // Fetch all case details in a single batch
  const caseTitleMap: Record<string, string> = {};
  if (caseIds.size > 0) {
    const caseRefs = Array.from(caseIds).map(cid => db.collection('cases').doc(cid));
    const caseDocs = await db.getAll(...caseRefs);
    caseDocs.forEach(caseDoc => {
      if (caseDoc.exists) {
        caseTitleMap[caseDoc.id] = caseDoc.data()?.title || 'Untitled Case';
      }
    });
  }

  // Map participant details back to chat objects
  const chats = rawChats.map(chat => {
    const participantDetails = (chat.participants || []).map((uid: string) => {
      return userDetailsMap[uid] || { uid, name: 'Unknown User', role: 'unknown' };
    });

    const caseTitle = chat.metadata?.caseTitle || (chat.caseId ? caseTitleMap[chat.caseId] : null) || 'Direct Chat';

    return {
      ...chat,
      participantDetails,
      resolvedCaseTitle: caseTitle
    };
  });

  return NextResponse.json(chats);
};
