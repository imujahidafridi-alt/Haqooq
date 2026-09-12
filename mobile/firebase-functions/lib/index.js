"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUserAccount = exports.reconcileAlgoliaIndex = exports.onReviewCreated = exports.submitProposal = exports.onCaseUpdate = exports.onCaseStateChangeAudit = exports.onUserUpdate = exports.classifyCaseAI = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
// Use named import for algoliasearch v5 compatibility
const algoliasearch_1 = require("algoliasearch");
admin.initializeApp();
// Initialize Algolia (Configure via firebase functions:config:set or environment variables in production)
const ALGOLIA_ID = process.env.ALGOLIA_APP_ID || 'MOCK_APP_ID';
const ALGOLIA_ADMIN_KEY = process.env.ALGOLIA_API_KEY || 'MOCK_ADMIN_KEY';
const ALGOLIA_INDEX_NAME = 'lawyers_index';
const client = (0, algoliasearch_1.algoliasearch)(ALGOLIA_ID, ALGOLIA_ADMIN_KEY);
/**
 * 1. AI Case Classification (Callable Function)
 * In production, this proxies out to Groq securely.
 */
exports.classifyCaseAI = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in to classify cases.');
    }
    const description = data.description || '';
    if (!description.trim()) {
        return { category: 'Civil Litigation' };
    }
    const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
    if (!GROQ_API_KEY) {
        console.warn("GROQ_API_KEY is not set. Falling back to NLP simulation.");
        const lowerDesc = description.toLowerCase();
        let category = 'Civil Litigation';
        if (/(property|land|estate|tenant|evict|lease|mortgage)/.test(lowerDesc)) {
            category = 'Property / Real Estate Law';
        }
        else if (/(divorce|child|marriage|custody|alimony|spouse)/.test(lowerDesc)) {
            category = 'Family Law';
        }
        else if (/(business|corporate|contract|fraud|equity|startup)/.test(lowerDesc)) {
            category = 'Corporate Law';
        }
        else if (/(arrest|murder|fraud|police|jail|bail|criminal|theft)/.test(lowerDesc)) {
            category = 'Criminal Law';
        }
        return { category };
    }
    try {
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
                    {
                        role: 'user',
                        content: description
                    }
                ],
                temperature: 0.1,
                max_tokens: 150
            })
        });
        if (!response.ok) {
            throw new Error(`Groq API error: ${response.statusText}`);
        }
        const result = await response.json();
        let aiOutput = { category: 'Civil Litigation', analysis: '' };
        try {
            aiOutput = JSON.parse(result.choices[0].message.content);
        }
        catch (e) {
            console.warn("Failed to parse LLM JSON:", result.choices[0].message.content);
        }
        console.log("AI Case Study Analysis:", aiOutput.analysis);
        let aiCategory = aiOutput.category;
        const validCategories = [
            'Property / Real Estate Law',
            'Family Law',
            'Corporate Law',
            'Criminal Law',
            'Civil Litigation'
        ];
        if (!validCategories.includes(aiCategory)) {
            aiCategory = 'Civil Litigation'; // Fallback
        }
        return { category: aiCategory };
    }
    catch (error) {
        console.error("Groq AI Error:", error);
        return { category: 'Civil Litigation' }; // Fallback on failure
    }
});
/**
 * 2. Sync Verified Lawyers to Algolia
 * Keeps the 'users' collection in sync with the fast search index.
 */
exports.onUserUpdate = functions.firestore.document('users/{userId}')
    .onWrite(async (change, context) => {
    const after = change.after.exists ? change.after.data() : null;
    const userId = context.params.userId;
    // Delete or unverified scenario: purge immediately from search index
    if (!after || after.role !== 'lawyer' || after.status !== 'verified') {
        try {
            await client.deleteObject({ indexName: ALGOLIA_INDEX_NAME, objectID: userId });
            console.log(`[Algolia Purge] Evicted unverified/deleted advocate: ${userId}`);
        }
        catch (err) {
            console.warn(`[Algolia Purge Error] Failed to delete ${userId} from index:`, err);
        }
        return;
    }
    // Only index verified lawyers with sanitized public attributes (Zero PII - no email, phone, or credentialUrl)
    const rating = typeof after.rating === 'number' ? after.rating : 0;
    const ratingCount = typeof after.ratingCount === 'number' ? after.ratingCount : 0;
    const experienceYears = typeof after.experienceYears === 'number' ? after.experienceYears : 0;
    const discoveryScore = Number(((rating * Math.log10(ratingCount + 2)) + (experienceYears * 0.1)).toFixed(2));
    const record = {
        objectID: userId,
        id: userId,
        displayName: after.displayName || 'Advocate',
        displayNameNormalized: (after.displayName || '').toLowerCase().trim(),
        specialization: after.specialization || [],
        experienceYears,
        city: after.city || 'Pakistan',
        cityNormalized: (after.city || 'Pakistan').toLowerCase().trim(),
        rating,
        ratingCount,
        discoveryScore,
        isPremium: Boolean(after.isPremium),
        photoURL: after.photoURL || null
    };
    try {
        await client.saveObject({ indexName: ALGOLIA_INDEX_NAME, body: record });
        console.log(`[Algolia Index] Indexed verified advocate: ${userId} (Score: ${discoveryScore})`);
    }
    catch (e) {
        console.error(`[Algolia Error] Failed to index advocate ${userId}:`, e);
    }
});
/**
 * 3. Immutable Backend Audit Logging
 * Securely logs every critical state change (e.g. Case Open -> Active) using an append-only structure.
 */
exports.onCaseStateChangeAudit = functions.firestore.document('cases/{caseId}')
    .onUpdate(async (change, context) => {
    const beforeStats = change.before.data();
    const afterStats = change.after.data();
    if (beforeStats.status !== afterStats.status) {
        await admin.firestore().collection('audit_logs').add({
            action: 'CASE_STATUS_CHANGE',
            entityId: context.params.caseId,
            entityType: 'case',
            previousState: beforeStats.status || 'unknown',
            newState: afterStats.status,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            // Since it's a backend trigger we infer the actor based on state logic
            actorId: afterStats.status === 'closed' ? afterStats.assignedLawyerId : afterStats.clientId,
        });
    }
});
/**
 * 4. Push Notification Triggers (Timeline Update)
 * When a lawyer pushes a case timeline event, notify the client.
 */
exports.onCaseUpdate = functions.firestore.document('cases/{caseId}')
    .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    // Check if new timeline event was added
    if (after.timeline && before.timeline && after.timeline.length > before.timeline.length) {
        const newEvent = after.timeline[after.timeline.length - 1];
        const caseTitle = after.title;
        // Fetch expoPushToken from the 'users' collection for after.clientId
        const db = admin.firestore();
        const clientDoc = await db.collection('users').doc(after.clientId).get();
        const token = clientDoc.data()?.expoPushToken;
        console.log(`[PUSH] Case '${caseTitle}' updated: ${newEvent.title}`);
        if (token && token.startsWith('ExponentPushToken')) {
            // Send via Expo Push API
            await fetch('https://exp.host/--/api/v2/push/send', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Accept-Encoding': 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    to: token,
                    title: `Case Update: ${caseTitle}`,
                    body: newEvent.title,
                    data: { caseId: context.params.caseId }
                }),
            }).catch(err => console.error('Failed to send push notification', err));
        }
    }
});
/**
 * 5. Server-Authoritative Proposal Submission & Credit Deduction
 * Invariant: 1 proposal creation <=> 1 credit deduction <=> 1 ledger transaction.
 * Deterministic proposal ID: {caseId}_{lawyerId} enforces unique proposal per lawyer per case.
 */
exports.submitProposal = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated to submit a proposal.');
    }
    const lawyerId = context.auth.uid;
    const { caseId, bidAmount, message } = data;
    if (!caseId || typeof bidAmount !== 'number' || bidAmount <= 0 || !message?.trim()) {
        throw new functions.https.HttpsError('invalid-argument', 'Valid case ID, positive bid amount, and proposal message are required.');
    }
    const db = admin.firestore();
    return await db.runTransaction(async (transaction) => {
        // 1. Verify lawyer profile and status
        const lawyerRef = db.collection('users').doc(lawyerId);
        const lawyerSnap = await transaction.get(lawyerRef);
        if (!lawyerSnap.exists) {
            throw new functions.https.HttpsError('not-found', 'Lawyer profile not found.');
        }
        const lawyerData = lawyerSnap.data();
        if (lawyerData.role !== 'lawyer' || lawyerData.status !== 'verified') {
            throw new functions.https.HttpsError('permission-denied', 'Only verified lawyers can submit proposals.');
        }
        const currentCredits = lawyerData.credits || 0;
        if (currentCredits < 1) {
            throw new functions.https.HttpsError('failed-precondition', 'Insufficient credits. You need at least 1 credit to submit a proposal.');
        }
        // 2. Verify case status
        const caseRef = db.collection('cases').doc(caseId);
        const caseSnap = await transaction.get(caseRef);
        if (!caseSnap.exists) {
            throw new functions.https.HttpsError('not-found', 'Case not found.');
        }
        const caseData = caseSnap.data();
        if (caseData.status !== 'open') {
            throw new functions.https.HttpsError('failed-precondition', 'This case is no longer open for bidding.');
        }
        // 3. Deterministic Proposal ID: {caseId}_{lawyerId} (Enforces single-proposal invariant)
        const proposalId = `${caseId}_${lawyerId}`;
        const proposalRef = db.collection('proposals').doc(proposalId);
        const existingProposal = await transaction.get(proposalRef);
        if (existingProposal.exists) {
            throw new functions.https.HttpsError('already-exists', 'You have already submitted a proposal for this case.');
        }
        // 4. Atomically deduct 1 credit
        transaction.update(lawyerRef, {
            credits: admin.firestore.FieldValue.increment(-1)
        });
        // 5. Create proposal
        transaction.set(proposalRef, {
            id: proposalId,
            caseId,
            lawyerId,
            bidAmount,
            message: message.trim(),
            status: 'pending',
            createdAt: Date.now()
        });
        // 6. Record immutable transaction ledger with deterministic operationId
        const ledgerRef = db.collection('transactions').doc(`bid_${proposalId}`);
        transaction.set(ledgerRef, {
            userId: lawyerId,
            amount: 0,
            type: 'bid_submission',
            creditsDeducted: 1,
            operationId: proposalId,
            status: 'completed',
            timestamp: new Date().toISOString()
        });
        return { success: true, proposalId };
    });
});
/**
 * 6. Server-Side Lawyer Rating Recalculation Trigger
 * Listens to '/reviews/{reviewId}' creation, calculates the updated average rating,
 * and increments ratingCount on the lawyer's user profile with admin privileges.
 */
exports.onReviewCreated = functions.firestore.document('reviews/{reviewId}')
    .onCreate(async (snapshot, context) => {
    const reviewData = snapshot.data();
    if (!reviewData || !reviewData.lawyerId || typeof reviewData.rating !== 'number') {
        return;
    }
    const { lawyerId, rating } = reviewData;
    const db = admin.firestore();
    const lawyerRef = db.collection('users').doc(lawyerId);
    try {
        await db.runTransaction(async (transaction) => {
            const lawyerDoc = await transaction.get(lawyerRef);
            if (!lawyerDoc.exists)
                return;
            const lawyer = lawyerDoc.data() || {};
            const currentRating = typeof lawyer.rating === 'number' ? lawyer.rating : 0;
            const currentCount = typeof lawyer.ratingCount === 'number' ? lawyer.ratingCount : 0;
            const newCount = currentCount + 1;
            const newTotalScore = (currentRating * currentCount) + rating;
            const newAverage = Number((newTotalScore / newCount).toFixed(2));
            const experienceYears = typeof lawyer.experienceYears === 'number' ? lawyer.experienceYears : 0;
            const newDiscoveryScore = Number(((newAverage * Math.log10(newCount + 2)) + (experienceYears * 0.1)).toFixed(2));
            transaction.update(lawyerRef, {
                rating: newAverage,
                ratingCount: newCount,
                discoveryScore: newDiscoveryScore
            });
        });
        console.log(`[Rating Update] Lawyer ${lawyerId} rated ${rating} stars. Score updated.`);
    }
    catch (error) {
        console.error(`[Rating Error] Failed to update rating for lawyer ${lawyerId}:`, error);
    }
});
/**
 * 7. Admin Reconciliation: Bulk Reindex Verified Advocates
 * Traverses all verified lawyers in Firestore and synchronizes Algolia,
 * repairing any drift caused by network glitches.
 */
exports.reconcileAlgoliaIndex = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
    }
    const db = admin.firestore();
    const callerDoc = await db.collection('users').doc(context.auth.uid).get();
    if (callerDoc.data()?.role !== 'admin') {
        throw new functions.https.HttpsError('permission-denied', 'Admin role required');
    }
    const snap = await db.collection('users')
        .where('role', '==', 'lawyer')
        .where('status', '==', 'verified')
        .get();
    const records = snap.docs.map(doc => {
        const d = doc.data();
        const rating = typeof d.rating === 'number' ? d.rating : 0;
        const ratingCount = typeof d.ratingCount === 'number' ? d.ratingCount : 0;
        const experienceYears = typeof d.experienceYears === 'number' ? d.experienceYears : 0;
        const discoveryScore = Number(((rating * Math.log10(ratingCount + 2)) + (experienceYears * 0.1)).toFixed(2));
        return {
            objectID: doc.id,
            id: doc.id,
            displayName: d.displayName || 'Advocate',
            displayNameNormalized: (d.displayName || '').toLowerCase().trim(),
            specialization: d.specialization || [],
            experienceYears,
            city: d.city || 'Pakistan',
            cityNormalized: (d.city || 'Pakistan').toLowerCase().trim(),
            rating,
            ratingCount,
            discoveryScore,
            isPremium: Boolean(d.isPremium),
            photoURL: d.photoURL || null
        };
    });
    if (records.length > 0) {
        await client.saveObjects({ indexName: ALGOLIA_INDEX_NAME, objects: records });
    }
    return { success: true, count: records.length };
});
/**
 * 8. Server-Authoritative Account Deletion (Google Play Compliance)
 * Idempotent multi-phase account deletion workflow:
 * - Phase 1: Mark accountState = 'deletion_pending'
 * - Phase 2: If lawyer, evict immediately from Algolia discovery index
 * - Phase 3: Anonymize personal PII in Firestore (displayName: 'Deleted User', email/phone/photoURL nullified)
 * - Phase 4: Delete Auth account via admin.auth().deleteUser(uid)
 * - Phase 5: Finalize state accountState = 'deleted'
 */
exports.deleteUserAccount = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated to delete account.');
    }
    const uid = context.auth.uid;
    const db = admin.firestore();
    const userRef = db.collection('users').doc(uid);
    try {
        // Phase 1: Mark deletion pending
        await userRef.set({
            accountState: 'deletion_pending',
            deletionRequestedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        const userDoc = await userRef.get();
        const userData = userDoc.data();
        // Phase 2: Evict lawyer from Algolia
        if (userData?.role === 'lawyer') {
            try {
                await client.deleteObject({ indexName: ALGOLIA_INDEX_NAME, objectID: uid });
                console.log(`[Account Deletion] Evicted lawyer ${uid} from Algolia index.`);
            }
            catch (algoliaError) {
                console.warn(`[Account Deletion] Algolia eviction note for ${uid}:`, algoliaError);
            }
        }
        // Phase 3: Anonymize personal PII in Firestore while retaining record for case/ledger retention
        await userRef.set({
            displayName: 'Deleted User',
            email: null,
            phone: null,
            photoURL: null,
            status: 'suspended',
            accountState: 'deleted',
            deletedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        // Phase 4: Delete Firebase Auth account
        await admin.auth().deleteUser(uid);
        console.log(`[Account Deletion] Successfully deleted Auth account for ${uid}.`);
        return { success: true };
    }
    catch (error) {
        console.error(`[Account Deletion Error] Failed for ${uid}:`, error);
        throw new functions.https.HttpsError('internal', error?.message || 'Failed to complete account deletion.');
    }
});
//# sourceMappingURL=index.js.map