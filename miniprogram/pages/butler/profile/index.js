"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const auth_1 = require("../../../services/auth");
const user_1 = require("../../../services/user");
const status_map_1 = require("../../../utils/status-map");
Page({
    data: {
        user: {},
        avatar: "?",
        roleText: "-"
    },
    onShow() {
        this.load();
    },
    async load() {
        const data = await (0, auth_1.getCurrentUser)({ silent: true });
        const user = data.user || wx.getStorageSync("user") || {};
        this.setData({
            user,
            avatar: (user.name || "?").slice(0, 1),
            roleText: status_map_1.roleMap[user.roleCode] || "-"
        });
    },
    goChangePassword() {
        wx.navigateTo({ url: "/pages/change-password/index" });
    },
    logout: user_1.logout
});
