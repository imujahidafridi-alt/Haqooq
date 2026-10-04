import { collection, addDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const submitLawyerRating = async (
  caseId: string, 
  lawyerId: string, 
  clientId: string, 
  rating: number, 
  reviewText: string
) => {
  // 1. Add review document
  await addDoc(collection(db, 'reviews'), {
    caseId,
    lawyerId,
    clientId,
    rating,
    reviewText: reviewText.trim(),
    createdAt: Date.now()
  });

  // 2. Mark case as rated
  const caseRef = doc(db, 'cases', caseId);
  await updateDoc(caseRef, { hasBeenRated: true });

  // 3. Recalculate lawyer rating average
  const lawyerRef = doc(db, 'users', lawyerId);
  const snap = await getDoc(lawyerRef);
  if (snap.exists()) {
    const data = snap.data();
    const currentRating = typeof data.rating === 'number' ? data.rating : 0;
    const currentCount = typeof data.ratingCount === 'number' ? data.ratingCount : 0;

    const newCount = currentCount + 1;
    const newRating = Number(((currentRating * currentCount + rating) / newCount).toFixed(1));

    await updateDoc(lawyerRef, {
      rating: newRating,
      ratingCount: newCount
    });
  }
};
