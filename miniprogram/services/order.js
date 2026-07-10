"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getButlerOrders = getButlerOrders;
exports.getOrders = getOrders;
exports.getOrderDetail = getOrderDetail;
exports.confirmOrder = confirmOrder;
exports.rejectOrder = rejectOrder;
exports.pickedGuest = pickedGuest;
exports.completeOrder = completeOrder;
const request_1 = require("./request");
function getButlerOrders() {
    return request_1.http.get("/api/butler/my-orders", { loading: false });
}
function getOrders(params = {}) {
    return request_1.http.get(`/api/orders${(0, request_1.buildQuery)(params)}`, { loading: false });
}
function getOrderDetail(orderId) {
    return request_1.http.get(`/api/orders/${orderId}`);
}
function confirmOrder(assignmentId) {
    return request_1.http.post(`/api/butler/orders/${assignmentId}/confirm`);
}
function rejectOrder(assignmentId, rejectReason) {
    return request_1.http.post(`/api/butler/orders/${assignmentId}/reject`, { rejectReason });
}
function pickedGuest(assignmentId, occurredAt) {
    return request_1.http.post(`/api/butler/orders/${assignmentId}/picked-guest`, occurredAt ? { occurredAt } : {});
}
function completeOrder(assignmentId, occurredAt) {
    return request_1.http.post(`/api/butler/orders/${assignmentId}/complete`, occurredAt ? { occurredAt } : {});
}
