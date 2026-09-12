import { collection, addDoc, updateDoc, doc, getDocs, query, where, writeBatch, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions, auth } from '../../../services/firebaseConfig';
import { LegalCase, CaseProposal, CourtLevel, UrgencyLevel, BudgetType } from '../../../types/models';
import { postCaseInputSchema, PostCaseInput } from '../../../types/schemas';
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
        model: 'llama-3.3-70b-versatile',
        response_format: { type: "json_object" },
        messages: [
          { 
            role: 'system', 
            content: `You are an expert legal AI classifier.
Study the case description thoroughly before categorizing.
You must return a valid JSON object with EXACTLY two keys:
1) "analysis": A brief 1-sentence analysis of the case.
2) "category": Must be STRICTLY ONE of these exact strings: "Property / Real Estate Law", "Family Law", "Corporate Law", "Criminal Law", "Civil Litigation". 

Note: Landlord/tenant disputes, rent issues, and evictions fall under "Property / Real Estate Law".` 
          },
          { role: 'user', content: description }
        ],
        temperature: 0.1,
        max_tokens: 150
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Groq Error Payload] Status: ${response.status} -`, errorText);
      throw new Error("Groq API Rejected Request");
    }

    const result = await response.json();
    let aiOutput = { category: 'Civil Litigation', analysis: '' };
    try {
      aiOutput = JSON.parse(result.choices[0].message.content);
    } catch (e) {
      console.warn("Failed to parse LLM JSON:", result.choices[0].message.content);
    }
    
    // Log the AI's study/analysis to the console for debugging
    console.log("AI Case Study Analysis:", aiOutput.analysis);

    let category = aiOutput.category;

    const validCategories = ['Property / Real Estate Law', 'Family Law', 'Corporate Law', 'Criminal Law', 'Civil Litigation'];
    return validCategories.includes(category) ? category : 'Civil Litigation';
    
  } catch (error) {
    console.error("AI Classification Error (Using Fallback):", error);
    return 'Civil Litigation'; // Safe fallback
  }
};
export interface CreateCaseParams {
  title: string;
  description: string;
  category: string;
  city: string;
  jurisdictionCity: string;
  courtLevel?: CourtLevel;
  urgency?: UrgencyLevel;
  budgetType?: BudgetType;
  budgetAmount?: number;
}

/**
 * Submits a validated and categorized case to the Firestore 'cases' collection.
 * Auth-derived identity prevents UID spoofing.
 */
export const postCaseToMarketplace = async (
  params: CreateCaseParams
): Promise<string> => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Authentication required. Please sign in to post a case.');
  }

  // Strictly validate input against Zod schema
  const validated = postCaseInputSchema.parse({
    title: params.title.trim(),
    description: params.description.trim(),
    category: params.category,
    city: params.city.trim(),
    jurisdictionCity: params.jurisdictionCity.trim(),
    courtLevel: params.courtLevel || 'district',
    urgency: params.urgency || 'standard',
    budgetType: params.budgetType || 'open_to_quotes',
    budgetAmount: params.budgetType === 'fixed' ? params.budgetAmount : undefined,
  });

  // Calculate target response turnaround window
  let targetResponseAt: number | undefined;
  if (validated.urgency === 'urgent') {
    targetResponseAt = Date.now() + 48 * 3600 * 1000; // 48 hours target turnaround
  } else if (validated.urgency === 'standard') {
    targetResponseAt = Date.now() + 7 * 24 * 3600 * 1000; // 7 days target turnaround
  }

  // Derive client display name from auth user
  const clientName = currentUser.displayName || 'Client';

  const caseData: Omit<LegalCase, 'id'> = {
    clientId: currentUser.uid,
    clientName,
    title: validated.title,
    description: validated.description,
    category: validated.category,
    city: validated.city,
    jurisdictionCity: validated.jurisdictionCity,
    courtLevel: validated.courtLevel,
    urgency: validated.urgency,
    targetResponseAt,
    budgetType: validated.budgetType,
    budgetAmount: validated.budgetAmount,
    currency: 'PKR',
    budget: validated.budgetAmount, // Deprecated write-through mirror for legacy components
    status: 'open',
    timeline: [
      {
        id: Date.now().toString(),
        title: 'Matter Published',
        date: Date.now(),
        description: 'Your legal matter is published to verified advocates on the marketplace.'
      }
    ],
    createdAt: Date.now(),
  };

  try {
    const docRef = await addDoc(collection(db, 'cases'), caseData);
    return docRef.id;
  } catch (error: any) {
    console.error("Error posting case:", error);
    throw new Error(error?.message || "Unable to post case. Please check your connection.");
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

    // 4. Create Chat Thread using deterministic case ID so both client and lawyer can resolve it instantly
    const threadRef = doc(db, 'chats', caseId);
    batch.set(threadRef, {
      id: caseId,
      caseId,
      participants: [clientId, lawyerId],
      lastMessage: 'Chat started. You can now discuss the case.',
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp()
    }, { merge: true });

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

