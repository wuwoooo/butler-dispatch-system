"use client";

import { Space, Tabs, Typography } from "antd";
import { NotificationSettingsClient } from "@/components/settings/NotificationSettingsClient";
import { SystemDictsClient } from "@/components/settings/SystemDictsClient";

const settingsTabItems = [
  {
    key: "business",
    label: "业务选项",
    children: <SystemDictsClient />
  },
  {
    key: "notifications",
    label: "通知配置",
    children: <NotificationSettingsClient />
  }
];

export function SettingsClient() {
  return (
    <section className="page-panel">
      <Space orientation="vertical" size={16} style={{ width: "100%" }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          业务配置
        </Typography.Title>
        <Tabs items={settingsTabItems} />
      </Space>
    </section>
  );
}
