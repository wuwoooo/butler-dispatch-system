"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getToken = getToken;
exports.getUser = getUser;
exports.saveSession = saveSession;
exports.clearSession = clearSession;
const TOKEN_KEY = "token";
const USER_KEY = "user";
function getToken() {
    return wx.getStorageSync(TOKEN_KEY) || "";
}
function getUser() {
    return wx.getStorageSync(USER_KEY);
}
function saveSession(token, user) {
    wx.setStorageSync(TOKEN_KEY, token);
    wx.setStorageSync(USER_KEY, user);
}
function clearSession() {
    wx.removeStorageSync(TOKEN_KEY);
    wx.removeStorageSync(USER_KEY);
}
