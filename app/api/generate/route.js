import { NextResponse } from 'next/server';
import { logEvent } from '@/app/lib/logger';
import { db } from '@/app/lib/firebaseAdmin';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import fs from 'fs';
import path from 'path';

export async function POST(request) {
  let data;
  try {
    data = await request.json();
    
    if (!data) {
      return NextResponse.json({ error: 'No data provided' }, { status: 400 });
    }
    
    // Determine template type and filename
    const templateUrl = data.template_url || 'MY.docx';
    const lowerUrl = templateUrl.toLowerCase();
    
    let templateType = 'violation';
    let filename = 'MY.docx';
    let templateName = 'MY ผิดพิธีการ';

    if (lowerUrl.includes('ptk')) {
      templateType = 'thai_vehicle';
      filename = 'PTK.docx';
      templateName = 'รถไทย';
    } else if (lowerUrl.includes('vis')) {
      templateType = 'vis';
      filename = 'VIS.docx';
      templateName = 'MY VIS';
    }

    let templateBuffer;

    // 1. Try fetching custom template from Firestore
    if (db) {
      try {
        const docRef = db.collection('templates').doc(templateType);
        const docSnap = await docRef.get();
        if (docSnap.exists && docSnap.data().file_data) {
          templateBuffer = Buffer.from(docSnap.data().file_data, 'base64');
          console.log(`Using custom template '${templateType}' from Firestore.`);
        }
      } catch (cloudErr) {
        console.warn(`Fetch template '${templateType}' from Firestore failed:`, cloudErr.message);
      }
    }

    // 2. Fallback to local filesystem template
    if (!templateBuffer) {
      const localFilePath = path.join(process.cwd(), 'public', filename);
      if (fs.existsSync(localFilePath)) {
        console.log(`Reading local template file: public/${filename}`);
        templateBuffer = fs.readFileSync(localFilePath);
      } else if (templateUrl.startsWith('http://') || templateUrl.startsWith('https://')) {
        console.log(`Fetching template from URL: ${templateUrl}`);
        const response = await fetch(templateUrl, { cache: 'no-store' });
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          templateBuffer = Buffer.from(arrayBuffer);
        } else {
          throw new Error(`Failed to fetch cloud template: ${response.status} ${response.statusText}`);
        }
      } else {
        throw new Error(`Template file public/${filename} not found.`);
      }
    }
    
    // Load the document using PizZip and Docxtemplater
    const zip = new PizZip(templateBuffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: {
        start: '{{',
        end: '}}'
      }
    });
    
    // Render the document (replace all {{variable}} placeholders)
    doc.render(data);
    
    // Generate the output buffer
    const outBuffer = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE'
    });
    
    const caseNumberStr = (data.case_number || 'Output').replace(/[\/\\]/g, '_');
    const outFilename = `Memo_${caseNumberStr}.docx`;

    await logEvent('generate', 'success', {
      template: templateName,
      case_number: data.case_number,
      declaration_number: data.declaration_number,
      doc_date: data.doc_date_th || data.doc_date,
      proposer_name: data.proposer_name
    });
    
    // Return the generated DOCX file
    return new Response(outBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="output.docx"; filename*=UTF-8''${encodeURIComponent(outFilename)}`
      }
    });
    
  } catch (error) {
    console.error('Failed to generate document:', error);

    let templateName = 'ไม่ทราบแน่ชัด';
    if (data && data.template_url) {
      const lowerUrl = data.template_url.toLowerCase();
      if (lowerUrl.includes('ptk')) {
        templateName = 'รถไทย';
      } else if (lowerUrl.includes('my')) {
        templateName = 'MY ผิดพิธีการ';
      } else if (lowerUrl.includes('vis')) {
        templateName = 'MY VIS';
      }
    }

    await logEvent('generate', 'error', {
      template: templateName,
      proposer_name: data ? data.proposer_name : null,
      case_number: data ? data.case_number : null,
      declaration_number: data ? data.declaration_number : null
    }, error.message);
    return NextResponse.json({ error: `Failed to generate document: ${error.message}` }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
