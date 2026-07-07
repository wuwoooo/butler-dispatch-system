"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const format_1 = require("../../utils/format");
const status_map_1 = require("../../utils/status-map");
Component({
    properties: {
        item: { type: Object, value: {} },
        mode: { type: String, value: "order" },
        showActions: { type: Boolean, value: false }
    },
    data: {
        view: {}
    },
    observers: {
        item(item) {
            const order = (item === null || item === void 0 ? void 0 : item.order) || item || {};
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
                    pickupType: status_map_1.pickupTypeMap[order.pickupType || item.pickupType] || "-",
                    arrivalTime: (0, format_1.formatDateTime)(order.arrivalTime || item.arrivalTime),
                    checkIn: (0, format_1.formatDate)(order.checkInDate || item.checkInDate),
                    checkOut: (0, format_1.formatDate)(order.checkOutDate || item.checkOutDate),
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
