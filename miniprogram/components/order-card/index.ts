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
  observers: {
    item(item: AnyRecord) {
      const order = item?.order || item || {};
      const hotel = order.hotel || item.hotel || {};
      this.setData({
        view: {
          id: item.id,
          assignmentId: item.order ? item.id : undefined,
          orderId: order.id || item.orderId,
          hotelName: hotel.name || "未关联酒店",
          orderNo: order.orderNo || item.orderNo || "-",
          guestName: order.guestName || item.guestName || "-",
          guestCount: order.guestCount || item.guestCount || 0,
          pickupType: pickupTypeMap[order.pickupType || item.pickupType] || "-",
          arrivalTime: formatDateTime(order.arrivalTime || item.arrivalTime),
          checkIn: formatDate(order.checkInDate || item.checkInDate),
          checkOut: formatDate(order.checkOutDate || item.checkOutDate),
          orderStatus: order.status || item.orderStatus || item.status,
          assignmentStatus: item.order ? item.status : "",
          roomNo: order.roomNo || item.roomNo || ""
        }
      });
    }
  },
  methods: {
    handleTap() {
      this.triggerEvent("tap", this.data.view);
    },
    handleConfirm() {
      this.triggerEvent("confirm", this.data.view);
    },
    handleReject() {
      this.triggerEvent("reject", this.data.view);
    }
  }
});
