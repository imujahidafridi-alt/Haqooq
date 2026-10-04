import { collection, addDoc, updateDoc, doc, getDocs, query, where, writeBatch, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { LegalCase, CaseProposal, CourtLevel, UrgencyLevel, BudgetType } from '../types/models';
import { postCaseInputSchema } from '../types/schemas';

export const classifyCaseWithAI = async (description: string): Promise<string> => {
  try {
    const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
    
    // Local NLP Regex Fallback
    if (!GROQ_API_KEY) {
      const lower = description.toLowerCase();
      if (/(property|land|estate|tenant|evict|lease|mortgage|rent)/.test(lower)) return 'Property / Real Estate Law';
      if (/(divorce|child|marriage|custody|alimony|spouse|khula)/.test(lower)) return 'Family Law';
      if (/(business|corporate|contract|fraud|equity|startup|tax)/.test(lower)) return 'Corporate Law';
      if (/(arrest|murder|bail|police|fir|theft|criminal|jail)/.test(lower)) return 'Criminal Law';
      if (/(labor|employment|salary|wage|workplace|termination)/.test(lower)) return 'Labor & Employment';
      return 'Civil Litigation';
    }

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
2) "category": Must be STRICTLY ONE of these exact strings: "Property / Real Estate Law", "Family Law", "Corporate Law", "Criminal Law", "Civil Litigation", "Labor & Employment".
Note: Landlord/tenant disputes, rent issues, and evictions fall under "Property / Real Estate Law".` 
          },
          { role: 'user', content: description }
        ],
        temperature: 0.1,
        max_tokens: 150
      })
    });

    if (!response.ok) throw new Error("Groq API request failed");
    const result = await response.json();
    const parsed = JSON.parse(result.choices[0].message.content);
    const valid = [
      'Property / Real Estate Law',
      'Family Law',
      'Corporate Law',
      'Criminal Law',
      'Civil Litigation',
      'Labor & Employment'
    ];
    return valid.includes(parsed.category) ? parsed.category : 'Civil Litigation';
  } catch (error) {
    return 'Civil Litigation';
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

export const postCaseToMarketplace = async (params: CreateCaseParams): Promise<string> => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Please sign in to publish your case.');

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

  let targetResponseAt: number | undefined;
  if (validated.urgency === 'urgent') {
    targetResponseAt = Date.now() + 48 * 3600 * 1000;
  } else if (validated.urgency === 'standard') {
    targetResponseAt = Date.now() + 7 * 24 * 3600 * 1000;
  }

  const clientName = currentUser.displayName || 'Client';

  const caseData: any = {
    clientId: currentUser.uid,
    clientName,
    title: validated.title,
    description: validated.description,
    category: validated.category,
    city: validated.city,
    jurisdictionCity: validated.jurisdictionCity,
    courtLevel: validated.courtLevel,
    urgency: validated.urgency,
    budgetType: validated.budgetType,
    currency: 'PKR',
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

  if (targetResponseAt) {
    caseData.targetResponseAt = targetResponseAt;
  }

  if (validated.budgetType === 'fixed' && typeof validated.budgetAmount === 'number') {
    caseData.budgetAmount = validated.budgetAmount;
    caseData.budget = validated.budgetAmount;
  }

  const docRef = await addDoc(collection(db, 'cases'), caseData);
  return docRef.id;
};

export const getProposalsForCase = async (caseId: string): Promise<CaseProposal[]> => {
  const q = query(collection(db, 'proposals'), where('caseId', '==', caseId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as CaseProposal[];
};

export const acceptProposal = async (
  proposalId: string, 
  caseId: string, 
  lawyerId: string, 
  clientId: string,
  agreedAmount: number = 0
) => {
  const batch = writeBatch(db);

  // 1. Accept selected proposal
  const proposalRef = doc(db, 'proposals', proposalId);
  batch.update(proposalRef, { status: 'accepted' });

  // 2. Reject all other proposals for this case
  const q = query(collection(db, 'proposals'), where('caseId', '==', caseId));
  const proposalDocs = await getDocs(q);
  proposalDocs.forEach(d => {
    if (d.id !== proposalId) {
      batch.update(doc(db, 'proposals', d.id), { status: 'rejected' });
    }
  });

  // 3. Update the case to active and assign lawyer
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

  // 4. Initialize real-time chat room
  const threadRef = doc(db, 'chats', caseId);
  batch.set(threadRef, {
    id: caseId,
    caseId,
    participants: [clientId, lawyerId],
    lastMessage: 'Chat started. You can now discuss the case.',
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp()
  }, { merge: true });

  await batch.commit();
};

export const closeCase = async (caseId: string, closedBy: string) => {
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
};
