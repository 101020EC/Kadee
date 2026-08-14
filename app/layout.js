// โฮสต์ไฟล์ฟอนต์เองทั้งหมด แทนการดึงจาก fonts.googleapis.com + fonts.gstatic.com + cdnjs
// บนมือถือแต่ละโดเมนภายนอกต้องทำ DNS + TCP + TLS ให้เสร็จก่อนหน้าเว็บจะขึ้นได้
import { Outfit, Noto_Sans_Thai } from "next/font/google";
import "@fortawesome/fontawesome-free/css/fontawesome.min.css";
import "@fortawesome/fontawesome-free/css/solid.min.css";
import "@fortawesome/fontawesome-free/css/regular.min.css";
import "./globals.css";

// โหลดเฉพาะน้ำหนักที่ใช้จริง (ตรวจจาก document.fonts แล้วว่าใช้ 400/500/700 เท่านั้น)
const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-outfit",
});

const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-noto-thai",
});

export const metadata = {
  title: "Kadee",
  description: "สกัดข้อมูลใบขนสินค้าพิเศษ PDF เพื่อนำมากรอกลงบันทึกข้อความศุลกากรโดยอัตโนมัติ",
};

export const viewport = {
  width: "device-width",
  initialScale: 1.0,
  maximumScale: 1.0,
  userScalable: false,
};

// เดิมมีสคริปต์อ่าน localStorage มาตั้ง data-system ก่อน paint แรก เพื่อกันธีมม่วงวาบ
// ก่อนสลับเป็นเขียว/ฟ้า — ตอนนี้ไม่ต้องใช้แล้ว เพราะทุกครั้งที่เข้าเว็บใหม่จะเริ่มที่
// รถไทย (ธีมม่วง) เสมอ ซึ่งตรงกับที่เซิร์ฟเวอร์ render มาอยู่แล้ว

export default function RootLayout({ children }) {
  return (
    <html lang="th" className={`${outfit.variable} ${notoSansThai.variable}`}>
      <head>
        {/* ค่าเริ่มต้นคือ --bg-color ของธีมม่วง page.js อัปเดตให้ตรงธีมเมื่อสลับแท็บ */}
        <meta name="theme-color" content="#f3f1f8" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
