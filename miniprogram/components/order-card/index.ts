import { formatDate, formatDateTime } from "../../utils/format";
import { pickupTypeMap } from "../../utils/status-map";

Component({
  properties: {
    item: { type: Object, value: {} },
    mode: { type: String, value: "order" },
    showActions: { type: Boolean, value: false }
  },
  data: {
    view: {} as AnyRecord
  },
  // 增加时间戳用于防连击
  lastConfirmTime: 0,
  lastRejectTime: 0,
  observers: {
    item(item: AnyRecord) {
      const order = item?.order || item || {};
      const hotel = order.hotel || item.hotel || {};
      const roomType = order.roomType || item.roomType || "";
      const roomNo = order.roomNo || item.roomNo || "";
      const roomText = [roomType, roomNo].filter(Boolean).join(" / ");
      this.setData({
        view: {
          id: item.id,
          assignmentId: item.order ? item.id : undefined,
          orderId: order.id || item.orderId,
          hotelName: hotel.name || "未关联酒店",
          orderNo: order.orderNo || item.orderNo || "-",
          guestName: order.guestName || item.guestName || "-",
          guestCount: order.guestCount || item.guestCount || 0,
          serviceMode: order.serviceMode || item.serviceMode || "stay",
          transportType: formatTransportType(
            order.pickupType || item.pickupType,
            order.transportDirection || item.transportDirection
          ),
          serviceStartAt: formatDateTime(order.serviceStartAt || order.arrivalTime || item.serviceStartAt || item.arrivalTime),
          serviceEndAt: formatDateTime(order.serviceEndAt || order.checkOutDate || item.serviceEndAt || item.checkOutDate),
          settlementAmount:
            order.settlementAmount === null || order.settlementAmount === undefined
              ? "-"
              : `¥${Number(order.settlementAmount).toFixed(2)}`,
          pickupType: pickupTypeMap[order.pickupType || item.pickupType] || "-",
          arrivalTime: formatDateTime(order.arrivalTime || item.arrivalTime),
          checkIn: formatDate(order.checkInDate || item.checkInDate),
          checkOut: formatDate(order.checkOutDate || item.checkOutDate),
          orderStatus: order.status || item.orderStatus || item.status,
          assignmentStatus: item.order ? item.status : "",
          roomType,
          roomNo,
          roomText
        }
      });
    }
  },
  methods: {
    handleTap() {
      this.triggerEvent("tap", this.data.view);
    },
    handleConfirm() {
      const now = Date.now();
      if (now - this.lastConfirmTime < 1000) return;
      this.lastConfirmTime = now;
      this.triggerEvent("confirm", this.data.view);
    },
    handleReject() {
      const now = Date.now();
      if (now - this.lastRejectTime < 1000) return;
      this.lastRejectTime = now;
      this.triggerEvent("reject", this.data.view);
    }
  }
});

function formatTransportType(pickupType: string, direction?: string) {
  if (pickupType === "airport") return direction === "pickup" ? "接机" : "送机";
  return direction === "pickup" ? "接站" : "送站";
}
