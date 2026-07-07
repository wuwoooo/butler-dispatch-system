"use client";

import { PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import {
  App,
  Button,
  Descriptions,
  Drawer,
  Empty,
  Form,
  Input,
  Modal,
  Select,
  Spin,
  Space,
  Tag,
  Typography
} from "antd";
import { useEffect, useState } from "react";
import { OrderDetailView } from "@/components/orders/OrderDetailView";
import { AbnormalStatusTag, abnormalStatusOptions } from "@/components/status/StatusTags";
import { SortableTable } from "@/components/tables/SortableTable";
import type { AbnormalRecordItem, ButlerSummary, OrderRecord } from "@/types/domain";
import { formatDate, formatDateTime } from "@/utils/format";

type ApiResult<T> =
  | { success: true; data: T; message: string }
  | { success: false; error: { code: string; message: string } };

type AbnormalFormValues = {
  orderId?: string;
  butlerId?: string;
  abnormalType: string;
  description: string;
};

type ResolveValues = {
  status: "resolved" | "ignored";
  handleResult: string;
};

type AbnormalFilterValues = {
  orderId?: string;
  butlerId?: string;
  abnormalType?: string;
  status?: string;
  keyword?: string;
};

const abnormalTypeOptions = [
  { label: "管家拒单", value: "butler_reject" },
  { label: "服务异常", value: "service_abnormal" },
  { label: "前台投诉", value: "frontdesk_complaint" },
  { label: "手动标记", value: "manual_mark" },
  { label: "超时未确认", value: "assignment_confirm_timeout" },
  { label: "超期未完成", value: "assignment_service_overdue" }
];

function getAbnormalTypeLabel(value: string) {
  return abnormalTypeOptions.find((item) => item.value === value)?.label ?? value;
}

function formatOrderBrief(order: AbnormalRecordItem["order"] | OrderRecord | null | undefined) {
  if (!order) {
    return "-";
  }

  const dates = [formatDate(order.checkInDate), formatDate(order.checkOutDate)]
    .filter((value) => value && value !== "-")
    .join(" 至 ");
  const room = [order.roomType, order.roomNo].filter(Boolean).join(" / ") || "未填房型";

  return `${order.guestName || "-"} · ${dates || "-"} · ${room}`;
}

function AbnormalCreateModal({
  open,
  orders,
  butlers,
  onCancel,
  onSubmit
}: {
  open: boolean;
  orders: OrderRecord[];
  butlers: ButlerSummary[];
  onCancel: () => void;
  onSubmit: (values: AbnormalFormValues) => Promise<void>;
}) {
  return (
    <Modal open={open} title="新增异常记录" destroyOnHidden footer={null} onCancel={onCancel}>
      <Form<AbnormalFormValues>
        key={open ? "open" : "closed"}
        layout="vertical"
        initialValues={{ abnormalType: "service_abnormal", description: "" }}
        onFinish={onSubmit}
      >
        <Form.Item name="orderId" label="订单">
          <Select
            allowClear
            showSearch
            options={orders.map((order) => ({ label: formatOrderBrief(order), value: order.id }))}
          />
        </Form.Item>
        <Form.Item name="butlerId" label="管家">
          <Select
            allowClear
            showSearch
            options={butlers.map((butler) => ({ label: butler.name, value: butler.id }))}
          />
        </Form.Item>
        <Form.Item name="abnormalType" label="异常类型" rules={[{ required: true }]}>
          <Select options={abnormalTypeOptions} />
        </Form.Item>
        <Form.Item name="description" label="异常描述" rules={[{ required: true }]}>
          <Input.TextArea rows={4} />
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

function AbnormalResolveModal({
  target,
  onCancel,
  onSubmit
}: {
  target: AbnormalRecordItem | null;
  onCancel: () => void;
  onSubmit: (values: ResolveValues) => Promise<void>;
}) {
  return (
    <Modal
      open={Boolean(target)}
      title="处理异常记录"
      destroyOnHidden
      footer={null}
      onCancel={onCancel}
    >
      <Form<ResolveValues>
        key={target?.id ?? "empty"}
        layout="vertical"
        initialValues={{ status: "resolved", handleResult: "" }}
        onFinish={onSubmit}
      >
        <Form.Item name="status" label="处理结果" rules={[{ required: true }]}>
          <Select
            options={[
              { label: "已处理", value: "resolved" },
              { label: "已忽略", value: "ignored" }
            ]}
          />
        </Form.Item>
        <Form.Item name="handleResult" label="处理说明" rules={[{ required: true }]}>
          <Input.TextArea rows={4} />
        </Form.Item>
        <Form.Item style={{ marginBottom: 0 }}>
          <Space style={{ width: "100%", justifyContent: "flex-end" }}>
            <Button onClick={onCancel}>取消</Button>
            <Button type="primary" htmlType="submit">
              提交
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
}

export function AbnormalRecordsClient() {
  const { message } = App.useApp();
  const [filters, setFilters] = useState<AbnormalFilterValues>({});
  const [filterResetKey, setFilterResetKey] = useState(0);
  const [items, setItems] = useState<AbnormalRecordItem[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [butlers, setButlers] = useState<ButlerSummary[]>([]);
  const [currentUser, setCurrentUser] = useState<{ roleCode: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0 });
  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState<AbnormalRecordItem | null>(null);
  const [orderDetailOpen, setOrderDetailOpen] = useState(false);
  const [orderDetailLoading, setOrderDetailLoading] = useState(false);
  const [orderDetail, setOrderDetail] = useState<OrderRecord | null>(null);
  const [resolving, setResolving] = useState<AbnormalRecordItem | null>(null);
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

  async function loadBootstrap() {
    const me = await request<{ user: { roleCode: string } }>("/api/auth/me");
    const orderData = await request<{ items: OrderRecord[] }>("/api/orders?page=1&pageSize=100");
    setCurrentUser(me.user);
    setOrders(orderData.items);

    if (["admin", "dispatcher", "finance"].includes(me.user.roleCode)) {
      const butlerData = await request<{ items: ButlerSummary[] }>("/api/butlers");
      setButlers(butlerData.items);
    }
  }

  async function loadData(
    page = pagination.page,
    pageSize = pagination.pageSize,
    nextFilters?: AbnormalFilterValues
  ) {
    setLoading(true);
    try {
      const values = nextFilters ?? filters;
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize)
      });

      for (const key of ["orderId", "butlerId", "abnormalType", "status", "keyword"] as const) {
        const value = values[key];
        if (value) {
          params.set(key, value);
        }
      }

      const data = await request<{
        items: AbnormalRecordItem[];
        pagination: { page: number; pageSize: number; total: number };
      }>(`/api/abnormal-records?${params.toString()}`);
      setItems(data.items);
      setPagination(data.pagination);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "加载异常记录失败");
    } finally {
      setLoading(false);
    }
  }

  async function submitCreate(values: AbnormalFormValues) {
    try {
      await request("/api/abnormal-records", {
        method: "POST",
        body: JSON.stringify(values)
      });
      message.success("异常记录已创建");
      setCreateOpen(false);
      await loadData(1, pagination.pageSize);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "创建失败");
    }
  }

  async function submitResolve(values: ResolveValues) {
    if (!resolving) {
      return;
    }

    try {
      await request(`/api/abnormal-records/${resolving.id}/resolve`, {
        method: "POST",
        body: JSON.stringify(values)
      });
      message.success("异常记录已处理");
      setResolving(null);
      await loadData();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "处理失败");
    }
  }

  async function openOrderDetail(orderId: string | undefined) {
    if (!orderId) {
      return;
    }

    setOrderDetailOpen(true);
    setOrderDetailLoading(true);
    try {
      const data = await request<OrderRecord>(`/api/orders/${orderId}`);
      setOrderDetail(data);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "加载订单详情失败");
      setOrderDetailOpen(false);
    } finally {
      setOrderDetailLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setClientReady(true);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadBootstrap()
      .then(() => loadData(1, 10))
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canCreate = ["admin", "dispatcher", "hotel_frontdesk"].includes(currentUser?.roleCode ?? "");
  const canResolve = ["admin", "dispatcher"].includes(currentUser?.roleCode ?? "");

  return (
    <section className="page-panel">
      <Space orientation="vertical" size={16} style={{ width: "100%" }}>
        <Space style={{ justifyContent: "space-between", width: "100%" }}>
          <Typography.Title level={3} style={{ margin: 0 }}>
            异常记录
          </Typography.Title>
          {canCreate ? (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
              新增异常
            </Button>
          ) : null}
        </Space>

        <Form
          key={filterResetKey}
          layout="inline"
          initialValues={filters}
          onValuesChange={(_, allValues: AbnormalFilterValues) => setFilters(allValues)}
        >
          <Form.Item name="orderId">
            <Select
              allowClear
              showSearch
              placeholder="订单"
              style={{ width: 220 }}
              options={orders.map((order) => ({ label: formatOrderBrief(order), value: order.id }))}
            />
          </Form.Item>
          <Form.Item name="butlerId">
            <Select
              allowClear
              showSearch
              placeholder="管家"
              style={{ width: 180 }}
              options={butlers.map((butler) => ({ label: butler.name, value: butler.id }))}
            />
          </Form.Item>
          <Form.Item name="abnormalType">
            <Select
              allowClear
              placeholder="异常类型"
              style={{ width: 160 }}
              options={abnormalTypeOptions}
            />
          </Form.Item>
          <Form.Item name="status">
            <Select
              allowClear
              placeholder="处理状态"
              style={{ width: 140 }}
              options={abnormalStatusOptions}
            />
          </Form.Item>
          <Form.Item name="keyword">
            <Input allowClear placeholder="异常描述关键字" style={{ width: 220 }} />
          </Form.Item>
          <Button type="primary" onClick={() => loadData(1, pagination.pageSize, filters)}>
            查询
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              setFilters({});
              setFilterResetKey((value) => value + 1);
              loadData(1, pagination.pageSize, {});
            }}
          >
            重置
          </Button>
        </Form>

        <SortableTable<AbnormalRecordItem>
          rowKey="id"
          loading={loading}
          dataSource={items}
          columns={[
            {
              title: "订单简情",
              key: "orderBrief",
              width: 300,
              render: (_, record) =>
                record.order ? (
                  <Button
                    type="link"
                    size="small"
                    style={{
                      height: "auto",
                      padding: 0,
                      whiteSpace: "normal",
                      textAlign: "left"
                    }}
                    onClick={() => openOrderDetail(record.order?.id)}
                  >
                    {formatOrderBrief(record.order)}
                  </Button>
                ) : (
                  "-"
                )
            },
            {
              title: "管家",
              dataIndex: ["butler", "name"],
              key: "butlerName",
              width: 120,
              render: (_, record) => record.butler?.name ?? "-"
            },
            { title: "异常类型", dataIndex: "abnormalType", key: "abnormalType", width: 160, render: (value: string) => getAbnormalTypeLabel(value) },
            { title: "异常描述", dataIndex: "description", key: "description" },
            {
              title: "状态",
              dataIndex: "status",
              key: "status",
              width: 120,
              render: (value: string) => <AbnormalStatusTag value={value} />
            },
            {
              title: "创建时间",
              dataIndex: "createdAt",
              key: "createdAt",
              width: 180,
              render: (value: string) => formatDateTime(value)
            },
            {
              title: "操作",
              key: "action",
              width: 160,
              render: (_, record) => (
                <Space>
                  <Button type="link" size="small" onClick={() => setDetail(record)}>
                    详情
                  </Button>
                  {canResolve && ["pending", "processing"].includes(record.status) ? (
                    <Button type="link" size="small" onClick={() => setResolving(record)}>
                      处理
                    </Button>
                  ) : null}
                </Space>
              )
            }
          ]}
          pagination={{
            current: pagination.page,
            pageSize: pagination.pageSize,
            total: pagination.total,
            onChange: (page, pageSize) => loadData(page, pageSize)
          }}
        />
      </Space>

      {clientReady ? (
        <>
          <AbnormalCreateModal
            open={createOpen}
            orders={orders}
            butlers={butlers}
            onCancel={() => setCreateOpen(false)}
            onSubmit={submitCreate}
          />
          <AbnormalResolveModal
            target={resolving}
            onCancel={() => setResolving(null)}
            onSubmit={submitResolve}
          />
        </>
      ) : null}

      <Drawer open={Boolean(detail)} size={620} title="异常详情" onClose={() => setDetail(null)}>
        {detail ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div className="detail-card-group">
              <div className="detail-card-title">
                <i className="fa-solid fa-link" /> 关联业务对象
              </div>
              <Descriptions className="modern-descriptions" column={2} size="small">
                <Descriptions.Item label="订单简情" span={2}>
                  {detail.order ? (
                    <Button
                      type="link"
                      style={{ height: "auto", padding: 0, whiteSpace: "normal" }}
                      onClick={() => openOrderDetail(detail.order?.id)}
                    >
                      {formatOrderBrief(detail.order)}
                    </Button>
                  ) : (
                    "-"
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="所属酒店" span={2}>{detail.order?.hotel?.name ?? "-"}</Descriptions.Item>
                <Descriptions.Item label="关联管家" span={2}>
                  {detail.butler?.name ?? "-"}
                </Descriptions.Item>
              </Descriptions>
            </div>

            <div className="detail-card-group">
              <div className="detail-card-title">
                <i className="fa-solid fa-circle-exclamation" style={{ color: "var(--warning)" }} /> 异常内容与反馈
              </div>
              <Descriptions className="modern-descriptions" column={2} size="small">
                <Descriptions.Item label="异常类型">{getAbnormalTypeLabel(detail.abnormalType)}</Descriptions.Item>
                <Descriptions.Item label="创建人">{detail.createdBy?.name ?? "-"}</Descriptions.Item>
              </Descriptions>
              <div style={{ marginTop: 12 }}>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#64748b",
                    marginBottom: "6px",
                    fontWeight: 500
                  }}
                >
                  异常描述
                </div>
                <div
                  className="soft-text-card soft-text-card-primary"
                  style={{ borderLeftColor: "var(--warning)" }}
                >
                  {detail.description}
                </div>
              </div>
            </div>

            <div className="detail-card-group">
              <div className="detail-card-title">
                <i className="fa-solid fa-user-shield" /> 处理结果与反馈
              </div>
              <Descriptions className="modern-descriptions" column={2} size="small">
                <Descriptions.Item label="处理状态">
                  <Tag
                    color={
                      detail.status === "resolved"
                        ? "success"
                        : detail.status === "ignored"
                          ? "default"
                          : "error"
                    }
                  >
                    {detail.status === "resolved"
                      ? "已处理"
                      : detail.status === "ignored"
                        ? "已忽略"
                        : "待处理"}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="处理人">{detail.handledBy?.name ?? "-"}</Descriptions.Item>
              </Descriptions>
              {detail.status !== "pending" ? (
                <div style={{ marginTop: 12 }}>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#64748b",
                      marginBottom: "6px",
                      fontWeight: 500
                    }}
                  >
                    处理说明
                  </div>
                  <div className="soft-text-card" style={{ borderLeftColor: "var(--success)" }}>
                    {detail.handleResult ?? "-"}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </Drawer>

      <Drawer
        open={orderDetailOpen}
        size={920}
        title="订单详情"
        onClose={() => {
          setOrderDetailOpen(false);
          setOrderDetail(null);
        }}
      >
        {orderDetailLoading ? (
          <Spin />
        ) : orderDetail ? (
          <OrderDetailView order={orderDetail} />
        ) : (
          <Empty description="暂无订单详情" />
        )}
      </Drawer>
    </section>
  );
}
