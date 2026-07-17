"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logout = logout;
const auth_1 = require("../utils/auth");
const auth_2 = require("./auth");
function logout() {
    wx.showModal({
        title: "退出登录",
        content: "退出登录将解除当前微信与系统账号的绑定，确认继续？",
        confirmColor: "#EF4444",
        success: async (res) => {
            if (res.confirm) {
                try {
                    const loginResult = await wxLogin();
                    await (0, auth_2.unbindMiniProgram)(loginResult.code, { silent: true });
                }
                catch (_a) {
                    wx.showToast({
                        title: "退出失败，账号解绑未完成，请稍后重试",
                        icon: "none",
                        duration: 2500
                    });
                    return;
                }
                (0, auth_1.clearSession)();
                getApp().globalData.token = "";
                getApp().globalData.user = null;
                wx.reLaunch({ url: "/pages/login/index" });
            }
        }
    });
}
function wxLogin() {
    return new Promise((resolve, reject) => {
        wx.login({
            success: resolve,
            fail: reject
        });
    });
}
