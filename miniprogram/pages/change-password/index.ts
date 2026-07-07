import { changePassword } from "../../services/auth";
import { requireField } from "../../utils/validators";

Page({
  data: {
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  },
  onCurrentPassword(event: AnyRecord) {
    this.setData({ currentPassword: event.detail.value });
  },
  onNewPassword(event: AnyRecord) {
    this.setData({ newPassword: event.detail.value });
  },
  onConfirmPassword(event: AnyRecord) {
    this.setData({ confirmPassword: event.detail.value });
  },
  async handleSubmit() {
    if (!requireField(this.data.currentPassword, "请输入原密码")) return;
    if (!requireField(this.data.newPassword, "请输入新密码")) return;
    if (this.data.newPassword.length < 8) {
      wx.showToast({ title: "新密码至少 8 个字符", icon: "none" });
      return;
    }
    if (this.data.newPassword !== this.data.confirmPassword) {
      wx.showToast({ title: "两次输入的新密码不一致", icon: "none" });
      return;
    }
    if (this.data.currentPassword === this.data.newPassword) {
      wx.showToast({ title: "新密码不能与原密码相同", icon: "none" });
      return;
    }

    await changePassword({
      currentPassword: this.data.currentPassword,
      newPassword: this.data.newPassword,
      confirmPassword: this.data.confirmPassword
    });
    wx.showToast({ title: "修改成功", icon: "success" });
    this.setData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: ""
    });
    setTimeout(() => wx.navigateBack(), 800);
  }
});
