import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { verifyAdminRequest } from '@/lib/server/auth';
import { buildAuditLogPayload } from '@/lib/server/audit';

export const GET = async (request: Request, { params }: { params: { chatId: string } }) => {
  const auth = await verifyAdminRequest(request as any);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { chatId } = params;
  if (!chatId) return NextResponse.json({ error: 'Missing chatId' }, { status: 400 });

  const db = getAdminDb();
  
  // Fetch messages
  const snapshot = await db
    .collection('chats')
    .doc(chatId)
    .collection('messages')
    .orderBy('timestamp', 'asc')
    .limit(500)
    .get();

  const messages = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  // Auditing: Log chat surveillance spying event for strict governance
  try {
    const auditPayload = buildAuditLogPayload(request, auth, {
      action: 'COMMUNICATION_SPY',
      module: 'surveillance',
      entityType: 'chat',
      entityId: chatId,
      previousValue: null,
      newValue: { messagesReadCount: messages.length },
      reason: null
    });

    await db.collection('audit_logs').add(auditPayload);
    console.log(`Audited spy logs for admin ${auth.uid} on chat ${chatId}`);
  } catch (err) {
    console.error('Failed to log spy audit trace:', err);
  }

  return NextResponse.json(messages);
};
