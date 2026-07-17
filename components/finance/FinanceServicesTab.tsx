"use client";

import { useEffect, useState } from "react";
import { Form, Select, DatePicker, Button, Space, Tag, App } from "antd";
import { SearchOutlined, ReloadOutlined, DownloadOutlined } from "@ant-design/icons";
import type { Dayjs } from "dayjs";
import { SortableTable } from "@/components/tables/SortableTable";
import {
  AssignmentStatusTag,
  PickupTypeTag,
  assignmentStatusOptions
} from "@/components/status/StatusTags";
import { formatDate, formatDateTime } from "@/utils/format";
import type { ButlerServiceRecord, ButlerSummary, HotelSummary } from "@/types/domain";

type ServiceFilterValues = {
  hotelId?: string;
  butlerId?: string;
  assignmentStatus?: string;
  pickupType?: string;
  dateRange?: [Dayjs, Dayjs];
};

export function FinanceServicesTab({
  hotels,
  butlers,
  request
}: {
  hotels: HotelSummary[];
  butlers: ButlerSummary[];
  request: <T>(url: string, init?: RequestInit) => Promise<T>;
}) {
  const { message } = App.useApp();
  const [form] = Form.useForm<ServiceFilterValues>();
  const [services, setServices] = useState<ButlerServiceRecord[]>([]);
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

  async function loadServices(
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

      const keys: Array<keyof ServiceFilterValues> = [
        "hotelId",
        "butlerId",
        "assignmentStatus",
        "pickupType"
      ];
      for (const key of keys) {
        const value = filters[key];
        if (value) {
          params.set(key, String(value));
        }
      }

      appendDateRange(params, filters.dateRange, "startDate", "endDate");

      const data = await request<{
        items: ButlerServiceRecord[];
        pagination: { page: number; pageSize: number; total: number };
      }>(`/api/finance/butler-services?${params.toString()}`);

      setServices(data.items);
      setPagination(data.pagination);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "加载管家服务明细失败");
    } finally {
      setLoading(false);
    }
  }

  function handleExport() {
    const filters = form.getFieldsValue();
    const params = new URLSearchParams();
    const keys: Array<keyof ServiceFilterValues> = [
      "hotelId",
      "butlerId",
      "assignmentStatus",
      "pickupType"
    ];
    for (const key of keys) {
      const value = filters[key];
      if (value) {
        params.set(key, String(value));
      }
    }
    appendDateRange(params, filters.dateRange, "startDate", "endDate");

    window.open(`/api/export/butler-services?${params.toString()}`, "_blank");
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadServices(1, 10);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Form
        form={form}
        layout="inline"
        onFinish={() => loadServices(1, pagination.pageSize)}
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
        <Form.Item name="assignmentStatus">
          <Select
            allowClear
            style={{ width: 140 }}
            placeholder="分配状态"
            options={assignmentStatusOptions}
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
          <DatePicker.RangePicker placeholder={["服务开始", "服务结束"]} />
        </Form.Item>
        <Button type="primary" icon={<SearchOutlined />} htmlType="submit">
          搜索
        </Button>
        <Button
          icon={<ReloadOutlined />}
          onClick={() => {
            form.resetFields();
            loadServices(1, pagination.pageSize, {});
          }}
        >
          重置
        </Button>
        <Button icon={<DownloadOutlined />} onClick={handleExport}>
          导出
        </Button>
      </Form>

      <SortableTable<ButlerServiceRecord>
        rowKey="id"
        loading={loading}
        dataSource={services}
        scroll={{ x: 2200 }}
        columns={[
          { title: "管家姓名", dataIndex: "butlerName", key: "butlerName", width: 120 },
          { title: "手机号", dataIndex: "butlerPhone", key: "butlerPhone", width: 140 },
          { title: "酒店", dataIndex: "hotelName", key: "hotelName", width: 180 },
          { title: "客人姓名", dataIndex: "guestName", key: "guestName", width: 120 },
          { title: "入住人数", dataIndex: "guestCount", key: "guestCount", width: 100 },
          {
            title: "入住日期",
            dataIndex: "checkInDate",
            key: "checkInDate",
            width: 140,
            render: (value: string) => formatDate(value)
          },
          {
            title: "接站类型",
            dataIndex: "pickupType",
            key: "pickupType",
            width: 110,
            render: (value: string) => <PickupTypeTag value={value} />
          },
          {
            title: "到达时间",
            dataIndex: "arrivalTime",
            key: "arrivalTime",
            width: 160,
            render: (value: string) => formatDateTime(value)
          },
          {
            title: "分配状态",
            dataIndex: "assignmentStatus",
            key: "assignmentStatus",
            width: 120,
            render: (value: string) => <AssignmentStatusTag value={value} />
          },
          {
            title: "确认时间",
            dataIndex: "confirmedAt",
            key: "confirmedAt",
            width: 160,
            render: (value: string) => formatDateTime(value)
          },
          {
            title: "接客时间",
            dataIndex: "pickedGuestAt",
            key: "pickedGuestAt",
            width: 160,
            render: (value: string) => formatDateTime(value)
          },
          {
            title: "服务开始时间",
            dataIndex: "serviceStartedAt",
            key: "serviceStartedAt",
            width: 160,
            render: (value: string) => formatDateTime(value)
          },
          {
            title: "服务完成时间",
            dataIndex: "completedAt",
            key: "completedAt",
            width: 160,
            render: (value: string) => formatDateTime(value)
          },
          {
            title: "服务时长",
            dataIndex: "serviceDuration",
            key: "serviceDuration",
            width: 120,
            render: (value: string) => value || "-"
          },
          {
            title: "是否拒单",
            dataIndex: "isRejected",
            key: "isRejected",
            width: 90,
            render: (value: boolean) => (value ? <Tag color="error">是</Tag> : <Tag color="success">否</Tag>)
          },
          {
            title: "是否完成",
            dataIndex: "isCompleted",
            key: "isCompleted",
            width: 90,
            render: (value: boolean) => (value ? <Tag color="success">是</Tag> : <Tag>否</Tag>)
          },
          { title: "综合评分", dataIndex: "overallScore", key: "overallScore", width: 90 }
        ]}
        pagination={{
          current: pagination.page,
          pageSize: pagination.pageSize,
          total: pagination.total,
          onChange: (page, pageSize) => loadServices(page, pageSize)
        }}
      />
    </Space>
  );
}
