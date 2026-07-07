import { approveLeave, getLeaves, rejectLeave } from "../../../services/leave";
import { formatDateTimeFull } from "../../../utils/format";
import { leaveTypeMap } from "../../../utils/status-map";

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
    items: [] as AnyRecord[]
  },
  onShow() {
    this.load();
  },
  onPullDownRefresh() {
    this.load().finally(() => wx.stopPullDownRefresh());
  },
  async load() {
    const data = await getLeaves({ status: this.data.active });
    this.setData({
      items: (data.items || []).map((item: AnyRecord) => ({
        ...item,
        typeText: leaveTypeMap[item.leaveType] || "-",
        startText: formatDateTimeFull(item.startAt),
        endText: formatDateTimeFull(item.endAt)
      }))
    });
  },
  switchTab(event: AnyRecord) {
    this.setData({ active: event.currentTarget.dataset.key });
    this.load();
  },
  approve(event: AnyRecord) {
    const id = event.currentTarget.dataset.id;
    wx.showModal({
      title: "审核通过",
      content: "审核通过前后端会再次检查订单冲突，确认通过？",
      confirmColor: "#22C55E",
      success: async (res: AnyRecord) => {
        if (!res.confirm) return;
        await approveLeave(id);
        wx.showToast({ title: "已通过", icon: "success" });
        this.load();
      }
    });
  },
  reject(event: AnyRecord) {
    const id = event.currentTarget.dataset.id;
    wx.showModal({
      title: "驳回请假",
      editable: true,
      placeholderText: "请输入驳回原因",
      confirmColor: "#EF4444",
      success: async (res: AnyRecord) => {
        if (!res.confirm) return;
        const reason = (res.content || "").trim();
        if (!reason) {
          wx.showToast({ title: "驳回原因不能为空", icon: "none" });
          return;
        }
        await rejectLeave(id, reason);
        wx.showToast({ title: "已驳回", icon: "success" });
        this.load();
      }
    });
  }
});
