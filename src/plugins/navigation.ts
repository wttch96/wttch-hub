/**
 * 文件说明：计算插件导航的名称、可见性和顺序，合并默认声明与用户偏好并提供持久化和同步能力。
 */

import { computed, ref } from 'vue';
import type { ToolPlugin } from '../types/plugin';

/** 独立于插件私有数据保存，避免浮动窗口保存 runtime 快照时覆盖菜单偏好。 */
export const NAVIGATION_STORAGE_KEY = 'wttch-hub:navigation:v1';
export const NAVIGATION_LABEL_LIMIT = 40;
type NavigationOverride = { label?: string; visible?: boolean };
type NavigationPreferences = { order: string[]; items: Record<string, NavigationOverride> };
type NavigationStorage = Pick<Storage, 'getItem' | 'setItem'>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const normalizeLabel = (value: string) => value.trim().slice(0, NAVIGATION_LABEL_LIMIT);

/**
 * 导航状态与浏览器初始化分开，便于测试持久化、排序和启用状态的组合行为。
 * plugins 是构建期发现的插件列表；isEnabled 读取运行时状态，让禁用操作立即反映到侧栏。
 */
export const createPluginNavigation = (
  plugins: ToolPlugin[],
  isEnabled: (id: string) => boolean,
  storage: NavigationStorage,
  onSaveError: (error: unknown) => void = () => undefined,
) => {
  const candidates = plugins.filter((plugin) => plugin.navigation === true || isRecord(plugin.navigation));
  const ids = new Set(candidates.map((plugin) => plugin.id));
  const optionsFor = (plugin: ToolPlugin) => typeof plugin.navigation === 'object' ? plugin.navigation : {};
  const defaultLabel = (plugin: ToolPlugin) => normalizeLabel(optionsFor(plugin).label ?? '') || plugin.name;
  const defaultOrder = (plugin: ToolPlugin) => {
    const order = optionsFor(plugin).order;
    return typeof order === 'number' && Number.isFinite(order) ? order : Infinity;
  };
  // 稳定排序保留同权重插件的注册顺序；新安装且没有个人排序的插件按默认顺序追加。
  const defaults = [...candidates].sort((a, b) => defaultOrder(a) - defaultOrder(b));

  /** localStorage 可被旧版本或外部窗口写入，逐字段校验，不能直接断言成偏好类型。 */
  const parse = (raw: string | null): NavigationPreferences => {
    const result: NavigationPreferences = { order: [], items: {} };
    try {
      const value: unknown = JSON.parse(raw ?? '{}');
      if (!isRecord(value)) return result;
      if (Array.isArray(value.order)) {
        result.order = [...new Set(value.order.filter((id): id is string => typeof id === 'string' && ids.has(id)))];
      }
      if (isRecord(value.items)) {
        result.items = Object.fromEntries(candidates.flatMap((plugin) => {
          const item = (value.items as Record<string, unknown>)[plugin.id];
          if (!isRecord(item)) return [];
          const override: NavigationOverride = {};
          if (typeof item.visible === 'boolean') override.visible = item.visible;
          if (typeof item.label === 'string' && normalizeLabel(item.label)) override.label = normalizeLabel(item.label);
          return [[plugin.id, override]];
        }));
      }
    } catch { /* 损坏的 JSON 按默认菜单恢复，不能阻止应用启动。 */ }
    return result;
  };
  const read = () => parse(storage.getItem(NAVIGATION_STORAGE_KEY));
  const preferences = ref<NavigationPreferences>({ order: [], items: {} });
  try { preferences.value = read(); } catch { /* 存储不可读时仍显示默认菜单。 */ }

  const ordered = (state: NavigationPreferences) => {
    const ranks = new Map(state.order.map((id, index) => [id, index]));
    return [...defaults].sort((a, b) => (ranks.get(a.id) ?? Infinity) - (ranks.get(b.id) ?? Infinity));
  };
  const entries = computed(() => ordered(preferences.value).map((plugin) => ({
    id: plugin.id,
    plugin,
    label: preferences.value.items[plugin.id]?.label ?? defaultLabel(plugin),
    visible: preferences.value.items[plugin.id]?.visible ?? optionsFor(plugin).defaultVisible !== false,
    enabled: isEnabled(plugin.id),
    // 使用已注册的路由名，重命名只影响展示文本，不改变链接和生命周期标识。
    to: { name: `tool-${plugin.id}` },
  })));
  const visibleEntries = computed(() => entries.value.filter((entry) => entry.visible && entry.enabled));

  /**
   * 每次修改前读取最新快照，以保留其他窗口刚保存的无关菜单偏好。
   * 写入成功后才更新界面；配额或权限错误交给宿主提示，避免显示“已保存”的假象。
   * localStorage 不提供事务，同时发生的跨窗口写入仍遵循最后一次写入生效。
   */
  const commit = (change: (next: NavigationPreferences) => void) => {
    try {
      const next = read();
      change(next);
      storage.setItem(NAVIGATION_STORAGE_KEY, JSON.stringify(next));
      preferences.value = next;
      return true;
    } catch (error) {
      onSaveError(error);
      return false;
    }
  };

  return {
    entries,
    visibleEntries,
    setVisible(id: string, visible: boolean) {
      if (!ids.has(id)) return false;
      return commit((next) => { next.items[id] = { ...next.items[id], visible }; });
    },
    rename(id: string, label: string) {
      if (!ids.has(id)) return false;
      return commit((next) => {
        const override = { ...next.items[id] };
        const normalized = normalizeLabel(label);
        if (normalized) override.label = normalized;
        else delete override.label; // 留空表示恢复插件默认名，后续插件更新可继续更新默认值。
        next.items[id] = override;
      });
    },
    move(id: string, direction: -1 | 1) {
      if (!ids.has(id)) return false;
      return commit((next) => {
        const order = ordered(next).map((plugin) => plugin.id);
        const index = order.indexOf(id);
        const target = index + direction;
        if (target < 0 || target >= order.length) return;
        [order[index], order[target]] = [order[target], order[index]];
        next.order = order;
      });
    },
    reset() {
      return commit((next) => { next.order = []; next.items = {}; });
    },
    /** storage 事件只更新当前窗口，不再次写回，防止多窗口相互广播形成循环。 */
    sync(raw: string | null) { preferences.value = parse(raw); },
  };
};
