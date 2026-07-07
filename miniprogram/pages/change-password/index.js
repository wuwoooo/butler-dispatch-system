"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const auth_1 = require("../../services/auth");
const validators_1 = require("../../utils/validators");
Page({
    data: {
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
    },
    onCurrentPassword(event) {
        this.setData({ currentPassword: event.detail.value });
    },
    onNewPassword(event) {
        this.setData({ newPassword: event.detail.value });
    },
    onConfirmPassword(event) {
        this.setData({ confirmPassword: event.detail.value });
    },
    async handleSubmit() {
        if (!(0, validators_1.requireField)(this.data.currentPassword, "请输入原密码"))
            return;
        if (!(0, validators_1.requireField)(this.data.newPassword, "请输入新密码"))
            return;
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
        await (0, auth_1.changePassword)({
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
