/**
 * 文件说明：验证统一 AI 服务的配置校验、请求处理、取消与错误转换等行为。
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createAiService, buildChatBody, type AiServiceDependencies } from '../src/module/ai/service';
import { defaultConfiguration, normalizeBaseUrl, parseStoredConfiguration } from '../src/module/ai/config';
import type { AiStatus, AiResult } from '../src/types/plugin';

const completion = () => new Response(JSON.stringify({ model: 'test-model', choices: [{ message: { content: '测试回答' }, finish_reason: 'stop' }], usage: { prompt_tokens: 3, completion_tokens: 4, total_tokens: 7 } }));
const createHarness = (fetch: typeof globalThis.fetch = async () => completion(), overrides: Partial<AiServiceDependencies> = {}) => {
  let saved = defaultConfiguration();
  const statuses: AiStatus[] = [];
  const service = createAiService({
    read: () => saved,
    write: (value) => { saved = value; },
    encrypt: (value) => Buffer.from(value).toString('base64'),
    decrypt: (value) => Buffer.from(value, 'base64').toString(),
    fetch,
    onStatus: (status) => statuses.push(status),
    ...overrides,
  });
  const configure = () => service.configure({ ...defaultConfiguration(), apiKey: 'test-secret-never-expose' });
  return { service, configure, statuses, saved: () => saved };
};
const request = { requestId: 'test', messages: [{ role: 'user', content: 'hello' }] };
const assertError = <T>(result: AiResult<T>, code: string) => {
  assert.equal(result.ok, false);
  if (result.ok === false) assert.equal(result.error.code, code);
};

test('未配置与关闭状态不会发送网络请求', async () => {
  let calls = 0;
  const h = createHarness(async () => { calls += 1; return completion(); });
  assert.equal(h.service.getStatus().configured, false);
  assertError(await h.service.chat('owner', request), 'NOT_CONFIGURED');
  h.configure();
  h.service.configure({ ...defaultConfiguration(), enabled: false });
  assertError(await h.service.chat('owner', request), 'DISABLED');
  assert.equal(calls, 0);
});

test('系统提示词与参数正确转发，公开结果和磁盘配置不含明文密钥', async () => {
  let init: RequestInit | undefined;
  let endpoint: unknown;
  const h = createHarness(async (url, options) => { endpoint = url; init = options; return completion(); });
  assert.equal(h.configure().ok, true);
  assert.equal(h.service.getStatus().connection, 'untested');
  const result = await h.service.chat('owner', { ...request, systemPrompt: '请用中文', temperature: .4, maxTokens: 100, responseFormat: 'json_object' });
  assert.equal(endpoint, 'https://api.deepseek.com/chat/completions');
  assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer test-secret-never-expose');
  assert.equal(init?.redirect, 'error');
  const body = JSON.parse(String(init?.body));
  assert.deepEqual(body.messages[0], { role: 'system', content: '请用中文' });
  assert.equal(body.max_tokens, 100);
  assert.equal(body.thinking.type, 'disabled');
  assert.equal(body.response_format.type, 'json_object');
  assert.equal(result.ok, true);
  assert.equal(h.service.getStatus().connection, 'ok');
  assert.ok(!JSON.stringify([h.saved(), result, h.statuses]).includes('test-secret-never-expose'));
});

test('服务切换不复用旧密钥；保留、清除和存储失败语义明确', () => {
  const h = createHarness();
  h.configure();
  h.service.configure({ ...defaultConfiguration(), model: 'other-model' });
  assert.equal(h.service.getStatus().configured, true);
  h.service.configure({ ...defaultConfiguration(), provider: 'compatible', baseUrl: 'https://other.example/v1' });
  assert.equal(h.service.getStatus().hasApiKey, false);
  h.configure();
  h.service.configure({ ...defaultConfiguration(), apiKey: '' });
  assert.equal(h.service.getStatus().configured, false);
  const failed = createHarness(undefined, { write: () => { throw new Error('private path'); } });
  assertError(failed.configure(), 'STORAGE');
  assert.equal(failed.service.getStatus().hasApiKey, false);
});

test('坏地址、坏消息和越界参数被拒绝；兼容服务不发送 DeepSeek 扩展', () => {
  for (const url of ['http://remote.example', 'https://user:secret@example.com', 'https://example.com?key=abc', 'file:///tmp/test']) assert.throws(() => normalizeBaseUrl(url));
  assert.equal(normalizeBaseUrl('http://127.0.0.1:9000/v1/chat/completions/'), 'http://127.0.0.1:9000/v1');
  for (const extra of [{ temperature: NaN }, { maxTokens: 0 }, { messages: [] }, { messages: [{ role: ['user'], content: 'hello' }] }, { systemPrompt: 2 }]) {
    assert.throws(() => buildChatBody({ ...request, ...extra }, defaultConfiguration()));
  }
  const body = buildChatBody({ ...request, thinking: true }, { ...defaultConfiguration(), provider: 'compatible' });
  assert.equal(body.thinking, undefined);
  assert.equal(parseStoredConfiguration(JSON.stringify({ ...defaultConfiguration(), apiKey: 'plaintext' })).encryptedKey, undefined);
});

test('鉴权、限流、服务和畸形响应返回可判断错误，原始错误正文不泄漏', async () => {
  for (const [status, code] of [[401, 'AUTH'], [403, 'AUTH'], [429, 'RATE_LIMIT'], [500, 'PROVIDER'], [404, 'PROVIDER']] as const) {
    const h = createHarness(async () => new Response('secret from provider', { status }));
    h.configure();
    const result = await h.service.chat('owner', request);
    assertError(result, code);
    assert.ok(!JSON.stringify(result).includes('secret from provider'));
    assert.equal(h.service.getStatus().connection, 'error');
  }
  for (const body of ['not json', '{}', '{"choices":[{"message":{"content":""}}]}']) {
    const h = createHarness(async () => new Response(body)); h.configure();
    assertError(await h.service.chat('owner', request), 'INVALID_RESPONSE');
  }
});

test('取消按调用方隔离，重复请求 ID 拒绝，配置变化取消旧请求', async () => {
  const h = createHarness((_url, init) => new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
  }));
  h.configure();
  const pending = h.service.chat('owner', request);
  assert.equal(h.service.cancel('other', 'test'), false);
  assertError(await h.service.chat('owner', request), 'BUSY');
  assert.equal(h.service.cancel('owner', 'test'), true);
  assertError(await pending, 'CANCELLED');
  assert.equal(h.service.getStatus().connection, 'untested');
  const old = h.service.chat('owner', request);
  h.service.configure({ ...defaultConfiguration(), model: 'new-model' });
  assertError(await old, 'CANCELLED');
  assert.equal(h.service.getStatus().model, 'new-model');
  assert.equal(h.service.getStatus().connection, 'untested');
});

test('超时与网络失败区别返回，超时包含响应体读取阶段', async () => {
  const network = createHarness(async () => { throw new Error('network details with secret'); });
  network.configure();
  assertError(await network.service.chat('owner', request), 'NETWORK');
  // 注入已读取的短超时配置，避免真实等待 5 秒；生产配置校验仍要求至少 5 秒。
  const h = createHarness((_url, init) => new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(new Error('timeout')), { once: true });
  }), { read: () => ({ ...defaultConfiguration(), timeoutMs: 5, encryptedKey: Buffer.from('test').toString('base64') }) });
  assertError(await h.service.chat('owner', request), 'TIMEOUT');
});

test('测试连接执行真实补全请求，较早请求不能覆盖较新的验证结果', async () => {
  let resolveFirst!: (response: Response) => void;
  let calls = 0;
  const h = createHarness(async () => {
    calls += 1;
    if (calls === 1) return new Promise((resolve) => { resolveFirst = resolve; });
    return new Response('', { status: 401 });
  });
  h.configure();
  const older = h.service.chat('owner', request);
  assertError(await h.service.test('owner', 'test-new'), 'AUTH');
  resolveFirst(completion());
  assert.equal((await older).ok, true);
  assert.equal(h.service.getStatus().connection, 'error');
});
