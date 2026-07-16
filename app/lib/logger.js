const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * บันทึก log ลงตาราง app_logs ใน Supabase
 * ถ้ายังไม่ได้ตั้งค่า env (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY) จะข้ามเงียบๆ
 * และถ้าบันทึกไม่สำเร็จจะไม่ทำให้ request หลักพัง
 */
export async function logEvent(event, status, detail = {}, error = null) {
  if (!SUPABASE_URL || !SERVICE_KEY) return;
  // ดึง proposer_name ออกมาเป็นคอลัมน์แยก ที่เหลือเก็บใน detail (jsonb)
  const { proposer_name = null, ...restDetail } = detail;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/app_logs`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify({ event, status, detail: restDetail, error, proposer_name }),
      signal: AbortSignal.timeout(3000)
    });
  } catch (e) {
    console.warn('logEvent failed:', e.message);
  }
}
