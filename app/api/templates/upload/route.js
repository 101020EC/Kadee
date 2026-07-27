import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { db } from '@/app/lib/firebaseAdmin';

const TEMPLATES = {
  thai_vehicle: 'PTK.docx',
  violation: 'MY.docx',
  vis: 'VIS.docx'
};

export async function POST(request) {
  try {
    const formData = await request.formData();
    const password = formData.get('password');
    const file = formData.get('file');
    const type = formData.get('type');

    // 1. Authenticate
    const adminPassword = process.env.TEMPLATE_ADMIN_PASSWORD;
    if (!adminPassword) {
      console.error('TEMPLATE_ADMIN_PASSWORD is not set — template replacement is disabled');
      return NextResponse.json(
        { error: 'ระบบยังไม่ได้ตั้งค่ารหัสผ่านผู้ดูแล กรุณาติดต่อผู้ดูแลระบบ' },
        { status: 503 }
      );
    }
    if (password !== adminPassword) {
      return NextResponse.json({ error: 'รหัสผ่านไม่ถูกต้อง' }, { status: 401 });
    }

    if (!file || !type || !TEMPLATES[type]) {
      return NextResponse.json({ error: 'ข้อมูลไม่ครบถ้วนหรือไม่ถูกต้อง' }, { status: 400 });
    }

    const filename = TEMPLATES[type];
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let savedToCloud = false;
    let cloudError = null;

    // 2. Save template file to Firestore as Base64 string
    if (db) {
      try {
        const base64Data = buffer.toString('base64');
        await db.collection('templates').doc(type).set({
          filename,
          file_data: base64Data,
          size_bytes: buffer.length,
          updated_at: new Date().toISOString()
        }, { merge: true });
        savedToCloud = true;
        console.log(`Successfully saved template ${type} (${filename}) to Firestore.`);
      } catch (err) {
        console.error('Firestore template save failed:', err.message);
        cloudError = err.message;
      }
    }

    // 3. Dual-write to local public folder (for local dev / fallback)
    let savedLocally = false;
    try {
      const filePath = path.join(process.cwd(), 'public', filename);
      console.log(`Saving template locally to: ${filePath}`);
      fs.writeFileSync(filePath, buffer);
      savedLocally = true;
    } catch (localErr) {
      console.warn('Failed to write local file (expected in read-only environment):', localErr.message);
    }

    if (savedToCloud || savedLocally) {
      return NextResponse.json({
        success: true,
        message: savedToCloud 
          ? 'อัปเดตเทมเพลตขึ้นระบบ Cloud (Firestore) เรียบร้อยแล้ว'
          : 'อัปเดตเทมเพลตในไฟล์เครื่องเรียบร้อยแล้ว',
        cloud: savedToCloud,
        local: savedLocally,
        cloudError
      });
    }

    throw new Error('ไม่สามารถบันทึกไฟล์เทมเพลตได้ ทั้งระบบ Cloud และ Local');

  } catch (error) {
    console.error('Template upload API error:', error);
    return NextResponse.json({ error: `ไม่สามารถอัปโหลดเทมเพลต: ${error.message}` }, { status: 500 });
  }
}
