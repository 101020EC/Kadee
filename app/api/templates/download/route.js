import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { db } from '@/app/lib/firebaseAdmin';

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
    let fileBuffer;

    // 1. Try to fetch custom template from Firestore first
    if (db) {
      try {
        const docRef = db.collection('templates').doc(type);
        const docSnap = await docRef.get();
        if (docSnap.exists && docSnap.data().file_data) {
          fileBuffer = Buffer.from(docSnap.data().file_data, 'base64');
          console.log(`Serving template ${type} from Firestore.`);
        }
      } catch (cloudErr) {
        console.warn(`Fetch template ${type} from Firestore failed:`, cloudErr.message);
      }
    }

    // 2. Local file fallback if Firestore document not present
    if (!fileBuffer) {
      const filePath = path.join(process.cwd(), 'public', filename);
      if (fs.existsSync(filePath)) {
        fileBuffer = fs.readFileSync(filePath);
      } else {
        throw new Error(`Template file public/${filename} not found.`);
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
