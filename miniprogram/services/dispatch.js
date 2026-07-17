"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAvailableButlers = getAvailableButlers;
exports.dispatchOrder = dispatchOrder;
exports.cancelDispatchAssignment = cancelDispatchAssignment;
const request_1 = require("./request");
function getAvailableButlers(orderId) {
    return request_1.http.get(`/api/orders/${orderId}/available-butlers`, {
        loading: false
    });
}
function dispatchOrder(orderId, butlerIds, settlementAmount, remark) {
    return request_1.http.post(`/api/orders/${orderId}/dispatch`, {
        butlerIds,
        settlementAmount,
        amountConfirmed: true,
        remark
    });
}
function cancelDispatchAssignment(orderId, assignmentId, remark) {
    return request_1.http.post(`/api/orders/${orderId}/assignments/${assignmentId}/cancel`, { remark });
}
