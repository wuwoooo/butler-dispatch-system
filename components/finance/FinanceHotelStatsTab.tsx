"use client";

import { useEffect, useState } from "react";
import { Form, Select, DatePicker, Button, Space, App } from "antd";
import { SearchOutlined, ReloadOutlined, DownloadOutlined } from "@ant-design/icons";
import type { Dayjs } from "dayjs";
import { SortableTable } from "@/components/tables/SortableTable";
import type { HotelStatisticRecord, HotelSummary } from "@/types/domain";

type HotelFilterValues = {
  hotelId?: string;
  pickupType?: string;
  dateRange?: [Dayjs, Dayjs];
};

export function FinanceHotelStatsTab({
  hotels,
  request
}: {
  hotels: HotelSummary[];
  request: <T>(url: string, init?: RequestInit) => Promise<T>;
}) {
  const { message } = App.useApp();
  const [form] = Form.useForm<HotelFilterValues>();
  const [hotelStats, setHotelStats] = useState<HotelStatisticRecord[]>([]);
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

  async function loadHotels(
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

      const keys: Array<keyof HotelFilterValues> = ["hotelId", "pickupType"];
      for (const key of keys) {
        const value = filters[key];
        if (value) {
          params.set(key, String(value));
        }
      }

      appendDateRange(params, filters.dateRange, "startDate", "endDate");

      const data = await request<{
        items: HotelStatisticRecord[];
        pagination: { page: number; pageSize: number; total: number };
      }>(`/api/finance/hotel-statistics?${params.toString()}`);

      setHotelStats(data.items);
      setPagination(data.pagination);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "加载酒店统计失败");
    } finally {
      setLoading(false);
    }
  }

  function handleExport() {
    const filters = form.getFieldsValue();
    const params = new URLSearchParams();
    const keys: Array<keyof HotelFilterValues> = ["hotelId", "pickupType"];
    for (const key of keys) {
      const value = filters[key];
      if (value) {
        params.set(key, String(value));
      }
    }
    appendDateRange(params, filters.dateRange, "startDate", "endDate");

    window.open(`/api/export/hotel-statistics?${params.toString()}`, "_blank");
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadHotels(1, 10);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Form
        form={form}
        layout="inline"
        onFinish={() => loadHotels(1, pagination.pageSize)}
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
        <Form.Item name="pickupType">
          <Select
            allowClear
            style={{ width: 120 }}
            placeholder="接站类型"
            options={[
              { label: "接飞机", value: "airport" },
              { label: "接火车", value: "train" }
            ]}
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
            loadHotels(1, pagination.pageSize, {});
          }}
        >
          重置
        </Button>
        <Button icon={<DownloadOutlined />} onClick={handleExport}>
          导出
        </Button>
      </Form>

      <SortableTable<HotelStatisticRecord>
        rowKey="hotelId"
        loading={loading}
        dataSource={hotelStats}
        columns={[
          { title: "酒店名称", dataIndex: "hotelName", key: "hotelName", width: 200 },
          { title: "订单总数", dataIndex: "orderCount", key: "orderCount", width: 100 },
          { title: "已完成订单数", dataIndex: "completedOrderCount", key: "completedOrderCount", width: 130 },
          { title: "服务中订单数", dataIndex: "inServiceOrderCount", key: "inServiceOrderCount", width: 130 },
          { title: "待分配订单数", dataIndex: "pendingDispatchOrderCount", key: "pendingDispatchOrderCount", width: 130 },
          { title: "待评价订单数", dataIndex: "pendingReviewOrderCount", key: "pendingReviewOrderCount", width: 130 },
          { title: "已取消订单数", dataIndex: "cancelledOrderCount", key: "cancelledOrderCount", width: 130 },
          { title: "入住人数合计", dataIndex: "guestCount", key: "guestCount", width: 120 },
          { title: "接飞机订单数", dataIndex: "airportOrderCount", key: "airportOrderCount", width: 120 },
          { title: "接火车订单数", dataIndex: "trainOrderCount", key: "trainOrderCount", width: 120 },
          {
            title: "平均评分",
            dataIndex: "averageScore",
            key: "averageScore",
            width: 100,
            render: (value: number) => (value > 0 ? value.toFixed(2) : "-")
          }
        ]}
        pagination={{
          current: pagination.page,
          pageSize: pagination.pageSize,
          total: pagination.total,
          onChange: (page, pageSize) => loadHotels(page, pageSize)
        }}
      />
    </Space>
  );
}
