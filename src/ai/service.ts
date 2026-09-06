/**
 * 文件说明：实现统一 AI 请求服务，管理配置、鉴权、请求校验、并发、超时取消和服务商响应转换。
 */

import type { AiChatRequest, AiCompletion, AiResult, AiStatus, AiError, AiMessage } from '@wttch-hub/plugin-api';
import { defaultConfiguration, validateConfiguration, type StoredAiConfiguration } from './config';
import { aiFailure, isRecord } from './shared';

/** 通过依赖注入分离 Electron 密钥存储与网络，回归测试无需真实密钥或付费请求。 */
export interface AiServiceDependencies {
  read(): StoredAiConfiguration;
  write(config: StoredAiConfiguration): void;
  encrypt(key: string): string;
  decrypt(ciphertext: string): string;
  fetch: typeof globalThis.fetch;
  onStatus?: (status: AiStatus) => void;
}

/** 仅允许文本对话和已定义参数，不透传任意对象到服务商。 */
export const buildChatBody = (input: unknown, config: StoredAiConfiguration): Record<string, unknown> => {
  if (!isRecord(input) || !Array.isArray(input.messages) || input.messages.length < 1 || input.messages.length > 100) {
    throw new Error('对话需包含 1 到 100 条消息。');
  }
  let total = 0;
  const messages: AiMessage[] = input.messages.map((message) => {
    if (!isRecord(message) || typeof message.role !== 'string' || !['system', 'user', 'assistant'].includes(String(message.role))
      || typeof message.content !== 'string' || !message.content.trim()) throw new Error('消息角色或内容无效。');
    total += message.content.length;
    return { role: message.role as AiMessage['role'], content: message.content };
  });
  if (input.systemPrompt !== undefined) {
    if (typeof input.systemPrompt !== 'string') throw new Error('系统提示词必须是文本。');
    total += input.systemPrompt.length;
    if (input.systemPrompt.trim()) messages.unshift({ role: 'system', content: input.systemPrompt });
  }
  if (total > 100_000) throw new Error('对话内容超过 100000 字符，请缩短内容或新建对话。');
  if (messages.length > 100) throw new Error('包含系统提示词后最多允许 100 条消息。');
  const model = input.model ?? config.model;
  if (typeof model !== 'string' || !model.trim() || model.length > 200) throw new Error('模型名称无效。');
  const body: Record<string, unknown> = { model: model.trim(), messages, stream: false };
  if (input.temperature !== undefined) {
    if (typeof input.temperature !== 'number' || !Number.isFinite(input.temperature) || input.temperature < 0 || input.temperature > 2) throw new Error('temperature 须在 0 到 2 之间。');
    body.temperature = input.temperature;
  }
  if (input.maxTokens !== undefined) {
    if (typeof input.maxTokens !== 'number' || !Number.isInteger(input.maxTokens) || input.maxTokens < 1 || input.maxTokens > 65536) throw new Error('maxTokens 须为 1 到 65536 的整数。');
    body.max_tokens = input.maxTokens;
  }
  if (input.responseFormat !== undefined) {
    if (input.responseFormat !== 'text' && input.responseFormat !== 'json_object') throw new Error('输出格式无效。');
    body.response_format = { type: input.responseFormat };
  }
  if (input.thinking !== undefined && typeof input.thinking !== 'boolean') throw new Error('thinking 必须是布尔值。');
  if (config.provider === 'deepseek') body.thinking = { type: input.thinking === true ? 'enabled' : 'disabled' };
  return body;
};

/** 错误响应可能回显 Authorization 或输入内容，只返回状态码对应的受控说明。 */
const httpError = (status: number): AiResult<never> => {
  if (status === 401 || status === 403) return aiFailure('AUTH', '鉴权失败，请检查 API Key 和模型访问权限。', false, status);
  if (status === 429) return aiFailure('RATE_LIMIT', '请求受限，请稍后重试并检查服务额度。', true, status);
  if (status === 402) return aiFailure('PROVIDER', '服务余额不足，请检查服务商账户。', false, status);
  if (status === 400 || status === 404 || status === 422) return aiFailure('PROVIDER', '服务拒绝请求，请检查地址、模型名称和模型支持的参数。', false, status);
  return aiFailure('PROVIDER', `AI 服务返回 HTTP ${status}，请检查配置或稍后重试。`, status >= 500, status);
};

export const createAiService = (dependencies: AiServiceDependencies) => {
  let config = defaultConfiguration();
  let secret = '';
  let loaded = false;
  let storageError: AiError | undefined;
  let connection: AiStatus['connection'] = 'untested';
  let lastError: AiError | undefined;
  let checkedAt: string | undefined;
  let revision = 0;
  let latestAttempt = 0;
  const pending = new Map<string, { owner: string; controller: AbortController }>();

  const ensureLoaded = () => {
    if (loaded) return;
    loaded = true;
    try {
      config = dependencies.read();
      if (config.encryptedKey) secret = dependencies.decrypt(config.encryptedKey);
    } catch {
      storageError = { code: 'STORAGE', message: 'AI 配置或加密密钥无法读取，请重新保存配置和密钥。', retryable: false };
    }
  };
  const getStatus = (): AiStatus => {
    ensureLoaded();
    return {
      enabled: config.enabled, configured: Boolean(secret && config.baseUrl && config.model && !storageError),
      hasApiKey: Boolean(config.encryptedKey), provider: config.provider, baseUrl: config.baseUrl,
      model: config.model, timeoutMs: config.timeoutMs, connection,
      ...(checkedAt ? { checkedAt } : {}), ...(storageError || lastError ? { lastError: storageError ?? lastError } : {}),
    };
  };
  const publish = () => {
    try { dependencies.onStatus?.(getStatus()); } catch { /* 某个窗口关闭不应把成功保存或请求变成失败。 */ }
  };
  const requestKey = (owner: string, id: string) => JSON.stringify([owner, id]);

  const configure = (input: unknown): AiResult<AiStatus> => {
    ensureLoaded();
    let update: ReturnType<typeof validateConfiguration>;
    try { update = validateConfiguration(input); }
    catch (error) { return aiFailure('INVALID_REQUEST', (error as Error).message); }
    try {
      const { apiKey, ...fields } = update;
      // 切换服务地址时不能把旧服务的密钥自动带给新服务；需要重新输入密钥。
      const sameService = fields.provider === config.provider && fields.baseUrl === config.baseUrl;
      const nextSecret = apiKey !== undefined ? apiKey : sameService ? secret : '';
      const encryptedKey = nextSecret
        ? apiKey === undefined && sameService ? config.encryptedKey : dependencies.encrypt(nextSecret)
        : undefined;
      const next = { ...fields, ...(encryptedKey ? { encryptedKey } : {}) };
      dependencies.write(next);
      config = next;
      secret = nextSecret;
      storageError = undefined;
      lastError = undefined;
      checkedAt = undefined;
      connection = 'untested';
      revision += 1;
      // 修改配置后停止旧请求，避免旧模型的结果混入用户刚切换的新配置。
      for (const item of pending.values()) item.controller.abort();
      publish();
      return { ok: true, value: getStatus() };
    } catch {
      return aiFailure('STORAGE', '保存失败：请检查系统密钥存储和配置目录权限；原配置保持不变。');
    }
  };

  const chat = async (owner: string, input: unknown): Promise<AiResult<AiCompletion>> => {
    const status = getStatus();
    if (!status.enabled) return aiFailure('DISABLED', 'AI 服务已关闭，请在设置中启用。');
    if (storageError) return { ok: false, error: storageError };
    if (!status.configured) return aiFailure('NOT_CONFIGURED', '请先在设置中保存 AI 服务地址、模型和 API Key。');
    let body: Record<string, unknown>;
    try { body = buildChatBody(input, config); }
    catch (error) { return aiFailure('INVALID_REQUEST', (error as Error).message); }
    const request = input as AiChatRequest;
    const id = request.requestId ?? crypto.randomUUID();
    if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(id)) return aiFailure('INVALID_REQUEST', '请求 ID 格式无效。');
    const key = requestKey(owner, id);
    if (pending.has(key) || pending.size >= 12 || [...pending.values()].filter((item) => item.owner === owner).length >= 4) {
      return aiFailure('BUSY', '已有同名请求或并发请求过多，请等待或取消后重试。', true);
    }
    const controller = new AbortController();
    pending.set(key, { owner, controller });
    const requestRevision = revision;
    const attempt = ++latestAttempt;
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, config.timeoutMs);
    const remember = (result: AiResult<AiCompletion>) => {
      // 旧配置或较早发起的请求不覆盖新测试状态，取消也不代表服务商故障。
      if (requestRevision === revision && attempt === latestAttempt && (result.ok === true || result.error.code !== 'CANCELLED')) {
        checkedAt = new Date().toISOString();
        connection = result.ok === true ? 'ok' : 'error';
        lastError = result.ok === true ? undefined : result.error;
        publish();
      }
      return result;
    };
    try {
      const response = await dependencies.fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST', redirect: 'error', signal: controller.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
        body: JSON.stringify(body),
      });
      if (!response.ok) { await response.body?.cancel(); return remember(httpError(response.status)); }
      // 设置响应体上限，防止错误端点无限返回内容占满主进程内存。
      const reader = response.body?.getReader();
      if (!reader) return remember(aiFailure('INVALID_RESPONSE', 'AI 服务返回了空响应。'));
      const decoder = new TextDecoder();
      let raw = '';
      let bytes = 0;
      while (!controller.signal.aborted) {
        const chunk = await reader.read();
        if (chunk.done) break;
        bytes += chunk.value.byteLength;
        if (bytes > 4 * 1024 * 1024) { await reader.cancel(); return remember(aiFailure('INVALID_RESPONSE', 'AI 响应超过 4 MB，请缩短输出。')); }
        raw += decoder.decode(chunk.value, { stream: true });
      }
      raw += decoder.decode();
      if (controller.signal.aborted) return remember(aiFailure(timedOut ? 'TIMEOUT' : 'CANCELLED', timedOut ? 'AI 请求超时，请稍后重试。' : '请求已停止。', timedOut));
      let data: unknown;
      try { data = JSON.parse(raw); } catch { return remember(aiFailure('INVALID_RESPONSE', '服务响应不是有效 JSON，请检查接口地址。')); }
      const choice = isRecord(data) && Array.isArray(data.choices) ? data.choices[0] : undefined;
      if (!isRecord(choice) || !isRecord(choice.message) || typeof choice.message.content !== 'string' || !choice.message.content.trim()) {
        return remember(aiFailure('INVALID_RESPONSE', '服务未返回有效文本，请检查模型或增加输出上限。'));
      }
      const usage = isRecord(data) && isRecord(data.usage) ? data.usage : undefined;
      const validUsage = usage && ['prompt_tokens', 'completion_tokens', 'total_tokens'].every((field) => typeof usage[field] === 'number' && Number.isFinite(usage[field]) && (usage[field] as number) >= 0);
      return remember({ ok: true, value: {
        requestId: id, content: choice.message.content, model: isRecord(data) && typeof data.model === 'string' ? data.model : String(body.model),
        finishReason: typeof choice.finish_reason === 'string' ? choice.finish_reason : 'unknown',
        ...(validUsage ? { usage: { promptTokens: usage.prompt_tokens as number, completionTokens: usage.completion_tokens as number, totalTokens: usage.total_tokens as number } } : {}),
      } });
    } catch {
      // 不传播底层异常文本：URL、服务响应或第三方库异常可能包含密钥和请求正文。
      return remember(controller.signal.aborted
        ? aiFailure(timedOut ? 'TIMEOUT' : 'CANCELLED', timedOut ? 'AI 请求超时，请稍后重试。' : '请求已停止。', timedOut)
        : aiFailure('NETWORK', '无法连接 AI 服务，请检查网络和服务地址。', true));
    } finally {
      clearTimeout(timer);
      pending.delete(key);
    }
  };

  return {
    getStatus, configure, chat,
    test: (owner: string, requestId?: string) => chat(owner, {
      requestId, messages: [{ role: 'user', content: 'Reply with OK.' }], maxTokens: 32, thinking: false,
    }),
    cancel(owner: string, id: string) {
      const request = pending.get(requestKey(owner, id));
      if (!request) return false;
      request.controller.abort();
      return true;
    },
    cancelWindow(prefix: string) {
      for (const request of pending.values()) if (request.owner.startsWith(prefix)) request.controller.abort();
    },
  };
};
