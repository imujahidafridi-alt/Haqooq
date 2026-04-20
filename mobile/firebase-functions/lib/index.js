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
exports.onCaseUpdate = exports.onCaseStateChangeAudit = exports.onUserUpdate = exports.classifyCaseAI = void 0;
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
                model: 'llama3-8b-8192',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert legal AI classifier. Classify the following case description strictly into exactly one of these five categories: Property / Real Estate Law, Family Law, Corporate Law, Criminal Law, Civil Litigation. Respond ONLY with the category name and nothing else.'
                    },
                    {
                        role: 'user',
                        content: description
                    }
                ],
                temperature: 0.1,
                max_tokens: 10
            })
        });
        if (!response.ok) {
            throw new Error(`Groq API error: ${response.statusText}`);
        }
        const result = await response.json();
        let aiCategory = result.choices[0]?.message?.content?.trim();
        // Sanitize in case model hallucinated punctuation
        aiCategory = aiCategory.replace(/["']/g, "");
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
    // Delete scenario
    if (!after) {
        await client.deleteObject({ indexName: ALGOLIA_INDEX_NAME, objectID: userId }).catch(() => { });
        return;
    }
    // Only index verified lawyers
    if (after.role === 'lawyer' && after.status === 'verified') {
        const record = {
            objectID: userId,
            displayName: after.displayName,
            specialization: after.specialization || [],
            experienceYears: after.experienceYears || 0,
            city: after.city || 'Unknown',
            rating: after.rating || 0,
            isPremium: after.isPremium || false,
            email: after.email,
            photoURL: after.photoURL || null
        };
        await client.saveObject({ indexName: ALGOLIA_INDEX_NAME, body: record }).catch(e => console.error(e));
        console.log(`Indexed verified lawyer: ${userId}`);
    }
    else {
        // If they were downgraded or aren't a verified lawyer, purge from index
        await client.deleteObject({ indexName: ALGOLIA_INDEX_NAME, objectID: userId }).catch(() => { });
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
//# sourceMappingURL=index.js.map