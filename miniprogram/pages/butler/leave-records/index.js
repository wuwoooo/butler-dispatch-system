"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const leave_1 = require("../../../services/leave");
const format_1 = require("../../../utils/format");
const status_map_1 = require("../../../utils/status-map");
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
        const data = await (0, leave_1.getMyLeaves)();
        this.setData({
            items: (data.items || []).map((item) => (Object.assign(Object.assign({}, item), { typeText: status_map_1.leaveTypeMap[item.leaveType] || "-", startText: (0, format_1.formatDateTimeFull)(item.startAt), endText: (0, format_1.formatDateTimeFull)(item.endAt), reviewedText: (0, format_1.formatDateTimeFull)(item.reviewedAt) })))
        });
    },
    lastCancelTime: 0,
    cancel(event) {
        const now = Date.now();
        if (now - this.lastCancelTime < 1000)
            return;
        this.lastCancelTime = now;
        const id = event.currentTarget.dataset.id;
        wx.showModal({
            title: "撤销请假",
            content: "仅待审核请假可以撤销，确认撤销？",
            confirmColor: "#EF4444",
            success: async (res) => {
                if (!res.confirm)
                    return;
                await (0, leave_1.cancelLeave)(id);
                wx.showToast({ title: "已撤销", icon: "success" });
                this.load();
            }
        });
    },
    apply() {
        wx.navigateTo({ url: "/pages/butler/leave-apply/index" });
    }
});
