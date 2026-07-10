"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const order_1 = require("../../../services/order");
const business_dict_1 = require("../../../services/business-dict");
const format_1 = require("../../../utils/format");
const status_map_1 = require("../../../utils/status-map");
Page({
    data: {
        orderId: "",
        assignmentId: "",
        order: {},
        assignment: {},
        sections: [],
        reviews: [],
        actions: [],
        rejectReasons: [],
        occurredAtPicker: { visible: false, title: "" },
        currentStep: 0 // 1: 待接单, 2: 准备中, 3: 服务中, 4: 已完成
    },
    // 增加时间戳防抖防连击
    lastActionTime: 0,
    lastRejectTime: 0,
    occurredAtPickerResolver: null,
    onLoad(query) {
        this.setData({ orderId: query.orderId || "", assignmentId: query.assignmentId || "" });
        this.loadRejectReasons();
        this.load();
    },
    async loadRejectReasons() {
        try {
            const data = await (0, business_dict_1.getBusinessDictItems)("reject_reason");
            this.setData({ rejectReasons: (data.items || []).map((item) => item.label) });
        }
        catch (_a) {
            this.setData({ rejectReasons: [] });
        }
    },
    async load() {
        var _a;
        try {
            const order = await (0, order_1.getOrderDetail)(this.data.orderId);
            const assignment = ((_a = order.assignments) === null || _a === void 0 ? void 0 : _a.find((item) => item.id === this.data.assignmentId)) ||
                {};
            let currentStep = 0;
            if (assignment.status === "pending_confirm") {
                currentStep = 1;
            }
            else if (assignment.status === "confirmed") {
                currentStep = 2;
            }
            else if (["picked_guest", "in_service"].includes(assignment.status)) {
                currentStep = 3;
            }
            else if (assignment.status === "completed") {
                currentStep = 4;
            }
            this.setData({
                order,
                assignment,
                sections: buildSections(order, assignment),
                reviews: buildReviews(order.reviews || [], assignment.id),
                actions: buildActions(order, assignment),
                currentStep
            });
        }
        catch (_b) {
            // request 层已提示错误。
        }
    },
    async doAction(event) {
        const now = Date.now();
        if (now - this.lastActionTime < 1000)
            return;
        this.lastActionTime = now;
        const action = event.currentTarget.dataset.action;
        const config = {
            confirm: { title: "确认接单", content: "确认接受该订单？", api: () => (0, order_1.confirmOrder)(this.data.assignmentId) },
            picked: { title: "已接到客人", content: "确认已接到自己负责的客人后，订单将进入接待中状态。", api: (occurredAt) => (0, order_1.pickedGuest)(this.data.assignmentId, occurredAt) },
            complete: { title: "完成服务", content: "确认自己负责的客人已离店并完成服务？", api: (occurredAt) => (0, order_1.completeOrder)(this.data.assignmentId, occurredAt) }
        };
        const item = config[action];
        if (!item)
            return;
        const warning = buildEarlyActionWarning(action, this.data.order);
        wx.showModal({
            title: (warning === null || warning === void 0 ? void 0 : warning.title) || item.title,
            content: (warning === null || warning === void 0 ? void 0 : warning.content) || item.content,
            confirmColor: "#2AACE2",
            confirmText: warning ? "仍要操作" : "确定",
            success: async (res) => {
                if (!res.confirm)
                    return;
                if (["picked", "complete"].includes(action)) {
                    const occurredAt = await this.chooseOccurredAt(action === "picked" ? "选择接到时间" : "选择完成时间");
                    if (!occurredAt)
                        return;
                    await item.api(occurredAt);
                }
                else {
                    await item.api();
                }
                wx.showToast({ title: "操作成功", icon: "success" });
                this.load();
            }
        });
    },
    reject() {
        const now = Date.now();
        if (now - this.lastRejectTime < 1000)
            return;
        this.lastRejectTime = now;
        const rejectReasons = this.data.rejectReasons;
        if (rejectReasons.length === 0) {
            wx.showToast({ title: "暂无可用拒单原因", icon: "none" });
            return;
        }
        wx.showActionSheet({
            itemList: rejectReasons,
            success: (res) => {
                const preset = rejectReasons[res.tapIndex] || "";
                this.inputRejectReason(preset === "其他" ? "" : preset);
            }
        });
    },
    inputRejectReason(reason) {
        wx.showModal({
            title: "拒单确认",
            editable: true,
            placeholderText: "请输入拒单原因",
            content: reason,
            confirmColor: "#EF4444",
            success: async (res) => {
                if (!res.confirm)
                    return;
                const rejectReason = (res.content || reason || "").trim();
                if (!rejectReason) {
                    wx.showToast({ title: "拒单原因不能为空", icon: "none" });
                    return;
                }
                await (0, order_1.rejectOrder)(this.data.assignmentId, rejectReason);
                wx.showToast({ title: "已拒单", icon: "success" });
                wx.navigateBack();
            }
        });
    },
    chooseOccurredAt(title) {
        return new Promise((resolve) => {
            this.occurredAtPickerResolver = resolve;
            this.setData({ occurredAtPicker: { visible: true, title } });
        });
    },
    handleOccurredAtConfirm(event) {
        var _a;
        const resolve = this.occurredAtPickerResolver;
        this.occurredAtPickerResolver = null;
        this.setData({ occurredAtPicker: { visible: false, title: "" } });
        resolve === null || resolve === void 0 ? void 0 : resolve(((_a = event.detail) === null || _a === void 0 ? void 0 : _a.occurredAt) || null);
    },
    handleOccurredAtCancel() {
        const resolve = this.occurredAtPickerResolver;
        this.occurredAtPickerResolver = null;
        this.setData({ occurredAtPicker: { visible: false, title: "" } });
        resolve === null || resolve === void 0 ? void 0 : resolve(null);
    }
});
function buildSections(order, assignment) {
    var _a;
    const assignmentRows = [
        ["指派状态", (0, status_map_1.getStatus)("assignment", assignment.status).text],
        ["接单时间", (0, format_1.formatDateTimeFull)(assignment.confirmedAt)],
        ["接到时间", (0, format_1.formatDateTimeFull)(assignment.pickedGuestAt)],
        ["完成时间", (0, format_1.formatDateTimeFull)(assignment.completedAt)]
    ];
    if (assignment.status === "rejected") {
        assignmentRows.push(["拒单时间", (0, format_1.formatDateTimeFull)(assignment.rejectedAt)], ["拒单理由", assignment.rejectReason || "-"]);
    }
    return [
        {
            title: "订单信息",
            rows: [
                ["订单编号", order.orderNo],
                ["酒店名称", (_a = order.hotel) === null || _a === void 0 ? void 0 : _a.name],
                ["订单状态", (0, status_map_1.getStatus)("order", order.status).text]
            ]
        },
        {
            title: "客人信息",
            rows: [
                ["客人姓名", order.guestName],
                ["联系电话", (0, format_1.maskPhone)(order.guestPhone)],
                ["接待人数", `${order.guestCount || 0}人`]
            ]
        },
        {
            title: "入住与接站",
            rows: [
                ["入住日期", (0, format_1.formatDateFull)(order.checkInDate)],
                ["离店日期", (0, format_1.formatDateFull)(order.checkOutDate)],
                ["房间信息", `${order.roomType || "-"} / ${order.roomNo || "-"}`],
                ["接站方案", status_map_1.pickupTypeMap[order.pickupType] || "-"],
                ["到达时间", (0, format_1.formatDateTimeFull)(order.arrivalTime)],
                ["航班车次", order.flightTrainNo || "-"]
            ]
        },
        {
            title: "任务分配",
            rows: assignmentRows
        },
        {
            title: "备注详情",
            rows: [
                ["特殊要求", order.specialNeeds || "-"],
                ["其他备注", order.remark || "-"]
            ]
        }
    ];
}
function buildActions(order, assignment) {
    if (assignment.status === "pending_confirm") {
        return [
            { text: "确认接单", action: "confirm", tone: "primary" },
            { text: "拒绝指派", action: "reject", tone: "danger", reject: true }
        ];
    }
    if (assignment.status === "confirmed") {
        return [{ text: "已接到客人", action: "picked", tone: "success" }];
    }
    if (["picked_guest", "in_service"].includes(assignment.status) || order.status === "partial_completed") {
        return [{ text: "确认客人离店，完成服务", action: "complete", tone: "primary" }];
    }
    return [];
}
function buildReviews(reviews, assignmentId) {
    return reviews
        .filter((item) => item.assignmentId === assignmentId)
        .map((item) => {
        var _a;
        return (Object.assign(Object.assign({}, item), { reviewerRoleText: status_map_1.roleMap[item.reviewerRole] || item.reviewerRole || "-", reviewerName: ((_a = item.reviewer) === null || _a === void 0 ? void 0 : _a.name) || "-", reviewedAtText: (0, format_1.formatDateTimeFull)(item.createdAt), tagsText: Array.isArray(item.tags) ? item.tags.join("、") : "" }));
    });
}
function buildEarlyActionWarning(action, order) {
    if (action === "picked" && isBefore(order.arrivalTime)) {
        return {
            title: "到达时间未到",
            content: `当前时间早于客人到达时间（${(0, format_1.formatDateTimeFull)(order.arrivalTime)}）。请确认已实际接到客人后再继续，是否仍要标记为“已接到客人”？`
        };
    }
    if (action === "complete" && isBefore(order.checkOutDate)) {
        return {
            title: "离店时间未到",
            content: `当前时间早于客人离店时间（${(0, format_1.formatDateTimeFull)(order.checkOutDate)}）。请确认客人已实际离店且服务完成，是否仍要标记为“已完成接待”？`
        };
    }
    return null;
}
function isBefore(value) {
    if (!value)
        return false;
    const date = typeof value === "string" ? new Date(value) : value;
    if (Number.isNaN(date.getTime()))
        return false;
    return Date.now() < date.getTime();
}
