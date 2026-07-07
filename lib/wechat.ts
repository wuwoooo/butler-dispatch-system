type WechatSession = {
  openid: string;
  unionid?: string;
};

type WechatResponse = {
  openid?: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
};

export class WechatLoginError extends Error {
  constructor(
    message: string,
    readonly code = "WECHAT_LOGIN_FAILED"
  ) {
    super(message);
  }
}

/** 只在服务端调用；AppSecret 不会进入客户端响应或日志。 */
export async function exchangeMiniProgramCode(code: string): Promise<WechatSession> {
  if (!code.trim()) {
    throw new WechatLoginError("微信登录凭证不能为空", "WECHAT_CODE_INVALID");
  }

  if (process.env.WECHAT_MOCK_LOGIN === "true") {
    return { openid: code.trim() };
  }

  const appId = process.env.WECHAT_MINIPROGRAM_APPID;
  const appSecret = process.env.WECHAT_MINIPROGRAM_SECRET;

  if (!appId || !appSecret) {
    throw new WechatLoginError(
      "微信小程序环境变量未配置，请联系管理员",
      "WECHAT_CONFIG_MISSING"
    );
  }

  let response: Response;
  try {
    const query = new URLSearchParams({
      appid: appId,
      secret: appSecret,
      js_code: code,
      grant_type: "authorization_code"
    });
    response = await fetch(
      `https://api.weixin.qq.com/sns/jscode2session?${query.toString()}`,
      { cache: "no-store" }
    );
  } catch {
    throw new WechatLoginError("无法连接微信登录服务，请稍后重试");
  }

  let payload: WechatResponse;
  try {
    payload = (await response.json()) as WechatResponse;
  } catch {
    throw new WechatLoginError("微信登录服务返回异常");
  }

  if (!response.ok || !payload.openid) {
    throw new WechatLoginError(
      payload.errmsg || "微信登录凭证无效或已过期",
      "WECHAT_CODE_INVALID"
    );
  }

  return { openid: payload.openid, unionid: payload.unionid };
}
