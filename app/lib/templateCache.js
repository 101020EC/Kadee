import fs from 'fs';
import path from 'path';
import { db } from '@/app/lib/firebaseAdmin';

// In-Memory Cache store
// Key: templateType (e.g. 'thai_vehicle', 'violation', 'vis')
// Value: { buffer: Buffer, source: string, timestamp: number }
const templateMemoryCache = new Map();

// Vercel มีหลาย instance — อัปโหลดแม่แบบใหม่แล้ว instance อื่นต้องเห็นภายในเวลานี้
const CACHE_TTL_MS = 60 * 1000;

/**
 * Get template buffer from In-Memory Cache, Firestore, or Local file
 */
export async function getTemplateBuffer(templateType, filename) {
  // 1. Check In-Memory Cache
  const cached = templateMemoryCache.get(templateType);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    console.log(`[Template Cache HIT] '${templateType}' loaded from RAM cache (Source: ${cached.source})`);
    return cached.buffer;
  }

  console.log(`[Template Cache MISS] Fetching template '${templateType}'...`);
  let templateBuffer;
  let source = '';

  // 2. Try Firestore
  if (db) {
    try {
      const docRef = db.collection('templates').doc(templateType);
      const docSnap = await docRef.get();
      if (docSnap.exists && docSnap.data().file_data) {
        templateBuffer = Buffer.from(docSnap.data().file_data, 'base64');
        source = 'Firestore';
        console.log(`[Template Cache] Custom template '${templateType}' fetched from Firestore.`);
      }
    } catch (cloudErr) {
      console.warn(`[Template Cache] Fetch template '${templateType}' from Firestore failed:`, cloudErr.message);
    }
  }

  // 3. Fallback to local filesystem template
  if (!templateBuffer && filename) {
    const localFilePath = path.join(process.cwd(), 'public', filename);
    if (fs.existsSync(localFilePath)) {
      templateBuffer = fs.readFileSync(localFilePath);
      source = `Local public/${filename}`;
      console.log(`[Template Cache] Read local template file: public/${filename}`);
    }
  }

  if (!templateBuffer) {
    throw new Error(`Template file for '${templateType}' (${filename}) not found.`);
  }

  // Save to In-Memory Cache
  templateMemoryCache.set(templateType, {
    buffer: templateBuffer,
    source,
    timestamp: Date.now()
  });

  return templateBuffer;
}

/**
 * Update memory cache immediately when a template is uploaded
 */
export function setTemplateCache(templateType, buffer, source = 'Upload') {
  templateMemoryCache.set(templateType, {
    buffer,
    source,
    timestamp: Date.now()
  });
  console.log(`[Template Cache UPDATE] In-memory cache updated for '${templateType}' (Source: ${source})`);
}

/**
 * Clear specific or all memory caches
 */
export function clearTemplateCache(templateType) {
  if (templateType) {
    templateMemoryCache.delete(templateType);
    console.log(`[Template Cache CLEAR] In-memory cache cleared for '${templateType}'`);
  } else {
    templateMemoryCache.clear();
    console.log(`[Template Cache CLEAR] All in-memory template caches cleared`);
  }
}
