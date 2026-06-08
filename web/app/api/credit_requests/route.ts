import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { verifyAdminRequest } from '@/lib/server/auth';
import { FieldValue } from 'firebase-admin/firestore';
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
      console.log(`Push notification sent successfully to user ${userId}`);
    }
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
};

export const GET = async (request: Request) => {
  const auth = await verifyAdminRequest(request as any);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getAdminDb();
  const snapshot = await db
    .collection('credit_purchases')
    .orderBy('createdAt', 'desc')
    .limit(200)
    .get();

  const requests = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  const requestsWithLawyers = await Promise.all(
    requests.map(async (req: any) => {
      if (req.lawyerId) {
        try {
          const userSnap = await db.collection('users').doc(req.lawyerId).get();
          if (userSnap.exists) {
            const userData = userSnap.data()!;
            return {
              ...req,
              lawyerName: userData.displayName || userData.name || 'Unknown Lawyer',
              lawyerEmail: userData.email || 'N/A'
            };
          }
        } catch (e) {
          console.error(`Error fetching lawyer profile for ${req.lawyerId}:`, e);
        }
      }
      return {
        ...req,
        lawyerName: 'Unknown Lawyer',
        lawyerEmail: 'N/A'
      };
    })
  );

  return NextResponse.json(requestsWithLawyers);
};

export const POST = async (request: Request) => {
  const auth = await verifyAdminRequest(request as any);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { requestId, action, rejectionReason } = await request.json();
  if (!requestId || !action) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  const db = getAdminDb();
  const docRef = db.collection('credit_purchases').doc(requestId);

  try {
    const result = await db.runTransaction(async (transaction) => {
      const purchaseSnap = await transaction.get(docRef);
      if (!purchaseSnap.exists) {
        throw new Error('Not found');
      }

      const data = purchaseSnap.data()!;
      if (data.status !== 'pending') {
        throw new Error('Already processed');
      }

      const lawyerId = data.lawyerId;
      const userRef = db.collection('users').doc(lawyerId);
      const transRef = db.collection('transactions').doc();
      const notifRef = db.collection('notifications').doc();
      const auditLogRef = db.collection('audit_logs').doc();

      let pushTitle = '';
      let pushBody = '';

      if (action === 'approve') {
        const creditsToAdd = data.credits || 0;
        
        // 1. Update purchase request
        transaction.update(docRef, { status: 'approved', processedAt: new Date().toISOString() });
        
        // 2. Increment credits
        transaction.update(userRef, { credits: FieldValue.increment(creditsToAdd) });
        
        // 3. Create transaction ledger entry
        transaction.set(transRef, {
          userId: lawyerId,
          amount: data.amount,
          type: 'credit_purchase',
          status: 'completed',
          timestamp: new Date().toISOString()
        });

        pushTitle = 'Credits Added';
        pushBody = `Your payment was approved. ${creditsToAdd} credits added to your account.`;

        // 4. Create in-app notification
        transaction.set(notifRef, {
          userId: lawyerId,
          title: pushTitle,
          body: pushBody,
          message: pushBody,
          read: false,
          status: 'sent',
          createdAt: new Date().toISOString()
        });

        // 5. Standardized Audit Log Payload
        const auditPayload = buildAuditLogPayload(request, auth, {
          action: 'APPROVE_CREDIT',
          module: 'credits',
          entityType: 'credit_purchase',
          entityId: requestId,
          previousValue: { status: 'pending' },
          newValue: { status: 'approved', creditsAdded: creditsToAdd },
          reason: null
        });
        transaction.set(auditLogRef, auditPayload);

        return { success: true, lawyerId, pushTitle, pushBody };
      } else if (action === 'reject') {
        const reason = rejectionReason || 'No reason provided';

        // 1. Update purchase request
        transaction.update(docRef, { 
          status: 'rejected', 
          rejectionReason: reason,
          processedAt: new Date().toISOString() 
        });

        pushTitle = 'Payment Rejected';
        pushBody = `Your recent credit purchase request was rejected. Reason: ${reason}`;

        // 2. Create in-app notification
        transaction.set(notifRef, {
          userId: lawyerId,
          title: pushTitle,
          body: pushBody,
          message: pushBody,
          read: false,
          status: 'sent',
          createdAt: new Date().toISOString()
        });

        // 3. Standardized Audit Log Payload
        const auditPayload = buildAuditLogPayload(request, auth, {
          action: 'REJECT_CREDIT',
          module: 'credits',
          entityType: 'credit_purchase',
          entityId: requestId,
          previousValue: { status: 'pending' },
          newValue: { status: 'rejected', rejectionReason: reason },
          reason
        });
        transaction.set(auditLogRef, auditPayload);

        return { success: true, lawyerId, pushTitle, pushBody };
      } else {
        throw new Error('Invalid action parameter');
      }
    });

    // Send push notification in background after transaction succeeds
    if (result.lawyerId && result.pushTitle && result.pushBody) {
      sendPushNotification(result.lawyerId, result.pushTitle, result.pushBody);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Credit verification transaction failed:', error);
    return NextResponse.json({ error: error.message || 'Transaction failed' }, { status: 400 });
  }
};

