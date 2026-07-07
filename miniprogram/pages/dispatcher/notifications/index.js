"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const notification_1 = require("../../../services/notification");
Page({
    data: {
        items: []
    },
    onShow() {
        this.load();
    },
    onPullDownRefresh() {
        this.load().finally(() => wx.stopPullDownRefresh());
    },
    async load() {
        const data = await (0, notification_1.getNotifications)();
        this.setData({ items: data.items || [] });
    },
    async open(event) {
        const item = event.detail;
        await (0, notification_1.readNotification)(item.id);
        if (item.targetType === "ServiceOrder" && item.targetId) {
            wx.navigateTo({ url: `/pages/dispatcher/dispatch-detail/index?orderId=${item.targetId}` });
            return;
        }
        this.load();
    },
    readAll() {
        wx.showModal({
            title: "全部已读",
            content: "确认将所有通知标记为已读？",
            success: async (res) => {
                if (!res.confirm)
                    return;
                await (0, notification_1.readAllNotifications)();
                this.load();
            }
        });
    }
});
