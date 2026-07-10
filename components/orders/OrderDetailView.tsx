"use client";

import { Button, Descriptions, Empty, Space, Timeline } from "antd";
import {
  AssignmentStatusTag,
  OrderStatusTag,
  PickupTypeTag
} from "@/components/status/StatusTags";
import type { OrderAssignmentRecord, OrderRecord } from "@/types/domain";
import { formatDate, formatDateTime, maskPhone } from "@/utils/format";
import { SortableTable } from "@/components/tables/SortableTable";

type OrderDetailViewProps = {
  order: OrderRecord | null;
  canCompleteAssignment?: boolean;
  onCompleteAssignment?: (assignment: OrderAssignmentRecord) => void;
  canCancelAssignment?: boolean;
  onCancelAssignment?: (assignment: OrderAssignmentRecord) => void;
};

type RejectRecordItem = NonNullable<OrderRecord["rejectRecords"]>[number];
type NotificationItem = NonNullable<OrderRecord["notifications"]>[number];
type OperationLogItem = NonNullable<OrderRecord["operationLogs"]>[number];

const operationActionLabels: Record<string, string> = {
  CREATE_ORDER: "创建订单",
  UPDATE_ORDER: "修改订单",
  DISPATCH_ORDER: "派单",
  REASSIGN_ORDER: "改派",
  ORDER_REVIEW_STATUS_CHANGE: "完成评价",
  UPDATE_SETTLEMENT_STATUS: "修改结算状态"
};

function getOrderActivityLabel(log: OperationLogItem) {
  if (log.operationType !== "ORDER_STATUS_CHANGE") {
    return operationActionLabels[log.operationType] ?? "处理订单";
  }

  const remark = log.remark ?? "";

  if (remark.includes("派单")) {
    return "派单";
  }
  if (remark.includes("确认")) {
    return "确认接单";
  }
  if (remark.includes("拒单")) {
    return "拒单";
  }
  if (remark.includes("接到客人") || remark.includes("服务中")) {
    return "已接到客人";
  }
  if (remark.includes("完成")) {
    return "完成服务";
  }
  if (remark.includes("取消")) {
    return "取消派单";
  }

  return "更新订单状态";
}

function buildOrderActivityLogs(logs: OperationLogItem[]) {
  return logs.filter((log) => {
    if (log.operationType !== "ORDER_STATUS_CHANGE") {
      return true;
    }

    const action = getOrderActivityLabel(log);
    const createdAt = new Date(log.createdAt).getTime();

    return !logs.some((item) => {
      if (item.id === log.id || item.operationType === "ORDER_STATUS_CHANGE") {
        return false;
      }

      const sameAction = getOrderActivityLabel(item) === action;
      const nearby = Math.abs(new Date(item.createdAt).getTime() - createdAt) <= 120000;

      return sameAction && nearby;
    });
  });
}

export function OrderDetailView({
  order,
  canCompleteAssignment = false,
  onCompleteAssignment,
  canCancelAssignment = false,
  onCancelAssignment
}: OrderDetailViewProps) {
  if (!order) {
    return <Empty description="暂无订单详情" />;
  }

  const activityLogs = buildOrderActivityLogs(order.operationLogs || []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* 分组 1: 酒店与客人信息 */}
      <div className="detail-card-group">
        <div className="detail-card-title">
          <i className="fa-solid fa-hotel" /> 酒店与客人信息
        </div>
        <Descriptions className="modern-descriptions" column={2} size="small">
          <Descriptions.Item label="订单编号">{order.orderNo}</Descriptions.Item>
          <Descriptions.Item label="订单状态">
            <OrderStatusTag value={order.status} />
          </Descriptions.Item>
          <Descriptions.Item label="所属酒店">{order.hotel?.name}</Descriptions.Item>
          <Descriptions.Item label="客人姓名">{order.guestName}</Descriptions.Item>
          <Descriptions.Item label="客人手机号">
            {maskPhone(order.guestPhone)}
          </Descriptions.Item>
          <Descriptions.Item label="入住人数">{order.guestCount} 人</Descriptions.Item>
        </Descriptions>
      </div>

      {/* 分组 2: 房型与时间计划 */}
      <div className="detail-card-group">
        <div className="detail-card-title">
          <i className="fa-solid fa-calendar-days" /> 房型与入住时间
        </div>
        <Descriptions className="modern-descriptions" column={2} size="small">
          <Descriptions.Item label="房型">{order.roomType || "-"}</Descriptions.Item>
          <Descriptions.Item label="房间号">{order.roomNo || "-"}</Descriptions.Item>
          <Descriptions.Item label="入住日期">
            {formatDate(order.checkInDate)}
          </Descriptions.Item>
          <Descriptions.Item label="离店日期">
            {formatDate(order.checkOutDate)}
          </Descriptions.Item>
        </Descriptions>
      </div>

      {/* 分组 3: 到达与接送信息 */}
      <div className="detail-card-group">
        <div className="detail-card-title">
          <i className="fa-solid fa-route" /> 到达与接送信息
        </div>
        <Descriptions className="modern-descriptions" column={2} size="small">
          <Descriptions.Item label="接站类型">
            <PickupTypeTag value={order.pickupType} />
          </Descriptions.Item>
          <Descriptions.Item label="航班号/车次">
            {order.flightTrainNo || "-"}
          </Descriptions.Item>
          <Descriptions.Item label="到达地点">{order.arrivalStation}</Descriptions.Item>
          <Descriptions.Item label="到达时间">
            {formatDateTime(order.arrivalTime)}
          </Descriptions.Item>
        </Descriptions>
      </div>

      {/* 分组 4: 特殊需求与备注 */}
      <div className="detail-card-group">
        <div className="detail-card-title">
          <i className="fa-solid fa-note-sticky" /> 特殊需求与备注
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          <div>
            <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "6px", fontWeight: 500 }}>特殊需求</div>
            <div className="soft-text-card soft-text-card-primary">{order.specialNeeds || "无特殊需求"}</div>
          </div>
          <div>
            <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "6px", fontWeight: 500 }}>备注</div>
            <div className="soft-text-card">{order.remark || "无备注"}</div>
          </div>
        </div>
      </div>

      {/* 分组 5: 已分配管家 */}
      <div className="detail-card-group">
        <div className="detail-card-title">
          <i className="fa-solid fa-user-check" /> 已分配管家
        </div>
        <SortableTable<OrderAssignmentRecord>
          size="small"
          rowKey="id"
          pagination={false}
          dataSource={order.assignments || []}
          columns={[
            {
              title: "管家",
              dataIndex: ["butler", "name"]
            },
            {
              title: "状态",
              render: (_, record) => <AssignmentStatusTag value={record.status} />
            },
            {
              title: "确认时间",
              render: (_, record) => formatDateTime(record.confirmedAt)
            },
            {
              title: "接到客人时间",
              render: (_, record) => formatDateTime(record.pickedGuestAt)
            },
            {
              title: "完成时间",
              render: (_, record) => formatDateTime(record.completedAt)
            },
            {
              title: "拒单时间",
              render: (_, record) => formatDateTime(record.rejectedAt)
            },
            {
              title: "拒单原因",
              render: (_, record) => record.rejectReason || "-"
            },
            {
              title: "操作",
              render: (_, record) => {
                const actions = [];

                if (
                  canCompleteAssignment &&
                  ["confirmed", "picked_guest", "in_service"].includes(record.status)
                ) {
                  actions.push(
                    <Button
                      key="complete"
                      type="link"
                      onClick={() => onCompleteAssignment?.(record)}
                    >
                      确认完成
                    </Button>
                  );
                }

                if (canCancelAssignment && record.status === "pending_confirm") {
                  actions.push(
                    <Button
                      key="cancel"
                      type="link"
                      danger
                      onClick={() => onCancelAssignment?.(record)}
                    >
                      取消派单
                    </Button>
                  );
                }

                return actions.length > 0 ? <Space size={0}>{actions}</Space> : "-";
              }
            }
          ]}
        />
      </div>

      {/* 拒单、通知的并排卡片组 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        <div className="detail-card-group" style={{ marginBottom: 0 }}>
          <div className="detail-card-title">
            <i className="fa-solid fa-ban" /> 拒单记录
          </div>
          {!order.rejectRecords || order.rejectRecords.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无拒单记录" />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {order.rejectRecords.map((item: RejectRecordItem) => (
                <div
                  key={item.id}
                  style={{ padding: "8px 0", borderBottom: "1px solid rgba(148, 163, 184, 0.14)" }}
                >
                  <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>
                    [{formatDateTime(item.createdAt)}]
                  </span>
                  <strong style={{ color: "var(--text-main)", marginLeft: 6 }}>
                    {item.butler?.name}
                  </strong>
                  ：<span style={{ color: "var(--pink)" }}>{item.reason}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="detail-card-group" style={{ marginBottom: 0 }}>
          <div className="detail-card-title">
            <i className="fa-solid fa-bell" /> 通知记录
          </div>
          {!order.notifications || order.notifications.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无通知记录" />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {order.notifications.map((item: NotificationItem) => (
                <div
                  key={item.id}
                  style={{ padding: "8px 0", borderBottom: "1px solid rgba(148, 163, 184, 0.14)" }}
                >
                  <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>
                    [{formatDateTime(item.createdAt)}]
                  </span>
                  <strong style={{ color: "var(--text-main)", marginLeft: 6 }}>
                    {item.recipient?.name || "系统"}
                  </strong>
                  ：<span>{item.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 操作日志 */}
      <div className="detail-card-group">
        <div className="detail-card-title">
          <i className="fa-solid fa-clock-rotate-left" /> 操作日志
        </div>
        {activityLogs.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无操作日志" />
        ) : (
          <Timeline
            mode="start"
            className="modern-timeline"
            items={activityLogs.map((item) => ({
              title: formatDateTime(item.createdAt),
              content: (
                <span>
                  <strong style={{ color: "var(--text-main)" }}>
                    {item.operator?.name || "系统"}
                  </strong>{" "}
                  <span style={{ color: "var(--primary)", fontWeight: 600 }}>
                    {getOrderActivityLabel(item)}
                  </span>
                </span>
              )
            }))}
          />
        )}
      </div>
    </div>
  );
}
