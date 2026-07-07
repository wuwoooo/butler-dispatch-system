"use client";

import { ReloadOutlined } from "@ant-design/icons";
import {
  App,
  Button,
  Drawer,
  Modal,
  Space,
  Typography
} from "antd";
import { useEffect, useMemo, useState } from "react";
import {
  AssignmentStatusTag,
  ButlerStatusTag,
  OrderStatusTag,
  getAssignmentStatusLabel
} from "@/components/status/StatusTags";
import { OrderDetailView } from "@/components/orders/OrderDetailView";
import type {
  AvailableButlerRecord,
  OrderAssignmentRecord,
  OrderRecord
} from "@/types/domain";
import { formatDateTime, maskPhone } from "@/utils/format";
import { SortableTable } from "@/components/tables/SortableTable";

type ApiResult<T> =
  | { success: true; data: T; message: string }
  | { success: false; error: { code: string; message: string } };

const dispatchableStatuses = [
  "pending_dispatch",
  "partial_rejected",
  "pending_confirm"
];
export function DispatchClient() {
  const { message, modal } = App.useApp();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<OrderRecord | null>(null);
  const [butlers, setButlers] = useState<AvailableButlerRecord[]>([]);
  const [selectedButlerIds, setSelectedButlerIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<OrderRecord | null>(null);

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

  async function loadOrders() {
    setLoading(true);
    try {
      const data = await request<{ items: OrderRecord[] }>("/api/orders?page=1&pageSize=100");
      setOrders(data.items.filter((order) => dispatchableStatuses.includes(order.status)));
    } catch (error) {
      message.error(error instanceof Error ? error.message : "加载派单订单失败");
    } finally {
      setLoading(false);
    }
  }

  async function openAssign(order: OrderRecord) {
    setCurrentOrder(order);
    setAssignOpen(true);
    setSelectedButlerIds([]);

    try {
      const data = await request<{ items: AvailableButlerRecord[] }>(
        `/api/orders/${order.id}/available-butlers`
      );
      setButlers(data.items);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "加载管家失败");
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

  const existingAssignmentByButlerId = useMemo(() => {
    const entries =
      currentOrder?.assignments?.flatMap((assignment): Array<[string, OrderAssignmentRecord]> =>
        assignment.butler?.id && assignment.status !== "cancelled"
          ? [[assignment.butler.id, assignment]]
          : []
      ) ?? [];
    return new Map<string, OrderAssignmentRecord>(entries);
  }, [currentOrder]);

  async function submitAssign() {
    if (!currentOrder || selectedButlerIds.length === 0) {
      message.warning("请至少选择一名管家");
      return;
    }

    modal.confirm({
      title: "确认派单",
      content: "派单后管家会收到待确认任务，请确认选择无误。",
      okText: "确认派单",
      cancelText: "取消",
      onOk: async () => {
        setSubmitting(true);
        try {
          await request(`/api/orders/${currentOrder.id}/dispatch`, {
            method: "POST",
            body: JSON.stringify({
              butlerIds: selectedButlerIds
            })
          });
          message.success("派单成功");
          setAssignOpen(false);
          await loadOrders();
        } catch (error) {
          message.error(error instanceof Error ? error.message : "派单失败");
        } finally {
          setSubmitting(false);
        }
      }
    });
  }

  async function cancelDispatch(order: OrderRecord) {
    const pendingAssignments = (order.assignments || []).filter(
      (assignment) => assignment.status === "pending_confirm"
    );

    if (pendingAssignments.length === 0) {
      message.warning("当前订单没有待接单派单可取消");
      return;
    }

    modal.confirm({
      title: "取消派单",
      content: "取消后该订单会回到可重新分配状态；管家将不能再确认这次派单。",
      okText: "确认取消",
      cancelText: "返回",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await Promise.all(
            pendingAssignments.map((assignment) =>
              request(`/api/orders/${order.id}/assignments/${assignment.id}/cancel`, {
                method: "POST",
                body: JSON.stringify({
                  remark: "派单管理取消待接单派单"
                })
              })
            )
          );
          message.success("派单已取消");
          await loadOrders();
          if (detailOpen && detail?.id === order.id) {
            await openDetail(order.id);
          }
        } catch (error) {
          message.error(error instanceof Error ? error.message : "取消派单失败");
        }
      }
    });
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function getButlerNames(record: OrderRecord) {
    return (record.assignments || [])
      .filter((assignment) => !["reassigned", "cancelled"].includes(assignment.status))
      .map((assignment) => `${assignment.butler?.name}（${getAssignmentStatusLabel(assignment.status)}）`)
      .filter(Boolean)
      .join("、") || "-";
  }

  return (
    <section className="page-panel">
      <Space orientation="vertical" size={16} style={{ width: "100%" }}>
        <Space style={{ justifyContent: "space-between", width: "100%" }}>
          <Typography.Title level={3} style={{ margin: 0 }}>
            派单管理
          </Typography.Title>
          <Button icon={<ReloadOutlined />} onClick={loadOrders}>
            刷新
          </Button>
        </Space>

        <SortableTable<OrderRecord>
          rowKey="id"
          loading={loading}
          dataSource={orders}
          scroll={{ x: 1150 }}
          columns={[
            { title: "酒店", dataIndex: ["hotel", "name"], width: 180 },
            { title: "客人", dataIndex: "guestName", width: 110 },
            {
              title: "手机号",
              dataIndex: "guestPhone",
              width: 130,
              render: maskPhone
            },
            {
              title: "到达时间",
              dataIndex: "arrivalTime",
              width: 180,
              render: formatDateTime
            },
            {
              title: "状态",
              dataIndex: "status",
              width: 120,
              render: (value) => <OrderStatusTag value={value} />
            },
            {
              title: "服务管家",
              width: 260,
              render: (_, record) => getButlerNames(record)
            },
            {
              title: "操作",
              width: 170,
              fixed: "right",
              render: (_, record) =>
                (
                  <Space size={0}>
                    <Button type="link" onClick={() => openDetail(record.id)}>
                      详情
                    </Button>
                    {record.status === "pending_confirm" ? (
                      <Button type="link" danger onClick={() => cancelDispatch(record)}>
                        取消
                      </Button>
                    ) : (
                      <Button type="link" onClick={() => openAssign(record)}>
                        派单
                      </Button>
                    )}
                  </Space>
                )
            }
          ]}
        />
      </Space>

      <Modal
        title={currentOrder ? `派单：${currentOrder.orderNo}` : "派单"}
        open={assignOpen}
        width={860}
        okText="提交派单"
        cancelText="取消"
        confirmLoading={submitting}
        onCancel={() => setAssignOpen(false)}
        onOk={submitAssign}
      >
        <Space orientation="vertical" size={24} style={{ width: "100%" }}>
          <div>
            <Typography.Text strong style={{ fontSize: "14px", display: "block", marginBottom: 8 }}>
              <i className="fa-solid fa-users" style={{ color: "var(--primary)", marginRight: 6 }} /> 服务管家 (可多选)
            </Typography.Text>
            <div className="butler-card-grid">
              {butlers.map((butler) => {
                const existing = existingAssignmentByButlerId.get(butler.id);
                const disabled =
                  !butler.available ||
                  Boolean(existing);
                const isSelected = selectedButlerIds.includes(butler.id);

                return (
                  <div
                    key={butler.id}
                    className={`butler-select-card ${isSelected ? "butler-select-card-selected" : ""} ${disabled ? "butler-select-card-disabled" : ""}`}
                    onClick={() => {
                      if (!disabled) {
                        if (isSelected) {
                          setSelectedButlerIds((prev) => prev.filter((id) => id !== butler.id));
                        } else {
                          setSelectedButlerIds((prev) => [...prev, butler.id]);
                        }
                      }
                    }}
                  >
                    <div className="butler-select-card-header">
                      <div className="butler-select-card-name">
                        <i className="fa-solid fa-user-gear" style={{ color: isSelected ? "var(--primary)" : "#64748b" }} />
                        {butler.name}
                      </div>
                      <span className="butler-select-card-indicator" />
                    </div>
                    <div className="butler-select-card-body">
                      <Space wrap size={4}>
                        <ButlerStatusTag value={butler.status ?? "available"} />
                        {existing ? <AssignmentStatusTag value={existing.status} /> : null}
                      </Space>
                      {disabled && butler.unavailableReasons.length > 0 ? (
                        <div style={{ color: "#ef4444", fontSize: "11px", marginTop: 4 }}>
                          <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 4 }} />
                          {butler.unavailableReasons.join("、")}
                        </div>
                      ) : (
                        null
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Space>
      </Modal>

      <Drawer
        title="订单详情"
        size={920}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      >
        <OrderDetailView
          order={detail}
          canCancelAssignment
          onCancelAssignment={(assignment) => {
            if (!detail) {
              return;
            }

            cancelDispatch({
              ...detail,
              assignments: [assignment]
            });
          }}
        />
      </Drawer>
    </section>
  );
}
