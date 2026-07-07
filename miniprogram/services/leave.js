"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyLeaves = getMyLeaves;
exports.submitLeave = submitLeave;
exports.cancelLeave = cancelLeave;
exports.getLeaves = getLeaves;
exports.approveLeave = approveLeave;
exports.rejectLeave = rejectLeave;
const request_1 = require("./request");
function getMyLeaves(params = {}) {
    return request_1.http.get(`/api/butler/leaves${(0, request_1.buildQuery)(params)}`, { loading: false });
}
function submitLeave(data) {
    return request_1.http.post("/api/butler/leaves", data);
}
function cancelLeave(id) {
    return request_1.http.post(`/api/butler/leaves/${id}/cancel`);
}
function getLeaves(params = {}) {
    return request_1.http.get(`/api/leaves${(0, request_1.buildQuery)(params)}`, { loading: false });
}
function approveLeave(id) {
    return request_1.http.post(`/api/leaves/${id}/approve`);
}
function rejectLeave(id, rejectReason) {
    return request_1.http.post(`/api/leaves/${id}/reject`, { rejectReason });
}
