// กันวลีไม่ให้ Word ตัดข้ามบรรทัด (docs/grill-2026-11-09-vis-word.md D2/D3)
//
// เซิร์ฟเวอร์รู้ไม่ได้ว่า Word เครื่องที่พิมพ์จะตัดบรรทัดตรงไหน จึงไม่ปรับ character spacing
// แต่เปลี่ยนช่องว่างภายในวลีเป็น non-breaking space (U+00A0) — วลีทั้งก้อนจะลงบรรทัดใหม่พร้อมกัน
//
// วลีมักถูกแบ่งอยู่หลาย <w:t> (เช่น "วันที่ " ในแม่แบบ + ค่าที่เติมจาก {{doc_date_th}})
// จึงต่อข้อความทั้งย่อหน้าก่อนจับคู่ แล้วแทนทีละตัวอักษรกลับลงตำแหน่งเดิม (ความยาวไม่เปลี่ยน)

const NBSP = ' ';
const D = '[0-9๐-๙]';
const MONTHS =
  'มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม';
const SP = '[ \\u00A0]+';
// อ้างอิงย่อยในวงเล็บ: (6.2.5.2) (3) (ก) (ค)
const REF = `\\((?:${D}+(?:\\.${D}+)*|[ก-ฮ])\\)`;

const PATTERNS = [
  // วันที่ 9 พฤศจิกายน 2569 / ลงวันที่ … / เมื่อวันที่ … / 9 พ.ย. ไม่รวม
  new RegExp(`(?:วันที่${SP})?${D}{1,2}${SP}(?:${MONTHS})${SP}${D}{4}`, 'g'),
  // พ.ศ. 2530
  new RegExp(`พ\\.ศ\\.${SP}${D}{4}`, 'g'),
  // มาตรา 202
  new RegExp(`มาตรา${SP}${D}+`, 'g'),
  // ข้อ 22.2 / ข้อ 9 02 01 04 (6.2.5.2) / ข้อ ๑2.๑ (3) (ก)
  new RegExp(`ข้อ${SP}${D}+(?:\\.${D}+)*(?:${SP}${D}{2}(?![0-9๐-๙]))*(?:${SP}${REF})*`, 'g'),
  // ที่ 146/2561 (คำสั่ง/ประกาศ)
  new RegExp(`ที่${SP}${D}+/${D}{4}`, 'g'),
  // ประเภท 3 (ค) / ภาค 4
  new RegExp(`ประเภท${SP}${D}+(?:${SP}${REF})?`, 'g'),
  new RegExp(`ภาค${SP}${D}+`, 'g'),
  // (3) (ก) ที่ยืนเดี่ยว
  new RegExp(`${REF}(?:${SP}${REF})+`, 'g'),
  // 1,000 บาท
  new RegExp(`${D}[0-9๐-๙,]*(?:\\.${D}+)?${SP}บาท`, 'g'),
  // จำนวน 15 วัน / จำนวนเกินกว่า 10 วัน / 15 วัน
  new RegExp(`(?:จำนวน(?:เกินกว่า)?${SP}?)?${D}[0-9๐-๙,]*${SP}วัน(?!ที่)`, 'g'),
];

/** แทนช่องว่างในวลีที่กำหนดด้วย NBSP ภายใน XML ของ document.xml */
export function keepPhrasesTogether(xml) {
  // แบ่งเป็นชิ้น: <w:t> แต่ละอัน, และขอบย่อหน้า/แท็บ/ขึ้นบรรทัดที่ตัดวลี
  const tokenRe = /<w:t(?: [^>]*)?>([^<]*)<\/w:t>|<w:p[ >]|<\/w:p>|<w:tab\/>|<w:br\/>|<w:cr\/>/g;
  const segments = [[]]; // แต่ละชิ้น = รายการ { start, text } ตำแหน่งข้อความใน xml
  let m;
  while ((m = tokenRe.exec(xml))) {
    if (m[1] === undefined) {
      if (segments[segments.length - 1].length) segments.push([]);
      continue;
    }
    if (!m[1]) continue;
    const start = m.index + m[0].indexOf('>') + 1;
    segments[segments.length - 1].push({ start, text: m[1] });
  }

  const chars = xml.split('');
  for (const seg of segments) {
    if (!seg.length) continue;
    // ข้อความต่อกันของชิ้นนี้ + แผนที่ตำแหน่งกลับไปยัง xml
    let text = '';
    const map = [];
    for (const n of seg) {
      const t = n.text;
      for (let i = 0; i < t.length; i++) {
        if (t[i] === '&') {
          // entity เช่น &amp; = ตัวอักษรเดียวในข้อความจริง ห้ามแก้
          text += '_';
          map.push(-1);
          i = t.indexOf(';', i);
          continue;
        }
        text += t[i];
        map.push(n.start + i);
      }
    }
    for (const re of PATTERNS) {
      re.lastIndex = 0;
      let p;
      while ((p = re.exec(text))) {
        for (let i = p.index; i < p.index + p[0].length; i++) {
          if (text[i] === ' ' && map[i] >= 0) chars[map[i]] = NBSP;
        }
      }
    }
  }
  return chars.join('');
}

/** เลขทะเบียน: ตัวอักษรหน้ากับตัวเลขติดกัน ("กจ 123", "1กข 1234", "WXY 1234") จังหวัดตัดได้ */
export function keepPlateTogether(plate) {
  if (typeof plate !== 'string') return plate;
  return plate.replace(/^(\s*[0-9]?[A-Za-zก-ฮ]{1,3})[ ]+([0-9]{1,4})(?![0-9])/, `$1${NBSP}$2`);
}

/** ใช้หลัง doc.render(): แก้ word/document.xml ใน zip ของ docxtemplater */
export function postProcessDocx(zip) {
  const f = zip.file('word/document.xml');
  if (!f) return;
  zip.file('word/document.xml', keepPhrasesTogether(f.asText()));
}

