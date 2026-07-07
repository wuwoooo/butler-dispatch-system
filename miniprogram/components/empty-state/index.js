"use strict";
Component({
    properties: {
        title: { type: String, value: "暂无数据" },
        description: { type: String, value: "当前没有需要处理的内容" },
        buttonText: { type: String, value: "" },
        scene: { type: String, value: "default" } // orders | notifications | butlers | data | leave | default
    },
    methods: {
        handleTap() {
            this.triggerEvent("refresh");
        }
    }
});
