/**
 * 文件说明：管理内置 AI 聊天的多轮会话状态、上下文构造、取消和失败重试，避免错误内容进入后续对话。
 */

import { reactive, readonly } from 'vue';
import type { AiChatRequest, AiCompletion, AiError, AiMessage, AiResult } from '@wttch-hub/plugin-api';
import { aiFailure } from './shared';

export type ChatExchange = {
  id: string; prompt: string; response?: AiCompletion; error?: AiError;
  status: 'pending' | 'done' | 'error' | 'cancelled';
};
/** 单轮失败独立保存，不将错误提示或失败请求作为 assistant 消息传给模型。 */
export const createChatSession = (client: {
  chat(request: AiChatRequest): Promise<AiResult<AiCompletion>>;
  cancel(requestId: string): Promise<boolean>;
}) => {
  const state = reactive({
    exchanges: [] as ChatExchange[], busy: false,
    systemPrompt: '你是一个耐心、准确的中文助手。请清晰回答用户的问题。',
  });
  let generation = 0;
  let activeId: string | undefined;
  const run = async (exchange: ChatExchange) => {
    const current = ++generation;
    const requestId = crypto.randomUUID();
    activeId = requestId;
    state.busy = true;
    exchange.status = 'pending';
    exchange.error = undefined;
    // 最多携带最近 20 轮成功对话，避免长会话无限增长；界面明确提示这个上下文边界。
    const history: AiMessage[] = state.exchanges.filter((item) => item.status === 'done').slice(-20).flatMap((item) => [
      { role: 'user', content: item.prompt }, { role: 'assistant', content: item.response!.content },
    ]);
    let result: AiResult<AiCompletion>;
    try {
      result = await client.chat({ requestId, messages: [...history, { role: 'user', content: exchange.prompt }], systemPrompt: state.systemPrompt, maxTokens: 4096 });
    } catch { result = aiFailure('UNAVAILABLE', 'AI 服务暂时不可用，请重试。', true); }
    if (current !== generation) return;
    activeId = undefined;
    state.busy = false;
    if (result.ok === true) { exchange.response = result.value; exchange.status = 'done'; }
    else { exchange.error = result.error; exchange.status = result.error.code === 'CANCELLED' ? 'cancelled' : 'error'; }
  };
  const stop = () => {
    const id = activeId;
    if (!id) return;
    generation += 1;
    activeId = undefined;
    state.busy = false;
    const current = state.exchanges.find((entry) => entry.status === 'pending');
    if (current) current.status = 'cancelled';
    void client.cancel(id).catch(() => undefined);
  };
  return {
    state: readonly(state),
    setSystemPrompt: (prompt: string) => { state.systemPrompt = prompt; },
    async send(text: string) {
      const prompt = text.trim();
      if (!prompt || state.busy) return;
      state.exchanges.push({ id: crypto.randomUUID(), prompt, status: 'pending' });
      // 传入响应式代理而非 push 前的普通对象，使异步结果更新能触发 Vue 渲染。
      await run(state.exchanges[state.exchanges.length - 1]);
    },
    async retry() {
      const exchange = state.exchanges.at(-1);
      if (state.busy || !exchange || !['error', 'cancelled'].includes(exchange.status)) return;
      await run(exchange);
    },
    stop,
    clear() { stop(); state.exchanges = []; },
  };
};
