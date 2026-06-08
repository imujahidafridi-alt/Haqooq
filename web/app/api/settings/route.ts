import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { verifyAdminRequest } from '@/lib/server/auth';
import { buildAuditLogPayload } from '@/lib/server/audit';

export const GET = async (request: Request) => {
  const auth = await verifyAdminRequest(request as any);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getAdminDb();
  const configSnap = await db.collection('settings').doc('app_config').get();

  if (!configSnap.exists) {
    return NextResponse.json({
      maintenanceMode: false,
      brandingTitle: 'Haqooq Governance Portal'
    });
  }

  return NextResponse.json(configSnap.data());
};

export const POST = async (request: Request) => {
  const auth = await verifyAdminRequest(request as any);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const db = getAdminDb();
  const configRef = db.collection('settings').doc('app_config');
  const configSnap = await configRef.get();

  const prevConfig = configSnap.exists
    ? configSnap.data()!
    : { maintenanceMode: false, brandingTitle: 'Haqooq Governance Portal' };

  const newConfig = {
    maintenanceMode: typeof body.maintenanceMode === 'boolean' ? body.maintenanceMode : prevConfig.maintenanceMode,
    brandingTitle: body.brandingTitle || prevConfig.brandingTitle,
    updatedAt: new Date().toISOString()
  };

  const batch = db.batch();

  // 1. Update config
  batch.set(configRef, newConfig, { merge: true });

  // 2. Audit config change
  const logRef = db.collection('audit_logs').doc();
  const auditPayload = buildAuditLogPayload(request, auth, {
    action: 'SETTINGS_CHANGE',
    module: 'settings',
    entityType: 'settings',
    entityId: 'app_config',
    previousValue: prevConfig,
    newValue: newConfig,
    reason: null
  });
  batch.set(logRef, auditPayload);

  await batch.commit();

  return NextResponse.json({ success: true, config: newConfig });
};
