export interface WechatCodeSession {
  openid?: string;
  unionid?: string;
  session_key?: string;
  errcode?: number;
  errmsg?: string;
}

interface WechatAccessTokenResponse {
  access_token?: string;
  expires_in?: number;
  errcode?: number;
  errmsg?: string;
}

interface WechatSubscribeMessageResponse {
  errcode?: number;
  errmsg?: string;
}

let cachedAccessToken = "";
let accessTokenExpiresAt = 0;

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

async function getWechatAccessToken(): Promise<string> {
  if (cachedAccessToken && Date.now() < accessTokenExpiresAt) return cachedAccessToken;

  const appid = process.env.WECHAT_MINI_APPID?.trim();
  const secret = process.env.WECHAT_MINI_SECRET?.trim();
  if (!appid || !secret) {
    throw new Error("微信订阅消息未配置（需 WECHAT_MINI_APPID + WECHAT_MINI_SECRET）");
  }

  const url = new URL("https://api.weixin.qq.com/cgi-bin/token");
  url.searchParams.set("grant_type", "client_credential");
  url.searchParams.set("appid", appid);
  url.searchParams.set("secret", secret);

  const res = await fetch(url);
  const data = (await res.json()) as WechatAccessTokenResponse;
  if (!res.ok || data.errcode || !data.access_token) {
    throw Object.assign(new Error(data.errmsg || "获取微信 access_token 失败"), {
      code: data.errcode,
    });
  }

  cachedAccessToken = data.access_token;
  accessTokenExpiresAt = Date.now() + Math.max(60, (data.expires_in ?? 7200) - 300) * 1000;
  return cachedAccessToken;
}

export async function sendStudyReminderMessage(input: {
  openid: string;
  templateId: string;
  page: string;
  thingKey: string;
  timeKey: string;
  reminderAt: string;
}): Promise<void> {
  const accessToken = await getWechatAccessToken();
  const res = await fetch(
    `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${encodeURIComponent(accessToken)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        touser: input.openid,
        template_id: input.templateId,
        page: input.page,
        miniprogram_state: process.env.NODE_ENV === "production" ? "formal" : "developer",
        lang: "zh_CN",
        data: {
          [input.thingKey]: { value: "今天的课本单词等你听写" },
          [input.timeKey]: { value: input.reminderAt },
        },
      }),
    }
  );
  const data = (await res.json()) as WechatSubscribeMessageResponse;
  if (!res.ok || (data.errcode ?? 0) !== 0) {
    throw Object.assign(new Error(data.errmsg || "发送微信订阅消息失败"), {
      code: data.errcode,
    });
  }
}
