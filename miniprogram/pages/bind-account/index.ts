import { bindAccount } from "../../services/auth";
import { ApiRequestError } from "../../services/request";
import { saveSession } from "../../utils/auth";
import { redirectByRole } from "../../utils/router";
import { requireField } from "../../utils/validators";

Page({
  data: {
    code: "",
    username: "",
    password: ""
  },
  onLoad(query: AnyRecord) {
    this.setData({ code: query.code || "" });
  },
  onUsername(event: AnyRecord) {
    this.setData({ username: event.detail.value });
  },
  onPassword(event: AnyRecord) {
    this.setData({ password: event.detail.value });
  },
  refreshCode(): Promise<string> {
    return new Promise((resolve, reject) => {
      wx.login({
        success: (res: AnyRecord) => {
          this.setData({ code: res.code });
          resolve(res.code);
        },
        fail: reject
      });
    });
  },
  async handleSubmit() {
    if (!requireField(this.data.username, "请输入系统账号")) return;
    if (!requireField(this.data.password, "请输入密码")) return;

    try {
      const code = await this.refreshCode();
      const data = await bindAccount({
        code,
        username: this.data.username,
        password: this.data.password
      }, { silent: true });
      saveSession(data.token, data.user);
      wx.showToast({ title: "绑定成功", icon: "success" });
      redirectByRole(data.user, true);
    } catch (error) {
      wx.showToast({ title: getBindErrorMessage(error), icon: "none", duration: 2500 });
      await this.refreshCode().catch(() => undefined);
    }
  }
});

function getBindErrorMessage(error: unknown) {
  if (error instanceof ApiRequestError) {
    if (error.code === "WECHAT_CODE_INVALID") {
      return "微信登录凭证已过期，请重新提交";
    }
    if (error.message) {
      return error.message;
    }
  }
  return "绑定失败，请稍后重试";
}
