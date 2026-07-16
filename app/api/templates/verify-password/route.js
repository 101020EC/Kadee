import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { password } = await request.json();
    const adminPassword = process.env.TEMPLATE_ADMIN_PASSWORD || 'admin1234';

    if (password === adminPassword) {
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'รหัสผ่านไม่ถูกต้อง' }, { status: 401 });
  } catch (error) {
    console.error('Password verification error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
