"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const butler_1 = require("../../../services/butler");
const status_map_1 = require("../../../utils/status-map");
const rangeTabs = [
    { key: "month", text: "本月" },
    { key: "year", text: "本年" },
    { key: "all", text: "所有" }
];
Page({
    data: {
        rangeTabs,
        range: "month",
        stats: {},
        records: [],
        reviews: []
    },
    onShow() {
        this.load();
    },
    async load() {
        const rangeParams = buildRangeParams(this.data.range);
        const [stats, records, reviews] = await Promise.all([
            (0, butler_1.getButlerStatistics)({ range: this.data.range }),
            (0, butler_1.getButlerOrderRecords)(Object.assign({ pageSize: 5 }, rangeParams)),
            (0, butler_1.getButlerReviews)(rangeParams)
        ]);
        this.setData({
            stats,
            records: (records.items || []).map((item) => (Object.assign(Object.assign({}, item), { statusText: item.completed ? "已完成" : (0, status_map_1.getStatus)("assignment", item.status).text }))),
            reviews: (reviews.items || []).slice(0, 3).map((item) => {
                var _a;
                return (Object.assign(Object.assign({}, item), { orderId: item.orderId || ((_a = item.order) === null || _a === void 0 ? void 0 : _a.id) }));
            })
        });
    },
    switchRange(event) {
        this.setData({ range: event.currentTarget.dataset.key });
        this.load();
    },
    openStat(event) {
        const { url, action } = event.detail || {};
        if (url) {
            wx.navigateTo({ url });
            return;
        }
        if (action === "records") {
            wx.pageScrollTo({ selector: "#records-anchor", duration: 260 });
            return;
        }
        if (action === "reviews") {
            wx.pageScrollTo({ selector: "#reviews-anchor", duration: 260 });
        }
    },
    openOrder(event) {
        const { orderId, assignmentId } = event.currentTarget.dataset;
        if (!orderId)
            return;
        const query = assignmentId ? `&assignmentId=${assignmentId}` : "";
        wx.navigateTo({ url: `/pages/butler/order-detail/index?orderId=${orderId}${query}` });
    }
});
function buildRangeParams(range) {
    if (range === "all") {
        return {};
    }
    const now = new Date();
    const start = range === "year"
        ? new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0)
        : new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return {
        startTime: start.toISOString(),
        endTime: end.toISOString()
    };
}
