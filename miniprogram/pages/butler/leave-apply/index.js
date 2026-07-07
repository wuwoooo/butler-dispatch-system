"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const leave_1 = require("../../../services/leave");
const constants_1 = require("../../../utils/constants");
const validators_1 = require("../../../utils/validators");
Page({
    data: {
        leaveTypes: constants_1.leaveTypes,
        leaveTypeIndex: 0,
        startDate: "",
        startTime: "",
        endDate: "",
        endTime: "",
        reason: ""
    },
    setStartDate(event) {
        this.setData({ startDate: event.detail.value });
    },
    setStartTime(event) {
        this.setData({ startTime: event.detail.value });
    },
    setEndDate(event) {
        this.setData({ endDate: event.detail.value });
    },
    setEndTime(event) {
        this.setData({ endTime: event.detail.value });
    },
    setType(event) {
        this.setData({ leaveTypeIndex: Number(event.detail.value) });
    },
    setReason(event) {
        this.setData({ reason: event.detail.value });
    },
    handleSubmit() {
        const start = `${this.data.startDate}T${this.data.startTime || "00:00"}:00`;
        const end = `${this.data.endDate}T${this.data.endTime || "23:59"}:00`;
        if (!(0, validators_1.requireField)(this.data.startDate, "请选择请假开始日期"))
            return;
        if (!(0, validators_1.requireField)(this.data.endDate, "请选择请假结束日期"))
            return;
        if (!(0, validators_1.ensureEndAfterStart)(start, end))
            return;
        if (!(0, validators_1.requireField)(this.data.reason, "请输入请假原因"))
            return;
        wx.showModal({
            title: "提交请假申请",
            content: "提交后将由调配员审核，确认提交？",
            success: async (res) => {
                if (!res.confirm)
                    return;
                await (0, leave_1.submitLeave)({
                    leaveStartTime: start,
                    leaveEndTime: end,
                    leaveType: constants_1.leaveTypes[this.data.leaveTypeIndex].value,
                    reason: this.data.reason
                });
                wx.showToast({ title: "已提交", icon: "success" });
                wx.redirectTo({ url: "/pages/butler/leave-records/index" });
            }
        });
    }
});
