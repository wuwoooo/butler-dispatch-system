"use strict";
Component({
    properties: {
        text: { type: String, value: "正在加载" },
        mode: { type: String, value: "spinner" }, // spinner | skeleton
        skeletonRows: { type: Number, value: 3 }
    }
});
