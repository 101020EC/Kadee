// แปลงจำนวนเงินเป็นตัวอักษรไทย ใช้ทั้งฝั่งเซิร์ฟเวอร์ (อ่าน PDF) และในฟอร์ม
// (คำนวณใหม่ทุกครั้งที่ผู้ใช้แก้ตัวเลขเงินปรับ)
const THAI_NUMBERS = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
const THAI_UNITS = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน"];

// 0 – 999,999 → ข้อความไม่มีคำว่าบาท
function readGroup(n) {
  const numStr = String(n);
  const len = numStr.length;
  let str = "";
  for (let i = 0; i < len; i++) {
    const digit = Number(numStr[i]);
    if (digit === 0) continue;
    const pos = len - 1 - i;
    if (pos === 1 && digit === 1) {
      str += "สิบ";
    } else if (pos === 1 && digit === 2) {
      str += "ยี่สิบ";
    } else if (pos === 0 && digit === 1 && n >= 10) {
      // หลักหน่วยเป็น 1 และมีหลักที่สูงกว่า → เอ็ด เช่น 11 สิบเอ็ด, 101 หนึ่งร้อยเอ็ด
      str += "เอ็ด";
    } else {
      str += THAI_NUMBERS[digit] + THAI_UNITS[pos];
    }
  }
  return str;
}

function readNumber(n) {
  if (n >= 1000000) {
    const rest = n % 1000000;
    return readNumber(Math.floor(n / 1000000)) + "ล้าน" + (rest ? readGroup(rest) : "");
  }
  return readGroup(n);
}

// รับตัวเลข หรือสตริงที่มี , คั่น เช่น "10,000" → "หนึ่งหมื่นบาทถ้วน"
// ค่าที่อ่านไม่ได้คืน "" เพื่อให้ช่องว่างและผู้ใช้เห็นว่าต้องกรอก
export function thaiBahtText(value) {
  const number = typeof value === 'number' ? value : parseInt(String(value ?? '').replace(/,/g, ''), 10);
  if (!Number.isFinite(number) || number < 0) return "";
  const n = Math.floor(number);
  if (n === 0) return "ศูนย์บาทถ้วน";
  return readNumber(n) + "บาทถ้วน";
}
