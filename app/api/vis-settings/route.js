import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const SETTINGS_FILE_NAME = 'vis_settings.json';

const DEFAULT_VIS_SETTINGS = {
  approver_selection: 'approver_1',
  approver_1_name: 'นายวรวุฒิ สุภชัยพานิชพงศ์',
  approver_2_name: 'นางสาวปิลันธนา ไตรทิพพิสมัย',
  proposer_name: '',
  proposer_position: 'นักวิชาการศุลกากรชำนาญการ',
  vis_chief_name: 'นายหะริน หอวัง',
  vis_chief_position: 'นายด่านศุลกากรปาดังเบซาร์',
  vis_director_name: 'นายพิภพ พุทธสุข',
  vis_director_position: 'ผู้อำนวยการส่วนบริการศุลกากร',
  vis_head_service_name: 'นายพิภพ พุทธสุข',
  vis_head_service_position: 'หัวหน้าฝ่ายบริการศุลกากรที่ 2',
  vis_legal_name: 'นายสุทิน ภูเดช',
  vis_legal_position: 'นิติกรชำนาญการ'
};

export async function GET() {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // 1. Try to fetch from Supabase Storage if configured
    if (supabaseUrl && serviceRoleKey) {
      try {
        const fileUrl = `${supabaseUrl}/storage/v1/object/public/Template/${SETTINGS_FILE_NAME}?t=${Date.now()}`;
        const response = await fetch(fileUrl, { cache: 'no-store' });
        if (response.ok) {
          const cloudData = await response.json();
          return NextResponse.json({
            success: true,
            source: 'cloud',
            data: { ...DEFAULT_VIS_SETTINGS, ...cloudData }
          });
        }
      } catch (cloudErr) {
        console.warn('Failed to fetch settings from Supabase:', cloudErr.message);
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
        data: { ...DEFAULT_VIS_SETTINGS, ...localData }
      });
    }

    // 3. Default fallback
    return NextResponse.json({
      success: true,
      source: 'default',
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
      approver_selection: data.approver_selection || DEFAULT_VIS_SETTINGS.approver_selection,
      approver_1_name: data.approver_1_name !== undefined ? data.approver_1_name : DEFAULT_VIS_SETTINGS.approver_1_name,
      approver_2_name: data.approver_2_name !== undefined ? data.approver_2_name : DEFAULT_VIS_SETTINGS.approver_2_name,
      proposer_name: data.proposer_name !== undefined ? data.proposer_name : DEFAULT_VIS_SETTINGS.proposer_name,
      proposer_position: data.proposer_position || DEFAULT_VIS_SETTINGS.proposer_position,
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

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    let uploadedToCloud = false;
    let cloudError = null;

    // 1. Upload to Supabase Storage if configured
    if (supabaseUrl && serviceRoleKey) {
      const uploadUrl = `${supabaseUrl}/storage/v1/object/Template/${SETTINGS_FILE_NAME}`;
      console.log(`Saving settings to Supabase Storage: ${uploadUrl}`);
      try {
        const response = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
            'x-upsert': 'true',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          uploadedToCloud = true;
          console.log(`Successfully saved ${SETTINGS_FILE_NAME} to Supabase Cloud.`);
        } else {
          const errText = await response.text();
          throw new Error(`Supabase returned status: ${response.status} - ${errText}`);
        }
      } catch (err) {
        console.error('Supabase upload for settings failed:', err.message);
        cloudError = err.message;
      }
    }

    // 2. Dual-write to local public folder (fallback / local dev)
    let savedLocally = false;
    try {
      const filePath = path.join(process.cwd(), 'public', SETTINGS_FILE_NAME);
      fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
      savedLocally = true;
    } catch (localErr) {
      console.warn('Failed to write local vis_settings.json:', localErr.message);
    }

    if (uploadedToCloud || savedLocally) {
      return NextResponse.json({
        success: true,
        message: uploadedToCloud 
          ? 'บันทึกข้อมูลตั้งค่าบนระบบ Cloud เรียบร้อยแล้ว'
          : 'บันทึกข้อมูลตั้งค่าในไฟล์เครื่องเรียบร้อยแล้ว',
        cloud: uploadedToCloud,
        local: savedLocally,
        cloudError,
        data: payload
      });
    }

    throw new Error('ไม่สามารถบันทึกข้อมูลได้ทั้งระบบ Cloud และ Local');

  } catch (error) {
    console.error('Error saving settings:', error);
    return NextResponse.json({
      error: `ไม่สามารถบันทึกข้อมูลตั้งค่า: ${error.message}`
    }, { status: 500 });
  }
}
