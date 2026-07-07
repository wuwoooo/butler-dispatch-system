"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const auth_1 = require("../../services/auth");
const request_1 = require("../../services/request");
const auth_2 = require("../../utils/auth");
const router_1 = require("../../utils/router");
Page({
    data: {
        loading: false
    },
    lastRetryTime: 0,
    lastBindTime: 0,
    onLoad() {
        this.tryLogin();
    },
    async tryLogin() {
        if (this.data.loading)
            return;
        this.setData({ loading: true });
        try {
            (0, auth_2.clearSession)();
            const loginResult = await wxLogin();
            const data = await (0, auth_1.wechatLogin)(loginResult.code, { silent: true });
            if (data.needBind) {
                wx.navigateTo({
                    url: `/pages/bind-account/index?code=${encodeURIComponent(loginResult.code)}`
                });
                return;
            }
            (0, auth_2.saveSession)(data.token, data.user);
            getApp().globalData.token = data.token;
            getApp().globalData.user = data.user;
            (0, router_1.redirectByRole)(data.user, true);
        }
        catch (error) {
            wx.showToast({ title: getLoginErrorMessage(error), icon: "none" });
        }
        finally {
            this.setData({ loading: false });
        }
    },
    handleRetry() {
        const now = Date.now();
        if (now - this.lastRetryTime < 1000)
            return;
        this.lastRetryTime = now;
        this.tryLogin();
    },
    handleBind() {
        const now = Date.now();
        if (now - this.lastBindTime < 1000)
            return;
        this.lastBindTime = now;
        wx.login({
            success: (res) => {
                wx.navigateTo({
                    url: `/pages/bind-account/index?code=${encodeURIComponent(res.code)}`
                });
            },
            fail: () => {
                wx.showToast({ title: "微信登录失败", icon: "none" });
            }
        });
    }
});
function wxLogin() {
    return new Promise((resolve, reject) => {
        wx.login({
            success: resolve,
            fail: reject
        });
    });
}
function getLoginErrorMessage(error) {
    if (error instanceof request_1.ApiRequestError) {
        if (error.code === "WECHAT_CONFIG_MISSING") {
            return "微信登录配置未完成，请联系管理员";
        }
        if (error.code === "WECHAT_CODE_INVALID") {
            return "微信登录凭证无效，请重新扫码进入";
        }
        if (error.message) {
            return error.message;
        }
    }
    return "登录未完成，请重试或先绑定账号";
}
