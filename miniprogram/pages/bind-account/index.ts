import { bindAccount } from "../../services/auth";
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

    const code = this.data.code || (await this.refreshCode());
    try {
      const data = await bindAccount({
        code,
        username: this.data.username,
        password: this.data.password
      });
      saveSession(data.token, data.user);
      wx.showToast({ title: "绑定成功", icon: "success" });
      redirectByRole(data.user, true);
    } catch {
      await this.refreshCode().catch(() => undefined);
    }
  }
});

