"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const auth_1 = require("../../services/auth");
const request_1 = require("../../services/request");
const auth_2 = require("../../utils/auth");
const router_1 = require("../../utils/router");
const validators_1 = require("../../utils/validators");
Page({
    data: {
        code: "",
        username: "",
        password: ""
    },
    onLoad(query) {
        this.setData({ code: query.code || "" });
    },
    onUsername(event) {
        this.setData({ username: event.detail.value });
    },
    onPassword(event) {
        this.setData({ password: event.detail.value });
    },
    refreshCode() {
        return new Promise((resolve, reject) => {
            wx.login({
                success: (res) => {
                    this.setData({ code: res.code });
                    resolve(res.code);
                },
                fail: reject
            });
        });
    },
    async handleSubmit() {
        if (!(0, validators_1.requireField)(this.data.username, "请输入系统账号"))
            return;
        if (!(0, validators_1.requireField)(this.data.password, "请输入密码"))
            return;
        try {
            const code = await this.refreshCode();
            const data = await (0, auth_1.bindAccount)({
                code,
                username: this.data.username,
                password: this.data.password
            }, { silent: true });
            (0, auth_2.saveSession)(data.token, data.user);
            wx.showToast({ title: "绑定成功", icon: "success" });
            (0, router_1.redirectByRole)(data.user, true);
        }
        catch (error) {
            wx.showToast({ title: getBindErrorMessage(error), icon: "none", duration: 2500 });
            await this.refreshCode().catch(() => undefined);
        }
    }
});
function getBindErrorMessage(error) {
    if (error instanceof request_1.ApiRequestError) {
        if (error.code === "WECHAT_CODE_INVALID") {
            return "微信登录凭证已过期，请重新提交";
        }
        if (error.message) {
            return error.message;
        }
    }
    return "绑定失败，请稍后重试";
}
