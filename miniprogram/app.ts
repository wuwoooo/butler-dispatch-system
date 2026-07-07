import { getToken, saveSession } from "./utils/auth";
import { getCurrentUser, wechatLogin } from "./services/auth";
import { redirectByRole } from "./utils/router";

App({
  globalData: {
    baseURL: "http://192.168.3.205:3001",
    token: "",
    user: null
  },

  onLaunch() {
    this.globalData.token = getToken();
  },

  async bootstrapSession() {
    const token = getToken();
    if (token) {
      try {
        const data = await getCurrentUser({ silent: true });
        this.globalData.token = token;
        this.globalData.user = data.user;
        redirectByRole(data.user, true);
        return;
      } catch {
        wx.removeStorageSync("token");
      }
    }

    try {
      const loginResult = await wxLogin();
      const data = await wechatLogin(loginResult.code, { silent: true });
      if (data.needBind) {
        wx.redirectTo({
          url: `/pages/bind-account/index?code=${encodeURIComponent(loginResult.code)}`
        });
        return;
      }

      saveSession(data.token, data.user);
      this.globalData.token = data.token;
      this.globalData.user = data.user;
      redirectByRole(data.user, true);
    } catch {
      const pages = getCurrentPages();
      const currentPage = pages[pages.length - 1];
      const currentRoute = currentPage ? "/" + currentPage.route : "";
      if (currentRoute !== "/pages/login/index" && currentRoute !== "pages/login/index") {
        wx.redirectTo({ url: "/pages/login/index" });
      }
    }
  }
});

function wxLogin(): Promise<{ code: string }> {
  return new Promise((resolve, reject) => {
    wx.login({
      success: resolve,
      fail: reject
    });
  });
}
