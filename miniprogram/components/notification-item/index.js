"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const format_1 = require("../../utils/format");
Component({
    properties: {
        item: { type: Object, value: {} }
    },
    data: {
        time: ""
    },
    observers: {
        item(item) {
            this.setData({ time: (0, format_1.formatDateTime)(item.createdAt) });
        }
    },
    methods: {
        handleTap() {
            this.triggerEvent("tap", this.properties.item);
        }
    }
});
