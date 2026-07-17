export const rejectReasons = ["时间冲突", "身体原因", "临时有事", "其他"];
export const leaveTypes = [
  { label: "事假", value: "personal" },
  { label: "病假", value: "sick" },
  { label: "休息", value: "rest" },
  { label: "其他", value: "other" }
];

export const appName = "阿鹏哥管家调配系统";
export const fallbackAppVersion = "1.2.5";

const envVersionTextMap: Record<string, string> = {
  develop: "开发版",
  trial: "体验版"
};

export function getAppVersionText() {
  const accountInfo =
    typeof wx.getAccountInfoSync === "function" ? wx.getAccountInfoSync() : null;
  const miniProgram = accountInfo?.miniProgram || {};
  const version = typeof miniProgram.version === "string" ? miniProgram.version.trim() : "";

  if (version) {
    return `${appName} v${version}`;
  }

  const envVersion =
    typeof miniProgram.envVersion === "string" ? miniProgram.envVersion : "";
  const envText = envVersionTextMap[envVersion];

  if (envText) {
    return `${appName} ${envText}`;
  }

  return `${appName} v${fallbackAppVersion}`;
}
