import { NextResponse } from 'next/server';
import { getTemplateBuffer } from '@/app/lib/templateCache';

const TEMPLATES = {
  thai_vehicle: {
    filename: 'PTK.docx'
  },
  violation: {
    filename: 'MY.docx'
  },
  vis: {
    filename: 'VIS.docx'
  }
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (!type || !TEMPLATES[type]) {
      return NextResponse.json({ error: 'Invalid template type' }, { status: 400 });
    }

    const { filename } = TEMPLATES[type];
    const fileBuffer = await getTemplateBuffer(type, filename);

    return new Response(fileBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });

  } catch (error) {
    console.error('Failed to download template:', error);
    return NextResponse.json({ error: `Failed to download template: ${error.message}` }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
