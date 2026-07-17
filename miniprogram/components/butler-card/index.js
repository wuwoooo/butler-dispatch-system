"use strict";
Component({
    properties: {
        item: { type: Object, value: {} },
        selectable: { type: Boolean, value: false },
        selected: { type: Boolean, value: false }
    },
    data: {
        avatar: "?",
        reasonText: "",
        vehicleTypeText: "车型待补齐",
        statusRing: "default" // available | on_leave | default
    },
    observers: {
        item(item) {
            if (!item)
                return;
            let statusRing = "default";
            if (item.status === "available") {
                statusRing = "available";
            }
            else if (item.status === "on_leave") {
                statusRing = "on_leave";
            }
            this.setData({
                avatar: (item.name || "?").slice(0, 1),
                reasonText: Array.isArray(item.unavailableReasons)
                    ? item.unavailableReasons.join("、")
                    : "",
                vehicleTypeText: { sedan: "轿车", suv: "SUV", business: "商务车" }[item.vehicleType] || "车型待补齐",
                statusRing
            });
        }
    },
    methods: {
        handleTap() {
            const item = this.properties.item;
            if (this.properties.selectable) {
                if (!(item === null || item === void 0 ? void 0 : item.id) || item.available === false)
                    return;
                this.triggerEvent("select", item);
                return;
            }
            this.triggerEvent("tap", item);
        }
    }
});
