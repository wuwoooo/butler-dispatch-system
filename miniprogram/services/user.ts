import { clearSession } from "../utils/auth";
import { unbindMiniProgram } from "./auth";

export function logout() {
  wx.showModal({
    title: "退出登录",
    content: "退出登录将解除当前微信与系统账号的绑定，确认继续？",
    confirmColor: "#EF4444",
    success: async (res: AnyRecord) => {
      if (res.confirm) {
        try {
          const loginResult = await wxLogin();
          await unbindMiniProgram(loginResult.code, { silent: true });
        } catch {
          wx.showToast({
            title: "退出失败，账号解绑未完成，请稍后重试",
            icon: "none",
            duration: 2500
          });
          return;
        }

        clearSession();
        getApp().globalData.token = "";
        getApp().globalData.user = null;
        wx.reLaunch({ url: "/pages/login/index" });
      }
    }
  });
}

function wxLogin(): Promise<{ code: string }> {
  return new Promise((resolve, reject) => {
    wx.login({
      success: resolve,
      fail: reject
    });
  });
}
