import { http } from "./request";

export function wechatLogin(code: string, options?: { silent?: boolean }) {
  return http.post("/api/miniprogram/auth/wechat-login", { code }, options);
}

export function bindAccount(
  data: { code: string; username: string; password: string },
  options?: { silent?: boolean }
) {
  return http.post("/api/miniprogram/auth/bind", data, options);
}

export function getCurrentUser(options?: { silent?: boolean }) {
  return http.get<{ user: AnyRecord }>("/api/miniprogram/auth/me", options);
}

export function unbindMiniProgram() {
  return http.post("/api/miniprogram/auth/unbind");
}

export function changePassword(data: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}) {
  return http.post("/api/auth/change-password", data);
}
