"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const auth_1 = require("../../services/auth");
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
        const code = this.data.code || (await this.refreshCode());
        try {
            const data = await (0, auth_1.bindAccount)({
                code,
                username: this.data.username,
                password: this.data.password
            });
            (0, auth_2.saveSession)(data.token, data.user);
            wx.showToast({ title: "绑定成功", icon: "success" });
            (0, router_1.redirectByRole)(data.user, true);
        }
        catch (_a) {
            await this.refreshCode().catch(() => undefined);
        }
    }
});
