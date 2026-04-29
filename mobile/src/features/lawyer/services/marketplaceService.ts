import { collection, query, where, getDocs, addDoc, orderBy, getDoc, doc } from 'firebase/firestore';
import { db } from '../../../services/firebaseConfig';
import { LegalCase, CaseProposal } from '../../../types/models';

/**
 * Fetches all cases currently open in the marketplace.
 * In a real-world scenario, this might also filter by the Lawyer's location or specialty.
 */
export const getOpenCases = async (): Promise<LegalCase[]> => {
  try {
    const q = query(
      collection(db, 'cases'),
      where('status', '==', 'open'),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const cases: LegalCase[] = [];
    
    for (const document of querySnapshot.docs) {
      const data = document.data() as LegalCase;
      
      // Dynamic Backfill logic for old cases missing a name
      if (!data.clientName || data.clientName === 'Unknown Client' || data.clientName === 'Anonymous Client') {
        try {
          const userDoc = await getDoc(doc(db, 'users', data.clientId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            data.clientName = userData.displayName || userData.name || userData.email || 'Anonymous Client';
          }
        } catch (e) {
          console.warn("Could not fetch old user profile for case.");
        }
      }
      
      cases.push({ ...data, id: document.id });
    }
    
    return cases;
  } catch (error) {
    console.warn("Using mocked data for open cases:", error);
    // Return dummy data for development without Firebase connected
    return [
      {
        id: 'mock-case-1',
        clientId: 'client-123',
        clientName: 'Jane Doe',
        title: 'Stop Eviction Notice',
        description: 'My landlord is trying to evict me without a 30-day notice. Need to file an injunction.',
        category: 'Property / Real Estate Law',
        budget: 15000,
        status: 'open',
        timeline: [],
        createdAt: Date.now() - 100000,
      },
      {
        id: 'mock-case-2',
        clientId: 'client-456',
        clientName: 'John Smith',
        title: 'Business Partnership Dispute',
        description: 'Co-founder is trying to sell company assets without board approval.',
        category: 'Corporate Law',
        budget: 75000,
        status: 'open',
        timeline: [],
        createdAt: Date.now() - 500000,
      }
    ];
  }
};

/**
 * Submits a bid/proposal on a specific case.
 */
export const submitProposal = async (
  caseId: string,
  lawyerId: string,
  bidAmount: number,
  message: string
): Promise<string> => {
  try {
    // 1. Prevent duplicate bids on the same case
    const duplicateQuery = query(
      collection(db, 'proposals'),
      where('caseId', '==', caseId),
      where('lawyerId', '==', lawyerId)
    );
    const duplicateBids = await getDocs(duplicateQuery);
    if (!duplicateBids.empty) {
      throw new Error('You have already submitted a proposal for this case.');
    }

    const proposalData: Omit<CaseProposal, 'id'> = {
      caseId,
      lawyerId,
      bidAmount,
      message,
      status: 'pending',
      createdAt: Date.now(),
    };

    const docRef = await addDoc(collection(db, 'proposals'), proposalData);
    return docRef.id;
  } catch (error: any) {
    console.error("Error submitting proposal:", error);
    throw new Error(error.message || 'Unable to submit your proposal. Please try again.');
  }
};

/**
 * Gets all Case IDs that the current lawyer has already submitted proposals for.
 */
export const getLawyerBiddedCaseIds = async (lawyerId: string): Promise<string[]> => {
  try {
    const q = query(
      collection(db, 'proposals'),
      where('lawyerId', '==', lawyerId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data().caseId as string);
  } catch (error) {
    console.warn("Could not fetch lawyer bids:", error);
    return [];
  }
};

export const reportCase = async (caseId: string, reporterId: string, reason: string): Promise<void> => {
  try {
    await addDoc(collection(db, 'reports'), {
      caseId,
      reporterId,
      reason,
      createdAt: new Date().toISOString(),
      status: 'pending'
    });
  } catch (error) {
    console.error('Error reporting case:', error);
    throw error;
  }
};
