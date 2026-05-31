import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { verifyAdminRequest } from '@/lib/server/auth';
import { FieldValue } from 'firebase-admin/firestore';

export const GET = async (request: Request) => {
  const auth = await verifyAdminRequest(request as any);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const snapshot = await getAdminDb()
    .collection('credit_purchases')
    .orderBy('createdAt', 'desc')
    .limit(200)
    .get();

  const requests = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return NextResponse.json(requests);
};

export const POST = async (request: Request) => {
  const auth = await verifyAdminRequest(request as any);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { requestId, action } = await request.json();
  if (!requestId || !action) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  const db = getAdminDb();
  const docRef = db.collection('credit_purchases').doc(requestId);
  const purchaseSnap = await docRef.get();
  
  if (!purchaseSnap.exists) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const data = purchaseSnap.data()!;
  
  if (data.status !== 'pending') {
    return NextResponse.json({ error: 'Already processed' }, { status: 400 });
  }

  if (action === 'approve') {
    const creditsToAdd = data.credits || 0;
    const lawyerId = data.lawyerId;

    const batch = db.batch();
    
    // 1. Update request status
    batch.update(docRef, { status: 'approved', processedAt: new Date().toISOString() });
    
    // 2. Add credits to user
    const userRef = db.collection('users').doc(lawyerId);
    batch.update(userRef, { credits: FieldValue.increment(creditsToAdd) });
    
    // 3. Log transaction
    const transRef = db.collection('transactions').doc();
    batch.set(transRef, {
      userId: lawyerId,
      amount: data.amount,
      type: 'credit_purchase',
      status: 'completed',
      timestamp: new Date().toISOString()
    });

    await batch.commit();

    // Trigger notification
    await db.collection('notifications').add({
      userId: lawyerId,
      title: 'Credits Added',
      message: `Your payment was approved. ${creditsToAdd} credits added to your account.`,
      read: false,
      createdAt: new Date().toISOString()
    });

    // Create Audit Log
    await db.collection('audit_logs').add({
      adminId: auth.uid,
      action: 'APPROVE_CREDIT',
      targetId: requestId,
      details: `Approved ${creditsToAdd} credits for lawyer ${lawyerId}`,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({ success: true });
  } else if (action === 'reject') {
    await docRef.update({ status: 'rejected', processedAt: new Date().toISOString() });
    
    await db.collection('notifications').add({
      userId: data.lawyerId,
      title: 'Payment Rejected',
      message: `Your recent credit purchase request was rejected. Please contact support.`,
      read: false,
      createdAt: new Date().toISOString()
    });

    // Create Audit Log
    await db.collection('audit_logs').add({
      adminId: auth.uid,
      action: 'REJECT_CREDIT',
      targetId: requestId,
      details: `Rejected credit purchase for lawyer ${data.lawyerId}`,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
};
