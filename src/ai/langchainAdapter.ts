/**
 * LangChain adapter for the renderer-side plugin tool registry.
 *
 * API keys and provider I/O remain in the main process. This adapter only
 * implements LangChain's model/tool contracts so the agent can execute plugin
 * tools in the renderer, where their state and permissions are available.
 */

import { AIMessage, HumanMessage, SystemMessage, ToolMessage, type BaseMessage } from '@langchain/core/messages';
import { tool } from '@langchain/core/tools';
import { createAgent, ToolCallLimitExceededError, toolCallLimitMiddleware } from 'langchain';
import type { AiChatRequest, AiCompletion, AiError, AiMessage, AiResult, AiToolDefinition } from '@wttch-hub/plugin-api';
import { registry } from './callTools';
import { aiFailure } from './shared';

type MessageLike = BaseMessage & {
  tool_calls?: Array<{ id?: string; name: string; args: Record<string, unknown> }>;
  tool_call_id?: string;
};

const contentToString = (content: unknown) => typeof content === 'string' ? content : JSON.stringify(content ?? '');

class AiHostError extends Error {
  constructor(readonly aiError: AiError) { super(aiError.message); }
}

const toLangChainMessage = (message: AiMessage): BaseMessage => {
  if (message.role === 'user') return new HumanMessage(message.content);
  if (message.role === 'system') return new SystemMessage(message.content);
  if (message.role === 'tool') return new ToolMessage({ content: message.content, tool_call_id: message.toolCallId ?? '' });
  return new AIMessage({
    content: message.content,
    tool_calls: message.toolCalls?.map(call => ({ id: call.id, name: call.name, args: call.args })),
  });
};

const toHostMessage = (message: MessageLike): AiMessage => {
  switch (message.getType()) {
    case 'human': return { role: 'user', content: contentToString(message.content) };
    case 'system': return { role: 'system', content: contentToString(message.content) };
    case 'tool': return { role: 'tool', content: contentToString(message.content), toolCallId: message.tool_call_id };
    default: return {
      role: 'assistant', content: contentToString(message.content),
      ...(message.tool_calls?.length ? { toolCalls: message.tool_calls.map(call => ({
        id: call.id ?? crypto.randomUUID(), name: call.name, args: call.args,
      })) } : {}),
    };
  }
};

/** A chat-model proxy that keeps provider access and API keys in the main process. */
class IpcChatModel {
  // createAgent uses this marker to identify a chat model with bindTools.
  readonly _streamResponseChunks: undefined = undefined;
  private lastCompletion: AiCompletion | undefined;

  constructor(
    private readonly request: Omit<AiChatRequest, 'messages' | 'tools'>,
    private readonly definitions: AiToolDefinition[],
  ) {}

  bindTools(): IpcChatModel { return this; }

  async invoke(messages: BaseMessage[]): Promise<AIMessage> {
    const result = await window.aiHost!.chat('builtin-chat', {
      ...this.request,
      messages: messages.map(message => toHostMessage(message as MessageLike)),
      ...(this.definitions.length ? { tools: this.definitions } : {}),
    });
    if (result.ok === false) throw new AiHostError(result.error);
    this.lastCompletion = result.value;
    return new AIMessage({
      content: result.value.content,
      tool_calls: result.value.toolCalls?.map(call => ({ id: call.id, name: call.name, args: call.args })),
      usage_metadata: result.value.usage ? {
        input_tokens: result.value.usage.promptTokens,
        output_tokens: result.value.usage.completionTokens,
        total_tokens: result.value.usage.totalTokens,
      } : undefined,
    });
  }

  completion(content: string): AiCompletion {
    const last = this.lastCompletion;
    return {
      requestId: last?.requestId ?? this.request.requestId ?? crypto.randomUUID(),
      content,
      model: last?.model ?? 'unknown',
      finishReason: last?.finishReason ?? 'unknown',
      ...(last?.usage ? { usage: last.usage } : {}),
    };
  }
}

const createTools = (definitions: AiToolDefinition[]) => definitions.map(definition => tool(
  async (args: Record<string, unknown>) => JSON.stringify(await registry.invoke({
    id: crypto.randomUUID(), name: definition.name, args,
  })),
  {
    name: definition.name,
    description: definition.description,
    // Plugin tools already declare OpenAI-compatible JSON Schema. LangChain
    // accepts that schema directly, avoiding a lossy JSON-Schema-to-Zod conversion.
    schema: definition.parameters as never,
  },
));

/** Executes an AI request through LangChain's agent and registered plugin tools. */
export const runLangChainAgent = async (request: AiChatRequest): Promise<AiResult<AiCompletion>> => {
  if (!window.aiHost) return aiFailure('UNAVAILABLE', '请在桌面应用中配置和使用 AI。');
  const definitions = request.tools ?? registry.definitions();
  const model = new IpcChatModel({
    requestId: request.requestId,
    model: request.model,
    temperature: request.temperature,
    maxTokens: request.maxTokens,
    responseFormat: request.responseFormat,
    thinking: request.thinking,
  }, definitions);
  try {
    const agent = createAgent({
      model: model as never,
      tools: createTools(definitions) as never,
      systemPrompt: request.systemPrompt,
      middleware: [toolCallLimitMiddleware({ runLimit: 8, exitBehavior: 'error' })],
    });
    const result = await agent.invoke({ messages: request.messages.map(toLangChainMessage) });
    const finalMessage = [...result.messages].reverse().find(message => AIMessage.isInstance(message));
    if (!finalMessage) return aiFailure('INVALID_RESPONSE', '服务未返回有效文本。');
    return { ok: true, value: model.completion(contentToString(finalMessage.content)) };
  } catch (error) {
    if (error instanceof AiHostError) return { ok: false, error: error.aiError };
    if (error instanceof ToolCallLimitExceededError) return aiFailure('BUSY', 'AI 工具调用轮次过多，已停止执行。', true);
    const message = error instanceof Error ? error.message : 'AI 工具调用失败。';
    return aiFailure('NETWORK', message, true);
  }
};
