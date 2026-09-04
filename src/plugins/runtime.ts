import { computed, reactive, readonly } from 'vue';
import type {
  Disposable,
  PluginActivationContext,
  PluginActivationReason,
  PluginCleanup,
  PluginDeactivationReason,
  PluginLifecycleContext,
  ToolPlugin,
} from '../types/plugin';
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
const loadTasks = new Map<string, Promise<void>>();
let initialized = false;

for (const plugin of allTools) {
  states[plugin.id] = { enabled: persisted.enabled?.[plugin.id] ?? true, status: 'disabled', activeScopes: 0 };
  values[plugin.id] = {};
  for (const field of plugin.settings?.fields ?? []) values[plugin.id][field.key] = persisted.values?.[plugin.id]?.[field.key] ?? field.defaultValue;
  storage[plugin.id] = persisted.storage?.[plugin.id] ?? {};
}

const save = () => localStorage.setItem(persistenceKey, JSON.stringify({
  enabled: Object.fromEntries(Object.entries(states).map(([id, state]) => [id, state.enabled])),
  values,
  storage,
}));
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
  const toast = useToast();
  const sheet = useSheet();
  return {
    path,
    reason,
    subscriptions: pluginSubscriptions,
    host: { systemStats: () => plugin.capabilities?.systemStats && window.toolHost
      ? window.toolHost.systemStats()
      : Promise.reject(new Error(`插件 ${plugin.id} 未声明 systemStats 能力`)) },
    settings: {
      get: <T extends SettingValue>(key: string, fallback?: T) => (values[plugin.id]?.[key] as T | undefined) ?? fallback,
      update: (key, value) => updateSetting(plugin.id, key, value),
      onDidChange: (listener) => { listeners.add(listener); return { dispose: () => listeners.delete(listener) }; },
    },
    storage: {
      get: <T>(key: string, fallback?: T) => (storage[plugin.id]?.[key] as T | undefined) ?? fallback,
      update: (key, value) => { storage[plugin.id][key] = value; save(); },
      delete: (key) => { delete storage[plugin.id][key]; save(); },
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

export const initializePlugins = async () => {
  if (initialized) return;
  initialized = true;
  await Promise.all(allTools.filter((plugin) => states[plugin.id].enabled).map((plugin) => load(plugin)));
};

export const acquirePlugin = async (id: string, reason: PluginActivationReason, path = ''): Promise<() => Promise<void>> => {
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
  return async () => {
    if (!active.delete(token)) return;
    state.activeScopes = active.size;
    if (!active.size) await deactivate(plugin, reason === 'widget' ? 'widget' : 'route', path);
  };
};

export const setPluginEnabled = async (id: string, enabled: boolean) => {
  const plugin = pluginFor(id); if (!plugin || !states[id] || states[id].enabled === enabled) return;
  states[id].enabled = enabled; save();
  if (enabled) await load(plugin, 'manual'); else await unload(plugin, 'disabled');
};

export const updateSetting = (id: string, key: string, value: SettingValue) => {
  const plugin = pluginFor(id); const field = plugin?.settings?.fields?.find((item) => item.key === key);
  if (!plugin || !field || !(key in values[id])) return;
  if (field.type === 'number') {
    if (typeof value !== 'number' || !Number.isFinite(value)) return;
    value = Math.max(field.min ?? -Infinity, Math.min(field.max ?? Infinity, value));
  }
  if (field.type === 'boolean' && typeof value !== 'boolean') return;
  if (field.type === 'select' && !field.options?.some((option) => String(option.value) === String(value))) return;
  values[id][key] = value; save();
  try { settingListeners.get(id)?.forEach((listener) => listener(key, value)); } catch (error) { fail(plugin, error); }
  if (states[id].status !== 'disabled') {
    void Promise.resolve(plugin.events?.settingsChanged?.(contextFor(plugin, '', 'manual'), key, value)).catch((error: unknown) => fail(plugin, error));
  }
};

export const pluginRuntime = {
  states: readonly(states), values: readonly(values),
  enabledTools: computed(() => allTools.filter((plugin) => states[plugin.id]?.enabled)),
  enabledWidgets: computed(() => allTools.filter((plugin) => states[plugin.id]?.enabled && plugin.widget)),
  initialize: initializePlugins, acquire: acquirePlugin, setEnabled: setPluginEnabled, updateSetting,
  async shutdown() { await Promise.all(allTools.map((plugin) => unload(plugin, 'shutdown'))); },
};
