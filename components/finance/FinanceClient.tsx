"use client";

import {
  DownloadOutlined,
  ReloadOutlined,
  SearchOutlined
} from "@ant-design/icons";
import {
  App,
  Button,
  DatePicker,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Tabs,
  Tag,
  Typography
} from "antd";
import type { Dayjs } from "dayjs";
import { useEffect, useState } from "react";
import { SortableTable } from "@/components/tables/SortableTable";
import {
  assignmentStatusOptions,
  orderStatusOptions,
  AssignmentStatusTag,
  OrderStatusTag,
  PickupTypeTag
} from "@/components/status/StatusTags";
import type {
  ButlerServiceRecord,
  ButlerStatisticsRecord,
  ButlerSummary,
  FinanceOrderRecord,
  HotelStatisticRecord,
  HotelSummary
} from "@/types/domain";
import { formatDate, formatDateTime } from "@/utils/format";

type ApiResult<T> =
  | { success: true; data: T; message: string }
  | { success: false; error: { code: string; message: string } };

type PageResult<T> = {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
};

type SettlementValues = {
  settlementStatus: "unsettled" | "settled";
  settlementRemark?: string;
};

type OrderFilterValues = {
  hotelId?: string;
  orderStatus?: string;
  pickupType?: string;
  settlementStatus?: string;
  keyword?: string;
  checkInRange?: [Dayjs, Dayjs];
  arrivalRange?: [Dayjs, Dayjs];
};

type ServiceFilterValues = {
  hotelId?: string;
  butlerId?: string;
  assignmentStatus?: string;
  pickupType?: string;
  dateRange?: [Dayjs, Dayjs];
};

type HotelFilterValues = {
  hotelId?: string;
  pickupType?: string;
  dateRange?: [Dayjs, Dayjs];
};

type ButlerFilterValues = {
  hotelId?: string;
  butlerId?: string;
  dateRange?: [Dayjs, Dayjs];
};

function SettlementEditorModal({
  target,
  onCancel,
  onSubmit
}: {
  target: FinanceOrderRecord | null;
  onCancel: () => void;
  onSubmit: (values: SettlementValues) => Promise<void>;
}) {
  return (
    <Modal
      open={Boolean(target)}
      title={
        <span>
          <i
            className="fa-solid fa-file-invoice-dollar"
            style={{ color: "var(--primary)", marginRight: 8 }}
          />
          {`结算维护${target ? ` - ${target.orderNo}` : ""}`}
        </span>
      }
      width={520}
      destroyOnHidden
      footer={null}
      onCancel={onCancel}
    >
      <Form<SettlementValues>
        key={target?.id ?? "empty"}
        layout="vertical"
        initialValues={{
          settlementStatus: (target?.settlementStatus as SettlementValues["settlementStatus"]) ?? "unsettled",
          settlementRemark: target?.settlementRemark ?? ""
        }}
        onFinish={onSubmit}
      >
        <Form.Item
          name="settlementStatus"
          label="结算状态"
          rules={[{ required: true, message: "请选择结算状态" }]}
        >
          <Select
            options={[
              { label: "未结算", value: "unsettled" },
              { label: "已结算", value: "settled" }
            ]}
          />
        </Form.Item>
        <Form.Item name="settlementRemark" label="结算备注">
          <Input.TextArea rows={4} maxLength={500} />
        </Form.Item>
        <Form.Item style={{ marginBottom: 0 }}>
          <Space style={{ width: "100%", justifyContent: "flex-end" }}>
            <Button onClick={onCancel}>取消</Button>
            <Button type="primary" htmlType="submit">
              保存
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
}

export function FinanceClient() {
  const { message } = App.useApp();
  const [currentUser, setCurrentUser] = useState<{ roleCode: string } | null>(null);
  const [orders, setOrders] = useState<FinanceOrderRecord[]>([]);
  const [services, setServices] = useState<ButlerServiceRecord[]>([]);
  const [hotelStats, setHotelStats] = useState<HotelStatisticRecord[]>([]);
  const [butlerStats, setButlerStats] = useState<ButlerStatisticsRecord[]>([]);
  const [hotels, setHotels] = useState<HotelSummary[]>([]);
  const [butlers, setButlers] = useState<ButlerSummary[]>([]);
  const [orderFilters, setOrderFilters] = useState<OrderFilterValues>({});
  const [serviceFilters, setServiceFilters] = useState<ServiceFilterValues>({});
  const [hotelFilters, setHotelFilters] = useState<HotelFilterValues>({});
  const [butlerFilters, setButlerFilters] = useState<ButlerFilterValues>({});
  const [orderResetKey, setOrderResetKey] = useState(0);
  const [serviceResetKey, setServiceResetKey] = useState(0);
  const [hotelResetKey, setHotelResetKey] = useState(0);
  const [butlerResetKey, setButlerResetKey] = useState(0);
  const [orderPagination, setOrderPagination] = useState({ page: 1, pageSize: 10, total: 0 });
  const [servicePagination, setServicePagination] = useState({ page: 1, pageSize: 10, total: 0 });
  const [hotelPagination, setHotelPagination] = useState({ page: 1, pageSize: 10, total: 0 });
  const [butlerPagination, setButlerPagination] = useState({ page: 1, pageSize: 10, total: 0 });
  const [loading, setLoading] = useState(false);
  const [settlementModal, setSettlementModal] = useState<FinanceOrderRecord | null>(null);
  const [clientReady, setClientReady] = useState(false);

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

  async function loadBootstrap() {
    const me = await request<{ user: { roleCode: string } }>("/api/auth/me");
    setCurrentUser(me.user);

    const hotelData = await request<{ items: HotelSummary[] }>("/api/hotels");
    setHotels(hotelData.items);

    if (["admin", "dispatcher", "finance"].includes(me.user.roleCode)) {
      const butlerData = await request<{ items: ButlerSummary[] }>("/api/butlers");
      setButlers(butlerData.items);
    }

    return me.user;
  }

  async function loadOrders(
    page = orderPagination.page,
    pageSize = orderPagination.pageSize,
    nextFilters?: OrderFilterValues
  ) {
    setLoading(true);
    try {
      const values = nextFilters ?? orderFilters;
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize)
      });

      for (const key of ["hotelId", "orderStatus", "pickupType", "settlementStatus", "keyword"] as const) {
        const value = values[key];
        if (value) {
          params.set(key, value);
        }
      }

      appendDateRange(params, values.checkInRange, "startDate", "endDate");
      appendDateRange(params, values.arrivalRange, "arrivalStartTime", "arrivalEndTime");

      const data = await request<PageResult<FinanceOrderRecord>>(
        `/api/finance/orders?${params.toString()}`
      );
      setOrders(data.items);
      setOrderPagination(data.pagination);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "加载订单明细失败");
    } finally {
      setLoading(false);
    }
  }

  async function loadServices(
    page = servicePagination.page,
    pageSize = servicePagination.pageSize,
    nextFilters?: ServiceFilterValues
  ) {
    setLoading(true);
    try {
      const values = nextFilters ?? serviceFilters;
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize)
      });

      for (const key of ["hotelId", "butlerId", "assignmentStatus", "pickupType"] as const) {
        const value = values[key];
        if (value) {
          params.set(key, value);
        }
      }

      appendDateRange(params, values.dateRange, "startDate", "endDate");

      const data = await request<PageResult<ButlerServiceRecord>>(
        `/api/finance/butler-services?${params.toString()}`
      );
      setServices(data.items);
      setServicePagination(data.pagination);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "加载管家服务明细失败");
    } finally {
      setLoading(false);
    }
  }

  async function loadHotels(
    page = hotelPagination.page,
    pageSize = hotelPagination.pageSize,
    nextFilters?: HotelFilterValues
  ) {
    setLoading(true);
    try {
      const values = nextFilters ?? hotelFilters;
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize)
      });

      for (const key of ["hotelId", "pickupType"] as const) {
        const value = values[key];
        if (value) {
          params.set(key, value);
        }
      }

      appendDateRange(params, values.dateRange, "startDate", "endDate");

      const data = await request<PageResult<HotelStatisticRecord>>(
        `/api/finance/hotel-statistics?${params.toString()}`
      );
      setHotelStats(data.items);
      setHotelPagination(data.pagination);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "加载酒店统计失败");
    } finally {
      setLoading(false);
    }
  }

  async function loadButlerStats(
    page = butlerPagination.page,
    pageSize = butlerPagination.pageSize,
    nextFilters?: ButlerFilterValues
  ) {
    setLoading(true);
    try {
      const values = nextFilters ?? butlerFilters;
      const params = new URLSearchParams();

      if (values.butlerId) {
        params.set("butlerId", values.butlerId);
      }
      if (values.hotelId) {
        params.set("hotelId", values.hotelId);
      }
      if (values.dateRange?.[0]) {
        params.set("range", "custom");
        params.set("startTime", values.dateRange[0].toDate().toISOString());
      }
      if (values.dateRange?.[1]) {
        params.set("range", "custom");
        params.set("endTime", values.dateRange[1].toDate().toISOString());
      }

      const data = await request<{ items: ButlerStatisticsRecord[] }>(
        `/api/statistics/butlers?${params.toString()}`
      );
      const total = data.items.length;
      const start = (page - 1) * pageSize;
      setButlerStats(data.items.slice(start, start + pageSize));
      setButlerPagination({ page, pageSize, total });
    } catch (error) {
      message.error(error instanceof Error ? error.message : "加载管家统计失败");
    } finally {
      setLoading(false);
    }
  }

  function openExport(path: string, params: URLSearchParams) {
    window.open(`${path}?${params.toString()}`, "_blank");
  }

  function exportOrders(values: OrderFilterValues) {
    const params = new URLSearchParams();
    for (const key of ["hotelId", "orderStatus", "pickupType", "settlementStatus", "keyword"] as const) {
      const value = values[key];
      if (value) {
        params.set(key, value);
      }
    }
    appendDateRange(params, values.checkInRange, "startDate", "endDate");
    appendDateRange(params, values.arrivalRange, "arrivalStartTime", "arrivalEndTime");
    openExport("/api/export/orders", params);
  }

  function exportServices(values: ServiceFilterValues) {
    const params = new URLSearchParams();
    for (const key of ["hotelId", "butlerId", "assignmentStatus", "pickupType"] as const) {
      const value = values[key];
      if (value) {
        params.set(key, value);
      }
    }
    appendDateRange(params, values.dateRange, "startDate", "endDate");
    openExport("/api/export/butler-services", params);
  }

  function exportHotels(values: HotelFilterValues) {
    const params = new URLSearchParams();
    for (const key of ["hotelId", "pickupType"] as const) {
      const value = values[key];
      if (value) {
        params.set(key, value);
      }
    }
    appendDateRange(params, values.dateRange, "startDate", "endDate");
    openExport("/api/export/hotel-statistics", params);
  }

  function exportButlers(values: ButlerFilterValues) {
    const params = new URLSearchParams();
    if (values.butlerId) {
      params.set("butlerId", values.butlerId);
    }
    if (values.hotelId) {
      params.set("hotelId", values.hotelId);
    }
    appendDateRange(params, values.dateRange, "startDate", "endDate");
    openExport("/api/export/butler-statistics", params);
  }

  async function submitSettlement(values: SettlementValues) {
    if (!settlementModal) {
      return;
    }

    try {
      await request(`/api/finance/orders/${settlementModal.id}/settlement`, {
        method: "POST",
        body: JSON.stringify(values)
      });
      message.success("结算状态已更新");
      setSettlementModal(null);
      await loadOrders();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "更新结算状态失败");
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setClientReady(true);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadBootstrap()
      .then(async (user) => {
        const tasks: Array<Promise<void>> = [loadOrders(1, 10, {}), loadHotels(1, 10, {})];

        if (["admin", "dispatcher", "finance"].includes(user.roleCode)) {
          tasks.push(loadServices(1, 10, {}), loadButlerStats(1, 10, {}));
        }

        await Promise.all(tasks);
      })
      .catch((error) =>
        message.error(error instanceof Error ? error.message : "初始化失败")
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canViewGlobalButlerReports = ["admin", "dispatcher", "finance"].includes(
    currentUser?.roleCode ?? ""
  );

  const financeTabItems = [
    {
      key: "orders",
      label: "订单明细",
      children: (
        <Space orientation="vertical" size={16} style={{ width: "100%" }}>
          <Form
            key={orderResetKey}
            layout="inline"
            initialValues={orderFilters}
            onValuesChange={(_, allValues: OrderFilterValues) => setOrderFilters(allValues)}
          >
            <Form.Item name="hotelId">
              <Select
                allowClear
                style={{ width: 180 }}
                placeholder="酒店"
                options={hotels.map((hotel) => ({ label: hotel.name, value: hotel.id }))}
              />
            </Form.Item>
            <Form.Item name="orderStatus">
              <Select
                allowClear
                style={{ width: 160 }}
                placeholder="订单状态"
                options={orderStatusOptions}
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
              <DatePicker.RangePicker />
            </Form.Item>
            <Form.Item name="arrivalRange">
              <DatePicker.RangePicker showTime />
            </Form.Item>
            <Form.Item name="keyword">
              <Input allowClear placeholder="订单/客人/手机号/航班号" style={{ width: 220 }} />
            </Form.Item>
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={() => loadOrders(1, orderPagination.pageSize, orderFilters)}
            >
              搜索
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                setOrderFilters({});
                setOrderResetKey((value) => value + 1);
                loadOrders(1, orderPagination.pageSize, {});
              }}
            >
              重置
            </Button>
            <Button icon={<DownloadOutlined />} onClick={() => exportOrders(orderFilters)}>
              导出
            </Button>
          </Form>

          <SortableTable<FinanceOrderRecord>
            rowKey="id"
            loading={loading}
            dataSource={orders}
            scroll={{ x: 1600 }}
            columns={[
              { title: "订单编号", dataIndex: "orderNo", key: "orderNo", width: 180 },
              { title: "酒店", dataIndex: "hotelName", key: "hotelName", width: 180 },
              { title: "客人姓名", dataIndex: "guestName", key: "guestName", width: 120 },
              { title: "客人手机号", dataIndex: "guestPhone", key: "guestPhone", width: 140 },
              { title: "入住人数", dataIndex: "guestCount", key: "guestCount", width: 100 },
              {
                title: "入住日期",
                dataIndex: "checkInDate",
                key: "checkInDate",
                width: 140,
                render: (value: string) => formatDate(value)
              },
              {
                title: "离店日期",
                dataIndex: "checkOutDate",
                key: "checkOutDate",
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
                title: "服务完成时间",
                dataIndex: "serviceCompletedAt",
                key: "serviceCompletedAt",
                width: 160,
                render: (value: string) => formatDateTime(value)
              },
              { title: "前台评分", dataIndex: "frontdeskAverageScore", key: "frontdeskAverageScore", width: 100 },
              { title: "调配员评分", dataIndex: "dispatcherAverageScore", key: "dispatcherAverageScore", width: 110 },
              {
                title: "结算状态",
                dataIndex: "settlementStatus",
                key: "settlementStatus",
                width: 110,
                render: (value: string) =>
                  value === "settled" ? <Tag color="success">已结算</Tag> : <Tag color="warning">未结算</Tag>
              },
              { title: "结算备注", dataIndex: "settlementRemark", key: "settlementRemark", width: 180 },
              {
                title: "创建时间",
                dataIndex: "createdAt",
                key: "createdAt",
                width: 160,
                render: (value: string) => formatDateTime(value)
              },
              {
                title: "操作",
                key: "action",
                width: 120,
                fixed: "right",
                render: (_, record) => (
                  <Button size="small" onClick={() => setSettlementModal(record)}>
                    结算维护
                  </Button>
                )
              }
            ]}
            pagination={{
              current: orderPagination.page,
              pageSize: orderPagination.pageSize,
              total: orderPagination.total,
              onChange: (page, pageSize) => loadOrders(page, pageSize)
            }}
          />
        </Space>
      )
    },
    {
      key: "hotels",
      label: "酒店统计",
      children: (
        <Space orientation="vertical" size={16} style={{ width: "100%" }}>
          <Form
            key={hotelResetKey}
            layout="inline"
            initialValues={hotelFilters}
            onValuesChange={(_, allValues: HotelFilterValues) => setHotelFilters(allValues)}
          >
            <Form.Item name="hotelId">
              <Select
                allowClear
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
              <DatePicker.RangePicker />
            </Form.Item>
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={() => loadHotels(1, hotelPagination.pageSize, hotelFilters)}
            >
              搜索
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                setHotelFilters({});
                setHotelResetKey((value) => value + 1);
                loadHotels(1, hotelPagination.pageSize, {});
              }}
            >
              重置
            </Button>
            <Button icon={<DownloadOutlined />} onClick={() => exportHotels(hotelFilters)}>
              导出
            </Button>
          </Form>
          <SortableTable<HotelStatisticRecord>
            rowKey="hotelId"
            loading={loading}
            dataSource={hotelStats}
            columns={[
              { title: "酒店名称", dataIndex: "hotelName", key: "hotelName" },
              { title: "订单总数", dataIndex: "orderCount", key: "orderCount" },
              { title: "已完成订单数", dataIndex: "completedOrderCount", key: "completedOrderCount" },
              { title: "服务中订单数", dataIndex: "inServiceOrderCount", key: "inServiceOrderCount" },
              { title: "待分配订单数", dataIndex: "pendingDispatchOrderCount", key: "pendingDispatchOrderCount" },
              { title: "待评价订单数", dataIndex: "pendingReviewOrderCount", key: "pendingReviewOrderCount" },
              { title: "已取消订单数", dataIndex: "cancelledOrderCount", key: "cancelledOrderCount" },
              { title: "入住人数合计", dataIndex: "guestCount", key: "guestCount" },
              { title: "接飞机订单数", dataIndex: "airportOrderCount", key: "airportOrderCount" },
              { title: "接火车订单数", dataIndex: "trainOrderCount", key: "trainOrderCount" },
              { title: "平均评分", dataIndex: "averageScore", key: "averageScore" }
            ]}
            pagination={{
              current: hotelPagination.page,
              pageSize: hotelPagination.pageSize,
              total: hotelPagination.total,
              onChange: (page, pageSize) => loadHotels(page, pageSize)
            }}
          />
        </Space>
      )
    }
  ];

  if (canViewGlobalButlerReports) {
    financeTabItems.splice(
      1,
      0,
      {
        key: "services",
        label: "管家服务明细",
        children: (
          <Space orientation="vertical" size={16} style={{ width: "100%" }}>
            <Form
              key={serviceResetKey}
              layout="inline"
              initialValues={serviceFilters}
              onValuesChange={(_, allValues: ServiceFilterValues) => setServiceFilters(allValues)}
            >
              <Form.Item name="hotelId">
                <Select
                  allowClear
                  style={{ width: 180 }}
                  placeholder="酒店"
                  options={hotels.map((hotel) => ({ label: hotel.name, value: hotel.id }))}
                />
              </Form.Item>
              <Form.Item name="butlerId">
                <Select
                  allowClear
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
              <Form.Item name="dateRange">
                <DatePicker.RangePicker />
              </Form.Item>
              <Button
                type="primary"
                icon={<SearchOutlined />}
                onClick={() => loadServices(1, servicePagination.pageSize, serviceFilters)}
              >
                搜索
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  setServiceFilters({});
                  setServiceResetKey((value) => value + 1);
                  loadServices(1, servicePagination.pageSize, {});
                }}
              >
                重置
              </Button>
              <Button icon={<DownloadOutlined />} onClick={() => exportServices(serviceFilters)}>
                导出
              </Button>
            </Form>
            <SortableTable<ButlerServiceRecord>
              rowKey="id"
              loading={loading}
              dataSource={services}
              scroll={{ x: 1400 }}
              columns={[
                { title: "管家姓名", dataIndex: "butlerName", key: "butlerName", width: 120 },
                { title: "手机号", dataIndex: "butlerPhone", key: "butlerPhone", width: 140 },
                { title: "订单编号", dataIndex: "orderNo", key: "orderNo", width: 180 },
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
                { title: "综合评分", dataIndex: "overallScore", key: "overallScore", width: 90 },
                {
                  title: "完成时间",
                  dataIndex: "completedAt",
                  key: "completedAt",
                  width: 160,
                  render: (value: string) => formatDateTime(value)
                }
              ]}
              pagination={{
                current: servicePagination.page,
                pageSize: servicePagination.pageSize,
                total: servicePagination.total,
                onChange: (page, pageSize) => loadServices(page, pageSize)
              }}
            />
          </Space>
        )
      },
      {
        key: "butlers",
        label: "管家统计",
        children: (
          <Space orientation="vertical" size={16} style={{ width: "100%" }}>
            <Form
              key={butlerResetKey}
              layout="inline"
              initialValues={butlerFilters}
              onValuesChange={(_, allValues: ButlerFilterValues) => setButlerFilters(allValues)}
            >
              <Form.Item name="hotelId">
                <Select
                  allowClear
                  style={{ width: 180 }}
                  placeholder="酒店"
                  options={hotels.map((hotel) => ({ label: hotel.name, value: hotel.id }))}
                />
              </Form.Item>
              <Form.Item name="butlerId">
                <Select
                  allowClear
                  style={{ width: 180 }}
                  placeholder="管家"
                  options={butlers.map((butler) => ({ label: butler.name, value: butler.id }))}
                />
              </Form.Item>
              <Form.Item name="dateRange">
                <DatePicker.RangePicker />
              </Form.Item>
              <Button
                type="primary"
                icon={<SearchOutlined />}
                onClick={() => loadButlerStats(1, butlerPagination.pageSize, butlerFilters)}
              >
                搜索
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  setButlerFilters({});
                  setButlerResetKey((value) => value + 1);
                  loadButlerStats(1, butlerPagination.pageSize, {});
                }}
              >
                重置
              </Button>
              <Button icon={<DownloadOutlined />} onClick={() => exportButlers(butlerFilters)}>
                导出
              </Button>
            </Form>
            <SortableTable<ButlerStatisticsRecord>
              rowKey="butlerId"
              loading={loading}
              dataSource={butlerStats}
              scroll={{ x: 1200 }}
              columns={[
                { title: "管家姓名", dataIndex: "name", key: "name" },
                { title: "手机号", dataIndex: "phone", key: "phone" },
                { title: "当前状态", dataIndex: "status", key: "status" },
                { title: "接单数", dataIndex: "orderCount", key: "orderCount" },
                { title: "完成单数", dataIndex: "completedOrderCount", key: "completedOrderCount" },
                { title: "服务客人数", dataIndex: "guestCount", key: "guestCount" },
                { title: "拒单次数", dataIndex: "rejectCount", key: "rejectCount" },
                { title: "拒单率", dataIndex: "rejectRate", key: "rejectRate" },
                { title: "平均评分", dataIndex: "averageScore", key: "averageScore" },
                { title: "好评率", dataIndex: "goodReviewRate", key: "goodReviewRate" },
                { title: "请假天数", dataIndex: "leaveDays", key: "leaveDays" }
              ]}
              pagination={{
                current: butlerPagination.page,
                pageSize: butlerPagination.pageSize,
                total: butlerPagination.total,
                onChange: (page, pageSize) => loadButlerStats(page, pageSize)
              }}
            />
          </Space>
        )
      }
    );
  }

  financeTabItems.push({
    key: "settlement",
    label: "结算管理",
    children: (
      <Typography.Text type="secondary">
        结算维护已集成在“订单明细”操作列，可直接修改订单结算状态和备注。
      </Typography.Text>
    )
  });

  return (
    <section className="page-panel">
      <Space orientation="vertical" size={16} style={{ width: "100%" }}>
        <Space style={{ justifyContent: "space-between", width: "100%" }}>
          <Typography.Title level={3} style={{ margin: 0 }}>
            财务统计
          </Typography.Title>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={() => window.open("/api/export/finance", "_blank")}
          >
            导出财务总表
          </Button>
        </Space>

        <Tabs items={financeTabItems} />
      </Space>

      {clientReady ? (
        <SettlementEditorModal
          target={settlementModal}
          onCancel={() => setSettlementModal(null)}
          onSubmit={submitSettlement}
        />
      ) : null}
    </section>
  );
}
