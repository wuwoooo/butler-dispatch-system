"use client";

import { useEffect, useState } from "react";
import { Form, Select, DatePicker, Button, Space, Tag, App } from "antd";
import { SearchOutlined, ReloadOutlined, DownloadOutlined } from "@ant-design/icons";
import type { Dayjs } from "dayjs";
import { SortableTable } from "@/components/tables/SortableTable";
import type { ButlerStatisticsRecord, ButlerSummary, HotelSummary } from "@/types/domain";

type ButlerFilterValues = {
  hotelId?: string;
  butlerId?: string;
  dateRange?: [Dayjs, Dayjs];
};

const butlerStatusLabels: Record<string, string> = {
  available: "正常",
  pending_confirm: "待确认",
  confirmed_waiting: "已确认待接客",
  in_service: "服务中",
  on_leave: "请假中",
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

export function FinanceButlerStatsTab({
  hotels,
  butlers,
  request
}: {
  hotels: HotelSummary[];
  butlers: ButlerSummary[];
  request: <T>(url: string, init?: RequestInit) => Promise<T>;
}) {
  const { message } = App.useApp();
  const [form] = Form.useForm<ButlerFilterValues>();
  const [butlerStats, setButlerStats] = useState<ButlerStatisticsRecord[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0 });
  const [loading, setLoading] = useState(false);

  function appendDateRange(
    params: URLSearchParams,
    range: [Dayjs, Dayjs] | undefined,
    startKey: string,
    endKey: string
  ) {
    if (range?.[0]) {
      params.set(startKey, range[0].toDate().toISOString());
    }
    if (range?.[1]) {
      params.set(endKey, range[1].toDate().toISOString());
    }
  }

  async function loadButlerStats(
    page = pagination.page,
    pageSize = pagination.pageSize,
    filters = form.getFieldsValue()
  ) {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize)
      });

      if (filters.butlerId) {
        params.set("butlerId", filters.butlerId);
      }
      if (filters.hotelId) {
        params.set("hotelId", filters.hotelId);
      }
      if (filters.dateRange?.[0]) {
        params.set("range", "custom");
        params.set("startTime", filters.dateRange[0].toDate().toISOString());
      }
      if (filters.dateRange?.[1]) {
        params.set("range", "custom");
        params.set("endTime", filters.dateRange[1].toDate().toISOString());
      }

      const data = await request<{
        items: ButlerStatisticsRecord[];
        pagination: { page: number; pageSize: number; total: number };
      }>(`/api/statistics/butlers?${params.toString()}`);

      setButlerStats(data.items);
      setPagination(data.pagination);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "加载管家统计失败");
    } finally {
      setLoading(false);
    }
  }

  function handleExport() {
    const filters = form.getFieldsValue();
    const params = new URLSearchParams();
    if (filters.butlerId) {
      params.set("butlerId", filters.butlerId);
    }
    if (filters.hotelId) {
      params.set("hotelId", filters.hotelId);
    }
    appendDateRange(params, filters.dateRange, "startDate", "endDate");

    window.open(`/api/export/butler-statistics?${params.toString()}`, "_blank");
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadButlerStats(1, 10);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Form
        form={form}
        layout="inline"
        onFinish={() => loadButlerStats(1, pagination.pageSize)}
      >
        <Form.Item name="hotelId">
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            style={{ width: 180 }}
            placeholder="酒店"
            options={hotels.map((hotel) => ({ label: hotel.name, value: hotel.id }))}
          />
        </Form.Item>
        <Form.Item name="butlerId">
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            style={{ width: 180 }}
            placeholder="管家"
            options={butlers.map((butler) => ({ label: butler.name, value: butler.id }))}
          />
        </Form.Item>
        <Form.Item name="dateRange">
          <DatePicker.RangePicker placeholder={["统计开始", "统计结束"]} />
        </Form.Item>
        <Button type="primary" icon={<SearchOutlined />} htmlType="submit">
          搜索
        </Button>
        <Button
          icon={<ReloadOutlined />}
          onClick={() => {
            form.resetFields();
            loadButlerStats(1, pagination.pageSize, {});
          }}
        >
          重置
        </Button>
        <Button icon={<DownloadOutlined />} onClick={handleExport}>
          导出
        </Button>
      </Form>

      <SortableTable<ButlerStatisticsRecord>
        rowKey="butlerId"
        loading={loading}
        dataSource={butlerStats}
        scroll={{ x: 1200 }}
        columns={[
          { title: "管家姓名", dataIndex: "name", key: "name", width: 120 },
          {
            title: "手机号",
            dataIndex: "phone",
            key: "phone",
            width: 140
          },
          {
            title: "当前状态",
            dataIndex: "status",
            key: "status",
            width: 130,
            render: (val: string) => (
              <Tag color={butlerStatusColors[val] || "default"}>
                {butlerStatusLabels[val] || val}
              </Tag>
            )
          },
          { title: "接单数", dataIndex: "orderCount", key: "orderCount", width: 100 },
          { title: "完成单数", dataIndex: "completedOrderCount", key: "completedOrderCount", width: 100 },
          { title: "服务客人数", dataIndex: "guestCount", key: "guestCount", width: 110 },
          { title: "拒单次数", dataIndex: "rejectCount", key: "rejectCount", width: 100 },
          {
            title: "拒单率",
            dataIndex: "rejectRate",
            key: "rejectRate",
            width: 100,
            render: (val: number) => `${Math.round(val * 100)}%`
          },
          {
            title: "平均评分",
            dataIndex: "averageScore",
            key: "averageScore",
            width: 100,
            render: (val: number) => (val > 0 ? val.toFixed(2) : "-")
          },
          {
            title: "好评率",
            dataIndex: "goodReviewRate",
            key: "goodReviewRate",
            width: 100,
            render: (val: number) => `${Math.round(val * 100)}%`
          },
          { title: "请假天数", dataIndex: "leaveDays", key: "leaveDays", width: 100 }
        ]}
        pagination={{
          current: pagination.page,
          pageSize: pagination.pageSize,
          total: pagination.total,
          onChange: (page, pageSize) => loadButlerStats(page, pageSize)
        }}
      />
    </Space>
  );
}
