"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fallbackAppVersion = exports.appName = exports.leaveTypes = exports.rejectReasons = void 0;
exports.getAppVersionText = getAppVersionText;
exports.rejectReasons = ["时间冲突", "身体原因", "临时有事", "其他"];
exports.leaveTypes = [
    { label: "事假", value: "personal" },
    { label: "病假", value: "sick" },
    { label: "休息", value: "rest" },
    { label: "其他", value: "other" }
];
exports.appName = "阿鹏哥管家调配系统";
exports.fallbackAppVersion = "1.2.5";
const envVersionTextMap = {
    develop: "开发版",
    trial: "体验版"
};
function getAppVersionText() {
    const accountInfo = typeof wx.getAccountInfoSync === "function" ? wx.getAccountInfoSync() : null;
    const miniProgram = (accountInfo === null || accountInfo === void 0 ? void 0 : accountInfo.miniProgram) || {};
    const version = typeof miniProgram.version === "string" ? miniProgram.version.trim() : "";
    if (version) {
        return `${exports.appName} v${version}`;
    }
    const envVersion = typeof miniProgram.envVersion === "string" ? miniProgram.envVersion : "";
    const envText = envVersionTextMap[envVersion];
    if (envText) {
        return `${exports.appName} ${envText}`;
    }
    return `${exports.appName} v${exports.fallbackAppVersion}`;
}
