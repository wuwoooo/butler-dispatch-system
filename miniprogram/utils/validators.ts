export function requireField(value: unknown, message: string) {
  if (value === undefined || value === null || String(value).trim() === "") {
    wx.showToast({ title: message, icon: "none" });
    return false;
  }
  return true;
}

export function ensureEndAfterStart(start: string, end: string) {
  if (new Date(end).getTime() <= new Date(start).getTime()) {
    wx.showToast({ title: "结束时间必须晚于开始时间", icon: "none" });
    return false;
  }
  return true;
}

