/**
 * 文件说明：为每个插件创建带权限检查的 AI 客户端，合并默认提示词等参数，并跟踪请求及取消资源。
 */

import type { AiBridge } from './contracts';
import type { AiResult, Disposable, PluginAiApi, ToolPlugin } from '../types/plugin';
import { aiFailure } from './shared';

/**
 * 每个插件获得独立 owner 与默认生成参数。能力校验每次调用时执行，
 * 即使组件保留了旧 API 引用，插件被禁用后也不能再启动新的请求。
 */
export const createPluginAiApi = (plugin: ToolPlugin, enabled: () => boolean, bridge: () => AiBridge | undefined, subscriptions: Disposable[] = []): PluginAiApi => {
  const owner = `plugin:${plugin.id}`;
  const requests = new Set<string>();
  const run = async <T>(action: (host: AiBridge) => Promise<AiResult<T>>): Promise<AiResult<T>> => {
    if (!plugin.capabilities?.ai || !enabled()) return aiFailure('FORBIDDEN', `插件 ${plugin.id} 未声明 AI 能力或已被禁用。`);
    const host = bridge();
    if (!host) return aiFailure('UNAVAILABLE', 'AI 服务需要在桌面应用中运行。');
    try { return await action(host); } catch { return aiFailure('UNAVAILABLE', '宿主 AI 服务暂时不可用。', true); }
  };
  const track = async <T>(host: AiBridge, requestId: string, action: () => Promise<AiResult<T>>): Promise<AiResult<T>> => {
    if (requests.has(requestId)) return aiFailure('BUSY', '该请求 ID 正在使用中。', true);
    requests.add(requestId);
    const cleanup = { dispose: () => { void host.cancel(owner, requestId).catch(() => undefined); } };
    subscriptions.push(cleanup);
    try { return await action(); }
    finally {
      requests.delete(requestId);
      const index = subscriptions.indexOf(cleanup);
      if (index >= 0) subscriptions.splice(index, 1);
    }
  };
  return {
    getStatus: () => run((host) => host.getStatus()),
    test: (requestId = crypto.randomUUID()) => run((host) => track(host, requestId, () => host.test(owner, requestId))),
    chat: (request) => run(async (host) => {
      const requestId = request.requestId ?? crypto.randomUUID();
      // 默认参数只填充调用方未指定的字段；messages、requestId 始终来自当前调用。
      const options = { ...plugin.ai, ...Object.fromEntries(Object.entries(request).filter(([, value]) => value !== undefined)), requestId };
      return track(host, requestId, () => host.chat(owner, options as typeof request));
    }),
    // 已发出的请求允许在禁用后取消；owner 仍固定为当前插件，不能取消其他调用方的请求。
    cancel: async (requestId) => {
      if (!plugin.capabilities?.ai) return false;
      try { return await bridge()?.cancel(owner, requestId) ?? false; } catch { return false; }
    },
    onDidChange(listener) {
      if (!plugin.capabilities?.ai || !enabled()) return { dispose() { /* 未授权时不注册监听。 */ } };
      const subscription = bridge()?.onDidChange((status) => { if (enabled()) listener(status); });
      if (!subscription) return { dispose() { /* 浏览器预览无 IPC。 */ } };
      const owned = { dispose() {
        subscription.dispose();
        const index = subscriptions.indexOf(owned);
        if (index >= 0) subscriptions.splice(index, 1);
      } };
      subscriptions.push(owned);
      return owned;
    },
  };
};
