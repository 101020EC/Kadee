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
  title: "Buntuek - ระบบกรอกบันทึกข้อความศุลกากรอัตโนมัติ",
  description: "สกัดข้อมูลใบขนสินค้าพิเศษ PDF เพื่อนำมากรอกลงบันทึกข้อความศุลกากรโดยอัตโนมัติ",
};

export const viewport = {
  width: "device-width",
  initialScale: 1.0,
  maximumScale: 1.0,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="th" className={`${outfit.variable} ${notoSansThai.variable}`}>
      <body>
        {children}
      </body>
    </html>
  );
}
