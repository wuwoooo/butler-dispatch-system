"use strict";
function getNavMetrics() {
    try {
        const menu = wx.getMenuButtonBoundingClientRect();
        const windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
        const ratio = 750 / windowInfo.windowWidth;
        return {
            headTop: Math.ceil((menu.bottom + 14) * ratio),
            backTop: Math.ceil((menu.bottom + 14) * ratio + 2),
            titleRightInset: Math.ceil((windowInfo.windowWidth - menu.left + 12) * ratio)
        };
    }
    catch (_a) {
        return {
            headTop: 100,
            backTop: 102,
            titleRightInset: 220
        };
    }
}
Component({
    options: { multipleSlots: true },
    properties: {
        title: { type: String, value: "" },
        subtitle: { type: String, value: "" },
        hero: { type: Boolean, value: false }
    },
    data: {
        headTop: 100,
        backTop: 102,
        titleRightInset: 220,
        canGoBack: false
    },
    lifetimes: {
        attached() {
            this.setData(Object.assign(Object.assign({}, getNavMetrics()), { canGoBack: getCurrentPages().length > 1 }));
        }
    },
    methods: {
        goBack() {
            if (getCurrentPages().length > 1) {
                wx.navigateBack();
            }
        }
    }
});
