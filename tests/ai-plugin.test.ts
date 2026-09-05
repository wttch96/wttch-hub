/**
 * 文件说明：验证插件 AI API 的能力限制、默认参数、请求跟踪与生命周期清理。
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { AiBridge } from '../src/ai/contracts';
import type { AiChatRequest, Disposable, ToolPlugin } from '../src/types/plugin';
import { createPluginAiApi } from '../src/ai/pluginApi';
import { DEFAULT_AI_STATUS } from '../src/ai/shared';

const definition = { id: 'example', capabilities: { ai: true }, ai: { systemPrompt: '默认提示词', temperature: .3 } } as ToolPlugin;
test('插件能力与启用状态每次校验，单次参数优先且 owner 固定', async () => {
  let calls = 0;
  let enabled = true;
  let captured!: AiChatRequest;
  const bridge = {
    getStatus: async () => ({ ok: true, value: DEFAULT_AI_STATUS }),
    chat: async (owner: string, request: AiChatRequest) => {
      assert.equal(owner, 'plugin:example'); captured = request; calls += 1;
      return { ok: true, value: { requestId: request.requestId!, content: 'ok', model: 'test', finishReason: 'stop' } };
    },
  } as AiBridge;
  const api = createPluginAiApi(definition, () => enabled, () => bridge);
  const request: AiChatRequest = { requestId: 'request', messages: [{ role: 'user', content: 'hello' }], temperature: .8 };
  assert.equal((await api.chat(request)).ok, true);
  assert.equal(captured.systemPrompt, '默认提示词');
  assert.equal(captured.temperature, .8);
  enabled = false;
  assert.equal((await api.chat(request)).ok, false);
  assert.equal(calls, 1);
  const denied = createPluginAiApi({ ...definition, capabilities: {} }, () => true, () => bridge);
  assert.equal((await denied.getStatus()).ok, false);
});

test('插件订阅与未完成请求可由生命周期统一清理', async () => {
  const subscriptions: Disposable[] = [];
  let disposed = false;
  let cancelled = false;
  let complete!: () => void;
  const bridge = {
    onDidChange: () => ({ dispose() { disposed = true; } }),
    cancel: async () => { cancelled = true; return true; },
    chat: async () => {
      await new Promise<void>((resolve) => { complete = resolve; });
      return { ok: true, value: { requestId: 'pending', content: 'ok', model: 'test', finishReason: 'stop' } };
    },
  } as unknown as AiBridge;
  const api = createPluginAiApi(definition, () => true, () => bridge, subscriptions);
  api.onDidChange(() => undefined);
  const pending = api.chat({ requestId: 'pending', messages: [{ role: 'user', content: 'hello' }] });
  for (const resource of [...subscriptions]) resource.dispose();
  assert.equal(disposed, true);
  assert.equal(cancelled, true);
  complete(); await pending;
  assert.equal(subscriptions.length, 0);
});
