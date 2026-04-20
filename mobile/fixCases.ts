import { getDocs, collection, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from './src/services/firebaseConfig';

async function run() {
  console.log("Starting case backfill script...");
  const casesSnap = await getDocs(collection(db, 'cases'));
  
  for (const caseDoc of casesSnap.docs) {
    const data = caseDoc.data();
    if (!data.clientName || data.clientName === 'Unknown Client' || data.clientName === 'Anonymous Client') {
      console.log(`Checking case: ${caseDoc.id}`);
      if (data.clientId) {
        const userSnap = await getDoc(doc(db, 'users', data.clientId));
        if (userSnap.exists()) {
          const userData = userSnap.data();
          let finalName = userData.displayName || userData.name || userData.email || 'Anonymous Person';
          await updateDoc(caseDoc.ref, { clientName: finalName });
          console.log(`Updated case ${caseDoc.id} with name ${finalName}`);
        } else {
            console.log(`User ${data.clientId} not found.`);
        }
      }
    }
  }
  console.log("Finished script.");
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
