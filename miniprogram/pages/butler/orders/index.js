"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const order_1 = require("../../../services/order");
const constants_1 = require("../../../utils/constants");
const tabs = [
    { key: "pending", text: "待接单" },
    { key: "confirmedWaiting", text: "准备接待" },
    { key: "inService", text: "接待中" },
    { key: "completed", text: "已完成" },
    { key: "rejected", text: "已拒单" }
];
Page({
    data: {
        tabs,
        active: "pending",
        groups: {},
        items: [],
        loading: true
    },
    // 增加时间戳用于防抖防连击
    lastConfirmTime: 0,
    lastRejectTime: 0,
    onLoad(options) {
        if (tabs.some((item) => item.key === options.tab)) {
            this.setData({ active: options.tab });
        }
    },
    onShow() {
        this.load();
    },
    onPullDownRefresh() {
        this.load().finally(() => wx.stopPullDownRefresh());
    },
    async load() {
        this.setData({ loading: true });
        try {
            const data = await (0, order_1.getButlerOrders)();
            const groups = data.groups || {};
            this.setData({ groups, items: groups[this.data.active] || [] });
        }
        catch (_a) {
            // request 层已提示错误。
        }
        finally {
            this.setData({ loading: false });
        }
    },
    switchTab(event) {
        const active = event.currentTarget.dataset.key;
        this.setData({ active, items: this.data.groups[active] || [] });
    },
    openDetail(event) {
        const detail = event.detail || {};
        wx.navigateTo({
            url: `/pages/butler/order-detail/index?orderId=${detail.orderId}&assignmentId=${detail.assignmentId}`
        });
    },
    confirm(event) {
        const now = Date.now();
        if (now - this.lastConfirmTime < 1000)
            return;
        this.lastConfirmTime = now;
        const detail = event.detail || {};
        wx.showModal({
            title: "确认接单",
            content: `确认接受订单 ${detail.orderNo || ""}？`,
            confirmColor: "#2AACE2",
            success: async (res) => {
                if (!res.confirm)
                    return;
                await (0, order_1.confirmOrder)(detail.assignmentId);
                wx.showToast({ title: "已接单", icon: "success" });
                this.load();
            }
        });
    },
    reject(event) {
        const now = Date.now();
        if (now - this.lastRejectTime < 1000)
            return;
        this.lastRejectTime = now;
        const detail = event.detail || {};
        wx.showActionSheet({
            itemList: constants_1.rejectReasons,
            success: (res) => {
                const preset = constants_1.rejectReasons[res.tapIndex] || "";
                this.inputRejectReason(detail.assignmentId, preset === "其他" ? "" : preset);
            }
        });
    },
    inputRejectReason(assignmentId, reason) {
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
                await (0, order_1.rejectOrder)(assignmentId, rejectReason);
                wx.showToast({ title: "已拒单", icon: "success" });
                this.load();
            }
        });
    }
});
