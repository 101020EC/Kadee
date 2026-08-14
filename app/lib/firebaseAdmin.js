import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let app;
let db = null;

// ค่า private key ที่วางใน Vercel มักเพี้ยนได้หลายแบบ — ติดเครื่องหมายคำพูดครอบหัวท้าย
// (ก๊อปมาจาก .env ทั้งบรรทัด), \n ถูก escape ซ้ำเป็น \\n, หรือมีช่องว่างท้ายค่า
// ทั้งหมดนี้ทำให้ cert() โยน "Failed to parse private key" แล้ว Firestore ตายเงียบ ๆ
function normalizePrivateKey(raw) {
  if (!raw) return raw;

  let key = raw.trim();

  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }

  key = key.replace(/\\\\n/g, '\n').replace(/\\n/g, '\n').trim();

  return key + '\n';
}

const projectId = process.env.FIREBASE_PROJECT_ID?.trim().replace(/^["']|["']$/g, '');
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim().replace(/^["']|["']$/g, '');
const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

if (privateKey && !privateKey.startsWith('-----BEGIN')) {
  console.error(
    'FIREBASE_PRIVATE_KEY has an unexpected format — it must start with "-----BEGIN PRIVATE KEY-----". ' +
    'Paste the key without the surrounding quotes.'
  );
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
    console.error(
      'Firebase Admin initialization error:', error.message,
      '— Firestore is disabled, settings will not sync across machines.'
    );
  }
} else {
  console.warn('Firebase environment variables are missing.');
}

export { db };
export default app;
