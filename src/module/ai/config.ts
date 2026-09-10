/**
 * 文件说明：定义 AI 配置的默认值、持久化结构和校验规则，规范服务地址及模型等可保存的配置字段。
 */

import type { AiConfigurationUpdate } from './contracts';
import { DEFAULT_AI_STATUS, isRecord } from './shared';

export type StoredAiConfiguration = Omit<AiConfigurationUpdate, 'apiKey'> & { encryptedKey?: string };
export const defaultConfiguration = (): StoredAiConfiguration => ({
  enabled: DEFAULT_AI_STATUS.enabled, provider: DEFAULT_AI_STATUS.provider,
  baseUrl: DEFAULT_AI_STATUS.baseUrl, model: DEFAULT_AI_STATUS.model, timeoutMs: DEFAULT_AI_STATUS.timeoutMs,
});

/**
 * baseUrl 是服务根路径（例如 /v1），宿主统一拼接 /chat/completions。
 * 禁止 URL 中携带账号、查询参数和片段，防止把密钥写入地址或误发送到错误端点。
 * 远程服务要求 HTTPS，本机兼容服务允许 HTTP；不跟随重定向转发 Authorization。
 */
export const normalizeBaseUrl = (value: unknown): string => {
  if (typeof value !== 'string' || value.length > 2048) throw new Error('请填写有效的服务地址。');
  let url: URL;
  try { url = new URL(value.trim()); } catch { throw new Error('服务地址必须是完整的 HTTP(S) URL。'); }
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) throw new Error('远程服务请使用 HTTPS；HTTP 仅支持本机地址。');
  if (url.username || url.password || url.search || url.hash) throw new Error('服务地址不能包含账号、查询参数或片段。');
  url.pathname = url.pathname.replace(/\/+$/, '').replace(/\/chat\/completions$/, '');
  return url.toString().replace(/\/+$/, '');
};

export const validateConfiguration = (input: unknown): AiConfigurationUpdate => {
  if (!isRecord(input) || typeof input.enabled !== 'boolean'
    || (input.provider !== 'deepseek' && input.provider !== 'compatible')) throw new Error('AI 配置格式无效。');
  if (typeof input.model !== 'string' || !input.model.trim() || input.model.length > 200) throw new Error('请填写模型名称（最多 200 字符）。');
  if (typeof input.timeoutMs !== 'number' || !Number.isInteger(input.timeoutMs) || input.timeoutMs < 5000 || input.timeoutMs > 300_000) {
    throw new Error('请求超时须为 5 到 300 秒。');
  }
  if (input.apiKey !== undefined && (typeof input.apiKey !== 'string' || input.apiKey.length > 8192 || /[\r\n]/.test(input.apiKey))) {
    throw new Error('API Key 格式无效。');
  }
  const baseUrl = normalizeBaseUrl(input.baseUrl);
  if (input.provider === 'deepseek' && baseUrl !== 'https://api.deepseek.com' && baseUrl !== 'https://api.deepseek.com/v1') {
    throw new Error('DeepSeek 预设使用官方地址；其他地址请选择兼容服务。');
  }
  return {
    enabled: input.enabled, provider: input.provider, baseUrl, model: input.model.trim(), timeoutMs: input.timeoutMs,
    ...(typeof input.apiKey === 'string' ? { apiKey: input.apiKey.trim() } : {}),
  };
};

/** 只读取白名单字段，磁盘文件中的明文 apiKey 即使存在也不接受。 */
export const parseStoredConfiguration = (raw: string): StoredAiConfiguration => {
  const value: unknown = JSON.parse(raw);
  if (!isRecord(value)) throw new Error('配置文件格式无效');
  const checked = validateConfiguration({ ...value, apiKey: undefined });
  const { apiKey: _apiKey, ...publicFields } = checked;
  if (value.encryptedKey !== undefined && (typeof value.encryptedKey !== 'string' || value.encryptedKey.length > 32_000)) throw new Error('密钥格式无效');
  return { ...publicFields, ...(value.encryptedKey ? { encryptedKey: value.encryptedKey as string } : {}) };
};
