"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const butler_1 = require("../../../services/butler");
const statusTabs = [
    { key: "all", text: "全部" },
    { key: "available", text: "空闲" },
    { key: "working", text: "接待中" },
    { key: "on_leave", text: "请假" }
];
Page({
    data: {
        statusTabs,
        activeStatus: "all",
        keyword: "",
        all: [],
        items: [],
        loading: true
    },
    onLoad(query) {
        if (query.status) {
            this.setData({ activeStatus: query.status });
        }
    },
    onShow() {
        this.load();
    },
    onPullDownRefresh() {
        this.load().finally(() => wx.stopPullDownRefresh());
    },
    async load() {
        this.setData({ loading: true });
        try {
            const data = await (0, butler_1.getButlers)();
            this.setData({ all: data.items || [] });
            this.filter();
        }
        catch (_a) {
            // 接口自动提示
        }
        finally {
            this.setData({ loading: false });
        }
    },
    setKeyword(event) {
        this.setData({ keyword: event.detail.value });
        this.filter();
    },
    switchStatus(event) {
        this.setData({ activeStatus: event.currentTarget.dataset.key });
        this.filter();
    },
    filter() {
        const keyword = this.data.keyword;
        const activeStatus = this.data.activeStatus;
        this.setData({
            items: this.data.all.filter((item) => {
                var _a;
                const matchesKeyword = !keyword || [item.name, item.phone, (_a = item.user) === null || _a === void 0 ? void 0 : _a.username].some((value) => value === null || value === void 0 ? void 0 : value.includes(keyword));
                const matchesStatus = activeStatus === "all" || item.status === activeStatus;
                return matchesKeyword && matchesStatus;
            })
        });
    },
    open(event) {
        wx.navigateTo({ url: `/pages/dispatcher/butler-detail/index?id=${event.detail.id}` });
    }
});
