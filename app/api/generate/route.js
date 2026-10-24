import { NextResponse } from 'next/server';
import { logEvent } from '@/app/lib/logger';
import { getTemplateBuffer } from '@/app/lib/templateCache';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

const TEMPLATES = {
  thai_vehicle: { filename: 'PTK.docx', name: 'รถไทย' },
  violation: { filename: 'MY.docx', name: 'MY ผิดพิธีการ' },
  vis: { filename: 'VIS.docx', name: 'MY VIS' }
};

export async function POST(request) {
  let data;
  try {
    data = await request.json();
    
    if (!data) {
      return NextResponse.json({ error: 'No data provided' }, { status: 400 });
    }
    
    // ฝั่งเว็บส่งมาแค่ชื่อระบบ เซิร์ฟเวอร์เลือกไฟล์เอง ไม่ดึง URL ที่ผู้ใช้ส่งมา
    const templateType = TEMPLATES[data.system] ? data.system : 'violation';
    const { filename, name: templateName } = TEMPLATES[templateType];

    // Load template using In-Memory Cache (RAM cache) or fallback to Firestore/Local
    const templateBuffer = await getTemplateBuffer(templateType, filename);
    
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

    const templateName = TEMPLATES[data?.system]?.name || 'ไม่ทราบแน่ชัด';

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
