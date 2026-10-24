import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { FieldValue } from 'firebase-admin/firestore';
import { db, firebaseStatus } from '@/app/lib/firebaseAdmin';
import { escapeHtml, sendTelegramMessage } from '@/app/lib/logger';

export const dynamic = 'force-dynamic';

const SETTINGS_FILE_NAME = 'vis_settings.json';

// ระบบไฟล์บน Vercel เป็น read-only — เขียนไฟล์ได้เฉพาะตอนรัน dev ในเครื่องเท่านั้น
const CAN_WRITE_LOCAL_FILE = process.env.NODE_ENV !== 'production' && !process.env.VERCEL;

// ค่าที่ใช้ร่วมกันทุกเครื่อง — ผู้เสนอรายงานกับการเลือก ฝคต./ฝปป. เป็นค่าส่วนตัว
// เก็บใน localStorage ของแต่ละเครื่อง ไม่อยู่ในนี้ (หลายคนใช้แอปร่วมกัน)
const DEFAULT_VIS_SETTINGS = {
  approver_1_name: 'นายวรวุฒิ สุภชัยพานิชพงศ์',
  approver_2_name: 'นางสาวปิลันธนา ไตรทิพพิสมัย',
  vis_chief_name: 'นายหะริน หอวัง',
  vis_chief_position: 'นายด่านศุลกากรปาดังเบซาร์',
  vis_director_name: 'นายพิภพ พุทธสุข',
  vis_director_position: 'ผู้อำนวยการส่วนบริการศุลกากร',
  vis_head_service_name: 'นายพิภพ พุทธสุข',
  vis_head_service_position: 'หัวหน้าฝ่ายบริการศุลกากรที่ 2',
  vis_legal_name: 'นายสุทิน ภูเดช',
  vis_legal_position: 'นิติกรชำนาญการ'
};

// ฟิลด์ส่วนตัวที่เวอร์ชันก่อนเคยเขียนลง settings/vis — ลบทิ้งตอนบันทึกครั้งถัดไป
const LEGACY_PERSONAL_FIELDS = ['approver_selection', 'proposer_name', 'proposer_position'];

const FIELD_LABELS = {
  approver_1_name: 'หัวหน้า ฝคต.',
  approver_2_name: 'หัวหน้า ฝปป.',
  vis_chief_name: 'ชื่อนายด่าน',
  vis_chief_position: 'ตำแหน่งนายด่าน',
  vis_director_name: 'ชื่อ ผอ.ส่วนบริการ',
  vis_director_position: 'ตำแหน่ง ผอ.ส่วนบริการ',
  vis_head_service_name: 'ชื่อหัวหน้าฝ่ายบริการฯ 2',
  vis_head_service_position: 'ตำแหน่งหัวหน้าฝ่ายบริการฯ 2',
  vis_legal_name: 'ชื่อนิติกร',
  vis_legal_position: 'ตำแหน่งนิติกร'
};

// ใครก็แก้ค่าที่แชร์ได้ จึงแจ้ง Telegram ทุกครั้งที่ชื่อเปลี่ยน เฉพาะช่องที่เปลี่ยน แบบ เดิม → ใหม่
async function notifySettingsChanged(before, after, changedBy) {
  const lines = Object.keys(FIELD_LABELS)
    .filter(key => (before[key] ?? '') !== (after[key] ?? ''))
    .map(key => `• <b>${FIELD_LABELS[key]}:</b> ${escapeHtml(before[key] || '(ว่าง)')} → ${escapeHtml(after[key] || '(ว่าง)')}`);
  if (lines.length === 0) return;

  const timeStr = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
  await sendTelegramMessage(
    `✏️ <b>มีการเปลี่ยนชื่อในตั้งค่า (ใช้ร่วมกันทุกเครื่อง)</b>\n` +
    lines.join('\n') + '\n' +
    `• <b>บันทึกโดย:</b> ${escapeHtml(changedBy || 'ไม่ระบุ')}\n` +
    `• <b>เวลา:</b> ${timeStr}`
  );
}

export async function GET() {
  try {
    // 1. Try to fetch from Firestore if initialized
    if (db) {
      try {
        const docRef = db.collection('settings').doc('vis');
        const docSnap = await docRef.get();
        if (docSnap.exists) {
          const cloudData = docSnap.data();
          return NextResponse.json({
            success: true,
            source: 'cloud',
            cloudAvailable: true,
            data: { ...DEFAULT_VIS_SETTINGS, ...cloudData }
          });
        }
      } catch (cloudErr) {
        console.warn('Failed to fetch settings from Firestore:', cloudErr.message);
      }
    }

    // 2. Local filesystem fallback
    const filePath = path.join(process.cwd(), 'public', SETTINGS_FILE_NAME);
    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath, 'utf8');
      const localData = JSON.parse(fileData);
      return NextResponse.json({
        success: true,
        source: 'local',
        cloudAvailable: !!db,
        // แนบมาเฉพาะตอน Firestore ใช้ไม่ได้ เพื่อบอกว่าค่า env เพี้ยนตรงไหน
        cloudDiagnostics: db ? undefined : firebaseStatus,
        data: { ...DEFAULT_VIS_SETTINGS, ...localData }
      });
    }

    // 3. Default fallback
    return NextResponse.json({
      success: true,
      source: 'default',
      cloudAvailable: !!db,
      data: DEFAULT_VIS_SETTINGS
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({
      error: 'ไม่สามารถดึงข้อมูลตั้งค่าระบบได้',
      details: error.message
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    if (!data) {
      return NextResponse.json({ error: 'ไม่มีข้อมูลส่งมา' }, { status: 400 });
    }

    const payload = {
      approver_1_name: data.approver_1_name !== undefined ? data.approver_1_name : DEFAULT_VIS_SETTINGS.approver_1_name,
      approver_2_name: data.approver_2_name !== undefined ? data.approver_2_name : DEFAULT_VIS_SETTINGS.approver_2_name,
      vis_chief_name: data.vis_chief_name || DEFAULT_VIS_SETTINGS.vis_chief_name,
      vis_chief_position: data.vis_chief_position || DEFAULT_VIS_SETTINGS.vis_chief_position,
      vis_director_name: data.vis_director_name || DEFAULT_VIS_SETTINGS.vis_director_name,
      vis_director_position: data.vis_director_position || DEFAULT_VIS_SETTINGS.vis_director_position,
      vis_head_service_name: data.vis_head_service_name || DEFAULT_VIS_SETTINGS.vis_head_service_name,
      vis_head_service_position: data.vis_head_service_position || DEFAULT_VIS_SETTINGS.vis_head_service_position,
      vis_legal_name: data.vis_legal_name || DEFAULT_VIS_SETTINGS.vis_legal_name,
      vis_legal_position: data.vis_legal_position || DEFAULT_VIS_SETTINGS.vis_legal_position,
      updated_at: new Date().toISOString()
    };

    let uploadedToCloud = false;
    let cloudError = null;

    // 1. Save to Firestore if initialized
    if (db) {
      try {
        const docRef = db.collection('settings').doc('vis');
        const beforeSnap = await docRef.get();
        const before = { ...DEFAULT_VIS_SETTINGS, ...(beforeSnap.exists ? beforeSnap.data() : {}) };

        const legacyDeletes = Object.fromEntries(
          LEGACY_PERSONAL_FIELDS.filter(key => key in before).map(key => [key, FieldValue.delete()])
        );
        await docRef.set({ ...payload, ...legacyDeletes }, { merge: true });
        uploadedToCloud = true;
        console.log('Successfully saved vis settings to Firestore.');

        await notifySettingsChanged(before, payload, data.changed_by);
      } catch (err) {
        console.error('Firestore upload for settings failed:', err.message);
        cloudError = err.message;
      }
    } else {
      cloudError = 'Firebase environment variables are missing on this deployment';
    }

    // 2. Dual-write to local public folder — dev เท่านั้น
    let savedLocally = false;
    if (CAN_WRITE_LOCAL_FILE) {
      try {
        const filePath = path.join(process.cwd(), 'public', SETTINGS_FILE_NAME);
        fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
        savedLocally = true;
      } catch (localErr) {
        console.warn('Failed to write local vis_settings.json:', localErr.message);
      }
    }

    // บันทึกไม่ขึ้น Cloud = เครื่องอื่นไม่เห็นการแก้ไข ต้องตอบกลับว่าล้มเหลว
    // ไม่ใช่ success เพราะเขียนไฟล์ในเครื่องผ่าน
    if (!uploadedToCloud) {
      return NextResponse.json({
        success: false,
        cloud: false,
        local: savedLocally,
        cloudError,
        error: 'บันทึกขึ้นระบบ Cloud ไม่สำเร็จ — การตั้งค่าจะมีผลเฉพาะเครื่องนี้',
        data: payload
      }, { status: 503 });
    }

    return NextResponse.json({
      success: true,
      message: 'บันทึกข้อมูลตั้งค่าบนระบบ Cloud (Firestore) เรียบร้อยแล้ว',
      cloud: true,
      local: savedLocally,
      cloudError,
      data: payload
    });

  } catch (error) {
    console.error('Error saving settings:', error);
    return NextResponse.json({
      error: `ไม่สามารถบันทึกข้อมูลตั้งค่า: ${error.message}`
    }, { status: 500 });
  }
}
