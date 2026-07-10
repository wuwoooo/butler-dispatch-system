"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveNotificationUrl = resolveNotificationUrl;
function resolveNotificationUrl(item, role) {
    var _a, _b;
    const payload = normalizePayload(item.payload);
    const orderId = payload.orderId || (item.targetType === "ServiceOrder" ? item.targetId : "");
    const assignmentId = payload.assignmentId || (item.targetType === "OrderButlerAssignment" ? item.targetId : "");
    const leaveId = payload.leaveId || (item.targetType === "ButlerLeave" ? item.targetId : "");
    const butlerId = payload.butlerId || (item.targetType === "Butler" ? item.targetId : "");
    if (role === "butler") {
        if (orderId) {
            const query = assignmentId ? `&assignmentId=${assignmentId}` : "";
            return `/pages/butler/order-detail/index?orderId=${orderId}${query}`;
        }
        if (leaveId || ((_a = item.type) === null || _a === void 0 ? void 0 : _a.startsWith("leave_"))) {
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
    if (leaveId || ((_b = item.type) === null || _b === void 0 ? void 0 : _b.startsWith("leave_"))) {
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
function normalizePayload(payload) {
    if (!payload)
        return {};
    if (typeof payload === "object")
        return payload;
    if (typeof payload !== "string")
        return {};
    try {
        const parsed = JSON.parse(payload);
        return parsed && typeof parsed === "object" ? parsed : {};
    }
    catch (_a) {
        return {};
    }
}
