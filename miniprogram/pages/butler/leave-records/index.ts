import { cancelLeave, getMyLeaves } from "../../../services/leave";
import { formatDateTimeFull } from "../../../utils/format";
import { leaveTypeMap } from "../../../utils/status-map";

Page({
  data: {
    items: [] as AnyRecord[]
  },
  onShow() {
    this.load();
  },
  onPullDownRefresh() {
    this.load().finally(() => wx.stopPullDownRefresh());
  },
  async load() {
    const data = await getMyLeaves();
    this.setData({
      items: (data.items || []).map((item: AnyRecord) => ({
        ...item,
        typeText: leaveTypeMap[item.leaveType] || "-",
        startText: formatDateTimeFull(item.startAt),
        endText: formatDateTimeFull(item.endAt),
        reviewedText: formatDateTimeFull(item.reviewedAt)
      }))
    });
  },
  lastCancelTime: 0,
  cancel(event: AnyRecord) {
    const now = Date.now();
    if (now - this.lastCancelTime < 1000) return;
    this.lastCancelTime = now;

    const id = event.currentTarget.dataset.id;
    wx.showModal({
      title: "撤销请假",
      content: "仅待审核请假可以撤销，确认撤销？",
      confirmColor: "#EF4444",
      success: async (res: AnyRecord) => {
        if (!res.confirm) return;
        await cancelLeave(id);
        wx.showToast({ title: "已撤销", icon: "success" });
        this.load();
      }
    });
  },
  apply() {
    wx.navigateTo({ url: "/pages/butler/leave-apply/index" });
  }
});
