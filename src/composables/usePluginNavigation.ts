/**
 * 文件说明：创建 Vue 侧共享插件导航状态，并监听本地存储变化以同步不同窗口的导航偏好。
 */

import { allTools } from '../config/tools';
import { pluginRuntime } from '../plugins/runtime';
import { createPluginNavigation, NAVIGATION_STORAGE_KEY } from '../plugins/navigation';
import { useToast } from './useToast';

/** 侧栏与设置页共享同一份导航偏好，修改后无需重新挂载页面或重启应用。 */
export const pluginNavigation = createPluginNavigation(
  allTools,
  (id) => pluginRuntime.states[id]?.enabled ?? false,
  {
    getItem: (key) => localStorage.getItem(key),
    setItem: (key, value) => localStorage.setItem(key, value),
  },
  () => useToast().error('导航菜单保存失败，请重试。'),
);

const syncNavigation = (event: StorageEvent) => {
  if (event.storageArea !== localStorage) return;
  if (event.key === NAVIGATION_STORAGE_KEY || event.key === null) pluginNavigation.sync(event.newValue);
};
window.addEventListener('storage', syncNavigation);
// 开发热更新时先解除旧监听，避免一个 storage 事件触发多份过期模块实例。
if (import.meta.hot) import.meta.hot.dispose(() => window.removeEventListener('storage', syncNavigation));
