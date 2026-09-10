/**
 * 文件说明：验证多轮聊天上下文、生成步骤记录、失败重试和取消逻辑，
 * 确保错误轮次不会污染后续会话，且界面能看到「文本 → 工具调用 → 后续文本」的完整过程。
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createChatSession } from '../src/module/ai/chatSession';
import type { AgentEvent } from '../src/module/ai/contracts';
import type { AiChatRequest, AiResult, AiCompletion } from '../src/types/plugin';
import { aiFailure } from '../src/module/ai/shared';

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

test('流式片段会立即写入当前回复，完成后保留服务端元数据', async () => {
  const session = createChatSession({
    chat: async (_input, onEvent) => {
      onEvent({ type: 'step' });
      onEvent({ type: 'text', delta: '正在' });
      onEvent({ type: 'text', delta: '输出' });
      return answer('正在输出');
    },
    cancel: async () => true,
  });
  await session.send('流式回答');
  const [text] = session.state.exchanges[0].steps;
  assert.equal(text.kind, 'text');
  assert.equal(text.content, '正在输出');
  assert.equal(text.status, 'done');
  assert.equal(session.state.exchanges[0].response?.content, '正在输出');
  assert.equal(session.state.exchanges[0].status, 'done');
});

test('文本与工具调用按到达顺序记录为步骤，工具参数和结果留在对应卡片上', async () => {
  const session = createChatSession({
    chat: async (_input, onEvent) => {
      onEvent({ type: 'step' });
      onEvent({ type: 'text', delta: '我来查一下。' });
      onEvent({ type: 'tool-start', id: 't1', name: 'search', args: { q: '天气' } });
      onEvent({ type: 'tool-end', id: 't1', name: 'search', result: '{"temp":20}', failed: false });
      onEvent({ type: 'step' });
      onEvent({ type: 'text', delta: '今天 20 度。' });
      return answer('今天 20 度。');
    },
    cancel: async () => true,
  });
  await session.send('今天天气如何');
  const steps = session.state.exchanges[0].steps;
  assert.deepEqual(steps.map((step) => [step.kind, step.status]), [['text', 'done'], ['tool', 'done'], ['text', 'done']]);
  // 新一轮的文本必须另起一段，不能接到工具调用前的文本后面。
  assert.equal(steps[0].content, '我来查一下。');
  assert.equal(steps[1].name, 'search');
  assert.equal(steps[1].args?.q, '天气');
  assert.equal(steps[1].result, '{"temp":20}');
  assert.equal(steps[2].content, '今天 20 度。');
});

test('工具执行失败时该步骤标记为错误并保留失败原因，不影响本轮最终文本', async () => {
  const session = createChatSession({
    chat: async (_input, onEvent) => {
      onEvent({ type: 'tool-start', id: 't1', name: 'broken', args: {} });
      onEvent({ type: 'tool-end', id: 't1', name: 'broken', result: '读取文件失败', failed: true });
      onEvent({ type: 'step' });
      onEvent({ type: 'text', delta: '工具暂时不可用。' });
      return answer('工具暂时不可用。');
    },
    cancel: async () => true,
  });
  await session.send('试试工具');
  const [tool, text] = session.state.exchanges[0].steps;
  assert.equal(tool.status, 'error');
  assert.equal(tool.result, '读取文件失败');
  assert.equal(tool.content, '');
  assert.equal(text.kind, 'text');
  assert.equal(session.state.exchanges[0].status, 'done');
});

test('停止生成时正在执行的步骤落定为终态，不再停在运行中', async () => {
  let emit!: (event: AgentEvent) => void;
  const session = createChatSession({
    chat: (_input, onEvent) => { emit = onEvent; return new Promise(() => {}); },
    cancel: async () => true,
  });
  void session.send('长任务');
  emit({ type: 'text', delta: '开始' });
  emit({ type: 'tool-start', id: 't1', name: 'slow', args: {} });
  session.stop();
  const exchange = session.state.exchanges[0];
  assert.equal(exchange.status, 'cancelled');
  // 文本已生成的部分保留为完成，没有结果的工具调用只能算失败。
  assert.deepEqual(exchange.steps.map((step) => step.status), ['done', 'error']);
});

test('重试会清空上一次的步骤，避免新旧过程混在同一轮里', async () => {
  let attempt = 0;
  const session = createChatSession({
    chat: async (_input, onEvent) => {
      attempt += 1;
      onEvent({ type: 'text', delta: attempt === 1 ? '第一次' : '第二次' });
      return attempt === 1 ? aiFailure('NETWORK', '失败', true) : answer('第二次');
    },
    cancel: async () => true,
  });
  await session.send('重试一次');
  assert.equal(session.state.exchanges[0].steps.length, 1);
  await session.retry();
  const steps = session.state.exchanges[0].steps;
  assert.equal(steps.length, 1);
  assert.equal(steps[0].content, '第二次');
  assert.equal(steps[0].status, 'done');
});

test('长对话只携带最近20轮成功内容，失败轮次不进入模型上下文', async () => {
  let last!: AiChatRequest;
  const session = createChatSession({ chat: async (input) => { last = input; return answer(); }, cancel: async () => true });
  for (let index = 0; index < 22; index += 1) await session.send(`问题${index}`);
  assert.equal(last.messages.length, 41);
  assert.equal(last.messages[0].content, '问题1');
});
