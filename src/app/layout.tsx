import type { Metadata } from "next";
import { Newsreader } from "next/font/google";
import "./globals.css";
import { ThemeScript } from "@/components/theme-script";

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "南京大学未来编辑部 · 智慧课程平台",
  description: "南京大学新闻传播学院未来编辑部智慧课程平台 — 采编审稿、AI助教、报道数据库",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${newsreader.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <a href="#main-content" className="skip-link">跳转到主内容</a>
        <ThemeScript />
        {children}
      </body>
    </html>
  );
}
