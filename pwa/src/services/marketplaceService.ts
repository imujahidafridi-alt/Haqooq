import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  getDoc, 
  doc, 
  limit, 
  runTransaction 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { LegalCase } from '../types/models';

export const getOpenCases = async (pageSize: number = 50): Promise<LegalCase[]> => {
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
    
    // Backfill anonymous/missing names
    if (!data.clientName || data.clientName === 'Unknown Client') {
      try {
        const userDoc = await getDoc(doc(db, 'users', data.clientId));
        if (userDoc.exists()) {
          const u = userDoc.data();
          data.clientName = u.displayName || u.email || 'Client';
        }
      } catch (e) {}
    }

    cases.push({ ...data, id: document.id });
  }

  return cases;
};

export const getLawyerBiddedCaseIds = async (lawyerId: string): Promise<string[]> => {
  try {
    const q = query(collection(db, 'proposals'), where('lawyerId', '==', lawyerId));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data().caseId);
  } catch (e) {
    return [];
  }
};

export const submitProposal = async (
  caseId: string,
  lawyerId: string,
  bidAmount: number,
  message: string
): Promise<string> => {
  const proposalId = `${caseId}_${lawyerId}`;

  await runTransaction(db, async (transaction) => {
    // 1. Verify lawyer profile
    const lawyerRef = doc(db, 'users', lawyerId);
    const lawyerSnap = await transaction.get(lawyerRef);
    if (!lawyerSnap.exists()) {
      throw new Error('Lawyer profile not found. Please log in again.');
    }

    const lawyerData = lawyerSnap.data();
    if (lawyerData.role !== 'lawyer') {
      throw new Error('Only registered advocates can submit proposals.');
    }
    if (lawyerData.status === 'suspended') {
      throw new Error('Your advocate account has been suspended.');
    }
    if (lawyerData.status !== 'verified') {
      throw new Error('Your advocate profile is awaiting Bar Council verification.');
    }

    const currentCredits = typeof lawyerData.credits === 'number' ? lawyerData.credits : 10;
    if (currentCredits < 1) {
      throw new Error('Insufficient bidding credits. You need at least 1 credit to submit a proposal.');
    }

    // 2. Verify case status
    const caseRef = doc(db, 'cases', caseId);
    const caseSnap = await transaction.get(caseRef);
    if (!caseSnap.exists()) {
      throw new Error('Case not found. It may have been closed or removed.');
    }
    if (caseSnap.data().status !== 'open') {
      throw new Error('This case is no longer open for bidding.');
    }

    // 3. Verify duplicate proposal
    const proposalRef = doc(db, 'proposals', proposalId);
    const proposalSnap = await transaction.get(proposalRef);
    if (proposalSnap.exists()) {
      throw new Error('You have already submitted a proposal for this case.');
    }

    // 4. Create proposal
    transaction.set(proposalRef, {
      id: proposalId,
      caseId,
      lawyerId,
      bidAmount,
      message: message.trim(),
      status: 'pending',
      createdAt: Date.now()
    });

    // 5. Record immutable transaction ledger entry
    const ledgerRef = doc(db, 'transactions', `bid_${proposalId}`);
    transaction.set(ledgerRef, {
      userId: lawyerId,
      amount: 0,
      type: 'bid_submission',
      creditsDeducted: 1,
      operationId: proposalId,
      status: 'completed',
      timestamp: new Date().toISOString()
    });
  });

  return proposalId;
};
