import { formatProposalError, submitProposal, ProposalError } from '../features/lawyer/services/marketplaceService';
import { recoverOrphanProfile } from '../features/auth/services/authService';
import { runTransaction, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';

// Mock Firebase Config & React Native Async Storage
jest.mock('../services/firebaseConfig', () => ({
  db: { _type: 'mockFirestoreDb' },
  auth: { currentUser: null },
  functions: { _type: 'mockFirebaseFunctions' },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
    revokeAccess: jest.fn(),
  },
  statusCodes: {},
  isErrorWithCode: jest.fn(),
}));

jest.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  GoogleAuthProvider: { credential: jest.fn() },
  signInWithCredential: jest.fn(),
  getAdditionalUserInfo: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  updateProfile: jest.fn(),
  linkWithCredential: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn((_db, collectionPath, id) => ({ path: `${collectionPath}/${id}`, collection: collectionPath, id })),
  runTransaction: jest.fn(),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
  addDoc: jest.fn(),
  orderBy: jest.fn(),
  getDoc: jest.fn(),
  getDocFromCache: jest.fn(),
  setDoc: jest.fn().mockResolvedValue(undefined),
  updateDoc: jest.fn().mockResolvedValue(undefined),
  deleteDoc: jest.fn().mockResolvedValue(undefined),
  limit: jest.fn(),
}));

describe('Zero-Trust Proposal Authorization & Auth Invariants', () => {
  const mockRunTransaction = runTransaction as jest.MockedFunction<typeof runTransaction>;
  const mockGetDoc = getDoc as jest.MockedFunction<typeof getDoc>;
  const mockSetDoc = setDoc as jest.MockedFunction<typeof setDoc>;
  const mockDeleteDoc = deleteDoc as jest.MockedFunction<typeof deleteDoc>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('formatProposalError - 8-Point Taxonomy & Semantic Mapping', () => {
    it('1. NOT_LAWYER code mapping', () => {
      const err = new Error('Only registered advocates can submit proposals.');
      const formatted = formatProposalError(err);
      expect(formatted.code).toBe('NOT_LAWYER');
      expect(formatted.message).toContain('registered advocates');
    });

    it('2. VERIFICATION_PENDING code mapping', () => {
      const err = new Error('Your advocate profile is awaiting Bar Council verification.');
      const formatted = formatProposalError(err);
      expect(formatted.code).toBe('VERIFICATION_PENDING');
      expect(formatted.message).toContain('Bar Council verification');
    });

    it('3. SUSPENDED code mapping', () => {
      const err = new Error('Your advocate account has been suspended. Please contact support.');
      const formatted = formatProposalError(err);
      expect(formatted.code).toBe('SUSPENDED');
      expect(formatted.message).toContain('suspended');
    });

    it('4. CASE_NOT_OPEN code mapping', () => {
      const err = new Error('This case is no longer open for bidding.');
      const formatted = formatProposalError(err);
      expect(formatted.code).toBe('CASE_NOT_OPEN');
      expect(formatted.message).toBe('This case is no longer open for bidding.');
    });

    it('5. DUPLICATE_PROPOSAL code mapping', () => {
      const err = { code: 'functions/already-exists', message: 'Document already exists' };
      const formatted = formatProposalError(err);
      expect(formatted.code).toBe('DUPLICATE_PROPOSAL');
      expect(formatted.message).toBe('You have already submitted a proposal for this case.');
    });

    it('6. INSUFFICIENT_CREDITS code mapping', () => {
      const err = new Error('Insufficient bidding credits. You need at least 1 credit to submit a proposal.');
      const formatted = formatProposalError(err);
      expect(formatted.code).toBe('INSUFFICIENT_CREDITS');
      expect(formatted.message).toContain('Insufficient bidding credits');
    });

    it('7. UNAUTHORIZED code mapping without blanket assumption', () => {
      const barErr = { code: 'permission-denied', message: 'Only verified lawyers can submit proposals' };
      const formattedBar = formatProposalError(barErr);
      expect(formattedBar.code).toBe('VERIFICATION_PENDING');
      expect(formattedBar.message).toContain('verified by the Bar Council');

      const genericErr = { code: 'permission-denied', message: 'Missing or insufficient permissions.' };
      const formattedGeneric = formatProposalError(genericErr);
      expect(formattedGeneric.code).toBe('UNAUTHORIZED');
      expect(formattedGeneric.message).toContain('Authorization failed');
    });

    it('8. NETWORK_ERROR code mapping', () => {
      const netErr = { code: 'functions/unavailable', message: 'Network offline' };
      const formatted = formatProposalError(netErr);
      expect(formatted.code).toBe('NETWORK_ERROR');
      expect(formatted.message).toContain('Network connection issue');
    });
  });

  describe('submitProposal - Zero-Trust Authorization Invariants', () => {
    const setupTransactionMock = (opts: {
      lawyerDoc: { exists: boolean; data?: any };
      caseDoc: { exists: boolean; data?: any };
      proposalDoc: { exists: boolean; data?: any };
    }) => {
      const mockTx = {
        get: jest.fn().mockImplementation((ref: any) => {
          if (ref.collection === 'users') {
            return Promise.resolve({
              exists: () => opts.lawyerDoc.exists,
              data: () => opts.lawyerDoc.data,
            });
          }
          if (ref.collection === 'cases') {
            return Promise.resolve({
              exists: () => opts.caseDoc.exists,
              data: () => opts.caseDoc.data,
            });
          }
          if (ref.collection === 'proposals') {
            return Promise.resolve({
              exists: () => opts.proposalDoc.exists,
              data: () => opts.proposalDoc.data,
            });
          }
          return Promise.resolve({ exists: () => false, data: () => null });
        }),
        set: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      };

      mockRunTransaction.mockImplementation(async (_db, updateFunction) => {
        return await updateFunction(mockTx as any);
      });

      return mockTx;
    };

    it('Invariant 1: Verified advocate (role == lawyer && status == verified) -> ALLOWED and proposal + ledger created', async () => {
      const mockTx = setupTransactionMock({
        lawyerDoc: {
          exists: true,
          data: { role: 'lawyer', status: 'verified', credits: 10, displayName: 'Advocate Malik' },
        },
        caseDoc: {
          exists: true,
          data: { status: 'open', title: 'Property Dispute' },
        },
        proposalDoc: {
          exists: false,
        },
      });

      const result = await submitProposal('case_101', 'lawyer_202', 35000, 'I have 10 years experience in High Court property disputes.');

      expect(result).toBe('case_101_lawyer_202');
      expect(mockTx.set).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'proposals/case_101_lawyer_202' }),
        expect.objectContaining({
          id: 'case_101_lawyer_202',
          caseId: 'case_101',
          lawyerId: 'lawyer_202',
          bidAmount: 35000,
          status: 'pending',
        })
      );
      expect(mockTx.set).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'transactions/bid_case_101_lawyer_202' }),
        expect.objectContaining({
          userId: 'lawyer_202',
          type: 'bid_submission',
          creditsDeducted: 1,
          status: 'completed',
        })
      );
      // Client MUST NOT mutate server-owned fields on users/{userId}
      expect(mockTx.update).not.toHaveBeenCalled();
    });

    it('Invariant 2: Unverified / pending lawyer -> STRICTLY REJECTED with Bar Council verification error', async () => {
      setupTransactionMock({
        lawyerDoc: {
          exists: true,
          data: { role: 'lawyer', status: 'pending', credits: 10, displayName: 'Advocate Pending' },
        },
        caseDoc: {
          exists: true,
          data: { status: 'open', title: 'Corporate Contract' },
        },
        proposalDoc: {
          exists: false,
        },
      });

      await expect(
        submitProposal('case_202', 'lawyer_pending', 40000, 'I can draft the contract')
      ).rejects.toThrow('Your advocate profile is awaiting Bar Council verification.');
    });

    it('Invariant 3: Suspended lawyer -> REJECTED with account suspended error', async () => {
      setupTransactionMock({
        lawyerDoc: {
          exists: true,
          data: { role: 'lawyer', status: 'suspended', credits: 10 },
        },
        caseDoc: {
          exists: true,
          data: { status: 'open' },
        },
        proposalDoc: {
          exists: false,
        },
      });

      await expect(
        submitProposal('case_101', 'lawyer_suspended', 25000, 'My bid')
      ).rejects.toThrow('Your advocate account has been suspended. Please contact support.');
    });

    it('Invariant 4: Rejected lawyer credentials -> REJECTED with credentials error', async () => {
      setupTransactionMock({
        lawyerDoc: {
          exists: true,
          data: { role: 'lawyer', status: 'rejected', credits: 10 },
        },
        caseDoc: {
          exists: true,
          data: { status: 'open' },
        },
        proposalDoc: {
          exists: false,
        },
      });

      await expect(
        submitProposal('case_101', 'lawyer_rejected', 25000, 'My bid')
      ).rejects.toThrow('Your Bar credentials were not approved. Please re-upload your license.');
    });

    it('Invariant 5: Client role -> REJECTED with role error', async () => {
      setupTransactionMock({
        lawyerDoc: {
          exists: true,
          data: { role: 'client', status: 'verified', credits: 10 },
        },
        caseDoc: {
          exists: true,
          data: { status: 'open' },
        },
        proposalDoc: {
          exists: false,
        },
      });

      await expect(
        submitProposal('case_101', 'client_user', 25000, 'My bid')
      ).rejects.toThrow('Only registered advocates can submit proposals.');
    });

    it('Invariant 6: Non-existent profile -> REJECTED with profile not found error', async () => {
      setupTransactionMock({
        lawyerDoc: {
          exists: false,
        },
        caseDoc: {
          exists: true,
          data: { status: 'open' },
        },
        proposalDoc: {
          exists: false,
        },
      });

      await expect(
        submitProposal('case_101', 'unknown_user', 25000, 'My bid')
      ).rejects.toThrow('Lawyer profile not found. Please log in again.');
    });

    it('Invariant 7: Closed case -> REJECTED with case closed error', async () => {
      setupTransactionMock({
        lawyerDoc: {
          exists: true,
          data: { role: 'lawyer', status: 'verified', credits: 10 },
        },
        caseDoc: {
          exists: true,
          data: { status: 'closed' },
        },
        proposalDoc: {
          exists: false,
        },
      });

      await expect(
        submitProposal('case_closed_101', 'lawyer_verified', 25000, 'My bid')
      ).rejects.toThrow('This case is no longer open for bidding.');
    });

    it('Invariant 8: Duplicate proposal -> REJECTED with already submitted error', async () => {
      setupTransactionMock({
        lawyerDoc: {
          exists: true,
          data: { role: 'lawyer', status: 'verified', credits: 10 },
        },
        caseDoc: {
          exists: true,
          data: { status: 'open' },
        },
        proposalDoc: {
          exists: true,
          data: { id: 'case_101_lawyer_verified', status: 'pending' },
        },
      });

      await expect(
        submitProposal('case_101', 'lawyer_verified', 25000, 'My duplicate bid')
      ).rejects.toThrow('You have already submitted a proposal for this case.');
    });

    it('Invariant 9: Insufficient credits (< 1) -> REJECTED with credits error', async () => {
      setupTransactionMock({
        lawyerDoc: {
          exists: true,
          data: { role: 'lawyer', status: 'verified', credits: 0 },
        },
        caseDoc: {
          exists: true,
          data: { status: 'open' },
        },
        proposalDoc: {
          exists: false,
        },
      });

      await expect(
        submitProposal('case_101', 'lawyer_no_credits', 25000, 'My bid')
      ).rejects.toThrow('Insufficient bidding credits. You need at least 1 credit to submit a proposal.');
    });
  });

  describe('recoverOrphanProfile - Zero-Trust Recovery Invariants', () => {
    const authUser = {
      uid: 'user_orphan_123',
      email: 'advocate@example.com',
      displayName: 'Advocate Tariq',
      photoURL: null,
    };

    it('Invariant 10: Valid registration intent within 30-min TTL -> Recovers exact lawyer profile with canonical specializations', async () => {
      mockGetDoc
        .mockResolvedValueOnce({ exists: () => false } as any) // profile does not exist
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({
            uid: 'user_orphan_123',
            email: 'advocate@example.com',
            role: 'lawyer',
            displayName: 'Advocate Tariq',
            city: 'Islamabad',
            specialization: ['real estate', 'family'],
            createdAt: Date.now() - 60000,
            expiresAt: Date.now() + 1740000, // valid for 29 mins
          }),
        } as any);

      const recovered = await recoverOrphanProfile(authUser);

      expect(recovered.id).toBe('user_orphan_123');
      expect(recovered.role).toBe('lawyer');
      expect(recovered.status).toBe('pending');
      expect(recovered.city).toBe('Islamabad');
      // Must be canonicalized
      expect((recovered as any).specialization).toEqual(['Property / Real Estate Law', 'Family Law']);
      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'users/user_orphan_123' }),
        expect.objectContaining({ role: 'lawyer', city: 'Islamabad' })
      );
      expect(mockDeleteDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'registration_intents/user_orphan_123' })
      );
    });

    it('Invariant 11: Expired registration intent -> Rejects with auth/registration-incomplete and NEVER silently converts role', async () => {
      mockGetDoc
        .mockResolvedValueOnce({ exists: () => false } as any) // profile missing
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({
            uid: 'user_orphan_123',
            email: 'advocate@example.com',
            role: 'lawyer',
            createdAt: Date.now() - 2000000,
            expiresAt: Date.now() - 200000, // expired
          }),
        } as any);

      await expect(recoverOrphanProfile(authUser)).rejects.toMatchObject({
        code: 'auth/registration-incomplete',
      });
      // MUST NOT have created any user document
      expect(mockSetDoc).not.toHaveBeenCalled();
    });

    it('Invariant 12: Missing registration intent -> Rejects with auth/registration-incomplete and NEVER silently creates client', async () => {
      mockGetDoc
        .mockResolvedValueOnce({ exists: () => false } as any) // profile missing
        .mockResolvedValueOnce({ exists: () => false } as any); // intent missing

      await expect(recoverOrphanProfile(authUser)).rejects.toMatchObject({
        code: 'auth/registration-incomplete',
      });
      // MUST NOT have created any user document
      expect(mockSetDoc).not.toHaveBeenCalled();
    });
  });
});
