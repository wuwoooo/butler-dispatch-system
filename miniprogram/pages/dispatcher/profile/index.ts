import { getCurrentUser } from "../../../services/auth";
import { logout } from "../../../services/user";
import { roleMap } from "../../../utils/status-map";

Page({
  data: {
    user: {} as AnyRecord,
    avatar: "?",
    roleText: "-"
  },
  onShow() {
    this.load();
  },
  async load() {
    const data = await getCurrentUser({ silent: true });
    const user = data.user || wx.getStorageSync("user") || {};
    this.setData({
      user,
      avatar: (user.name || "?").slice(0, 1),
      roleText: roleMap[user.roleCode] || "-"
    });
  },
  goChangePassword() {
    wx.navigateTo({ url: "/pages/change-password/index" });
  },
  logout
});
