import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let app;
let db = null;

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (privateKey) {
  privateKey = privateKey.replace(/\\n/g, '\n');
}

if (projectId && clientEmail && privateKey) {
  try {
    if (!getApps().length) {
      app = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey
        })
      });
      console.log('Firebase Admin initialized successfully.');
    } else {
      app = getApps()[0];
    }
    db = getFirestore(app);
  } catch (error) {
    console.error('Firebase Admin initialization error:', error.message);
  }
} else {
  console.warn('Firebase environment variables are missing.');
}

export { db };
export default app;
