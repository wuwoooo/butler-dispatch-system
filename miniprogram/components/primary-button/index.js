"use strict";
Component({
    properties: {
        text: { type: String, value: "确认" },
        tone: { type: String, value: "primary" },
        disabled: { type: Boolean, value: false }
    },
    methods: {
        handleTap() {
            if (!this.properties.disabled) {
                this.triggerEvent("tap");
            }
        }
    }
});
