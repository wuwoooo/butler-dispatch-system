"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const order_1 = require("../../../services/order");
const format_1 = require("../../../utils/format");
const status_map_1 = require("../../../utils/status-map");
const constants_1 = require("../../../utils/constants");
Page({
    data: {
        orderId: "",
        assignmentId: "",
        order: {},
        assignment: {},
        sections: [],
        actions: []
    },
    onLoad(query) {
        this.setData({ orderId: query.orderId || "", assignmentId: query.assignmentId || "" });
        this.load();
    },
    async load() {
        var _a;
        try {
            const order = await (0, order_1.getOrderDetail)(this.data.orderId);
            const assignment = ((_a = order.assignments) === null || _a === void 0 ? void 0 : _a.find((item) => item.id === this.data.assignmentId)) ||
                {};
            this.setData({
                order,
                assignment,
                sections: buildSections(order, assignment),
                actions: buildActions(order, assignment)
            });
        }
        catch (_b) {
            // request 层已提示错误。
        }
    },
    doAction(event) {
        const action = event.currentTarget.dataset.action;
        const config = {
            confirm: { title: "确认接单", content: "确认接受该订单？", api: () => (0, order_1.confirmOrder)(this.data.assignmentId) },
            picked: { title: "已接到客人", content: "确认已接到自己负责的客人后，订单将进入接待中状态。", api: () => (0, order_1.pickedGuest)(this.data.assignmentId) },
            complete: { title: "完成服务", content: "确认自己负责的客人已离店并完成服务？", api: () => (0, order_1.completeOrder)(this.data.assignmentId) }
        };
        const item = config[action];
        if (!item)
            return;
        wx.showModal({
            title: item.title,
            content: item.content,
            confirmColor: "#2F80ED",
            success: async (res) => {
                if (!res.confirm)
                    return;
                await item.api();
                wx.showToast({ title: "操作成功", icon: "success" });
                this.load();
            }
        });
    },
    reject() {
        wx.showActionSheet({
            itemList: constants_1.rejectReasons,
            success: (res) => {
                const preset = constants_1.rejectReasons[res.tapIndex] || "";
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
    }
});
function buildSections(order, assignment) {
    var _a;
    return [
        {
            title: "订单信息",
            rows: [
                ["订单编号", order.orderNo],
                ["酒店", (_a = order.hotel) === null || _a === void 0 ? void 0 : _a.name],
                ["订单状态", (0, status_map_1.getStatus)("order", order.status).text]
            ]
        },
        {
            title: "客人信息",
            rows: [
                ["客人姓名", order.guestName],
                ["客人手机号", (0, format_1.maskPhone)(order.guestPhone)],
                ["入住人数", `${order.guestCount || 0}人`]
            ]
        },
        {
            title: "入住与接站",
            rows: [
                ["入住日期", (0, format_1.formatDateFull)(order.checkInDate)],
                ["离店日期", (0, format_1.formatDateFull)(order.checkOutDate)],
                ["房型 / 房间", `${order.roomType || "-"} / ${order.roomNo || "-"}`],
                ["接站类型", status_map_1.pickupTypeMap[order.pickupType] || "-"],
                ["到达时间", (0, format_1.formatDateTimeFull)(order.arrivalTime)],
                ["航班/车次", order.flightTrainNo || "-"]
            ]
        },
        {
            title: "我的分配",
            rows: [
                ["分配状态", (0, status_map_1.getStatus)("assignment", assignment.status).text],
                ["确认时间", (0, format_1.formatDateTimeFull)(assignment.confirmedAt)],
                ["接到客人", (0, format_1.formatDateTimeFull)(assignment.pickedGuestAt)],
                ["完成时间", (0, format_1.formatDateTimeFull)(assignment.completedAt)]
            ]
        },
        {
            title: "备注",
            rows: [
                ["特殊需求", order.specialNeeds || "-"],
                ["订单备注", order.remark || "-"]
            ]
        }
    ];
}
function buildActions(order, assignment) {
    if (assignment.status === "pending_confirm") {
        return [
            { text: "确认接单", action: "confirm", tone: "primary" },
            { text: "拒单", action: "reject", tone: "danger", reject: true }
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
