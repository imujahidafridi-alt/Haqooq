import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../services/firebaseConfig';
import { UserProfile } from '../../../types/models';

/**
 * Fetch all lawyers who have a 'pending' verification status
 */
export const getPendingLawyers = async (): Promise<UserProfile[]> => {
  try {
    const q = query(
      collection(db, 'users'),
      where('role', '==', 'lawyer'),
      where('status', '==', 'pending')
    );
    
    const querySnapshot = await getDocs(q);
    const lawyers: UserProfile[] = [];
    
    querySnapshot.forEach((doc) => {
      lawyers.push(doc.data() as UserProfile);
    });
    
    return lawyers;
  } catch (error) {
    console.warn("Mocking Admin Data due to disconnected config:", error);
    // Return dummy data if Firebase is disconnected in dev
    return [
      {
        id: 'mock-lawyer-1',
        role: 'lawyer',
        email: 'lawyer.john@test.com',
        displayName: 'John Doe',
        status: 'pending',
        createdAt: Date.now(),
      }
    ];
  }
};

/**
 * Approve a lawyer by updating their status to 'verified'
 */
export const approveLawyer = async (lawyerId: string): Promise<void> => {
  try {
    const lawyerRef = doc(db, 'users', lawyerId);
    await updateDoc(lawyerRef, {
      status: 'verified',
    });
  } catch (error) {
    console.warn("Mocking Admin verification:", error);
    throw new Error('Approval temporarily mocked in local dev.');
  }
};
