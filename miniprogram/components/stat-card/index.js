"use strict";
Component({
    properties: {
        label: { type: String, value: "" },
        value: { type: null, value: 0 },
        tone: { type: String, value: "blue" },
        url: { type: String, value: "" },
        action: { type: String, value: "" }
    },
    methods: {
        handleTap() {
            if (!this.properties.url && !this.properties.action)
                return;
            this.triggerEvent("tap", {
                url: this.properties.url,
                action: this.properties.action
            });
        }
    }
});
