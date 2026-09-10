import { Disposable } from './index';

/**
 * 使用普通可序列化对象跨 IPC 返回错误，避免 Electron 丢失自定义 Error 的属性。
 */
export type AiResult<T> =
  | {
      ok: true;
      value: T;
    }
  | {
      ok: false;
      error: AiError;
    };
/**
 * 兼容 OpenAI 的工具定义。
 */
export type AiToolDefinition<T extends z.ZodType = z.ZodType> = {
  name: string;
  description: string;
  schema: T;
};
/** A renderer-side implementation for a tool declared to the AI provider. */
export type AiToolRegistration<T extends z.ZodType = z.ZodType> = AiToolDefinition<T> & {
  invoke(args: z.infer<T>): Promise<unknown> | unknown;
};
/**
 * AI 工具调用请求；插件应在 invoke 中按工具定义的参数结构处理请求。
 */
export type AiToolCall = {
  id: string;
  name: string;
  args: Record<string, unknown>;
};
export type AiMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCallId?: string;
  toolCalls?: AiToolCall[];
};
export type AiGenerationOptions = {
  /** 单次调用覆盖插件默认提示词；不自动读取页面、文件或其他插件的内容。 */
  systemPrompt?: string;
  /** 省略时使用宿主统一配置的模型；插件可为特殊任务指定兼容的模型。 */
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /** JSON 输出仍需要在提示词中明确要求 JSON，且服务商必须支持该参数。 */
  responseFormat?: 'text' | 'json_object';
  /** DeepSeek 的思考开关；兼容服务不发送这一扩展参数。默认关闭。 */
  thinking?: boolean;
};
export type AiChatRequest = AiGenerationOptions & {
  messages: AiMessage[];
  /** Tools are declarations only. Their implementation remains in the renderer/plugin. */
  tools?: AiToolDefinition[];
  /** 可选的请求 ID，用于 cancel；同一个调用方的并行请求必须使用不同 ID。 */
  requestId?: string;
};
export type AiCompletion = {
  requestId: string;
  content: string;
  model: string;
  finishReason: string;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
  toolCalls?: AiToolCall[];
};
export type AiStatus = {
  enabled: boolean;
  /** 配置字段完整且密钥可读取，只表示具备调用条件，不代表服务商已验证通过。 */
  configured: boolean;
  hasApiKey: boolean;
  provider: 'deepseek' | 'compatible';
  baseUrl: string;
  model: string;
  timeoutMs: number;
  /** 修改配置后自动回到 untested，旧请求结果不会覆盖新配置的连接状态。 */
  connection: 'untested' | 'ok' | 'error';
  checkedAt?: string;
  lastError?: AiError;
};

/**
 * 插件 AI 能力：统一配置由宿主管理，接口不会返回 API Key。
 * 使用前在 capabilities 声明 ai: true；未声明或已禁用的插件调用会返回 FORBIDDEN。
 * test 会向已配置服务发送极短的测试消息，可能产生少量 token 费用。
 */
export interface PluginAiApi {
  /**
   * 获取当前插件的 AI 能力状态。
   * @remarks 未声明 ai 能力或已禁用的插件调用会返回 FORBIDDEN。
   * @returns AI 状态，包含是否启用、是否配置、服务商、模型、连接状态等。
   */
  getStatus(): Promise<AiResult<AiStatus>>;
  /**
   * 测试当前插件的 AI 能力是否可用。
   * @param requestId
   * @returns 测试结果，包含连接状态和可能的错误信息。
   */
  test(requestId?: string): Promise<AiResult<AiCompletion>>;
  chat(request: AiChatRequest): Promise<AiResult<AiCompletion>>;
  /** Registers a tool and disposes it automatically when the plugin unloads. The host prefixes its name with the plugin ID. */
  registerTool(tool: AiToolRegistration): Disposable;
  registerTools(tools: AiToolRegistration[]): Disposable[];

  cancel(requestId: string): Promise<boolean>;
  onDidChange(listener: (status: AiStatus) => void): Disposable;
}
