import { submitLeave } from "../../../services/leave";
import { leaveTypes } from "../../../utils/constants";
import { ensureEndAfterStart, requireField } from "../../../utils/validators";

Page({
  data: {
    leaveTypes,
    leaveTypeIndex: -1, // 默认 -1 代表未选择
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    reason: "",
    submitting: false
  },
  setStartDate(event: AnyRecord) {
    this.setData({ startDate: event.detail.value });
  },
  setStartTime(event: AnyRecord) {
    this.setData({ startTime: event.detail.value });
  },
  setEndDate(event: AnyRecord) {
    this.setData({ endDate: event.detail.value });
  },
  setEndTime(event: AnyRecord) {
    this.setData({ endTime: event.detail.value });
  },
  setType(event: AnyRecord) {
    this.setData({ leaveTypeIndex: Number(event.detail.value) });
  },
  setReason(event: AnyRecord) {
    this.setData({ reason: event.detail.value });
  },
  lastSubmitTime: 0,
  handleSubmit() {
    if (this.data.submitting) return;
    const now = Date.now();
    if (now - this.lastSubmitTime < 1000) return;
    this.lastSubmitTime = now;

    const start = `${this.data.startDate}T${this.data.startTime || "00:00"}:00`;
    const end = `${this.data.endDate}T${this.data.endTime || "23:59"}:00`;
    if (!requireField(this.data.startDate, "请选择请假开始日期")) return;
    if (!requireField(this.data.endDate, "请选择请假结束日期")) return;
    if (!ensureEndAfterStart(start, end)) return;
    if (this.data.leaveTypeIndex === -1) {
      wx.showToast({ title: "请选择请假类型", icon: "none" });
      return;
    }
    if (!requireField(this.data.reason, "请输入请假原因")) return;

    wx.showModal({
      title: "提交请假申请",
      content: "提交后将由调配员审核，确认提交？",
      confirmColor: "#2AACE2",
      success: async (res: AnyRecord) => {
        if (!res.confirm) return;
        this.setData({ submitting: true });
        try {
          await submitLeave({
            leaveStartTime: start,
            leaveEndTime: end,
            leaveType: leaveTypes[this.data.leaveTypeIndex].value,
            reason: this.data.reason
          });
          wx.showToast({ title: "已提交", icon: "success" });
          wx.redirectTo({ url: "/pages/butler/leave-records/index" });
        } catch {
          // 接口自带提示
        } finally {
          this.setData({ submitting: false });
        }
      }
    });
  }
});
