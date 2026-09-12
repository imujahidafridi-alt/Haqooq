import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { verifyAdminRequest } from '@/lib/server/auth';
import { AggregateField } from 'firebase-admin/firestore';

export const GET = async (request: Request) => {
  const req = request as any;
  const auth = await verifyAdminRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminDb = getAdminDb();
  
  const [
    usersCountReq,
    lawyersCountReq,
    clientsCountReq,
    openCasesReq,
    activeCasesReq,
    closedCasesReq,
    reportsCountReq,
    revenueReq,
    auditSnapshot,
    lawyerSnapshot
  ] = await Promise.all([
    adminDb.collection('users').count().get(),
    adminDb.collection('users').where('role', '==', 'lawyer').count().get(),
    adminDb.collection('users').where('role', '==', 'client').count().get(),
    adminDb.collection('cases').where('status', '==', 'open').count().get(),
    adminDb.collection('cases').where('status', '==', 'active').count().get(),
    adminDb.collection('cases').where('status', '==', 'closed').count().get(),
    adminDb.collection('reports').where('status', '==', 'pending').count().get(),
    adminDb.collection('transactions').aggregate({ revenue: AggregateField.sum('amount') }).get(),
    adminDb.collection('audit_logs').orderBy('timestamp', 'desc').limit(5).get(),
    adminDb.collection('users').where('role', '==', 'lawyer').limit(5).get()
  ]);

  const summary = {
    userCount: usersCountReq.data().count,
    lawyerCount: lawyersCountReq.data().count,
    clientCount: clientsCountReq.data().count,
    openCases: openCasesReq.data().count,
    activeCases: activeCasesReq.data().count,
    closedCases: closedCasesReq.data().count,
    revenueTotal: revenueReq.data().revenue ?? 0,
    pendingReports: reportsCountReq.data().count,
    recentActivity: auditSnapshot.docs.map((doc) => {
      const d = doc.data();
      let rawTimestamp = d.timestamp;
      let normalizedTimestamp = Date.now();
      if (typeof rawTimestamp === 'number') {
        normalizedTimestamp = rawTimestamp;
      } else if (typeof rawTimestamp === 'string') {
        normalizedTimestamp = new Date(rawTimestamp).getTime() || Date.now();
      } else if (rawTimestamp && typeof rawTimestamp.toDate === 'function') {
        normalizedTimestamp = rawTimestamp.toDate().getTime();
      } else if (rawTimestamp && typeof rawTimestamp._seconds === 'number') {
        normalizedTimestamp = rawTimestamp._seconds * 1000;
      }

      const rawAction = d.action || 'GOVERNANCE_EVENT';
      const formattedTitle = rawAction
        .split('_')
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');

      return {
        id: doc.id,
        ...d,
        title: d.title || `${formattedTitle} (${d.module || d.entityType || 'system'})`,
        timestamp: normalizedTimestamp
      };
    }),
    lawyerPerformance: lawyerSnapshot.docs.map((doc) => {
      const data = doc.data();
      return { 
        name: data.displayName || data.email || 'Unknown', 
        value: data.casesResolved || 0 
      };
    })
  };

  return NextResponse.json(summary);
};