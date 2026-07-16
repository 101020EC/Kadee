import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const TEMPLATES = {
  thai_vehicle: {
    filename: 'PTK.docx',
    url: 'https://rmonhufcsumwdnrzhqmo.supabase.co/storage/v1/object/public/Template/PTK.docx'
  },
  violation: {
    filename: 'MY.docx',
    url: 'https://rmonhufcsumwdnrzhqmo.supabase.co/storage/v1/object/public/Template/MY.docx'
  },
  vis: {
    filename: 'VIS.docx',
    url: 'https://rmonhufcsumwdnrzhqmo.supabase.co/storage/v1/object/public/Template/VIS.docx'
  }
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (!type || !TEMPLATES[type]) {
      return NextResponse.json({ error: 'Invalid template type' }, { status: 400 });
    }

    const { filename, url } = TEMPLATES[type];
    let fileBuffer;

    // Try fetching from Supabase first
    try {
      const fetchUrl = `${url}?t=${Date.now()}`;
      console.log(`Downloading template from Supabase: ${fetchUrl}`);
      const response = await fetch(fetchUrl, { cache: 'no-store' });
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        fileBuffer = Buffer.from(arrayBuffer);
      } else {
        throw new Error(`Supabase returned status: ${response.status}`);
      }
    } catch (fetchError) {
      console.warn(`Fetch template from Supabase failed (${fetchError.message}), falling back to local file: public/${filename}`);
      const filePath = path.join(process.cwd(), 'public', filename);
      if (fs.existsSync(filePath)) {
        fileBuffer = fs.readFileSync(filePath);
      } else {
        throw new Error(`Failed to download from cloud and no local fallback found.`);
      }
    }

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
