/**
 * 文件说明：集中维护 AI 默认状态、DeepSeek 模型选项和结果辅助函数，供配置、服务与界面复用。
 */

import type { AiErrorCode, AiResult, AiStatus } from '@wttch-hub/plugin-api';

/** 下拉菜单的展示名称与 API 模型 ID 分开，保存和调用始终使用服务商的完整 ID。 */
export const DEEPSEEK_MODELS = [
  { label: 'Flash', value: 'deepseek-v4-flash' },
  { label: 'Pro', value: 'deepseek-v4-pro' },
] as const;

/** DeepSeek Chat Completions 文档：https://api-docs.deepseek.com/api/create-chat-completion/ */
export const DEFAULT_AI_STATUS: AiStatus = {
  enabled: true, configured: false, hasApiKey: false,
  provider: 'deepseek', baseUrl: 'https://api.deepseek.com', model: DEEPSEEK_MODELS[0].value,
  timeoutMs: 120_000, connection: 'untested',
};
export const aiFailure = <T = never>(code: AiErrorCode, message: string, retryable = false, status?: number): AiResult<T> =>
  ({ ok: false, error: { code, message, retryable, ...(status === undefined ? {} : { status }) } });
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
