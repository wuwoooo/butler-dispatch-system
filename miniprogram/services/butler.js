"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getButlers = getButlers;
exports.getButlerDetail = getButlerDetail;
exports.getButlerStatistics = getButlerStatistics;
exports.getButlerOrderRecords = getButlerOrderRecords;
exports.getButlerReviews = getButlerReviews;
exports.getAllButlerStatistics = getAllButlerStatistics;
const request_1 = require("./request");
function getButlers() {
    return request_1.http.get("/api/butlers", { loading: false });
}
function getButlerDetail(id) {
    return request_1.http.get(`/api/butlers/${id}`);
}
function getButlerStatistics(params = {}) {
    return request_1.http.get(`/api/butler/statistics${(0, request_1.buildQuery)(params)}`, {
        loading: false
    });
}
function getButlerOrderRecords(params = {}) {
    return request_1.http.get(`/api/butler/order-records${(0, request_1.buildQuery)(params)}`, { loading: false });
}
function getButlerReviews(params = {}) {
    return request_1.http.get(`/api/butler/reviews${(0, request_1.buildQuery)(params)}`, {
        loading: false
    });
}
function getAllButlerStatistics(params = {}) {
    return request_1.http.get(`/api/statistics/butlers${(0, request_1.buildQuery)(params)}`, {
        loading: false
    });
}
