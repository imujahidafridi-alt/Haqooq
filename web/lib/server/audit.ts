import { getAdminDb } from '@/lib/firebaseAdmin';

export interface AuditLogPayload {
  adminId: string;
  adminName: string;
  adminRole: string;
  action: string;
  module: string;
  entityType: string;
  entityId: string;
  previousValue?: any;
  newValue?: any;
  reason?: string | null;
  timestamp: string;
  ipAddress: string;
  userAgent: string;
}

export const buildAuditLogPayload = (
  request: Request,
  auth: { uid: string; profile: any },
  params: {
    action: string;
    module: string;
    entityType: string;
    entityId: string;
    previousValue?: any;
    newValue?: any;
    reason?: string | null;
  }
): AuditLogPayload => {
  const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
  const userAgent = request.headers.get('user-agent') || 'Unknown';
  
  return {
    adminId: auth.uid,
    adminName: auth.profile.displayName || auth.profile.name || 'Admin',
    adminRole: auth.profile.role,
    action: params.action,
    module: params.module,
    entityType: params.entityType,
    entityId: params.entityId,
    previousValue: params.previousValue || null,
    newValue: params.newValue || null,
    reason: params.reason || null,
    timestamp: new Date().toISOString(),
    ipAddress,
    userAgent
  };
};
