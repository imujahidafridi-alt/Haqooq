import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { verifyAdminRequest } from '@/lib/server/auth';
import { buildAuditLogPayload } from '@/lib/server/audit';

export const POST = async (request: Request) => {
  const auth = await verifyAdminRequest(request as any);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { reportId, status, actionTaken } = await request.json();
  if (!reportId || !status) {
    return NextResponse.json({ error: 'Missing reportId or status' }, { status: 400 });
  }

  const db = getAdminDb();
  const reportRef = db.collection('reports').doc(reportId);
  const reportSnap = await reportRef.get();

  if (!reportSnap.exists) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }

  const prevReport = reportSnap.data()!;
  if (prevReport.status === status) {
    return NextResponse.json({ error: 'Report already has requested status' }, { status: 400 });
  }

  const batch = db.batch();

  // 1. Update report status
  batch.update(reportRef, { 
    status, 
    actionTaken: actionTaken || 'Marked as processed',
    resolvedAt: new Date().toISOString()
  });

  // 2. Audit resolution action
  const logRef = db.collection('audit_logs').doc();
  const auditPayload = buildAuditLogPayload(request, auth, {
    action: 'REPORT_RESOLVE',
    module: 'reports',
    entityType: 'report',
    entityId: reportId,
    previousValue: { status: prevReport.status },
    newValue: { status, actionTaken: actionTaken || 'Marked as processed' },
    reason: null
  });
  batch.set(logRef, auditPayload);

  await batch.commit();

  return NextResponse.json({ success: true, newStatus: status });
};
