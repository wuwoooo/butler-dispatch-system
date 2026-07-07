import { clearSession } from "../utils/auth";

export function logout() {
  wx.showModal({
    title: "退出登录",
    content: "确认退出当前账号？",
    confirmColor: "#EF4444",
    success: (res: AnyRecord) => {
      if (res.confirm) {
        clearSession();
        wx.reLaunch({ url: "/pages/login/index" });
      }
    }
  });
}

