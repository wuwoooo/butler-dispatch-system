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
        recommendation: {},
        selectedIds: [],
        multiSelectEnabled: false,
        settlementAmount: "",
        defaultSettlementAmount: "",
        settlementAmountsByVehicleType: {},
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
            recommendation: available.recommendation || {},
            multiSelectEnabled: false,
            sections: buildSections(order, available.recommendation),
            settlementAmount: order.settlementAmount === null || order.settlementAmount === undefined
                ? String(available.defaultSettlementAmount || "")
                : Number(order.settlementAmount).toFixed(2),
            defaultSettlementAmount: String(available.defaultSettlementAmount || ""),
            settlementAmountsByVehicleType: available.settlementAmountsByVehicleType || {},
            canDispatch: ["pending_dispatch", "partial_rejected"].includes(order.status)
        });
    },
    onAmountInput(event) {
        this.setData({ settlementAmount: String(event.detail.value || "") });
    },
    selectButler(event) {
        const item = event.detail;
        if (!(item === null || item === void 0 ? void 0 : item.id) || item.available === false)
            return;
        const currentSelectedIds = this.data.selectedIds;
        const selectedIds = currentSelectedIds.includes(item.id)
            ? currentSelectedIds.filter((id) => id !== item.id)
            : this.data.multiSelectEnabled
                ? [...currentSelectedIds, item.id]
                : [item.id];
        const nextData = {
            selectedIds,
            candidates: this.data.candidates.map((candidate) => (Object.assign(Object.assign({}, candidate), { selected: selectedIds.includes(candidate.id) })))
        };
        nextData.settlementAmount = getSettlementAmountForSelection({
            candidates: this.data.candidates,
            selectedIds,
            recommendation: this.data.recommendation,
            defaultSettlementAmount: this.data.defaultSettlementAmount,
            settlementAmountsByVehicleType: this.data.settlementAmountsByVehicleType
        });
        this.setData(nextData);
    },
    onMultiSelectChange(event) {
        const multiSelectEnabled = Boolean(event.detail.value);
        const currentSelectedIds = this.data.selectedIds;
        const selectedIds = !multiSelectEnabled && currentSelectedIds.length > 1
            ? currentSelectedIds.slice(-1)
            : currentSelectedIds;
        const nextData = {
            multiSelectEnabled,
            selectedIds,
            candidates: this.data.candidates.map((candidate) => (Object.assign(Object.assign({}, candidate), { selected: selectedIds.includes(candidate.id) })))
        };
        if (selectedIds !== currentSelectedIds) {
            nextData.settlementAmount = getSettlementAmountForSelection({
                candidates: this.data.candidates,
                selectedIds,
                recommendation: this.data.recommendation,
                defaultSettlementAmount: this.data.defaultSettlementAmount,
                settlementAmountsByVehicleType: this.data.settlementAmountsByVehicleType
            });
        }
        this.setData(nextData);
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
        if (!/^(0|[1-9]\d{0,9})(\.\d{1,2})?$/.test(this.data.settlementAmount)) {
            wx.showToast({ title: "请填写正确的收费金额", icon: "none" });
            return;
        }
        const selectedNames = this.data.candidates
            .filter((item) => this.data.selectedIds.includes(item.id))
            .map((item) => item.name)
            .join("、");
        wx.showModal({
            title: "提交派单",
            content: `确认派给 ${selectedNames}？收费金额 ¥${Number(this.data.settlementAmount).toFixed(2)}`,
            confirmColor: "#2AACE2",
            success: async (res) => {
                if (!res.confirm)
                    return;
                await (0, dispatch_1.dispatchOrder)(this.data.orderId, this.data.selectedIds, this.data.settlementAmount);
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
function buildSections(order, recommendation) {
    var _a;
    const transport = order.serviceMode === "transport";
    const transportType = formatTransportType(order.pickupType, order.transportDirection);
    return [
        {
            title: "订单信息",
            rows: [
                ["订单编号", order.orderNo],
                ["酒店名称", (_a = order.hotel) === null || _a === void 0 ? void 0 : _a.name],
                ["订单状态", (0, status_map_1.getStatus)("order", order.status).text],
                ["客人姓名", `${order.guestName || "-"} · ${order.guestCount || 0}人`],
                ["收费金额", order.settlementAmount === null || order.settlementAmount === undefined ? "-" : `¥${Number(order.settlementAmount).toFixed(2)}`]
            ]
        },
        {
            title: transport ? "接送任务" : "入住与接站",
            rows: transport
                ? [
                    ["接送类型", transportType],
                    ["开始时间", (0, format_1.formatDateTimeFull)(order.serviceStartAt)],
                    ["预计结束", (0, format_1.formatDateTimeFull)(order.serviceEndAt)],
                    ["接送地点", order.arrivalStation || "-"],
                    ["原表车型", order.requestedVehicleInfo || "-"],
                    [
                        "推荐车型",
                        `${{ sedan: "轿车", suv: "SUV", business: "商务车" }[recommendation === null || recommendation === void 0 ? void 0 : recommendation.vehicleType] || "-"}${(recommendation === null || recommendation === void 0 ? void 0 : recommendation.source) ? `（${recommendation.source === "order_request" ? "按原表车型" : "按接送人数"}）` : ""}`
                    ]
                ]
                : [
                    ["入住日期", (0, format_1.formatDateFull)(order.checkInDate)],
                    ["离店日期", (0, format_1.formatDateFull)(order.checkOutDate)],
                    ["接站方案", status_map_1.pickupTypeMap[order.pickupType] || "-"],
                    ["到达时间", (0, format_1.formatDateTimeFull)(order.arrivalTime)]
                ]
        }
    ];
}
function formatTransportType(pickupType, direction) {
    if (pickupType === "airport")
        return direction === "pickup" ? "接机" : "送机";
    return direction === "pickup" ? "接站" : "送站";
}
function getSettlementAmountForSelection(input) {
    var _a;
    if (input.selectedIds.length === 0) {
        return input.defaultSettlementAmount;
    }
    const selectedVehicleTypes = input.candidates
        .filter((candidate) => input.selectedIds.includes(candidate.id))
        .map((candidate) => candidate.vehicleType);
    const fallbackVehicleType = ((_a = input.recommendation) === null || _a === void 0 ? void 0 : _a.vehicleType) || "sedan";
    if (selectedVehicleTypes.length === 0) {
        return input.defaultSettlementAmount;
    }
    return selectedVehicleTypes
        .reduce((total, vehicleType) => {
        const amount = input.settlementAmountsByVehicleType[vehicleType || fallbackVehicleType];
        return total + Number(amount || 0);
    }, 0)
        .toFixed(2);
}
