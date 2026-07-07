"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const butler_1 = require("../../../services/butler");
Page({
    data: {
        keyword: "",
        all: [],
        items: []
    },
    onShow() {
        this.load();
    },
    onPullDownRefresh() {
        this.load().finally(() => wx.stopPullDownRefresh());
    },
    async load() {
        const data = await (0, butler_1.getButlers)();
        this.setData({ all: data.items || [] });
        this.filter();
    },
    setKeyword(event) {
        this.setData({ keyword: event.detail.value });
        this.filter();
    },
    filter() {
        const keyword = this.data.keyword;
        this.setData({
            items: this.data.all.filter((item) => { var _a; return !keyword || [item.name, item.phone, (_a = item.user) === null || _a === void 0 ? void 0 : _a.username].some((value) => value === null || value === void 0 ? void 0 : value.includes(keyword)); })
        });
    },
    open(event) {
        wx.navigateTo({ url: `/pages/dispatcher/butler-detail/index?id=${event.detail.id}` });
    }
});
