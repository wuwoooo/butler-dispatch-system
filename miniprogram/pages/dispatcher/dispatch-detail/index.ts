import {
  cancelDispatchAssignment,
  dispatchOrder,
  getAvailableButlers
} from "../../../services/dispatch";
import { getOrderDetail } from "../../../services/order";
import { formatDateFull, formatDateTimeFull } from "../../../utils/format";
import { getStatus, pickupTypeMap } from "../../../utils/status-map";

Page({
  data: {
    orderId: "",
    order: {} as AnyRecord,
    assigned: [] as AnyRecord[],
    candidates: [] as AnyRecord[],
    selectedIds: [] as string[],
    sections: [] as AnyRecord[],
    canDispatch: false
  },
  onLoad(query: AnyRecord) {
    this.setData({ orderId: query.orderId || "" });
    this.load();
  },
  async load() {
    const [order, available] = await Promise.all([
      getOrderDetail(this.data.orderId),
      getAvailableButlers(this.data.orderId)
    ]);
    this.setData({
      order,
      assigned: order.assignments || [],
      candidates: (available.items || []).map((item: AnyRecord) => ({
        ...item,
        selected: this.data.selectedIds.includes(item.id)
      })),
      sections: buildSections(order),
      canDispatch: ["pending_dispatch", "partial_rejected"].includes(order.status)
    });
  },
  toggleButler(event: AnyRecord) {
    const item = event.detail;
    if (item.available === false) return;
    const selected = new Set(this.data.selectedIds);
    if (selected.has(item.id)) selected.delete(item.id);
    else selected.add(item.id);
    const selectedIds = Array.from(selected);
    this.setData({
      selectedIds,
      candidates: this.data.candidates.map((candidate: AnyRecord) => ({
        ...candidate,
        selected: selectedIds.includes(candidate.id)
      }))
    });
  },
  submit() {
    if (!this.data.canDispatch) {
      wx.showToast({ title: "请先取消当前待接单派单", icon: "none" });
      return;
    }

    if (this.data.selectedIds.length === 0) {
      wx.showToast({ title: "请至少选择一名管家", icon: "none" });
      return;
    }
    wx.showModal({
      title: "提交派单",
      content: `确认派给 ${this.data.selectedIds.length} 名管家？`,
      success: async (res: AnyRecord) => {
        if (!res.confirm) return;
        await dispatchOrder(this.data.orderId, this.data.selectedIds);
        wx.showToast({ title: "派单成功", icon: "success" });
        this.setData({ selectedIds: [] });
        this.load();
      }
    });
  },
  cancelAssignment(event: AnyRecord) {
    const assignmentId = event.currentTarget.dataset.id;
    wx.showModal({
      title: "取消派单",
      content: "取消后订单可重新进入待分配。",
      confirmText: "确认取消",
      success: async (res: AnyRecord) => {
        if (!res.confirm) return;
        await cancelDispatchAssignment(this.data.orderId, assignmentId, "小程序取消待接单派单");
        wx.showToast({ title: "已取消", icon: "success" });
        this.setData({ selectedIds: [] });
        this.load();
      }
    });
  }
});

function buildSections(order: AnyRecord) {
  return [
    {
      title: "订单信息",
      rows: [
        ["订单编号", order.orderNo],
        ["酒店", order.hotel?.name],
        ["状态", getStatus("order", order.status).text],
        ["客人", `${order.guestName || "-"} · ${order.guestCount || 0}人`]
      ]
    },
    {
      title: "入住与接站",
      rows: [
        ["入住日期", formatDateFull(order.checkInDate)],
        ["离店日期", formatDateFull(order.checkOutDate)],
        ["接站类型", pickupTypeMap[order.pickupType] || "-"],
        ["到达时间", formatDateTimeFull(order.arrivalTime)]
      ]
    }
  ];
}
