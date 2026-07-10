"use strict";
Component({
    properties: {
        visible: { type: Boolean, value: false },
        title: { type: String, value: "选择实际时间" }
    },
    data: {
        date: "",
        time: ""
    },
    observers: {
        visible(visible) {
            if (visible)
                this.resetToCurrentTime();
        }
    },
    methods: {
        resetToCurrentTime() {
            const now = new Date();
            this.setData({
                date: formatDate(now),
                time: `${pad(now.getHours())}:${pad(now.getMinutes())}`
            });
        },
        setDate(event) {
            this.setData({ date: event.detail.value });
        },
        setTime(event) {
            this.setData({ time: event.detail.value });
        },
        confirm() {
            const [year, month, day] = this.data.date.split("-").map(Number);
            const [hour, minute] = this.data.time.split(":").map(Number);
            const occurredAt = new Date(year, month - 1, day, hour, minute);
            this.triggerEvent("confirm", { occurredAt: occurredAt.toISOString() });
        },
        cancel() {
            this.triggerEvent("cancel");
        },
        noop() {
            // 防止点击面板内容透传。
        }
    }
});
function formatDate(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
function pad(value) {
    return String(value).padStart(2, "0");
}
