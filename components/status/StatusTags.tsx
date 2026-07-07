"use client";

import { Tag } from "antd";

export const orderStatusOptions = [
  { label: "待分配", value: "pending_dispatch" },
  { label: "待确认", value: "pending_confirm" },
  { label: "部分拒单", value: "partial_rejected" },
  { label: "已确认", value: "confirmed" },
  { label: "服务中", value: "in_service" },
  { label: "部分完成", value: "partial_completed" },
  { label: "待评价", value: "pending_review" },
  { label: "已评价", value: "reviewed" },
  { label: "已完成", value: "completed" },
  { label: "已取消", value: "cancelled" },
  { label: "异常", value: "abnormal" }
];

export const assignmentStatusOptions = [
  { label: "待确认", value: "pending_confirm" },
  { label: "已确认", value: "confirmed" },
  { label: "已拒单", value: "rejected" },
  { label: "已接到客人", value: "picked_guest" },
  { label: "服务中", value: "in_service" },
  { label: "已完成", value: "completed" },
  { label: "异常", value: "abnormal" },
  { label: "已改派", value: "reassigned" },
  { label: "已取消", value: "cancelled" }
];

export const pickupTypeOptions = [
  { label: "接飞机", value: "airport" },
  { label: "接火车", value: "train" }
];

export const leaveStatusOptions = [
  { label: "待审核", value: "pending" },
  { label: "已通过", value: "approved" },
  { label: "已驳回", value: "rejected" },
  { label: "已撤销", value: "cancelled" },
  { label: "请假中", value: "active" },
  { label: "已结束", value: "finished" }
];

export const leaveTypeOptions = [
  { label: "事假", value: "personal" },
  { label: "病假", value: "sick" },
  { label: "休息", value: "rest" },
  { label: "其他", value: "other" }
];

export const butlerStatusOptions = [
  { label: "空闲", value: "available" },
  { label: "待接单", value: "pending_confirm" },
  { label: "准备接待", value: "confirmed_waiting" },
  { label: "接待中", value: "in_service" }
];

export const roleOptions = [
  { label: "管理员", value: "admin" },
  { label: "酒店前台", value: "hotel_frontdesk" },
  { label: "调配员", value: "dispatcher" },
  { label: "管家", value: "butler" },
  { label: "财务人员", value: "finance" }
];

export const settlementStatusOptions = [
  { label: "未结算", value: "unsettled" },
  { label: "已结算", value: "settled" }
];

export const abnormalStatusOptions = [
  { label: "待处理", value: "pending" },
  { label: "处理中", value: "processing" },
  { label: "已处理", value: "resolved" },
  { label: "已忽略", value: "ignored" }
];

const orderStatusColor: Record<string, string> = {
  pending_dispatch: "default",
  pending_confirm: "processing",
  partial_rejected: "warning",
  confirmed: "blue",
  in_service: "green",
  partial_completed: "gold",
  pending_review: "purple",
  reviewed: "cyan",
  completed: "success",
  cancelled: "default",
  abnormal: "error"
};

const assignmentStatusColor: Record<string, string> = {
  pending_confirm: "processing",
  confirmed: "blue",
  rejected: "error",
  picked_guest: "green",
  in_service: "green",
  completed: "success",
  abnormal: "error",
  reassigned: "default",
  cancelled: "default"
};

const leaveStatusColor: Record<string, string> = {
  pending: "processing",
  approved: "blue",
  rejected: "error",
  cancelled: "default",
  active: "green",
  finished: "success"
};

const settlementStatusColor: Record<string, string> = {
  unsettled: "warning",
  settled: "success"
};

const abnormalStatusColor: Record<string, string> = {
  pending: "warning",
  processing: "processing",
  resolved: "success",
  ignored: "default"
};

const butlerStatusColor: Record<string, string> = {
  available: "success",
  pending_confirm: "processing",
  confirmed_waiting: "blue",
  in_service: "green",
  on_leave: "warning",
  suspended: "orange",
  disabled: "default"
};

const butlerInternalStatusLabels: Record<string, string> = {
  on_leave: "空闲",
  suspended: "空闲",
  disabled: "空闲"
};

export function getOrderStatusLabel(value: string) {
  return orderStatusOptions.find((item) => item.value === value)?.label ?? value;
}

export function getAssignmentStatusLabel(value: string) {
  return (
    assignmentStatusOptions.find((item) => item.value === value)?.label ?? value
  );
}

export function getPickupTypeLabel(value: string) {
  return pickupTypeOptions.find((item) => item.value === value)?.label ?? value;
}

export function getLeaveStatusLabel(value: string) {
  return leaveStatusOptions.find((item) => item.value === value)?.label ?? value;
}

export function getLeaveTypeLabel(value: string) {
  return leaveTypeOptions.find((item) => item.value === value)?.label ?? value;
}

export function getButlerStatusLabel(value: string) {
  return (
    butlerStatusOptions.find((item) => item.value === value)?.label ??
    butlerInternalStatusLabels[value] ??
    value
  );
}

export function getRoleLabel(value: string) {
  return roleOptions.find((item) => item.value === value)?.label ?? value;
}

export function getSettlementStatusLabel(value: string) {
  return (
    settlementStatusOptions.find((item) => item.value === value)?.label ?? value
  );
}

export function getAbnormalStatusLabel(value: string) {
  return (
    abnormalStatusOptions.find((item) => item.value === value)?.label ?? value
  );
}

export function OrderStatusTag({ value }: { value: string }) {
  return <Tag color={orderStatusColor[value]}>{getOrderStatusLabel(value)}</Tag>;
}

export function AssignmentStatusTag({ value }: { value: string }) {
  return (
    <Tag color={assignmentStatusColor[value]}>
      {getAssignmentStatusLabel(value)}
    </Tag>
  );
}

export function PickupTypeTag({ value }: { value: string }) {
  return <Tag>{getPickupTypeLabel(value)}</Tag>;
}

export function LeaveStatusTag({ value }: { value: string }) {
  return <Tag color={leaveStatusColor[value]}>{getLeaveStatusLabel(value)}</Tag>;
}

export function LeaveTypeTag({ value }: { value: string }) {
  return <Tag>{getLeaveTypeLabel(value)}</Tag>;
}

export function ButlerStatusTag({ value }: { value: string }) {
  return <Tag color={butlerStatusColor[value]}>{getButlerStatusLabel(value)}</Tag>;
}

export function ComplaintTag({ value }: { value: boolean }) {
  return value ? <Tag color="error">投诉</Tag> : <Tag color="success">正常</Tag>;
}

export function SettlementStatusTag({ value }: { value: string }) {
  return (
    <Tag color={settlementStatusColor[value]}>
      {getSettlementStatusLabel(value)}
    </Tag>
  );
}

export function AbnormalStatusTag({ value }: { value: string }) {
  return (
    <Tag color={abnormalStatusColor[value]}>
      {getAbnormalStatusLabel(value)}
    </Tag>
  );
}
