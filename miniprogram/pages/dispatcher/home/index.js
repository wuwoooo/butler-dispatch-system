"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const statistics_1 = require("../../../services/statistics");
const format_1 = require("../../../utils/format");
Page({
    data: {
        today: (0, format_1.todayText)(),
        user: {},
        cards: {},
        orders: [],
        shortcuts: [
            { title: "订单调配", desc: "处理待分配订单", url: "/pages/dispatcher/orders/index" },
            { title: "管家状态", desc: "查看可用人手", url: "/pages/dispatcher/butlers/index" },
            { title: "请假审核", desc: "审核请假申请", url: "/pages/dispatcher/leave-review/index" },
            { title: "消息通知", desc: "查看提醒事项", url: "/pages/dispatcher/notifications/index" }
        ]
    },
    onShow() {
        this.load();
    },
    async load() {
        const data = await (0, statistics_1.getDispatcherDashboard)();
        this.setData({
            user: wx.getStorageSync("user") || {},
            cards: data.cards || {},
            orders: data.priorityOrders || []
        });
    },
    openShortcut(event) {
        wx.navigateTo({ url: event.currentTarget.dataset.url });
    },
    openOrder(event) {
        const detail = event.detail || {};
        wx.navigateTo({ url: `/pages/dispatcher/dispatch-detail/index?orderId=${detail.orderId}` });
    }
});
