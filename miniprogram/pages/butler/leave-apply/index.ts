import { submitLeave } from "../../../services/leave";
import { leaveTypes } from "../../../utils/constants";
import { ensureEndAfterStart, requireField } from "../../../utils/validators";

Page({
  data: {
    leaveTypes,
    leaveTypeIndex: 0,
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    reason: ""
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
  handleSubmit() {
    const start = `${this.data.startDate}T${this.data.startTime || "00:00"}:00`;
    const end = `${this.data.endDate}T${this.data.endTime || "23:59"}:00`;
    if (!requireField(this.data.startDate, "请选择请假开始日期")) return;
    if (!requireField(this.data.endDate, "请选择请假结束日期")) return;
    if (!ensureEndAfterStart(start, end)) return;
    if (!requireField(this.data.reason, "请输入请假原因")) return;

    wx.showModal({
      title: "提交请假申请",
      content: "提交后将由调配员审核，确认提交？",
      success: async (res: AnyRecord) => {
        if (!res.confirm) return;
        await submitLeave({
          leaveStartTime: start,
          leaveEndTime: end,
          leaveType: leaveTypes[this.data.leaveTypeIndex].value,
          reason: this.data.reason
        });
        wx.showToast({ title: "已提交", icon: "success" });
        wx.redirectTo({ url: "/pages/butler/leave-records/index" });
      }
    });
  }
});

