/**
 * 文件说明：封装微信官方 iLink HTTP 协议，限制服务地址，设置认证头，并统一处理超时、取消及脱敏错误。
 */

import { randomBytes } from 'node:crypto';
/** 对照 Tencent/openclaw-weixin 2.4.8 的公开 iLink 协议实现，不依赖 OpenClaw 进程。 */
export const WECHAT_BASE = 'https://ilinkai.weixin.qq.com';
export function officialBase(input: string) {
  const url = new URL(input);
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !(url.hostname === 'weixin.qq.com' || url.hostname.endsWith('.weixin.qq.com'))) throw new Error('微信返回了不受支持的服务地址');
  return url.origin;
}
export type WechatResponse = {
  ret?: number; errcode?: number;
  qrcode?: string; qrcode_img_content?: string; status?: string;
  bot_token?: string; ilink_bot_id?: string; baseurl?: string; redirect_host?: string;
  get_updates_buf?: string;
  msgs?: { from_user_id?: string; context_token?: string; message_type?: number }[];
};
export class WechatError extends Error { constructor(message: string, public code?: number) { super(message); } }
export type WechatRequest = (base: string, endpoint: string, body?: Record<string, unknown>, token?: string, signal?: AbortSignal) => Promise<WechatResponse>;
export function createWechatRequest(fetcher: typeof fetch): WechatRequest {
  return async (base, endpoint, body, token, signal) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), endpoint.includes('getupdates') || endpoint.includes('get_qrcode_status') ? 40000 : 15000);
    const abort = () => controller.abort();
    if (signal?.aborted) controller.abort();
    else signal?.addEventListener('abort', abort, { once: true });
    const headers: Record<string, string> = { 'iLink-App-Id': 'bot', 'iLink-App-ClientVersion': String((2 << 16) | (4 << 8) | 8) };
    if (body) Object.assign(headers, {
      'Content-Type': 'application/json', AuthorizationType: 'ilink_bot_token',
      'X-WECHAT-UIN': Buffer.from(String(randomBytes(4).readUInt32BE())).toString('base64'),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    });
    try {
      const response = await fetcher(`${officialBase(base)}/ilink/bot/${endpoint}`, {
        method: body ? 'POST' : 'GET', headers, redirect: 'error',
        signal: controller.signal,
        ...(body ? { body: JSON.stringify({ ...body, base_info: { channel_version: '2.4.8', bot_agent: 'wttch-hub/1.0.0' } }) } : {}),
      });
      if (!response.ok) throw new WechatError(`微信服务 HTTP ${response.status}`);
      const value = await response.json() as WechatResponse;
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new WechatError('微信响应格式错误');
      const code = value.errcode || value.ret;
      if (code) throw new WechatError(code === -14 ? '微信登录已失效，请重新扫码' : `微信拒绝请求（${code}），请检查会话状态或重新向机器人发一条消息`, code);
      return value;
    } catch (error) {
      if (error instanceof WechatError) throw error;
      // 不把 URL 查询中的二维码、验证码或服务端原文带回渲染器和日志。
      throw new WechatError(signal?.aborted ? '操作已取消' : '微信网络请求失败或超时，请稍后重试');
    } finally { clearTimeout(timeout); signal?.removeEventListener('abort', abort); }
  };
}
