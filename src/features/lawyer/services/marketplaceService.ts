import { collection, query, where, getDocs, addDoc, orderBy } from 'firebase/firestore';
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
    
    querySnapshot.forEach((doc) => {
      cases.push({ id: doc.id, ...doc.data() } as LegalCase);
    });
    
    return cases;
  } catch (error) {
    console.warn("Using mocked data for open cases:", error);
    // Return dummy data for development without Firebase connected
    return [
      {
        id: 'mock-case-1',
        clientId: 'client-123',
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
  } catch (error) {
    console.error("Error submitting proposal:", error);
    throw new Error('Unable to submit your proposal. Please try again.');
  }
};
