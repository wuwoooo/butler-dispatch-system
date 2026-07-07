"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const statistics_1 = require("../../../services/statistics");
const REFRESH_INTERVAL_MS = 30000;
Page({
    refreshTimer: null,
    data: {
        today: "",
        user: {},
        cards: {},
        orders: [],
        refreshing: false,
        shortcuts: [
            { title: "订单调配", desc: "处理待分配订单", url: "/pages/dispatcher/orders/index", tone: "blue" },
            { title: "管家状态", desc: "查看可用人手", url: "/pages/dispatcher/butlers/index", tone: "green" },
            { title: "请假审核", desc: "审核请假申请", url: "/pages/dispatcher/leave-review/index", tone: "orange" },
            { title: "消息通知", desc: "查看提醒事项", url: "/pages/dispatcher/notifications/index", tone: "purple" }
        ]
    },
    onShow() {
        this.load();
        this.startAutoRefresh();
    },
    onHide() {
        this.stopAutoRefresh();
    },
    onUnload() {
        this.stopAutoRefresh();
    },
    onPullDownRefresh() {
        this.load().finally(() => wx.stopPullDownRefresh());
    },
    startAutoRefresh() {
        if (this.refreshTimer)
            return;
        this.refreshTimer = setInterval(() => {
            this.load(true);
        }, REFRESH_INTERVAL_MS);
    },
    stopAutoRefresh() {
        if (!this.refreshTimer)
            return;
        clearInterval(this.refreshTimer);
        this.refreshTimer = null;
    },
    handleRefresh() {
        this.load();
    },
    async load(silent = false) {
        if (this.data.refreshing)
            return;
        this.setData({ refreshing: true });
        try {
            const data = await (0, statistics_1.getDispatcherDashboard)();
            this.setData({
                today: buildTodayMessage(),
                user: wx.getStorageSync("user") || {},
                cards: data.cards || {},
                orders: data.priorityOrders || []
            });
        }
        catch (_a) {
            if (!silent) {
                wx.showToast({ title: "刷新失败，请稍后重试", icon: "none" });
            }
        }
        finally {
            this.setData({ refreshing: false });
        }
    },
    openShortcut(event) {
        wx.navigateTo({ url: event.currentTarget.dataset.url });
    },
    openOrder(event) {
        const detail = event.detail || {};
        wx.navigateTo({ url: `/pages/dispatcher/dispatch-detail/index?orderId=${detail.orderId}` });
    }
});
function buildTodayMessage() {
    const now = new Date();
    const hours = now.getHours();
    let greet = "你好";
    if (hours >= 5 && hours < 9) {
        greet = "早上好";
    }
    else if (hours >= 9 && hours < 12) {
        greet = "上午好";
    }
    else if (hours >= 12 && hours < 14) {
        greet = "中午好";
    }
    else if (hours >= 14 && hours < 18) {
        greet = "下午好";
    }
    else {
        greet = "晚上好";
    }
    const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
    return `${greet}，今天是${dateStr}。今日调配任务繁忙，请优先处理紧急业务。`;
}
