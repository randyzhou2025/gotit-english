export interface WechatCodeSession {
  openid?: string;
  unionid?: string;
  session_key?: string;
  errcode?: number;
  errmsg?: string;
}

export async function code2Session(code: string): Promise<{ openid: string }> {
  const appid = process.env.WECHAT_MINI_APPID;
  const secret = process.env.WECHAT_MINI_SECRET?.trim();
  const mockOpenid = process.env.WECHAT_MINI_MOCK_OPENID?.trim();

  // 仅在没有 AppSecret 的本地开发时走 mock；一旦配置了 Secret 一律调微信 code2Session
  if (!secret && mockOpenid && process.env.NODE_ENV !== "production") {
    return { openid: mockOpenid };
  }

  if (!appid || !secret) {
    throw Object.assign(new Error("微信小程序登录未配置（需 WECHAT_MINI_APPID + WECHAT_MINI_SECRET）"), {
      statusCode: 503,
    });
  }

  const url = new URL("https://api.weixin.qq.com/sns/jscode2session");
  url.searchParams.set("appid", appid);
  url.searchParams.set("secret", secret);
  url.searchParams.set("js_code", code);
  url.searchParams.set("grant_type", "authorization_code");

  const res = await fetch(url);
  const data = (await res.json()) as WechatCodeSession;
  if (!res.ok || data.errcode || !data.openid) {
    throw Object.assign(new Error(data.errmsg || "微信登录失败"), { statusCode: 401 });
  }

  return { openid: data.openid };
}
