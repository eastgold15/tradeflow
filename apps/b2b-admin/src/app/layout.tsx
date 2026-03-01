'use client'
import { Providers } from "@/providers/query-provider";
import "./globals.css";

// 禁用静态预渲染，因为应用完全依赖客户端状态
export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-white font-sans text-black antialiased" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
