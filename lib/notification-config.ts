export const notificationConfigType = "notification_type" as const;

export const notificationTypeOptions = [
  { value: "dispatch_assigned", label: "派单通知", description: "派单成功后通知管家及时确认接单。" },
  { value: "butler_confirmed", label: "确认接单通知", description: "管家确认接单后通知调配员。" },
  { value: "butler_rejected", label: "拒单通知", description: "管家拒单后通知调配员。" },
  { value: "guest_picked", label: "接到客人通知", description: "管家点击已接到自己负责的客人后通知前台和调配员。" },
  { value: "service_completed", label: "服务完成通知", description: "完成服务后通知前台和调配员进入评价环节。" },
  { value: "leave_submitted", label: "请假提交通知", description: "管家提交请假申请后通知调配员审核。" },
  { value: "leave_approved", label: "请假通过通知", description: "请假审核通过后通知管家。" },
  { value: "leave_rejected", label: "请假驳回通知", description: "请假审核驳回后通知管家。" },
  { value: "review_received", label: "收到评价通知", description: "前台或调配员提交评价后通知管家。" }
] as const;

export type NotificationConfigValue = (typeof notificationTypeOptions)[number]["value"];

export const notificationTypeMeta = Object.fromEntries(
  notificationTypeOptions.map((item) => [item.value, item])
) as Record<NotificationConfigValue, (typeof notificationTypeOptions)[number]>;

export function isNotificationConfigValue(value: string): value is NotificationConfigValue {
  return notificationTypeOptions.some((item) => item.value === value);
}
