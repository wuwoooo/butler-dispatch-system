"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getButlerDashboard = getButlerDashboard;
exports.getDispatcherDashboard = getDispatcherDashboard;
const request_1 = require("./request");
function getButlerDashboard() {
    return request_1.http.get("/api/mobile/dashboard/butler", { loading: false });
}
function getDispatcherDashboard() {
    return request_1.http.get("/api/mobile/dashboard/dispatcher", { loading: false });
}
