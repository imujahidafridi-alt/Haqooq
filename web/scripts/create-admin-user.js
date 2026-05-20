const fs = require('fs');
const path = require('path');
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

function parseEnvFile(filePath) {
  const file = fs.readFileSync(filePath, 'utf8');
  return file.split(/\r?\n/).reduce((env, line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return env;
    const index = trimmed.indexOf('=');
    if (index === -1) return env;
    const key = trimmed.slice(0, index);
    const value = trimmed.slice(index + 1);
    env[key] = value;
    return env;
  }, {});
}

async function main() {
  const envPath = path.resolve(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) {
    throw new Error('.env.local not found in the web root directory.');
  }

  const env = parseEnvFile(envPath);
  const serviceAccountJson = env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountJson) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT is missing from .env.local');
  }

  const serviceAccount = JSON.parse(serviceAccountJson);
  if (getApps().length === 0) {
    initializeApp({
      credential: cert(serviceAccount),
      projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    });
  }

  const auth = getAuth();
  const db = getFirestore();
  const email = 'admin@haqooq.com';
  const password = 'Admin@1234';
  const displayName = 'Haqooq Admin';
  let uid;

  try {
    const user = await auth.getUserByEmail(email);
    uid = user.uid;
    console.log(`User already exists: ${email} (uid=${uid})`);
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      const user = await auth.createUser({
        email,
        password,
        displayName,
        emailVerified: true
      });
      uid = user.uid;
      console.log(`Created admin user: ${email} (uid=${uid})`);
    } else {
      throw error;
    }
  }

  await db.collection('users').doc(uid).set(
    {
      uid,
      email,
      displayName,
      role: 'admin',
      createdAt: new Date().toISOString()
    },
    { merge: true }
  );

  console.log('Admin Firestore profile created/updated.');
  console.log('Use these credentials to sign in:');
  console.log(`  email: ${email}`);
  console.log(`  password: ${password}`);
}

main().catch((error) => {
  console.error('Failed to create admin user:', error);
  process.exit(1);
});