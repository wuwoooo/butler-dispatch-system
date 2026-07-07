const TOKEN_KEY = "token";
const USER_KEY = "user";

export function getToken() {
  return wx.getStorageSync(TOKEN_KEY) || "";
}

export function getUser<T = AnyRecord>() {
  return wx.getStorageSync(USER_KEY) as T | null;
}

export function saveSession(token: string, user: AnyRecord) {
  wx.setStorageSync(TOKEN_KEY, token);
  wx.setStorageSync(USER_KEY, user);
}

export function clearSession() {
  wx.removeStorageSync(TOKEN_KEY);
  wx.removeStorageSync(USER_KEY);
}

