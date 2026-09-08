/**
 * 文件说明：提供不依赖 Electron 的插件内存调试宿主，供插件开发者编写生命周期、存储和服务能力测试。
 */

import type {
  AiResult,
  AiStatus,
  PluginActivationContext,
  PluginComponentApi,
  PluginDebugApi,
  PluginDebugEntry,
  PluginDebugLevel,
  PluginLifecycleContext,
  PluginStorageApi,
} from '@wttch-hub/plugin-api';

type SettingValue = boolean | number | string;
type ChangeListener = (key: string, value: unknown) => void;

/** 调试宿主的可选初始状态；所有默认值均为本地内存数据，不会读取真实用户数据。 */
export type PluginDebugHostOptions = {
  pluginId: string;
  settings?: Record<string, SettingValue>;
  storage?: Record<string, unknown>;
  aiStatus?: AiStatus;
};

/** 调试期间由宿主记录的可观察副作用，方便测试断言插件没有越权调用。 */
export type PluginDebugEvents = {
  notifications: Array<{ title: string; body?: string }>;
  published: Array<{ serviceId: string; id: string; title: string; text: string }>;
  toasts: string[];
  logs: PluginDebugEntry[];
};

/** Electron preload 暴露的最小桥接面；包本身不直接导入 Electron，故仍可在 Node 测试中使用。 */
export type ElectronPluginDebugBridge = {
  log(entry: PluginDebugEntry): void;
};

export type ElectronPluginDebugOptions = {
  pluginId: string;
  /** 注入此项可用于测试；省略时自动使用 Electron preload 的 window.pluginDebugHost。 */
  bridge?: ElectronPluginDebugBridge;
  /** 保留在内存中的最近日志数，默认 200 条。 */
  maxEntries?: number;
};

export type ElectronPluginDebugger = {
  api: PluginDebugApi;
  entries: readonly PluginDebugEntry[];
};

type DebugWindow = { pluginDebugHost?: ElectronPluginDebugBridge };

const debugApi = (pluginId: string, emit: (entry: PluginDebugEntry) => void): PluginDebugApi => {
  const log = (level: PluginDebugLevel, message: string, data?: unknown) => emit({
    pluginId,
    level,
    message: String(message),
    ...(data === undefined ? {} : { data }),
    timestamp: new Date().toISOString(),
  });
  return {
    log,
    debug: (message, data) => log('debug', message, data),
    info: (message, data) => log('info', message, data),
    warn: (message, data) => log('warn', message, data),
    error: (message, data) => log('error', message, data),
  };
};

/**
 * 创建默认的 Electron 调试器。
 *
 * 在桌面应用内，日志会经 preload 转发到 Electron 主进程，并保留在 entries
 * 供插件开发者检查；在浏览器预览或 Node 中，缺少桥接时仍会安全地仅记录内存日志。
 */
export const createElectronPluginDebugger = (options: ElectronPluginDebugOptions): ElectronPluginDebugger => {
  const entries: PluginDebugEntry[] = [];
  const maxEntries = Math.max(1, Math.floor(options.maxEntries ?? 200));
  const bridge = options.bridge ?? (globalThis as typeof globalThis & { window?: DebugWindow }).window?.pluginDebugHost;
  const emit = (entry: PluginDebugEntry) => {
    entries.push(entry);
    if (entries.length > maxEntries) entries.splice(0, entries.length - maxEntries);
    bridge?.log(entry);
  };
  return { api: debugApi(options.pluginId, emit), entries };
};

const disposable = (callback: () => void) => ({ dispose: callback });

/**
 * 创建一个最小但完整的插件测试宿主。
 *
 * 该宿主故意不提供 Electron IPC、真实 API Key 或网络请求。AI 默认返回
 * NOT_CONFIGURED，因此插件测试必须主动声明预期的 AI 行为，避免测试意外访问外部服务。
 */
export const createPluginDebugHost = (options: PluginDebugHostOptions) => {
  const settings = new Map(Object.entries(options.settings ?? {}));
  const storage = new Map(Object.entries(options.storage ?? {}));
  let extension: object | undefined;
  const settingListeners = new Set<ChangeListener>();
  const storageListeners = new Set<ChangeListener>();
  const events: PluginDebugEvents = { notifications: [], published: [], toasts: [], logs: [] };
  const status: AiStatus = options.aiStatus ?? {
    enabled: false, configured: false, hasApiKey: false, provider: 'deepseek',
    baseUrl: '', model: '', timeoutMs: 30_000, connection: 'untested',
  };
  const storageApi: PluginStorageApi = {
    get: <T>(key: string, fallback?: T) => (storage.has(key) ? storage.get(key) as T : fallback),
    update: <T>(key: string, value: T) => {
      storage.set(key, value);
      storageListeners.forEach((listener) => listener(key, value));
    },
    delete: (key: string) => {
      storage.delete(key);
      storageListeners.forEach((listener) => listener(key, undefined));
    },
    onDidChange: (listener) => {
      storageListeners.add(listener);
      return disposable(() => storageListeners.delete(listener));
    },
  };
  const notConfigured = <T>(): AiResult<T> => ({ ok: false, error: {
    code: 'NOT_CONFIGURED', message: '调试宿主未配置 AI 响应。', retryable: false,
  } });
  const api: PluginComponentApi = {
    debug: debugApi(options.pluginId, (entry) => events.logs.push(entry)),
    extensions: {
      registerExtension: <T extends object>(next: T) => {
        if (extension) throw new Error(`插件 ${options.pluginId} 已注册扩展。`);
        extension = next;
        return { dispose: () => { if (extension === next) extension = undefined; } };
      },
      getExtension: <T extends object>(pluginId: string) => pluginId === options.pluginId ? extension as T | undefined : undefined,
    },
    host: {
      systemStats: async () => ({ cpu: 0, memory: 0, gpu: 0, readBytes: 0, writeBytes: 0, downloadBytes: 0, uploadBytes: 0 }),
      showNotification: async (notification) => {
        events.notifications.push(notification);
        return true;
      },
      openFloatingWidget: async () => true,
      updateFloatingWidget: async () => true,
      closeFloatingWidget: async () => true,
      showWorkbench: async () => true,
    },
    ai: {
      getStatus: async () => ({ ok: true, value: status }),
      test: async () => notConfigured(),
      chat: async () => notConfigured(),
      registerTool: () => disposable(() => undefined),
      cancel: async () => false,
      onDidChange: () => disposable(() => undefined),
    },
    settings: {
      get: <T extends SettingValue>(key: string, fallback?: T) => (settings.has(key) ? settings.get(key) as T : fallback),
      update: (key, value) => {
        settings.set(key, value);
        settingListeners.forEach((listener) => listener(key, value));
      },
      onDidChange: (listener) => {
        settingListeners.add(listener);
        return disposable(() => settingListeners.delete(listener));
      },
    },
    storage: storageApi,
    data: {
      keys: () => [...storage.keys()],
      getUsage: () => ({ keys: storage.size, bytes: JSON.stringify(Object.fromEntries(storage)).length }),
      export: () => ({ format: 'wttch-hub-plugin-data', version: 1, pluginId: options.pluginId, data: Object.fromEntries(storage) }),
      import: (snapshot) => {
        if (snapshot.pluginId !== options.pluginId) throw new Error('调试数据快照的插件 ID 不匹配。');
        storage.clear();
        Object.entries(snapshot.data).forEach(([key, value]) => storageApi.update(key, value));
      },
      clear: () => [...storage.keys()].forEach((key) => storageApi.delete(key)),
    },
    services: {
      publish: async (serviceId, output) => {
        events.published.push({ serviceId, ...output });
        return { accepted: true, sent: 0, failed: 0, skipped: 0 };
      },
      getStatus: async () => ({ configured: false, subscribed: 0 }),
    },
    ui: {
      showToast: (message) => { events.toasts.push(message); return events.toasts.length; },
      dismissToast: () => undefined,
      openSheet: () => undefined,
      closeSheet: () => undefined,
    },
  };
  const context = (reason: PluginActivationContext['reason']): PluginActivationContext => ({
    ...api, path: `/plugins/${options.pluginId}`, reason, subscriptions: [],
  });
  const lifecycleContext = (reason: PluginLifecycleContext['reason']): PluginLifecycleContext => ({
    ...api, path: `/plugins/${options.pluginId}`, reason, subscriptions: [],
  });

  return { api, context, lifecycleContext, events };
};
