import { NextResponse } from 'next/server';
import { logEvent } from '@/app/lib/logger';
import { thaiBahtText } from '@/app/lib/thaiBahtText';

// เลขที่ใบเสร็จรับเงิน (MY VIS) ขึ้นต้นด้วยเลขชุดนี้เสมอ เช่น 5901-750001
const RECEIPT_PREFIX = '5901';

function convertToThaiDate(dateStr) {
  if (!dateStr) return "";
  const parts = dateStr.split('/');
  if (parts.length !== 3) return dateStr;
  
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);
  
  const thaiMonths = [
    "", "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];
  
  const thaiYear = year + 543;
  return `${day} ${thaiMonths[month]} ${thaiYear}`;
}

function cleanOffice(officeStr) {
  if (!officeStr) return "";
  return officeStr.split('(')[0].replace(/ด่านศุลกากร/g, 'ด่านศุลกากร').trim();
}

// Install DOM polyfills that pdfjs-dist requires but are missing in Node.js/Vercel serverless
function ensurePolyfills() {
  if (typeof globalThis.DOMMatrix === 'undefined') {
    globalThis.DOMMatrix = class DOMMatrix {
      constructor(init) {
        const v = init && Array.isArray(init) ? init : [1,0,0,1,0,0];
        this.a = v[0]||1; this.b = v[1]||0; this.c = v[2]||0;
        this.d = v[3]||1; this.e = v[4]||0; this.f = v[5]||0;
        this.is2D = true; this.isIdentity = true;
      }
      translate() { return new DOMMatrix(); }
      scale() { return new DOMMatrix(); }
      multiply() { return new DOMMatrix(); }
      inverse() { return new DOMMatrix(); }
      transformPoint() { return { x: 0, y: 0 }; }
    };
  }
  if (typeof globalThis.Path2D === 'undefined') {
    globalThis.Path2D = class Path2D { addPath(){} closePath(){} moveTo(){} lineTo(){} bezierCurveTo(){} rect(){} arc(){} };
  }
  if (typeof globalThis.ImageData === 'undefined') {
    globalThis.ImageData = class ImageData { constructor(w,h){ this.width=w; this.height=h; this.data=new Uint8ClampedArray(w*h*4); }};
  }
}

export async function POST(request) {
  let proposerName = '';
  let system = '';
  let file = null;
  try {
    // Polyfill DOM APIs BEFORE loading pdfjs-dist (critical for Vercel serverless)
    ensurePolyfills();
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    // Explicit literal import so Vercel's file tracing bundles the worker file
    // (pdfjs loads it dynamically as the "fake worker", which the tracer can't see)
    await import('pdfjs-dist/legacy/build/pdf.worker.mjs');

    const formData = await request.formData();
    file = formData.get('file');
    proposerName = formData.get('proposer_name') || '';
    system = formData.get('system') || '';
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Parse PDF text directly using pdfjs-dist
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(buffer),
      disableFontFace: true,
      isEvalSupported: false
    });
    
    const pdfDoc = await loadingTask.promise;
    let text = "";
    let lines = [];
    
    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const textContent = await page.getTextContent();
      
      let lastY = null;
      let currentLine = "";
      for (const item of textContent.items) {
        if (!item.str || item.str.trim() === "") continue;
        const y = item.transform[5];
        if (lastY !== null && Math.abs(y - lastY) > 5) {
          lines.push(currentLine.trim());
          currentLine = "";
        }
        currentLine += item.str + " ";
        lastY = y;
      }
      if (currentLine.trim()) {
        lines.push(currentLine.trim());
      }
      
      // Keep a joined text fallback for global regex matches
      const pageText = textContent.items.map(item => item.str).join(" ");
      text += pageText + "\n";
    }
    
    const data = {};
    
    // 1. Customs Office (Discharge Office)
    let customsOffice = "ด่านศุลกากรปาดังเบซาร์";
    const officeMatch = text.match(/(ด่านศุลกากร\S+)\s*ด่านศุลกากรที่ตัดบัญชี/);
    if (officeMatch) {
      customsOffice = cleanOffice(officeMatch[1]);
    }
    data.customs_office = customsOffice;
    
    // 2. Case Number (if any)
    const caseMatch = text.match(/ดปบ\.ร\.([0-9./]+)/);
    data.case_number = caseMatch ? caseMatch[1] : "";
    
    // 3. Positional values relative to "เลขที่ใบขนสินค้าพิเศษ"
    const headerIdx = lines.findIndex(l => l.startsWith("เลขที่ใบขนสินค้าพิเศษ"));
    let prefix = "";
    if (headerIdx !== -1) {
      prefix = lines[headerIdx + 11] || "";
      data.import_office = cleanOffice(lines[headerIdx + 12]);
      data.due_date = lines[headerIdx + 18] || "";
      data.import_date = lines[headerIdx + 19] || "";
      data.doc_date = lines[headerIdx + 20] || "";
    } else {
      data.import_office = "";
      data.due_date = "";
      data.import_date = "";
      data.doc_date = "";
    }
    
    // 4. Vehicle Details relative to "ยานพาหนะทางบก"
    const vehicleIdx = lines.findIndex(l => l === "ยานพาหนะทางบก");
    if (vehicleIdx !== -1) {
      // อ่านตามตำแหน่งบรรทัด — ถ้าหน้าตา PDF เลื่อนไป ให้ได้ช่องว่าง ไม่ใช่ error ทั้งไฟล์
      const rawPlate = lines[vehicleIdx + 12] || "";
      let cleanedPlate = rawPlate.replace(/^([A-Za-zก-๙]+)(\d+)$/, '$1 $2');
      
      // Look for Thai vehicle registration province (e.g. "สงขลา /")
      const provinceLine = lines.find(l => l.endsWith('/') && !l.includes('คน') && !l.includes('ชำระ') && !l.includes('ด่าน'));
      if (provinceLine) {
        const province = provinceLine.replace('/', '').trim();
        if (province && province !== 'THAILAND' && province !== 'MALAYSIA') {
          cleanedPlate = `${cleanedPlate} ${province}`;
        }
      }
      
      data.vehicle_plate = cleanedPlate;
      data.vehicle_brand = lines[vehicleIdx + 13] || "";
      
      // Clean type — จำกัดเหลือ 2 ประเภทตามตัวเลือกในฟอร์ม
      const rawType = lines[vehicleIdx + 18] || "";
      data.vehicle_type = rawType.includes("จักรยานยนต์") ? "รถจักรยานยนต์"
        : rawType.includes("รถยนต์") ? "รถยนต์" : "";
    } else {
      data.vehicle_plate = "";
      data.vehicle_brand = "";
      data.vehicle_type = "";
    }
    
    // 5. Applicant Details relative to "ผู้ขออนุญาต"
    const applicantIdx = lines.findIndex(l => l === "ผู้ขออนุญาต");
    if (applicantIdx !== -1) {
      let cleanName = (lines[applicantIdx + 6] || "").replace(/\s+/g, ' ');
      if (cleanName.includes("MR. ") && cleanName.includes("BINTI")) {
        cleanName = cleanName.replace("MR. ", "MRS. ");
      }
      // Remove space between Thai prefix and name (e.g. "นาย ฮัมดัม" -> "นายฮัมดัม")
      cleanName = cleanName.replace(/^(นาย|นาง|นางสาว|เด็กชาย|เด็กหญิง)\s+/, '$1');
      data.person_name = cleanName;
      data.nationality = lines[applicantIdx + 8] || "";
      data.passport_number = lines[applicantIdx + 9] || "";
    } else {
      data.person_name = "";
      data.nationality = "";
      data.passport_number = "";
    }
    
    // 6. Suffix and Declaration Number
    // เลข 10 หลักของใบขนฯ = [ประเภท][ปี พ.ศ. 2 หลัก][เดือน][ลำดับ 5 หลัก]
    // ประเภท 6 = รถไทย, 7 = รถต่างประเทศ; ปี/เดือน = วันที่บันทึกใบขนสินค้าพิเศษ (import_date)
    // ห้ามหยิบเลข 10 หลักชุดแรกที่เจอ เพราะเลขตัวถังอาจมาก่อน (เช่น 2332057884)
    // ไม่มีชุดไหนผ่าน → ปล่อยว่าง ให้ผู้ใช้กรอกเอง (ช่องนี้บังคับกรอกในฟอร์ม)
    const typeDigits = system === 'thai_vehicle' ? ['6']
      : (system === 'violation' || system === 'vis') ? ['7'] : ['6', '7'];
    const importParts = (data.import_date || "").split('/');
    const yearMonth = importParts.length === 3
      ? String(parseInt(importParts[2], 10) + 543).slice(-2) + importParts[1].padStart(2, '0')
      : null;
    const suffix = yearMonth && [...text.matchAll(/\b(\d{10})-?\b/g)]
      .map(m => m[1])
      .find(n => typeDigits.includes(n[0]) && n.slice(1, 5) === yearMonth);
    data.declaration_number = prefix && suffix ? `${prefix}-${suffix}` : "";
    
    // 7. Receipt Row parsing (fine payments)
    const receiptMatch = text.match(/1\s+ด่านศุลกากร\S+\s+(?:\(ศภ\.\d\)\s+)?(\d+)\s+([\d,.]+)\s+(\d{2}\/\d{2}\/\d{4})/);
    if (receiptMatch) {
      const receiptNo = receiptMatch[1];
      // เลขที่ใบเสร็จรับเงินขึ้นต้นด้วย 5901 เสมอ (ไม่ใช้ prefix จากใบขนฯ)
      data.receipt_number = `${RECEIPT_PREFIX}-${receiptNo}`;
      data.fine_amount = receiptMatch[2].split('.')[0]; // remove decimals
      data.return_date = receiptMatch[3];
    } else {
      data.receipt_number = "";
      data.fine_amount = "";

      // ไม่มีใบเสร็จใน PDF จึงไม่รู้วันที่นำยานพาหนะออกไปจริง
      // ตั้งวันที่ตัดบัญชีเป็นค่าเริ่มต้นไว้ก่อน ผู้ใช้ยืนยัน/แก้ไขได้ใน popup ก่อนสร้างเอกสาร
      data.return_date = data.doc_date;
    }
    
    // 8. Thai Dates
    data.due_date_th = convertToThaiDate(data.due_date);
    data.import_date_th = convertToThaiDate(data.import_date);
    data.doc_date_th = convertToThaiDate(data.doc_date);
    data.return_date_th = convertToThaiDate(data.return_date);
    data.receipt_date_th = convertToThaiDate(data.return_date);
    
    // 9. Fine Days & Fine Amount Text
    if (data.due_date && data.return_date) {
      const parseDate = (dStr) => {
        const p = dStr.split('/');
        if (p.length !== 3) return null;
        return new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]));
      };
      const d1 = parseDate(data.due_date);
      const d2 = parseDate(data.return_date);
      if (d1 && d2) {
        const diffTime = d2.getTime() - d1.getTime();
        const days = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        data.fine_days = days > 0 ? days.toLocaleString("en-US") : "";
        if (days > 0) {
          const calculatedFine = Math.min(10000, days * 1000);
          data.fine_amount = data.fine_amount || calculatedFine.toLocaleString('en-US');
          data.fine_amount_th = thaiBahtText(data.fine_amount);
        } else {
          data.fine_amount = "";
          data.fine_amount_th = "";
        }
      }
    }
    
    // 10. Default user details (will be merged/overwritten on client-side)
    data.dept_abbr = "ฝคต";
    data.proposer_name = "";
    data.proposer_position = "นักวิชาการศุลกากรชำนาญการ";
    data.approver_name = "";
    data.approver_position = "";
    
    let templateName = 'ไม่ทราบแน่ชัด';
    if (system === 'thai_vehicle') {
      templateName = 'รถไทย';
    } else if (system === 'violation') {
      templateName = 'MY ผิดพิธีการ';
    } else if (system === 'vis') {
      templateName = 'MY VIS';
    }

    if (!system && file) {
      const lowerName = file.name.toLowerCase();
      if (lowerName.includes('ptk')) templateName = 'รถไทย';
      else if (lowerName.includes('vis')) templateName = 'MY VIS';
      else if (lowerName.includes('my')) templateName = 'MY ผิดพิธีการ';
    }

    await logEvent('upload', 'success', {
      template: templateName,
      proposer_name: proposerName || data.proposer_name,
      filename: file ? file.name : '',
      case_number: data.case_number,
      declaration_number: data.declaration_number
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to parse PDF:', error);

    let templateName = 'ไม่ทราบแน่ชัด';
    if (system === 'thai_vehicle') {
      templateName = 'รถไทย';
    } else if (system === 'violation') {
      templateName = 'MY ผิดพิธีการ';
    } else if (system === 'vis') {
      templateName = 'MY VIS';
    }

    if (!system && file) {
      const lowerName = file.name.toLowerCase();
      if (lowerName.includes('ptk')) templateName = 'รถไทย';
      else if (lowerName.includes('vis')) templateName = 'MY VIS';
      else if (lowerName.includes('my')) templateName = 'MY ผิดพิธีการ';
    }

    await logEvent('upload', 'error', {
      template: templateName,
      proposer_name: proposerName,
      filename: file ? file.name : ''
    }, error.message);

    return NextResponse.json({ error: `Failed to parse PDF: ${error.message}` }, { status: 500 });
  }
}
