import type { Metadata } from "next";
import { GlobalMessageProvider } from "@/components/shared/GlobalMessageProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "fully-dried",
  description: "全干,测试ci",
};

/** 定义全局根布局与通用文档元信息。 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body>
        <GlobalMessageProvider>{children}</GlobalMessageProvider>
      </body>
    </html>
  );
}
