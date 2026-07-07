"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dispatch_1 = require("../../../services/dispatch");
const order_1 = require("../../../services/order");
const format_1 = require("../../../utils/format");
const status_map_1 = require("../../../utils/status-map");
Page({
    data: {
        orderId: "",
        order: {},
        assigned: [],
        candidates: [],
        selectedIds: [],
        sections: [],
        canDispatch: false
    },
    onLoad(query) {
        this.setData({ orderId: query.orderId || "" });
        this.load();
    },
    async load() {
        const [order, available] = await Promise.all([
            (0, order_1.getOrderDetail)(this.data.orderId),
            (0, dispatch_1.getAvailableButlers)(this.data.orderId)
        ]);
        this.setData({
            order,
            assigned: (order.assignments || []).map((item) => {
                var _a;
                return (Object.assign(Object.assign({}, item), { avatar: (((_a = item.butler) === null || _a === void 0 ? void 0 : _a.name) || "?").slice(0, 1) }));
            }),
            candidates: (available.items || []).map((item) => (Object.assign(Object.assign({}, item), { selected: this.data.selectedIds.includes(item.id) }))),
            sections: buildSections(order),
            canDispatch: ["pending_dispatch", "partial_rejected"].includes(order.status)
        });
    },
    toggleButler(event) {
        const item = event.detail;
        if (item.available === false)
            return;
        const selected = new Set(this.data.selectedIds);
        if (selected.has(item.id))
            selected.delete(item.id);
        else
            selected.add(item.id);
        const selectedIds = Array.from(selected);
        this.setData({
            selectedIds,
            candidates: this.data.candidates.map((candidate) => (Object.assign(Object.assign({}, candidate), { selected: selectedIds.includes(candidate.id) })))
        });
    },
    lastSubmitTime: 0,
    lastCancelTime: 0,
    submit() {
        const now = Date.now();
        if (now - this.lastSubmitTime < 1000)
            return;
        this.lastSubmitTime = now;
        if (!this.data.canDispatch) {
            wx.showToast({ title: "请先取消当前待接单派单", icon: "none" });
            return;
        }
        if (this.data.selectedIds.length === 0) {
            wx.showToast({ title: "请至少选择一名管家", icon: "none" });
            return;
        }
        wx.showModal({
            title: "提交派单",
            content: `确认派给 ${this.data.selectedIds.length} 名管家？`,
            confirmColor: "#2AACE2",
            success: async (res) => {
                if (!res.confirm)
                    return;
                await (0, dispatch_1.dispatchOrder)(this.data.orderId, this.data.selectedIds);
                wx.showToast({ title: "派单成功", icon: "success" });
                this.setData({ selectedIds: [] });
                this.load();
            }
        });
    },
    cancelAssignment(event) {
        const now = Date.now();
        if (now - this.lastCancelTime < 1000)
            return;
        this.lastCancelTime = now;
        const assignmentId = event.currentTarget.dataset.id;
        wx.showModal({
            title: "取消派单",
            content: "取消后订单可重新进入待分配状态，确认取消？",
            confirmText: "确认取消",
            confirmColor: "#EF4444",
            success: async (res) => {
                if (!res.confirm)
                    return;
                await (0, dispatch_1.cancelDispatchAssignment)(this.data.orderId, assignmentId, "小程序取消待接单派单");
                wx.showToast({ title: "已取消", icon: "success" });
                this.setData({ selectedIds: [] });
                this.load();
            }
        });
    }
});
function buildSections(order) {
    var _a;
    return [
        {
            title: "订单信息",
            rows: [
                ["订单编号", order.orderNo],
                ["酒店名称", (_a = order.hotel) === null || _a === void 0 ? void 0 : _a.name],
                ["订单状态", (0, status_map_1.getStatus)("order", order.status).text],
                ["客人姓名", `${order.guestName || "-"} · ${order.guestCount || 0}人`]
            ]
        },
        {
            title: "入住与接站",
            rows: [
                ["入住日期", (0, format_1.formatDateFull)(order.checkInDate)],
                ["离店日期", (0, format_1.formatDateFull)(order.checkOutDate)],
                ["接站方案", status_map_1.pickupTypeMap[order.pickupType] || "-"],
                ["到达时间", (0, format_1.formatDateTimeFull)(order.arrivalTime)]
            ]
        }
    ];
}
