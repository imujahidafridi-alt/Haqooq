import { collection, query, where, getDocs, addDoc, orderBy, getDoc, doc, limit } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../../services/firebaseConfig';
import { LegalCase, CaseProposal } from '../../../types/models';

/**
 * Fetches cases currently open in the marketplace (paginated / limited).
 */
export const getOpenCases = async (pageSize: number = 50): Promise<LegalCase[]> => {
  try {
    const q = query(
      collection(db, 'cases'),
      where('status', '==', 'open'),
      orderBy('createdAt', 'desc'),
      limit(pageSize)
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
    console.warn("Error fetching open cases:", error);
    return [];
  }
};

/**
 * Submits a bid/proposal on a specific case via server-authoritative Cloud Function.
 * The server verifies verification status, checks credit balance, verifies single proposal uniqueness,
 * atomically decrements credit, creates the proposal, and logs the ledger entry.
 */
export const submitProposal = async (
  caseId: string,
  lawyerId: string,
  bidAmount: number,
  message: string
): Promise<string> => {
  try {
    const submitProposalFn = httpsCallable<{ caseId: string; bidAmount: number; message: string }, { success: boolean; proposalId: string }>(
      functions,
      'submitProposal'
    );

    const result = await submitProposalFn({
      caseId,
      bidAmount,
      message
    });

    return result.data.proposalId;
  } catch (error: any) {
    console.error("Error submitting proposal via Cloud Function:", error);
    throw new Error(error.message || 'Unable to submit your proposal. Please check your credentials or credits.');
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
