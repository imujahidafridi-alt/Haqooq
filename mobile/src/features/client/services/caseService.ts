import { collection, addDoc, updateDoc, doc, getDocs, query, where, writeBatch, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { db } from '../../../services/firebaseConfig';
import { LegalCase, CaseProposal } from '../../../types/models';

/**
 * 🔒 ARCHITECTURAL NOTE FOR MVP:
 * This runs simple string-matching on the client to simulate NLP.
 * In Production: 
 *   - The mobile client forwards 'description' to a Firebase Cloud Function.
 *   - Cloud Function hits OpenAI API (or similar) to classify intent securely.
 *   - Function writes to Firestore and auto-triggers match notifications to lawyers.
 */
export const classifyCaseWithAI = async (description: string): Promise<string> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const lowerDesc = description.toLowerCase();
      // Expanded dictionary mapping for better MVP NLP simulation
      if (/(property|land|estate|tenant|evict|lease|mortgage)/.test(lowerDesc)) {
        resolve('Property / Real Estate Law');
      } else if (/(divorce|child|marriage|custody|alimony|spouse)/.test(lowerDesc)) {
        resolve('Family Law');
      } else if (/(business|corporate|contract|fraud|equity|startup)/.test(lowerDesc)) {
        resolve('Corporate Law');
      } else if (/(arrest|murder|fraud|police|jail|bail|criminal|theft)/.test(lowerDesc)) {
        resolve('Criminal Law');
      } else {
        resolve('Civil Litigation'); // Fallback
      }
    }, 800); // 800ms latency feels more responsive for a presentation
  });
};

/**
 * Submits a validated and categorized case to the Firestore 'cases' collection
 */
export const postCaseToMarketplace = async (
  clientId: string,
  title: string,
  description: string,
  category: string,
  budget?: number
): Promise<string> => {
  try {
    const caseData: Omit<LegalCase, 'id'> = {
      clientId,
      title,
      description,
      category,
      budget,
      status: 'open',
      timeline: [
        {
          id: Date.now().toString(),
          title: 'Case Posted',
          date: Date.now(),
          description: 'Case has been pushed to the marketplace for lawyer review.'
        }
      ],
      createdAt: Date.now(),
    };

      const docRef = await addDoc(collection(db, 'cases'), caseData);
      return docRef.id;
    } catch (error) {
      console.error("Error posting case:", error);
      throw new Error("Unable to post case. Please check your connection.");
    }
  };
  
/**
 * Fetches all proposals for a specific case
 */
export const getProposalsForCase = async (caseId: string): Promise<CaseProposal[]> => {
  try {
    const q = query(
      collection(db, 'proposals'),
      where('caseId', '==', caseId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as CaseProposal[];
  } catch (error) {
    console.error("Error fetching proposals:", error);
    throw new Error("Unable to fetch proposals.");
  }
};

/**
 * Accepts a specific proposal for a case, updates case status, and initializes chat.
 */
export const acceptProposal = async (proposalId: string, caseId: string, lawyerId: string, clientId: string) => {
  try {
    const batch = writeBatch(db);

    // 1. Update proposal status
    const proposalRef = doc(db, 'proposals', proposalId);
    batch.update(proposalRef, { status: 'accepted' });

    // 2. Update all other proposals to 'rejected'
    const q = query(collection(db, 'proposals'), where('caseId', '==', caseId));
    const proposalDocs = await getDocs(q);
    proposalDocs.forEach(d => {
      if (d.id !== proposalId) {
         batch.update(doc(db, 'proposals', d.id), { status: 'rejected' });
      }
    });

    // 3. Update the case itself
    const caseRef = doc(db, 'cases', caseId);
    const timelineUpdate = {
      id: Date.now().toString(),
      title: 'Lawyer Assigned',
      date: Date.now(),
      description: 'You accepted a proposal and a lawyer has been assigned to this case.'
    };
    
    batch.update(caseRef, {
      status: 'active',
      assignedLawyerId: lawyerId,
      timeline: arrayUnion(timelineUpdate)
    });

    // 4. Create Chat Thread
    const threadRef = doc(collection(db, 'chats')); // Generate new ID
    batch.set(threadRef, {
      caseId,
      participants: [clientId, lawyerId],
      lastMessage: 'Chat started. You can now discuss the case.',
      updatedAt: Date.now()
    });

    await batch.commit();
  } catch (error) {
    console.error("Error accepting proposal:", error);
    throw new Error("Unable to accept proposal.");
  }
};

