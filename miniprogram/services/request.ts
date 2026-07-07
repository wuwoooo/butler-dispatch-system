/* eslint-disable @typescript-eslint/no-explicit-any */
import { clearSession, getToken } from "../utils/auth";

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  data?: AnyRecord;
  loading?: boolean;
  silent?: boolean;
};

export function getBaseURL() {
  return getApp().globalData?.baseURL || "http://localhost:3000";
}

export function request<T = any>(url: string, options: RequestOptions = {}): Promise<T> {
  const token = getToken();
  const showLoading = options.loading !== false && !options.silent;

  if (showLoading) {
    wx.showLoading({ title: "加载中", mask: true });
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${getBaseURL()}${url}`,
      method: options.method || "GET",
      data: options.data || {},
      header: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      success: (res: AnyRecord) => {
        const body = res.data || {};
        const isBindUrl = url.includes("/auth/bind");
        if (res.statusCode === 401 && !isBindUrl) {
          clearSession();
          if (!options.silent) {
            wx.showToast({ title: "登录已失效，请重新登录", icon: "none" });
          }
          wx.reLaunch({ url: "/pages/login/index" });
          reject(new Error("UNAUTHORIZED"));
          return;
        }

        if (res.statusCode >= 200 && res.statusCode < 300 && body.success) {
          resolve(body.data as T);
          return;
        }

        const message = body?.error?.message || body?.message || "请求失败";
        if (!options.silent) {
          wx.showToast({ title: message, icon: "none" });
        }
        reject(new Error(message));
      },
      fail: () => {
        const message = "网络异常，请稍后重试";
        if (!options.silent) {
          wx.showToast({ title: message, icon: "none" });
        }
        reject(new Error(message));
      },
      complete: () => {
        if (showLoading) {
          wx.hideLoading();
        }
      }
    });
  });
}

export const http = {
  get: <T = any>(url: string, options?: RequestOptions) =>
    request<T>(url, { ...options, method: "GET" }),
  post: <T = any>(url: string, data?: AnyRecord, options?: RequestOptions) =>
    request<T>(url, { ...options, method: "POST", data }),
  put: <T = any>(url: string, data?: AnyRecord, options?: RequestOptions) =>
    request<T>(url, { ...options, method: "PUT", data }),
  delete: <T = any>(url: string, options?: RequestOptions) =>
    request<T>(url, { ...options, method: "DELETE" })
};

export function buildQuery(params: AnyRecord = {}) {
  const pairs = Object.keys(params)
    .filter((key) => params[key] !== undefined && params[key] !== null && params[key] !== "")
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(String(params[key]))}`);
  return pairs.length ? `?${pairs.join("&")}` : "";
}
