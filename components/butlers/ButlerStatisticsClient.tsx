"use client";

import { DownloadOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import {
  App,
  Button,
  DatePicker,
  Descriptions,
  Drawer,
  Form,
  Select,
  Space,
  Tag,
  Typography
} from "antd";
import type { Dayjs } from "dayjs";
import { useEffect, useState } from "react";
import type {
  ButlerStatisticsRecord,
  ButlerSummary,
  HotelSummary
} from "@/types/domain";
import { maskPhone } from "@/utils/format";
import { SortableTable } from "@/components/tables/SortableTable";

type ApiResult<T> =
  | { success: true; data: T; message: string }
  | { success: false; error: { code: string; message: string } };

type StatisticsFilterValues = {
  butlerId?: string;
  hotelId?: string;
  range?: "today" | "week" | "month" | "custom";
  customRange?: [Dayjs, Dayjs];
};

const rangeOptions = [
  { label: "今日", value: "today" },
  { label: "近 7 天", value: "week" },
  { label: "本月", value: "month" },
  { label: "自定义", value: "custom" }
];

const butlerStatusLabels: Record<string, string> = {
  available: "空闲",
  pending_confirm: "待接单",
  confirmed_waiting: "准备接待",
  in_service: "接待中",
  on_leave: "空闲",
  suspended: "空闲",
  disabled: "空闲"
};

const butlerStatusColors: Record<string, string> = {
  available: "success",
  pending_confirm: "processing",
  confirmed_waiting: "blue",
  in_service: "green",
  on_leave: "warning",
  suspended: "orange",
  disabled: "default"
};

export function ButlerStatisticsClient() {
  const { message } = App.useApp();
  const [form] = Form.useForm<StatisticsFilterValues>();
  const [items, setItems] = useState<ButlerStatisticsRecord[]>([]);
  const [butlers, setButlers] = useState<ButlerSummary[]>([]);
  const [hotels, setHotels] = useState<HotelSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<ButlerStatisticsRecord | null>(null);

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
      throw new Error(
        result.success ? "请求失败" : result.error?.message ?? "请求失败"
      );
    }

    return result.data;
  }

  async function loadBootstrap() {
    const [butlerData, hotelData] = await Promise.all([
      request<{ items: ButlerSummary[] }>("/api/butlers"),
      request<{ items: HotelSummary[] }>("/api/hotels")
    ]);
    setButlers(butlerData.items);
    setHotels(hotelData.items);
  }

  async function loadStatistics() {
    setLoading(true);
    try {
      const values = form.getFieldsValue();
      const params = new URLSearchParams({
        range: values.range || "month"
      });

      if (values.butlerId) {
        params.set("butlerId", values.butlerId);
      }
      if (values.hotelId) {
        params.set("hotelId", values.hotelId);
      }
      if (values.range === "custom" && values.customRange?.[0] && values.customRange?.[1]) {
        params.set("startTime", values.customRange[0].toDate().toISOString());
        params.set("endTime", values.customRange[1].toDate().toISOString());
      }

      const data = await request<{ items: ButlerStatisticsRecord[] }>(
        `/api/statistics/butlers?${params.toString()}`
      );
      setItems(data.items);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "加载管家统计失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadBootstrap()
      .then(loadStatistics)
      .catch((error) =>
        message.error(error instanceof Error ? error.message : "初始化失败")
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="page-panel">
      <Space orientation="vertical" size={16} style={{ width: "100%" }}>
        <Space style={{ justifyContent: "space-between", width: "100%" }}>
          <Typography.Title level={3} style={{ margin: 0 }}>
            管家统计
          </Typography.Title>
          <Space>
            <Button icon={<DownloadOutlined />} disabled>
              导出
            </Button>
            <Button icon={<ReloadOutlined />} onClick={loadStatistics}>
              刷新
            </Button>
          </Space>
        </Space>

        <Form form={form} layout="inline" initialValues={{ range: "month" }}>
          <Form.Item name="butlerId">
            <Select
              allowClear
              showSearch
              placeholder="管家"
              style={{ width: 170 }}
              options={butlers.map((butler) => ({
                label: butler.name,
                value: butler.id
              }))}
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item name="hotelId">
            <Select
              allowClear
              showSearch
              placeholder="酒店"
              style={{ width: 190 }}
              options={hotels.map((hotel) => ({
                label: hotel.name,
                value: hotel.id
              }))}
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item name="range">
            <Select style={{ width: 130 }} options={rangeOptions} />
          </Form.Item>
          <Form.Item name="customRange">
            <DatePicker.RangePicker showTime placeholder={["开始时间", "结束时间"]} />
          </Form.Item>
          <Button type="primary" icon={<SearchOutlined />} onClick={loadStatistics}>
            搜索
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              form.resetFields();
              loadStatistics();
            }}
          >
            重置
          </Button>
        </Form>

        <SortableTable<ButlerStatisticsRecord>
          rowKey="butlerId"
          loading={loading}
          dataSource={items}
          scroll={{ x: 1300 }}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          columns={[
            { title: "管家姓名", dataIndex: "name", width: 120 },
            {
              title: "手机号",
              dataIndex: "phone",
              width: 140,
              render: maskPhone
            },
            {
              title: "当前状态",
              dataIndex: "status",
              width: 130,
              render: (value) => (
                <Tag color={butlerStatusColors[value]}>
                  {butlerStatusLabels[value] ?? value}
                </Tag>
              )
            },
            { title: "接单数", dataIndex: "orderCount", width: 90 },
            { title: "完成单数", dataIndex: "completedOrderCount", width: 100 },
            { title: "服务客人数", dataIndex: "guestCount", width: 110 },
            { title: "拒单次数", dataIndex: "rejectCount", width: 100 },
            {
              title: "拒单率",
              dataIndex: "rejectRate",
              width: 100,
              render: (value: number) => `${Math.round(value * 100)}%`
            },
            { title: "平均评分", dataIndex: "averageScore", width: 100 },
            {
              title: "好评率",
              dataIndex: "goodReviewRate",
              width: 100,
              render: (value: number) => `${Math.round(value * 100)}%`
            },
            { title: "请假天数", dataIndex: "leaveDays", width: 100 },
            {
              title: "操作",
              fixed: "right",
              width: 90,
              render: (_, record) => (
                <Button type="link" onClick={() => setDetail(record)}>
                  详情
                </Button>
              )
            }
          ]}
        />
      </Space>

      <Drawer
        title="管家统计详情"
        size={640}
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
      >
        {detail ? (
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="管家">{detail.name}</Descriptions.Item>
            <Descriptions.Item label="手机号">
              {maskPhone(detail.phone)}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              {butlerStatusLabels[detail.status] ?? detail.status}
            </Descriptions.Item>
            <Descriptions.Item label="接单数">
              {detail.orderCount}
            </Descriptions.Item>
            <Descriptions.Item label="完成单数">
              {detail.completedOrderCount}
            </Descriptions.Item>
            <Descriptions.Item label="服务客人数">
              {detail.guestCount}
            </Descriptions.Item>
            <Descriptions.Item label="拒单次数">
              {detail.rejectCount}
            </Descriptions.Item>
            <Descriptions.Item label="拒单率">
              {Math.round(detail.rejectRate * 100)}%
            </Descriptions.Item>
            <Descriptions.Item label="平均评分">
              {detail.averageScore}
            </Descriptions.Item>
            <Descriptions.Item label="好评率">
              {Math.round(detail.goodReviewRate * 100)}%
            </Descriptions.Item>
            <Descriptions.Item label="请假天数">
              {detail.leaveDays}
            </Descriptions.Item>
            <Descriptions.Item label="评价次数">
              {detail.reviewCount}
            </Descriptions.Item>
          </Descriptions>
        ) : null}
      </Drawer>
    </section>
  );
}
