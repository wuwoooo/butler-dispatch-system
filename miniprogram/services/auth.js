"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wechatLogin = wechatLogin;
exports.bindAccount = bindAccount;
exports.getCurrentUser = getCurrentUser;
exports.unbindMiniProgram = unbindMiniProgram;
exports.changePassword = changePassword;
const request_1 = require("./request");
function wechatLogin(code, options) {
    return request_1.http.post("/api/miniprogram/auth/wechat-login", { code }, options);
}
function bindAccount(data, options) {
    return request_1.http.post("/api/miniprogram/auth/bind", data, options);
}
function getCurrentUser(options) {
    return request_1.http.get("/api/miniprogram/auth/me", options);
}
function unbindMiniProgram() {
    return request_1.http.post("/api/miniprogram/auth/unbind");
}
function changePassword(data) {
    return request_1.http.post("/api/auth/change-password", data);
}
