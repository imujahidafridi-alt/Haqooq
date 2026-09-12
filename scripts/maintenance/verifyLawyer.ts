/**
 * Operational Maintenance Script: Verify Advocate Profile
 * 
 * Usage:
 *   npx ts-node scripts/maintenance/verifyLawyer.ts [email_or_uid]
 * 
 * If no argument is provided, lists all pending/under_review lawyers and verifies them.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, getDocs, collection, doc, updateDoc, query, where, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyAfMYwWD0JskbvaFAXIG03lOxX1F5EBR8Q",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "haqooq-a3e91.firebaseapp.com",
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL || "https://haqooq-a3e91-default-rtdb.firebaseio.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "haqooq-a3e91",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "haqooq-a3e91.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "99158635959",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:99158635959:android:f5d4eaa916cf665674e432"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

async function verifyLawyer() {
  const target = process.argv[2]?.trim();

  console.log("==========================================");
  console.log("  Haqooq Legal Operations: Advocate Verifier");
  console.log("==========================================\n");

  if (target) {
    console.log(`Targeting advocate: ${target}`);
    // Check if target is a UID
    const userDocRef = doc(db, 'users', target);
    const userSnap = await getDoc(userDocRef);

    if (userSnap.exists()) {
      await updateDoc(userDocRef, {
        status: 'verified',
        verifiedAt: Date.now()
      });
      console.log(`✅ Successfully verified advocate with UID: ${target}`);
      console.log(`   Name: ${userSnap.data()?.displayName || 'N/A'}`);
      console.log(`   Email: ${userSnap.data()?.email || 'N/A'}`);
      console.log(`   Role: ${userSnap.data()?.role}`);
      console.log(`   Status: verified\n`);
      return;
    }

    // Target might be an email
    const emailQuery = query(collection(db, 'users'), where('email', '==', target));
    const emailSnap = await getDocs(emailQuery);

    if (!emailSnap.empty) {
      for (const d of emailSnap.docs) {
        await updateDoc(d.ref, {
          status: 'verified',
          verifiedAt: Date.now()
        });
        console.log(`✅ Successfully verified advocate by email: ${target} (UID: ${d.id})\n`);
      }
      return;
    }

    console.error(`❌ No user found matching UID or Email: "${target}"`);
    return;
  }

  // No argument provided: inspect all pending or under_review lawyers
  console.log("Searching for all advocates awaiting Bar verification...");
  const pendingQuery = query(
    collection(db, 'users'),
    where('role', '==', 'lawyer'),
    where('status', 'in', ['pending', 'under_review'])
  );

  const pendingSnap = await getDocs(pendingQuery);

  if (pendingSnap.empty) {
    console.log("ℹ️ No pending advocates found in Firestore. Checking all lawyers...");
    const allLawyersQuery = query(collection(db, 'users'), where('role', '==', 'lawyer'));
    const allLawyersSnap = await getDocs(allLawyersQuery);

    if (allLawyersSnap.empty) {
      console.log("No lawyers found in database.");
      return;
    }

    console.log(`Found ${allLawyersSnap.docs.length} total advocate(s):`);
    allLawyersSnap.docs.forEach(d => {
      const data = d.data();
      console.log(` - UID: ${d.id} | ${data.displayName || 'No Name'} | ${data.email} | Status: ${data.status} | Credits: ${data.credits ?? 0}`);
    });
    return;
  }

  console.log(`Found ${pendingSnap.docs.length} pending advocate(s). Verifying now...`);
  for (const d of pendingSnap.docs) {
    const data = d.data();
    await updateDoc(d.ref, {
      status: 'verified',
      verifiedAt: Date.now()
    });
    console.log(`✅ Verified advocate: ${data.displayName || 'Advocate'} (${data.email || d.id})`);
  }

  console.log("\nAll pending advocates have been successfully verified!\n");
}

verifyLawyer()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Verification script error:", err);
    process.exit(1);
  });
