"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNotifications = getNotifications;
exports.getUnreadCount = getUnreadCount;
exports.readNotification = readNotification;
exports.readAllNotifications = readAllNotifications;
const request_1 = require("./request");
function getNotifications(params = {}) {
    return request_1.http.get(`/api/notifications${(0, request_1.buildQuery)(params)}`, { loading: false });
}
function getUnreadCount() {
    return request_1.http.get("/api/notifications/unread-count", {
        loading: false,
        silent: true
    });
}
function readNotification(id) {
    return request_1.http.post(`/api/notifications/${id}/read`, {}, { loading: false });
}
function readAllNotifications() {
    return request_1.http.post("/api/notifications/read-all");
}
