"use client";

import { ReloadOutlined } from "@ant-design/icons";
import {
  App,
  Button,
  Drawer,
  InputNumber,
  Modal,
  Space,
  Switch,
  Tag,
  Typography
} from "antd";
import { useEffect, useMemo, useState } from "react";
import {
  AssignmentStatusTag,
  ButlerStatusTag,
  OrderStatusTag,
  PickupTypeTag,
  getAssignmentStatusLabel
} from "@/components/status/StatusTags";
import { OrderDetailView } from "@/components/orders/OrderDetailView";
import type {
  AvailableButlerRecord,
  OrderAssignmentRecord,
  OrderRecord
} from "@/types/domain";
import { formatDateTime } from "@/utils/format";
import { SortableTable } from "@/components/tables/SortableTable";
import { getDefaultTransportFeeTotalText } from "@/lib/transport-pricing";
import {
  normalizeButlerSelectionForMode,
  toggleButlerSelection as getNextButlerSelection
} from "@/lib/dispatch-selection";

type ApiResult<T> =
  | { success: true; data: T; message: string }
  | { success: false; error: { code: string; message: string } };

const dispatchableStatuses = [
  "pending_dispatch",
  "partial_rejected",
  "pending_confirm"
];
const blockingSameOrderAssignmentStatuses = [
  "pending_confirm",
  "confirmed",
  "picked_guest",
  "in_service",
  "reassigned"
];
type VehicleType = "sedan" | "suv" | "business";

export function DispatchClient() {
  const { message, modal } = App.useApp();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<OrderRecord | null>(null);
  const [butlers, setButlers] = useState<AvailableButlerRecord[]>([]);
  const [recommendation, setRecommendation] = useState<{
    vehicleType: VehicleType;
    source: "order_request" | "guest_count";
  } | null>(null);
  const [selectedButlerIds, setSelectedButlerIds] = useState<string[]>([]);
  const [multiSelectEnabled, setMultiSelectEnabled] = useState(false);
  const [settlementAmount, setSettlementAmount] = useState<string>("");
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
    setMultiSelectEnabled(false);
    setRecommendation(null);
    setSettlementAmount(
      order.settlementAmount === null || order.settlementAmount === undefined
        ? ""
        : Number(order.settlementAmount).toFixed(2)
    );

    try {
      const data = await request<{
        items: AvailableButlerRecord[];
        recommendation: {
          vehicleType: VehicleType;
          source: "order_request" | "guest_count";
        };
        defaultSettlementAmount: string;
      }>(
        `/api/orders/${order.id}/available-butlers`
      );
      setButlers(data.items);
      setRecommendation(data.recommendation);
      if (order.settlementAmount === null || order.settlementAmount === undefined) {
        setSettlementAmount(data.defaultSettlementAmount);
      }
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
        assignment.butler?.id &&
        blockingSameOrderAssignmentStatuses.includes(assignment.status)
          ? [[assignment.butler.id, assignment]]
          : []
      ) ?? [];
    return new Map<string, OrderAssignmentRecord>(entries);
  }, [currentOrder]);

  function getSettlementAmountForSelection(selectedIds: string[]) {
    const selectedVehicleTypes = butlers
      .filter((butler) => selectedIds.includes(butler.id))
      .map((butler) => butler.vehicleType);
    return getDefaultTransportFeeTotalText({
      pickupType: currentOrder?.pickupType === "train" ? "train" : "airport",
      selectedVehicleTypes,
      fallbackVehicleType: recommendation?.vehicleType ?? "sedan"
    });
  }

  function toggleButlerSelection(butlerId: string) {
    const nextSelectedIds = getNextButlerSelection({
      selectedIds: selectedButlerIds,
      butlerId,
      multiple: multiSelectEnabled
    });

    setSelectedButlerIds(nextSelectedIds);
    setSettlementAmount(getSettlementAmountForSelection(nextSelectedIds));
  }

  function changeMultiSelectMode(enabled: boolean) {
    const nextSelectedIds = normalizeButlerSelectionForMode(
      selectedButlerIds,
      enabled
    );

    setMultiSelectEnabled(enabled);
    if (nextSelectedIds !== selectedButlerIds) {
      setSelectedButlerIds(nextSelectedIds);
      setSettlementAmount(getSettlementAmountForSelection(nextSelectedIds));
    }
  }

  async function submitAssign() {
    if (!currentOrder || selectedButlerIds.length === 0) {
      message.warning("请至少选择一名管家");
      return;
    }
    if (!/^(0|[1-9]\d{0,9})(\.\d{1,2})?$/.test(settlementAmount)) {
      message.warning("请填写正确的收费金额");
      return;
    }

    const selectedNames = butlers
      .filter((butler) => selectedButlerIds.includes(butler.id))
      .map((butler) => butler.name)
      .join("、");

    modal.confirm({
      title: "确认派单",
      content: `确认派给 ${selectedNames}？本订单收费金额为 ¥${Number(settlementAmount).toFixed(2)}。`,
      okText: "确认派单",
      cancelText: "取消",
      onOk: async () => {
        setSubmitting(true);
        try {
          await request(`/api/orders/${currentOrder.id}/dispatch`, {
            method: "POST",
            body: JSON.stringify({
              butlerIds: selectedButlerIds,
              settlementAmount,
              amountConfirmed: true
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
          scroll={{ x: 1280 }}
          columns={[
            { title: "酒店", dataIndex: ["hotel", "name"], width: 180 },
            {
              title: "客人",
              dataIndex: "guestName",
              width: 140,
              render: (value, record) => `${value}（${record.guestCount}人）`
            },
            {
              title: "服务类型",
              dataIndex: "pickupType",
              width: 130,
              render: (value, record) =>
                record.serviceMode === "transport" ? (
                  <Typography.Text>
                    {formatTransportType(value, record.transportDirection)}
                  </Typography.Text>
                ) : (
                  <PickupTypeTag value={value} />
                )
            },
            {
              title: "手机号",
              dataIndex: "guestPhone",
              width: 130
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
            <Space wrap style={{ marginBottom: 16 }}>
              <Typography.Text>接送人数：<strong>{currentOrder?.guestCount ?? 0} 人</strong></Typography.Text>
              {currentOrder ? (
                <Tag color="purple" icon={<i className="fa-solid fa-route" />}>
                  行程：{getDispatchRouteLabel(currentOrder)}
                </Tag>
              ) : null}
              {currentOrder?.requestedVehicleInfo ? (
                <Typography.Text>原表车型：<strong>{currentOrder.requestedVehicleInfo}</strong></Typography.Text>
              ) : null}
              {recommendation ? (
                <Typography.Text>
                  推荐车型：
                  <strong>
                    {{ sedan: "轿车", suv: "SUV", business: "商务车" }[recommendation.vehicleType]}
                  </strong>
                  （{recommendation.source === "order_request" ? "按原表车型" : "按接送人数"}）
                </Typography.Text>
              ) : null}
            </Space>
            <Space style={{ justifyContent: "space-between", width: "100%", marginBottom: 8 }}>
              <Typography.Text strong style={{ fontSize: "14px" }}>
                <i className="fa-solid fa-users" style={{ color: "var(--primary)", marginRight: 6 }} /> 服务管家
              </Typography.Text>
              <Space size={8}>
                <Typography.Text type="secondary">多选</Typography.Text>
                <Switch
                  checked={multiSelectEnabled}
                  onChange={changeMultiSelectMode}
                  checkedChildren="开"
                  unCheckedChildren="关"
                />
              </Space>
            </Space>
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
                        toggleButlerSelection(butler.id);
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
                        {butler.recommended ? <Tag color="blue">推荐</Tag> : null}
                        <Tag>
                          {butler.vehicleType
                            ? { sedan: "轿车", suv: "SUV", business: "商务车" }[butler.vehicleType]
                            : "车型待补齐"}
                        </Tag>
                      </Space>
                      {butler.vehicleInfo ? (
                        <Typography.Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 4 }}>
                          {butler.vehicleInfo}
                        </Typography.Text>
                      ) : null}
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
          <div>
            <Typography.Text strong style={{ display: "block", marginBottom: 8 }}>
              收费金额
            </Typography.Text>
            <InputNumber<string>
              stringMode
              min="0"
              precision={2}
              prefix="¥"
              value={settlementAmount || undefined}
              onChange={(value) => setSettlementAmount(value ?? "")}
              style={{ width: 240 }}
              placeholder="允许明确填写 0 元"
            />
            <Typography.Text type="secondary" style={{ display: "block", marginTop: 6 }}>
              每辆车分别按机场/车站默认价计费并自动合计；重新选择管家时会覆盖人工改价。
            </Typography.Text>
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

function getDispatchRouteLabel(order: OrderRecord) {
  const station = order.pickupType === "airport" ? "机场" : "火车站";
  const isDropoff =
    order.serviceMode === "transport" && order.transportDirection === "dropoff";

  return isDropoff ? `酒店 → ${station}` : `${station} → 酒店`;
}

function formatTransportType(
  pickupType: string,
  direction?: string | null
) {
  if (pickupType === "airport") {
    return direction === "dropoff" ? "送机" : "接机";
  }
  if (pickupType === "train") {
    return direction === "dropoff" ? "送站" : "接站";
  }
  return "-";
}
