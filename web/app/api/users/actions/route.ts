import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { verifyAdminRequest } from '@/lib/server/auth';
import { buildAuditLogPayload } from '@/lib/server/audit';

const sendPushNotification = async (userId: string, title: string, body: string) => {
  try {
    const db = getAdminDb();
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) return;
    const token = userDoc.data()?.expoPushToken;
    if (token && token.startsWith('ExponentPushToken')) {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: token,
          title,
          body,
          sound: 'default'
        }),
      });
    }
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
};

export const POST = async (request: Request) => {
  const auth = await verifyAdminRequest(request as any);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { userId, action, reason } = await request.json();
  if (!userId || !action) {
    return NextResponse.json({ error: 'Missing userId or action' }, { status: 400 });
  }

  const db = getAdminDb();
  const userRef = db.collection('users').doc(userId);
  const userSnap = await userRef.get();

  if (!userSnap.exists) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const userData = userSnap.data()!;
  const oldStatus = userData.status || 'pending';
  let newStatus = oldStatus;
  let auditAction = 'USER_UPDATE';
  let notificationTitle = '';
  let notificationBody = '';

  if (action === 'verify') {
    newStatus = 'verified';
    auditAction = 'USER_VERIFY';
    notificationTitle = 'Account Verified';
    notificationBody = 'Your legal profile has been verified. You can now bid on active client cases.';
  } else if (action === 'reject') {
    newStatus = 'rejected';
    auditAction = 'USER_REJECT';
    notificationTitle = 'Documents Rejected';
    notificationBody = `Your uploaded verification credentials were rejected. Reason: ${reason || 'Invalid documents'}`;
  } else if (action === 'suspend') {
    newStatus = 'suspended';
    auditAction = 'USER_SUSPEND';
    notificationTitle = 'Account Suspended';
    notificationBody = `Your account has been suspended for compliance review. Reason: ${reason || 'Policy violation'}`;
  } else if (action === 'unsuspend') {
    newStatus = 'verified';
    auditAction = 'USER_UNSUSPEND';
    notificationTitle = 'Suspension Lifted';
    notificationBody = 'Your account suspension has been lifted. Full permissions are restored.';
  } else {
    return NextResponse.json({ error: 'Invalid action parameter' }, { status: 400 });
  }

  const batch = db.batch();

  // 1. Update user profile status
  batch.update(userRef, { status: newStatus });

  // 2. Commit log into append-only governance trail
  const logRef = db.collection('audit_logs').doc();
  const auditPayload = buildAuditLogPayload(request, auth, {
    action: auditAction,
    module: 'users',
    entityType: 'user',
    entityId: userId,
    previousValue: { status: oldStatus },
    newValue: { status: newStatus },
    reason: reason || null
  });
  batch.set(logRef, auditPayload);

  // 3. Queue Notification in Firestore
  const notifRef = db.collection('notifications').doc();
  batch.set(notifRef, {
    userId,
    title: notificationTitle,
    body: notificationBody,
    message: notificationBody,
    read: false,
    status: 'sent',
    createdAt: new Date().toISOString()
  });

  await batch.commit();

  // Send push notification in background
  sendPushNotification(userId, notificationTitle, notificationBody);

  return NextResponse.json({ success: true, newStatus });
};
