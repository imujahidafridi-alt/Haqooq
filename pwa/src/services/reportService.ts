import { collection, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ReportEntityType, ReportCategory } from '../types/models';

export interface SubmitReportParams {
  entityId: string;
  entityType: ReportEntityType;
  reporterId: string;
  category: ReportCategory;
  reason: string;
}

export const submitReport = async (
  entityIdOrParams: string | SubmitReportParams,
  entityType?: ReportEntityType,
  reporterId?: string,
  category?: ReportCategory,
  reason?: string
) => {
  const payload = typeof entityIdOrParams === 'object'
    ? entityIdOrParams
    : {
        entityId: entityIdOrParams,
        entityType: entityType!,
        reporterId: reporterId!,
        category: category!,
        reason: reason || '',
      };

  await addDoc(collection(db, 'reports'), {
    entityId: payload.entityId,
    entityType: payload.entityType,
    reporterId: payload.reporterId,
    category: payload.category,
    reason: payload.reason.trim(),
    status: 'pending',
    createdAt: Date.now()
  });
};

export const reportService = {
  submitReport,
};
