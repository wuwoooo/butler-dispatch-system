"use client";

import {
  App,
  DatePicker,
  Empty,
  Select,
  Space,
  Typography
} from "antd";
import type { Dayjs } from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ReactECharts from "echarts-for-react";

const statusMap: Record<string, string> = {
  pending_dispatch: "待分配",
  pending_confirm: "待接单",
  confirmed: "已接单",
  pending_service: "待服务",
  in_service: "服务中",
  pending_review: "待评价",
  reviewed: "已评价",
  pending_settlement: "待结算",
  completed: "已完成",
  cancelled: "已取消",
  available: "空闲",
  working: "接待中",
  leave: "请假中",
  offline: "离线",
  confirmed_waiting: "准备接待"
};

const translateStatus = (status: string) => statusMap[status] || status;

type DashboardResponse = {
  cards: {
    todayNewOrders: number;
    todayPendingDispatch: number;
    todayInService: number;
    todayCompleted: number;
    todayRejectCount: number;
    idleButlers: number;
    workingButlers: number;
    leaveButlers: number;
    monthOrders: number;
    monthGuestCount: number;
    monthAverageScore: number;
    monthRejectRate: number;
    monthCompletionRate: number;
    pendingReviewOrders: number;
    pendingSettlementOrders: number;
  };
  orderStatusOverview: Array<{ status: string; count: number }>;
  butlerStatusOverview: Array<{ status: string; count: number }>;
  rankings: {
    hotelOrders: Array<{ id: string; name: string; value: number }>;
    butlerOrders: Array<{ id: string; name: string; value: number }>;
    butlerScores: Array<{
      id: string;
      name: string;
      value: number;
      reviewCount?: number;
    }>;
    butlerRejects: Array<{ id: string; name: string; value: number }>;
  };
};

type CurrentUser = {
  id: string;
  roleCode: string;
  hotelId?: string | null;
};

type HotelOption = {
  id: string;
  name: string;
};

type ChartOptionInput = {
  tooltip?: Record<string, unknown>;
} & Record<string, unknown>;

export function DashboardHome() {
  const router = useRouter();
  const { message } = App.useApp();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [hotels, setHotels] = useState<HotelOption[]>([]);
  const [hotelId, setHotelId] = useState<string>();
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const cards = useMemo(() => {
    if (!data) return [];
    return [
      { label: "今日新增订单", value: data.cards.todayNewOrders, icon: "fa-file-circle-plus", glow: "glow-text-primary", path: "/orders" },
      { label: "今日待分配", value: data.cards.todayPendingDispatch, icon: "fa-clock", glow: "glow-text-warning", path: "/dispatch" },
      { label: "今日服务中", value: data.cards.todayInService, icon: "fa-person-walking-luggage", glow: "glow-text-primary", path: "/orders" },
      { label: "今日已完成", value: data.cards.todayCompleted, icon: "fa-circle-check", glow: "glow-text-success", path: "/orders" },
      { label: "当前空闲管家", value: data.cards.idleButlers, icon: "fa-user-check", glow: "glow-text-success", path: "/butlers" },
      { label: "当前服务中管家", value: data.cards.workingButlers, icon: "fa-user-gear", glow: "glow-text-primary", path: "/butlers" },
      { label: "待评价订单", value: data.cards.pendingReviewOrders, icon: "fa-star-half-stroke", glow: "glow-text-warning", path: "/reviews" },
      { label: "待结算订单", value: data.cards.pendingSettlementOrders, icon: "fa-wallet", glow: "glow-text-warning", path: "/finance" }
    ];
  }, [data]);

  const hasDashboardData = useMemo(() => {
    if (!data) return false;

    const cardValues = Object.values(data.cards);
    const rankingValues = Object.values(data.rankings).flat();

    return (
      cardValues.some((value) => value > 0) ||
      data.orderStatusOverview.some((item) => item.count > 0) ||
      data.butlerStatusOverview.some((item) => item.count > 0) ||
      rankingValues.some((item) => item.value > 0)
    );
  }, [data]);

  async function request<T>(url: string) {
    const response = await fetch(url);
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error?.message ?? "请求失败");
    }
    return result.data as T;
  }

  async function loadBootstrap() {
    const me = await request<{ user: CurrentUser }>("/api/auth/me");
    setCurrentUser(me.user);

    if (["admin", "dispatcher", "finance"].includes(me.user.roleCode)) {
      const hotelData = await request<{ items: HotelOption[] }>("/api/hotels");
      setHotels(hotelData.items);
    } else if (me.user.hotelId) {
      setHotelId(me.user.hotelId);
    }
  }

  async function loadData(nextHotelId = hotelId, nextRange = range) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (nextHotelId) params.set("hotelId", nextHotelId);
      if (nextRange?.[0]) params.set("startDate", nextRange[0].toDate().toISOString());
      if (nextRange?.[1]) params.set("endDate", nextRange[1].toDate().toISOString());

      const result = await request<DashboardResponse>(
        `/api/statistics/dashboard?${params.toString()}`
      );
      setData(result);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "加载数据失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadBootstrap()
      .then(() => loadData())
      .catch((error) =>
        message.error(error instanceof Error ? error.message : "初始化失败")
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 图表通用样式配置
  const getChartOptions = (options: ChartOptionInput): ChartOptionInput => ({
    textStyle: { fontFamily: "Inter, sans-serif", color: "#64748b" },
    tooltip: {
      backgroundColor: "rgba(255, 255, 255, 0.9)",
      borderColor: "rgba(99, 102, 241, 0.3)",
      textStyle: { color: "#0f172a" },
      padding: [12, 16],
      ...options.tooltip
    },
    ...options
  });

  const orderStatusOption = useMemo(() => {
    if (!data) return {};
    return getChartOptions({
      tooltip: { trigger: "item" },
      legend: { top: "5%", left: "center", textStyle: { color: "#475569" } },
      series: [
        {
          name: "订单状态",
          type: "pie",
          radius: ["40%", "70%"],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: "#ffffff",
            borderWidth: 2
          },
          label: { show: false, position: "center" },
          emphasis: {
            label: { show: true, fontSize: 20, fontWeight: "bold", color: "#0f172a" }
          },
          labelLine: { show: false },
          data: data.orderStatusOverview.map((item) => ({
            name: translateStatus(item.status),
            value: item.count
          }))
        }
      ]
    });
  }, [data]);

  const butlerStatusOption = useMemo(() => {
    if (!data) return {};
    return getChartOptions({
      tooltip: { trigger: "item" },
      legend: { bottom: "0%", left: "center", textStyle: { color: "#475569" } },
      series: [
        {
          name: "管家状态",
          type: "pie",
          radius: [20, 100],
          center: ["50%", "45%"],
          roseType: "area",
          itemStyle: { borderRadius: 8 },
          data: data.butlerStatusOverview.map((item) => ({
            name: translateStatus(item.status),
            value: item.count
          }))
        }
      ]
    });
  }, [data]);

  // 生成横向渐变条形图配置
  const getBarOption = (dataset: Array<{ name: string; value: number }>) => {
    const sorted = [...dataset].sort((a, b) => a.value - b.value).slice(-5); // 取 Top 5
    return getChartOptions({
      grid: { left: "3%", right: "8%", bottom: "3%", top: "3%", containLabel: true },
      xAxis: { type: "value", splitLine: { lineStyle: { color: "rgba(0,0,0,0.05)" } } },
      yAxis: {
        type: "category",
        data: sorted.map((s) => s.name),
        axisLabel: { color: "#475569" },
        axisTick: { show: false },
        axisLine: { show: false }
      },
      series: [
        {
          type: "bar",
          data: sorted.map((s) => s.value),
          barWidth: 16,
          itemStyle: {
            borderRadius: [0, 8, 8, 0],
            color: {
              type: "linear", x: 0, y: 0, x2: 1, y2: 0,
              colorStops: [
                { offset: 0, color: "rgba(99, 102, 241, 0.2)" },
                { offset: 1, color: "rgba(79, 70, 229, 0.8)" }
              ]
            }
          },
          label: {
            show: true,
            position: "right",
            color: "#475569",
            fontWeight: "bold"
          }
        }
      ]
    });
  };

  return (
    <section className="cockpit-layout">
      <Space
        orientation="vertical"
        size={24}
        style={{ width: "100%", position: "relative", zIndex: 10 }}
      >
        <Space style={{ justifyContent: "space-between", width: "100%" }}>
          <Typography.Title level={2} className="cockpit-header-title" style={{ margin: 0 }}>
            数据驾驶舱 <span style={{ color: "#4f46e5", fontWeight: 300 }}>{"// COCKPIT"}</span>
          </Typography.Title>
          <Space wrap>
            {["admin", "dispatcher", "finance"].includes(currentUser?.roleCode ?? "") ? (
              <Select
                allowClear
                placeholder="按酒店筛选"
                style={{ width: 200 }}
                value={hotelId}
                options={hotels.map((hotel) => ({
                  label: hotel.name,
                  value: hotel.id
                }))}
                onChange={(value) => {
                  setHotelId(value);
                  loadData(value, range);
                }}
              />
            ) : null}
            <DatePicker.RangePicker
              showTime
              value={range}
              onChange={(value) => {
                setRange(value);
                loadData(hotelId, value);
              }}
            />
          </Space>
        </Space>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
          {cards.map((item) => (
            <div 
              key={item.label} 
              className="cockpit-stat-card"
              style={{ cursor: "pointer" }}
              onClick={() => router.push(item.path)}
            >
              <div className="cockpit-stat-icon">
                <i className={`fa-solid ${item.icon}`} />
              </div>
              <div className="cockpit-stat-content">
                <div className="cockpit-stat-label">{item.label}</div>
                <div className={`cockpit-stat-value ${item.glow}`}>
                  {loading ? "-" : item.value}
                </div>
              </div>
            </div>
          ))}
        </div>

        {(!data && !loading) || (data && !hasDashboardData) ? (
          <div className="cockpit-panel" style={{ textAlign: "center", padding: 60 }}>
            <Empty description={<span style={{ color: "#94a3b8" }}>暂无看板数据</span>} />
          </div>
        ) : data && hasDashboardData ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
              <div className="cockpit-panel">
                <div className="ant-card-head"><div className="ant-card-head-title">订单状态概览</div></div>
                <div className="ant-card-body" style={{ height: 320 }}>
                  <ReactECharts option={orderStatusOption} style={{ height: "100%", width: "100%" }} />
                </div>
              </div>

              <div className="cockpit-panel">
                <div className="ant-card-head"><div className="ant-card-head-title">管家状态分布</div></div>
                <div className="ant-card-body" style={{ height: 320 }}>
                  <ReactECharts option={butlerStatusOption} style={{ height: "100%", width: "100%" }} />
                </div>
              </div>

              <div className="cockpit-panel">
                <div className="ant-card-head"><div className="ant-card-head-title">核心运营指标 (本月)</div></div>
                <div className="ant-card-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(0,0,0,0.05)", paddingBottom: 12 }}>
                    <span style={{ color: "#64748b" }}>订单总数</span>
                    <span className="glow-text-primary" style={{ fontSize: 18, fontWeight: "bold" }}>{data.cards.monthOrders}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(0,0,0,0.05)", paddingBottom: 12 }}>
                    <span style={{ color: "#64748b" }}>服务客人数</span>
                    <span className="glow-text-primary" style={{ fontSize: 18, fontWeight: "bold" }}>{data.cards.monthGuestCount}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(0,0,0,0.05)", paddingBottom: 12 }}>
                    <span style={{ color: "#64748b" }}>平均评分</span>
                    <span className="glow-text-warning" style={{ fontSize: 18, fontWeight: "bold" }}>{data.cards.monthAverageScore}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(0,0,0,0.05)", paddingBottom: 12 }}>
                    <span style={{ color: "#64748b" }}>订单完成率</span>
                    <span className="glow-text-success" style={{ fontSize: 18, fontWeight: "bold" }}>{data.cards.monthCompletionRate}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 12 }}>
                    <span style={{ color: "#64748b" }}>订单拒单率</span>
                    <span style={{ color: "#ef4444", fontSize: 18, fontWeight: "bold" }}>{data.cards.monthRejectRate}</span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 20 }}>
              <div className="cockpit-panel">
                <div className="ant-card-head"><div className="ant-card-head-title">酒店订单 Top 5</div></div>
                <div className="ant-card-body" style={{ height: 280 }}>
                  <ReactECharts option={getBarOption(data.rankings.hotelOrders)} style={{ height: "100%", width: "100%" }} />
                </div>
              </div>
              
              <div className="cockpit-panel">
                <div className="ant-card-head"><div className="ant-card-head-title">管家接单 Top 5</div></div>
                <div className="ant-card-body" style={{ height: 280 }}>
                  <ReactECharts option={getBarOption(data.rankings.butlerOrders)} style={{ height: "100%", width: "100%" }} />
                </div>
              </div>

              <div className="cockpit-panel">
                <div className="ant-card-head"><div className="ant-card-head-title">管家评分 Top 5</div></div>
                <div className="ant-card-body" style={{ height: 280 }}>
                  <ReactECharts option={getBarOption(data.rankings.butlerScores)} style={{ height: "100%", width: "100%" }} />
                </div>
              </div>
              
              <div className="cockpit-panel">
                <div className="ant-card-head"><div className="ant-card-head-title">管家拒单排行</div></div>
                <div className="ant-card-body" style={{ height: 280 }}>
                  <ReactECharts option={getBarOption(data.rankings.butlerRejects)} style={{ height: "100%", width: "100%" }} />
                </div>
              </div>
            </div>
          </>
        ) : null}
      </Space>
    </section>
  );
}
