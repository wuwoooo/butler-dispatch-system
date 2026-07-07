"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const status_map_1 = require("../../utils/status-map");
Component({
    properties: {
        type: { type: String, value: "order" },
        value: { type: String, value: "" },
        text: { type: String, value: "" },
        size: { type: String, value: "md" } // sm | md
    },
    data: {
        label: "",
        tone: "gray"
    },
    observers: {
        "type,value,text": function updateTag(type, value, text) {
            const status = (0, status_map_1.getStatus)(type, value);
            this.setData({
                label: text || status.text,
                tone: status.tone || "gray"
            });
        }
    }
});
