"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.http = exports.ApiRequestError = void 0;
exports.getBaseURL = getBaseURL;
exports.request = request;
exports.buildQuery = buildQuery;
/* eslint-disable @typescript-eslint/no-explicit-any */
const auth_1 = require("../utils/auth");
class ApiRequestError extends Error {
    constructor(message, code, statusCode) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
    }
}
exports.ApiRequestError = ApiRequestError;
function getBaseURL() {
    var _a;
    return ((_a = getApp().globalData) === null || _a === void 0 ? void 0 : _a.baseURL) || "https://dlapg.com";
}
function request(url, options = {}) {
    const token = (0, auth_1.getToken)();
    const showLoading = options.loading !== false && !options.silent;
    let loadingClosed = false;
    const hideRequestLoading = () => {
        if (showLoading && !loadingClosed) {
            wx.hideLoading();
            loadingClosed = true;
        }
    };
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
                var _a, _b;
                const body = res.data || {};
                const isBindUrl = url.includes("/auth/bind");
                if (res.statusCode === 401 && !isBindUrl) {
                    (0, auth_1.clearSession)();
                    hideRequestLoading();
                    if (!options.silent) {
                        wx.showToast({ title: "登录已失效，请重新登录", icon: "none", duration: 2500 });
                    }
                    wx.reLaunch({ url: "/pages/login/index" });
                    reject(new ApiRequestError("登录已失效，请重新登录", "UNAUTHORIZED", res.statusCode));
                    return;
                }
                if (res.statusCode >= 200 && res.statusCode < 300 && body.success) {
                    resolve(body.data);
                    return;
                }
                const message = ((_a = body === null || body === void 0 ? void 0 : body.error) === null || _a === void 0 ? void 0 : _a.message) || (body === null || body === void 0 ? void 0 : body.message) || "请求失败";
                hideRequestLoading();
                if (!options.silent) {
                    wx.showToast({ title: message, icon: "none", duration: 2500 });
                }
                reject(new ApiRequestError(message, (_b = body === null || body === void 0 ? void 0 : body.error) === null || _b === void 0 ? void 0 : _b.code, res.statusCode));
            },
            fail: () => {
                const message = "网络异常，请稍后重试";
                hideRequestLoading();
                if (!options.silent) {
                    wx.showToast({ title: message, icon: "none", duration: 2500 });
                }
                reject(new ApiRequestError(message, "NETWORK_ERROR"));
            },
            complete: () => {
                hideRequestLoading();
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
