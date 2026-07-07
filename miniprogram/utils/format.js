"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatDate = formatDate;
exports.formatDateFull = formatDateFull;
exports.formatDateTime = formatDateTime;
exports.formatDateTimeFull = formatDateTimeFull;
exports.todayText = todayText;
exports.maskPhone = maskPhone;
function formatDate(value) {
    if (!value)
        return "-";
    const date = typeof value === "string" ? new Date(value) : value;
    if (Number.isNaN(date.getTime()))
        return "-";
    return `${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
function formatDateFull(value) {
    if (!value)
        return "-";
    const date = typeof value === "string" ? new Date(value) : value;
    if (Number.isNaN(date.getTime()))
        return "-";
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
function formatDateTime(value) {
    if (!value)
        return "-";
    const date = typeof value === "string" ? new Date(value) : value;
    if (Number.isNaN(date.getTime()))
        return "-";
    return `${formatDate(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
function formatDateTimeFull(value) {
    if (!value)
        return "-";
    const date = typeof value === "string" ? new Date(value) : value;
    if (Number.isNaN(date.getTime()))
        return "-";
    return `${formatDateFull(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
function todayText() {
    return formatDateFull(new Date());
}
function maskPhone(phone) {
    if (!phone)
        return "-";
    if (phone.length < 7)
        return phone;
    return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}
function pad(value) {
    return String(value).padStart(2, "0");
}
