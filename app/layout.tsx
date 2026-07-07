import type { Metadata } from "next";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import "antd/dist/reset.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "./globals.css";
import { Providers } from "@/app/providers";

export const metadata: Metadata = {
  title: "阿鹏哥管家调配",
  description: "旅游区酒店管家调配 Web 管理后台"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <AntdRegistry>
          <Providers>{children}</Providers>
        </AntdRegistry>
      </body>
    </html>
  );
}
