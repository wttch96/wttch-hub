/**
 * 文件说明：封装渲染进程对 AI 桥接接口的调用，维护共享服务状态并处理宿主不可用的情况。
 */

import { reactive, readonly } from 'vue';
import type {
  AiChatRequest,
  AiCompletion,
  AiResult,
  AiStatus,
  Disposable,
} from '@wttch-hub/plugin-api';
import type { AiConfigurationUpdate } from '@/ai/contracts';
import { aiFailure, DEFAULT_AI_STATUS } from '@/ai/shared';
import { runLangChainAgent } from '@/ai/langchainAdapter';

const state = reactive({
  status: { ...DEFAULT_AI_STATUS },
  available: Boolean(window.aiHost),
  loading: false,
});
let subscription: Disposable | undefined;
let refreshTask: Promise<void> | undefined;

const refresh = () => {
  if (refreshTask) return refreshTask;
  refreshTask = (async () => {
    const host = window.aiHost;
    if (!host) {
      state.available = false;
      return;
    }
    if (!subscription)
      subscription = host.onDidChange(status => {
        state.status = status;
      });
    state.loading = true;
    try {
      const result = await host.getStatus();
      state.available = true;
      if (result.ok === true) state.status = result.value;
    } catch {
      state.available = false;
    } finally {
      state.loading = false;
    }
  })().finally(() => {
    refreshTask = undefined;
  });
  return refreshTask;
};

const invoke = async <T>(action: () => Promise<AiResult<T>>): Promise<AiResult<T>> => {
  if (!window.aiHost) return aiFailure('UNAVAILABLE', '请在桌面应用中配置和使用 AI。');
  try {
    return await action();
  } catch {
    return aiFailure('UNAVAILABLE', '宿主 AI 服务暂时不可用。', true);
  }
};

export const useAiService = () => ({
  state: readonly(state),
  refresh,
  async configure(input: AiConfigurationUpdate): Promise<AiResult<AiStatus>> {
    const result = await invoke(() => window.aiHost!.configure(input));
    if (result.ok === true) state.status = result.value;
    return result;
  },
  async chat(request: AiChatRequest): Promise<AiResult<AiCompletion>> {
    return runLangChainAgent(request);
  },
  test: (requestId: string): Promise<AiResult<AiCompletion>> =>
    invoke(() => window.aiHost!.test('settings', requestId)),
  async cancel(owner: 'builtin-chat' | 'settings', requestId: string) {
    try {
      return (await window.aiHost?.cancel(owner, requestId)) ?? false;
    } catch {
      return false;
    }
  },
});
if (import.meta.hot) import.meta.hot.dispose(() => subscription?.dispose());
