/**
 * 文件说明：定义 AI 设置与主进程服务之间的桥接类型，约定配置、对话、连接测试和状态订阅接口。
 */

import type { AiChatRequest, AiCompletion, AiResult, AiStatus, Disposable } from '../types/plugin';

/** 宿主设置专用的写入协议：apiKey 不传表示保留，空字符串表示清除。 */
export type AiConfigurationUpdate = {
  enabled: boolean;
  provider: 'deepseek' | 'compatible';
  baseUrl: string;
  model: string;
  timeoutMs: number;
  apiKey?: string;
};

/** preload 暴露的最小桥接接口；插件通过运行时包装器调用，不能读取密钥。 */
export interface AiBridge {
  getStatus(): Promise<AiResult<AiStatus>>;
  configure(input: AiConfigurationUpdate): Promise<AiResult<AiStatus>>;
  chat(owner: string, request: AiChatRequest): Promise<AiResult<AiCompletion>>;
  test(owner: string, requestId?: string): Promise<AiResult<AiCompletion>>;
  cancel(owner: string, requestId: string): Promise<boolean>;
  onDidChange(listener: (status: AiStatus) => void): Disposable;
}
