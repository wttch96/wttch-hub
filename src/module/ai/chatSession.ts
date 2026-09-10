/**
 * 文件说明：管理内置 AI 聊天的多轮会话状态、上下文构造、流式步骤记录、取消和失败重试，
 * 避免错误内容进入后续对话，并让界面按执行顺序还原「文本 → 工具调用 → 后续文本」的过程。
 */

import { reactive, readonly } from 'vue';
import type {
  AiChatRequest,
  AiCompletion,
  AiError,
  AiMessage,
  AiResult,
} from '@wttch-hub/plugin-api';
import type { AgentEvent } from './contracts';
import { aiFailure } from './shared';

/** 一次回复中的一个步骤：一段可见文本，或一次工具调用。 */
export type ChatStep = {
  id: string;
  kind: 'text' | 'tool';
  /** 文本步骤的正文；工具步骤始终为空。 */
  content: string;
  /** 工具步骤：工具名与调用参数。 */
  name?: string;
  args?: Record<string, unknown>;
  /** 工具步骤：执行结果或失败原因。 */
  result?: string;
  status: 'running' | 'done' | 'error';
};

export type ChatExchange = {
  id: string;
  prompt: string;
  response?: AiCompletion;
  error?: AiError;
  /** 按到达顺序记录本次生成的文本与工具调用，仅用于展示，不进入后续上下文。 */
  steps: ChatStep[];
  status: 'pending' | 'done' | 'error' | 'cancelled';
};

/** 收尾时把仍在执行的步骤落定，避免界面一直停在「进行中」。 */
const settleSteps = (exchange: ChatExchange) => {
  for (const step of exchange.steps) {
    if (step.status !== 'running') continue;
    step.status = step.kind === 'text' ? 'done' : 'error';
  }
};

/** 单轮失败独立保存，不将错误提示或失败请求作为 assistant 消息传给模型。 */
export const createChatSession = (client: {
  chat(request: AiChatRequest, onEvent: (event: AgentEvent) => void): Promise<AiResult<AiCompletion>>;
  cancel(requestId: string): Promise<boolean>;
}) => {
  const state = reactive({
    exchanges: [] as ChatExchange[],
    busy: false,
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
    exchange.response = { requestId, content: '', model: '', finishReason: 'unknown' };
    exchange.steps = [];
    // 当前正在追加的文本步骤；进入新一轮或开始工具调用后置空，后续文本另起一段。
    let textStep: ChatStep | undefined;
    const applyEvent = (event: AgentEvent) => {
      if (current !== generation) return;
      switch (event.type) {
        case 'step':
          textStep = undefined;
          break;
        case 'text':
          if (!textStep) {
            exchange.steps.push({ id: crypto.randomUUID(), kind: 'text', content: '', status: 'running' });
            // 取响应式代理而非 push 前的普通对象，使后续追加能触发 Vue 渲染。
            textStep = exchange.steps[exchange.steps.length - 1];
          }
          textStep.content += event.delta;
          break;
        case 'tool-start':
          textStep = undefined;
          exchange.steps.push({
            id: event.id,
            kind: 'tool',
            content: '',
            name: event.name,
            args: event.args,
            status: 'running',
          });
          break;
        case 'tool-end': {
          const step = exchange.steps.find(item => item.id === event.id);
          if (!step) break;
          step.result = event.result;
          step.status = event.failed ? 'error' : 'done';
          break;
        }
      }
    };
    // 最多携带最近 20 轮成功对话，避免长会话无限增长；界面明确提示这个上下文边界。
    const history: AiMessage[] = state.exchanges
      .filter(item => item.status === 'done')
      .slice(-20)
      .flatMap(item => [
        { role: 'user', content: item.prompt },
        { role: 'assistant', content: item.response!.content },
      ]);
    let result: AiResult<AiCompletion>;
    try {
      result = await client.chat(
        {
          requestId,
          messages: [...history, { role: 'user', content: exchange.prompt }],
          systemPrompt: state.systemPrompt,
          maxTokens: 4096,
        },
        applyEvent,
      );
    } catch {
      result = aiFailure('UNAVAILABLE', 'AI 服务暂时不可用，请重试。', true);
    }
    if (current !== generation) return;
    activeId = undefined;
    state.busy = false;
    settleSteps(exchange);
    if (result.ok === true) {
      exchange.response = result.value;
      exchange.status = 'done';
    } else {
      exchange.error = result.error;
      exchange.status = result.error.code === 'CANCELLED' ? 'cancelled' : 'error';
    }
  };
  const stop = () => {
    const id = activeId;
    if (!id) return;
    generation += 1;
    activeId = undefined;
    state.busy = false;
    const pending = state.exchanges.find(entry => entry.status === 'pending');
    if (pending) {
      settleSteps(pending);
      pending.status = 'cancelled';
    }
    void client.cancel(id).catch((): undefined => undefined);
  };
  return {
    state: readonly(state),
    setSystemPrompt: (prompt: string) => {
      state.systemPrompt = prompt;
    },
    async send(text: string) {
      const prompt = text.trim();
      if (!prompt || state.busy) return;
      state.exchanges.push({ id: crypto.randomUUID(), prompt, steps: [], status: 'pending' });
      // 传入响应式代理而非 push 前的普通对象，使异步结果更新能触发 Vue 渲染。
      await run(state.exchanges[state.exchanges.length - 1]);
    },
    async retry() {
      const exchange = state.exchanges.at(-1);
      if (state.busy || !exchange || !['error', 'cancelled'].includes(exchange.status)) return;
      await run(exchange);
    },
    stop,
    clear() {
      stop();
      state.exchanges = [];
    },
  };
};
