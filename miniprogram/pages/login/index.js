"use strict";
Page({
    data: {
        loading: false
    },
    onLoad() {
        this.tryLogin();
    },
    async tryLogin() {
        this.setData({ loading: true });
        await getApp().bootstrapSession();
        this.setData({ loading: false });
    },
    handleRetry() {
        this.tryLogin();
    },
    handleBind() {
        wx.login({
            success: (res) => {
                wx.navigateTo({
                    url: `/pages/bind-account/index?code=${encodeURIComponent(res.code)}`
                });
            },
            fail: () => {
                wx.showToast({ title: "微信登录失败", icon: "none" });
            }
        });
    }
});
