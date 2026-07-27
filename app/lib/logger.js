import { db } from '@/app/lib/firebaseAdmin';

/**
 * บันทึก log ลง Firestore ใน collection 'app_logs'
 * ถ้ายังไม่ได้ตั้งค่า env หรือมีข้อผิดพลาด จะข้ามเงียบๆ ไม่ให้กระทบการทำงานหลัก
 */
export async function logEvent(event, status, detail = {}, error = null) {
  const { proposer_name = null, template = null, ...restDetail } = detail;
  try {
    if (db) {
      await db.collection('app_logs').add({
        proposer_name,
        template,
        event,
        status,
        detail: restDetail,
        error: error || null,
        created_at: new Date().toISOString()
      });
    }
  } catch (e) {
    console.warn('logEvent to Firestore failed:', e.message);
  }
}
