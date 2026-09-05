/**
 * 文件说明：验证多轮聊天上下文、失败重试和取消逻辑，确保错误轮次不会污染后续会话。
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createChatSession } from '../src/ai/chatSession';
import type { AiChatRequest, AiResult, AiCompletion } from '../src/types/plugin';
import { aiFailure } from '../src/ai/shared';

const answer = (content = '回答'): AiResult<AiCompletion> => ({ ok: true, value: { requestId: 'id', content, model: 'test', finishReason: 'stop' } });
test('多轮上下文与系统提示词传递正确，失败重试不重复追加用户消息', async () => {
  const calls: AiChatRequest[] = [];
  const session = createChatSession({
    chat: async (input) => { calls.push(input); return calls.length === 2 ? aiFailure('NETWORK', '失败', true) : answer(); },
    cancel: async () => true,
  });
  session.setSystemPrompt('只用中文');
  await session.send('第一条');
  await session.send('第二条');
  assert.equal(session.state.exchanges[1].status, 'error');
  await session.retry();
  assert.equal(session.state.exchanges.length, 2);
  assert.deepEqual(calls[2].messages.map((item) => item.content), ['第一条', '回答', '第二条']);
  assert.equal(calls[2].systemPrompt, '只用中文');
  assert.equal(session.state.exchanges[1].status, 'done');
});

test('停止或新建对话后，延迟返回的旧结果不能写入新会话', async () => {
  let resolve!: (value: AiResult<AiCompletion>) => void;
  let cancelled = false;
  const session = createChatSession({
    chat: () => new Promise((done) => { resolve = done; }),
    cancel: async () => { cancelled = true; return true; },
  });
  const pending = session.send('等待');
  session.clear();
  resolve(answer());
  await pending;
  assert.equal(cancelled, true);
  assert.equal(session.state.busy, false);
  assert.equal(session.state.exchanges.length, 0);
});

test('长对话只携带最近20轮成功内容，失败轮次不进入模型上下文', async () => {
  let last!: AiChatRequest;
  const session = createChatSession({ chat: async (input) => { last = input; return answer(); }, cancel: async () => true });
  for (let index = 0; index < 22; index += 1) await session.send(`问题${index}`);
  assert.equal(last.messages.length, 41);
  assert.equal(last.messages[0].content, '问题1');
});
