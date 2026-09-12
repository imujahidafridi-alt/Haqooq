import { doc, collection, writeBatch } from 'firebase/firestore';
import { db } from '../../../services/firebaseConfig';
import { Review } from '../../../types/models';

/**
 * Submits a lawyer rating and review for a closed case.
 * Security & Data Integrity:
 * - Writes review record to '/reviews' collection conforming to firestore.rules.
 * - Marks case as rated on '/cases/{caseId}' (client-owned document).
 * - Lawyer aggregate rating computation is handled server-side by onReviewCreated Cloud Function,
 *   preventing client-side permission denial or score tampering.
 */
export const submitLawyerRating = async (
  caseId: string,
  lawyerId: string,
  clientId: string,
  rating: number,
  reviewText: string
): Promise<void> => {
  if (rating < 1 || rating > 5) {
    throw new Error('Rating must be between 1 and 5 stars.');
  }

  const batch = writeBatch(db);

  // 1. Create review document conforming to firestore.rules
  const reviewRef = doc(collection(db, 'reviews'));
  const newReview: Omit<Review, 'id'> = {
    caseId,
    lawyerId,
    clientId,
    rating,
    reviewText: reviewText?.trim() || '',
    createdAt: Date.now()
  };
  batch.set(reviewRef, newReview);

  // 2. Mark case as rated (client owns the case document)
  const caseRef = doc(db, 'cases', caseId);
  batch.update(caseRef, {
    hasBeenRated: true
  });

  await batch.commit();
};
