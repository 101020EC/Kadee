import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { password } = await request.json();
    const adminPassword = process.env.TEMPLATE_ADMIN_PASSWORD;

    // ไม่มีรหัสสำรองในโค้ด: ถ้ายังไม่ตั้ง env ให้ปฏิเสธไปเลย ดีกว่าเปิดให้เข้าได้เงียบๆ
    if (!adminPassword) {
      console.error('TEMPLATE_ADMIN_PASSWORD is not set — template admin is disabled');
      return NextResponse.json(
        { success: false, error: 'ระบบยังไม่ได้ตั้งค่ารหัสผ่านผู้ดูแล กรุณาติดต่อผู้ดูแลระบบ' },
        { status: 503 }
      );
    }

    if (password === adminPassword) {
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'รหัสผ่านไม่ถูกต้อง' }, { status: 401 });
  } catch (error) {
    console.error('Password verification error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
