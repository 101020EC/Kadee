import { NextResponse } from 'next/server';
import { logEvent } from '@/app/lib/logger';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import fs from 'fs';
import path from 'path';

const DEFAULT_TEMPLATE_URL = 'https://rmonhufcsumwdnrzhqmo.supabase.co/storage/v1/object/public/Template/MY.docx';

export async function POST(request) {
  try {
    const data = await request.json();
    
    if (!data) {
      return NextResponse.json({ error: 'No data provided' }, { status: 400 });
    }
    
    // Determine the template URL
    const templateUrl = data.template_url || DEFAULT_TEMPLATE_URL;
    let templateBuffer;
    
    // Optimize: if it is a local URL, read directly from the filesystem
    if (templateUrl.includes('localhost:') || templateUrl.includes('127.0.0.1:')) {
      const filename = templateUrl.split('/').pop();
      console.log(`Reading local template file: public/${filename}`);
      const filePath = path.join(process.cwd(), 'public', filename);
      templateBuffer = fs.readFileSync(filePath);
    } else {
      console.log(`Fetching template from: ${templateUrl}`);
      try {
        // Fetch the Word template file from Supabase Storage (bypassing CDN cache using a timestamp query param)
        const fetchUrl = templateUrl.includes('supabase.co') 
          ? `${templateUrl}?t=${Date.now()}` 
          : templateUrl;
        const response = await fetch(fetchUrl, { cache: 'no-store' });
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          templateBuffer = Buffer.from(arrayBuffer);
        } else {
          throw new Error(`Supabase returned status: ${response.status} ${response.statusText}`);
        }
      } catch (fetchError) {
        console.warn(`Fetch from Supabase failed (${fetchError.message}), falling back to local files...`);
        const filename = templateUrl.split('/').pop();
        const filePath = path.join(process.cwd(), 'public', filename);
        if (fs.existsSync(filePath)) {
          console.log(`Local fallback success: Reading public/${filename}`);
          templateBuffer = fs.readFileSync(filePath);
        } else {
          // Re-throw if local file does not exist either
          throw new Error(`Failed to fetch cloud template (${fetchError.message}) and no local fallback found.`);
        }
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
    const filename = `Memo_${caseNumberStr}.docx`;

    let templateName = 'ไม่ทราบแน่ชัด';
    const lowerUrl = templateUrl.toLowerCase();
    if (lowerUrl.includes('ptk')) {
      templateName = 'รถไทย';
    } else if (lowerUrl.includes('my')) {
      templateName = 'MY ผิดพิธีการ';
    } else if (lowerUrl.includes('vis')) {
      templateName = 'MY VIS';
    }

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
        // RFC 5987 encoding — HTTP headers reject non-Latin1 chars (e.g. Thai case numbers)
        'Content-Disposition': `attachment; filename="output.docx"; filename*=UTF-8''${encodeURIComponent(filename)}`
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
