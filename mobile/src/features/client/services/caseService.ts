import { collection, addDoc, updateDoc, doc, getDocs, query, where, writeBatch, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../../services/firebaseConfig';
import { LegalCase, CaseProposal } from '../../../types/models';
import { triggerPushNotification } from '../../../services/notificationService';

/**
 * MVP ARCHITECTURE: Client-side AI Simulation
 * (In production, using cloud functions avoids exposing GROQ_API_KEY)
 */
export const classifyCaseWithAI = async (description: string): Promise<string> => {
  try {
    const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY;
    
    // Local NLP RegExp Matcher Fallback
    if (!GROQ_API_KEY) {
      console.warn("No EXPO_PUBLIC_GROQ_API_KEY found, using local NLP simulation.");
      const lowerDesc = description.toLowerCase();
      if (/(property|land|estate|tenant|evict|lease|mortgage)/.test(lowerDesc)) return 'Property / Real Estate Law';
      if (/(divorce|child|marriage|custody|alimony|spouse)/.test(lowerDesc)) return 'Family Law';
      if (/(business|corporate|contract|fraud|equity|startup)/.test(lowerDesc)) return 'Corporate Law';
      if (/(arrest|murder|fraud|police|jail|bail|criminal|theft)/.test(lowerDesc)) return 'Criminal Law';
      return 'Civil Litigation';
    }

    // Call Groq LLaMA directly from the app for MVP testing
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: 'You are an expert legal AI classifier. Classify the following case description strictly into exactly one of these five categories: Property / Real Estate Law, Family Law, Corporate Law, Criminal Law, Civil Litigation. Respond ONLY with the category name and nothing else.' },
          { role: 'user', content: description }
        ],
        temperature: 0.1,
        max_tokens: 10
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Groq Error Payload] Status: ${response.status} -`, errorText);
      throw new Error("Groq API Rejected Request");
    }

    const result = await response.json();
    let category = result.choices?.[0]?.message?.content?.trim().replace(/["']/g, "") || 'Civil Litigation';
    
    const validCategories = ['Property / Real Estate Law', 'Family Law', 'Corporate Law', 'Criminal Law', 'Civil Litigation'];
    return validCategories.includes(category) ? category : 'Civil Litigation';
    
  } catch (error) {
    console.error("AI Classification Error (Using Fallback):", error);
    return 'Civil Litigation'; // Safe fallback
  }
};

/**
 * Submits a validated and categorized case to the Firestore 'cases' collection
 */
export const postCaseToMarketplace = async (
  clientId: string,
  clientName: string,
  title: string,
  description: string,
  category: string,
  budget?: number
): Promise<string> => {
  try {
    const caseData: Omit<LegalCase, 'id'> = {
      clientId,
      clientName,
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
export const acceptProposal = async (proposalId: string, caseId: string, lawyerId: string, clientId: string, agreedAmount: number = 0) => {
  try {
    // [ENTERPRISE PATTERN]: 0. Pre-Approval Payment Escrow (Mocked)
    // In production, insert Stripe/Braintree hold authorization here.
    // if(!await authorizePaymentHold(clientId, agreedAmount)) throw new Error('Payment method failed validation');
    console.log(`[Escrow API] Authorized hold of $${agreedAmount} for client ${clientId}`);

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

    // [ENTERPRISE PATTERN]: 5. Create immutable Immutable Audit Log
    // Temporarily disabled to prevent "Missing or insufficient permissions" error
    // until `audit_logs` is explicitly configured in Firestore Security Rules
    /*
    const auditRef = doc(collection(db, 'audit_logs'));
    batch.set(auditRef, {
      type: 'PROPOSAL_ACCEPTED',
      caseId,
      proposalId,
      clientId,
      lawyerId,
      amountEscrowed: agreedAmount,
      timestamp: serverTimestamp()
    });
    */

    // Commit the entire atomic operation
    await batch.commit();

    // [ENTERPRISE PATTERN]: 6. Trigger Push Notification asynchronously
    // Dispatch to Cloud Function so client app UI doesn't hang waiting for FCM.
    triggerPushNotification(
      lawyerId, 
      "Proposal Accepted!", 
      "A client has hired you. Tap to start chatting now.", 
      { caseId, type: 'MATCHED' }
    );
  } catch (error) {
    console.error("Error accepting proposal:", error);
    throw new Error("Unable to accept proposal.");
  }
};

/**
 * Marks a case as closed and updates the timeline.
 */
export const closeCase = async (caseId: string, closedBy: string) => {
  try {
    const caseRef = doc(db, 'cases', caseId);
    const timelineUpdate = {
      id: Date.now().toString(),
      title: 'Case Closed',
      date: Date.now(),
      description: `This case was officially closed by the ${closedBy}.`
    };
    
    await updateDoc(caseRef, {
      status: 'closed',
      timeline: arrayUnion(timelineUpdate)
    });
  } catch (error) {
    console.error("Error closing case:", error);
    throw new Error("Unable to close case.");
  }
};

