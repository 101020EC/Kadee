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

// หน้านี้ render ฝั่งเซิร์ฟเวอร์ ถ้ารอ useEffect อ่าน localStorage ผู้ใช้จะเห็นธีมม่วง
// วาบหนึ่งเฟรมก่อนสลับเป็นเขียว/ฟ้า จึงต้องตั้ง data-system ให้เสร็จก่อน paint แรก
// แพตเทิร์นเดียวกับที่เว็บทั่วไปใช้กันโหมดมืดกระพริบ
const THEME_INIT = `
try {
  var s = localStorage.getItem('active_system');
  if (s === 'violation' || s === 'vis' || s === 'thai_vehicle') {
    document.documentElement.dataset.system = s;
  }
} catch (e) {}
`;

export default function RootLayout({ children }) {
  // suppressHydrationWarning เพราะ THEME_INIT เติม data-system ลงบน <html> ก่อน React hydrate
  // ทำให้ attribute ฝั่งเซิร์ฟเวอร์กับฝั่งไคลเอนต์ไม่ตรงกันโดยตั้งใจ
  return (
    <html lang="th" suppressHydrationWarning className={`${outfit.variable} ${notoSansThai.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        {/* ค่าเริ่มต้นคือ --bg-color ของธีมม่วง page.js อัปเดตให้ตรงธีมหลัง mount */}
        <meta name="theme-color" content="#f3f1f8" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
