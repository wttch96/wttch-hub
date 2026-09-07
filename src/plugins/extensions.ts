/** 文件说明：维护当前渲染器内的插件扩展导出，供插件以 VS Code 风格按 ID 查找协作能力。 */

import type { Disposable } from '@wttch-hub/plugin-api';

export const createPluginExtensionRegistry = () => {
  const entries = new Map<string, object>();
  const register = <T extends object>(pluginId: string, extension: T): Disposable => {
    if (entries.has(pluginId)) throw new Error(`插件 ${pluginId} 已注册扩展。`);
    entries.set(pluginId, extension);
    return { dispose: () => { if (entries.get(pluginId) === extension) entries.delete(pluginId); } };
  };
  return {
    register,
    get: <T extends object>(pluginId: string): T | undefined => entries.get(pluginId) as T | undefined,
    remove: (pluginId: string) => entries.delete(pluginId),
  };
};
