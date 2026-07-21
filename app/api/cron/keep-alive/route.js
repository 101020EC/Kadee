import { NextResponse } from 'next/server';
import { logEvent } from '@/app/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // Verify request if CRON_SECRET environment variable is configured in Vercel
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Ping Supabase by recording a heartbeat log event
    await logEvent('Heartbeat', 'Success', { 
      message: 'Supabase Keep-alive ping' 
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Keep-alive ping sent to Supabase' 
    });
  } catch (error) {
    console.error('Keep-alive cron error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
