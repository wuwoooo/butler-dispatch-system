"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logout = logout;
const auth_1 = require("../utils/auth");
function logout() {
    wx.showModal({
        title: "退出登录",
        content: "确认退出当前账号？",
        confirmColor: "#EF4444",
        success: (res) => {
            if (res.confirm) {
                (0, auth_1.clearSession)();
                wx.reLaunch({ url: "/pages/login/index" });
            }
        }
    });
}
