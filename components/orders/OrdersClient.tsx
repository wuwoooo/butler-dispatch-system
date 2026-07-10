"use client";

import { PlusOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import {
  App,
  Button,
  DatePicker,
  Drawer,
  Form,
  Input,
  Select,
  Space,
  Typography,
  type TablePaginationConfig
} from "antd";
import { useEffect, useMemo, useState } from "react";
import type { Dayjs } from "dayjs";
import { OrderDetailView } from "@/components/orders/OrderDetailView";
import { OrderFormModal } from "@/components/orders/OrderFormModal";
import {
  OrderStatusTag,
  PickupTypeTag,
  orderStatusOptions,
  pickupTypeOptions
} from "@/components/status/StatusTags";
import type { HotelSummary, OrderAssignmentRecord, OrderRecord } from "@/types/domain";
import { formatDate, formatDateTime, maskPhone } from "@/utils/format";
import { SortableTable } from "@/components/tables/SortableTable";

type ApiResult<T> =
  | { success: true; data: T; message: string }
  | { success: false; error: { code: string; message: string } };

type CurrentUser = {
  id: string;
  roleCode: string;
  hotelId: string | null;
};

type OrderFilterValues = {
  hotelId?: string;
  status?: string;
  pickupType?: string;
  guestName?: string;
  orderNo?: string;
  checkInRange?: [Dayjs, Dayjs];
  arrivalRange?: [Dayjs, Dayjs];
};

export function OrdersClient() {
  const { message, modal } = App.useApp();
  const [form] = Form.useForm();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [hotels, setHotels] = useState<HotelSummary[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0
  });
  const [modalState, setModalState] = useState<{
    open: boolean;
    mode: "create" | "edit";
    order: OrderRecord | null;
  }>({ open: false, mode: "create", order: null });
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<OrderRecord | null>(null);

  const canCreate = currentUser?.roleCode === "admin" || currentUser?.roleCode === "hotel_frontdesk";

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
    const me = await request<{ user: CurrentUser }>("/api/auth/me");
    setCurrentUser(me.user);

    if (me.user.roleCode !== "butler") {
      const hotelData = await request<{ items: HotelSummary[] }>("/api/hotels");
      setHotels(hotelData.items);
    }
  }

  async function loadOrders(page = pagination.page, pageSize = pagination.pageSize) {
    setLoading(true);
    try {
      const values = form.getFieldsValue() as OrderFilterValues;
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize)
      });

      for (const key of ["hotelId", "status", "pickupType", "guestName", "orderNo"] as const) {
        const value = values[key];

        if (value) {
          params.set(key, value);
        }
      }

      if (values.checkInRange?.[0]) {
        params.set("checkInStart", values.checkInRange[0].toDate().toISOString());
      }
      if (values.checkInRange?.[1]) {
        params.set("checkInEnd", values.checkInRange[1].toDate().toISOString());
      }
      if (values.arrivalRange?.[0]) {
        params.set("arrivalStart", values.arrivalRange[0].toDate().toISOString());
      }
      if (values.arrivalRange?.[1]) {
        params.set("arrivalEnd", values.arrivalRange[1].toDate().toISOString());
      }

      const data = await request<{
        items: OrderRecord[];
        pagination: { page: number; pageSize: number; total: number };
      }>(`/api/orders?${params.toString()}`);

      setOrders(data.items);
      setPagination(data.pagination);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "加载订单失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadBootstrap()
      .then(() => loadOrders(1, 10))
      .catch((error) =>
        message.error(error instanceof Error ? error.message : "初始化失败")
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hotelOptions = useMemo(
    () => hotels.map((hotel) => ({ label: hotel.name, value: hotel.id })),
    [hotels]
  );

  async function handleSubmitOrder(values: Record<string, unknown>) {
    const editingOrder = modalState.mode === "edit" ? modalState.order : null;
    const url = editingOrder ? `/api/orders/${editingOrder.id}` : "/api/orders";
    const method = editingOrder ? "PUT" : "POST";

    try {
      await request(url, {
        method,
        body: JSON.stringify(values)
      });
      message.success(editingOrder ? "订单已更新" : "订单已创建");
      setModalState({ open: false, mode: "create", order: null });
      await loadOrders();
    } catch (error) {
      modal.error({
        title: editingOrder ? "更新订单失败" : "创建订单失败",
        content: error instanceof Error ? error.message : "保存订单失败"
      });
    }
  }

  async function openDetail(orderId: string) {
    try {
      const data = await request<OrderRecord>(`/api/orders/${orderId}`);
      setDetail(data);
      setDetailOpen(true);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "加载详情失败");
    }
  }

  async function completeAssignmentFromDetail(assignment: OrderAssignmentRecord) {
    if (!detail) {
      return;
    }

    modal.confirm({
      title: "确认该管家服务完成",
      content: "该操作只释放当前管家，不会强制完成同订单下其他管家的服务。",
      okText: "确认完成",
      cancelText: "取消",
      onOk: async () => {
        try {
          await request(`/api/orders/${detail.id}/assignments/${assignment.id}/complete`, {
            method: "POST",
            body: JSON.stringify({
              remark: "后台确认客人已离店，释放该管家"
            })
          });
          message.success("已确认该管家服务完成");
          await openDetail(detail.id);
          await loadOrders(pagination.page, pagination.pageSize);
        } catch (error) {
          message.error(error instanceof Error ? error.message : "操作失败");
        }
      }
    });
  }

  async function cancelAssignmentFromDetail(assignment: OrderAssignmentRecord) {
    if (!detail) {
      return;
    }

    modal.confirm({
      title: "取消派单",
      content: "取消后该管家不会再看到这次待接单任务；如果订单没有其他有效分配，会回到待分配并可重新派单。",
      okText: "确认取消",
      cancelText: "返回",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await request(`/api/orders/${detail.id}/assignments/${assignment.id}/cancel`, {
            method: "POST",
            body: JSON.stringify({
              remark: "后台取消待接单派单"
            })
          });
          message.success("派单已取消");
          await openDetail(detail.id);
          await loadOrders(pagination.page, pagination.pageSize);
        } catch (error) {
          message.error(error instanceof Error ? error.message : "取消派单失败");
        }
      }
    });
  }

  function getButlerNames(record: OrderRecord) {
    return (record.assignments || [])
      .filter((assignment) => !["reassigned", "cancelled"].includes(assignment.status))
      .map((assignment) => assignment.butler?.name)
      .filter(Boolean)
      .join("、") || "-";
  }

  return (
    <section className="page-panel">
      <Space orientation="vertical" size={16} style={{ width: "100%" }}>
        <Space style={{ justifyContent: "space-between", width: "100%" }}>
          <Typography.Title level={3} style={{ margin: 0 }}>
            订单管理
          </Typography.Title>
          {canCreate ? (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() =>
                setModalState({ open: true, mode: "create", order: null })
              }
            >
              新建订单
            </Button>
          ) : null}
        </Space>

        <Form form={form} layout="inline">
          <Form.Item name="hotelId">
            <Select
              allowClear
              placeholder="酒店"
              style={{ width: 180 }}
              options={hotelOptions}
            />
          </Form.Item>
          <Form.Item name="status">
            <Select
              allowClear
              placeholder="订单状态"
              style={{ width: 150 }}
              options={orderStatusOptions}
            />
          </Form.Item>
          <Form.Item name="pickupType">
            <Select
              allowClear
              placeholder="接站类型"
              style={{ width: 140 }}
              options={pickupTypeOptions}
            />
          </Form.Item>
          <Form.Item name="guestName">
            <Input placeholder="客人姓名" allowClear style={{ width: 140 }} />
          </Form.Item>
          <Form.Item name="orderNo">
            <Input placeholder="订单编号" allowClear style={{ width: 160 }} />
          </Form.Item>
          <Form.Item name="checkInRange">
            <DatePicker.RangePicker placeholder={["入住开始", "入住结束"]} />
          </Form.Item>
          <Form.Item name="arrivalRange">
            <DatePicker.RangePicker
              showTime
              placeholder={["到达开始", "到达结束"]}
            />
          </Form.Item>
          <Button
            icon={<SearchOutlined />}
            type="primary"
            onClick={() => loadOrders(1, pagination.pageSize)}
          >
            搜索
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              form.resetFields();
              loadOrders(1, pagination.pageSize);
            }}
          >
            重置
          </Button>
        </Form>

        <SortableTable<OrderRecord>
          rowKey="id"
          loading={loading}
          dataSource={orders}
          scroll={{ x: 1650 }}
          pagination={{
            current: pagination.page,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true
          }}
          onChange={(nextPagination: TablePaginationConfig) =>
            loadOrders(nextPagination.current || 1, nextPagination.pageSize || 10)
          }
          columns={[
            { title: "所属酒店", dataIndex: ["hotel", "name"], width: 180 },
            {
              title: "订单状态",
              dataIndex: "status",
              width: 120,
              render: (value) => <OrderStatusTag value={value} />
            },
            { title: "客人姓名", dataIndex: "guestName", width: 110 },
            {
              title: "客人手机号",
              dataIndex: "guestPhone",
              width: 140,
              render: maskPhone
            },
            { title: "入住人数", dataIndex: "guestCount", width: 90 },
            {
              title: "入住日期",
              dataIndex: "checkInDate",
              width: 120,
              render: formatDate
            },
            {
              title: "离店日期",
              dataIndex: "checkOutDate",
              width: 120,
              render: formatDate
            },
            {
              title: "接站类型",
              dataIndex: "pickupType",
              width: 100,
              render: (value) => <PickupTypeTag value={value} />
            },
            { title: "到达地点", dataIndex: "arrivalStation", width: 150 },
            {
              title: "到达时间",
              dataIndex: "arrivalTime",
              width: 180,
              render: formatDateTime
            },
            { title: "航班号/车次", dataIndex: "flightTrainNo", width: 130 },
            {
              title: "服务管家",
              width: 220,
              render: (_, record) => getButlerNames(record)
            },
            {
              title: "创建时间",
              dataIndex: "createdAt",
              width: 180,
              render: formatDateTime
            },
            {
              title: "操作",
              fixed: "right",
              width: 150,
              render: (_, record) => (
                <Space>
                  <Button type="link" onClick={() => openDetail(record.id)}>
                    详情
                  </Button>
                  {currentUser?.roleCode !== "finance" ? (
                    <Button
                      type="link"
                      onClick={() =>
                        setModalState({ open: true, mode: "edit", order: record })
                      }
                    >
                      编辑
                    </Button>
                  ) : null}
                </Space>
              )
            }
          ]}
        />
      </Space>

      <OrderFormModal
        open={modalState.open}
        mode={modalState.mode}
        order={modalState.order}
        hotels={hotels}
        canEditMainFields={
          modalState.mode === "create" ||
          currentUser?.roleCode === "admin" ||
          currentUser?.roleCode === "dispatcher" ||
          modalState.order?.status === "pending_dispatch"
        }
        onCancel={() => setModalState({ open: false, mode: "create", order: null })}
        onSubmit={handleSubmitOrder}
      />

      <Drawer
        title="订单详情"
        size={920}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      >
        <OrderDetailView
          order={detail}
          canCompleteAssignment={
            currentUser?.roleCode === "admin" ||
            currentUser?.roleCode === "dispatcher" ||
            currentUser?.roleCode === "hotel_frontdesk"
          }
          onCompleteAssignment={completeAssignmentFromDetail}
          canCancelAssignment={
            currentUser?.roleCode === "admin" ||
            currentUser?.roleCode === "dispatcher"
          }
          onCancelAssignment={cancelAssignmentFromDetail}
        />
      </Drawer>
    </section>
  );
}
