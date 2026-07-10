"use client";

import { App, ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";

dayjs.locale("zh-cn");

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: "#2563eb",
          colorInfo: "#0891b2",
          colorSuccess: "#059669",
          colorWarning: "#d97706",
          colorError: "#dc2626",
          colorTextBase: "#172033",
          colorBgBase: "#f4f7fb",
          borderRadius: 8,
          fontFamily:
            "Inter, Arial, \"PingFang SC\", \"Microsoft YaHei\", sans-serif"
        },
        components: {
          Layout: {
            headerBg: "#ffffff",
            bodyBg: "#f4f7fb",
            siderBg: "#ffffff",
            triggerBg: "#ffffff"
          },
          Menu: {
            itemBg: "transparent",
            itemBorderRadius: 8,
            itemHeight: 42,
            itemMarginInline: 12,
            itemSelectedBg: "#e9f0ff",
            itemSelectedColor: "#1d4ed8",
            itemHoverBg: "#f3f6fb"
          },
          Button: {
            borderRadius: 8,
            controlHeight: 36
          },
          Table: {
            headerBg: "#f8fafc",
            headerColor: "#475569",
            rowHoverBg: "#f8fafc"
          },
          Card: {
            borderRadiusLG: 8
          }
        }
      }}
    >
      <App>{children}</App>
    </ConfigProvider>
  );
}
