import { collection, query, where, getDocs, doc, updateDoc, count, getCountFromServer } from 'firebase/firestore';
import { db } from '../../../services/firebaseConfig';
import { UserProfile } from '../../../types/models';

export const getAdminStats = async () => {
  try {
    const clientsQ = query(collection(db, 'users'), where('role', '==', 'client'));
    const lawyersQ = query(collection(db, 'users'), where('role', '==', 'lawyer'));
    const pendingQ = query(collection(db, 'users'), where('role', '==', 'lawyer'), where('status', 'in', ['pending', 'under_review']));
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
    console.warn("Could not fetch live admin stats:", error);
    return {
      totalClients: 0,
      totalLawyers: 0,
      pendingVerifications: 0,
      totalCases: 0
    };
  }
};

/**
 * Fetch all lawyers who have a 'pending' or 'under_review' verification status
 */
export const getPendingLawyers = async (): Promise<UserProfile[]> => {
  try {
    const q = query(
      collection(db, 'users'),
      where('role', '==', 'lawyer'),
      where('status', 'in', ['pending', 'under_review'])
    );
    
    const querySnapshot = await getDocs(q);
    const lawyers: UserProfile[] = [];
    
    querySnapshot.forEach((doc) => {
      lawyers.push({ ...(doc.data() as UserProfile), id: doc.id });
    });
    
    return lawyers;
  } catch (error) {
    console.error("Error fetching pending lawyers from Firestore:", error);
    return [];
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
      verifiedAt: Date.now(),
      credits: 10
    });
  } catch (error) {
    console.error("Error verifying lawyer in Firestore:", error);
    throw error;
  }
};

/**
 * Reject a lawyer verification request with feedback
 */
export const rejectLawyer = async (lawyerId: string, reason?: string): Promise<void> => {
  try {
    const lawyerRef = doc(db, 'users', lawyerId);
    await updateDoc(lawyerRef, {
      status: 'rejected',
      rejectionReason: reason || 'Credentials could not be authenticated against the Pakistan Bar Council records.',
    });
  } catch (error) {
    console.error("Error rejecting lawyer verification in Firestore:", error);
    throw error;
  }
};
