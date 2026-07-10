type NotificationRole = "butler" | "dispatcher";

export function resolveNotificationUrl(item: AnyRecord, role: NotificationRole) {
  const payload = normalizePayload(item.payload);
  const orderId = payload.orderId || (item.targetType === "ServiceOrder" ? item.targetId : "");
  const assignmentId =
    payload.assignmentId || (item.targetType === "OrderButlerAssignment" ? item.targetId : "");
  const leaveId = payload.leaveId || (item.targetType === "ButlerLeave" ? item.targetId : "");
  const butlerId = payload.butlerId || (item.targetType === "Butler" ? item.targetId : "");

  if (role === "butler") {
    if (orderId) {
      const query = assignmentId ? `&assignmentId=${assignmentId}` : "";
      return `/pages/butler/order-detail/index?orderId=${orderId}${query}`;
    }

    if (leaveId || item.type?.startsWith("leave_")) {
      return "/pages/butler/leave-records/index";
    }

    if (item.targetType === "ServiceReview" || item.type === "review_received") {
      return "/pages/butler/statistics/index";
    }

    if (item.targetType === "User") {
      return "/pages/butler/profile/index";
    }

    return "";
  }

  if (orderId) {
    return `/pages/dispatcher/dispatch-detail/index?orderId=${orderId}`;
  }

  if (leaveId || item.type?.startsWith("leave_")) {
    return "/pages/dispatcher/leave-review/index";
  }

  if (butlerId) {
    return `/pages/dispatcher/butler-detail/index?id=${butlerId}`;
  }

  if (item.targetType === "User") {
    return "/pages/dispatcher/profile/index";
  }

  return "";
}

function normalizePayload(payload: unknown): AnyRecord {
  if (!payload) return {};
  if (typeof payload === "object") return payload as AnyRecord;
  if (typeof payload !== "string") return {};

  try {
    const parsed = JSON.parse(payload);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}
