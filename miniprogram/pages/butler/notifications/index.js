"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const notification_1 = require("../../../services/notification");
const notification_navigation_1 = require("../../../utils/notification-navigation");
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
        const url = (0, notification_navigation_1.resolveNotificationUrl)(item, "butler");
        if (url) {
            wx.navigateTo({ url });
            return;
        }
        this.load();
    },
    lastReadAllTime: 0,
    readAll() {
        const now = Date.now();
        if (now - this.lastReadAllTime < 1000)
            return;
        this.lastReadAllTime = now;
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
