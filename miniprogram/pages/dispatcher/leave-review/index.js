"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const leave_1 = require("../../../services/leave");
const format_1 = require("../../../utils/format");
const status_map_1 = require("../../../utils/status-map");
const tabs = [
    { key: "pending", text: "待审核" },
    { key: "approved", text: "已通过" },
    { key: "rejected", text: "已驳回" },
    { key: "active", text: "请假中" },
    { key: "finished", text: "已结束" }
];
Page({
    data: {
        tabs,
        active: "pending",
        items: [],
        loading: true
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
            const data = await (0, leave_1.getLeaves)({ status: this.data.active });
            this.setData({
                items: (data.items || []).map((item) => (Object.assign(Object.assign({}, item), { typeText: status_map_1.leaveTypeMap[item.leaveType] || "-", startText: (0, format_1.formatDateTimeFull)(item.startAt), endText: (0, format_1.formatDateTimeFull)(item.endAt) })))
            });
        }
        catch (_a) {
            // 接口提示
        }
        finally {
            this.setData({ loading: false });
        }
    },
    switchTab(event) {
        this.setData({ active: event.currentTarget.dataset.key });
        this.load();
    },
    lastApproveTime: 0,
    lastRejectTime: 0,
    approve(event) {
        const now = Date.now();
        if (now - this.lastApproveTime < 1000)
            return;
        this.lastApproveTime = now;
        const id = event.currentTarget.dataset.id;
        wx.showModal({
            title: "审核通过",
            content: "确认通过该请假申请？审核前会再次自动校核时间冲突。",
            confirmColor: "#10B981",
            success: async (res) => {
                if (!res.confirm)
                    return;
                await (0, leave_1.approveLeave)(id);
                wx.showToast({ title: "已通过", icon: "success" });
                this.load();
            }
        });
    },
    reject(event) {
        const now = Date.now();
        if (now - this.lastRejectTime < 1000)
            return;
        this.lastRejectTime = now;
        const id = event.currentTarget.dataset.id;
        wx.showModal({
            title: "驳回请假",
            editable: true,
            placeholderText: "请输入驳回原因",
            confirmColor: "#EF4444",
            success: async (res) => {
                if (!res.confirm)
                    return;
                const reason = (res.content || "").trim();
                if (!reason) {
                    wx.showToast({ title: "驳回原因不能为空", icon: "none" });
                    return;
                }
                await (0, leave_1.rejectLeave)(id, reason);
                wx.showToast({ title: "已驳回", icon: "success" });
                this.load();
            }
        });
    }
});
