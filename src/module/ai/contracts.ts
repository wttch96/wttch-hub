/**
 * 文件说明：定义 AI 设置与主进程服务之间的桥接类型，约定配置、对话、连接测试和状态订阅接口。
 */

import type { AiChatRequest, AiCompletion, AiResult, AiStatus, Disposable } from '@wttch-hub/plugin-api';

/** 宿主设置专用的写入协议：apiKey 不传表示保留，空字符串表示清除。 */
export type AiConfigurationUpdate = {
  enabled: boolean;
  provider: 'deepseek' | 'compatible';
  baseUrl: string;
  model: string;
  timeoutMs: number;
  apiKey?: string;
};

/**
 * 内置聊天在生成过程中向前端推送的增量事件。
 *
 * @remarks
 * 一个模型轮次以 step 开始，随后是该轮的若干 text 片段；模型决定调用工具时，
 * 该轮以 tool-start / tool-end 收尾，然后进入下一轮。界面按到达顺序渲染，
 * 就能得到「文本 → 工具调用 → 后续文本」的过程展示。
 */
export type AgentEvent =
  /** 进入新的模型轮次，其后的 text 属于新的一段助手文本。 */
  | { type: 'step' }
  /** 助手文本增量。 */
  | { type: 'text'; delta: string }
  /** 工具开始执行。 */
  | { type: 'tool-start'; id: string; name: string; args: Record<string, unknown> }
  /** 工具执行结束，failed 表示结果不可用。 */
  | { type: 'tool-end'; id: string; name: string; result: string; failed: boolean };

/** preload 暴露的最小桥接接口；插件通过运行时包装器调用，不能读取密钥。 */
export interface AiBridge {
  getStatus(): Promise<AiResult<AiStatus>>;
  configure(input: AiConfigurationUpdate): Promise<AiResult<AiStatus>>;
  chat(owner: string, request: AiChatRequest): Promise<AiResult<AiCompletion>>;
  /** 流式对话仅向调用页面推送已生成的纯文本片段，密钥始终留在主进程。 */
  stream(owner: string, request: AiChatRequest, onChunk: (content: string) => void): Promise<AiResult<AiCompletion>>;
  test(owner: string, requestId?: string): Promise<AiResult<AiCompletion>>;
  cancel(owner: string, requestId: string): Promise<boolean>;
  onDidChange(listener: (status: AiStatus) => void): Disposable;
}
