"use strict";
Component({
    properties: {
        text: { type: String, value: "确认" },
        tone: { type: String, value: "primary" }, // primary | success | danger | ghost
        disabled: { type: Boolean, value: false },
        loading: { type: Boolean, value: false }
    },
    methods: {
        handleTap() {
            if (!this.properties.disabled && !this.properties.loading) {
                this.triggerEvent("tap");
            }
        }
    }
});
