import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
// Use named import for algoliasearch v5 compatibility
import { algoliasearch } from 'algoliasearch';

admin.initializeApp();

// Initialize Algolia (Configure via firebase functions:config:set or environment variables in production)
const ALGOLIA_ID = process.env.ALGOLIA_APP_ID || 'MOCK_APP_ID';
const ALGOLIA_ADMIN_KEY = process.env.ALGOLIA_API_KEY || 'MOCK_ADMIN_KEY';
const ALGOLIA_INDEX_NAME = 'lawyers_index';

const client = algoliasearch(ALGOLIA_ID, ALGOLIA_ADMIN_KEY);

/**
 * 1. AI Case Classification (Callable Function)
 * In production, this proxies out to OpenAI/Anthropic securely.
 */
export const classifyCaseAI = functions.https.onCall((data: any, context: functions.https.CallableContext) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in to classify cases.');
  }

  const description: string = data.description || '';
  const lowerDesc = description.toLowerCase();

  // NLP Simulation for MVP/V1
  let category = 'Civil Litigation';
  if (/(property|land|estate|tenant|evict|lease|mortgage)/.test(lowerDesc)) {
    category = 'Property / Real Estate Law';
  } else if (/(divorce|child|marriage|custody|alimony|spouse)/.test(lowerDesc)) {
    category = 'Family Law';
  } else if (/(business|corporate|contract|fraud|equity|startup)/.test(lowerDesc)) {
    category = 'Corporate Law';
  } else if (/(arrest|murder|fraud|police|jail|bail|criminal|theft)/.test(lowerDesc)) {
    category = 'Criminal Law';
  }

  return { category };
});

/**
 * 2. Sync Verified Lawyers to Algolia
 * Keeps the 'users' collection in sync with the fast search index.
 */
export const onUserUpdate = functions.firestore.document('users/{userId}')
  .onWrite(async (change, context) => {
    const after = change.after.exists ? change.after.data() : null;
    const userId = context.params.userId;

    // Delete scenario
    if (!after) {
      await client.deleteObject({ indexName: ALGOLIA_INDEX_NAME, objectID: userId }).catch(() => {});
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
    } else {
      // If they were downgraded or aren't a verified lawyer, purge from index
      await client.deleteObject({ indexName: ALGOLIA_INDEX_NAME, objectID: userId }).catch(() => {});
    }
  });

/**
 * 3. Push Notification Triggers (Timeline Update)
 * When a lawyer pushes a case timeline event, notify the client.
 */
export const onCaseUpdate = functions.firestore.document('cases/{caseId}')
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

