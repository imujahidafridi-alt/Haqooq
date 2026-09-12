/**
 * Standalone Maintenance Script: Reconcile Algolia Index from Firestore Source of Truth.
 * Fetches all verified lawyers from Firestore and upserts them to the Algolia index
 * with precomputed discoveryScores and sanitized public attributes (zero PII).
 *
 * Usage: npx ts-node scripts/maintenance/reconcileAlgoliaIndex.ts
 */

import * as admin from 'firebase-admin';
import { algoliasearch } from 'algoliasearch';

if (!admin.apps.length) {
  admin.initializeApp();
}

const ALGOLIA_ID = process.env.ALGOLIA_APP_ID || process.env.EXPO_PUBLIC_ALGOLIA_APP_ID || 'MOCK_APP_ID';
const ALGOLIA_ADMIN_KEY = process.env.ALGOLIA_API_KEY || 'MOCK_ADMIN_KEY';
const ALGOLIA_INDEX_NAME = 'lawyers_index';

export const reconcileAlgoliaIndex = async () => {
  console.log(`[Reconcile] Connecting to Algolia index '${ALGOLIA_INDEX_NAME}'...`);
  const client = algoliasearch(ALGOLIA_ID, ALGOLIA_ADMIN_KEY);
  const db = admin.firestore();

  const snap = await db.collection('users')
    .where('role', '==', 'lawyer')
    .where('status', '==', 'verified')
    .get();

  console.log(`[Reconcile] Found ${snap.docs.length} verified advocate records in Firestore.`);

  const records = snap.docs.map((doc: admin.firestore.QueryDocumentSnapshot) => {
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
    console.log(`[Reconcile] Successfully reconciled and saved ${records.length} records to Algolia.`);
  } else {
    console.log('[Reconcile] No verified advocates found to index.');
  }

  return records.length;
};

if (require.main === module) {
  reconcileAlgoliaIndex()
    .then(count => {
      console.log(`[Reconcile] Complete. Total verified advocates: ${count}`);
      process.exit(0);
    })
    .catch(err => {
      console.error('[Reconcile Error]', err);
      process.exit(1);
    });
}
