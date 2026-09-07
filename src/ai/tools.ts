/**
 * 文件说明：维护渲染器侧的 AI 工具注册表。模型只接收可序列化的声明，
 * 实际操作仍由拥有插件状态的插件执行，避免把插件存储或 UI 权限交给主进程。
 */

import type { AiToolCall, AiToolDefinition } from '@wttch-hub/plugin-api';

export type RegisteredAiTool = AiToolDefinition & { invoke(args: Record<string, unknown>): Promise<unknown> | unknown };
const tools = new Map<string, RegisteredAiTool>();

export const registerAiTool = (tool: RegisteredAiTool) => {
  if (!/^[a-z][a-z0-9_]{1,63}$/.test(tool.name)) throw new Error('AI 工具名称无效');
  tools.set(tool.name, tool);
  return { dispose: () => { if (tools.get(tool.name) === tool) tools.delete(tool.name); } };
};
export const registeredAiToolDefinitions = (): AiToolDefinition[] => [...tools.values()].map(({ name, description, parameters }) => ({ name, description, parameters }));
export const invokeRegisteredAiTool = async (call: AiToolCall) => {
  const tool = tools.get(call.name);
  if (!tool) throw new Error(`AI 工具不存在：${call.name}`);
  return tool.invoke(call.args);
};
