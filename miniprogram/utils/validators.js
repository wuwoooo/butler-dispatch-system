"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireField = requireField;
exports.ensureEndAfterStart = ensureEndAfterStart;
function requireField(value, message) {
    if (value === undefined || value === null || String(value).trim() === "") {
        wx.showToast({ title: message, icon: "none" });
        return false;
    }
    return true;
}
function ensureEndAfterStart(start, end) {
    if (new Date(end).getTime() <= new Date(start).getTime()) {
        wx.showToast({ title: "结束时间必须晚于开始时间", icon: "none" });
        return false;
    }
    return true;
}
