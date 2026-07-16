import "./globals.css";

export const metadata = {
  title: "Buntuek - ระบบกรอกบันทึกข้อความศุลกากรอัตโนมัติ",
  description: "สกัดข้อมูลใบขนสินค้าพิเศษ PDF เพื่อนำมากรอกลงบันทึกข้อความศุลกากรโดยอัตโนมัติ",
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <head>
        {/* FontAwesome Icon Stylesheet */}
        <link 
          rel="stylesheet" 
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" 
          precedence="default"
        />
        {/* Google Fonts Link */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link 
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
