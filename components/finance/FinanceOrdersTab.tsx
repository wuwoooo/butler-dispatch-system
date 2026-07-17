"use client";

import { useEffect, useState } from "react";
import { Form, Select, DatePicker, Input, Button, Space, Tag, App, Typography } from "antd";
import { SearchOutlined, ReloadOutlined, DownloadOutlined } from "@ant-design/icons";
import type { Dayjs } from "dayjs";
import { SortableTable } from "@/components/tables/SortableTable";
import { OrderStatusTag, PickupTypeTag } from "@/components/status/StatusTags";
import { formatDateTime } from "@/utils/format";
import type { FinanceOrderRecord, HotelSummary } from "@/types/domain";

type OrderFilterValues = {
  butlerId?: string;
  hotelId?: string;
  orderStatus?: string;
  pickupType?: string;
  settlementStatus?: string;
  keyword?: string;
  checkInRange?: [Dayjs, Dayjs];
  arrivalRange?: [Dayjs, Dayjs];
};

export function FinanceOrdersTab({
  hotels,
  butlers,
  currentUser,
  request,
  onButlerChange
}: {
  hotels: HotelSummary[];
  butlers: Array<{ id: string; name: string }>;
  currentUser: { roleCode: string } | null;
  request: <T>(url: string, init?: RequestInit) => Promise<T>;
  onButlerChange?: (butlerId: string | undefined) => void;
}) {
  const { message } = App.useApp();
  const [form] = Form.useForm<OrderFilterValues>();
  const [orders, setOrders] = useState<FinanceOrderRecord[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0 });
  const [loading, setLoading] = useState(false);
  const canManageSettlement = ["admin", "finance"].includes(currentUser?.roleCode ?? "");

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

  async function loadOrders(
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

      const keys: Array<keyof OrderFilterValues> = [
        "butlerId",
        "hotelId",
        "orderStatus",
        "pickupType",
        "settlementStatus",
        "keyword"
      ];
      for (const key of keys) {
        const value = filters[key];
        if (value) {
          params.set(key, String(value));
        }
      }

      appendDateRange(params, filters.checkInRange, "startDate", "endDate");
      appendDateRange(params, filters.arrivalRange, "arrivalStartTime", "arrivalEndTime");

      const data = await request<{
        items: FinanceOrderRecord[];
        pagination: { page: number; pageSize: number; total: number };
      }>(`/api/finance/orders?${params.toString()}`);

      setOrders(data.items);
      setPagination(data.pagination);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "加载订单明细失败");
    } finally {
      setLoading(false);
    }
  }

  function handleExport() {
    const filters = form.getFieldsValue();
    const params = new URLSearchParams();
    const keys: Array<keyof OrderFilterValues> = [
      "butlerId",
      "hotelId",
      "orderStatus",
      "pickupType",
      "settlementStatus",
      "keyword"
    ];
    for (const key of keys) {
      const value = filters[key];
      if (value) {
        params.set(key, String(value));
      }
    }
    appendDateRange(params, filters.checkInRange, "startDate", "endDate");
    appendDateRange(params, filters.arrivalRange, "arrivalStartTime", "arrivalEndTime");

    window.open(`/api/export/orders?${params.toString()}`, "_blank");
  }

  async function handleDirectSettlement(orderId: string) {
    try {
      await request(`/api/finance/orders/${orderId}/settlement`, {
        method: "POST",
        body: JSON.stringify({
          settlementStatus: "settled",
          settlementRemark: "一键快速结算"
        })
      });
      message.success("结算成功");
      await loadOrders();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "结算失败");
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadOrders(1, 10);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography.Text type="secondary">
          💡 提示：点击右侧操作列的“结算”按钮可以直接将未结算的订单修改为已结算（仅管理员和财务角色支持）。
        </Typography.Text>
      </div>

      <Form
        form={form}
        layout="inline"
        onFinish={() => loadOrders(1, pagination.pageSize)}
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
            onChange={(val) => onButlerChange?.(val)}
          />
        </Form.Item>
        <Form.Item name="orderStatus">
          <Select
            allowClear
            style={{ width: 160 }}
            placeholder="订单状态"
            options={[
              { label: "待评价", value: "pending_review" },
              { label: "已评价", value: "reviewed" },
              { label: "已完成", value: "completed" }
            ]}
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
        <Form.Item name="settlementStatus">
          <Select
            allowClear
            style={{ width: 120 }}
            placeholder="结算状态"
            options={[
              { label: "未结算", value: "unsettled" },
              { label: "已结算", value: "settled" }
            ]}
          />
        </Form.Item>
        <Form.Item name="checkInRange">
          <DatePicker.RangePicker placeholder={["入住开始", "入住结束"]} />
        </Form.Item>
        <Form.Item name="arrivalRange">
          <DatePicker.RangePicker showTime placeholder={["到达开始", "到达结束"]} />
        </Form.Item>
        <Form.Item name="keyword">
          <Input allowClear placeholder="订单/客人/手机号/航班号" style={{ width: 220 }} />
        </Form.Item>
        <Button type="primary" icon={<SearchOutlined />} htmlType="submit">
          搜索
        </Button>
        <Button
          icon={<ReloadOutlined />}
          onClick={() => {
            form.resetFields();
            onButlerChange?.(undefined);
            loadOrders(1, pagination.pageSize, {});
          }}
        >
          重置
        </Button>
        <Button icon={<DownloadOutlined />} onClick={handleExport}>
          导出
        </Button>
      </Form>

      <SortableTable<FinanceOrderRecord>
        rowKey="id"
        loading={loading}
        dataSource={orders}
        scroll={{ x: 1900 }}
        columns={[
          {
            title: "结算状态",
            dataIndex: "settlementStatus",
            key: "settlementStatus",
            width: 110,
            render: (value: string) =>
              value === "settled" ? <Tag color="success">已结算</Tag> : <Tag color="warning">未结算</Tag>
          },
          { title: "酒店", dataIndex: "hotelName", key: "hotelName", width: 180 },
          { title: "客人姓名", dataIndex: "guestName", key: "guestName", width: 120 },
          { title: "客人手机号", dataIndex: "guestPhone", key: "guestPhone", width: 140 },
          { title: "接送/入住人数", dataIndex: "guestCount", key: "guestCount", width: 110 },
          {
            title: "收费金额",
            dataIndex: "settlementAmount",
            key: "settlementAmount",
            width: 120,
            render: (value: string | number | null) =>
              value === null || value === undefined ? "-" : `¥${Number(value).toFixed(2)}`
          },
          {
            title: "服务开始",
            dataIndex: "serviceStartAt",
            key: "serviceStartAt",
            width: 170,
            render: (value: string) => formatDateTime(value)
          },
          {
            title: "服务结束",
            dataIndex: "serviceEndAt",
            key: "serviceEndAt",
            width: 170,
            render: (value: string) => formatDateTime(value)
          },
          {
            title: "服务类型",
            dataIndex: "pickupType",
            key: "pickupType",
            width: 130,
            render: (value: string, record: FinanceOrderRecord) =>
              record.serviceMode === "transport" ? (
                <Typography.Text>{formatTransportType(value, record.transportDirection)}</Typography.Text>
              ) : (
                <PickupTypeTag value={value} />
              )
          },
          { title: "到达地点", dataIndex: "arrivalStation", key: "arrivalStation", width: 160 },
          {
            title: "到达时间",
            dataIndex: "arrivalTime",
            key: "arrivalTime",
            width: 160,
            render: (value: string) => formatDateTime(value)
          },
          {
            title: "服务管家",
            dataIndex: "butlerNames",
            key: "butlerNames",
            width: 220,
            render: (value: string[]) => value.join("、") || "-"
          },
          {
            title: "订单状态",
            dataIndex: "status",
            key: "status",
            width: 120,
            render: (value: string) => <OrderStatusTag value={value} />
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
            dataIndex: "serviceCompletedAt",
            key: "serviceCompletedAt",
            width: 160,
            render: (value: string) => formatDateTime(value)
          },
          {
            title: "服务时长",
            dataIndex: "serviceDuration",
            key: "serviceDuration",
            width: 130,
            render: (value: string) => value || "-"
          },
          { title: "前台评分", dataIndex: "frontdeskAverageScore", key: "frontdeskAverageScore", width: 100 },
          { title: "调配员评分", dataIndex: "dispatcherAverageScore", key: "dispatcherAverageScore", width: 110 },
          { title: "结算备注", dataIndex: "settlementRemark", key: "settlementRemark", width: 180 },
          {
            title: "创建时间",
            dataIndex: "createdAt",
            key: "createdAt",
            width: 160,
            render: (value: string) => formatDateTime(value)
          },
          ...(canManageSettlement
            ? [
                {
                  title: "操作",
                  key: "action",
                  width: 100,
                  fixed: "right" as const,
                  render: (_: unknown, record: FinanceOrderRecord) => {
                    if (record.settlementStatus === "unsettled") {
                      return (
                        <Button
                          size="small"
                          type="primary"
                          onClick={() => handleDirectSettlement(record.id)}
                        >
                          结算
                        </Button>
                      );
                    }
                    return null;
                  }
                }
              ]
            : [])
        ]}
        pagination={{
          current: pagination.page,
          pageSize: pagination.pageSize,
          total: pagination.total,
          onChange: (page, pageSize) => loadOrders(page, pageSize)
        }}
      />
    </Space>
  );
}

function formatTransportType(pickupType: string, direction?: string | null) {
  if (pickupType === "airport") return direction === "dropoff" ? "送机" : "接机";
  if (pickupType === "train") return direction === "dropoff" ? "送站" : "接站";
  return "-";
}
