import { doc, collection, addDoc, updateDoc, getDoc, runTransaction } from 'firebase/firestore';
import { db } from '../../../services/firebaseConfig';
import { Review, LawyerProfile } from '../../../types/models';

export const submitLawyerRating = async (
  caseId: string,
  lawyerId: string,
  clientId: string,
  rating: number,
  reviewText: string
): Promise<void> => {
  if (rating < 1 || rating > 5) {
    throw new Error('Rating must be between 1 and 5');
  }

  // Use a transaction to ensure we correctly recalculate the lawyer's average rating
  await runTransaction(db, async (transaction) => {
    const lawyerRef = doc(db, 'users', lawyerId);
    const lawyerDoc = await transaction.get(lawyerRef);

    if (!lawyerDoc.exists()) {
      throw new Error('Lawyer not found.');
    }

    const lawyerData = lawyerDoc.data() as LawyerProfile;
    
    // Calculate new average rating
    // Since we don't store total ratings count right now, we can approximate or we should store it.
    // For enterprise grade, we should store `ratingCount` on the lawyer profile.
    const currentRating = lawyerData.rating || 0;
    const currentCount = lawyerData.ratingCount || 0;
    
    const newCount = currentCount + 1;
    const newTotalScore = (currentRating * currentCount) + rating;
    const newAverage = newTotalScore / newCount;

    // Create the review document reference
    const reviewRef = doc(collection(db, 'reviews'));
    
    const newReview: Omit<Review, 'id'> = {
      caseId,
      lawyerId,
      clientId,
      rating,
      reviewText,
      createdAt: Date.now()
    };

    // Update case reference
    const caseRef = doc(db, 'cases', caseId);

    // Commit writes
    transaction.set(reviewRef, newReview);
    transaction.update(lawyerRef, {
      rating: newAverage,
      ratingCount: newCount
    });
    transaction.update(caseRef, {
      hasBeenRated: true
    });
  });
};
