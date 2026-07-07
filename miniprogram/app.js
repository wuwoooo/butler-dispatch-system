"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const auth_1 = require("./utils/auth");
const auth_2 = require("./services/auth");
const router_1 = require("./utils/router");
App({
    globalData: {
        baseURL: "http://192.168.3.205:3001",
        token: "",
        user: null
    },
    onLaunch() {
        this.globalData.token = (0, auth_1.getToken)();
    },
    async bootstrapSession() {
        const token = (0, auth_1.getToken)();
        if (token) {
            try {
                const data = await (0, auth_2.getCurrentUser)({ silent: true });
                this.globalData.token = token;
                this.globalData.user = data.user;
                (0, router_1.redirectByRole)(data.user, true);
                return;
            }
            catch (_a) {
                wx.removeStorageSync("token");
            }
        }
        try {
            const loginResult = await wxLogin();
            const data = await (0, auth_2.wechatLogin)(loginResult.code, { silent: true });
            if (data.needBind) {
                wx.redirectTo({
                    url: `/pages/bind-account/index?code=${encodeURIComponent(loginResult.code)}`
                });
                return;
            }
            (0, auth_1.saveSession)(data.token, data.user);
            this.globalData.token = data.token;
            this.globalData.user = data.user;
            (0, router_1.redirectByRole)(data.user, true);
        }
        catch (_b) {
            const pages = getCurrentPages();
            const currentPage = pages[pages.length - 1];
            const currentRoute = currentPage ? "/" + currentPage.route : "";
            if (currentRoute !== "/pages/login/index" && currentRoute !== "pages/login/index") {
                wx.redirectTo({ url: "/pages/login/index" });
            }
        }
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
