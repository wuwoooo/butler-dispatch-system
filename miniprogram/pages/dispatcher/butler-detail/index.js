"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const butler_1 = require("../../../services/butler");
const format_1 = require("../../../utils/format");
Page({
    data: {
        id: "",
        butler: {},
        avatar: "?",
        rows: [],
        assignments: []
    },
    onLoad(query) {
        this.setData({ id: query.id || "" });
        this.load();
    },
    async load() {
        var _a, _b;
        const butler = await (0, butler_1.getButlerDetail)(this.data.id);
        this.setData({
            butler,
            avatar: (butler.name || "?").slice(0, 1),
            rows: [
                ["姓名", butler.name],
                ["手机号", butler.phone, butler.phone],
                ["标准车型", { sedan: "轿车", suv: "SUV", business: "商务车" }[butler.vehicleType] || "待补齐"],
                ["车辆信息", butler.vehicleInfo || "-"],
                ["平均评分", butler.averageScore || "0.00"],
                ["评价次数", butler.reviewCount || 0],
                ["登录账号", ((_a = butler.user) === null || _a === void 0 ? void 0 : _a.username) || "-"],
                ["小程序绑定", ((_b = butler.user) === null || _b === void 0 ? void 0 : _b.miniProgramBound) ? "已绑定" : "未绑定"]
            ],
            assignments: (butler.activeAssignments || []).map((item) => {
                var _a, _b, _c, _d;
                return (Object.assign(Object.assign({}, item), { dateText: ((_a = item.order) === null || _a === void 0 ? void 0 : _a.serviceStartAt) && ((_b = item.order) === null || _b === void 0 ? void 0 : _b.serviceEndAt)
                        ? `${(0, format_1.formatDateTime)(item.order.serviceStartAt)} 至 ${(0, format_1.formatDateTime)(item.order.serviceEndAt)}`
                        : `${(0, format_1.formatDate)((_c = item.order) === null || _c === void 0 ? void 0 : _c.checkInDate)} 至 ${(0, format_1.formatDate)((_d = item.order) === null || _d === void 0 ? void 0 : _d.checkOutDate)}` }));
            })
        });
    }
});
