import Footer from "@/components/layout/Footer";
import Navbar from "@/components/Navbar/Navbar";
import QueryProvider from "@/providers/query-provider";
import "./globals.css";
export const dynamic = "force-dynamic";
import { Inter, JetBrains_Mono, Playfair_Display } from "next/font/google";

// 1. 无衬线体：用于正文，极具现代感
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap", // 避免字体闪烁，立即显示回退字体
});

// 2. 衬线体：用于标题，增加优雅感 (适合非遗、鞋履等项目)
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

// 3. 等宽字体：用于技术细节或代码
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      className={`${inter.variable} ${playfair.variable} ${jetbrains.variable}`}
      lang="en"
    >
      <body className="bg-white font-sans text-slate-900 antialiased">
        <QueryProvider>
          <div className="relative flex min-h-screen flex-col selection:bg-black selection:text-white">
            <Navbar />
            {/* 使用 flex-1 确保 Footer 始终在页面底部（当内容不足一屏时） */}
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </QueryProvider>
      </body>
    </html>
  );
}
