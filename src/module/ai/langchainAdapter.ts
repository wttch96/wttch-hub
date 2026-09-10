/**
 * LangChain adapter for the renderer-side plugin tool registry.
 *
 * API keys and provider I/O remain in the main process. This adapter only
 * implements LangChain's model/tool contracts so the agent can execute plugin
 * tools in the renderer, where their state and permissions are available.
 */

import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
  type BaseMessage,
} from '@langchain/core/messages';
import { tool } from '@langchain/core/tools';
import { createAgent, ToolCallLimitExceededError, toolCallLimitMiddleware } from 'langchain';
import { z } from 'zod';
import type {
  AiChatRequest,
  AiCompletion,
  AiError,
  AiMessage,
  AiResult,
  AiToolDefinition,
} from '@wttch-hub/plugin-api';
import { registry } from './callTools';
import type { AgentEvent } from './contracts';
import { aiFailure } from './shared';

type MessageLike = BaseMessage & {
  tool_calls?: Array<{ id?: string; name: string; args: Record<string, unknown> }>;
  tool_call_id?: string;
};

/** 模型调用参数；requestId 必填，流式片段要靠它路由回发起页面。 */
type ModelRequest = Omit<AiChatRequest, 'messages' | 'tools' | 'requestId'> & { requestId: string };

const contentToString = (content: unknown) =>
  typeof content === 'string' ? content : JSON.stringify(content ?? '');

class AiHostError extends Error {
  constructor(readonly aiError: AiError) {
    super(aiError.message);
  }
}

const toLangChainMessage = (message: AiMessage): BaseMessage => {
  if (message.role === 'user') return new HumanMessage(message.content);
  if (message.role === 'system') return new SystemMessage(message.content);
  if (message.role === 'tool')
    return new ToolMessage({ content: message.content, tool_call_id: message.toolCallId ?? '' });
  return new AIMessage({
    content: message.content,
    tool_calls: message.toolCalls?.map(call => ({ id: call.id, name: call.name, args: call.args })),
  });
};

const toHostMessage = (message: MessageLike): AiMessage => {
  switch (message.getType()) {
    case 'human':
      return { role: 'user', content: contentToString(message.content) };
    case 'system':
      return { role: 'system', content: contentToString(message.content) };
    case 'tool':
      return {
        role: 'tool',
        content: contentToString(message.content),
        toolCallId: message.tool_call_id,
      };
    default:
      return {
        role: 'assistant',
        content: contentToString(message.content),
        ...(message.tool_calls?.length
          ? {
              toolCalls: message.tool_calls.map(call => ({
                id: call.id ?? crypto.randomUUID(),
                name: call.name,
                args: call.args,
              })),
            }
          : {}),
      };
  }
};

/** A chat-model proxy that keeps provider access and API keys in the main process. */
class IpcChatModel {
  // createAgent uses this marker to identify a chat model with bindTools.
  readonly _streamResponseChunks: undefined = undefined;
  private lastCompletion: AiCompletion | undefined;

  constructor(
    private readonly request: ModelRequest,
    private readonly definitions: AiToolDefinition[],
    private readonly onEvent?: (event: AgentEvent) => void,
  ) {}

  bindTools(): IpcChatModel {
    return this;
  }

  async invoke(messages: BaseMessage[]): Promise<AIMessage> {
    const host = window.aiHost!;
    // Zod schema is kept in the renderer for LangChain validation, but contains
    // functions and cannot cross Electron IPC. The provider only needs JSON Schema.
    const providerTools = this.definitions.map(({ name, description, schema }) => ({
      name,
      description,
      parameters: z.toJSONSchema(schema),
    }));
    const input: AiChatRequest = {
      ...this.request,
      messages: messages.map(message => toHostMessage(message as MessageLike)),
      ...(providerTools.length ? { tools: providerTools as never } : {}),
    };
    // 一次 invoke 就是一轮模型调用，也就是界面上的一个步骤：先流出文本，
    // 模型决定调用工具时该轮结束，工具执行完再进入下一轮。
    this.onEvent?.({ type: 'step' });
    const emit = this.onEvent;
    const result = emit
      ? await host.stream('builtin-chat', input, delta => emit({ type: 'text', delta }))
      : await host.chat('builtin-chat', input);
    if (result.ok === false) throw new AiHostError(result.error);
    this.lastCompletion = result.value;
    return new AIMessage({
      content: result.value.content,
      tool_calls: result.value.toolCalls?.map(call => ({
        id: call.id,
        name: call.name,
        args: call.args,
      })),
      usage_metadata: result.value.usage
        ? {
            input_tokens: result.value.usage.promptTokens,
            output_tokens: result.value.usage.completionTokens,
            total_tokens: result.value.usage.totalTokens,
          }
        : undefined,
    });
  }

  completion(content: string): AiCompletion {
    const last = this.lastCompletion;
    return {
      requestId: last?.requestId ?? this.request.requestId,
      content,
      model: last?.model ?? 'unknown',
      finishReason: last?.finishReason ?? 'unknown',
      ...(last?.usage ? { usage: last.usage } : {}),
    };
  }
}

/**
 * 把工具声明包装成 LangChain 工具，并把每次执行的开始与结果上报给界面。
 * 工具失败时仍然抛出，让模型能拿到错误原因继续对话。
 */
const createTools = (definitions: AiToolDefinition[], onEvent?: (event: AgentEvent) => void) =>
  definitions.map(definition =>
    tool(
      async (args: Record<string, unknown>) => {
        const id = crypto.randomUUID();
        onEvent?.({ type: 'tool-start', id, name: definition.name, args });
        try {
          const output = JSON.stringify(
            await registry.invoke({
              id,
              name: definition.name,
              args,
            }),
          );
          onEvent?.({ type: 'tool-end', id, name: definition.name, result: output, failed: false });
          return output;
        } catch (error) {
          const message = error instanceof Error ? error.message : '工具执行失败。';
          onEvent?.({ type: 'tool-end', id, name: definition.name, result: message, failed: true });
          throw error;
        }
      },
      {
        name: definition.name,
        description: definition.description,
        // Plugin tools already declare OpenAI-compatible JSON Schema. LangChain
        // accepts that schema directly, avoiding a lossy JSON-Schema-to-Zod conversion.
        schema: z.toJSONSchema(definition.schema),
      },
    ),
  );

/**
 * Executes an AI request through LangChain's agent and registered plugin tools.
 *
 * @param request 对话请求；缺少 requestId 时自动生成，停止生成依赖它定位当前请求。
 * @param onEvent 生成过程中的增量事件回调；省略时退化为一次性返回结果。
 * @returns 最终一轮助手回复；工具调用过程通过 onEvent 实时上报，不进入返回值。
 */
export const runLangChainAgent = async (
  request: AiChatRequest,
  onEvent?: (event: AgentEvent) => void,
): Promise<AiResult<AiCompletion>> => {
  if (!window.aiHost) return aiFailure('UNAVAILABLE', '请在桌面应用中配置和使用 AI。');
  const definitions = request.tools ?? registry.definitions();
  const model = new IpcChatModel(
    {
      requestId: request.requestId ?? crypto.randomUUID(),
      model: request.model,
      temperature: request.temperature,
      maxTokens: request.maxTokens,
      responseFormat: request.responseFormat,
      thinking: request.thinking,
    },
    definitions,
    onEvent,
  );
  try {
    const agent = createAgent({
      model: model as never,
      tools: createTools(definitions, onEvent),
      systemPrompt: request.systemPrompt,
      middleware: [toolCallLimitMiddleware({ runLimit: 8, exitBehavior: 'error' })],
    });

    // 只执行一次：文本增量和工具调用分别由 IpcChatModel 与 createTools 上报，
    // 再额外 invoke 一遍会让每一轮工具都重复执行。
    const result = await agent.invoke({ messages: request.messages.map(toLangChainMessage) });
    const finalMessage = [...result.messages]
      .reverse()
      .find(message => AIMessage.isInstance(message));
    if (!finalMessage) return aiFailure('INVALID_RESPONSE', '服务未返回有效文本。');
    return { ok: true, value: model.completion(contentToString(finalMessage.content)) };
  } catch (error) {
    if (error instanceof AiHostError) return { ok: false, error: error.aiError };
    if (error instanceof ToolCallLimitExceededError)
      return aiFailure('BUSY', 'AI 工具调用轮次过多，已停止执行。', true);
    console.error('[ai] agent execution failed', error);
    const message = error instanceof Error ? error.message : 'AI 工具调用失败。';
    return aiFailure('NETWORK', message, true);
  }
};
