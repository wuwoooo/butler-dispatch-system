"use strict";
Component({
    properties: {
        item: { type: Object, value: {} },
        selectable: { type: Boolean, value: false },
        selected: { type: Boolean, value: false }
    },
    data: {
        avatar: "?",
        reasonText: ""
    },
    observers: {
        item(item) {
            this.setData({
                avatar: ((item === null || item === void 0 ? void 0 : item.name) || "?").slice(0, 1),
                reasonText: Array.isArray(item === null || item === void 0 ? void 0 : item.unavailableReasons)
                    ? item.unavailableReasons.join("、")
                    : ""
            });
        }
    },
    methods: {
        handleTap() {
            this.triggerEvent("tap", this.properties.item);
        }
    }
});
