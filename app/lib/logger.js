import { db } from '@/app/lib/firebaseAdmin';

// parse_mode HTML: ค่าที่มี & < > โดยไม่ escape ทำให้ Telegram ปฏิเสธทั้งข้อความแบบเงียบ ๆ
export function escapeHtml(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * ส่งข้อความ (HTML) ไปยัง Telegram Bot — ค่าจากผู้ใช้ต้องผ่าน escapeHtml มาก่อน
 */
export async function sendTelegramMessage(message) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) return;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      })
    });
    if (!res.ok) {
      console.warn('Telegram notification rejected:', res.status, await res.text().catch(() => ''));
    }
  } catch (err) {
    console.warn('Telegram notification failed:', err.message);
  }
}

/**
 * แจ้งเตือนการสร้างเอกสาร
 */
async function sendTelegramNotification(event, status, detail = {}, error = null) {
  const proposer_name = escapeHtml(detail.proposer_name);
  const template = escapeHtml(detail.template);
  const case_number = escapeHtml(detail.case_number);
  const declaration_number = escapeHtml(detail.declaration_number);
  const timeStr = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });

  let message = '';
  if (status === 'success') {
    message = `📝 <b>มีการสร้างบันทึกข้อความใหม่!</b>\n` +
      `• <b>เทมเพลต:</b> ${template || 'ไม่ระบุ'}\n` +
      `• <b>ผู้เสนอเรื่อง:</b> ${proposer_name || 'ไม่ระบุ'}\n` +
      (case_number ? `• <b>เลขที่เรื่อง:</b> ${case_number}\n` : '') +
      (declaration_number ? `• <b>เลขที่ใบขน:</b> ${declaration_number}\n` : '') +
      `• <b>เวลา:</b> ${timeStr}`;
  } else {
    message = `❌ <b>สร้างเอกสารไม่สำเร็จ (Error)</b>\n` +
      `• <b>เทมเพลต:</b> ${template || 'ไม่ระบุ'}\n` +
      `• <b>ผู้เสนอเรื่อง:</b> ${proposer_name || 'ไม่ระบุ'}\n` +
      `• <b>รายละเอียดข้อผิดพลาด:</b> ${escapeHtml(error || 'Unknown error')}\n` +
      `• <b>เวลา:</b> ${timeStr}`;
  }

  await sendTelegramMessage(message);
}

/**
 * บันทึก log ลง Firestore ใน collection 'app_logs' และส่งแจ้งเตือน Telegram
 */
export async function logEvent(event, status, detail = {}, error = null) {
  const { proposer_name = null, template = null, ...restDetail } = detail;
  
  // 1. บันทึกลง Firestore
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

  // 2. ส่งแจ้งเตือนไปยัง Telegram Bot เมื่อเกิด event การสร้างเอกสาร
  if (event === 'generate') {
    await sendTelegramNotification(event, status, detail, error);
  }
}
