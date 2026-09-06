/**
 * 文件说明：管理插件的加载、激活、禁用和资源清理，持久化设置与存储，并向组件注入宿主能力。
 */

import { computed, reactive, readonly } from 'vue';
import { createPluginServicesApi } from '../services/pluginApi';
import { createPluginDataApi } from '../data/pluginApi';
import { createPluginAiApi } from '../ai/pluginApi';
import { createLifecycleQueue } from './lifecycleQueue';
import type {
  Disposable,
  PluginActivationContext,
  PluginActivationReason,
  PluginCleanup,
  PluginComponentApi,
  PluginDeactivationReason,
  PluginLifecycleContext,
  ToolPlugin,
} from '@wttch-hub/plugin-api';
import { allTools } from '../config/tools';
import { useSheet } from '../composables/useSheet';
import { useToast } from '../composables/useToast';

type SettingValue = boolean | number | string;
type PersistedState = {
  enabled?: Record<string, boolean>;
  values?: Record<string, Record<string, SettingValue>>;
  storage?: Record<string, Record<string, unknown>>;
};
export type PluginRuntimeStatus = 'disabled' | 'loading' | 'ready' | 'activating' | 'active' | 'error';
export type PluginRuntimeState = { enabled: boolean; status: PluginRuntimeStatus; error?: string; activeScopes: number };

const persistenceKey = 'wttch-hub:plugin-runtime:v1';
const legacyKey = 'wttch-hub:plugin-settings';
const persisted: PersistedState = (() => {
  try {
    return JSON.parse(localStorage.getItem(persistenceKey) ?? localStorage.getItem(legacyKey) ?? '{}') as PersistedState;
  } catch { return {}; }
})();

const states = reactive<Record<string, PluginRuntimeState>>({});
const values = reactive<Record<string, Record<string, SettingValue>>>({});
const storage = reactive<Record<string, Record<string, unknown>>>({});
const scopes = new Map<string, Set<symbol>>();
const activationCleanup = new Map<string, PluginCleanup>();
const loadCleanup = new Map<string, PluginCleanup>();
const subscriptions = new Map<string, Disposable[]>();
const settingListeners = new Map<string, Set<(key: string, value: SettingValue) => void>>();
const storageListeners = new Map<string, Set<(key: string, value: unknown) => void>>();
const loadTasks = new Map<string, Promise<void>>();
const enqueueLifecycle = createLifecycleQueue();
let initialized = false;

for (const plugin of allTools) {
  states[plugin.id] = { enabled: persisted.enabled?.[plugin.id] ?? true, status: 'disabled', activeScopes: 0 };
  values[plugin.id] = {};
  for (const field of plugin.settings?.fields ?? []) values[plugin.id][field.key] = persisted.values?.[plugin.id]?.[field.key] ?? field.defaultValue;
  storage[plugin.id] = persisted.storage?.[plugin.id] ?? {};
}

const save = () => localStorage.setItem(persistenceKey, JSON.stringify({
  // 保留尚未安装插件的备份数据，安装对应插件后即可重新读取。
  enabled: { ...persisted.enabled, ...Object.fromEntries(Object.entries(states).map(([id, state]) => [id, state.enabled])) },
  values: { ...persisted.values, ...values },
  storage: { ...persisted.storage, ...storage },
}));
// Electron floating widgets run in a separate renderer. Keep settings and
// plugin-private data synchronized through the shared localStorage origin.
window.addEventListener('storage', (event) => {
  if (event.key !== persistenceKey || !event.newValue) return;
  try {
    const next = JSON.parse(event.newValue) as PersistedState;
    for (const plugin of allTools) {
      const nextValues = next.values?.[plugin.id];
      if (nextValues) for (const [key, value] of Object.entries(nextValues)) {
        if (values[plugin.id][key] === value) continue;
        values[plugin.id][key] = value;
        settingListeners.get(plugin.id)?.forEach((listener) => listener(key, value));
      }
      const nextStorage = next.storage?.[plugin.id];
      if (nextStorage) {
        const keys = new Set([...Object.keys(storage[plugin.id]), ...Object.keys(nextStorage)]);
        storage[plugin.id] = { ...nextStorage };
        keys.forEach((key) => storageListeners.get(plugin.id)?.forEach((listener) => listener(key, nextStorage[key])));
      }
    }
  } catch { /* Ignore partial writes from an older or invalid runtime. */ }
});
const pluginFor = (id: string) => allTools.find((plugin) => plugin.id === id);
const dispose = async (cleanup?: PluginCleanup) => {
  if (!cleanup) return;
  if (typeof cleanup === 'function') await cleanup(); else await cleanup.dispose();
};
const fail = (plugin: ToolPlugin, error: unknown) => {
  states[plugin.id].status = 'error';
  states[plugin.id].error = error instanceof Error ? error.message : String(error);
  useToast().error(`${plugin.name}：${states[plugin.id].error}`);
};

const contextFor = (plugin: ToolPlugin, path: string, reason: PluginActivationReason | PluginDeactivationReason): PluginLifecycleContext => {
  const listeners = settingListeners.get(plugin.id) ?? new Set();
  settingListeners.set(plugin.id, listeners);
  const pluginSubscriptions = subscriptions.get(plugin.id) ?? [];
  subscriptions.set(plugin.id, pluginSubscriptions);
  const pluginStorageListeners = storageListeners.get(plugin.id) ?? new Set();
  storageListeners.set(plugin.id, pluginStorageListeners);
  const toast = useToast();
  const sheet = useSheet();
  return {
    path,
    reason,
    subscriptions: pluginSubscriptions,
    services: createPluginServicesApi(plugin, () => states[plugin.id].enabled, () => window.serviceHost),
    data: createPluginDataApi(plugin.id, () => storage[plugin.id], (next) => {
      const previous = storage[plugin.id];
      storage[plugin.id] = next;
      try { save(); } catch (error) { storage[plugin.id] = previous; throw error; }
      // 写入成功才广播，含已删除字段，确保页面与 Widget 都能清理旧内容。
      const keys = new Set([...Object.keys(previous), ...Object.keys(next)]);
      keys.forEach(key => pluginStorageListeners.forEach(listener => listener(key, next[key])));
    }),
    ai: createPluginAiApi(plugin, () => states[plugin.id].enabled, () => window.aiHost, pluginSubscriptions),
    host: {
      systemStats: () => plugin.capabilities?.systemStats && window.toolHost
        ? window.toolHost.systemStats()
        : Promise.reject(new Error(`插件 ${plugin.id} 未声明 systemStats 能力`)),
      showNotification: (options) => plugin.capabilities?.notifications && window.toolHost?.showNotification
        ? window.toolHost.showNotification(options)
        : Promise.reject(new Error(`插件 ${plugin.id} 未声明 notifications 能力`)),
      openFloatingWidget: (options) => plugin.capabilities?.floatingWidget && plugin.floatingWidget && window.toolHost?.openFloatingWidget
        ? window.toolHost.openFloatingWidget(plugin.id, {
            width: options?.width ?? plugin.floatingWidget.defaultWidth,
            height: options?.height ?? plugin.floatingWidget.defaultHeight,
            alwaysOnTop: options?.alwaysOnTop,
            locked: options?.locked,
          })
        : Promise.reject(new Error(`插件 ${plugin.id} 未声明 floatingWidget 能力`)),
      updateFloatingWidget: (options) => plugin.capabilities?.floatingWidget && window.toolHost?.updateFloatingWidget
        ? window.toolHost.updateFloatingWidget(plugin.id, options)
        : Promise.reject(new Error(`插件 ${plugin.id} 未声明 floatingWidget 能力`)),
      closeFloatingWidget: () => plugin.capabilities?.floatingWidget && window.toolHost?.closeFloatingWidget
        ? window.toolHost.closeFloatingWidget(plugin.id)
        : Promise.reject(new Error(`插件 ${plugin.id} 未声明 floatingWidget 能力`)),
    },
    settings: {
      get: <T extends SettingValue>(key: string, fallback?: T) => (values[plugin.id]?.[key] as T | undefined) ?? fallback,
      update: (key, value) => updateSetting(plugin.id, key, value),
      onDidChange: (listener) => { listeners.add(listener); return { dispose: () => listeners.delete(listener) }; },
    },
    storage: {
      get: <T>(key: string, fallback?: T) => (storage[plugin.id]?.[key] as T | undefined) ?? fallback,
      update: (key, value) => { storage[plugin.id][key] = value; save(); pluginStorageListeners.forEach((listener) => listener(key, value)); },
      delete: (key) => { delete storage[plugin.id][key]; save(); pluginStorageListeners.forEach((listener) => listener(key, undefined)); },
      onDidChange: (listener) => { pluginStorageListeners.add(listener); return { dispose: () => pluginStorageListeners.delete(listener) }; },
    },
    ui: {
      showToast: (...args) => {
        if (!plugin.capabilities?.toast) throw new Error(`插件 ${plugin.id} 未声明 toast 能力`);
        return toast.show(...args);
      },
      dismissToast: toast.dismiss,
      openSheet: (options) => {
        if (!plugin.capabilities?.sheet) throw new Error(`插件 ${plugin.id} 未声明 sheet 能力`);
        sheet.open(options);
      },
      closeSheet: sheet.close,
    },
  };
};

const load = async (plugin: ToolPlugin, reason: PluginActivationReason = 'startup') => {
  const state = states[plugin.id];
  if (state.status === 'loading') return loadTasks.get(plugin.id);
  if (!state.enabled || state.status !== 'disabled') return;
  state.status = 'loading'; state.error = undefined;
  const task = (async () => {
    try {
      const cleanup = await plugin.events?.load?.(contextFor(plugin, '', reason));
      if (cleanup) loadCleanup.set(plugin.id, cleanup);
      state.status = state.enabled ? 'ready' : 'disabled';
    } catch (error) { fail(plugin, error); }
    finally { loadTasks.delete(plugin.id); }
  })();
  loadTasks.set(plugin.id, task);
  return task;
};

const deactivate = async (plugin: ToolPlugin, reason: PluginDeactivationReason, path = '') => {
  const state = states[plugin.id];
  if (state.status !== 'active' && state.status !== 'activating') return;
  try {
    await dispose(activationCleanup.get(plugin.id));
    activationCleanup.delete(plugin.id);
    await plugin.events?.deactivate?.(contextFor(plugin, path, reason));
    state.status = state.enabled ? 'ready' : 'disabled';
  } catch (error) { fail(plugin, error); }
};

const unload = async (plugin: ToolPlugin, reason: PluginDeactivationReason) => {
  if (states[plugin.id].status === 'disabled' && !loadCleanup.has(plugin.id) && !(subscriptions.get(plugin.id)?.length)) return;
  await loadTasks.get(plugin.id);
  scopes.get(plugin.id)?.clear();
  states[plugin.id].activeScopes = 0;
  await deactivate(plugin, reason);
  try {
    await plugin.events?.unload?.(contextFor(plugin, '', reason));
    await dispose(loadCleanup.get(plugin.id));
    loadCleanup.delete(plugin.id);
    const owned = subscriptions.get(plugin.id) ?? [];
    for (const item of [...owned].reverse()) await item.dispose();
    owned.length = 0;
    states[plugin.id].status = 'disabled';
  } catch (error) { fail(plugin, error); }
};

/** 主窗口登记可订阅服务，Widget 不登记，避免覆盖主工作台的完整清单。 */
const syncServices = async () => {
  if (!window.serviceHost || window.location?.hash.startsWith('#/floating/')) return;
  await window.serviceHost.register(allTools.flatMap(plugin => plugin.capabilities?.services ? (plugin.services ?? []).map(service => ({
    topic: `${plugin.id}/${service.id}`, name: `${plugin.name} · ${service.name}`,
    description: service.description ?? '', enabled: states[plugin.id].enabled,
  })) : [])).catch(() => useToast().error('服务分发暂时不可用，请重启桌面应用；本地插件继续运行。'));
};

export const initializePlugins = async (pluginIds?: string[]) => {
  if (initialized) return;
  initialized = true;
  await syncServices();
  const selected = pluginIds ? new Set(pluginIds) : undefined;
  await Promise.all(allTools.filter((plugin) => states[plugin.id].enabled && (!selected || selected.has(plugin.id))).map((plugin) => enqueueLifecycle(plugin.id, () => load(plugin))));
};

export const acquirePlugin = async (id: string, reason: PluginActivationReason, path = ''): Promise<() => Promise<void>> => enqueueLifecycle(id, async () => {
  const plugin = pluginFor(id); const state = states[id]; const token = Symbol(id);
  if (!plugin || !state?.enabled) return async () => undefined;
  await load(plugin, reason);
  if (state.status === 'error') return async () => undefined;
  const active = scopes.get(id) ?? new Set<symbol>(); scopes.set(id, active); active.add(token); state.activeScopes = active.size;
  if (active.size === 1) {
    state.status = 'activating';
    try {
      const cleanup = await plugin.events?.activate?.(contextFor(plugin, path, reason) as PluginActivationContext);
      if (cleanup) activationCleanup.set(id, cleanup);
      state.status = 'active';
    } catch (error) { active.delete(token); state.activeScopes = 0; fail(plugin, error); }
  }
  // 释放也必须排队：最后一个使用者离开时，激活回调可能仍在等待异步资源。
  return () => enqueueLifecycle(id, async () => {
    if (!active.delete(token)) return;
    state.activeScopes = active.size;
    if (!active.size) await deactivate(plugin, reason === 'widget' ? 'widget' : 'route', path);
  });
});

export const setPluginEnabled = async (id: string, enabled: boolean) => enqueueLifecycle(id, async () => {
  const plugin = pluginFor(id); if (!plugin || !states[id] || states[id].enabled === enabled) return;
  states[id].enabled = enabled; save();
  await syncServices();
  if (enabled) await load(plugin, 'manual'); else await unload(plugin, 'disabled');
});

export const updateSetting = (id: string, key: string, value: SettingValue) => {
  const plugin = pluginFor(id); const field = plugin?.settings?.fields?.find((item) => item.key === key);
  if (!plugin || !field || !(key in values[id])) return;
  if (field.type === 'number') {
    if (typeof value !== 'number' || !Number.isFinite(value)) return;
    value = Math.max(field.min ?? -Infinity, Math.min(field.max ?? Infinity, value));
  }
  if (field.type === 'boolean' && typeof value !== 'boolean') return;
  if (field.type === 'color' && (typeof value !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(value))) return;
  if (field.type === 'select' && !field.options?.some((option) => String(option.value) === String(value))) return;
  values[id][key] = value; save();
  try { settingListeners.get(id)?.forEach((listener) => listener(key, value)); } catch (error) { fail(plugin, error); }
  if (states[id].status !== 'disabled') {
    // 在 Promise 回调内部调用钩子，同时捕获同步抛错和异步拒绝。
    void Promise.resolve().then(() => plugin.events?.settingsChanged?.(contextFor(plugin, '', 'manual'), key, value)).catch((error: unknown) => fail(plugin, error));
  }
};

export const pluginRuntime = {
  states: readonly(states), values: readonly(values),
  enabledTools: computed(() => allTools.filter((plugin) => states[plugin.id]?.enabled)),
  enabledWidgets: computed(() => allTools.filter((plugin) => states[plugin.id]?.enabled && plugin.widget)),
  initialize: initializePlugins, acquire: acquirePlugin, setEnabled: setPluginEnabled, updateSetting,
  componentApi(id: string): PluginComponentApi | undefined {
    const plugin = pluginFor(id);
    if (!plugin) return undefined;
    const { host, ai, data, services, settings, storage: pluginStorage, ui } = contextFor(plugin, '', 'manual');
    return { host, ai, data, services, settings, storage: pluginStorage, ui };
  },
  async shutdown() { await Promise.all(allTools.map((plugin) => enqueueLifecycle(plugin.id, () => unload(plugin, 'shutdown')))); },
};
