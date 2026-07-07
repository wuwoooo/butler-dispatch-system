"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.http = void 0;
exports.getBaseURL = getBaseURL;
exports.request = request;
exports.buildQuery = buildQuery;
/* eslint-disable @typescript-eslint/no-explicit-any */
const auth_1 = require("../utils/auth");
function getBaseURL() {
    var _a;
    return ((_a = getApp().globalData) === null || _a === void 0 ? void 0 : _a.baseURL) || "http://localhost:3000";
}
function request(url, options = {}) {
    const token = (0, auth_1.getToken)();
    const showLoading = options.loading !== false && !options.silent;
    if (showLoading) {
        wx.showLoading({ title: "加载中", mask: true });
    }
    return new Promise((resolve, reject) => {
        wx.request({
            url: `${getBaseURL()}${url}`,
            method: options.method || "GET",
            data: options.data || {},
            header: Object.assign({ "Content-Type": "application/json" }, (token ? { Authorization: `Bearer ${token}` } : {})),
            success: (res) => {
                var _a;
                const body = res.data || {};
                const isBindUrl = url.includes("/auth/bind");
                if (res.statusCode === 401 && !isBindUrl) {
                    (0, auth_1.clearSession)();
                    if (!options.silent) {
                        wx.showToast({ title: "登录已失效，请重新登录", icon: "none" });
                    }
                    wx.reLaunch({ url: "/pages/login/index" });
                    reject(new Error("UNAUTHORIZED"));
                    return;
                }
                if (res.statusCode >= 200 && res.statusCode < 300 && body.success) {
                    resolve(body.data);
                    return;
                }
                const message = ((_a = body === null || body === void 0 ? void 0 : body.error) === null || _a === void 0 ? void 0 : _a.message) || (body === null || body === void 0 ? void 0 : body.message) || "请求失败";
                if (!options.silent) {
                    wx.showToast({ title: message, icon: "none" });
                }
                reject(new Error(message));
            },
            fail: () => {
                const message = "网络异常，请稍后重试";
                if (!options.silent) {
                    wx.showToast({ title: message, icon: "none" });
                }
                reject(new Error(message));
            },
            complete: () => {
                if (showLoading) {
                    wx.hideLoading();
                }
            }
        });
    });
}
exports.http = {
    get: (url, options) => request(url, Object.assign(Object.assign({}, options), { method: "GET" })),
    post: (url, data, options) => request(url, Object.assign(Object.assign({}, options), { method: "POST", data })),
    put: (url, data, options) => request(url, Object.assign(Object.assign({}, options), { method: "PUT", data })),
    delete: (url, options) => request(url, Object.assign(Object.assign({}, options), { method: "DELETE" }))
};
function buildQuery(params = {}) {
    const pairs = Object.keys(params)
        .filter((key) => params[key] !== undefined && params[key] !== null && params[key] !== "")
        .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(String(params[key]))}`);
    return pairs.length ? `?${pairs.join("&")}` : "";
}
