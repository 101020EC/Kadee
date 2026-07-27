import { db } from '@/app/lib/firebaseAdmin';

/**
 * ส่งแจ้งเตือนไปยัง Telegram Bot
 */
async function sendTelegramNotification(event, status, detail = {}, error = null) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) return;

  try {
    const { proposer_name, template, case_number, declaration_number } = detail;
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
        `• <b>รายละเอียดข้อผิดพลาด:</b> ${error || 'Unknown error'}\n` +
        `• <b>เวลา:</b> ${timeStr}`;
    }

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      })
    });
  } catch (err) {
    console.warn('Telegram notification failed:', err.message);
  }
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
