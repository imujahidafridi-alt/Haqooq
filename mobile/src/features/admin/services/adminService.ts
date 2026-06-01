import { collection, query, where, getDocs, doc, updateDoc, count, getCountFromServer } from 'firebase/firestore';
import { db } from '../../../services/firebaseConfig';
import { UserProfile } from '../../../types/models';

export const getAdminStats = async () => {
  try {
    const clientsQ = query(collection(db, 'users'), where('role', '==', 'client'));
    const lawyersQ = query(collection(db, 'users'), where('role', '==', 'lawyer'));
    const pendingQ = query(collection(db, 'users'), where('role', '==', 'lawyer'), where('status', '==', 'pending'));
    const casesQ = query(collection(db, 'cases'));
    
    const [clientsSnap, lawyersSnap, pendingSnap, casesSnap] = await Promise.all([
      getCountFromServer(clientsQ),
      getCountFromServer(lawyersQ),
      getCountFromServer(pendingQ),
      getCountFromServer(casesQ)
    ]);
    
    return {
      totalClients: clientsSnap.data().count,
      totalLawyers: lawyersSnap.data().count,
      pendingVerifications: pendingSnap.data().count,
      totalCases: casesSnap.data().count
    };
  } catch (error) {
    console.warn("Mocking admin stats due to error:", error);
    return {
      totalClients: 12,
      totalLawyers: 5,
      pendingVerifications: 1,
      totalCases: 8
    };
  }
};

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
