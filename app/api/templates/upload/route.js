import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

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
    const adminPassword = process.env.TEMPLATE_ADMIN_PASSWORD || 'admin1234';
    if (password !== adminPassword) {
      return NextResponse.json({ error: 'รหัสผ่านไม่ถูกต้อง' }, { status: 401 });
    }

    if (!file || !type || !TEMPLATES[type]) {
      return NextResponse.json({ error: 'ข้อมูลไม่ครบถ้วนหรือไม่ถูกต้อง' }, { status: 400 });
    }

    const filename = TEMPLATES[type];
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 2. Upload to Supabase Storage if configured
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    let uploadedToCloud = false;
    let cloudError = null;

    if (supabaseUrl && serviceRoleKey) {
      const uploadUrl = `${supabaseUrl}/storage/v1/object/Template/${filename}`;
      console.log(`Uploading replaced template to Supabase Storage: ${uploadUrl}`);
      try {
        const response = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
            'x-upsert': 'true', // Overwrite existing file
          },
          body: buffer
        });

        if (response.ok) {
          uploadedToCloud = true;
          console.log(`Successfully uploaded ${filename} to Supabase.`);
        } else {
          const errText = await response.text();
          throw new Error(`Supabase returned: ${response.status} - ${errText}`);
        }
      } catch (err) {
        console.error('Supabase upload failed:', err.message);
        cloudError = err.message;
      }
    }

    // 3. Dual-write to local public folder (fallback / development environment)
    let savedLocally = false;
    try {
      const filePath = path.join(process.cwd(), 'public', filename);
      console.log(`Saving template locally to: ${filePath}`);
      fs.writeFileSync(filePath, buffer);
      savedLocally = true;
    } catch (localErr) {
      console.warn('Failed to write local file (expected on read-only serverless environments):', localErr.message);
    }

    // Return status
    if (uploadedToCloud || savedLocally) {
      return NextResponse.json({
        success: true,
        message: 'อัปเดตเทมเพลตเรียบร้อยแล้ว',
        cloud: uploadedToCloud,
        local: savedLocally,
        cloudError
      });
    }

    throw new Error('ไม่สามารถบันทึกไฟล์ได้ ทั้งระบบ Cloud และ Local ล้มเหลว');

  } catch (error) {
    console.error('Template upload API error:', error);
    return NextResponse.json({ error: `ไม่สามารถอัปโหลดเทมเพลต: ${error.message}` }, { status: 500 });
  }
}
