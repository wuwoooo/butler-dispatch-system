"use client";

import { useEffect, useState } from "react";
import { App, Button, Tabs, Typography, Space } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import { FinanceOrdersTab } from "./FinanceOrdersTab";
import { FinanceServicesTab } from "./FinanceServicesTab";
import { FinanceHotelStatsTab } from "./FinanceHotelStatsTab";
import { FinanceButlerStatsTab } from "./FinanceButlerStatsTab";
import type { HotelSummary, ButlerSummary } from "@/types/domain";

type ApiResult<T> =
  | { success: true; data: T; message: string }
  | { success: false; error: { code: string; message: string } };

export function FinanceClient() {
  const { message } = App.useApp();
  const [currentUser, setCurrentUser] = useState<{ roleCode: string } | null>(null);
  const [hotels, setHotels] = useState<HotelSummary[]>([]);
  const [butlers, setButlers] = useState<ButlerSummary[]>([]);
  const [clientReady, setClientReady] = useState(false);
  const [activeTab, setActiveTab] = useState("orders");
  const [visitedTabs, setVisitedTabs] = useState<Record<string, boolean>>({ orders: true });
  const [selectedButlerId, setSelectedButlerId] = useState<string | undefined>(undefined);

  async function request<T>(url: string, init?: RequestInit) {
    const response = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers || {})
      }
    });
    const result = (await response.json()) as ApiResult<T>;

    if (!response.ok || !result.success) {
      throw new Error(result.success ? "请求失败" : result.error.message);
    }

    return result.data;
  }

  async function loadBootstrap() {
    try {
      const me = await request<{ user: { roleCode: string } }>("/api/auth/me");
      setCurrentUser(me.user);

      const hotelData = await request<{ items: HotelSummary[] }>("/api/hotels");
      setHotels(hotelData.items);

      if (["admin", "dispatcher", "finance"].includes(me.user.roleCode)) {
        const butlerData = await request<{ items: ButlerSummary[] }>("/api/butlers");
        setButlers(butlerData.items);
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : "初始化失败");
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setClientReady(true);
    loadBootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setVisitedTabs((prev) => ({ ...prev, [key]: true }));
    setSelectedButlerId(undefined); // 切换 Tab 时重置管家筛选值
  };

  const canViewGlobalButlerReports = ["admin", "dispatcher", "finance"].includes(
    currentUser?.roleCode ?? ""
  );

  const tabItems = [
    {
      key: "orders",
      label: "订单明细",
      children: visitedTabs.orders ? (
        <FinanceOrdersTab
          hotels={hotels}
          butlers={butlers}
          currentUser={currentUser}
          request={request}
          onButlerChange={setSelectedButlerId}
        />
      ) : null
    }
  ];

  if (canViewGlobalButlerReports) {
    tabItems.push({
      key: "services",
      label: "管家服务明细",
      children: visitedTabs.services ? (
        <FinanceServicesTab hotels={hotels} butlers={butlers} request={request} />
      ) : null
    });
  }

  tabItems.push({
    key: "hotels",
    label: "酒店统计",
    children: visitedTabs.hotels ? (
        <FinanceHotelStatsTab hotels={hotels} request={request} />
      ) : null
  });

  if (canViewGlobalButlerReports) {
    tabItems.push({
      key: "butlers",
      label: "管家统计",
      children: visitedTabs.butlers ? (
        <FinanceButlerStatsTab hotels={hotels} butlers={butlers} request={request} />
      ) : null
    });
  }

  if (!clientReady) {
    return null;
  }

  return (
    <section className="page-panel">
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
          <Typography.Title level={3} style={{ margin: 0 }}>
            财务统计
          </Typography.Title>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={() => {
              const url = selectedButlerId ? `/api/export/finance?butlerId=${selectedButlerId}` : "/api/export/finance";
              window.open(url, "_blank");
            }}
          >
            导出财务总表
          </Button>
        </div>

        <Tabs activeKey={activeTab} onChange={handleTabChange} items={tabItems} />
      </Space>
    </section>
  );
}
