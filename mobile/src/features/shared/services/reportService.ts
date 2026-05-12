import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../../services/firebaseConfig';
import { Report, ReportEntityType, ReportCategory } from '../../../types/models';

/**
 * A highly scalable generic reporting service decoupled from any specific feature.
 * Can be used to report posts (cases), users, reviews, and messages.
 */
export const submitReport = async (
  entityId: string,
  entityType: ReportEntityType,
  reporterId: string,
  category: ReportCategory,
  reason: string
): Promise<string> => {
  try {
    const reportData: Omit<Report, 'id'> = {
      entityId,
      entityType,
      reporterId,
      category,
      reason,
      status: 'pending',
      createdAt: Date.now()
    };
    
    const docRef = await addDoc(collection(db, 'reports'), reportData);
    return docRef.id;
  } catch (error) {
    console.error('Error submitting report:', error);
    throw new Error('Unable to submit the report at this time. Please try again.');
  }
};
