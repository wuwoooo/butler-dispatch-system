import {
  completeOrder,
  confirmOrder,
  getOrderDetail,
  pickedGuest,
  rejectOrder
} from "../../../services/order";
import { formatDateFull, formatDateTimeFull, maskPhone } from "../../../utils/format";
import { getStatus, pickupTypeMap } from "../../../utils/status-map";
import { rejectReasons } from "../../../utils/constants";

Page({
  data: {
    orderId: "",
    assignmentId: "",
    order: {} as AnyRecord,
    assignment: {} as AnyRecord,
    sections: [] as AnyRecord[],
    actions: [] as AnyRecord[],
    currentStep: 0 // 1: 待接单, 2: 准备中, 3: 服务中, 4: 已完成
  },
  // 增加时间戳防抖防连击
  lastActionTime: 0,
  lastRejectTime: 0,
  onLoad(query: AnyRecord) {
    this.setData({ orderId: query.orderId || "", assignmentId: query.assignmentId || "" });
    this.load();
  },
  async load() {
    try {
      const order = await getOrderDetail(this.data.orderId);
      const assignment =
        order.assignments?.find((item: AnyRecord) => item.id === this.data.assignmentId) ||
        {};
      
      let currentStep = 0;
      if (assignment.status === "pending_confirm") {
        currentStep = 1;
      } else if (assignment.status === "confirmed") {
        currentStep = 2;
      } else if (["picked_guest", "in_service"].includes(assignment.status)) {
        currentStep = 3;
      } else if (assignment.status === "completed") {
        currentStep = 4;
      }

      this.setData({
        order,
        assignment,
        sections: buildSections(order, assignment),
        actions: buildActions(order, assignment),
        currentStep
      });
    } catch {
      // request 层已提示错误。
    }
  },
  doAction(event: AnyRecord) {
    const now = Date.now();
    if (now - this.lastActionTime < 1000) return;
    this.lastActionTime = now;

    const action = event.currentTarget.dataset.action;
    const config: AnyRecord = {
      confirm: { title: "确认接单", content: "确认接受该订单？", api: () => confirmOrder(this.data.assignmentId) },
      picked: { title: "已接到客人", content: "确认已接到自己负责的客人后，订单将进入接待中状态。", api: () => pickedGuest(this.data.assignmentId) },
      complete: { title: "完成服务", content: "确认自己负责的客人已离店并完成服务？", api: () => completeOrder(this.data.assignmentId) }
    };
    const item = config[action];
    if (!item) return;
    wx.showModal({
      title: item.title,
      content: item.content,
      confirmColor: "#2AACE2",
      success: async (res: AnyRecord) => {
        if (!res.confirm) return;
        await item.api();
        wx.showToast({ title: "操作成功", icon: "success" });
        this.load();
      }
    });
  },
  reject() {
    const now = Date.now();
    if (now - this.lastRejectTime < 1000) return;
    this.lastRejectTime = now;

    wx.showActionSheet({
      itemList: rejectReasons,
      success: (res: AnyRecord) => {
        const preset = rejectReasons[res.tapIndex] || "";
        this.inputRejectReason(preset === "其他" ? "" : preset);
      }
    });
  },
  inputRejectReason(reason: string) {
    wx.showModal({
      title: "拒单确认",
      editable: true,
      placeholderText: "请输入拒单原因",
      content: reason,
      confirmColor: "#EF4444",
      success: async (res: AnyRecord) => {
        if (!res.confirm) return;
        const rejectReason = (res.content || reason || "").trim();
        if (!rejectReason) {
          wx.showToast({ title: "拒单原因不能为空", icon: "none" });
          return;
        }
        await rejectOrder(this.data.assignmentId, rejectReason);
        wx.showToast({ title: "已拒单", icon: "success" });
        wx.navigateBack();
      }
    });
  }
});

function buildSections(order: AnyRecord, assignment: AnyRecord) {
  return [
    {
      title: "订单信息",
      rows: [
        ["订单编号", order.orderNo],
        ["酒店名称", order.hotel?.name],
        ["订单状态", getStatus("order", order.status).text]
      ]
    },
    {
      title: "客人信息",
      rows: [
        ["客人姓名", order.guestName],
        ["联系电话", maskPhone(order.guestPhone)],
        ["接待人数", `${order.guestCount || 0}人`]
      ]
    },
    {
      title: "入住与接站",
      rows: [
        ["入住日期", formatDateFull(order.checkInDate)],
        ["离店日期", formatDateFull(order.checkOutDate)],
        ["房间信息", `${order.roomType || "-"} / ${order.roomNo || "-"}`],
        ["接站方案", pickupTypeMap[order.pickupType] || "-"],
        ["到达时间", formatDateTimeFull(order.arrivalTime)],
        ["航班车次", order.flightTrainNo || "-"]
      ]
    },
    {
      title: "任务分配",
      rows: [
        ["指派状态", getStatus("assignment", assignment.status).text],
        ["接单时间", formatDateTimeFull(assignment.confirmedAt)],
        ["接到时间", formatDateTimeFull(assignment.pickedGuestAt)],
        ["完成时间", formatDateTimeFull(assignment.completedAt)]
      ]
    },
    {
      title: "备注详情",
      rows: [
        ["特殊要求", order.specialNeeds || "-"],
        ["其他备注", order.remark || "-"]
      ]
    }
  ];
}

function buildActions(order: AnyRecord, assignment: AnyRecord) {
  if (assignment.status === "pending_confirm") {
    return [
      { text: "确认接单", action: "confirm", tone: "primary" },
      { text: "拒绝指派", action: "reject", tone: "danger", reject: true }
    ];
  }
  if (assignment.status === "confirmed") {
    return [{ text: "已接到客人", action: "picked", tone: "success" }];
  }
  if (["picked_guest", "in_service"].includes(assignment.status) || order.status === "partial_completed") {
    return [{ text: "确认客人离店，完成服务", action: "complete", tone: "primary" }];
  }
  return [];
}
